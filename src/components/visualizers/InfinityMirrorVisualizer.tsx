import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";
import { VisualizerProps } from ".";
import { useVisualizerTexture } from "@/hooks/useVisualizerTexture";

function MirrorPanel({ position, rotation, audioData, textureData }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  const safeAudioData = audioData || { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 };
  const frequency = safeAudioData.frequency || Array(256).fill(0);
  
  const bass = useMemo(() => {
    let sum = 0;
    for (let i = 0; i <= 85; i++) sum += frequency[i] || 0;
    return Math.min(sum / 86 / 255, 1.0);
  }, [frequency]);

  // Create material with white base for texture support
  const material = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      metalness: 0.9,
      roughness: 0.1,
      transparent: true,
      opacity: 0.8
    });
    
    if (textureData.texture) {
      mat.map = textureData.texture;
      mat.needsUpdate = true;
    }
    
    return mat;
  }, [textureData.texture, textureData.textureVersion]);
  
  useFrame(() => {
    if (meshRef.current && material) {
      material.opacity = 0.7 + bass * 0.3;
    }
  });
  
  return (
    <mesh ref={meshRef} position={position} rotation={rotation} material={material}>
      <planeGeometry args={[4, 4]} />
    </mesh>
  );
}

function FloatingSymbol({ position, index, audioData, textureData }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  const safeAudioData = audioData || { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 };
  const frequency = safeAudioData.frequency || Array(256).fill(0);
  
  const freqIndex = Math.floor((index * 20) % 256);
  const amplitude = Math.min(frequency[freqIndex] / 255, 1.0);
  
  const bass = useMemo(() => {
    let sum = 0;
    for (let i = 0; i <= 85; i++) sum += frequency[i] || 0;
    return Math.min(sum / 86 / 255, 1.0);
  }, [frequency]);

  // Create material with white base for texture support
  const material = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      metalness: 0.8,
      roughness: 0.2,
      transparent: true,
      opacity: 0.8
    });
    
    if (textureData.texture) {
      mat.map = textureData.texture;
      mat.emissiveMap = textureData.texture;
      mat.emissiveIntensity = 0.3;
      mat.needsUpdate = true;
    }
    
    return mat;
  }, [textureData.texture, textureData.textureVersion]);

  // Create geometry
  const geometry = useMemo(() => {
    const geometries = [
      new THREE.TetrahedronGeometry(1, 0),
      new THREE.OctahedronGeometry(1, 0),
      new THREE.DodecahedronGeometry(1, 0),
      new THREE.IcosahedronGeometry(1, 0)
    ];
    return geometries[index % 4];
  }, [index]);
  
  useFrame(({ clock }) => {
    if (meshRef.current) {
      const t = clock.getElapsedTime();
      
      // Enhanced floating motion with bass response
      const bassMultiplier = bass > 0.1 ? bass : 0.1;
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
  
  return (
    <mesh ref={meshRef} position={position} material={material} geometry={geometry} />
  );
}

export default function InfinityMirrorVisualizer({
  audioData = { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 },
  styleAdjustments = { brightness: 100, saturation: 100, contrast: 100 },
  width = 1080,
  height = 1080,
  zoomLevel = 1,
  backgroundColor = '#000000',
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

  // Center light material
  const centerMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: '#ffffff',
      transparent: true,
      opacity: 0.8
    });
  }, []);
  
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
        {/* Mirror panels - simplified */}
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
        
        {/* Center light source */}
        <mesh material={centerMaterial}>
          <sphereGeometry args={[0.1, 32, 32]} />
        </mesh>
        
        {/* Simplified energy particles */}
        {Array.from({ length: 20 }).map((_, i) => {
          const angle = (i / 20) * Math.PI * 2;
          const radius = 3 + Math.sin(i) * 0.5;
          return (
            <mesh 
              key={i} 
              position={[
                Math.cos(angle) * radius,
                Math.sin(i * 0.5) * 2,
                Math.sin(angle) * radius
              ]}
            >
              <sphereGeometry args={[0.05, 8, 8]} />
              <meshBasicMaterial 
                color="#ffffff"
                transparent
                opacity={0.6 + bass * 0.4}
              />
            </mesh>
          );
        })}
      </group>
    </>
  );
}