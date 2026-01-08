import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment, Sparkles } from "@react-three/drei";
import * as THREE from "three";
import { VisualizerProps } from ".";
import { useStudioStore } from "@/stores/studioStore";

function OrbitingCube({ angle, radius, audioData, index }: any) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { audioSensitivity } = useStudioStore();
  
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

  const safeAudioData = audioData || { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 };
  const frequency = safeAudioData.frequency || Array(256).fill(0);

  // Smoothing refs
  const smoothedBass = useRef(0);
  const smoothedMids = useRef(0);
  const smoothedHighs = useRef(0);
  // Store current orbit angle
  const orbitAngle = useRef(angle);

  useFrame(() => {
    // Calculate audio per-frame - DETECT first, then apply multipliers for EFFECT
    let bassSum = 0, midsSum = 0, highsSum = 0;
    for (let i = 0; i <= 2; i++) bassSum += frequency[i] || 0; // 0-250 Hz (kick/sub-bass)
    for (let i = 3; i <= 46; i++) midsSum += frequency[i] || 0; // 250-4000 Hz
    for (let i = 47; i <= 255; i++) highsSum += frequency[i] || 0; // 4000+ Hz
    
    // Step 1: Detect normalized audio (0-1) WITHOUT multipliers
    const detectedBass = Math.min((bassSum / 3 / 255), 1.0);
    const detectedMids = Math.min((midsSum / 44 / 255), 1.0);
    const detectedHighs = Math.min((highsSum / 209 / 255), 1.0);
    
    // Step 2: Apply multipliers for EFFECT (controls reactivity, not detection)
    const bassEffect = detectedBass * audioSensitivity.bassMultiplier;
    const midsEffect = detectedMids * audioSensitivity.midsMultiplier;
    const highsEffect = detectedHighs * audioSensitivity.highsMultiplier;
    
    // Faster asymmetric smoothing for 170+ BPM support
    const lerpVal = (current: number, target: number) => {
      const factor = target > current ? 0.85 : 0.50; // Near-instant attack, fast decay
      return current + (target - current) * factor;
    };
    
    smoothedBass.current = lerpVal(smoothedBass.current, bassEffect);
    smoothedMids.current = lerpVal(smoothedMids.current, midsEffect);
    smoothedHighs.current = lerpVal(smoothedHighs.current, highsEffect);
    
    const bass = smoothedBass.current;
    const mids = smoothedMids.current;
    const highs = smoothedHighs.current;
    
    // Audio threshold check - use DETECTED values so hasAudio works correctly
    const audioThreshold = 0.02;
    const hasAudio = detectedBass > audioThreshold || detectedMids > audioThreshold || detectedHighs > audioThreshold;
    
    // Beat pop effect for dramatic kick response
    const beatPop = bass > 0.2 ? 1 + (bass - 0.2) * 1.2 : 1;
    
    if (meshRef.current) {
      // Orbit movement ONLY when audio is present - faster orbit speed
      if (hasAudio) {
        const orbitSpeed = bass * 0.12 + mids * 0.04; // Increased from 0.08/0.03
        orbitAngle.current += orbitSpeed * audioSensitivity.animationSpeed;
      }
      
      // Position based on current orbit angle and audio spread - explosion effect on beat
      const spread = 1 + bass * 2.5; // Increased from 1.5
      const x = Math.cos(orbitAngle.current) * radius * spread;
      const z = Math.sin(orbitAngle.current) * radius * spread;
      const y = bass * 3.5 + highs * 0.6; // Increased bounce from 2.0
      meshRef.current.position.set(x, y, z);
      
      // Rotation ONLY when audio is present - faster rotation
      if (hasAudio) {
        meshRef.current.rotation.x += bass * 0.2; // Increased from 0.15
        meshRef.current.rotation.y += bass * 0.15 + mids * 0.08;
        meshRef.current.rotation.z += bass * 0.15 + highs * 0.06;
      }
      
      // Scale reacts to audio with beat pop - lower threshold, bigger multiplier
      const beatScale = bass > 0.2 ? 1 + bass * 3.5 : 1; // Threshold 0.2, multiplier 3.5
      const midsScale = mids > 0.15 ? 1 + mids * 1.0 : 1;
      meshRef.current.scale.setScalar(beatScale * midsScale * beatPop);
    }
  });

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[0.05, 0.05, 0.05]} />
        <meshStandardMaterial
          color={primaryColor}
          metalness={extractedColors?.isMetallic ? 1 : 0.3}
          roughness={extractedColors?.isMetallic ? 0.2 : 0.7}
          emissive={extractedColors?.isNeon ? primaryColor : '#000000'}
          emissiveIntensity={extractedColors?.isNeon ? 1.2 : 0.6}
          map={texture || undefined}
        />
    </mesh>
  );
}

