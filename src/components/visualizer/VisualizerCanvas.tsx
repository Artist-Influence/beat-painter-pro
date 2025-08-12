import React, { useCallback, useEffect, useMemo, useState } from "react";
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

  // Set up audio analyser when audio element available
  useEffect(() => {
    if (!audioElement) return;
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const source = ctx.createMediaElementSource(audioElement);
    const analyserNode = ctx.createAnalyser();
    analyserNode.fftSize = 512; // 256 bins
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
      try { ctx.close(); } catch {}
    };
  }, [audioElement]);

  useAudioAnalysis(analyser, isPlaying, setAudioData);

  const handleCreated = useCallback(({ gl }: any) => {
    if (canvasRef) {
      (canvasRef as any).current = gl.domElement as HTMLCanvasElement;
    }
  }, [canvasRef]);

  const filterStyle = {
    filter: `brightness(${(filters.brightness || 100) / 100}) saturate(${(filters.saturation || 100) / 100}) contrast(${(filters.contrast || 100) / 100})`
  } as React.CSSProperties;

  const scale = VISUALIZER_SCALES[selected] ?? 0.25;

  return (
    <div className="w-full max-w-3xl rounded-lg border border-border bg-card shadow" style={filterStyle}>
      <AspectRatio ratio={1}>
        <Canvas onCreated={handleCreated} gl={{ preserveDrawingBuffer: true }} dpr={[1, 2]} camera={{ position: [0, 0, 3] }}>
          <color attach="background" args={[backgroundColor]} />
          <ambientLight intensity={0.3} />
          <group scale={zoomLevel * scale}>
            {Visualizer && <Visualizer audioData={audioData} backgroundColor={backgroundColor} />}
          </group>
          <OrbitControls enablePan={false} enableZoom={false} />
        </Canvas>
      </AspectRatio>
    </div>
  );
};

export default VisualizerCanvas;
