import { useVisualizerTexture, createVisualizerMaterial } from "@/hooks/useVisualizerTexture";

export { useVisualizerTexture, createVisualizerMaterial };

// Template for new visualizers
export const VISUALIZER_TEMPLATE = `import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { VisualizerProps } from "../visualizer";
import { useVisualizerTexture, createVisualizerMaterial } from "@/hooks/useVisualizerTexture";

export default function YourVisualizerName({
  audioData = { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 },
  styleAdjustments = { brightness: 100, saturation: 100, contrast: 100 },
  width = 1080,
  height = 1080,
  zoomLevel = 1,
  backgroundColor = '#FFFFFF',
}: VisualizerProps) {
  const groupRef = useRef<THREE.Group>(null);
  const textureData = useVisualizerTexture();
  
  const safeAudioData = audioData || { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 };
  const frequency = safeAudioData.frequency || Array(256).fill(0);
  
  // Audio analysis
  const bass = useMemo(() => {
    let sum = 0;
    for (let i = 0; i <= 85; i++) sum += frequency[i] || 0;
    return Math.min(sum / 86 / 255, 1.0);
  }, [frequency]);
  
  const mids = useMemo(() => {
    let sum = 0;
    for (let i = 86; i <= 170; i++) sum += frequency[i] || 0;
    return Math.min(sum / 85 / 255, 1.0);
  }, [frequency]);
  
  const highs = useMemo(() => {
    let sum = 0;
    for (let i = 171; i <= 255; i++) sum += frequency[i] || 0;
    return Math.min(sum / 85 / 255, 1.0);
  }, [frequency]);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      // Your animation logic here
    }
  });
  
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      
      <group ref={groupRef}>
        {/* Your 3D objects here */}
        <mesh
          material={createVisualizerMaterial(
            textureData.colors.primary,
            textureData,
            {
              emissive: textureData.colors.primary,
              emissiveIntensity: 0.5 + bass * 2,
              metalness: 0.8,
              roughness: 0.2,
            }
          )}
        >
          <sphereGeometry args={[1, 32, 32]} />
        </mesh>
      </group>
    </>
  );
}`;

// Audio analysis utilities
export const analyzeAudio = (frequency: number[]) => {
  const bass = frequency.slice(0, 86).reduce((sum, val) => sum + val, 0) / 86 / 255;
  const mids = frequency.slice(86, 171).reduce((sum, val) => sum + val, 0) / 85 / 255;
  const highs = frequency.slice(171, 256).reduce((sum, val) => sum + val, 0) / 85 / 255;
  
  return {
    bass: Math.min(bass, 1.0),
    mids: Math.min(mids, 1.0),
    highs: Math.min(highs, 1.0),
  };
};