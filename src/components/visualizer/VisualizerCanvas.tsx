import React, { Suspense, useCallback, useEffect, useMemo, useState, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { useStudioStore } from "@/stores/studioStore";
import { visualizerRegistry, VISUALIZER_SCALES, isCustomVisualizer } from "@/components/visualizers";
import type { VisualizerKey } from "@/components/visualizers";
import type { AudioData } from "@/hooks/useAudioAnalysis";
import { useAudioAnalysis } from "@/hooks/useAudioAnalysis";
import { useCustomVisualizers } from "@/hooks/useCustomVisualizers";
import { CustomVisualizerLoader } from "@/components/visualizers/CustomVisualizerLoader";
import * as THREE from "three";

interface VisualizerCanvasProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  logoBehind?: boolean;
}

const VisualizerCanvas: React.FC<VisualizerCanvasProps> = ({ canvasRef, logoBehind = false }) => {
  const { selected, backgroundColor, zoomLevel, audioElement, filters } = useStudioStore();
  const { customVisualizers } = useCustomVisualizers();
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  
  const { Visualizer, scale, initialCode, initialConfig } = useMemo(() => {
    if (isCustomVisualizer(selected)) {
      const customViz = customVisualizers.find(viz => `custom_${viz.id}` === selected);
      
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
        scale: customViz?.scale_factor || 0.25,
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
  }, [selected, customVisualizers]);

  const [audioData, setAudioData] = useState<AudioData>({ frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0, sampleRate: 44100 });
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
    setAnalyser(analyserNode);

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    audioElement.addEventListener("play", onPlay);
    audioElement.addEventListener("pause", onPause);
    setIsPlaying(!audioElement.paused);

    return () => {
      audioElement.removeEventListener("play", onPlay);
      audioElement.removeEventListener("pause", onPause);
      try {
        analyserNode.disconnect();
      } catch {}
    };
  }, [audioElement]);

  useAudioAnalysis(analyser, isPlaying, setAudioData);

  useEffect(() => {
    const handler = () => setStyleVersion((v) => v + 1);
    window.addEventListener("style:applied", handler);
    return () => window.removeEventListener("style:applied", handler);
  }, []);


  // Update renderer clear color when logo is behind
  useEffect(() => {
    if (rendererRef.current) {
      if (logoBehind) {
        rendererRef.current.setClearColor(0x000000, 0); // Fully transparent for logo behind
      } else {
        const color = new THREE.Color(backgroundColor);
        rendererRef.current.setClearColor(color, 1);
      }
    }
  }, [backgroundColor, logoBehind]);

  const handleCreated = useCallback(({ gl }: any) => {
    if (canvasRef) {
      (canvasRef as any).current = gl.domElement as HTMLCanvasElement;
    }
    // Store renderer reference for transparency control
    rendererRef.current = gl;
    // Set initial clear color - transparent if logo is behind
    if (logoBehind) {
      gl.setClearColor(0x000000, 0);
    } else {
      const color = new THREE.Color(backgroundColor);
      gl.setClearColor(color, 1);
    }
  }, [canvasRef, backgroundColor, logoBehind]);


  

  const filterStyle = {
    filter: `brightness(${((filters.brightness ?? 100) - 0) / 100}) saturate(${((filters.saturation ?? 100) - 0) / 100}) contrast(${((filters.contrast ?? 100) - 0) / 100})`
  } as React.CSSProperties;

  return (
    <div className="absolute inset-0 flex items-center justify-center z-0">
        <div 
        className="w-full h-full" 
        style={{ 
          paddingBottom: '100px', // Account for audio bar height
          paddingTop: '80px',    // Account for top bar
          backgroundColor: logoBehind ? 'transparent' : backgroundColor 
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
          dpr={[1, 2]}
          camera={{ position: [0, 0, 5], fov: 50 }}
          style={{ width: '100%', height: '100%', ...filterStyle }}
        >
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={0.5} />
          <group position={[0, 0, 0]} scale={zoomLevel * scale}>
            <Suspense fallback={null}>
              {Visualizer && (
                <Visualizer 
                  key={`${styleVersion}-${selected}`}
                  audioData={audioData} 
                  isPlaying={isPlaying}
                  backgroundColor={backgroundColor}
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
