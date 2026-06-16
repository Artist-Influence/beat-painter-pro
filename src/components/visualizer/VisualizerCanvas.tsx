import React, { Suspense, lazy, useCallback, useEffect, useMemo, useState, useRef } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useStudioStore } from "@/stores/studioStore";
import { visualizerRegistry, VISUALIZER_SCALES, isCustomVisualizer } from "@/components/visualizers";
import type { AudioData } from "@/hooks/useAudioAnalysis";
import { useAudioAnalysis } from "@/hooks/useAudioAnalysis";
import { useCustomVisualizers } from "@/hooks/useCustomVisualizers";
import { CustomVisualizerLoader } from "@/components/visualizers/CustomVisualizerLoader";
import { makeFractalVisualizer } from "@/components/visualizers/FractalVisualizer";
import { makeProceduralVisualizer } from "@/components/visualizers/ProceduralPreset";
import { makeCartoonVisualizer } from "@/components/visualizers/Cartoon2DVisualizer";
import { makeSandVisualizer } from "@/components/visualizers/SandFlowVisualizer";
import { usePresetStore } from "@/stores/presetStore";
import type { Sand3DConfig } from "@/lib/sand3d/unicornEngine";
import type { DawConfig } from "@/lib/daw/dawEngine";
import * as THREE from "three";

// Heavy visualizers are code-split (see components/visualizers/index.ts); load
// their modules on demand here too so the saved/generated-preset path doesn't
// pull the shaders + FFT/decode code back into the main bundle.
const makeSand3DLazy = (preset: Sand3DConfig) =>
  lazy(async () => ({ default: (await import("@/components/visualizers/Sand3DVisualizer")).makeSand3DVisualizer(preset) }));
const makeDawLazy = (preset: DawConfig) =>
  lazy(async () => ({ default: (await import("@/components/visualizers/DawWaveformVisualizer")).makeDawVisualizer(preset) }));

interface VisualizerCanvasProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  logoBehind?: boolean;
}

// Declare global for render ready flag
declare global {
  interface Window {
    __VISUALIZER_RENDER_READY__: boolean;
  }
}

// Component inside Canvas to directly control renderer for high-quality recording
// CRITICAL: Actually resizes the WebGL canvas buffer for export resolution
function RecordingController() {
  const frameCountRef = useRef(0);
  const [renderReady, setRenderReady] = useState(false);
  
  // Track frames rendered and set global ready flag
  useFrame(() => {
    frameCountRef.current++;
    if (frameCountRef.current >= 5 && !renderReady) {
      setRenderReady(true);
      window.__VISUALIZER_RENDER_READY__ = true;
      console.log('VisualizerCanvas: Render ready after 5 frames');
    }
  });
  
  // Initialize global ready flag
  useEffect(() => {
    window.__VISUALIZER_RENDER_READY__ = false;
    frameCountRef.current = 0;
    return () => { 
      window.__VISUALIZER_RENDER_READY__ = false; 
    };
  }, []);
  
  // Listen for recording events - no canvas resizing, just signal ready
  useEffect(() => {
    const handleRecordingStart = (e: Event) => {
      const { onReady } = (e as CustomEvent).detail;
      console.log('Recording: Starting (no canvas resize, export canvas handles scaling)');
      
      // Signal ready after a couple frames
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          console.log('Recording ready');
          if (onReady) onReady();
        });
      });
    };
    
    window.addEventListener('recording:start', handleRecordingStart);
    return () => {
      window.removeEventListener('recording:start', handleRecordingStart);
    };
  }, []);
  
  return null;
}

