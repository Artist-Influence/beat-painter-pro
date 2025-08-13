import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { useStudioStore } from "@/stores/studioStore";
import { visualizerRegistry, VISUALIZER_SCALES } from "@/components/visualizers";
import type { VisualizerKey } from "@/components/visualizers";
import type { AudioData } from "@/hooks/useAudioAnalysis";
import { useAudioAnalysis } from "@/hooks/useAudioAnalysis";

interface VisualizerCanvasProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
}

const VisualizerCanvas: React.FC<VisualizerCanvasProps> = ({ canvasRef }) => {
  const { selected, backgroundColor, zoomLevel, audioElement, filters } = useStudioStore();
  const Visualizer = useMemo(() => visualizerRegistry[selected as VisualizerKey], [selected]);

  const [audioData, setAudioData] = useState<AudioData>({ frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 });
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

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

    // Create an analyser for this session and wire the graph: source -> analyser -> destination
    const analyserNode = ctx.createAnalyser();
    analyserNode.fftSize = 2048;
    analyserNode.smoothingTimeConstant = 0.8;

    // Connect our analyser; we only disconnect this analyser in cleanup
    source.connect(analyserNode);
    analyserNode.connect(ctx.destination);
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

  const handleCreated = useCallback(({ gl }: any) => {
    if (canvasRef) {
      (canvasRef as any).current = gl.domElement as HTMLCanvasElement;
    }
  }, [canvasRef]);


  const scale = VISUALIZER_SCALES[selected] ?? 0.25;

  return (
    <div className="w-full max-w-3xl rounded-lg border border-border bg-card shadow">
      <AspectRatio ratio={1}>
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
            camera={{ position: [0, 0, 3], fov: 50 }}
          >
            <fog attach="fog" args={[backgroundColor, 5, 15]} />
            <color attach="background" args={[backgroundColor]} />
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} intensity={0.5} />
            <group scale={zoomLevel * scale}>
              <Suspense fallback={null}>
                {Visualizer && (
                  <Visualizer audioData={audioData} backgroundColor={backgroundColor} />
                )}
              </Suspense>
            </group>
            <OrbitControls enablePan={false} enableZoom={false} />
          </Canvas>
      </AspectRatio>
    </div>
  );
};

export default VisualizerCanvas;
