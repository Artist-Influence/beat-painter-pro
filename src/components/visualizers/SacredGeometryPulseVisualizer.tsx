import React, { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";
import { VisualizerProps } from "../visualizer";
import { useVisualizerTexture, createVisualizerMaterial } from "@/hooks/useVisualizerTexture";
import { analyzeAudio } from "@/lib/visualizerUtils";

function FlowerOfLife({ audioData, textureData }) {
  const groupRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>();
  
  const safeAudioData = audioData || { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 };
  const frequency = safeAudioData.frequency || Array(256).fill(0);
  const { bass, mids } = analyzeAudio(frequency);
  
  useFrame(({ clock }) => {
    if (groupRef.current) {
      const t = clock.getElapsedTime();
      
      // Enhanced sacred rotation with stronger audio response
      groupRef.current.rotation.z = t * 0.8 + bass * 2.0 + mids * 1.5;
      
      // Enhanced breathing pattern with stronger audio entrainment
      const breathe = 1 + Math.sin(t * 1.2) * (0.4 + mids * 0.8) + bass * 1.2;
      groupRef.current.scale.setScalar(breathe);
      
      // Add position movement for more dynamic effect
      groupRef.current.position.y = Math.sin(t * 2) * bass * 0.6;
      groupRef.current.position.x = Math.cos(t * 1.5) * mids * 0.4;
    }
    
    // Enhanced emissive intensity based on audio
    if (materialRef.current) {
      materialRef.current.emissiveIntensity = 1.2 + bass * 3.0 + mids * 2.0;
    }
  });

  // Create material that updates with texture changes
  const material = useMemo(() => {
    const mat = createVisualizerMaterial(textureData.colors?.primary || '#ffd700', textureData, {
      emissiveIntensity: 0.8,
      metalness: 0.9,
      roughness: 0.1,
    });
    materialRef.current = mat;
    return mat;
  }, [textureData.textureVersion, textureData.colors?.primary, textureData.texture]);
  
  // Create Flower of Life pattern
  const circles = useMemo(() => {
    const result = [];
    const radius = 0.5;
    
    // Center circle
    result.push({ x: 0, y: 0 });
    
    // Six surrounding circles - sacred geometry
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      result.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius
      });
    }
    
    // Outer ring - 12 circles
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      result.push({
        x: Math.cos(angle) * radius * 2,
        y: Math.sin(angle) * radius * 2
      });
    }
    
    return result;
  }, []);
  
  return (
    <group ref={groupRef}>
      {circles.map((pos, i) => (
        <mesh key={i} position={[pos.x, pos.y, 0]} material={material}>
          <torusGeometry args={[0.25, 0.01, 16, 100]} />
        </mesh>
      ))}
    </group>
  );
}

function Metatron({ audioData, textureData }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>();
  
  const safeAudioData = audioData || { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 };
  const frequency = safeAudioData.frequency || Array(256).fill(0);
  const { highs } = analyzeAudio(frequency);
  
  useFrame(({ clock }) => {
    if (meshRef.current) {
      const t = clock.getElapsedTime();
      
      // Enhanced Metatron's cube rotation with stronger audio response
      meshRef.current.rotation.x = t * 1.0 + highs * 3.0;
      meshRef.current.rotation.y = t * 1.4 + highs * 4.0;
      meshRef.current.rotation.z = t * 0.6 + highs * 2.0;
      
      // Enhanced frequency expansion with bass interaction
      const expand = 1 + highs * 1.2 + Math.sin(t * 8) * 0.3;
      meshRef.current.scale.setScalar(expand);
      
      // Add position movement for dynamic effect
      meshRef.current.position.x = Math.sin(t * 4) * highs * 0.3;
      meshRef.current.position.y = Math.cos(t * 3.5) * highs * 0.2;
    }
    
    // Enhanced emissive intensity based on audio
    if (materialRef.current) {
      materialRef.current.emissiveIntensity = 1.2 + highs * 4.0;
    }
  });

  // Create material that updates with texture changes
  const material = useMemo(() => {
    const mat = createVisualizerMaterial(textureData.colors?.accent || '#ff00ff', textureData, {
      wireframe: true,
      emissiveIntensity: 0.8,
    });
    materialRef.current = mat;
    return mat;
  }, [textureData.textureVersion, textureData.colors?.accent, textureData.texture]);
  
  return (
    <mesh ref={meshRef} material={material}>
      <icosahedronGeometry args={[1, 1]} />
    </mesh>
  );
}

export default function SacredGeometryPulseVisualizer({
  audioData = { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 },
  styleAdjustments = { brightness: 100, saturation: 100, contrast: 100 },
  width = 1080,
  height = 1080,
  zoomLevel = 1,
  backgroundColor = '#00FF00',
}: VisualizerProps) {
  const containerRef = useRef<THREE.Group>(null);
  const textureData = useVisualizerTexture();
  
  const safeAudioData = audioData || { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 };
  const frequency = safeAudioData.frequency || Array(256).fill(0);
  const { bass } = analyzeAudio(frequency);
  
  useFrame(({ clock }) => {
    if (containerRef.current) {
      const t = clock.getElapsedTime();
      // Enhanced 432Hz inspired rotation with audio response
      containerRef.current.rotation.z = t * (0.8 + bass * 1.5);
      
      // Add breathing effect to the whole container
      const breathe = 1 + Math.sin(t * 1.0) * (0.1 + bass * 0.5);
      containerRef.current.scale.setScalar(breathe);
      
      // Add subtle movement
      containerRef.current.position.y = Math.sin(t * 1.5) * bass * 0.3;
    }
  });

  // Create particle material that updates with texture changes
  const particleMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: new THREE.Color(textureData.colors?.primary || '#ffd700'),
      transparent: true,
      opacity: 0.5 + bass * 0.5,
    });
  }, [textureData.textureVersion, textureData.colors?.primary, bass]);
  
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <Environment preset="city" />
      
      <group ref={containerRef}>
        <FlowerOfLife audioData={audioData} textureData={textureData} />
        <Metatron audioData={audioData} textureData={textureData} />
        
        {/* Phi spiral particles - golden ratio */}
        {Array.from({ length: 50 }).map((_, i) => {
          const angle = i * 0.618033988749; // Golden ratio
          const radius = i * 0.05;
          return (
            <mesh 
              key={i} 
              position={[
                Math.cos(angle * Math.PI * 2) * radius,
                Math.sin(angle * Math.PI * 2) * radius,
                Math.sin(i * 0.5) * 0.5
              ]}
              material={particleMaterial}
            >
              <sphereGeometry args={[0.03, 8, 8]} />
            </mesh>
          );
        })}
      </group>
    </>
  );
}