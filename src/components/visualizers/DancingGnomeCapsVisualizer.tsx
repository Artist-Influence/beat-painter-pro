import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment, Sparkles } from "@react-three/drei";
import * as THREE from "three";
import { VisualizerProps } from ".";
import { useStudioStore } from "@/stores/studioStore";
import { useVisualizerTexture, createVisualizerMaterial } from "@/hooks/useVisualizerTexture";

function GlassShard({ index, audioData, textureData }: any) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { audioSensitivity } = useStudioStore();
  
  const primaryColor = textureData.colors.primary;

  const angle = useMemo(() => (index / 40) * Math.PI * 2, [index]);
  const radius = 0.8;

  const safeAudioData = audioData || { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 };
  const frequency = safeAudioData.frequency || Array(256).fill(0);

  // Create material with base settings - emissive updated in useFrame
  const material = useMemo(() => {
    return createVisualizerMaterial("#ffffff", textureData, {
      emissive: primaryColor,
      emissiveIntensity: 1.0,
      metalness: textureData.colors.isMetallic ? 1 : 0.5,
      roughness: textureData.colors.isMetallic ? 0.1 : 0.3,
      transparent: true,
      opacity: 0.9
    });
  }, [textureData, primaryColor]);

  useFrame(() => {
    // Calculate audio with proper Hz-to-bin mapping
    let bassSum = 0, midsSum = 0, highsSum = 0;
    for (let i = 0; i <= 2; i++) bassSum += frequency[i] || 0; // 0-250 Hz (kick/sub-bass)
    for (let i = 3; i <= 46; i++) midsSum += frequency[i] || 0; // 250-4000 Hz
    for (let i = 47; i <= 255; i++) highsSum += frequency[i] || 0; // 4000+ Hz
    
    const bass = Math.min((bassSum / 3 / 255) * audioSensitivity.bassMultiplier * 1.5, 1.5); // 1.5x boost
    const mids = Math.min((midsSum / 44 / 255) * audioSensitivity.midsMultiplier, 1.0);
    const highs = Math.min((highsSum / 209 / 255) * audioSensitivity.highsMultiplier, 1.0);
    
    // Audio threshold check - completely still when silent
    const audioThreshold = 0.02;
    const hasAudio = bass > audioThreshold || mids > audioThreshold || highs > audioThreshold;
    
    // Beat pop effect for dramatic kick response
    const beatPop = bass > 0.2 ? 1 + (bass - 0.2) * 1.2 : 1;

    if (meshRef.current) {
      // POSITION: Audio-reactive orbit with explosion effect
      if (hasAudio) {
        const x = Math.cos(angle) * radius * (1 + bass * 4.0); // Increased from 2.5
        const z = Math.sin(angle) * radius * (1 + bass * 4.0);
        const y = bass * 3.5 + highs * 1.5; // Increased from 2.0
        meshRef.current.position.set(x, y, z);
        
        // ROTATION: Faster when audio is present
        meshRef.current.rotation.x += (mids * 0.12 + bass * 0.15);
        meshRef.current.rotation.y += (mids * 0.1 + highs * 0.12);
        meshRef.current.rotation.z += (bass * 0.08 + highs * 0.1);
      } else {
        // Return to base position when silent
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        meshRef.current.position.set(x, 0, z);
      }
      
      // SCALE: Lower threshold, higher multiplier with beat pop
      const beatScale = hasAudio ? Math.min(Math.max(1 + bass * 4.5, 0.7), 3.0) * beatPop : 1; // Increased from 3.0
      meshRef.current.scale.setScalar(beatScale);
      
      if (meshRef.current.material) {
        const mat = meshRef.current.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = hasAudio ? (0.8 + highs * 5.0 + bass * 4.0) : 0.8;
        mat.opacity = 0.9 + highs * 0.1;
      }
    }
  });

  return (
    <mesh ref={meshRef} material={material}>
      <coneGeometry args={[0.08, 0.3, 6]} />
    </mesh>
  );
}

