import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment, Sparkles } from "@react-three/drei";
import * as THREE from "three";
import { VisualizerProps } from ".";
import { useStudioStore } from "@/stores/studioStore";

function Feather({ index, side, audioData }: any) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { audioSensitivity } = useStudioStore();
  
  const extractedColors = (window as any).extractedColors;
  
  const texture = useMemo(() => {
    const at = (window as any).appliedTexture;
    if (!at) return null;
    if (typeof at === "string") {
      const tex = new THREE.TextureLoader().load(at);
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      return tex;
    }
    return at as THREE.Texture;
  }, []);
  
  const primaryColor = extractedColors?.primary || '#ffffff';
  
  const angle = (index / 20) * Math.PI * 0.8;
  const length = 0.3 + index * 0.04;
  const geometry = useMemo(() => new THREE.CapsuleGeometry(0.015, length, 4, 8), [length]);

  const safeAudioData = audioData || { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 };
  const frequency = safeAudioData.frequency || Array(256).fill(0);

  // Smoothing refs
  const smoothedMids = useRef(0);
  const smoothedBass = useRef(0);
  
  // Base rotation for position-based rotation
  const baseRotation = useRef({ y: 0, z: 0 });

  useFrame(() => {
    // Calculate audio per-frame with sensitivity multipliers
    let midsSum = 0, bassSum = 0;
    for (let i = 86; i <= 170; i++) midsSum += frequency[i] || 0;
    for (let i = 0; i <= 85; i++) bassSum += frequency[i] || 0;
    
    const rawMids = Math.min((midsSum / 85 / 255) * audioSensitivity.midsMultiplier, 1.0);
    const rawBass = Math.min((bassSum / 86 / 255) * audioSensitivity.bassMultiplier, 1.0);
    
    // Asymmetric smoothing
    const lerpVal = (current: number, target: number) => {
      const factor = target > current ? 0.5 : 0.2;
      return current + (target - current) * factor;
    };
    
    smoothedMids.current = lerpVal(smoothedMids.current, rawMids);
    smoothedBass.current = lerpVal(smoothedBass.current, rawBass);
    
    const mids = smoothedMids.current;
    const bass = smoothedBass.current;
    
    // Audio threshold check
    const audioThreshold = 0.02;
    const hasAudio = bass > audioThreshold || mids > audioThreshold;
    
    if (meshRef.current) {
      // Base rotation advances slowly
      baseRotation.current.y += 0.002 * audioSensitivity.animationSpeed;
      baseRotation.current.z += 0.001 * audioSensitivity.animationSpeed;
      
      // Audio offset for rotation
      const offsetY = hasAudio ? (bass * 0.3 + mids * 0.15) * Math.PI : 0;
      const offsetZ = hasAudio ? (mids * 0.1 + bass * 0.12) * Math.PI : 0;
      
      meshRef.current.rotation.y = baseRotation.current.y + offsetY;
      meshRef.current.rotation.z = baseRotation.current.z + offsetZ;
      
      // Scale reacts to audio (returns to 1 when silent)
      const beatScale = bass > 0.5 ? 1 + bass * 1.2 : 1;
      meshRef.current.scale.setScalar(beatScale);
    }
  });

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      position={[side * (0.1 + index * 0.035), 0.5 - index * 0.05, 0]}
      rotation={[0, 0, angle * side]}
    >
      <meshStandardMaterial
        color={primaryColor}
        roughness={extractedColors?.isMetallic ? 0.05 : 0.3}
        metalness={extractedColors?.isMetallic ? 1 : 0.2}
          transparent
          opacity={0.9 + smoothedMids.current * 0.5}
          side={THREE.DoubleSide}
          map={texture || undefined}
          emissive={extractedColors?.isNeon ? primaryColor : '#000000'}
          emissiveIntensity={extractedColors?.isNeon ? 0.3 : 0}
        />
    </mesh>
  );
}

function Wing({ side, audioData }: any) {
  const groupRef = useRef<THREE.Group>(null);
  const featherIndices = Array.from({ length: 20 }, (_, i) => i);
  const { audioSensitivity } = useStudioStore();

  const safeAudioData = audioData || { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 };
  const frequency = safeAudioData.frequency || Array(256).fill(0);

  // Smoothing refs
  const smoothedBass = useRef(0);
  const smoothedMids = useRef(0);
  
  // Base rotation for position-based rotation
  const wingBaseRotation = useRef({ x: 0, z: 0 });

  useFrame(() => {
    // Calculate audio per-frame with sensitivity multipliers
    let bassSum = 0, midsSum = 0;
    for (let i = 0; i <= 85; i++) bassSum += frequency[i] || 0;
    for (let i = 86; i <= 170; i++) midsSum += frequency[i] || 0;
    
    const rawBass = Math.min((bassSum / 86 / 255) * audioSensitivity.bassMultiplier, 1.0);
    const rawMids = Math.min((midsSum / 85 / 255) * audioSensitivity.midsMultiplier, 1.0);
    
    // Asymmetric smoothing
    const lerpVal = (current: number, target: number) => {
      const factor = target > current ? 0.5 : 0.2;
      return current + (target - current) * factor;
    };
    
    smoothedBass.current = lerpVal(smoothedBass.current, rawBass);
    smoothedMids.current = lerpVal(smoothedMids.current, rawMids);
    
    const bass = smoothedBass.current;
    const mids = smoothedMids.current;
    
    // Audio threshold check
    const audioThreshold = 0.02;
    const hasAudio = bass > audioThreshold || mids > audioThreshold;
    
    if (groupRef.current) {
      // Base rotation advances slowly
      wingBaseRotation.current.z += side * 0.002 * audioSensitivity.animationSpeed;
      wingBaseRotation.current.x += 0.001 * audioSensitivity.animationSpeed;
      
      // Audio offset for rotation
      const offsetZ = hasAudio ? side * bass * Math.PI * 0.3 : 0;
      const offsetX = hasAudio ? bass * Math.PI * 0.15 : 0;
      
      groupRef.current.rotation.z = wingBaseRotation.current.z + offsetZ;
      groupRef.current.rotation.x = wingBaseRotation.current.x + offsetX;
      
      // Scale reacts to audio (returns to 1 when silent)
      const beatScale = bass > 0.6 ? 1 + bass * 2.0 : 1;
      groupRef.current.scale.setScalar(beatScale);
      
      // Position proportional to audio (returns to base when silent)
      groupRef.current.position.y = 0.4 + bass * 0.8;
    }
  });

  return (
    <group ref={groupRef} position={[side * 0.15, 0.4, 0]}>
      {featherIndices.map((i) => (
        <Feather key={i} index={i} side={side} audioData={audioData} />
      ))}
    </group>
  );
}

