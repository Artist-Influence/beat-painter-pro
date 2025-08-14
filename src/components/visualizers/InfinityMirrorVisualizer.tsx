import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment, Reflector, MeshTransmissionMaterial, Sparkles } from "@react-three/drei";
import * as THREE from "three";
import { VisualizerProps } from ".";
import { useVisualizerTexture, createVisualizerMaterial } from "@/hooks/useVisualizerTexture";

function MirrorPanel({ position, rotation, audioData, textureData }) {
  const safeAudioData = audioData || { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 };
  const frequency = safeAudioData.frequency || Array(256).fill(0);
  
  const bass = useMemo(() => {
    let sum = 0;
    for (let i = 0; i <= 85; i++) sum += frequency[i] || 0;
    return Math.min(sum / 86 / 255, 1.0);
  }, [frequency]);
  
  return (
    <Reflector
      position={position}
      rotation={rotation}
      args={[4, 4]}
      mirror={0.9}
      mixBlur={0.5}
      mixStrength={1 + bass * 2}
    >
      {(Material, props) => (
        <Material
          metalness={0.9}
          roughness={0.1}
          color={textureData.colors?.primary || '#ffffff'}
          {...props}
        />
      )}
    </Reflector>
  );
}

function FloatingSymbol({ position, index, audioData, textureData }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  
  const safeAudioData = audioData || { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 };
  const frequency = safeAudioData.frequency || Array(256).fill(0);
  
  // More responsive frequency mapping
  const freqIndex = Math.floor((index * 20) % 256);
  const amplitude = Math.min(frequency[freqIndex] / 255, 1.0);
  
  // Bass reactivity for movement
  const bass = useMemo(() => {
    let sum = 0;
    for (let i = 0; i <= 85; i++) sum += frequency[i] || 0;
    return Math.min(sum / 86 / 255, 1.0);
  }, [frequency]);

  // Create material with texture support
  const material = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#ffffff',
      metalness: 0.8,
      roughness: 0.2,
      transparent: true,
      opacity: 0.8,
    });
  }, [textureData.textureVersion]);

  // Apply texture if available
  useMemo(() => {
    if (material && textureData.texture) {
      material.map = textureData.texture;
      material.emissiveMap = textureData.texture;
      material.emissiveIntensity = 0.3;
      material.needsUpdate = true;
    }
  }, [material, textureData.texture, textureData.textureVersion]);
  
  useFrame(({ clock }) => {
    if (meshRef.current) {
      const t = clock.getElapsedTime();
      
      // Enhanced floating motion with bass response
      const bassMultiplier = bass > 0.1 ? bass : 0.1; // Less movement when no bass
      meshRef.current.position.y = position[1] + Math.sin(t * 2 + index) * 0.3 * amplitude * bassMultiplier;
      meshRef.current.position.x = position[0] + Math.cos(t * 1.5 + index) * 0.2 * bassMultiplier;
      
      // More dynamic rotation with audio
      meshRef.current.rotation.x = t * (1 + amplitude) + index;
      meshRef.current.rotation.y = t * 1.5 * (1 + bass) + index * 0.5;
      meshRef.current.rotation.z = t * 0.7 * (1 + amplitude);
      
      // Enhanced scale pulsing
      const pulse = 1 + amplitude * bassMultiplier * 0.8;
      meshRef.current.scale.setScalar(pulse * 0.3);
    }

    // Update material opacity based on audio
    if (material) {
      material.opacity = 0.6 + amplitude * 0.4;
      if (textureData.texture) {
        material.emissiveIntensity = 0.2 + amplitude * bass * 0.8;
      }
    }
  });
  
  // Sacred geometry shapes
  const geometries = [
    <tetrahedronGeometry args={[1, 0]} />,
    <octahedronGeometry args={[1, 0]} />,
    <dodecahedronGeometry args={[1, 0]} />,
    <icosahedronGeometry args={[1, 0]} />
  ];
  
  return (
    <mesh ref={meshRef} position={position} material={material}>
      {geometries[index % 4]}
    </mesh>
  );
}

export default function InfinityMirrorVisualizer({
  audioData = { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 },
  styleAdjustments = { brightness: 100, saturation: 100, contrast: 100 },
  width = 1080,
  height = 1080,
  zoomLevel = 1,
  backgroundColor = '#00FF00',
}: VisualizerProps) {
  const sceneRef = useRef<THREE.Group>(null);
  const textureData = useVisualizerTexture();
  
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

  // Center light material with texture support
  const centerMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: textureData.colors?.primary || '#ffffff',
      transparent: true,
      opacity: 0.8,
    });
  }, [textureData.colors?.primary, textureData.textureVersion]);
  
  useFrame(({ clock }) => {
    if (sceneRef.current) {
      const t = clock.getElapsedTime();
      
      // Enhanced rotation with audio reactivity
      const bassMultiplier = bass > 0.1 ? bass : 0.1;
      sceneRef.current.rotation.y = t * 0.1 * (1 + mids) + bassMultiplier * 0.5;
      
      // More dynamic breathing effect
      const breathe = 1 + Math.sin(t * 0.3) * 0.05 + bass * bassMultiplier * 0.2;
      sceneRef.current.scale.setScalar(breathe);
    }

    // Update center light opacity
    if (centerMaterial) {
      centerMaterial.opacity = 0.8 + bass * 0.2;
    }
  });
  
  // Symbol positions
  const symbolPositions = useMemo(() => {
    const positions = [];
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      positions.push([
        Math.cos(angle) * 1.5,
        (Math.random() - 0.5) * 2,
        Math.sin(angle) * 1.5
      ]);
    }
    return positions;
  }, []);
  
  return (
    <>
      <ambientLight intensity={0.2} />
      <directionalLight position={[5, 5, 5]} intensity={0.3} />
      <Environment preset="city" />
      
      <group ref={sceneRef}>
        {/* Mirror box - creates infinite reflections */}
        <MirrorPanel position={[0, 0, -2]} rotation={[0, 0, 0]} audioData={audioData} textureData={textureData} />
        <MirrorPanel position={[0, 0, 2]} rotation={[0, Math.PI, 0]} audioData={audioData} textureData={textureData} />
        <MirrorPanel position={[-2, 0, 0]} rotation={[0, Math.PI / 2, 0]} audioData={audioData} textureData={textureData} />
        <MirrorPanel position={[2, 0, 0]} rotation={[0, -Math.PI / 2, 0]} audioData={audioData} textureData={textureData} />
        <MirrorPanel position={[0, 2, 0]} rotation={[-Math.PI / 2, 0, 0]} audioData={audioData} textureData={textureData} />
        <MirrorPanel position={[0, -2, 0]} rotation={[Math.PI / 2, 0, 0]} audioData={audioData} textureData={textureData} />
        
        {/* Floating sacred geometry */}
        {symbolPositions.map((pos, i) => (
          <FloatingSymbol
            key={i}
            position={pos}
            index={i}
            audioData={audioData}
            textureData={textureData}
          />
        ))}
        
        {/* Center light source - focus point */}
        <mesh material={centerMaterial}>
          <sphereGeometry args={[0.1, 32, 32]} />
        </mesh>
        
        {/* Energy particles */}
        <Sparkles
          count={100}
          scale={[4, 4, 4]}
          size={1 + bass * 3}
          speed={1 + mids * 2}
          opacity={0.6}
          color={textureData.colors?.primary || '#ffffff'}
        />
      </group>
    </>
  );
}