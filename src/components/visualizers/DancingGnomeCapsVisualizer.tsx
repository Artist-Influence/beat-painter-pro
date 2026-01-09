import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment, Sparkles } from "@react-three/drei";
import * as THREE from "three";
import { VisualizerProps } from ".";
import { useStudioStore } from "@/stores/studioStore";
import { useVisualizerTexture, createVisualizerMaterial } from "@/hooks/useVisualizerTexture";

function GlassShard({ index, audioData, textureData, totalCount }: any) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { audioSensitivity } = useStudioStore();
  
  const primaryColor = textureData.colors.primary;

  const initialAngle = useMemo(() => (index / totalCount) * Math.PI * 2, [index, totalCount]);
  const radius = 0.8;
  
  // Store orbit angle for continuous motion
  const orbitAngle = useRef(initialAngle);

  const safeAudioData = audioData || { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 };
  const frequency = safeAudioData.frequency || Array(256).fill(0);
  
  // Pre-calculate per-shard properties
  const indexRatio = index / totalCount;
  const freqBin = Math.floor(indexRatio * 80); // Map to bins 0-79
  const orbitDirection = index % 2 === 0 ? 1 : -1; // Alternate directions
  const speedMultiplier = 0.6 + indexRatio * 0.8; // 0.6x to 1.4x speed
  const phaseOffset = indexRatio * Math.PI * 2; // Phase offset for wave motion
  
  // Smoothing refs
  const smoothedMyFreq = useRef(0);
  const smoothedBass = useRef(0);

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

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    
    // Get individual frequency bin for this shard
    const myFrequency = Math.min((frequency[freqBin] || 0) / 255, 1.0);
    
    // Calculate audio - DETECT first, then apply multipliers for EFFECT
    let bassSum = 0, midsSum = 0, highsSum = 0;
    for (let i = 0; i <= 2; i++) bassSum += frequency[i] || 0; // 0-250 Hz (kick/sub-bass)
    for (let i = 3; i <= 46; i++) midsSum += frequency[i] || 0; // 250-4000 Hz
    for (let i = 47; i <= 255; i++) highsSum += frequency[i] || 0; // 4000+ Hz
    
    // Step 1: Detect normalized audio (0-1) WITHOUT multipliers
    const detectedBass = Math.min((bassSum / 3 / 255), 1.0);
    const detectedMids = Math.min((midsSum / 44 / 255), 1.0);
    const detectedHighs = Math.min((highsSum / 209 / 255), 1.0);
    
    // Step 2: Apply multipliers for EFFECT (controls reactivity)
    const bass = detectedBass * audioSensitivity.bassMultiplier;
    const mids = detectedMids * audioSensitivity.midsMultiplier;
    const highs = detectedHighs * audioSensitivity.highsMultiplier;
    const myFreqEffect = myFrequency * audioSensitivity.bassMultiplier;
    
    // Smooth individual frequency
    const lerpVal = (current: number, target: number) => {
      const factor = target > current ? 0.85 : 0.50;
      return current + (target - current) * factor;
    };
    smoothedMyFreq.current = lerpVal(smoothedMyFreq.current, myFreqEffect);
    smoothedBass.current = lerpVal(smoothedBass.current, bass);
    
    const myFreq = smoothedMyFreq.current;
    
    // Audio threshold check - use DETECTED values so hasAudio works correctly
    const audioThreshold = 0.02;
    const hasAudio = detectedBass > audioThreshold || detectedMids > audioThreshold || detectedHighs > audioThreshold;
    
    // Beat pop effect for dramatic kick response - individual variation
    const beatPop = bass > 0.2 ? 1 + (bass - 0.2) * (1.0 + indexRatio * 0.5) : 1;

    if (meshRef.current) {
      // ORBIT: Continuous movement with individual speeds and directions
      if (hasAudio) {
        const orbitSpeed = (bass * 0.08 + myFreq * 0.12 + mids * 0.04) * speedMultiplier * orbitDirection;
        orbitAngle.current += orbitSpeed * audioSensitivity.animationSpeed;
      }
      
      // POSITION: Audio-reactive orbit with individual frequency response
      const radiusMultiplier = 1 + myFreq * 0.8 + bass * 0.6; // Individual + global spread
      const x = Math.cos(orbitAngle.current) * radius * radiusMultiplier;
      const z = Math.sin(orbitAngle.current) * radius * radiusMultiplier;
      // Phase-shifted vertical movement
      const yWave = Math.sin(time * 2.5 + phaseOffset) * myFreq * 0.4;
      const y = bass * 1.2 + myFreq * 0.6 + yWave;
      meshRef.current.position.set(x, y, z);
      
      // ROTATION: Individual directions and speeds
      if (hasAudio) {
        meshRef.current.rotation.x += (mids * 0.12 + bass * 0.15 + myFreq * 0.1) * orbitDirection;
        meshRef.current.rotation.y += (mids * 0.1 + highs * 0.12) * orbitDirection;
        meshRef.current.rotation.z += (bass * 0.08 + highs * 0.1 + myFreq * 0.08) * orbitDirection;
      }
      
      // SCALE: BASE + individual frequency response
      const baseScale = 1.0;
      const bassScaleBoost = Math.min(detectedBass * audioSensitivity.bassMultiplier * 0.15, 0.25);
      const myFreqScaleBoost = Math.min(myFrequency * audioSensitivity.bassMultiplier * 0.25, 0.35);
      const finalShardScale = Math.min(baseScale + bassScaleBoost + myFreqScaleBoost, 1.6);
      meshRef.current.scale.setScalar(finalShardScale * beatPop);
      
      if (meshRef.current.material) {
        const mat = meshRef.current.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = hasAudio ? (0.8 + myFreq * 4.0 + bass * 3.0) : 0.8;
        mat.opacity = 0.9 + myFreq * 0.1;
      }
    }
  });

  return (
    <mesh ref={meshRef} material={material}>
      <coneGeometry args={[0.08, 0.3, 6]} />
    </mesh>
  );
}

