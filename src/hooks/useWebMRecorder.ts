import { useRef, useCallback, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import JSZip from "jszip";

export type ExportQuality = '1080p' | '4k' | '8k';
export type ExportMode = 'video' | 'png-sequence';

interface LogoState {
  url: string | null;
  position: { x: number; y: number };
  size: number;
  opacity: number;
}

interface UseRecorderProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  audioElement: HTMLAudioElement | null;
}

const RESOLUTIONS: Record<ExportQuality, { width: number; height: number; bitrate: number }> = {
  '1080p': { width: 1920, height: 1080, bitrate: 30_000_000 },
  '4k': { width: 3840, height: 2160, bitrate: 80_000_000 },
  '8k': { width: 7680, height: 4320, bitrate: 150_000_000 },
};

export const useWebMRecorder = ({ canvasRef, audioElement }: UseRecorderProps) => {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const exportCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const keepRenderingRef = useRef<boolean>(false);
  const startTimeRef = useRef<number>(0);
  const [isRecording, setIsRecording] = useState(false);
  const [frameCount, setFrameCount] = useState(0);

  const backgroundColorRef = useRef<string>('#000000');
  const logoRef = useRef<LogoState | null>(null);
  const logoImageRef = useRef<HTMLImageElement | null>(null);
  const exportModeRef = useRef<ExportMode>('video');
  const pngFramesRef = useRef<Blob[]>([]);
  const filenamePrefixRef = useRef<string>('visualizer');

  const startRecording = useCallback(async (
    startAtSeconds: number, 
    backgroundColor: string, 
    filenamePrefix: string, 
    quality: ExportQuality = '4k',
    logo?: LogoState,
    exportMode: ExportMode = 'video'
  ) => {
    if (!canvasRef.current || !audioElement) {
      toast.error("Canvas or audio not available");
      return;
    }

    try {
      // Store references
      logoRef.current = logo || null;
      exportModeRef.current = exportMode;
      filenamePrefixRef.current = filenamePrefix;
      pngFramesRef.current = [];
      setFrameCount(0);

      if (logo?.url) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = logo.url;
        await new Promise<void>((resolve) => {
          img.onload = () => {
            logoImageRef.current = img;
            resolve();
          };
          img.onerror = () => resolve();
        });
      } else {
        logoImageRef.current = null;
      }

      const { width, height, bitrate } = RESOLUTIONS[quality];
      const srcCanvas = canvasRef.current;
      const exportCanvas = document.createElement("canvas");
      exportCanvas.width = width;
      exportCanvas.height = height;
      
      // For PNG sequence, we need alpha support
      const ctx = exportCanvas.getContext("2d", { alpha: exportMode === 'png-sequence' });
      if (!ctx) {
        toast.error("Failed to create export canvas");
        return;
      }
      
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      exportCanvasRef.current = exportCanvas;
      ctxRef.current = ctx;
      backgroundColorRef.current = backgroundColor;

      chunksRef.current = [];
      keepRenderingRef.current = true;
      startTimeRef.current = startAtSeconds;

      // Only set up MediaRecorder for video mode
      if (exportMode === 'video') {
        const videoStream = exportCanvas.captureStream(60);
        const audioStream = (audioElement as any).captureStream ? (audioElement as any).captureStream() : null;

        const videoTracks = videoStream.getVideoTracks();
        const audioTracks = audioStream ? audioStream.getAudioTracks() : [];
        const combinedStream = new MediaStream([...videoTracks, ...audioTracks]);

        const mediaRecorder = new MediaRecorder(combinedStream, {
          mimeType: "video/webm;codecs=vp9,opus",
          videoBitsPerSecond: bitrate,
          audioBitsPerSecond: 320_000,
        });
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) chunksRef.current.push(event.data);
        };

        mediaRecorder.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: "video/webm" });
          const url = URL.createObjectURL(blob);

          const mins = Math.floor(startTimeRef.current / 60).toString().padStart(2, "0");
          const secs = Math.floor(startTimeRef.current % 60).toString().padStart(2, "0");
          const filename = `${filenamePrefixRef.current}, ${mins}:${secs} Start.webm`;

          const a = document.createElement("a");
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);

          setIsRecording(false);
          toast.success("Recording saved!");
          logVisualizerEvent();
        };

        mediaRecorder.onerror = (event) => {
          console.error("MediaRecorder error:", event);
          setIsRecording(false);
          toast.error("Recording failed");
        };

        mediaRecorder.start(100);
      }

      setIsRecording(true);
      
      if (audioElement.paused) {
        await audioElement.play();
      }

      // 60 FPS render loop
      let lastFrameTime = 0;
      const targetFrameTime = 1000 / 60;
      
      const render = async (timestamp: number) => {
        if (!keepRenderingRef.current) return;
        
        if (timestamp - lastFrameTime >= targetFrameTime) {
          lastFrameTime = timestamp;
          
          const ctx = ctxRef.current;
          const exportCanvas = exportCanvasRef.current;
          if (!ctx || !exportCanvas) return;

          // For PNG sequence, clear to transparent; for video, fill background
          if (exportModeRef.current === 'png-sequence') {
            ctx.clearRect(0, 0, exportCanvas.width, exportCanvas.height);
          } else {
            ctx.fillStyle = backgroundColorRef.current;
            ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
          }
          
          ctx.drawImage(srcCanvas, 0, 0, exportCanvas.width, exportCanvas.height);
          
          // Draw logo overlay if present
          if (logoRef.current?.url && logoImageRef.current) {
            const { position, size, opacity } = logoRef.current;
            ctx.globalAlpha = opacity / 100;
            const logoWidth = size * (exportCanvas.width / srcCanvas.width);
            const logoHeight = (logoImageRef.current.height / logoImageRef.current.width) * logoWidth;
            const x = (position.x / 100) * exportCanvas.width - logoWidth / 2;
            const y = (position.y / 100) * exportCanvas.height - logoHeight / 2;
            ctx.drawImage(logoImageRef.current, x, y, logoWidth, logoHeight);
            ctx.globalAlpha = 1;
          }

          // Capture PNG frame for sequence mode
          if (exportModeRef.current === 'png-sequence') {
            exportCanvas.toBlob((blob) => {
              if (blob) {
                pngFramesRef.current.push(blob);
                setFrameCount(pngFramesRef.current.length);
              }
            }, 'image/png');
          }
        }

        requestAnimationFrame(render);
      };
      requestAnimationFrame(render);

      toast.success(exportMode === 'png-sequence' 
        ? "Recording PNG frames... Tap again to stop." 
        : "Recording started. Tap again to stop."
      );
    } catch (error) {
      console.error("Start recording error:", error);
      setIsRecording(false);
      toast.error("Failed to start recording");
    }
  }, [canvasRef, audioElement]);

  const stopRecording = useCallback(async () => {
    keepRenderingRef.current = false;
    window.dispatchEvent(new CustomEvent('recording:transparency', { detail: { enabled: false } }));
    
    try {
      if (exportModeRef.current === 'video') {
        mediaRecorderRef.current?.stop();
      } else {
        // PNG sequence mode - zip and download frames
        setIsRecording(false);
        
        const frames = pngFramesRef.current;
        if (frames.length === 0) {
          toast.error("No frames captured");
          return;
        }

        toast.info(`Zipping ${frames.length} frames...`);
        
        const zip = new JSZip();
        const folder = zip.folder("frames");
        
        if (folder) {
          for (let i = 0; i < frames.length; i++) {
            const frameNumber = (i + 1).toString().padStart(5, '0');
            folder.file(`frame_${frameNumber}.png`, frames[i]);
          }
        }
        
        const zipBlob = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(zipBlob);
        
        const mins = Math.floor(startTimeRef.current / 60).toString().padStart(2, "0");
        const secs = Math.floor(startTimeRef.current % 60).toString().padStart(2, "0");
        const filename = `${filenamePrefixRef.current}_frames_60fps_${mins}-${secs}.zip`;
        
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        toast.success(`Exported ${frames.length} PNG frames!`);
        logVisualizerEvent();
        pngFramesRef.current = [];
        setFrameCount(0);
      }
    } catch (e) {
      console.error("Stop recording error:", e);
      setIsRecording(false);
      toast.error("Failed to save recording");
    }
  }, []);

  return { startRecording, stopRecording, isRecording, frameCount };
};

async function logVisualizerEvent() {
  try {
    const { data } = await supabase.auth.getUser();
    const u = data?.user;
    if (u) {
      await supabase.from("visualizer_events").insert({
        user_id: u.id,
        event_type: "recording_completed",
        created_at: new Date().toISOString(),
      });
    }
  } catch (e) {
    console.warn("Failed to log visualizer event", e);
  }
}
