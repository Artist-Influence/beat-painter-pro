import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";
import { VisualizerProps } from ".";

function NeuralLattice({ audioData }: any) {
  const pointsRef = useRef<THREE.Points>(null);
  const groupRef = useRef<THREE.Group>(null);

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
  const accentColor = extractedColors?.accent || '#ffffff';

  const safeAudioData = audioData || { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 };
  const frequency = safeAudioData.frequency || Array(256).fill(0);
  const amplitude = safeAudioData.amplitude || 0;

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions: number[] = [];
    const colors: number[] = [];
    
    for (let i = 0; i < 2000; i++) {
      const r = Math.random() * 2.5 + 0.2;
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos(2 * Math.random() - 1);
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);
      positions.push(x, y, z);

      const colorChoice = Math.random();
      let color: THREE.Color;
      if (colorChoice < 0.4) {
        color = new THREE.Color(primaryColor);
      } else if (colorChoice < 0.7) {
        color = new THREE.Color(secondaryColor);
      } else {
        color = new THREE.Color(accentColor);
      }
      colors.push(color.r, color.g, color.b);
    }
    
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    return geo;
  }, [primaryColor, secondaryColor, accentColor]);

  const bass = useMemo(() => {
    let sum = 0;
    for (let i = 0; i <= 85; i++) sum += frequency[i] || 0;
    return sum / 86 / 255;
  }, [frequency]);

  const mids = useMemo(() => {
    let sum = 0;
    for (let i = 86; i <= 170; i++) sum += frequency[i] || 0;
    return sum / 85 / 255;
  }, [frequency]);

  const highs = useMemo(() => {
    let sum = 0;
    for (let i = 171; i <= 255; i++) sum += frequency[i] || 0;
    return sum / 85 / 255;
  }, [frequency]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    
    if (groupRef.current) {
      // Much smoother transitions using lerp-like behavior
      const targetScale = 1 + bass * 1.2 + 0.15 * Math.sin(t * 6);
      const currentScale = groupRef.current.scale.x;
      const smoothScale = currentScale + (targetScale - currentScale) * 0.05; // Slower smoothing
      groupRef.current.scale.setScalar(smoothScale);
      
      // Smoother rotation transitions
      const targetRotY = t * 1.2 + mids * 4.0;
      const currentRotY = groupRef.current.rotation.y;
      groupRef.current.rotation.y = currentRotY + (targetRotY - currentRotY) * 0.1;
      
      const targetRotX = Math.sin(t * 1.5) * 1.0 + bass * 2.5;
      const currentRotX = groupRef.current.rotation.x;
      groupRef.current.rotation.x = currentRotX + (targetRotX - currentRotX) * 0.1;
      
      const targetRotZ = Math.cos(t * 0.8) * 0.8 + highs * 2.0;
      const currentRotZ = groupRef.current.rotation.z;
      groupRef.current.rotation.z = currentRotZ + (targetRotZ - currentRotZ) * 0.1;
      
      // Smoother position transitions
      const targetPosY = Math.sin(t * 3.0) * 1.0 + amplitude * 2.0 + (bass > 0.7 ? bass * 3.0 : 0);
      const currentPosY = groupRef.current.position.y;
      groupRef.current.position.y = currentPosY + (targetPosY - currentPosY) * 0.08;
    }
    
    if (pointsRef.current && pointsRef.current.material) {
      const material = pointsRef.current.material as THREE.PointsMaterial;
      material.size = 0.012 + highs * 0.06 + bass * 0.04 + 0.02 * Math.sin(t * 10);
      material.opacity = 0.22 + highs * 0.5 + bass * 0.3 + 0.1 * Math.sin(t * 6);
      
      if (extractedColors?.isNeon) {
        material.opacity = Math.min(material.opacity * 1.25, 0.85);
        material.size *= 1.15;
      }
      
      material.needsUpdate = true;
    }
  });

  return (
    <group ref={groupRef} scale={0.14}>
      <mesh>
        <sphereGeometry args={[2.0, 32, 32]} />
        <meshStandardMaterial 
          color={primaryColor} 
          wireframe 
          transparent 
          opacity={0.25 + mids * 0.4 + bass * 0.3}
          map={texture || undefined}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[2.8, 16, 16]} />
        <meshStandardMaterial 
          color={secondaryColor} 
          wireframe 
          transparent 
          opacity={0.15 + highs * 0.35}
          map={texture || undefined}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[3.5, 8, 8]} />
        <meshStandardMaterial 
          color={accentColor} 
          wireframe 
          transparent 
          opacity={0.1 + bass * 0.25}
          map={texture || undefined}
        />
      </mesh>
    </group>
  );
}

export default function NeuralLatticeVisualizer({
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
      <ambientLight intensity={0.6} />
      <directionalLight position={[4, 7, 6]} intensity={0.8} />
      <Environment preset="city" />
      <NeuralLattice audioData={audioData} />
    </>
  );
}
