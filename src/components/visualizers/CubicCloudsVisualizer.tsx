import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment, Sparkles } from "@react-three/drei";
import * as THREE from "three";
import { VisualizerProps } from ".";

function OrbitingCube({ angle, radius, audioData, index }: any) {
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
    
    // Enhanced audio-reactive movement
    const speed = 1.0 + bass * 6.0 + mids * 4.0;
    const spread = 0.6 + mids * 3.0 + bass * 2.0;
    const x = Math.cos(angle + t * speed) * radius * spread;
    const z = Math.sin(angle + t * speed) * radius * spread;
    const y = Math.sin((t + index) * 6.0) * 1.0 + bass * 2.5 + highs * 1.8;
    
    if (meshRef.current) {
      meshRef.current.position.set(x, y, z);
      
      // Enhanced rotation with stronger audio response
      meshRef.current.rotation.x = t * 4.0 + bass * 8.0;
      meshRef.current.rotation.y = t * 3.5 + mids * 6.0;
      meshRef.current.rotation.z = t * 5.0 + highs * 10.0;
      
      // Stronger beat scaling with continuous pulsing
      const beatScale = bass > 0.3 ? 1 + bass * 3.0 : 1 + Math.sin(t * 8) * 0.4;
      const midsScale = mids > 0.2 ? 1 + mids * 1.5 : 1;
      meshRef.current.scale.setScalar(beatScale * midsScale);
    }
  });

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[0.05, 0.05, 0.05]} />
        <meshStandardMaterial
          color={primaryColor}
          metalness={extractedColors?.isMetallic ? 1 : 0.3}
          roughness={extractedColors?.isMetallic ? 0.2 : 0.7}
          emissive={extractedColors?.isNeon ? primaryColor : '#000000'}
          emissiveIntensity={extractedColors?.isNeon ? 0.4 : 0}
          map={texture || undefined}
        />
    </mesh>
  );
}

function OrbitingCubesVisualizer({ audioData }: any) {
  const groupRef = useRef<THREE.Group>(null);
  const centerSphereRef = useRef<THREE.Mesh>(null);
  const cubeCount = 40;
  const angles = useMemo(() => Array.from({ length: cubeCount }, (_, i) => (i / cubeCount) * Math.PI * 2), []);

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

  const highs = useMemo(() => {
    let sum = 0;
    for (let i = 171; i <= 255; i++) sum += frequency[i] || 0;
    return Math.min(sum / 85 / 255, 1.0);
  }, [frequency]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    
    if (groupRef.current) {
      groupRef.current.rotation.y = t * 1.5 + bass * 2.5;
      groupRef.current.rotation.x = Math.sin(t * 1.5) * 0.4 + bass * 0.8;
      groupRef.current.position.y = Math.sin(t * 2.0) * 0.5 + bass * 1.2;
      
      const beatScale = bass > 0.6 ? 1 + bass * 1.5 : 1;
      groupRef.current.scale.setScalar(beatScale);
    }
    
    if (centerSphereRef.current) {
      const spherePulse = 1 + bass * 1.5 + highs * 1.0 + Math.sin(t * 4.0) * 0.3;
      centerSphereRef.current.scale.setScalar(spherePulse);
      
      centerSphereRef.current.rotation.x = t * 3.0 + bass * 4.0;
      centerSphereRef.current.rotation.y = t * 2.0 + highs * 5.0;
    }
  });

  return (
    <group ref={groupRef}>
      {angles.map((angle, i) => (
        <OrbitingCube
          key={i}
          angle={angle}
          radius={1.0}
          audioData={audioData}
          index={i}
        />
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

export default function CubicCloudsVisualizer({
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
      <group scale={3.2}>
        <OrbitingCubesVisualizer audioData={audioData} />
      </group>
    </>
  );
}
