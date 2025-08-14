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
      
      // Original organic movement
      const x = position[0] + Math.sin(t * 0.5 + index) * 0.3;
      const y = position[1] + Math.cos(t * 0.7 + index) * 0.4;
      const z = position[2] + Math.sin(t * 0.3 + index) * 0.2;
      
      meshRef.current.position.set(x, y, z);
      
      const scale = 0.8 + blobFreq * 1.2 + Math.sin(t * 2 + index) * 0.2;
      meshRef.current.scale.setScalar(scale);
      
      // Rotation
      meshRef.current.rotation.x += 0.01 + blobFreq * 0.02;
      meshRef.current.rotation.y += 0.008 + blobFreq * 0.015;
      
      // Distortion based on audio
      if (meshRef.current.material instanceof THREE.MeshStandardMaterial) {
        meshRef.current.material.emissiveIntensity = blobFreq * 2;
      }
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[1, 32, 32]} />
      <MeshDistortMaterial
        color={textureData.colors?.primary || '#ffffff'}
        attach="material"
        distort={0.3 + blobFreq * 0.7}
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

export default function LiquidMetalVisualizerStandalone({
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
    { position: [-2, 1, 0], index: 0 },
    { position: [2, -1, 0], index: 1 },
    { position: [0, 0, 2], index: 2 },
    { position: [0, 0, -2], index: 3 },
    { position: [-1.5, -1.5, 1], index: 4 },
    { position: [1.5, 1.5, -1], index: 5 },
  ], []);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      const t = clock.getElapsedTime();
      groupRef.current.rotation.y = t * 0.2 + bassIntensity * 0.5;
      groupRef.current.rotation.x = Math.sin(t * 0.3) * 0.1;
      groupRef.current.position.y = Math.sin(t * 0.8) * 0.2 + bassIntensity * 0.3;
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