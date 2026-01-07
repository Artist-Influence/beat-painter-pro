import { useRef, useCallback, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type ExportQuality = '1080p' | '4k';

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

export const useWebMRecorder = ({ canvasRef, audioElement }: UseRecorderProps) => {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const exportCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const keepRenderingRef = useRef<boolean>(false);
  const startTimeRef = useRef<number>(0);
  const [isRecording, setIsRecording] = useState(false);

  const transparentRef = useRef<boolean>(false);
  const backgroundColorRef = useRef<string>('#000000');
  const logoRef = useRef<LogoState | null>(null);
  const logoImageRef = useRef<HTMLImageElement | null>(null);

  const startRecording = useCallback(async (
    startAtSeconds: number, 
    backgroundColor: string, 
    filenamePrefix: string, 
    greenScreenMode: boolean = false,
    quality: ExportQuality = '4k',
    logo?: LogoState
  ) => {
    if (!canvasRef.current || !audioElement) {
      toast.error("Canvas or audio not available");
      return;
    }

    try {
      // Store logo reference and preload image
      logoRef.current = logo || null;
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

      // Set resolution based on quality - 16:9 horizontal format
      const height = quality === '4k' ? 2160 : 1080;
      const width = quality === '4k' ? 3840 : 1920;  // 16:9 ratio
      // Higher bitrates for better quality
      const bitrate = quality === '4k' ? 50_000_000 : 20_000_000; // 50 Mbps for 4K, 20 Mbps for 1080p

      const srcCanvas = canvasRef.current;
      const exportCanvas = document.createElement("canvas");
      exportCanvas.width = width;
      exportCanvas.height = height;
      const ctx = exportCanvas.getContext("2d");
      if (!ctx) {
        toast.error("Failed to create export canvas");
        return;
      }
      
      // Enable high quality image smoothing for better export
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      exportCanvasRef.current = exportCanvas;
      ctxRef.current = ctx;
      transparentRef.current = greenScreenMode;
      // Use green screen color when green screen mode is enabled
      backgroundColorRef.current = greenScreenMode ? '#00FF00' : backgroundColor;

      chunksRef.current = [];
      keepRenderingRef.current = true;
      startTimeRef.current = startAtSeconds;

      // Capture at 30fps for smoother playback
      const videoStream = exportCanvas.captureStream(30);
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
        const filename = `${filenamePrefix}, ${mins}:${secs} Start.webm`;

        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setIsRecording(false);
        toast.success("Recording saved!");

        // Log a visualizer creation event for the authenticated user
        (async () => {
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
        })();
      };

      mediaRecorder.onerror = (event) => {
        console.error("MediaRecorder error:", event);
        setIsRecording(false);
        toast.error("Recording failed");
      };

      // Request data every 100ms for better encoding
      mediaRecorder.start(100);
      setIsRecording(true);
      
      // Start playback if paused
      if (audioElement.paused) {
        await audioElement.play();
      }

      // Frame-rate limited render loop for consistent 30fps
      let lastFrameTime = 0;
      const targetFrameTime = 1000 / 30; // 30 FPS target
      
      const render = (timestamp: number) => {
        if (!keepRenderingRef.current) return;
        
        // Only render if enough time has passed
        if (timestamp - lastFrameTime >= targetFrameTime) {
          lastFrameTime = timestamp;
          
          const ctx = ctxRef.current;
          const exportCanvas = exportCanvasRef.current;
          if (!ctx || !exportCanvas) return;

          // Always fill with background color (green screen for keying, or selected color)
          ctx.fillStyle = backgroundColorRef.current;
          ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
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
        }

        requestAnimationFrame(render);
      };
      requestAnimationFrame(render);

      toast.success("Recording started. Tap again to stop.");
    } catch (error) {
      console.error("Start recording error:", error);
      setIsRecording(false);
      toast.error("Failed to start recording");
    }
  }, [canvasRef, audioElement]);

  const stopRecording = useCallback(() => {
    keepRenderingRef.current = false;
    // Emit event to restore non-transparent rendering
    window.dispatchEvent(new CustomEvent('recording:transparency', { detail: { enabled: false } }));
    try {
      mediaRecorderRef.current?.stop();
      // Don't pause audio when stopping recording - let it continue playing
    } catch (e) {
      console.error("Stop recording error:", e);
    }
  }, []);

  return { startRecording, stopRecording, isRecording };
};