function CircumferenceCap({ index, audioData, textureData }: any) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { audioSensitivity } = useStudioStore();
  
  const accentColor = textureData.colors.accent;

  const angle = useMemo(() => (index / 20) * Math.PI * 2, [index]);
  const radius = 1.2;

  const safeAudioData = audioData || { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 };
  const frequency = safeAudioData.frequency || Array(256).fill(0);

  // Create material with base settings - updated in useFrame
  const material = useMemo(() => {
    return createVisualizerMaterial("#ffffff", textureData, {
      emissive: accentColor,
      emissiveIntensity: 1.5,
      metalness: textureData.colors.isMetallic ? 1 : 0.7,
      roughness: textureData.colors.isMetallic ? 0.05 : 0.2,
      transparent: true,
      opacity: 0.8
    });
  }, [textureData, accentColor]);

  useFrame(() => {
    // Calculate audio with proper Hz-to-bin mapping
    let bassSum = 0, midsSum = 0, highsSum = 0;
    for (let i = 0; i <= 2; i++) bassSum += frequency[i] || 0; // 0-250 Hz
    for (let i = 3; i <= 46; i++) midsSum += frequency[i] || 0; // 250-4000 Hz
    for (let i = 47; i <= 255; i++) highsSum += frequency[i] || 0; // 4000+ Hz
    
    const bass = Math.min((bassSum / 3 / 255) * audioSensitivity.bassMultiplier * 1.5, 1.5);
    const mids = Math.min((midsSum / 44 / 255) * audioSensitivity.midsMultiplier, 1.0);
    const highs = Math.min((highsSum / 209 / 255) * audioSensitivity.highsMultiplier, 1.0);
    
    // Audio threshold check - completely still when silent
    const audioThreshold = 0.02;
    const hasAudio = bass > audioThreshold || mids > audioThreshold || highs > audioThreshold;
    
    // Beat pop effect
    const beatPop = bass > 0.2 ? 1 + (bass - 0.2) * 1.2 : 1;

    if (meshRef.current) {
      // POSITION: Audio-reactive with explosion effect
      if (hasAudio) {
        const x = Math.cos(angle) * radius * (1 + bass * 3.5); // Increased from 2.0
        const z = Math.sin(angle) * radius * (1 + bass * 3.5);
        const y = bass * 2.5 + mids * 1.2; // Increased from 1.5
        meshRef.current.position.set(x, y, z);
        
        // Face towards center for cap effect
        meshRef.current.lookAt(0, y, 0);
        
        // ROTATION: Faster when audio is present
        meshRef.current.rotation.z += (bass * 0.1 + highs * 0.06);
      } else {
        // Return to base position when silent
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        meshRef.current.position.set(x, 0, z);
        meshRef.current.lookAt(0, 0, 0);
      }
      
      // SCALE: Lower threshold, higher multiplier with beat pop
      const beatScale = hasAudio ? Math.min(Math.max(1 + bass * 4.0, 0.7), 2.5) * beatPop : 1; // Increased from 2.5
      meshRef.current.scale.setScalar(beatScale);
      
      if (meshRef.current.material) {
        const mat = meshRef.current.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = hasAudio ? (0.6 + highs * 4.5 + bass * 3.5) : 0.6;
        mat.opacity = 0.8 + mids * 0.2;
      }
    }
  });

  return (
    <mesh ref={meshRef} material={material}>
      <cylinderGeometry args={[0.15, 0.05, 0.1, 8]} />
    </mesh>
  );
}

