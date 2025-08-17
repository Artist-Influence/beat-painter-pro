import React, { useRef, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { VisualizerProps } from ".";
import { useVisualizerTexture, createVisualizerMaterial } from "@/hooks/useVisualizerTexture";
import { useStudioStore } from "@/stores/studioStore";

function LightRay({ angle, radius, index, audioData, textureData }) {
  const groupRef = useRef<THREE.Group>(null);
  const { audioSensitivity } = useStudioStore();
  const safeAudioData = audioData || { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 };
  
  // Calculate frequency range for this ray with audio sensitivity
  const freqIndex = Math.floor((index / 36) * 255);
  const rawIntensity = (safeAudioData.frequency[freqIndex] || 0) / 255;
  
  // Apply appropriate multiplier based on frequency range
  const intensity = freqIndex <= 85 
    ? rawIntensity * audioSensitivity.bassMultiplier
    : freqIndex <= 170 
    ? rawIntensity * audioSensitivity.midsMultiplier
    : rawIntensity * audioSensitivity.highsMultiplier;
  
  // Create points along the ray
  const points = useMemo(() => {
    const pointsArray = [];
    const numPoints = 12;
    for (let i = 0; i < numPoints; i++) {
      const distance = (i + 1) * (radius / numPoints);
      const x = Math.cos(angle) * distance;
      const y = Math.sin(angle) * distance;
      pointsArray.push({ x, y, distance, pointIndex: i });
    }
    return pointsArray;
  }, [angle, radius]);

  useFrame(() => {
    // No individual ray scaling or movement for perfect uniformity
    // All scaling will be handled at the group level
  });

  return (
    <group ref={groupRef}>
      {points.map((point, pointIndex) => (
        <LightPoint
          key={pointIndex}
          position={[point.x, point.y, 0]}
          intensity={intensity}
          pointIndex={pointIndex}
          totalPoints={points.length}
          textureData={textureData}
          time={0}
        />
      ))}
    </group>
  );
}

function LightPoint({ position, intensity, pointIndex, totalPoints, textureData, time }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame(({ clock }) => {
    if (meshRef.current) {
      const t = clock.getElapsedTime();
      
      // Fixed scaling based only on position in ray - no individual audio response
      const baseScale = Math.max(0.1, 1 - (pointIndex / totalPoints) * 0.5);
      const timeScale = 1 + Math.sin(t * 2) * 0.05; // Very subtle unified pulsing
      
      meshRef.current.scale.setScalar(baseScale * timeScale * 0.3);
    }
  });

  const material = useMemo(() => 
    createVisualizerMaterial('#ffffff', textureData, {
      transparent: true,
      opacity: 0.9,
      basic: true,
    }), [textureData]
  );

  return (
    <mesh ref={meshRef} position={position} material={material}>
      <sphereGeometry args={[1, 8, 8]} />
    </mesh>
  );
}

function CenterCore({ audioData, textureData }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { audioSensitivity } = useStudioStore();
  const safeAudioData = audioData || { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 };
  
  // Use bass frequencies for the core with sensitivity multiplier
  const bassIntensity = useMemo(() => {
    let sum = 0;
    for (let i = 0; i <= 85; i++) sum += safeAudioData.frequency[i] || 0;
    return Math.min((sum / 86 / 255) * audioSensitivity.bassMultiplier, 1.0);
  }, [safeAudioData.frequency, audioSensitivity.bassMultiplier]);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      const t = clock.getElapsedTime();
      
      // Core pulsing
      const scale = 0.5 + bassIntensity * 1.5 + Math.sin(t * 6) * 0.2;
      meshRef.current.scale.setScalar(scale);
      
      // Rotation
      meshRef.current.rotation.z += 0.02 + bassIntensity * 0.05;
      
      // Keep material white for texture mapping
      if (meshRef.current.material) {
        (meshRef.current.material as any).emissiveIntensity = 0;
      }
    }
  });

  const material = useMemo(() => 
    createVisualizerMaterial('#ffffff', textureData, {
      transparent: true,
      opacity: 1,
      basic: true,
    }), [textureData]
  );

  return (
    <mesh ref={meshRef} material={material}>
      <sphereGeometry args={[1, 16, 16]} />
    </mesh>
  );
}

export default function DanasEyeVisualizer({
  audioData = { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 },
  styleAdjustments = { brightness: 100, saturation: 100, contrast: 100 },
  width = 1080,
  height = 1080,
  zoomLevel = 1,
  backgroundColor = '#000000',
}: VisualizerProps) {
  const groupRef = useRef<THREE.Group>(null);
  const textureData = useVisualizerTexture();
  const { audioSensitivity } = useStudioStore();
  
  // Create rays in a radial pattern
  const rays = useMemo(() => {
    const numRays = 36;
    const raysArray = [];
    for (let i = 0; i < numRays; i++) {
      const angle = (i / numRays) * Math.PI * 2;
      raysArray.push({ angle, index: i });
    }
    return raysArray;
  }, []);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      const t = clock.getElapsedTime();
      const safeAudioData = audioData || { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 };
      
      // Calculate average audio intensity for uniform scaling
      let totalIntensity = 0;
      for (let i = 0; i < 256; i++) {
        const rawIntensity = (safeAudioData.frequency[i] || 0) / 255;
        const multiplier = i <= 85 ? audioSensitivity.bassMultiplier 
                         : i <= 170 ? audioSensitivity.midsMultiplier 
                         : audioSensitivity.highsMultiplier;
        totalIntensity += rawIntensity * multiplier;
      }
      totalIntensity = totalIntensity / 256;
      
      // Very gentle overall rotation for natural movement
      groupRef.current.rotation.z = t * 0.05;
      
      // Uniform breathing motion based on audio
      const baseBreath = 1 + Math.sin(t * 1.5) * 0.02;
      const audioBreath = 1 + totalIntensity * 0.3;
      groupRef.current.scale.setScalar(baseBreath * audioBreath);
    }
  });

  return (
    <>
      <ambientLight intensity={0.1} />
      <pointLight position={[0, 0, 5]} intensity={0.5} />
      
      <group ref={groupRef}>
        {/* Central core */}
        <CenterCore audioData={audioData} textureData={textureData} />
        
        {/* Radiating light rays */}
        {rays.map((ray) => (
          <LightRay
            key={ray.index}
            angle={ray.angle}
            radius={8}
            index={ray.index}
            audioData={audioData}
            textureData={textureData}
          />
        ))}
      </group>
    </>
  );
}