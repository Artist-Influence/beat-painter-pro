import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { VisualizerProps } from ".";
import { useVisualizerTexture, createVisualizerMaterial } from "@/hooks/useVisualizerTexture";
import { useStudioStore } from "@/stores/studioStore";

function LightRay({ angle, radius, index, audioData, textureData, smoothedValues }) {
  const groupRef = useRef<THREE.Group>(null);
  const { audioSensitivity } = useStudioStore();
  const safeAudioData = audioData || { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 };
  
  // Calculate frequency range for this ray
  const freqIndex = Math.floor((index / 36) * 255);
  
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
      const rawIntensity = (safeAudioData.frequency[freqIndex] || 0) / 255;
      
      // Apply appropriate multiplier based on frequency range
      const intensity = freqIndex <= 85 
        ? rawIntensity * audioSensitivity.bassMultiplier
        : freqIndex <= 170 
        ? rawIntensity * audioSensitivity.midsMultiplier
        : rawIntensity * audioSensitivity.highsMultiplier;
      
      // Ray scales outward dramatically on its frequency band
      const rayScale = 1 + intensity * 2.5 + smoothedValues.beat * 1.5;
      groupRef.current.scale.setScalar(rayScale);
      
      // Slight rotation wobble based on audio
      groupRef.current.rotation.z = Math.sin(t * 3 + index) * intensity * 0.3;
    }
  });

  return (
    <group ref={groupRef}>
      {points.map((point, pointIndex) => (
        <LightPoint
          key={pointIndex}
          position={[point.x, point.y, 0]}
          pointIndex={pointIndex}
          totalPoints={points.length}
          textureData={textureData}
          rayIndex={index}
          audioData={audioData}
          smoothedValues={smoothedValues}
        />
      ))}
    </group>
  );
}

function LightPoint({ position, pointIndex, totalPoints, textureData, rayIndex, audioData, smoothedValues }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { audioSensitivity } = useStudioStore();
  const safeAudioData = audioData || { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 };
  
  // Get frequency for this point
  const freqIndex = Math.floor(((rayIndex * totalPoints + pointIndex) / (36 * 12)) * 255);
  
  useFrame(({ clock }) => {
    if (meshRef.current) {
      const t = clock.getElapsedTime();
      const rawIntensity = (safeAudioData.frequency[freqIndex] || 0) / 255;
      
      // Apply multiplier
      const multiplier = freqIndex <= 85 
        ? audioSensitivity.bassMultiplier
        : freqIndex <= 170 
        ? audioSensitivity.midsMultiplier
        : audioSensitivity.highsMultiplier;
      const intensity = rawIntensity * multiplier;
      
      // Audio-reactive scaling - individual points bounce hard
      const baseScale = Math.max(0.1, 1 - (pointIndex / totalPoints) * 0.5);
      const audioScale = 0.3 + intensity * 2.0 + smoothedValues.beat * 1.5;
      const timeScale = 1 + Math.sin(t * 4 + pointIndex) * 0.15;
      
      meshRef.current.scale.setScalar(baseScale * audioScale * timeScale * 0.3);
      
      // Opacity variation based on audio
      if (meshRef.current.material) {
        const mat = meshRef.current.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.5 + intensity * 0.5 + smoothedValues.beat * 0.3;
      }
    }
  });

  // Use extracted colors from texture
  const pointColor = textureData?.colors?.accent || '#ffffff';

  const material = useMemo(() => 
    createVisualizerMaterial(pointColor, textureData, {
      transparent: true,
      opacity: 0.9,
      basic: true,
    }), [textureData, pointColor]
  );

  return (
    <mesh ref={meshRef} position={position} material={material}>
      <sphereGeometry args={[0.4, 8, 8]} />
    </mesh>
  );
}