function GlassSphereVisualizer({ audioData }: any) {
  const groupRef = useRef<THREE.Group>(null);
  const centerSphereRef = useRef<THREE.Mesh>(null);
  const sparklesRef = useRef<any>(null);
  const shardCount = 40;
  const capCount = 20;
  const { audioSensitivity } = useStudioStore();
  const textureData = useVisualizerTexture();
  
  const primaryColor = textureData.colors.primary;
  const accentColor = textureData.colors.accent;

  const safeAudioData = audioData || { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 };
  const frequency = safeAudioData.frequency || Array(256).fill(0);

  // Smoothed values for Sparkles (which can't be updated per-frame)
  const smoothedBass = useRef(0);
  const smoothedHighs = useRef(0);

  // Create center sphere material - updated in useFrame
  const centerMaterial = useMemo(() => {
    return createVisualizerMaterial("#ffffff", textureData, {
      emissive: primaryColor,
      emissiveIntensity: 2.0,
      metalness: textureData.colors.isMetallic ? 1 : 0,
      roughness: textureData.colors.isMetallic ? 0.05 : 0.3,
    });
  }, [textureData, primaryColor]);

  useFrame(() => {
    // Calculate audio with proper Hz-to-bin mapping
    let bassSum = 0, midsSum = 0, highsSum = 0;
    for (let i = 0; i <= 2; i++) bassSum += frequency[i] || 0; // 0-250 Hz
    for (let i = 3; i <= 46; i++) midsSum += frequency[i] || 0; // 250-4000 Hz
    for (let i = 47; i <= 255; i++) highsSum += frequency[i] || 0; // 4000+ Hz
    
    const bass = Math.min((bassSum / 3 / 255) * audioSensitivity.bassMultiplier * 1.5, 1.5);
    const mids = Math.min((midsSum / 44 / 255) * audioSensitivity.midsMultiplier, 1.0);
    const highs = Math.min((highsSum / 209 / 255) * audioSensitivity.highsMultiplier, 1.0);
    
    // Update smoothed values for Sparkles - faster smoothing
    smoothedBass.current = smoothedBass.current * 0.85 + bass * 0.15;
    smoothedHighs.current = smoothedHighs.current * 0.85 + highs * 0.15;
    
    // Audio threshold check - completely still when silent
    const audioThreshold = 0.02;
    const hasAudio = bass > audioThreshold || mids > audioThreshold || highs > audioThreshold;
    
    // Beat pop effect
    const beatPop = bass > 0.2 ? 1 + (bass - 0.2) * 1.2 : 1;
    
    if (groupRef.current) {
      const spinSpeed = audioSensitivity.spinSpeed ?? 0;
      
      // Only rotate when spinSpeed > 0 OR audio is present
      if (spinSpeed > 0) {
        groupRef.current.rotation.y += spinSpeed * 0.05;
      }
      if (hasAudio) {
        groupRef.current.rotation.y += bass * 0.2 + mids * 0.12; // Increased from 0.15
        groupRef.current.rotation.x += bass * 0.08;
      }
      
      // POSITION: Proportional to audio
      groupRef.current.position.y = bass * 3.0; // Increased from 2.0
      
      // SCALE: Lower threshold, higher multiplier with beat pop
      const beatScale = hasAudio ? Math.min(Math.max(1 + bass * 4.0, 0.7), 2.5) * beatPop : 1; // Increased from 3.0
      groupRef.current.scale.setScalar(beatScale);
    }
    
    if (centerSphereRef.current) {
      // SCALE: Much bigger pulse with beat pop
      const spherePulse = hasAudio ? (1 + bass * 4.5 + highs * 2.5) * beatPop : 1; // Increased from 3.0
      centerSphereRef.current.scale.setScalar(spherePulse);
      
      // Update material emissive intensity
      if (centerSphereRef.current.material) {
        const mat = centerSphereRef.current.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = 2.0 + bass * 6.0;
      }
      
      // ROTATION: Faster when audio is present
      if (hasAudio) {
        centerSphereRef.current.rotation.x += bass * 0.25;
        centerSphereRef.current.rotation.y += highs * 0.2;
        centerSphereRef.current.rotation.z += mids * 0.15;
      }
    }
  });

  return (
    <group ref={groupRef}>
      {Array.from({ length: shardCount }).map((_, i) => (
        <GlassShard key={i} index={i} audioData={audioData} textureData={textureData} />
      ))}
      {Array.from({ length: capCount }).map((_, i) => (
        <CircumferenceCap key={`cap-${i}`} index={i} audioData={audioData} textureData={textureData} />
      ))}
      <mesh 
        ref={centerSphereRef}
        material={centerMaterial}
      >
        <sphereGeometry args={[0.15, 32, 32]} />
      </mesh>
      <Sparkles
        count={Math.round(8 + smoothedHighs.current * 25 + smoothedBass.current * 15)}
        scale={[1.2, 1.2, 1.2]}
        size={1.2 + smoothedHighs.current * 2.5 + smoothedBass.current * 1.5}
        speed={1.0 + smoothedHighs.current * 2.0 + smoothedBass.current * 1.5}
        opacity={0.02 + smoothedHighs.current * 0.05}
        color={accentColor}
      />
    </group>
  );
}

export default function DancingGnomeCapsVisualizer({
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
      <ambientLight intensity={0.7} />
      <directionalLight position={[4, 7, 6]} intensity={1.0} />
      <Environment preset="city" />
      <group scale={0.65}>
        <GlassSphereVisualizer audioData={audioData} />
      </group>
    </>
  );
}