const VisualizerCanvas: React.FC<VisualizerCanvasProps> = ({ canvasRef, logoBehind = false }) => {
  // Selector subscriptions (not the whole store) so the canvas only re-renders on
  // changes it actually cares about — not on every per-frame store write.
  const selected = useStudioStore((s) => s.selected);
  const background = useStudioStore((s) => s.background);
  const zoomLevel = useStudioStore((s) => s.zoomLevel);
  const audioElement = useStudioStore((s) => s.audioElement);
  const { customVisualizers } = useCustomVisualizers();
  const savedPresets = usePresetStore((s) => s.presets);
  const previewConfig = usePresetStore((s) => s.preview);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  const { Visualizer, scale, initialCode, initialConfig } = useMemo(() => {
    // Generated / saved presets (client-side): fractal shader OR procedural 3D model
    if (selected === '__preview__' || (typeof selected === 'string' && selected.startsWith('preset_'))) {
      const item = usePresetStore.getState().resolve(selected);
      if (item?.kind === 'fractal') {
        return { Visualizer: makeFractalVisualizer(item.fractal), scale: 1, initialCode: undefined, initialConfig: undefined };
      }
      if (item?.kind === 'procedural') {
        return { Visualizer: makeProceduralVisualizer(item.procedural), scale: 0.5, initialCode: undefined, initialConfig: undefined };
      }
      if (item?.kind === 'cartoon') {
        return { Visualizer: makeCartoonVisualizer(item.cartoon), scale: 1, initialCode: undefined, initialConfig: undefined };
      }
      if (item?.kind === 'sand') {
        return { Visualizer: makeSandVisualizer(item.sand), scale: 1, initialCode: undefined, initialConfig: undefined };
      }
      if (item?.kind === 'sand3d') {
        return { Visualizer: makeSand3DLazy(item.sand3d), scale: 1, initialCode: undefined, initialConfig: undefined };
      }
      if (item?.kind === 'daw') {
        return { Visualizer: makeDawLazy(item.daw), scale: 1, initialCode: undefined, initialConfig: undefined };
      }
      return { Visualizer: undefined, scale: 1, initialCode: undefined, initialConfig: undefined };
    }
    if (isCustomVisualizer(selected)) {
      const customViz = customVisualizers.find(viz => `custom_${viz.id}` === selected);
      
      console.log('VisualizerCanvas: Looking up custom visualizer', { 
        selected, 
        found: !!customViz, 
        storeCount: customVisualizers.length,
        allIds: customVisualizers.map(v => v.id)
      });
      
      // Try to parse jsx_code as JSON config (new system)
      let parsedConfig = null;
      if (customViz?.jsx_code) {
        try {
          const parsed = JSON.parse(customViz.jsx_code);
          if (parsed.seed !== undefined && parsed.baseShape) {
            parsedConfig = parsed;
          }
        } catch {
          // Not JSON, treat as legacy code
        }
      }
      
      return {
        Visualizer: CustomVisualizerLoader,
        scale: customViz?.scale_factor || 0.12, // Match save default
        initialCode: parsedConfig ? undefined : customViz?.jsx_code,
        initialConfig: parsedConfig
      };
    } else {
      return {
        Visualizer: visualizerRegistry[selected as keyof typeof visualizerRegistry],
        scale: VISUALIZER_SCALES[selected] ?? 0.25,
        initialCode: undefined,
        initialConfig: undefined
      };
    }
  }, [selected, customVisualizers, savedPresets, previewConfig]);

  const audioRef = useRef<AudioData>({ frequency: new Array(256).fill(0), frequencyRaw: new Array(256).fill(0), amplitude: 0, beatStrength: 0, sampleRate: 44100 });
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [styleVersion, setStyleVersion] = useState(0);

  // Initialize defaults for global styles used by visualizers
  useEffect(() => {
    (window as any).extractedColors = (window as any).extractedColors || {
      primary: "#ffffff",
      secondary: "#cccccc",
      accent: "#88ccff",
      isNeon: false,
      isMetallic: false,
    };
    (window as any).appliedTexture = (window as any).appliedTexture || null;
  }, []);

  // Set up audio analyser when audio element available (singleton AudioContext + reused source)
  useEffect(() => {
    if (!audioElement) return;

    const W = window as any;
    // Singleton AudioContext across the app to prevent duplicate MediaElementSourceNodes
    if (!W.__AUDIO_CTX__) {
      W.__AUDIO_CTX__ = new (window.AudioContext || W.webkitAudioContext)();
    }
    const ctx: AudioContext = W.__AUDIO_CTX__ as AudioContext;

    // WeakMap to reuse MediaElementAudioSourceNode per HTMLMediaElement
    if (!W.__MEDIA_ELEMENT_SOURCES__) {
      W.__MEDIA_ELEMENT_SOURCES__ = new WeakMap<HTMLMediaElement, MediaElementAudioSourceNode>();
    }
    const sourceMap: WeakMap<HTMLMediaElement, MediaElementAudioSourceNode> = W.__MEDIA_ELEMENT_SOURCES__;

    let source = sourceMap.get(audioElement);
    if (!source) {
      source = ctx.createMediaElementSource(audioElement);
      sourceMap.set(audioElement, source);
    }

    // Create an analyser for this session and wire the graph: source -> analyser -> gainNode -> destination
    const analyserNode = ctx.createAnalyser();
    analyserNode.fftSize = 2048;
    // Note: smoothingTimeConstant is set in useAudioAnalysis hook for centralized control

    // Create a GainNode for volume control (after analyser so visualizer stays reactive when muted)
    const gainNode = ctx.createGain();
    gainNode.gain.value = W.__GAIN_VALUE__ ?? 0.75; // Restore previous volume or default
    W.__GAIN_NODE__ = gainNode;

    // Connect our analyser and gain node; we only disconnect these in cleanup
    source.connect(analyserNode);
    analyserNode.connect(gainNode);
    gainNode.connect(ctx.destination);
    // Tee the post-gain signal into a persistent MediaStream for the recorder, so
    // export never calls captureStream() on the <audio> element (doing so stole its
    // output and dropped the song mid-record). One stream dest per context.
    if (!W.__STREAM_DEST__) { W.__STREAM_DEST__ = ctx.createMediaStreamDestination(); }
    try { gainNode.connect(W.__STREAM_DEST__); } catch {}
    setAnalyser(analyserNode);

    // Keep the context alive — browsers auto-suspend it without a gesture and when
    // the tab is backgrounded (the "song stops mid-way", esp. during long party-mode sets).
    const resume = () => { if (ctx.state === 'suspended') ctx.resume().catch(() => {}); };
    resume();
    ctx.onstatechange = () => { if (ctx.state === 'suspended' && !audioElement.paused) ctx.resume().catch(() => {}); };

    const onPlay = () => { resume(); setIsPlaying(true); };
    const onPause = () => setIsPlaying(false);
    audioElement.addEventListener("play", onPlay);
    audioElement.addEventListener("pause", onPause);
    setIsPlaying(!audioElement.paused);

    return () => {
      audioElement.removeEventListener("play", onPlay);
      audioElement.removeEventListener("pause", onPause);
      // Fully tear down this session's graph so a re-upload doesn't leave the old
      // gain node feeding ctx.destination / the recorder stream (double audio).
      // Persist the volume so the freshly-built graph restores it.
      try { W.__GAIN_VALUE__ = gainNode.gain.value; } catch {}
      try { source.disconnect(analyserNode); } catch {}
      try { analyserNode.disconnect(); } catch {}
      try { gainNode.disconnect(); } catch {}
    };
  }, [audioElement]);

  // Audio bus: write the (sensitivity-scaled) audio into a STABLE ref every frame.
  // Visualizers read it inside their own useFrame, so there is NO per-frame React
  // re-render of the canvas subtree — this was the dominant production-lag source.
  const writeAudio = useCallback((d: AudioData) => {
    const ref = audioRef.current;
    const fr = useStudioStore.getState().fractalReactivity;
    const g = fr.enabled ? fr.sensitivity : 0;
    const n = d.frequency.length;
    if (ref.frequency.length !== n) { ref.frequency = new Array(n).fill(0); ref.frequencyRaw = new Array(n).fill(0); }
    const raw = d.frequencyRaw ?? d.frequency;
    for (let i = 0; i < n; i++) { ref.frequency[i] = Math.min(255, d.frequency[i] * g); ref.frequencyRaw[i] = Math.min(255, (raw[i] ?? 0) * g); }
    ref.amplitude = Math.min(2.2, d.amplitude * g);
    ref.beatStrength = Math.min(2.2, d.beatStrength * g);
    ref.sampleRate = d.sampleRate;
    (window as Window & { __AUDIO_LEVEL__?: { level: number; beat: number } }).__AUDIO_LEVEL__ = { level: ref.amplitude, beat: ref.beatStrength };
  }, []);
  useAudioAnalysis(analyser, isPlaying, writeAudio);

  useEffect(() => {
    const handler = () => setStyleVersion((v) => v + 1);
    window.addEventListener("style:applied", handler);
    return () => window.removeEventListener("style:applied", handler);
  }, []);

  // Update renderer clear color when logo is behind or custom background
  useEffect(() => {
    if (rendererRef.current) {
      if (logoBehind || background.type !== 'color') {
        rendererRef.current.setClearColor(0x000000, 0); // Fully transparent
      } else {
        const color = new THREE.Color(background.color);
        rendererRef.current.setClearColor(color, 1);
      }
    }
  }, [background.color, background.type, logoBehind]);

  const handleCreated = useCallback(({ gl }: any) => {
    const canvas = gl.domElement as HTMLCanvasElement;
    
    // TAG THE CANVAS FOR IDENTIFICATION (CRITICAL FOR EXPORT)
    canvas.id = "visualizer-canvas";
    canvas.dataset.visualizerCanvas = "true";
    
    if (canvasRef) {
      (canvasRef as any).current = canvas;
    }
    // Store renderer reference for transparency control
    rendererRef.current = gl;
    // Set initial clear color - transparent if logo is behind or custom background
    if (logoBehind || background.type !== 'color') {
      gl.setClearColor(0x000000, 0);
    } else {
      const color = new THREE.Color(background.color);
      gl.setClearColor(color, 1);
    }
    
    console.log(`VisualizerCanvas: WebGL canvas created with id="${canvas.id}", size=${canvas.width}x${canvas.height}`);
  }, [canvasRef, background.color, background.type, logoBehind]);

  return (
    <div className="absolute inset-0 flex items-center justify-center z-0">
      <div 
        className="w-full h-full" 
        style={{ 
          backgroundColor: (logoBehind || background.type !== 'color') ? 'transparent' : background.color 
        }}
      >
        <Canvas
          onCreated={handleCreated}
          gl={{
            preserveDrawingBuffer: true,
            antialias: true,
            alpha: true,
            powerPreference: "high-performance",
            stencil: false,
            depth: true,
          }}
          dpr={[1, 1.5]}
          camera={{ position: [0, 0, 5], fov: 50 }}
          style={{ width: '100%', height: '100%' }}
        >
          <RecordingController />
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={0.5} />
          <group position={[0, 0, 0]} scale={scale * zoomLevel}>
            <Suspense fallback={null}>
              {Visualizer && (
                <Visualizer
                  key={`${styleVersion}-${selected}`}
                  audioData={audioRef.current}
                  isPlaying={isPlaying}
                  backgroundColor={background.color}
                  zoomLevel={zoomLevel}
                  {...(isCustomVisualizer(selected) ? { 
                    visualizerKey: selected,
                    initialCode: initialCode,
                    initialConfig: initialConfig
                  } : {})}
                />
              )}
            </Suspense>
          </group>
          <OrbitControls enablePan={false} enableZoom={false} />
        </Canvas>
      </div>
    </div>
  );
};

export default VisualizerCanvas;
