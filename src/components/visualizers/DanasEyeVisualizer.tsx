import React, { useRef, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { VisualizerProps } from ".";
import { useVisualizerTexture, createVisualizerMaterial } from "@/hooks/useVisualizerTexture";

function LightRay({ angle, radius, index, audioData, textureData }) {
  const groupRef = useRef<THREE.Group>(null);
  const safeAudioData = audioData || { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 };
  
  // Calculate frequency range for this ray
  const freqIndex = Math.floor((index / 36) * 255);
  const intensity = (safeAudioData.frequency[freqIndex] || 0) / 255;
  
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

  useFrame(({ clock }) => {
    if (groupRef.current) {
      const t = clock.getElapsedTime();
      
      // Animate the entire ray
      groupRef.current.rotation.z = Math.sin(t * 0.5 + index * 0.1) * 0.05;
      
      // Scale based on audio
      const scale = 0.8 + intensity * 1.5 + Math.sin(t * 3 + index * 0.2) * 0.1;
      groupRef.current.scale.setScalar(scale);
    }
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
  
  // Create color variation
  const hue = (pointIndex / totalPoints) * 360 + time * 30;
  const color = new THREE.Color().setHSL(hue / 360, 0.8, 0.5 + intensity * 0.4);
  
  useFrame(({ clock }) => {
    if (meshRef.current) {
      const t = clock.getElapsedTime();
      
      // Scale based on intensity and distance from center
      const baseScale = Math.max(0.1, 1 - (pointIndex / totalPoints) * 0.7);
      const audioScale = 1 + intensity * 2;
      const timeScale = 1 + Math.sin(t * 4 + pointIndex * 0.5) * 0.3;
      
      meshRef.current.scale.setScalar(baseScale * audioScale * timeScale * 0.3);
      
      // Keep material white for texture mapping
      if (meshRef.current.material) {
        (meshRef.current.material as any).emissiveIntensity = 0;
        (meshRef.current.material as any).emissive.set('#000000');
      }
    }
  });

  const material = useMemo(() => 
    createVisualizerMaterial('#ffffff', textureData, {
      emissive: '#000000',
      emissiveIntensity: 0,
      transparent: true,
      opacity: 0.9,
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
  const safeAudioData = audioData || { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 };
  
  // Use bass frequencies for the core
  const bassIntensity = useMemo(() => {
    let sum = 0;
    for (let i = 0; i <= 85; i++) sum += safeAudioData.frequency[i] || 0;
    return Math.min(sum / 86 / 255, 1.0);
  }, [safeAudioData.frequency]);

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
      emissive: '#000000',
      emissiveIntensity: 0,
      transparent: true,
      opacity: 1,
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
      
      // Gentle overall rotation
      groupRef.current.rotation.z = t * 0.1;
      
      // Subtle breathing motion
      const breathe = 1 + Math.sin(t * 0.8) * 0.05;
      groupRef.current.scale.setScalar(breathe);
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