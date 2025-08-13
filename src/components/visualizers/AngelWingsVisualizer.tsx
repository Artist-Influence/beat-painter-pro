import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment, Sparkles } from "@react-three/drei";
import * as THREE from "three";
import { VisualizerProps } from ".";

function Feather({ index, side, audioData }: any) {
  const meshRef = useRef<THREE.Mesh>(null);
  
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

  const mids = useMemo(() => {
    let sum = 0;
    for (let i = 86; i <= 170; i++) sum += frequency[i] || 0;
    return Math.min(sum / 85 / 255, 1.0);
  }, [frequency]);

  const bass = useMemo(() => {
    let sum = 0;
    for (let i = 0; i <= 85; i++) sum += frequency[i] || 0;
    return Math.min(sum / 86 / 255, 1.0);
  }, [frequency]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (meshRef.current) {
      meshRef.current.rotation.y = Math.sin(t * 3 + index * 0.8) * mids * 0.8 + bass * 1.0;
      meshRef.current.rotation.z = Math.cos(t * 2 + index * 0.5) * mids * 0.4 + bass * 0.6;
      
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
          opacity={0.9 + mids * 0.5}
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

  const safeAudioData = audioData || { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 };
  const frequency = safeAudioData.frequency || Array(256).fill(0);

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

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (groupRef.current) {
      groupRef.current.rotation.z = side * (Math.sin(t * 4) * 0.8 + bass * 1.5 + mids * 1.0);
      groupRef.current.rotation.x = Math.cos(t * 2.5) * 0.3 + bass * 0.8;
      
      const beatScale = bass > 0.6 ? 1 + bass * 2.0 : 1;
      groupRef.current.scale.setScalar(beatScale);
      
      groupRef.current.position.y = 0.4 + Math.sin(t * 2) * 0.2 + bass * 0.8;
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
  
  const extractedColors = (window as any).extractedColors;
  const accentColor = extractedColors?.accent || '#ffffff';
  
  const safeAudioData = audioData || { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 };
  const frequency = safeAudioData.frequency || Array(256).fill(0);

  const highs = useMemo(() => {
    let sum = 0;
    for (let i = 171; i <= 255; i++) sum += frequency[i] || 0;
    return Math.min(sum / 85 / 255, 1.0);
  }, [frequency]);

  const bass = useMemo(() => {
    let sum = 0;
    for (let i = 0; i <= 85; i++) sum += frequency[i] || 0;
    return Math.min(sum / 86 / 255, 1.0);
  }, [frequency]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(t * 2.5) * 0.4 + bass * 1.0;
      groupRef.current.rotation.y = t * 0.8 + highs * 2.0;
      groupRef.current.rotation.x = Math.sin(t * 1.5) * 0.2 + bass * 0.6;
    }
  });

  return (
    <group ref={groupRef}>
      <Wing side={1} audioData={audioData} />
      <Wing side={-1} audioData={audioData} />
      <Sparkles
        count={5 + highs * 12 + bass * 8}
        scale={[0.8, 0.8, 0.8]}
        size={1 + highs * 2 + bass * 1.5}
        speed={0.3 + highs * 0.8 + bass * 0.6}
        opacity={0.01 + highs * 0.04}
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