function OrbitingCubesVisualizer({ audioData }: any) {
  const groupRef = useRef<THREE.Group>(null);
  const centerSphereRef = useRef<THREE.Mesh>(null);
  const cubeCount = 40;
  const angles = useMemo(() => Array.from({ length: cubeCount }, (_, i) => (i / cubeCount) * Math.PI * 2), []);
  const { audioSensitivity } = useStudioStore();

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
  const accentColor = extractedColors?.accent || '#ffffff';

  const safeAudioData = audioData || { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 };
  const frequency = safeAudioData.frequency || Array(256).fill(0);

  // Smoothing refs
  const smoothedBass = useRef(0);
  const smoothedHighs = useRef(0);

  useFrame(() => {
    // Calculate audio per-frame - DETECT first, then apply multipliers for EFFECT
    let bassSum = 0, highsSum = 0;
    for (let i = 0; i <= 2; i++) bassSum += frequency[i] || 0; // 0-250 Hz (kick/sub-bass)
    for (let i = 47; i <= 255; i++) highsSum += frequency[i] || 0; // 4000+ Hz
    
    // Step 1: Detect normalized audio (0-1) WITHOUT multipliers
    const detectedBass = Math.min((bassSum / 3 / 255), 1.0);
    const detectedHighs = Math.min((highsSum / 209 / 255), 1.0);
    
    // Step 2: Apply multipliers for EFFECT
    const bassEffect = detectedBass * audioSensitivity.bassMultiplier;
    const highsEffect = detectedHighs * audioSensitivity.highsMultiplier;
    
    // Faster asymmetric smoothing
    const lerpVal = (current: number, target: number) => {
      const factor = target > current ? 0.85 : 0.50;
      return current + (target - current) * factor;
    };
    
    smoothedBass.current = lerpVal(smoothedBass.current, bassEffect);
    smoothedHighs.current = lerpVal(smoothedHighs.current, highsEffect);
    
    const bass = smoothedBass.current;
    const highs = smoothedHighs.current;
    
    // Audio threshold check - use DETECTED values
    const audioThreshold = 0.02;
    const hasAudio = detectedBass > audioThreshold || detectedHighs > audioThreshold;
    
    // Beat pop effect
    const beatPop = bass > 0.2 ? 1 + (bass - 0.2) * 1.2 : 1;
    
    if (groupRef.current) {
      const spinSpeed = audioSensitivity.spinSpeed ?? 0;
      
      // Only rotate when spinSpeed > 0 OR audio is present
      if (spinSpeed > 0) {
        groupRef.current.rotation.y += spinSpeed * 0.05;
      }
      if (hasAudio) {
        groupRef.current.rotation.y += bass * 0.15; // Increased from 0.1
        groupRef.current.rotation.x += bass * 0.1; // Increased from 0.06
      }
      
      // Position proportional to audio (returns to 0 when silent)
      groupRef.current.position.y = bass * 1.5; // Increased from 1.0
      
      // Scale reacts to audio with beat pop - lower threshold, bigger multiplier
      const beatScale = bass > 0.2 ? 1 + bass * 2.5 : 1; // Threshold 0.2, multiplier 2.5
      groupRef.current.scale.setScalar(beatScale * beatPop);
    }
    
    if (centerSphereRef.current) {
      // Scale reacts to audio - much bigger pulse
      const spherePulse = 1 + bass * 3.5 + highs * 0.8; // Increased from 2.0
      centerSphereRef.current.scale.setScalar(spherePulse * beatPop);
      
      // Rotation ONLY when audio is present - faster
      if (hasAudio) {
        centerSphereRef.current.rotation.x += bass * 0.2; // Increased from 0.15
        centerSphereRef.current.rotation.y += bass * 0.18 + highs * 0.08;
      }
    }
  });

  return (
    <group ref={groupRef}>
      {angles.map((angle, i) => (
        <OrbitingCube
          key={i}
          angle={angle}
          radius={1.0}
          audioData={audioData}
          index={i}
        />
      ))}
      <mesh ref={centerSphereRef}>
        <sphereGeometry args={[0.1, 32, 32]} />
        <meshStandardMaterial 
          color="#ffffff"
          emissive={primaryColor}
          emissiveIntensity={6.0 + smoothedBass.current * 8.0}
          metalness={extractedColors?.isMetallic ? 1 : 0}
          roughness={extractedColors?.isMetallic ? 0.05 : 0.3}
          map={texture || undefined}
          emissiveMap={texture || undefined}
        />
      </mesh>
      <Sparkles
        count={(smoothedHighs.current > 0.02 || smoothedBass.current > 0.02) ? Math.round(5 + smoothedHighs.current * 15 + smoothedBass.current * 10) : 0}
        scale={[0.8, 0.8, 0.8]}
        size={0.8 + smoothedHighs.current * 1.5 + smoothedBass.current * 1}
        speed={(smoothedHighs.current > 0.02 || smoothedBass.current > 0.02) ? (0.6 + smoothedHighs.current * 1.2 + smoothedBass.current * 1) : 0}
        opacity={0.015 + smoothedHighs.current * 0.035}
        color={accentColor}
      />
    </group>
  );
}

export default function CubicCloudsVisualizer({
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
      <group scale={1.0}>
        <OrbitingCubesVisualizer audioData={audioData} />
      </group>
    </>
  );
}
