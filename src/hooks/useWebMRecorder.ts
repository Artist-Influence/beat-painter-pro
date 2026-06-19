import { useRef, useCallback, useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import JSZip from "jszip";
import { renderGate } from "@/lib/renderReadyGate";
import { useStudioStore, type CompositeState } from "@/stores/studioStore";
import { vizBox } from "@/lib/compositeLayout";

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
  type: 'color' | 'gradient' | 'image' | 'video' | 'transparent';
  color: string;
  gradientUrl?: string | null;
  mediaUrl: string | null;
  mediaType: 'image' | 'gif' | 'video' | null;
  positionY: number;
}

interface UseRecorderProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  audioElement: HTMLAudioElement | null;
}

// Safety caps so an export can never run away: a wall-clock ceiling for video, and
// a frame ceiling for the in-RAM PNG sequence.
const MAX_EXPORT_MS = 12 * 60 * 1000; // 12 minutes
const MAX_PNG_FRAMES = 5400;          // ~90s at 60fps

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

// Prefer MP4 (H.264/AAC) where the browser supports it, else fall back to WebM.
const getSupportedMimeType = (): string => {
  const types = [
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',  // H.264 + AAC - real MP4 with audio
    'video/mp4;codecs=avc1.42E01E',
    'video/mp4',
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
  const layerCanvasRef = useRef<HTMLCanvasElement | null>(null); // offscreen for rotate/feather/opacity compositing
  const chunksRef = useRef<Blob[]>([]);
  const keepRenderingRef = useRef<boolean>(false);
  const startTimeRef = useRef<number>(0);
  const [isRecording, setIsRecording] = useState(false);
  const [frameCount, setFrameCount] = useState(0);
  const [progress, setProgress] = useState(0); // 0..1 export progress (video mode)
  const lastProgressRef = useRef(0);
  const exportRangeRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });

  const backgroundRef = useRef<BackgroundMedia | null>(null);
  const backgroundImageRef = useRef<HTMLImageElement | null>(null);
  const backgroundVideoRef = useRef<HTMLVideoElement | null>(null);
  // Phase 3 - timeline bg track: every image/gradient used by a bg clip, preloaded
  // by URL so the export can follow background scene changes frame-by-frame.
  const bgImageMapRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const logoRef = useRef<LogoState | null>(null);
  const logoImageRef = useRef<HTMLImageElement | null>(null);
  const exportModeRef = useRef<ExportMode>('video');
  // "Export visualizer only": skip the background entirely so the clip is just the
  // visualizer on black (MP4) / alpha (PNG seq) - drop it into an editor over your
  // own footage. Honours the Export segment (timestamps) just like a normal export.
  const vizOnlyRef = useRef(false);
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
    aspectRatio: AspectRatio = 'horizontal',
    vizOnly = false
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
      vizOnlyRef.current = vizOnly;
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
      
      const staticBgUrl = background.type === 'gradient'
        ? background.gradientUrl
        : (background.type === 'image' ? background.mediaUrl : null);
      if (staticBgUrl) {
        const bgImg = new Image();
        bgImg.crossOrigin = 'anonymous';
        bgImg.src = staticBgUrl;
        await new Promise<void>((resolve) => {
          bgImg.onload = () => {
            backgroundImageRef.current = bgImg;
            resolve();
          };
          bgImg.onerror = () => resolve();
        });
      }

      // Timeline bg track: preload every image/gradient a bg clip uses, so the export
      // can switch backgrounds as the playhead moves (videos use the single loaded
      // element below - the common case).
      bgImageMapRef.current = new Map();
      {
        const urls = new Set<string>();
        for (const c of useStudioStore.getState().timeline.clips) {
          if (c.track !== 'bg' || !c.bg) continue;
          const u = c.bg.type === 'gradient' ? c.bg.gradientUrl : (c.bg.type === 'image' ? c.bg.mediaUrl : null);
          if (u) urls.add(u);
        }
        await Promise.all([...urls].map((u) => new Promise<void>((resolve) => {
          const im = new Image(); im.crossOrigin = 'anonymous'; im.src = u;
          im.onload = () => { bgImageMapRef.current.set(u, im); resolve(); };
          im.onerror = () => resolve();
        })));
      }

      // Load background video if needed
      if (background.type === 'video' && background.mediaUrl) {
        const bgVideo = document.createElement('video');
        bgVideo.crossOrigin = 'anonymous';
        bgVideo.src = background.mediaUrl;
        bgVideo.muted = true;
        // When synced to the song, drift-correction owns the playhead - don't loop.
        bgVideo.loop = !useStudioStore.getState().reactionSync.enabled;
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
      console.log('Export metadata (before resize):', {
        capturedCanvasId: canvasRef.current?.id || 'unknown',
        capturedCanvasDataset: canvasRef.current?.dataset?.visualizerCanvas,
        exportDimensions: { width, height },
        aspectRatio,
        quality,
        srcCanvasSize: { w: srcCanvas.width, h: srcCanvas.height },
      });
      
      // Store screen width at start for consistent logo scaling
      screenWidthRef.current = window.innerWidth;
      
      // WAIT FOR RENDER READY (5+ frames rendered)
      let waitAttempts = 0;
      while (!window.__VISUALIZER_RENDER_READY__ && waitAttempts < 50) {
        await new Promise(r => requestAnimationFrame(r));
        waitAttempts++;
      }
      if (!window.__VISUALIZER_RENDER_READY__) {
        console.warn('Recording: Render not fully ready after 50 frames, proceeding anyway');
      } else {
        console.log('Recording: Render ready confirmed');
      }
      
      // Signal canvas to resize to export resolution and wait for confirmation
      await new Promise<void>((resolve) => {
        const timeoutId = setTimeout(() => {
          console.warn('Recording: Timeout waiting for canvas resize, proceeding anyway');
          resolve();
        }, 3000);
        
        window.dispatchEvent(new CustomEvent('recording:start', { 
          detail: { 
            width, 
            height,
            aspectRatio,
            onReady: () => {
              clearTimeout(timeoutId);
              // Verify the canvas was actually resized
              console.log(`Recording: Canvas resize confirmed - now ${srcCanvas.width}x${srcCanvas.height}`);
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
        
        // Capture audio from the Web Audio graph's stream dest (set up in
        // VisualizerCanvas), NOT audioElement.captureStream() - capturing the element
        // that owns the MediaElementSource stole its output and stopped the song.
        let audioStream: MediaStream | null = null;
        try {
          const dest = (window as any).__STREAM_DEST__ as MediaStreamAudioDestinationNode | undefined;
          if (dest?.stream && dest.stream.getAudioTracks().length) {
            audioStream = dest.stream;
          } else if (typeof (audioElement as any).captureStream === 'function') {
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
        const isMp4 = mimeType.startsWith('video/mp4');
        const containerType = isMp4 ? 'video/mp4' : 'video/webm';
        const ext = isMp4 ? 'mp4' : 'webm';
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
          const blob = new Blob(chunksRef.current, { type: containerType });
          const url = URL.createObjectURL(blob);

          const filename = `${songNameRef.current} - ${visualizerNameRef.current}.${ext}`;

          const a = document.createElement("a");
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);

          setIsRecording(false);
          setProgress(0);
          const mb = (blob.size / 1048576).toFixed(1);
          toast.success(`Saved “${filename}” (${mb} MB)`, { description: 'Check your Downloads folder.', duration: 6000 });
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

      // Segment export: seek to the segment start and remember when to auto-stop.
      const segment = useStudioStore.getState().exportSegment;
      const segEnd = segment.enabled ? segment.end : Infinity;
      if (segment.enabled) {
        try { audioElement.currentTime = Math.max(0, segment.start); } catch {}
      }
      // Progress range: the segment if set, else the whole song from where we start.
      const songDur = isFinite(audioElement.duration) ? audioElement.duration : 0;
      exportRangeRef.current = segment.enabled
        ? { start: segment.start, end: segment.end }
        : { start: audioElement.currentTime, end: songDur };
      lastProgressRef.current = 0;
      setProgress(0);

      if (audioElement.paused) {
        await audioElement.play();
      }

      // Continuous render loop - capture every frame for smooth output
      // captureStream handles frame rate limiting, so we capture at display refresh rate
      const recordStartMs = performance.now();
      const render = () => {
        if (!keepRenderingRef.current) return;

        // Hard wall-clock cap - backstop so an export can never run forever if the
        // song duration is unknown (streaming / metadata not loaded) and `ended`
        // never fires. Stops cleanly and lets the user know.
        if (performance.now() - recordStartMs > MAX_EXPORT_MS) {
          toast.message(`Export stopped at the ${Math.round(MAX_EXPORT_MS / 60000)}-minute limit.`);
          setProgress(1);
          stopRecording();
          return;
        }

        // auto-stop at the end of the chosen segment, or at the end of the song when
        // exporting the whole track - so the artist never has to catch the stop.
        const rEndAuto = exportRangeRef.current.end;
        if (audioElement.currentTime >= segEnd
          || (!segment.enabled && rEndAuto > 0 && (audioElement.ended || audioElement.currentTime >= rEndAuto - 0.05))) {
          setProgress(1);
          stopRecording();
          return;
        }

        // report progress (throttled to avoid re-rendering every frame)
        const { start: rStart, end: rEnd } = exportRangeRef.current;
        if (rEnd > rStart) {
          const p = Math.min(1, Math.max(0, (audioElement.currentTime - rStart) / (rEnd - rStart)));
          if (Math.abs(p - lastProgressRef.current) > 0.005) { lastProgressRef.current = p; setProgress(p); }
        }

        const ctx = ctxRef.current;
        const exportCanvas = exportCanvasRef.current;
        if (!ctx || !exportCanvas) {
          requestAnimationFrame(render);
          return;
        }

        // When the timeline is on, follow the LIVE background each frame (the bg-track
        // engine writes it), sourcing images/gradients from the preload map; otherwise
        // use the background captured at export start.
        const tlOn = useStudioStore.getState().timeline.enabled;
        const bg = tlOn ? (useStudioStore.getState().background as unknown as BackgroundMedia) : backgroundRef.current;
        const bgImgUrl = bg?.type === 'gradient' ? bg.gradientUrl : (bg?.type === 'image' ? bg.mediaUrl : null);
        const bgImg = (bgImgUrl && bgImageMapRef.current.get(bgImgUrl)) || backgroundImageRef.current;
        const logo = logoRef.current;

        // Draw background first (transparent + png-sequence + viz-only keep alpha;
        // viz-only deliberately ignores whatever background is set so you get a
        // clean visualizer pass - black in MP4, true alpha in a PNG sequence)
        if (vizOnlyRef.current || exportModeRef.current === 'png-sequence' || bg?.type === 'transparent') {
          ctx.clearRect(0, 0, exportCanvas.width, exportCanvas.height);
        } else if (bg?.type === 'video' && backgroundVideoRef.current) {
          // Song-master sync: keep the reaction video aligned to the audio playhead
          // (+ offset) so the exported overlay matches the live preview.
          const vid = backgroundVideoRef.current;
          const rs = useStudioStore.getState().reactionSync;
          if (rs.enabled && audioElement) {
            const target = audioElement.currentTime + rs.offset;
            const dur = vid.duration;
            if (dur && isFinite(dur)) {
              const last = dur - 0.05;
              if (target >= last) {
                // clip shorter than the song - hold the last frame (no end-of-clip jitter)
                if (!vid.paused) vid.pause();
                if (Math.abs(vid.currentTime - last) > 0.06) { try { vid.currentTime = last; } catch {} }
              } else {
                const clamped = Math.max(0, target);
                if (Math.abs(vid.currentTime - clamped) > 0.08) { try { vid.currentTime = clamped; } catch {} }
              }
            }
          }
          drawBackgroundMedia(ctx, vid, exportCanvas.width, exportCanvas.height, bg.positionY);
        } else if ((bg?.type === 'image' || bg?.type === 'gradient') && bgImg) {
          drawBackgroundMedia(ctx, bgImg, exportCanvas.width, exportCanvas.height, bg.positionY);
        } else {
          ctx.fillStyle = bg?.color || '#000000';
          ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
        }
        
        // Draw logo BEHIND visualizer if layer is 'behind'
        if (logo?.url && logoImageRef.current && logo.layer === 'behind') {
          drawLogoWithSettings(ctx, logoImageRef.current, logo, exportCanvas, screenWidthRef.current);
        }
        
        // Effects (zoom + brightness/saturation/contrast) and composite transform,
        // applied universally so they affect every visualizer type in the export.
        const store = useStudioStore.getState();
        const f = store.filters;
        const filterStr = `brightness(${f.brightness}%) saturate(${f.saturation}%) contrast(${f.contrast}%)`;
        // Match the live preview's blend: over a video/image clip, drop the
        // visualizer's opaque black background ('screen') so the footage shows
        // through. Never blend on alpha exports (png-sequence / transparent bg).
        const isAlphaExport = exportModeRef.current === 'png-sequence' || bg?.type === 'transparent';

        // Draw ONE visualizer layer (its WebGL canvas) with its composite framing onto
        // the export canvas - the primary visualizer and then each extra layer
        // (Phase 2), in order, so the export matches the stacked live preview.
        const drawOneLayer = (layerSrc: HTMLCanvasElement, comp: CompositeState) => {
          // Unified framing (matches the live preview): the visualizer occupies its own
          // aspect box (vizAspect, may differ from the export frame); crop mode clips it.
          const box = vizBox(comp, store.exportAspectRatio);
          const dw = box.w * exportCanvas.width;
          const dh = box.h * exportCanvas.height;
          const dx = box.left * exportCanvas.width;
          const dy = box.top * exportCanvas.height;
          const blendSel = comp.blend ?? 'normal'; // normal unless user picks Glow/Lighten
          const blendOp: GlobalCompositeOperation = (!isAlphaExport && blendSel !== 'normal')
            ? (blendSel === 'lighten' ? 'lighten' : 'screen') : 'source-over';
          const rot = (comp.rotate ?? 0) * Math.PI / 180;
          const opacity = comp.opacity ?? 1;
          const feather = comp.feather ?? 0;
          const cxC = comp.x * exportCanvas.width, cyC = comp.y * exportCanvas.height;

          // Draw the framed visualizer (crop/mask/scale) onto a target 2D context.
          const drawViz = (tctx: CanvasRenderingContext2D) => {
            if (comp.crop) {
              const W = exportCanvas.width, H = exportCanvas.height;
              const ww = Math.min(W, comp.cropW * W), wh = Math.min(H, comp.cropH * H);
              const wx = cxC - ww / 2, wy = cyC - wh / 2;
              const round = comp.mask === 'circle' ? Math.min(ww, wh) * 0.5
                : comp.mask === 'rounded' ? Math.min(ww, wh) * 0.08 : 0;
              tctx.save();
              tctx.beginPath();
              roundRectPath(tctx, wx, wy, ww, wh, round);
              tctx.clip();
              tctx.drawImage(layerSrc, 0, 0, layerSrc.width, layerSrc.height, dx, dy, dw, dh);
              tctx.restore();
            } else if (comp.mask !== 'none') {
              tctx.save();
              tctx.beginPath();
              if (comp.mask === 'circle') tctx.arc(dx + dw / 2, dy + dh / 2, Math.min(dw, dh) / 2, 0, Math.PI * 2);
              else roundRectPath(tctx, dx, dy, dw, dh, Math.min(dw, dh) * 0.08);
              tctx.clip();
              tctx.drawImage(layerSrc, 0, 0, layerSrc.width, layerSrc.height, dx, dy, dw, dh);
              tctx.restore();
            } else {
              tctx.drawImage(layerSrc, 0, 0, layerSrc.width, layerSrc.height, dx, dy, dw, dh);
            }
          };

          // Background fill: when the blend drops the visualizer's dark background, draw a
          // black backing (at bgOpacity) under it, clipped to the same region.
          const bgOpacity = comp.bgOpacity ?? 0;
          if (bgOpacity > 0 && blendOp !== 'source-over') {
            ctx.save();
            if (rot !== 0) { ctx.translate(cxC, cyC); ctx.rotate(rot); ctx.translate(-cxC, -cyC); }
            ctx.beginPath();
            if (comp.crop) {
              const W = exportCanvas.width, H = exportCanvas.height;
              const ww = Math.min(W, comp.cropW * W), wh = Math.min(H, comp.cropH * H);
              const round = comp.mask === 'circle' ? Math.min(ww, wh) * 0.5 : comp.mask === 'rounded' ? Math.min(ww, wh) * 0.08 : 0;
              roundRectPath(ctx, cxC - ww / 2, cyC - wh / 2, ww, wh, round);
            } else if (comp.mask === 'circle') {
              ctx.arc(dx + dw / 2, dy + dh / 2, Math.min(dw, dh) / 2, 0, Math.PI * 2);
            } else {
              roundRectPath(ctx, dx, dy, dw, dh, comp.mask === 'rounded' ? Math.min(dw, dh) * 0.08 : 0);
            }
            ctx.clip();
            ctx.globalAlpha = bgOpacity;
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
            ctx.globalAlpha = 1;
            ctx.restore();
          }

          // Rotate / feather / opacity composite as a UNIT (matching the CSS preview),
          // so route through an offscreen layer when any are active; else draw direct.
          if (feather > 0 || rot !== 0 || opacity < 1) {
            let layer = layerCanvasRef.current;
            if (!layer) { layer = document.createElement('canvas'); layerCanvasRef.current = layer; }
            if (layer.width !== exportCanvas.width || layer.height !== exportCanvas.height) {
              layer.width = exportCanvas.width; layer.height = exportCanvas.height;
            }
            const lctx = layer.getContext('2d')!;
            lctx.setTransform(1, 0, 0, 1, 0, 0);
            lctx.globalCompositeOperation = 'source-over';
            lctx.globalAlpha = 1;
            lctx.clearRect(0, 0, layer.width, layer.height);
            lctx.filter = filterStr;
            if (rot !== 0) { lctx.save(); lctx.translate(cxC, cyC); lctx.rotate(rot); lctx.translate(-cxC, -cyC); drawViz(lctx); lctx.restore(); }
            else drawViz(lctx);
            lctx.filter = 'none';
            if (feather > 0) {
              const W = exportCanvas.width, H = exportCanvas.height;
              const rw = (comp.crop ? comp.cropW : comp.scale) * W * 0.5;
              const rh = (comp.crop ? comp.cropH : comp.scale) * H * 0.5;
              const rr = Math.max(rw, rh, 1);
              const g = lctx.createRadialGradient(cxC, cyC, rr * (1 - feather), cxC, cyC, rr);
              g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
              lctx.globalCompositeOperation = 'destination-in';
              lctx.save(); lctx.translate(cxC, cyC); lctx.scale(rw / rr, rh / rr); lctx.translate(-cxC, -cyC);
              lctx.fillStyle = g; lctx.fillRect(0, 0, W, H); lctx.restore();
              lctx.globalCompositeOperation = 'source-over';
            }
            ctx.globalCompositeOperation = blendOp;
            ctx.globalAlpha = opacity;
            ctx.drawImage(layer, 0, 0);
            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = 'source-over';
          } else {
            ctx.filter = filterStr;
            ctx.globalCompositeOperation = blendOp;
            drawViz(ctx);
            ctx.filter = 'none';
            ctx.globalCompositeOperation = 'source-over'; // reset so logo/overlays draw normally
          }
        };

        // Primary visualizer first, then each extra layer stacked above it (Phase 2).
        drawOneLayer(srcCanvas, store.composite);
        for (const lyr of store.layers) {
          const lc = document.querySelector(`canvas[data-layer-id="${lyr.id}"]`) as HTMLCanvasElement | null;
          if (lc && lc.width > 0 && lc.height > 0) drawOneLayer(lc, lyr.composite);
        }

        // Draw logo IN FRONT of visualizer if layer is 'front'
        if (logo?.url && logoImageRef.current && logo.layer === 'front') {
          drawLogoWithSettings(ctx, logoImageRef.current, logo, exportCanvas, screenWidthRef.current);
        }

        // Capture PNG frame for sequence mode
        if (exportModeRef.current === 'png-sequence') {
          // Cap frames - each is a full-res PNG held in RAM; an unbounded sequence
          // OOMs the tab on long songs. Stop + warn at the limit.
          if (pngFramesRef.current.length >= MAX_PNG_FRAMES) {
            toast.message(`Reached the ${MAX_PNG_FRAMES}-frame limit - saving what’s captured.`);
            stopRecording();
            return;
          }
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
      // Roll back any partial setup: stop the loop, restore the canvas resolution,
      // and release the background video so a failed start doesn't leave the studio
      // wedged at export resolution with a stray playing <video>.
      keepRenderingRef.current = false;
      window.dispatchEvent(new CustomEvent('recording:stop'));
      try { backgroundVideoRef.current?.pause(); } catch {}
      backgroundVideoRef.current = null;
      setIsRecording(false);
      setProgress(0);

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
    // Ignore stop calls when nothing is actually recording (avoids spurious
    // resize events / "No frames" toasts if stop fires while idle).
    if (!keepRenderingRef.current && mediaRecorderRef.current?.state !== 'recording') return;
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

  // Guard against navigating away mid-export - leaving the tab corrupts the capture.
  useEffect(() => {
    if (!isRecording) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [isRecording]);

  return { startRecording, stopRecording, isRecording, frameCount, progress };
};

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

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
