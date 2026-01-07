import React, { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";
import { VisualizerProps } from "../visualizer";
import { useVisualizerTexture, createVisualizerMaterial } from "@/hooks/useVisualizerTexture";
import { useStudioStore } from "@/stores/studioStore";

function FlowerOfLife({ audioData, textureData }) {
  const groupRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>();
  const { audioSensitivity } = useStudioStore();
  
  const safeAudioData = audioData || { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 };
  const frequency = safeAudioData.frequency || Array(256).fill(0);
  const beatStrength = safeAudioData.beatStrength || 0;
  
  // Smoothing refs
  const smoothedBass = useRef(0);
  const smoothedMids = useRef(0);
  const smoothedBeat = useRef(0);
  
  // Base rotation for position-based rotation
  const baseRotation = useRef(0);
  
  useFrame(({ clock }) => {
    if (groupRef.current) {
      const t = clock.getElapsedTime();
      const animSpeed = audioSensitivity.animationSpeed;
      
      // Calculate audio per-frame
      let bassSum = 0, midsSum = 0;
      for (let i = 0; i <= 85; i++) bassSum += frequency[i] || 0;
      for (let i = 86; i <= 170; i++) midsSum += frequency[i] || 0;
      
      const rawBass = Math.min((bassSum / 86 / 255) * audioSensitivity.bassMultiplier, 1.5);
      const rawMids = Math.min((midsSum / 85 / 255) * audioSensitivity.midsMultiplier, 1.5);
      const rawBeat = Math.max(beatStrength, rawBass * 0.8);
      
      // ASYMMETRIC smoothing
      const attackLerp = 0.5;
      const decayLerp = 0.1;
      const lerpVal = (current: number, target: number) => {
        const factor = target > current ? attackLerp : decayLerp;
        return current + (target - current) * factor;
      };
      
      smoothedBass.current = lerpVal(smoothedBass.current, rawBass);
      smoothedMids.current = lerpVal(smoothedMids.current, rawMids);
      smoothedBeat.current = lerpVal(smoothedBeat.current, rawBeat);
      
      const bass = smoothedBass.current;
      const mids = smoothedMids.current;
      const beat = smoothedBeat.current;
      
      // Audio threshold check - completely still when silent
      const audioThreshold = 0.02;
      const hasAudio = bass > audioThreshold || mids > audioThreshold;
      
      // Beat pop
      const beatPop = beat > 0.4 ? 1 + (beat - 0.4) * 1.0 : 1;
      
      // Base rotation advances slowly
      baseRotation.current += 0.002 * animSpeed;
      
      // Audio offset for rotation
      const audioOffset = hasAudio ? (bass * 0.15 + mids * 0.08) * Math.PI : 0;
      groupRef.current.rotation.z = baseRotation.current + audioOffset;
      
      // SCALE: Returns to default when silent
      const breathe = hasAudio ? (1 + bass * 0.5 + mids * 0.2) * beatPop : 1;
      groupRef.current.scale.setScalar(breathe);
      
      // POSITION: Proportional to audio (returns to 0 when silent)
      groupRef.current.position.y = bass * 0.3;
      groupRef.current.position.x = mids * 0.15;
    }
    
    // Emissive intensity driven by beat
    if (materialRef.current) {
      materialRef.current.emissiveIntensity = 1.0 + smoothedBass.current * 3.0 + smoothedBeat.current * 2.0;
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
  const { audioSensitivity } = useStudioStore();
  
  const safeAudioData = audioData || { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 };
  const frequency = safeAudioData.frequency || Array(256).fill(0);
  const beatStrength = safeAudioData.beatStrength || 0;
  
  // Smoothing refs
  const smoothedHighs = useRef(0);
  const smoothedBeat = useRef(0);
  
  // Base rotation for position-based rotation
  const metatronBaseRotation = useRef({ x: 0, y: 0, z: 0 });
  
  useFrame(({ clock }) => {
    if (meshRef.current) {
      const t = clock.getElapsedTime();
      const animSpeed = audioSensitivity.animationSpeed;
      
      // Calculate audio per-frame
      let highsSum = 0;
      for (let i = 171; i <= 255; i++) highsSum += frequency[i] || 0;
      
      const rawHighs = Math.min((highsSum / 85 / 255) * audioSensitivity.highsMultiplier, 1.5);
      const rawBeat = Math.max(beatStrength, rawHighs * 0.5);
      
      // ASYMMETRIC smoothing
      const attackLerp = 0.5;
      const decayLerp = 0.1;
      const lerpVal = (current: number, target: number) => {
        const factor = target > current ? attackLerp : decayLerp;
        return current + (target - current) * factor;
      };
      
      smoothedHighs.current = lerpVal(smoothedHighs.current, rawHighs);
      smoothedBeat.current = lerpVal(smoothedBeat.current, rawBeat);
      
      const highs = smoothedHighs.current;
      const beat = smoothedBeat.current;
      
      // Audio threshold check - completely still when silent
      const audioThreshold = 0.02;
      const hasAudio = highs > audioThreshold;
      
      // Beat pop
      const beatPop = beat > 0.4 ? 1 + (beat - 0.4) * 0.8 : 1;
      
      // Base rotation advances slowly
      metatronBaseRotation.current.x += 0.002 * animSpeed;
      metatronBaseRotation.current.y += 0.0025 * animSpeed;
      metatronBaseRotation.current.z += 0.0015 * animSpeed;
      
      // Audio offset for rotation
      const offsetX = hasAudio ? highs * Math.PI * 0.2 : 0;
      const offsetY = hasAudio ? highs * Math.PI * 0.25 : 0;
      const offsetZ = hasAudio ? highs * Math.PI * 0.12 : 0;
      
      meshRef.current.rotation.x = metatronBaseRotation.current.x + offsetX;
      meshRef.current.rotation.y = metatronBaseRotation.current.y + offsetY;
      meshRef.current.rotation.z = metatronBaseRotation.current.z + offsetZ;
      
      // SCALE: Returns to default when silent
      const expand = hasAudio ? (1 + highs * 0.8) * beatPop : 1;
      meshRef.current.scale.setScalar(expand);
      
      // POSITION: Proportional to audio (returns to 0 when silent)
      meshRef.current.position.x = highs * 0.25;
      meshRef.current.position.y = highs * 0.15;
    }
    
    // Emissive driven by highs and beat
    if (materialRef.current) {
      materialRef.current.emissiveIntensity = 1.2 + smoothedHighs.current * 4.0 + smoothedBeat.current * 2.0;
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
  const { audioSensitivity } = useStudioStore();
  
  const safeAudioData = audioData || { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 };
  const frequency = safeAudioData.frequency || Array(256).fill(0);
  const beatStrength = safeAudioData.beatStrength || 0;
  
  // Smoothing refs
  const smoothedBass = useRef(0);
  const smoothedBeat = useRef(0);
  
  // Base rotation for position-based rotation
  const containerBaseRotation = useRef(0);
  
  useFrame(({ clock }) => {
    if (containerRef.current) {
      const t = clock.getElapsedTime();
      const animSpeed = audioSensitivity.animationSpeed;
      
      // Calculate audio per-frame
      let bassSum = 0;
      for (let i = 0; i <= 85; i++) bassSum += frequency[i] || 0;
      
      const rawBass = Math.min((bassSum / 86 / 255) * audioSensitivity.bassMultiplier, 1.5);
      const rawBeat = Math.max(beatStrength, rawBass * 0.8);
      
      // ASYMMETRIC smoothing
      const attackLerp = 0.5;
      const decayLerp = 0.1;
      const lerpVal = (current: number, target: number) => {
        const factor = target > current ? attackLerp : decayLerp;
        return current + (target - current) * factor;
      };
      
      smoothedBass.current = lerpVal(smoothedBass.current, rawBass);
      smoothedBeat.current = lerpVal(smoothedBeat.current, rawBeat);
      
      const bass = smoothedBass.current;
      const beat = smoothedBeat.current;
      
      // Audio threshold check - completely still when silent
      const audioThreshold = 0.02;
      const hasAudio = bass > audioThreshold;
      
      // Beat pop
      const beatPop = beat > 0.4 ? 1 + (beat - 0.4) * 0.8 : 1;
      
      // Base rotation advances slowly
      containerBaseRotation.current += 0.002 * animSpeed;
      
      // Audio offset for rotation
      const audioOffset = hasAudio ? bass * Math.PI * 0.1 : 0;
      containerRef.current.rotation.z = containerBaseRotation.current + audioOffset;
      
      // SCALE: Returns to default when silent
      const breathe = hasAudio ? (1 + bass * 0.4) * beatPop : 1;
      containerRef.current.scale.setScalar(breathe);
      
      // POSITION: Proportional to audio (returns to 0 when silent)
      containerRef.current.position.y = bass * 0.2;
    }
  });

  // Material for particles - use createVisualizerMaterial for visual style support
  const particleMaterial = useMemo(() => {
    return createVisualizerMaterial(
      textureData.colors?.primary || '#ffd700',
      textureData,
      {
        emissiveIntensity: 1.5,
        metalness: 0.7,
        roughness: 0.2,
      }
    );
  }, [textureData.textureVersion, textureData.colors?.primary, textureData.texture]);
  
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