function HologramWings({ audioData }: any) {
  const groupRef = useRef<THREE.Group>(null);
  const { audioSensitivity } = useStudioStore();
  
  const extractedColors = (window as any).extractedColors;
  const accentColor = extractedColors?.accent || '#ffffff';
  
  const safeAudioData = audioData || { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 };
  const frequency = safeAudioData.frequency || Array(256).fill(0);

  // Smoothing refs
  const smoothedHighs = useRef(0);
  const smoothedBass = useRef(0);
  
  // Base rotation for position-based rotation
  const hologramBaseRotation = useRef({ x: 0, y: 0 });

  useFrame(() => {
    // Calculate audio per-frame with sensitivity multipliers
    let highsSum = 0, bassSum = 0;
    for (let i = 171; i <= 255; i++) highsSum += frequency[i] || 0;
    for (let i = 0; i <= 85; i++) bassSum += frequency[i] || 0;
    
    const rawHighs = Math.min((highsSum / 85 / 255) * audioSensitivity.highsMultiplier, 1.0);
    const rawBass = Math.min((bassSum / 86 / 255) * audioSensitivity.bassMultiplier, 1.0);
    
    // Asymmetric smoothing
    const lerpVal = (current: number, target: number) => {
      const factor = target > current ? 0.5 : 0.2;
      return current + (target - current) * factor;
    };
    
    smoothedHighs.current = lerpVal(smoothedHighs.current, rawHighs);
    smoothedBass.current = lerpVal(smoothedBass.current, rawBass);
    
    const highs = smoothedHighs.current;
    const bass = smoothedBass.current;
    
    // Audio threshold check
    const audioThreshold = 0.02;
    const hasAudio = bass > audioThreshold || highs > audioThreshold;
    
    if (groupRef.current) {
      // Position proportional to audio (returns to 0 when silent)
      groupRef.current.position.y = bass * 1.0;
      
      // Base rotation advances slowly
      hologramBaseRotation.current.y += 0.002 * audioSensitivity.animationSpeed;
      hologramBaseRotation.current.x += 0.001 * audioSensitivity.animationSpeed;
      
      // Audio offset for rotation
      const offsetY = hasAudio ? (bass * 0.2 + highs * 0.1) * Math.PI : 0;
      const offsetX = hasAudio ? bass * Math.PI * 0.12 : 0;
      
      groupRef.current.rotation.y = hologramBaseRotation.current.y + offsetY;
      groupRef.current.rotation.x = hologramBaseRotation.current.x + offsetX;
    }
  });

  return (
    <group ref={groupRef}>
      <Wing side={1} audioData={audioData} />
      <Wing side={-1} audioData={audioData} />
      <Sparkles
        count={(smoothedHighs.current > 0.02 || smoothedBass.current > 0.02) ? Math.round(5 + smoothedHighs.current * 12 + smoothedBass.current * 8) : 0}
        scale={[0.8, 0.8, 0.8]}
        size={1 + smoothedHighs.current * 2 + smoothedBass.current * 1.5}
        speed={(smoothedHighs.current > 0.02 || smoothedBass.current > 0.02) ? (0.3 + smoothedHighs.current * 0.8 + smoothedBass.current * 0.6) : 0}
        opacity={0.01 + smoothedHighs.current * 0.04}
        color={accentColor}
        position={[0, 0.8, 0]}
      />
    </group>
  );
}

export default function AngelWingsVisualizer({
  audioData = { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 },
  styleAdjustments = { brightness: 100, saturation: 100, contrast: 100 },
  width = 1080,
  height = 1080,
  zoomLevel = 1,
  backgroundColor = '#00FF00',
}: VisualizerProps & { 
  styleAdjustments?: { brightness: number; saturation: number; contrast: number }; 
}) {
  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[4, 7, 6]} intensity={1.0} />
      <Environment preset="city" />
      <group scale={0.8}>
        <HologramWings audioData={audioData} />
      </group>
    </>
  );
}