function CircumferenceCap({ index, audioData, textureData, totalCount }: any) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { audioSensitivity } = useStudioStore();
  
  const accentColor = textureData.colors.accent;

  const initialAngle = useMemo(() => (index / totalCount) * Math.PI * 2, [index, totalCount]);
  const radius = 1.2;
  
  // Store orbit angle for continuous motion
  const orbitAngle = useRef(initialAngle);

  const safeAudioData = audioData || { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 };
  const frequency = safeAudioData.frequency || Array(256).fill(0);
  
  // Pre-calculate per-cap properties - caps use higher frequency bins (mids/highs range)
  const indexRatio = index / totalCount;
  const freqBin = Math.floor(indexRatio * 40) + 40; // Map to bins 40-79 (different from shards)
  const orbitDirection = index % 3 === 0 ? -1 : 1; // Every 3rd cap goes opposite
  const speedMultiplier = 0.5 + indexRatio * 1.0; // 0.5x to 1.5x speed (different range from shards)
  const phaseOffset = (indexRatio * Math.PI * 2) + Math.PI / 3; // Different phase from shards
  
  // Smoothing refs
  const smoothedMyFreq = useRef(0);
  const smoothedBass = useRef(0);

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

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    
    // Get individual frequency bin for this cap
    const myFrequency = Math.min((frequency[freqBin] || 0) / 255, 1.0);
    
    // Calculate audio - DETECT first, then apply multipliers for EFFECT
    let bassSum = 0, midsSum = 0, highsSum = 0;
    for (let i = 0; i <= 2; i++) bassSum += frequency[i] || 0; // 0-250 Hz
    for (let i = 3; i <= 46; i++) midsSum += frequency[i] || 0; // 250-4000 Hz
    for (let i = 47; i <= 255; i++) highsSum += frequency[i] || 0; // 4000+ Hz
    
    // Step 1: Detect normalized audio (0-1) WITHOUT multipliers
    const detectedBass = Math.min((bassSum / 3 / 255), 1.0);
    const detectedMids = Math.min((midsSum / 44 / 255), 1.0);
    const detectedHighs = Math.min((highsSum / 209 / 255), 1.0);
    
    // Step 2: Apply multipliers for EFFECT (controls reactivity)
    const bass = detectedBass * audioSensitivity.bassMultiplier;
    const mids = detectedMids * audioSensitivity.midsMultiplier;
    const highs = detectedHighs * audioSensitivity.highsMultiplier;
    const myFreqEffect = myFrequency * audioSensitivity.midsMultiplier; // Caps respond more to mids
    
    // Smooth individual frequency
    const lerpVal = (current: number, target: number) => {
      const factor = target > current ? 0.85 : 0.50;
      return current + (target - current) * factor;
    };
    smoothedMyFreq.current = lerpVal(smoothedMyFreq.current, myFreqEffect);
    smoothedBass.current = lerpVal(smoothedBass.current, bass);
    
    const myFreq = smoothedMyFreq.current;
    
    // Audio threshold check - use DETECTED values
    const audioThreshold = 0.02;
    const hasAudio = detectedBass > audioThreshold || detectedMids > audioThreshold || detectedHighs > audioThreshold;
    
    // Beat pop effect - caps have different intensity
    const beatPop = bass > 0.2 ? 1 + (bass - 0.2) * (0.8 + indexRatio * 0.6) : 1;

    if (meshRef.current) {
      // ORBIT: Continuous movement with individual speeds and directions
      if (hasAudio) {
        const orbitSpeed = (mids * 0.1 + myFreq * 0.15 + bass * 0.05) * speedMultiplier * orbitDirection;
        orbitAngle.current += orbitSpeed * audioSensitivity.animationSpeed;
      }
      
      // POSITION: Audio-reactive with individual frequency response
      const radiusMultiplier = 1 + myFreq * 1.0 + bass * 0.5; // Caps expand more on their frequency
      const x = Math.cos(orbitAngle.current) * radius * radiusMultiplier;
      const z = Math.sin(orbitAngle.current) * radius * radiusMultiplier;
      // Phase-shifted vertical movement (different timing from shards)
      const yWave = Math.sin(time * 3.0 + phaseOffset) * myFreq * 0.35;
      const y = bass * 1.0 + myFreq * 0.5 + yWave;
      meshRef.current.position.set(x, y, z);
      
      // Face towards center for cap effect
      meshRef.current.lookAt(0, y, 0);
      
      // ROTATION: Individual z-spin
      if (hasAudio) {
        meshRef.current.rotation.z += (bass * 0.1 + highs * 0.08 + myFreq * 0.12) * orbitDirection;
      }
      
      // SCALE: BASE + individual frequency response
      const capBase = 1.0;
      const capBassBoost = Math.min(detectedBass * audioSensitivity.bassMultiplier * 0.15, 0.25);
      const capMyFreqBoost = Math.min(myFrequency * audioSensitivity.midsMultiplier * 0.25, 0.35);
      const finalCapScale = Math.min(capBase + capBassBoost + capMyFreqBoost, 1.6);
      meshRef.current.scale.setScalar(finalCapScale * beatPop);
      
      if (meshRef.current.material) {
        const mat = meshRef.current.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = hasAudio ? (0.6 + myFreq * 4.0 + bass * 3.0) : 0.6;
        mat.opacity = 0.8 + myFreq * 0.2;
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
    // Calculate audio - DETECT first, then apply multipliers for EFFECT
    let bassSum = 0, midsSum = 0, highsSum = 0;
    for (let i = 0; i <= 2; i++) bassSum += frequency[i] || 0; // 0-250 Hz
    for (let i = 3; i <= 46; i++) midsSum += frequency[i] || 0; // 250-4000 Hz
    for (let i = 47; i <= 255; i++) highsSum += frequency[i] || 0; // 4000+ Hz
    
    // Step 1: Detect normalized audio (0-1) WITHOUT multipliers
    const detectedBass = Math.min((bassSum / 3 / 255), 1.0);
    const detectedMids = Math.min((midsSum / 44 / 255), 1.0);
    const detectedHighs = Math.min((highsSum / 209 / 255), 1.0);
    
    // Step 2: Apply multipliers for EFFECT (controls reactivity)
    const bass = detectedBass * audioSensitivity.bassMultiplier;
    const mids = detectedMids * audioSensitivity.midsMultiplier;
    const highs = detectedHighs * audioSensitivity.highsMultiplier;
    
    // Update smoothed values for Sparkles
    smoothedBass.current = smoothedBass.current * 0.85 + bass * 0.15;
    smoothedHighs.current = smoothedHighs.current * 0.85 + highs * 0.15;
    
    // Audio threshold check - use DETECTED values
    const audioThreshold = 0.02;
    const hasAudio = detectedBass > audioThreshold || detectedMids > audioThreshold || detectedHighs > audioThreshold;
    
    // Beat pop effect
    const beatPop = bass > 0.2 ? 1 + (bass - 0.2) * 1.2 : 1;
    
    if (groupRef.current) {
      const spinSpeed = audioSensitivity.spinSpeed ?? 0;
      
      // Only rotate when spinSpeed > 0 OR audio is present
      if (spinSpeed > 0) {
        groupRef.current.rotation.y += spinSpeed * 0.05;
      }
      if (hasAudio) {
        groupRef.current.rotation.y += bass * 0.2 + mids * 0.12;
        groupRef.current.rotation.x += bass * 0.08;
      }
      
      // POSITION: Proportional to audio
      groupRef.current.position.y = bass * 3.0;
      
      // SCALE: BASE + TIGHTLY CLAMPED reactivity
      const groupBase = 1.0;
      const groupBassBoost = Math.min(detectedBass * audioSensitivity.bassMultiplier * 0.15, 0.25);
      const finalGroupScale = Math.min(groupBase + groupBassBoost, 1.3);
      groupRef.current.scale.setScalar(finalGroupScale * beatPop);
    }
    
    if (centerSphereRef.current) {
      // SCALE: BASE + TIGHTLY CLAMPED reactivity
      const sphereBase = 1.0;
      const sphereBassBoost = Math.min(detectedBass * audioSensitivity.bassMultiplier * 0.2, 0.35);
      const sphereHighsBoost = Math.min(detectedHighs * audioSensitivity.highsMultiplier * 0.1, 0.15);
      const finalSphereScale = Math.min(sphereBase + sphereBassBoost + sphereHighsBoost, 1.5);
      centerSphereRef.current.scale.setScalar(finalSphereScale * beatPop);
      
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
        <GlassShard key={i} index={i} audioData={audioData} textureData={textureData} totalCount={shardCount} />
      ))}
      {Array.from({ length: capCount }).map((_, i) => (
        <CircumferenceCap key={`cap-${i}`} index={i} audioData={audioData} textureData={textureData} totalCount={capCount} />
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
      <group scale={0.4}>
        <GlassSphereVisualizer audioData={audioData} />
      </group>
    </>
  );
}
