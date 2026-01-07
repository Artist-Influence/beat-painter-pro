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
  layer: 'front' | 'behind';
  colorMode: 'original' | 'invert';
}

interface BackgroundMedia {
  type: 'color' | 'image' | 'video';
  color: string;
  mediaUrl: string | null;
  mediaType: 'image' | 'gif' | 'video' | null;
  positionY: number;
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

  const backgroundRef = useRef<BackgroundMedia | null>(null);
  const backgroundImageRef = useRef<HTMLImageElement | null>(null);
  const backgroundVideoRef = useRef<HTMLVideoElement | null>(null);
  const logoRef = useRef<LogoState | null>(null);
  const logoImageRef = useRef<HTMLImageElement | null>(null);
  const exportModeRef = useRef<ExportMode>('video');
  const pngFramesRef = useRef<Blob[]>([]);

  const songNameRef = useRef<string>('Untitled');
  const visualizerNameRef = useRef<string>('Visualizer');

  const startRecording = useCallback(async (
    startAtSeconds: number, 
    background: BackgroundMedia, 
    songName: string,
    visualizerName: string,
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
      backgroundRef.current = background;
      exportModeRef.current = exportMode;
      songNameRef.current = songName || 'Untitled';
      visualizerNameRef.current = visualizerName || 'Visualizer';
      pngFramesRef.current = [];
      setFrameCount(0);

      // Load logo image if present
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

      // Load background image if needed
      backgroundImageRef.current = null;
      backgroundVideoRef.current = null;
      
      if (background.type === 'image' && background.mediaUrl) {
        const bgImg = new Image();
        bgImg.crossOrigin = 'anonymous';
        bgImg.src = background.mediaUrl;
        await new Promise<void>((resolve) => {
          bgImg.onload = () => {
            backgroundImageRef.current = bgImg;
            resolve();
          };
          bgImg.onerror = () => resolve();
        });
      }

      // Load background video if needed
      if (background.type === 'video' && background.mediaUrl) {
        const bgVideo = document.createElement('video');
        bgVideo.crossOrigin = 'anonymous';
        bgVideo.src = background.mediaUrl;
        bgVideo.muted = true;
        bgVideo.loop = true;
        bgVideo.playsInline = true;
        await new Promise<void>((resolve) => {
          bgVideo.onloadeddata = () => {
            backgroundVideoRef.current = bgVideo;
            bgVideo.play();
            resolve();
          };
          bgVideo.onerror = () => resolve();
        });
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

          const filename = `${songNameRef.current} - ${visualizerNameRef.current}.webm`;

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

          const bg = backgroundRef.current;
          const logo = logoRef.current;

          // Draw background first
          if (exportModeRef.current === 'png-sequence') {
            ctx.clearRect(0, 0, exportCanvas.width, exportCanvas.height);
          } else if (bg?.type === 'video' && backgroundVideoRef.current) {
            drawBackgroundMedia(ctx, backgroundVideoRef.current, exportCanvas.width, exportCanvas.height, bg.positionY);
          } else if (bg?.type === 'image' && backgroundImageRef.current) {
            drawBackgroundMedia(ctx, backgroundImageRef.current, exportCanvas.width, exportCanvas.height, bg.positionY);
          } else {
            ctx.fillStyle = bg?.color || '#000000';
            ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
          }
          
          // Draw logo BEHIND visualizer if layer is 'behind'
          if (logo?.url && logoImageRef.current && logo.layer === 'behind') {
            drawLogoWithSettings(ctx, logoImageRef.current, logo, exportCanvas, srcCanvas);
          }
          
          // Draw visualizer
          ctx.drawImage(srcCanvas, 0, 0, exportCanvas.width, exportCanvas.height);
          
          // Draw logo IN FRONT of visualizer if layer is 'front'
          if (logo?.url && logoImageRef.current && logo.layer === 'front') {
            drawLogoWithSettings(ctx, logoImageRef.current, logo, exportCanvas, srcCanvas);
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
        
        const filename = `${songNameRef.current} - ${visualizerNameRef.current}_frames.zip`;
        
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

function drawBackgroundMedia(
  ctx: CanvasRenderingContext2D, 
  media: HTMLImageElement | HTMLVideoElement, 
  canvasWidth: number, 
  canvasHeight: number, 
  positionY: number
) {
  const mediaWidth = media instanceof HTMLVideoElement ? media.videoWidth : media.width;
  const mediaHeight = media instanceof HTMLVideoElement ? media.videoHeight : media.height;
  
  // Calculate cover dimensions (maintain aspect ratio, fill canvas)
  const scale = Math.max(canvasWidth / mediaWidth, canvasHeight / mediaHeight);
  const scaledWidth = mediaWidth * scale;
  const scaledHeight = mediaHeight * scale;
  
  // Center horizontally, use positionY for vertical
  const x = (canvasWidth - scaledWidth) / 2;
  const yRange = scaledHeight - canvasHeight;
  const y = -yRange * (positionY / 100);
  
  ctx.drawImage(media, x, y, scaledWidth, scaledHeight);
}

function drawLogoWithSettings(
  ctx: CanvasRenderingContext2D,
  logoImage: HTMLImageElement,
  logo: { position: { x: number; y: number }; size: number; opacity: number; colorMode: 'original' | 'invert' },
  exportCanvas: HTMLCanvasElement,
  srcCanvas: HTMLCanvasElement
) {
  ctx.save();
  ctx.globalAlpha = logo.opacity / 100;
  
  const logoWidth = logo.size * (exportCanvas.width / srcCanvas.width);
  const logoHeight = (logoImage.height / logoImage.width) * logoWidth;
  const x = (logo.position.x / 100) * exportCanvas.width - logoWidth / 2;
  const y = (logo.position.y / 100) * exportCanvas.height - logoHeight / 2;
  
  if (logo.colorMode === 'invert') {
    // Draw logo to temp canvas, invert, then composite
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = logoWidth;
    tempCanvas.height = logoHeight;
    const tempCtx = tempCanvas.getContext('2d');
    if (tempCtx) {
      tempCtx.drawImage(logoImage, 0, 0, logoWidth, logoHeight);
      tempCtx.globalCompositeOperation = 'difference';
      tempCtx.fillStyle = 'white';
      tempCtx.fillRect(0, 0, logoWidth, logoHeight);
      ctx.drawImage(tempCanvas, x, y);
    }
  } else {
    ctx.drawImage(logoImage, x, y, logoWidth, logoHeight);
  }
  
  ctx.restore();
}

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
