import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { VisualizerProps } from ".";
import { useVisualizerTexture, createVisualizerMaterial } from "@/hooks/useVisualizerTexture";
import { useStudioStore } from "@/stores/studioStore";

function FluidBlob({ position, scale, audioData, textureData, index }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { audioSensitivity } = useStudioStore();
  const safeAudioData = audioData || { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 };
  
  // Calculate frequency range for this blob - different ranges for different blobs
  const freqStart = Math.floor((index / 5) * 255);
  const freqEnd = Math.min(freqStart + 50, 255);
  const intensity = useMemo(() => {
    let sum = 0;
    for (let i = freqStart; i < freqEnd; i++) {
      sum += safeAudioData.frequency[i] || 0;
    }
    const rawIntensity = Math.min(sum / (freqEnd - freqStart) / 255, 1.0);
    // Apply appropriate multiplier based on frequency range
    return freqStart <= 85 
      ? rawIntensity * audioSensitivity.bassMultiplier
      : freqStart <= 170 
      ? rawIntensity * audioSensitivity.midsMultiplier
      : rawIntensity * audioSensitivity.highsMultiplier;
  }, [safeAudioData.frequency, freqStart, freqEnd, audioSensitivity]);

  // Bass frequency for aggressive movement
  const bassIntensity = useMemo(() => {
    let sum = 0;
    for (let i = 0; i <= 85; i++) sum += safeAudioData.frequency[i] || 0;
    return Math.min((sum / 86 / 255) * audioSensitivity.bassMultiplier, 1.0);
  }, [safeAudioData.frequency, audioSensitivity.bassMultiplier]);

  // High frequency for jittery effects
  const highIntensity = useMemo(() => {
    let sum = 0;
    for (let i = 170; i < 255; i++) sum += safeAudioData.frequency[i] || 0;
    return Math.min((sum / 85 / 255) * audioSensitivity.highsMultiplier, 1.0);
  }, [safeAudioData.frequency, audioSensitivity.highsMultiplier]);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      const t = clock.getElapsedTime();
      
      // Audio-driven morphing (capped at 3x base size)
      const baseMorphX = 1 + Math.sin(t * 2 + index) * 0.3;
      const baseMorphY = 1 + Math.cos(t * 1.8 + index * 0.7) * 0.4;
      const baseMorphZ = 1 + Math.sin(t * 2.2 + index * 0.5) * 0.25;
      
      const audioMorphX = Math.min(baseMorphX + intensity * 2.0 + bassIntensity * 2.4, 3);
      const audioMorphY = Math.min(baseMorphY + intensity * 2.2 + safeAudioData.beatStrength * 3.2, 3);
      const audioMorphZ = Math.min(baseMorphZ + intensity * 1.8 + highIntensity * 1.2, 3);
      
      meshRef.current.scale.set(
        scale[0] * audioMorphX,
        scale[1] * audioMorphY,
        scale[2] * audioMorphZ
      );
      
      // Rotation based on audio (reduced by 20%)
      meshRef.current.rotation.x = t * (0.3 + intensity * 1.6) + bassIntensity * Math.PI * 0.8;
      meshRef.current.rotation.y = t * (0.4 + intensity * 1.2) + safeAudioData.beatStrength * Math.PI * 1.6;
      meshRef.current.rotation.z = Math.sin(t * 0.5 + index) * (0.4 + highIntensity * 1.6);
      
      // Floating motion with audio (reduced by 20%)
      const baseFloat = Math.sin(t * 1.2 + index) * 1.2;
      const audioFloat = bassIntensity * 3.2 * Math.sin(t * 8);
      const beatFloat = safeAudioData.beatStrength * 4.8 * Math.sin(t * 12);
      const floatOffset = position[1] + baseFloat + audioFloat + beatFloat;
      meshRef.current.position.y = floatOffset;
      
      // Horizontal movement based on mid frequencies (reduced by 20%)
      const midIntensity = (intensity + highIntensity) * 0.5;
      meshRef.current.position.x = position[0] + midIntensity * 2.4 * Math.sin(t * 3 + index);
      meshRef.current.position.z = position[2] + midIntensity * 1.6 * Math.cos(t * 2.5 + index);
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
  const particleRefs = useRef<THREE.Mesh[]>([]);
  const { audioSensitivity } = useStudioStore();
  const safeAudioData = audioData || { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 };
  
  // Calculate overall audio intensity with sensitivity
  const totalIntensity = useMemo(() => {
    let sum = 0;
    for (let i = 0; i < 255; i++) sum += safeAudioData.frequency[i] || 0;
    const rawIntensity = Math.min(sum / 255 / 255, 1.0);
    // Use average of all multipliers for total intensity
    const avgMultiplier = (audioSensitivity.bassMultiplier + audioSensitivity.midsMultiplier + audioSensitivity.highsMultiplier) / 3;
    return rawIntensity * avgMultiplier;
  }, [safeAudioData.frequency, audioSensitivity]);
  
  // Create particle positions (4x smaller)
  const particles = useMemo(() => {
    const particleArray = [];
    for (let i = 0; i < 40; i++) {
      const theta = (i / 40) * Math.PI * 2;
      const phi = Math.acos(1 - 2 * Math.random());
      const radius = (2 + Math.random() * 4) / 4; // 4x smaller
      
      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);
      
      particleArray.push({
        position: [x, y, z],
        baseScale: (0.05 + Math.random() * 0.1) / 4, // 4x smaller
        index: i,
        freqIndex: Math.floor((i / 40) * 255)
      });
    }
    return particleArray;
  }, []);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      const t = clock.getElapsedTime();
      
      // Rotation based on audio (reduced by 20%)
      groupRef.current.rotation.y = t * (0.2 + totalIntensity * 2.4);
      groupRef.current.rotation.x = Math.sin(t * 0.8) * (0.24 + safeAudioData.beatStrength * 1.6);
      
      // Animate individual particles
      particleRefs.current.forEach((mesh, i) => {
        if (mesh && particles[i]) {
          const particle = particles[i];
          const freqIntensity = (safeAudioData.frequency[particle.freqIndex] || 0) / 255;
          
          // Scaling based on frequency (capped at 3x)
          const audioScale = Math.min(1 + freqIntensity * 12 + safeAudioData.beatStrength * 16, 3);
          const scale = particle.baseScale * audioScale;
          mesh.scale.setScalar(scale);
          
          // Movement (reduced by 20%)
          const moveRadius = 1 + freqIntensity * 6.4 + totalIntensity * 4;
          const moveX = particle.position[0] + Math.sin(t * 4 + i * 0.2) * moveRadius;
          const moveY = particle.position[1] + Math.cos(t * 3.5 + i * 0.3) * moveRadius;
          const moveZ = particle.position[2] + Math.sin(t * 3.8 + i * 0.15) * moveRadius;
          
          mesh.position.set(moveX, moveY, moveZ);
          
          // Update opacity based on audio
          if (mesh.material) {
            (mesh.material as any).opacity = 0.3 + freqIntensity * 0.7 + safeAudioData.beatStrength;
          }
        }
      });
    }
  });

  return (
    <group ref={groupRef}>
      {particles.map((particle, index) => (
        <mesh 
          key={index} 
          position={particle.position}
          ref={(el) => { if (el) particleRefs.current[index] = el; }}
        >
          <sphereGeometry args={[particle.baseScale, 8, 8]} />
          <meshBasicMaterial 
            color="#ffffff" 
            transparent 
            opacity={0.4}
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
  
  // Create main fluid blobs (4x smaller)
  const blobs = useMemo(() => {
    return [
      { position: [0, 0, 0], scale: [1.5/4, 1.8/4, 1.2/4], index: 0 },
      { position: [-1.2/4, 0.8/4, -0.5/4], scale: [1.0/4, 1.2/4, 0.9/4], index: 1 },
      { position: [1.5/4, -0.6/4, 0.3/4], scale: [0.8/4, 1.1/4, 1.0/4], index: 2 },
      { position: [0.2/4, 1.4/4, -0.8/4], scale: [0.9/4, 0.7/4, 1.3/4], index: 3 },
      { position: [-0.8/4, -1.1/4, 0.6/4], scale: [1.1/4, 0.9/4, 0.8/4], index: 4 },
    ];
  }, []);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      const t = clock.getElapsedTime();
      
      // Overall breathing based on audio (capped at 3x)
      const baseBreath = 1 + Math.sin(t * 2) * 0.08;
      const audioBreath = Math.min(1 + (audioData.amplitude || 0) * 1.6 + (audioData.beatStrength || 0) * 2.4, 3);
      groupRef.current.scale.setScalar(baseBreath * audioBreath);
      
      // Rotation with audio (reduced by 20%)
      groupRef.current.rotation.y = t * (0.1 + (audioData.amplitude || 0) * 1.6);
      groupRef.current.rotation.x = Math.sin(t * 0.8) * (0.16 + (audioData.beatStrength || 0) * 1.2);
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