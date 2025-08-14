import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment, MeshDistortMaterial } from "@react-three/drei";
import * as THREE from "three";
import { VisualizerProps } from ".";
import { useVisualizerTexture } from "@/hooks/useVisualizerTexture";

function LiquidBlob({ position, index, audioData, textureData }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  const safeAudioData = audioData || { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 };
  const freqData = safeAudioData.frequency || Array(256).fill(0);
  
  const blobFreq = useMemo(() => {
    const start = index * 20;
    const end = Math.min(start + 20, 256);
    let sum = 0;
    for (let i = start; i < end; i++) sum += freqData[i] || 0;
    return Math.min(sum / 20 / 255, 1.0);
  }, [freqData, index]);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      const t = clock.getElapsedTime();
      
      // Move outward when audio is playing to prevent overlap
      const audioIntensity = blobFreq;
      const spreadDistance = audioIntensity * 15.0 + 2.0; // Massive spread distance
      const direction = position[0] > 0 ? 1 : -1;
      const x = position[0] + (direction * spreadDistance);
      const z = position[2] + (Math.sin(t * 0.5 + index) * 0.5 * audioIntensity);
      
      meshRef.current.position.set(x, position[1], z);
      
      const scale = 0.3 + blobFreq * 0.5;
      meshRef.current.scale.setScalar(scale);
      
      // Distortion based on audio
      if (meshRef.current.material instanceof THREE.MeshStandardMaterial) {
        meshRef.current.material.emissiveIntensity = 0.5 + blobFreq * 1.5;
      }
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[1, 32, 32]} />
      <MeshDistortMaterial
        color={textureData.colors?.primary || '#ffffff'}
        attach="material"
        distort={0.1 + blobFreq * 0.4}
        speed={2 + blobFreq * 3}
        roughness={0.1}
        metalness={0.9}
        emissive={textureData.colors?.primary || '#ffffff'}
        emissiveIntensity={0.5 + blobFreq * 1.5}
        map={textureData.texture}
      />
    </mesh>
  );
}

export default function LiquidMetalVisualizer({
  audioData = { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 },
  styleAdjustments = { brightness: 100, saturation: 100, contrast: 100 },
  width = 1080,
  height = 1080,
  zoomLevel = 1,
  backgroundColor = '#000000',
}: VisualizerProps) {
  const groupRef = useRef<THREE.Group>(null);
  const textureData = useVisualizerTexture();
  
  const safeAudioData = audioData || { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 };
  const freqData = safeAudioData.frequency || Array(256).fill(0);
  
  const bassIntensity = useMemo(() => {
    let sum = 0;
    for (let i = 0; i <= 85; i++) sum += freqData[i] || 0;
    return Math.min(sum / 86 / 255, 1.0);
  }, [freqData]);

  const blobs = useMemo(() => [
    { position: [-12, 0, 0], index: 0 },
    { position: [-7.2, 0, 0], index: 1 },
    { position: [-2.4, 0, 0], index: 2 },
    { position: [2.4, 0, 0], index: 3 },
    { position: [7.2, 0, 0], index: 4 },
    { position: [12, 0, 0], index: 5 },
  ], []);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      // Keep horizontal - minimal rotation and no vertical movement
      const t = clock.getElapsedTime();
      groupRef.current.rotation.y = t * 0.05; // Slower rotation
      groupRef.current.position.y = 0; // Keep at center level
    }
  });

  return (
    <>
      <ambientLight intensity={0.2} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} />
      <spotLight position={[0, 10, 0]} intensity={1} angle={Math.PI / 4} penumbra={0.3} />
      <Environment preset="warehouse" />
      
      <group ref={groupRef}>
        {blobs.map((blob) => (
          <LiquidBlob
            key={blob.index}
            position={blob.position}
            index={blob.index}
            audioData={audioData}
            textureData={textureData}
          />
        ))}
      </group>
      
    </>
  );
}