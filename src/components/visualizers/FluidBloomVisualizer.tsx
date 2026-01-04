import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { VisualizerProps } from ".";
import { useVisualizerTexture, createVisualizerMaterial } from "@/hooks/useVisualizerTexture";
import { useStudioStore } from "@/stores/studioStore";

function FluidBlob({ position, scale, audioData, textureData, index, smoothedValues }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { audioSensitivity } = useStudioStore();
  const safeAudioData = audioData || { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 };
  const frequency = safeAudioData.frequency || Array(256).fill(0);
  
  // Calculate frequency range for this blob
  const freqStart = Math.floor((index / 5) * 255);
  const freqEnd = Math.min(freqStart + 50, 255);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      const t = clock.getElapsedTime();
      const animSpeed = audioSensitivity.animationSpeed;
      
      // Calculate intensity per-frame (not memoized)
      let sum = 0;
      for (let i = freqStart; i < freqEnd; i++) {
        sum += frequency[i] || 0;
      }
      const rawIntensity = Math.min(sum / (freqEnd - freqStart) / 255, 1.0);
      
      // Apply multiplier based on frequency range
      const intensity = freqStart <= 85 
        ? rawIntensity * audioSensitivity.bassMultiplier
        : freqStart <= 170 
        ? rawIntensity * audioSensitivity.midsMultiplier
        : rawIntensity * audioSensitivity.highsMultiplier;
      
      // REMOVED throttling - full audio response
      const baseMorphX = 1 + Math.sin(t * 1.5 * animSpeed + index) * 0.3;
      const baseMorphY = 1 + Math.cos(t * 1.2 * animSpeed + index * 0.7) * 0.35;
      const baseMorphZ = 1 + Math.sin(t * 1.3 * animSpeed + index * 0.5) * 0.25;
      
      // Dynamic bass response - much stronger
      const bassResponse = smoothedValues.bass * 2.5;
      const beatResponse = smoothedValues.beat * 2.0;
      
      // Dramatic morphing - caps raised significantly
      const audioMorphX = Math.min(baseMorphX + intensity * 1.5 + bassResponse, 3.5);
      const audioMorphY = Math.min(baseMorphY + intensity * 1.8 + beatResponse, 3.5);
      const audioMorphZ = Math.min(baseMorphZ + intensity * 1.2 + smoothedValues.highs * 1.5, 3.5);
      
      meshRef.current.scale.set(
        scale[0] * audioMorphX,
        scale[1] * audioMorphY,
        scale[2] * audioMorphZ
      );
      
      // Rotation based on audio - faster
      meshRef.current.rotation.x = t * (0.2 + intensity * 0.8) * animSpeed + smoothedValues.bass * Math.PI * 0.4;
      meshRef.current.rotation.y = t * (0.25 + intensity * 0.6) * animSpeed + smoothedValues.beat * Math.PI * 0.5;
      meshRef.current.rotation.z = Math.sin(t * animSpeed + index) * (0.2 + smoothedValues.highs * 0.6);
      
      // Floating motion with strong audio response
      const baseFloat = Math.sin(t * 2 * animSpeed + index) * 0.5;
      const audioFloat = smoothedValues.bass * 1.5 * Math.sin(t * 6 * animSpeed);
      const beatFloat = smoothedValues.beat * 2.0 * Math.sin(t * 8 * animSpeed);
      const floatOffset = position[1] + baseFloat + audioFloat + beatFloat;
      meshRef.current.position.y = floatOffset;
      
      // Horizontal movement - stronger
      const midIntensity = (intensity + smoothedValues.highs) * 0.5;
      meshRef.current.position.x = position[0] + midIntensity * 1.2 * Math.sin(t * 3 * animSpeed + index);
      meshRef.current.position.z = position[2] + midIntensity * 0.8 * Math.cos(t * 2.5 * animSpeed + index);
      
      // Emissive intensity based on audio
      if (meshRef.current.material) {
        const mat = meshRef.current.material as THREE.MeshStandardMaterial;
        if (mat.emissiveIntensity !== undefined) {
          mat.emissiveIntensity = 0.2 + smoothedValues.beat * 1.5 + intensity * 0.8;
        }
      }
    }
  });

  // Create organic blob geometry
  const geometry = useMemo(() => {
    const geo = new THREE.SphereGeometry(1, 32, 32);
    const positionAttribute = geo.getAttribute('position');
    const vertex = new THREE.Vector3();
    
    for (let i = 0; i < positionAttribute.count; i++) {
      vertex.fromBufferAttribute(positionAttribute, i);
      
      const noise1 = Math.sin(vertex.x * 3 + vertex.y * 2) * 0.1;
      const noise2 = Math.cos(vertex.z * 2.5 + vertex.x * 1.5) * 0.08;
      const noise3 = Math.sin(vertex.y * 4 + vertex.z * 1.8) * 0.06;
      
      vertex.multiplyScalar(1 + noise1 + noise2 + noise3);
      positionAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
    
    geo.computeVertexNormals();
    return geo;
  }, []);

  const primaryColor = textureData?.colors?.primary || '#ffffff';
  const accentColor = textureData?.colors?.accent || '#ffffff';

  const material = useMemo(() => 
    createVisualizerMaterial(primaryColor, textureData, {
      transparent: true,
      opacity: 0.9,
      roughness: 0.8,
      metalness: 0.1,
      emissive: accentColor,
      emissiveIntensity: 0.2,
    }), [textureData, primaryColor, accentColor]
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

function FluidParticles({ audioData, textureData, smoothedValues }) {
  const groupRef = useRef<THREE.Group>(null);
  const particleRefs = useRef<THREE.Mesh[]>([]);
  const { audioSensitivity } = useStudioStore();
  const safeAudioData = audioData || { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 };
  const frequency = safeAudioData.frequency || Array(256).fill(0);
  
  // Create particle positions - smaller radius
  const particles = useMemo(() => {
    const particleArray = [];
    for (let i = 0; i < 50; i++) {
      const theta = (i / 50) * Math.PI * 2;
      const phi = Math.acos(1 - 2 * Math.random());
      const radius = 1.0 + Math.random() * 2.0;
      
      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);
      
      particleArray.push({
        position: [x, y, z],
        baseScale: 0.03 + Math.random() * 0.08,
        index: i,
        freqIndex: Math.floor((i / 50) * 255)
      });
    }
    return particleArray;
  }, []);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      const t = clock.getElapsedTime();
      const animSpeed = audioSensitivity.animationSpeed;
      
      // Calculate total intensity per-frame
      let sum = 0;
      for (let i = 0; i < 255; i++) sum += frequency[i] || 0;
      const totalIntensity = Math.min(sum / 255 / 255, 1.0);
      
      // Rotation - much faster with audio
      groupRef.current.rotation.y = t * (0.5 + totalIntensity * 4.0 + smoothedValues.beat * 3.0) * animSpeed;
      groupRef.current.rotation.x = Math.sin(t * animSpeed) * (0.4 + smoothedValues.beat * 2.5);
      
      // Animate individual particles
      particleRefs.current.forEach((mesh, i) => {
        if (mesh && particles[i]) {
          const particle = particles[i];
          const freqIntensity = (frequency[particle.freqIndex] || 0) / 255;
          
          // Scaling - dramatically increased
          const audioScale = Math.min(1 + freqIntensity * 25 + smoothedValues.beat * 20, 8);
          const scale = particle.baseScale * audioScale;
          mesh.scale.setScalar(scale);
          
          // Movement - dramatically increased
          const moveRadius = 1 + freqIntensity * 12 + totalIntensity * 8 + smoothedValues.bass * 6;
          const moveX = particle.position[0] + Math.sin(t * 6 * animSpeed + i * 0.2) * moveRadius;
          const moveY = particle.position[1] + Math.cos(t * 5 * animSpeed + i * 0.3) * moveRadius;
          const moveZ = particle.position[2] + Math.sin(t * 5.5 * animSpeed + i * 0.15) * moveRadius;
          
          mesh.position.set(moveX, moveY, moveZ);
          
          // Update opacity
          if (mesh.material) {
            (mesh.material as any).opacity = 0.4 + freqIntensity * 0.6 + smoothedValues.beat * 0.5;
          }
        }
      });
    }
  });

  const accentColor = textureData?.colors?.accent || '#ffffff';

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
            color={accentColor}
            transparent 
            opacity={0.5}
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
  const { audioSensitivity } = useStudioStore();
  
  // Smoothed audio values
  const smoothedBass = useRef(0);
  const smoothedMids = useRef(0);
  const smoothedHighs = useRef(0);
  const smoothedBeat = useRef(0);
  
  // Create main fluid blobs - smaller base sizes
  const blobs = useMemo(() => {
    return [
      { position: [0, 0, 0], scale: [0.8, 1.0, 0.7], index: 0 },
      { position: [-0.7, 0.5, -0.3], scale: [0.5, 0.7, 0.5], index: 1 },
      { position: [0.8, -0.4, 0.2], scale: [0.45, 0.6, 0.55], index: 2 },
      { position: [0.1, 0.8, -0.5], scale: [0.5, 0.4, 0.7], index: 3 },
      { position: [-0.5, -0.6, 0.4], scale: [0.6, 0.5, 0.45], index: 4 },
    ];
  }, []);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      const t = clock.getElapsedTime();
      const safeAudioData = audioData || { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 };
      const frequency = safeAudioData.frequency || Array(256).fill(0);
      const animSpeed = audioSensitivity.animationSpeed;
      
      // Calculate frequency bands per-frame (NOT in useMemo)
      let bassSum = 0, midsSum = 0, highsSum = 0;
      for (let i = 0; i <= 85; i++) bassSum += frequency[i] || 0;
      for (let i = 86; i <= 170; i++) midsSum += frequency[i] || 0;
      for (let i = 171; i <= 255; i++) highsSum += frequency[i] || 0;
      
      const rawBass = Math.min((bassSum / 86 / 255) * audioSensitivity.bassMultiplier, 1.5);
      const rawMids = Math.min((midsSum / 85 / 255) * audioSensitivity.midsMultiplier, 1.5);
      const rawHighs = Math.min((highsSum / 85 / 255) * audioSensitivity.highsMultiplier, 1.5);
      const rawBeat = Math.max(safeAudioData.beatStrength || 0, rawBass * 0.8);
      
      // ASYMMETRIC smoothing: fast attack (0.5), slow decay (0.1)
      const attackLerp = 0.5;
      const decayLerp = 0.1;
      const lerpVal = (current: number, target: number) => {
        const factor = target > current ? attackLerp : decayLerp;
        return current + (target - current) * factor;
      };
      
      smoothedBass.current = lerpVal(smoothedBass.current, rawBass);
      smoothedMids.current = lerpVal(smoothedMids.current, rawMids);
      smoothedHighs.current = lerpVal(smoothedHighs.current, rawHighs);
      smoothedBeat.current = lerpVal(smoothedBeat.current, rawBeat);
      
      const bass = smoothedBass.current;
      const mids = smoothedMids.current;
      const beat = smoothedBeat.current;
      
      // Beat pop effect - THE KEY for kicks/808s
      const beatPop = beat > 0.4 ? 1 + (beat - 0.4) * 1.0 : 1;
      
      // AUDIO-FIRST breathing - bass and beat dominate, time is subtle
      const baseBreath = 1 + Math.sin(t * 2 * animSpeed) * 0.05;
      const audioBreath = 1 + bass * 0.5;
      groupRef.current.scale.setScalar(baseBreath * audioBreath * beatPop);
      
      // AUDIO-FIRST rotation - time subtle, audio dominant
      groupRef.current.rotation.y = t * 0.1 * animSpeed + mids * Math.PI * 0.4;
      groupRef.current.rotation.x = bass * Math.PI * 0.2 + Math.sin(t * 0.5 * animSpeed) * 0.1;
    }
  });

  const smoothedValues = {
    bass: smoothedBass.current,
    mids: smoothedMids.current,
    highs: smoothedHighs.current,
    beat: smoothedBeat.current,
  };

  const accentColor = textureData?.colors?.accent || '#4a90ff';

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[2, 2, 1]} intensity={0.8} />
      <pointLight position={[-2, -2, -1]} intensity={0.5} color={accentColor} />
      <pointLight position={[0, 0, 3]} intensity={0.6} color={textureData?.colors?.primary || '#ffffff'} />
      
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
            smoothedValues={smoothedValues}
          />
        ))}
        
        {/* Floating particles */}
        <FluidParticles audioData={audioData} textureData={textureData} smoothedValues={smoothedValues} />
      </group>
    </>
  );
}
