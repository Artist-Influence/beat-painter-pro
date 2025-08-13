import React, { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";
import { VisualizerProps } from "../visualizer";
import { useVisualizerTexture, createVisualizerMaterial } from "@/hooks/useVisualizerTexture";
import { analyzeAudio } from "@/lib/visualizerUtils";

function FlowerOfLife({ audioData, textureData }) {
  const groupRef = useRef<THREE.Group>(null);
  const materialsRef = useRef<THREE.Material[]>([]);
  
  const safeAudioData = audioData || { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 };
  const frequency = safeAudioData.frequency || Array(256).fill(0);
  const { bass, mids } = analyzeAudio(frequency);
  
  useFrame(({ clock }) => {
    if (groupRef.current) {
      const t = clock.getElapsedTime();
      
      // Sacred rotation pattern - 3, 6, 9 frequencies
      groupRef.current.rotation.z = t * 0.3 + bass * 0.9;
      
      // Breathing pattern matches meditation rhythm
      const breathe = 1 + Math.sin(t * 0.6) * 0.2 + mids * 0.3;
      groupRef.current.scale.setScalar(breathe);
    }
  });

  // Update materials when texture changes
  useEffect(() => {
    materialsRef.current.forEach(material => {
      if (material instanceof THREE.MeshStandardMaterial) {
        const primaryColor = textureData.colors?.primary || '#ffd700';
        material.color.setHex(parseInt(primaryColor.replace('#', '0x')));
        material.emissive.setHex(parseInt(primaryColor.replace('#', '0x')));
        
        if (textureData.texture) {
          material.map = textureData.texture;
          material.emissiveMap = textureData.texture;
          material.needsUpdate = true;
        }
      }
    });
  }, [textureData.textureVersion, textureData.colors.primary]);
  
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
  
  const material = createVisualizerMaterial(textureData.colors?.primary || '#ffd700', textureData, {
    emissiveIntensity: 0.8 + bass * 1.5,
    metalness: 0.9,
    roughness: 0.1,
  });

  // Store material reference for updates
  useEffect(() => {
    materialsRef.current = [material];
    return () => {
      material.dispose();
    };
  }, [material]);
  
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
  const materialRef = useRef<THREE.Material>();
  
  const safeAudioData = audioData || { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 };
  const frequency = safeAudioData.frequency || Array(256).fill(0);
  const { highs } = analyzeAudio(frequency);
  
  useFrame(({ clock }) => {
    if (meshRef.current) {
      const t = clock.getElapsedTime();
      
      // Metatron's cube rotation - activates pineal gland
      meshRef.current.rotation.x = t * 0.5;
      meshRef.current.rotation.y = t * 0.7;
      meshRef.current.rotation.z = t * 0.3;
      
      // High frequency expansion
      const expand = 1 + highs * 0.5;
      meshRef.current.scale.setScalar(expand);
    }
  });

  const material = createVisualizerMaterial(textureData.colors?.accent || '#ff00ff', textureData, {
    wireframe: true,
    emissiveIntensity: 0.8 + highs * 2,
  });

  // Update material when texture changes
  useEffect(() => {
    materialRef.current = material;
  }, [material]);

  useEffect(() => {
    if (materialRef.current instanceof THREE.MeshStandardMaterial) {
      const accentColor = textureData.colors?.accent || '#ff00ff';
      materialRef.current.color.setHex(parseInt(accentColor.replace('#', '0x')));
      materialRef.current.emissive.setHex(parseInt(accentColor.replace('#', '0x')));
      
      if (textureData.texture) {
        materialRef.current.emissiveMap = textureData.texture;
        materialRef.current.needsUpdate = true;
      }
    }
  }, [textureData.textureVersion, textureData.colors.accent]);
  
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
  const particleMaterialsRef = useRef<THREE.Material[]>([]);
  const textureData = useVisualizerTexture();
  
  const safeAudioData = audioData || { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 };
  const frequency = safeAudioData.frequency || Array(256).fill(0);
  const { bass } = analyzeAudio(frequency);
  
  useFrame(({ clock }) => {
    if (containerRef.current) {
      // 432Hz inspired rotation speed
      containerRef.current.rotation.z = clock.getElapsedTime() * 0.432;
    }
  });

  // Create particle material
  const particleMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: new THREE.Color(textureData.colors?.primary || '#ffd700'),
      transparent: true,
      opacity: 0.7,
    });
  }, [textureData.colors.primary]);

  // Update particle materials when texture changes
  useEffect(() => {
    particleMaterialsRef.current.forEach(material => {
      if (material instanceof THREE.MeshBasicMaterial) {
        const primaryColor = textureData.colors?.primary || '#ffd700';
        material.color.setHex(parseInt(primaryColor.replace('#', '0x')));
        material.needsUpdate = true;
      }
    });
  }, [textureData.textureVersion, textureData.colors.primary]);

  // Store particle material references
  useEffect(() => {
    particleMaterialsRef.current = [particleMaterial];
    return () => {
      particleMaterial.dispose();
    };
  }, [particleMaterial]);
  
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