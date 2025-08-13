import React, { useRef, useMemo, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment, Sparkles } from "@react-three/drei";
import * as THREE from "three";
import type { VisualizerProps } from "../visualizer";

function MandalaRing({ radius, segments, depth, audioData }) {
  const meshRef = useRef<THREE.Group>(null);
  
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
    if (meshRef.current) {
      const t = clock.getElapsedTime();
      // Hypnotic rotation at different speeds for trance effect
      meshRef.current.rotation.z = t * (0.5 + depth * 0.2) + bass * 2;
      
      // Pulsing scale creates subliminal rhythm entrainment
      const pulse = 1 + Math.sin(t * 8) * 0.1 * mids + bass * 0.5;
      meshRef.current.scale.setScalar(pulse);
      
      // Z-axis movement for depth perception manipulation
      meshRef.current.position.z = Math.sin(t * 2 + depth) * highs * 0.5;
    }
  });
  
  const extractedColors = (window as any).extractedColors;
  const primaryColor = extractedColors?.primary || '#ff00ff';
  const accentColor = extractedColors?.accent || '#00ffff';
  
  return (
    <group ref={meshRef}>
      {Array.from({ length: segments }).map((_, i) => {
        const angle = (i / segments) * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        
        return (
          <mesh key={i} position={[x, y, 0]}>
            <torusGeometry args={[0.1, 0.05, 8, 16]} />
            <meshStandardMaterial
              color={i % 2 === 0 ? primaryColor : accentColor}
              emissive={i % 2 === 0 ? primaryColor : accentColor}
              emissiveIntensity={0.5 + bass * 2}
              metalness={0.8}
              roughness={0.2}
            />
          </mesh>
        );
      })}
    </group>
  );
}

export default function PsychedelicMandalaVisualizer({
  audioData = { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 },
  styleAdjustments = { brightness: 100, saturation: 100, contrast: 100 },
  width = 1080,
  height = 1080,
  zoomLevel = 1,
  backgroundColor = '#00FF00',
}: VisualizerProps) {
  const groupRef = useRef<THREE.Group>(null);
  
  const safeAudioData = audioData || { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 };
  const frequency = safeAudioData.frequency || Array(256).fill(0);
  
  const bass = useMemo(() => {
    let sum = 0;
    for (let i = 0; i <= 85; i++) sum += frequency[i] || 0;
    return Math.min(sum / 86 / 255, 1.0);
  }, [frequency]);
  
  const [textureVersion, setTextureVersion] = useState(0);

  // Listen for texture changes
  useEffect(() => {
    const handleTextureApplied = () => setTextureVersion(v => v + 1);
    const handleTextureCleared = () => setTextureVersion(v => v + 1);
    
    window.addEventListener('texture:applied', handleTextureApplied);
    window.addEventListener('texture:cleared', handleTextureCleared);
    
    return () => {
      window.removeEventListener('texture:applied', handleTextureApplied);
      window.removeEventListener('texture:cleared', handleTextureCleared);
    };
  }, []);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      // Slow hypnotic rotation for trance induction
      groupRef.current.rotation.z = clock.getElapsedTime() * 0.1;
      
      // Breathing effect - subliminal relaxation cue
      const breathe = 1 + Math.sin(clock.getElapsedTime() * 0.5) * 0.1;
      groupRef.current.scale.setScalar(breathe);
    }
  });
  
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <Environment preset="city" />
      
      <group ref={groupRef}>
        {/* Multiple concentric rings create depth illusion */}
        <MandalaRing radius={0.5} segments={8} depth={0} audioData={audioData} />
        <MandalaRing radius={1} segments={16} depth={1} audioData={audioData} />
        <MandalaRing radius={1.5} segments={24} depth={2} audioData={audioData} />
        <MandalaRing radius={2} segments={32} depth={3} audioData={audioData} />
        
        {/* Sacred geometry center - attracts focus */}
        <mesh>
          <octahedronGeometry args={[0.3, 2]} />
          <meshStandardMaterial
            color={(window as any).extractedColors?.primary || '#ff00ff'}
            emissive={(window as any).extractedColors?.primary || '#ff00ff'}
            emissiveIntensity={1 + bass * 2}
            wireframe
          />
        </mesh>
        
        <Sparkles
          count={100 + bass * 200}
          scale={[5, 5, 5]}
          size={2 + bass * 5}
          speed={2 + bass * 3}
          opacity={0.8}
          color={(window as any).extractedColors?.accent || '#00ffff'}
        />
      </group>
    </>
  );
}