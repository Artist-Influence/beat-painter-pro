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

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const animSpeed = audioSensitivity.animationSpeed;
    const spinSpeed = audioSensitivity.spinSpeed ?? 0;
    
    // Calculate audio per-frame with sensitivity multipliers
    let midsSum = 0, bassSum = 0;
    for (let i = 86; i <= 170; i++) midsSum += frequency[i] || 0;
    for (let i = 0; i <= 85; i++) bassSum += frequency[i] || 0;
    
    const rawMids = Math.min((midsSum / 85 / 255) * audioSensitivity.midsMultiplier, 1.0);
    const rawBass = Math.min((bassSum / 86 / 255) * audioSensitivity.bassMultiplier, 1.0);
    
    // Asymmetric smoothing - fast attack for snappy response
    const lerpVal = (current: number, target: number) => {
      const factor = target > current ? 0.65 : 0.25;
      return current + (target - current) * factor;
    };
    
    smoothedMids.current = lerpVal(smoothedMids.current, rawMids);
    smoothedBass.current = lerpVal(smoothedBass.current, rawBass);
    
    const mids = smoothedMids.current * 0.5 + rawMids * 0.5;
    const bass = smoothedBass.current * 0.5 + rawBass * 0.5;
    
    if (meshRef.current) {
      // Idle sine wave oscillation for organic motion
      const idleY = Math.sin(t * 0.5 + index * 0.2) * 0.1 * animSpeed;
      const idleZ = Math.cos(t * 0.3 + index * 0.15) * 0.08 * animSpeed;
      
      // Audio-driven rotation speed (velocity-based for dynamic motion) + spin speed
      const rotSpeed = 0.02 + bass * 0.3 + mids * 0.15 + spinSpeed * 0.03;
      meshRef.current.rotation.y += rotSpeed * animSpeed;
      meshRef.current.rotation.z = idleZ + bass * 0.6 + mids * 0.35;
      
      // Beat-reactive scale - snappy response
      const beatScale = 1 + bass * 1.2 + mids * 0.6;
      meshRef.current.scale.setScalar(beatScale);
      
      // Position offset for more dramatic movement
      meshRef.current.position.y = bass * 0.3;
      meshRef.current.position.z = mids * 0.2;
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

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const animSpeed = audioSensitivity.animationSpeed;
    const spinSpeed = audioSensitivity.spinSpeed ?? 0;
    
    // Calculate audio per-frame with sensitivity multipliers
    let bassSum = 0, midsSum = 0;
    for (let i = 0; i <= 85; i++) bassSum += frequency[i] || 0;
    for (let i = 86; i <= 170; i++) midsSum += frequency[i] || 0;
    
    const rawBass = Math.min((bassSum / 86 / 255) * audioSensitivity.bassMultiplier, 1.0);
    const rawMids = Math.min((midsSum / 85 / 255) * audioSensitivity.midsMultiplier, 1.0);
    
    // Asymmetric smoothing - fast attack
    const lerpVal = (current: number, target: number) => {
      const factor = target > current ? 0.65 : 0.25;
      return current + (target - current) * factor;
    };
    
    smoothedBass.current = lerpVal(smoothedBass.current, rawBass);
    smoothedMids.current = lerpVal(smoothedMids.current, rawMids);
    
    const bass = smoothedBass.current * 0.5 + rawBass * 0.5;
    const mids = smoothedMids.current * 0.5 + rawMids * 0.5;
    
    if (groupRef.current) {
      // Faster, more dramatic flapping
      const flapAngle = Math.sin(t * 4 + bass * 12) * (0.3 + bass * 0.9);
      groupRef.current.rotation.z = side * flapAngle;
      groupRef.current.rotation.x = Math.sin(t * 2.5) * 0.2 * animSpeed + bass * 0.5;
      
      // Add spin speed to Y rotation
      groupRef.current.rotation.y += spinSpeed * 0.02;
      
      // Bigger scale response
      const wingScale = 1 + bass * 2.0 + mids * 0.8;
      groupRef.current.scale.setScalar(wingScale);
      
      // More dramatic position bob
      groupRef.current.position.y = 0.4 + bass * 1.0 + mids * 0.5;
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

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const animSpeed = audioSensitivity.animationSpeed;
    const spinSpeed = audioSensitivity.spinSpeed ?? 0;
    
    // Calculate audio per-frame with sensitivity multipliers
    let highsSum = 0, bassSum = 0;
    for (let i = 171; i <= 255; i++) highsSum += frequency[i] || 0;
    for (let i = 0; i <= 85; i++) bassSum += frequency[i] || 0;
    
    const rawHighs = Math.min((highsSum / 85 / 255) * audioSensitivity.highsMultiplier, 1.0);
    const rawBass = Math.min((bassSum / 86 / 255) * audioSensitivity.bassMultiplier, 1.0);
    
    // Asymmetric smoothing - fast attack
    const lerpVal = (current: number, target: number) => {
      const factor = target > current ? 0.65 : 0.25;
      return current + (target - current) * factor;
    };
    
    smoothedHighs.current = lerpVal(smoothedHighs.current, rawHighs);
    smoothedBass.current = lerpVal(smoothedBass.current, rawBass);
    
    const highs = smoothedHighs.current * 0.5 + rawHighs * 0.5;
    const bass = smoothedBass.current * 0.5 + rawBass * 0.5;
    
    if (groupRef.current) {
      // Dynamic rotation with organic oscillation + spin speed
      groupRef.current.rotation.y += (0.005 + bass * 0.02 + highs * 0.01 + spinSpeed * 0.02) * animSpeed;
      groupRef.current.rotation.x = Math.sin(t * 0.8) * 0.1 * animSpeed + bass * 0.15;
      
      // Position proportional to audio
      groupRef.current.position.y = bass * 1.0 + highs * 0.3;
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
