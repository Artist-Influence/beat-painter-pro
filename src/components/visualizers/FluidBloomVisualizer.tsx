import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { VisualizerProps } from ".";
import { useVisualizerTexture, createVisualizerMaterial } from "@/hooks/useVisualizerTexture";

function FluidBlob({ position, scale, audioData, textureData, index }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const safeAudioData = audioData || { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 };
  
  // Calculate frequency range for this blob
  const freqStart = Math.floor((index / 5) * 255);
  const freqEnd = Math.min(freqStart + 50, 255);
  const intensity = useMemo(() => {
    let sum = 0;
    for (let i = freqStart; i < freqEnd; i++) {
      sum += safeAudioData.frequency[i] || 0;
    }
    return Math.min(sum / (freqEnd - freqStart) / 255, 1.0);
  }, [safeAudioData.frequency, freqStart, freqEnd]);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      const t = clock.getElapsedTime();
      
      // Organic morphing animation
      const morphX = 1 + Math.sin(t * 0.8 + index) * 0.3 + intensity * 0.5;
      const morphY = 1 + Math.cos(t * 0.6 + index * 0.7) * 0.2 + intensity * 0.3;
      const morphZ = 1 + Math.sin(t * 0.9 + index * 0.5) * 0.25 + intensity * 0.4;
      
      meshRef.current.scale.set(
        scale[0] * morphX,
        scale[1] * morphY,
        scale[2] * morphZ
      );
      
      // Fluid rotation
      meshRef.current.rotation.x = t * 0.1 + index * 0.2;
      meshRef.current.rotation.y = t * 0.15 + index * 0.3;
      meshRef.current.rotation.z = Math.sin(t * 0.05 + index) * 0.1;
      
      // Gentle floating motion
      const floatOffset = position[1] + Math.sin(t * 0.4 + index) * 0.5;
      meshRef.current.position.y = floatOffset;
    }
  });

  // Create organic blob geometry
  const geometry = useMemo(() => {
    const geo = new THREE.SphereGeometry(1, 32, 32);
    const positionAttribute = geo.getAttribute('position');
    const vertex = new THREE.Vector3();
    
    // Deform sphere into organic blob shape
    for (let i = 0; i < positionAttribute.count; i++) {
      vertex.fromBufferAttribute(positionAttribute, i);
      
      // Add organic distortions
      const noise1 = Math.sin(vertex.x * 3 + vertex.y * 2) * 0.1;
      const noise2 = Math.cos(vertex.z * 2.5 + vertex.x * 1.5) * 0.08;
      const noise3 = Math.sin(vertex.y * 4 + vertex.z * 1.8) * 0.06;
      
      vertex.multiplyScalar(1 + noise1 + noise2 + noise3);
      positionAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
    
    geo.computeVertexNormals();
    return geo;
  }, []);

  const material = useMemo(() => 
    createVisualizerMaterial('#ffffff', textureData, {
      emissive: '#000000',
      emissiveIntensity: 0,
      transparent: true,
      opacity: 0.9,
      roughness: 0.2,
      metalness: 0.3,
    }), [textureData]
  );

  return (
    <mesh 
      ref={meshRef} 
      position={position} 
      geometry={geometry}
      material={material}
    />
  );
}

function FluidParticles({ audioData, textureData }) {
  const groupRef = useRef<THREE.Group>(null);
  const safeAudioData = audioData || { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 };
  
  // Create particle positions
  const particles = useMemo(() => {
    const particleArray = [];
    for (let i = 0; i < 20; i++) {
      const theta = (i / 20) * Math.PI * 2;
      const phi = Math.acos(1 - 2 * Math.random());
      const radius = 2 + Math.random() * 3;
      
      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);
      
      particleArray.push({
        position: [x, y, z],
        scale: 0.1 + Math.random() * 0.15,
        index: i
      });
    }
    return particleArray;
  }, []);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      const t = clock.getElapsedTime();
      
      // Overall gentle rotation
      groupRef.current.rotation.y = t * 0.05;
      groupRef.current.rotation.x = Math.sin(t * 0.03) * 0.1;
    }
  });

  return (
    <group ref={groupRef}>
      {particles.map((particle, index) => (
        <mesh key={index} position={particle.position}>
          <sphereGeometry args={[particle.scale, 8, 8]} />
          <meshBasicMaterial 
            color="#ffffff" 
            transparent 
            opacity={0.6}
          />
        </mesh>
      ))}
    </group>
  );
}

export default function FluidBloomVisualizer({
  audioData = { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 },
  styleAdjustments = { brightness: 100, saturation: 100, contrast: 100 },
  width = 1080,
  height = 1080,
  zoomLevel = 1,
  backgroundColor = '#000000',
}: VisualizerProps) {
  const groupRef = useRef<THREE.Group>(null);
  const textureData = useVisualizerTexture();
  
  // Create main fluid blobs
  const blobs = useMemo(() => {
    return [
      { position: [0, 0, 0], scale: [1.5, 1.8, 1.2], index: 0 },
      { position: [-1.2, 0.8, -0.5], scale: [1.0, 1.2, 0.9], index: 1 },
      { position: [1.5, -0.6, 0.3], scale: [0.8, 1.1, 1.0], index: 2 },
      { position: [0.2, 1.4, -0.8], scale: [0.9, 0.7, 1.3], index: 3 },
      { position: [-0.8, -1.1, 0.6], scale: [1.1, 0.9, 0.8], index: 4 },
    ];
  }, []);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      const t = clock.getElapsedTime();
      
      // Gentle overall breathing motion
      const breathe = 1 + Math.sin(t * 0.6) * 0.05;
      groupRef.current.scale.setScalar(breathe);
      
      // Slow rotation
      groupRef.current.rotation.y = t * 0.02;
    }
  });

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[2, 2, 1]} intensity={0.6} />
      <pointLight position={[-2, -2, -1]} intensity={0.3} color="#4a90ff" />
      
      <group ref={groupRef}>
        {/* Main fluid blobs */}
        {blobs.map((blob) => (
          <FluidBlob
            key={blob.index}
            position={blob.position}
            scale={blob.scale}
            audioData={audioData}
            textureData={textureData}
            index={blob.index}
          />
        ))}
        
        {/* Floating particles */}
        <FluidParticles audioData={audioData} textureData={textureData} />
      </group>
    </>
  );
}