function CenterCore({ audioData, textureData, smoothedValues }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const { audioSensitivity } = useStudioStore();
  
  useFrame(({ clock }) => {
    if (meshRef.current) {
      const t = clock.getElapsedTime();
      
      // Dramatic core pulsing based on bass
      const scale = 0.5 + smoothedValues.bass * 2.5 + smoothedValues.beat * 1.8 + Math.sin(t * 6) * 0.3;
      meshRef.current.scale.setScalar(scale);
      
      // Fast rotation on beats
      const rotSpeed = 0.02 + smoothedValues.bass * 0.15 + smoothedValues.beat * 0.2;
      meshRef.current.rotation.z += rotSpeed;
      
      // Emissive glow based on beat
      if (meshRef.current.material) {
        const mat = meshRef.current.material as THREE.MeshStandardMaterial;
        if (mat.emissiveIntensity !== undefined) {
          mat.emissiveIntensity = 0.5 + smoothedValues.beat * 2.5;
        }
      }
    }
    
    // Outer glow layer
    if (glowRef.current) {
      const glowScale = 0.8 + smoothedValues.bass * 3.0 + smoothedValues.beat * 2.5;
      glowRef.current.scale.setScalar(glowScale);
      
      if (glowRef.current.material) {
        const mat = glowRef.current.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.2 + smoothedValues.beat * 0.4;
      }
    }
  });

  const primaryColor = textureData?.colors?.primary || '#ffffff';
  const accentColor = textureData?.colors?.accent || '#ffffff';

  const material = useMemo(() => 
    createVisualizerMaterial(primaryColor, textureData, {
      transparent: true,
      opacity: 1,
      emissive: primaryColor,
      emissiveIntensity: 0.5,
    }), [textureData, primaryColor]
  );

  return (
    <group>
      {/* Outer glow */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[0.6, 16, 16]} />
        <meshBasicMaterial 
          color={accentColor}
          transparent 
          opacity={0.2}
        />
      </mesh>
      
      {/* Core */}
      <mesh ref={meshRef} material={material}>
        <sphereGeometry args={[0.5, 16, 16]} />
      </mesh>
    </group>
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
  
  // Smoothed audio values calculated per-frame
  const smoothedBass = useRef(0);
  const smoothedMids = useRef(0);
  const smoothedHighs = useRef(0);
  const smoothedBeat = useRef(0);
  
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
      const frequency = safeAudioData.frequency || Array(256).fill(0);
      
      // Calculate frequency bands per-frame (not useMemo)
      let bassSum = 0, midsSum = 0, highsSum = 0;
      for (let i = 0; i <= 85; i++) bassSum += frequency[i] || 0;
      for (let i = 86; i <= 170; i++) midsSum += frequency[i] || 0;
      for (let i = 171; i <= 255; i++) highsSum += frequency[i] || 0;
      
      const rawBass = Math.min((bassSum / 86 / 255) * audioSensitivity.bassMultiplier, 1.0);
      const rawMids = Math.min((midsSum / 85 / 255) * audioSensitivity.midsMultiplier, 1.0);
      const rawHighs = Math.min((highsSum / 85 / 255) * audioSensitivity.highsMultiplier, 1.0);
      const rawBeat = Math.max(safeAudioData.beatStrength || 0, rawBass);
      
      // Smooth values with fast lerp for responsiveness
      const lerp = 0.12;
      smoothedBass.current = THREE.MathUtils.lerp(smoothedBass.current, rawBass, lerp);
      smoothedMids.current = THREE.MathUtils.lerp(smoothedMids.current, rawMids, lerp);
      smoothedHighs.current = THREE.MathUtils.lerp(smoothedHighs.current, rawHighs, lerp);
      smoothedBeat.current = THREE.MathUtils.lerp(smoothedBeat.current, rawBeat, lerp);
      
      // Gentle overall rotation
      groupRef.current.rotation.z = t * 0.05;
      
      // Dramatic breathing motion based on audio
      const baseBreath = 1 + Math.sin(t * 1.5) * 0.05;
      const audioBreath = 1 + smoothedBass.current * 0.8 + smoothedBeat.current * 1.5;
      groupRef.current.scale.setScalar(baseBreath * audioBreath);
    }
  });

  // Pass smoothed values to children
  const smoothedValues = {
    bass: smoothedBass.current,
    mids: smoothedMids.current,
    highs: smoothedHighs.current,
    beat: smoothedBeat.current,
  };

  return (
    <>
      <ambientLight intensity={0.2} />
      <pointLight position={[0, 0, 5]} intensity={0.8} />
      <pointLight position={[0, 0, -3]} intensity={0.4} color={textureData?.colors?.accent || '#ffffff'} />
      
      <group ref={groupRef}>
        {/* Central core */}
        <CenterCore audioData={audioData} textureData={textureData} smoothedValues={smoothedValues} />
        
        {/* Radiating light rays */}
        {rays.map((ray) => (
          <LightRay
            key={ray.index}
            angle={ray.angle}
            radius={4}
            index={ray.index}
            audioData={audioData}
            textureData={textureData}
            smoothedValues={smoothedValues}
          />
        ))}
      </group>
    </>
  );
}
