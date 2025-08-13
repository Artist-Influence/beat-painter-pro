import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment, Sparkles } from "@react-three/drei";
import * as THREE from "three";
import { VisualizerProps } from ".";

function GlassShard({ index, audioData }: any) {
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
  const secondaryColor = extractedColors?.secondary || '#ffffff';

  const angle = useMemo(() => (index / 40) * Math.PI * 2, [index]);
  const radius = 0.8;

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

  const highs = useMemo(() => {
    let sum = 0;
    for (let i = 171; i <= 255; i++) sum += frequency[i] || 0;
    return Math.min(sum / 85 / 255, 1.0);
  }, [frequency]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    const speed = 0.5 + bass * 4.0 + mids * 3.0;
    const x = Math.cos(angle + t * speed) * radius * (1 + bass * 1.0);
    const z = Math.sin(angle + t * speed) * radius * (1 + bass * 1.0);
    const y = Math.sin((t + index) * 3.0) * 0.3 + bass * 1.2 + highs * 0.8;

    if (meshRef.current) {
      meshRef.current.position.set(x, y, z);
      
      meshRef.current.rotation.x += mids * 0.4 + bass * 0.6;
      meshRef.current.rotation.y += mids * 0.3 + highs * 0.5;
      meshRef.current.rotation.z += bass * 0.2 + highs * 0.4;
      
      const beatScale = bass > 0.5 ? 1 + bass * 1.8 : 1;
      meshRef.current.scale.setScalar(beatScale);
      
      if (meshRef.current.material) {
        const material = meshRef.current.material as THREE.MeshStandardMaterial;
        material.emissiveIntensity = 0.5 + highs * 1.0 + bass * 0.8;
      }
    }
  });

  return (
    <mesh ref={meshRef}>
      <coneGeometry args={[0.05, 0.2, 6]} />
        <meshStandardMaterial
          color={primaryColor}
          metalness={extractedColors?.isMetallic ? 1 : 0.3}
          roughness={extractedColors?.isMetallic ? 0.1 : 0.5}
          emissive={extractedColors?.isNeon ? primaryColor : secondaryColor}
          emissiveIntensity={extractedColors?.isNeon ? 1.0 : 0.5}
          map={texture || undefined}
          transparent
          opacity={0.9 + highs * 0.3}
        />
    </mesh>
  );
}

function GlassSphereVisualizer({ audioData }: any) {
  const groupRef = useRef<THREE.Group>(null);
  const centerSphereRef = useRef<THREE.Mesh>(null);
  const shardCount = 40;
  
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
  const accentColor = extractedColors?.accent || '#ffffff';

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

  const highs = useMemo(() => {
    let sum = 0;
    for (let i = 171; i <= 255; i++) sum += frequency[i] || 0;
    return Math.min(sum / 85 / 255, 1.0);
  }, [frequency]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    
    if (groupRef.current) {
      groupRef.current.rotation.y = t * 1.5 + bass * 3.0 + mids * 2.0;
      groupRef.current.rotation.x = Math.sin(t * 2.0) * 0.6 + bass * 1.0;
      groupRef.current.position.y = Math.sin(t * 2.5) * 0.8 + bass * 1.5;
      
      const beatScale = bass > 0.6 ? 1 + bass * 2.0 : 1;
      groupRef.current.scale.setScalar(beatScale);
    }
    
    if (centerSphereRef.current) {
      const spherePulse = 1 + bass * 2.0 + highs * 1.5 + Math.sin(t * 6.0) * 0.4;
      centerSphereRef.current.scale.setScalar(spherePulse);
      
      centerSphereRef.current.rotation.x = t * 4.0 + bass * 6.0;
      centerSphereRef.current.rotation.y = t * 3.0 + highs * 8.0;
      centerSphereRef.current.rotation.z = t * 2.0 + mids * 5.0;
    }
  });

  return (
    <group ref={groupRef}>
      {Array.from({ length: shardCount }).map((_, i) => (
        <GlassShard key={i} index={i} audioData={audioData} />
      ))}
      <mesh ref={centerSphereRef}>
        <sphereGeometry args={[0.1, 32, 32]} />
        <meshStandardMaterial 
          color={primaryColor}
          emissive={extractedColors?.isNeon ? primaryColor : accentColor}
          emissiveIntensity={extractedColors?.isNeon ? 1.5 : 1.0}
          metalness={extractedColors?.isMetallic ? 1 : 0}
          roughness={extractedColors?.isMetallic ? 0.05 : 0.3}
          map={texture || undefined}
        />
      </mesh>
      <Sparkles
        count={5 + highs * 15 + bass * 10}
        scale={[0.8, 0.8, 0.8]}
        size={0.8 + highs * 1.5 + bass * 1}
        speed={0.6 + highs * 1.2 + bass * 1}
        opacity={0.015 + highs * 0.035}
        color={accentColor}
      />
    </group>
  );
}

export default function DancingGnomeCapsVisualizer({
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
        <GlassSphereVisualizer audioData={audioData} />
      </group>
    </>
  );
}
