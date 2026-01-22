import { useRef, useCallback, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import JSZip from "jszip";
import { renderGate } from "@/lib/renderReadyGate";

export type ExportQuality = '1080p' | '4k' | '8k';
export type ExportMode = 'video' | 'png-sequence';
export type AspectRatio = 'horizontal' | 'vertical' | 'square';

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

// Resolution configurations with aspect ratio support
const RESOLUTIONS: Record<ExportQuality, Record<AspectRatio, { width: number; height: number; bitrate: number }>> = {
  '1080p': {
    horizontal: { width: 1920, height: 1080, bitrate: 30_000_000 },
    vertical: { width: 1080, height: 1920, bitrate: 30_000_000 },
    square: { width: 1080, height: 1080, bitrate: 25_000_000 },
  },
  '4k': {
    horizontal: { width: 3840, height: 2160, bitrate: 80_000_000 },
    vertical: { width: 2160, height: 3840, bitrate: 80_000_000 },
    square: { width: 2160, height: 2160, bitrate: 70_000_000 },
  },
  '8k': {
    horizontal: { width: 7680, height: 4320, bitrate: 150_000_000 },
    vertical: { width: 4320, height: 7680, bitrate: 150_000_000 },
    square: { width: 4320, height: 4320, bitrate: 130_000_000 },
  },
};

// Check for supported mime types with fallbacks
const getSupportedMimeType = (): string => {
  const types = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ];
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return '';
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
  
  // Store screen dimensions at start of recording for consistent logo scaling
  const screenWidthRef = useRef<number>(window.innerWidth);

  const startRecording = useCallback(async (
    startAtSeconds: number, 
    background: BackgroundMedia, 
    songName: string,
    visualizerName: string,
    quality: ExportQuality = '4k',
    logo?: LogoState,
    exportMode: ExportMode = 'video',
    aspectRatio: AspectRatio = 'horizontal'
  ) => {
    // Validate canvas
    if (!canvasRef.current) {
      toast.error("Canvas not ready. Please wait a moment and try again.");
      return;
    }

    // Validate audio
    if (!audioElement) {
      toast.error("Please upload an audio file first.");
      return;
    }

    // Check if MediaRecorder is available
    if (typeof MediaRecorder === 'undefined') {
      toast.error("Recording not supported in this browser. Try Chrome or Firefox.");
      return;
    }

    // Check canvas validity
    const srcCanvas = canvasRef.current;
    if (srcCanvas.width === 0 || srcCanvas.height === 0) {
      toast.error("Canvas is not ready. Try switching visualizers.");
      return;
    }

    // Check WebGL context
    const gl = srcCanvas.getContext('webgl2') || srcCanvas.getContext('webgl');
    if (gl && (gl as WebGLRenderingContext).isContextLost?.()) {
      toast.error("Graphics context lost. Please refresh the page.");
      return;
    }

    // Check for supported mime type in video mode
    if (exportMode === 'video') {
      const mimeType = getSupportedMimeType();
      if (!mimeType) {
        toast.error("Video recording not supported. Try PNG sequence mode instead.");
        return;
      }
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

      const resolution = RESOLUTIONS[quality][aspectRatio];
      const { width, height, bitrate } = resolution;
      
      // Log export metadata for debugging
      console.log('Export metadata:', {
        capturedCanvas: canvasRef.current?.id || 'webgl-canvas',
        exportDimensions: { width, height },
        aspectRatio,
        quality,
        srcCanvasSize: { w: srcCanvas.width, h: srcCanvas.height },
        renderReady: renderGate.isReady,
      });
      
      // Store screen width at start for consistent logo scaling
      screenWidthRef.current = window.innerWidth;
      
      // Wait for render ready gate before proceeding
      const isRenderReady = await renderGate.waitForReady(3000);
      if (!isRenderReady) {
        console.warn('Recording: Render not fully ready, proceeding with best effort');
      }
      
      // Signal canvas to render at export resolution and wait for confirmation
      await new Promise<void>((resolve) => {
        const timeoutId = setTimeout(() => {
          console.warn('Recording: Timeout waiting for high-res frame, proceeding anyway');
          resolve();
        }, 2000);
        
        window.dispatchEvent(new CustomEvent('recording:start', { 
          detail: { 
            width, 
            height,
            aspectRatio,
            onReady: () => {
              clearTimeout(timeoutId);
              console.log(`Recording ready: Canvas buffer is ${srcCanvas.width}x${srcCanvas.height}`);
              resolve();
            }
          } 
        }));
      });
      
      const exportCanvas = document.createElement("canvas");
      exportCanvas.width = width;
      exportCanvas.height = height;
      
      // For PNG sequence, we need alpha support
      const ctx = exportCanvas.getContext("2d", { alpha: exportMode === 'png-sequence' });
      if (!ctx) {
        toast.error("Failed to create export canvas.");
        window.dispatchEvent(new CustomEvent('recording:stop'));
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
        
        // Safely capture audio stream
        let audioStream: MediaStream | null = null;
        try {
          if (typeof (audioElement as any).captureStream === 'function') {
            audioStream = (audioElement as any).captureStream();
          } else if (typeof (audioElement as any).mozCaptureStream === 'function') {
            audioStream = (audioElement as any).mozCaptureStream();
          }
        } catch (streamError) {
          console.warn('Audio capture not available, recording video only:', streamError);
        }

        const videoTracks = videoStream.getVideoTracks();
        const audioTracks = audioStream ? audioStream.getAudioTracks() : [];
        const combinedStream = new MediaStream([...videoTracks, ...audioTracks]);

        const mimeType = getSupportedMimeType();
        const mediaRecorder = new MediaRecorder(combinedStream, {
          mimeType,
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
          toast.error("Recording failed during capture.");
        };

        mediaRecorder.start(100);
      }

      setIsRecording(true);
      
      if (audioElement.paused) {
        await audioElement.play();
      }

      // Continuous render loop - capture every frame for smooth output
      // captureStream handles frame rate limiting, so we capture at display refresh rate
      const render = () => {
        if (!keepRenderingRef.current) return;
        
        const ctx = ctxRef.current;
        const exportCanvas = exportCanvasRef.current;
        if (!ctx || !exportCanvas) {
          requestAnimationFrame(render);
          return;
        }

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
          drawLogoWithSettings(ctx, logoImageRef.current, logo, exportCanvas, screenWidthRef.current);
        }
        
        // Draw visualizer with proper aspect ratio handling to prevent distortion
        const srcAspect = srcCanvas.width / srcCanvas.height;
        const destAspect = exportCanvas.width / exportCanvas.height;
        
        let sx = 0, sy = 0, sw = srcCanvas.width, sh = srcCanvas.height;
        const dx = 0, dy = 0, dw = exportCanvas.width, dh = exportCanvas.height;
        
        // Crop source to match destination aspect ratio (prevents stretching)
        if (Math.abs(srcAspect - destAspect) > 0.01) {
          if (srcAspect > destAspect) {
            // Source is wider - crop sides
            sw = srcCanvas.height * destAspect;
            sx = (srcCanvas.width - sw) / 2;
          } else {
            // Source is taller - crop top/bottom
            sh = srcCanvas.width / destAspect;
            sy = (srcCanvas.height - sh) / 2;
          }
        }
        
        ctx.drawImage(srcCanvas, sx, sy, sw, sh, dx, dy, dw, dh);
        
        // Draw logo IN FRONT of visualizer if layer is 'front'
        if (logo?.url && logoImageRef.current && logo.layer === 'front') {
          drawLogoWithSettings(ctx, logoImageRef.current, logo, exportCanvas, screenWidthRef.current);
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
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes('NotSupportedError')) {
        toast.error("Recording format not supported. Try a different browser.");
      } else if (errorMessage.includes('NotAllowedError')) {
        toast.error("Recording permission denied.");
      } else if (errorMessage.includes('InvalidStateError')) {
        toast.error("Canvas not ready. Please try again.");
      } else {
        toast.error(`Recording failed: ${errorMessage.substring(0, 50)}`);
      }
    }
  }, [canvasRef, audioElement]);

  const stopRecording = useCallback(async () => {
    keepRenderingRef.current = false;
    // Signal canvas to return to normal resolution
    window.dispatchEvent(new CustomEvent('recording:stop'));
    
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
  screenWidth: number
) {
  ctx.save();
  ctx.globalAlpha = logo.opacity / 100;
  
  // Scale logo based on screen width at start of recording (not srcCanvas which changes with DPR)
  const scaleFactor = exportCanvas.width / screenWidth;
  const logoWidth = logo.size * scaleFactor;
  const logoHeight = (logoImage.height / logoImage.width) * logoWidth;
  const x = (logo.position.x / 100) * exportCanvas.width - logoWidth / 2;
  const y = (logo.position.y / 100) * exportCanvas.height - logoHeight / 2;
  
  if (logo.colorMode === 'invert') {
    // Draw logo to temp canvas and invert RGB while preserving alpha
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = logoWidth;
    tempCanvas.height = logoHeight;
    const tempCtx = tempCanvas.getContext('2d');
    if (tempCtx) {
      tempCtx.drawImage(logoImage, 0, 0, logoWidth, logoHeight);
      // Get image data and invert RGB while preserving alpha
      const imageData = tempCtx.getImageData(0, 0, logoWidth, logoHeight);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        // Invert RGB, keep alpha unchanged
        data[i] = 255 - data[i];       // R
        data[i + 1] = 255 - data[i + 1]; // G
        data[i + 2] = 255 - data[i + 2]; // B
        // data[i + 3] is alpha - leave it alone
      }
      tempCtx.putImageData(imageData, 0, 0);
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
