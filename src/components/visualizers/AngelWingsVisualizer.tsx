import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment, Sparkles } from "@react-three/drei";
import * as THREE from "three";
import { VisualizerProps } from ".";
import { useStudioStore } from "@/stores/studioStore";

function Feather({ index, side, audioData, totalFeathers }: any) {
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
  
  // More feathers with varying sizes for density
  const angle = (index / totalFeathers) * Math.PI * 0.9;
  const length = 0.25 + index * 0.035;
  const geometry = useMemo(() => new THREE.CapsuleGeometry(0.012, length, 4, 8), [length]);

  const safeAudioData = audioData || { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 };
  const frequency = safeAudioData.frequency || Array(256).fill(0);

  // Smoothing refs
  const smoothedMids = useRef(0);
  const smoothedBass = useRef(0);
  // Phase for organic ripple motion
  const phaseRef = useRef(Math.random() * Math.PI * 2);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const animSpeed = audioSensitivity.animationSpeed;
    const spinSpeed = audioSensitivity.spinSpeed ?? 0;
    
    // Calculate audio per-frame with sensitivity multipliers
    let midsSum = 0, bassSum = 0;
    for (let i = 86; i <= 170; i++) midsSum += frequency[i] || 0;
    for (let i = 0; i <= 85; i++) bassSum += frequency[i] || 0;
    
    const rawMids = Math.min((midsSum / 85 / 255) * audioSensitivity.midsMultiplier, 1.5);
    const rawBass = Math.min((bassSum / 86 / 255) * audioSensitivity.bassMultiplier, 1.5);
    
    // Asymmetric smoothing - fast attack for snappy response
    const lerpVal = (current: number, target: number) => {
      const factor = target > current ? 0.65 : 0.25;
      return current + (target - current) * factor;
    };
    
    smoothedMids.current = lerpVal(smoothedMids.current, rawMids);
    smoothedBass.current = lerpVal(smoothedBass.current, rawBass);
    
    const mids = smoothedMids.current * 0.5 + rawMids * 0.5;
    const bass = smoothedBass.current * 0.5 + rawBass * 0.5;
    
    // Audio threshold check
    const audioThreshold = 0.02;
    const hasAudio = bass > audioThreshold || mids > audioThreshold;
    const shouldAnimate = spinSpeed > 0 || hasAudio;
    
    if (meshRef.current) {
      // Cascading ripple effect - feathers at different positions move at different phases
      const rippleDelay = index * 0.15;
      
      if (shouldAnimate) {
        // Organic breathing + audio-reactive motion
      const breathe = Math.sin(t * 0.8 + rippleDelay) * 0.15;
      const ripple = hasAudio ? Math.sin(t * 1.5 + rippleDelay) * bass * 0.4 : 0;
        
        // Y rotation with organic wave
        meshRef.current.rotation.y += (spinSpeed * 0.02 + (hasAudio ? bass * 0.08 : 0)) * animSpeed;
        meshRef.current.rotation.z = breathe + ripple + (hasAudio ? bass * 0.5 + mids * 0.3 : 0);
        meshRef.current.rotation.x = Math.sin(t * 0.6 + rippleDelay * 0.5) * 0.1 * (hasAudio ? (1 + bass) : 0.3);
      }
      
      // Beat-reactive scale - more dramatic response
      const beatScale = hasAudio ? 1 + bass * 1.2 + mids * 0.5 : 1;
      meshRef.current.scale.setScalar(beatScale);
      
      // Position offset for more dramatic movement
      meshRef.current.position.y = hasAudio ? bass * 0.2 : 0;
      meshRef.current.position.z = hasAudio ? mids * 0.15 : 0;
    }
  });

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      position={[side * (0.08 + index * 0.03), 0.4 - index * 0.04, 0]}
      rotation={[0, 0, angle * side]}
    >
      <meshStandardMaterial
        color={primaryColor}
        roughness={extractedColors?.isMetallic ? 0.05 : 0.3}
        metalness={extractedColors?.isMetallic ? 1 : 0.2}
        transparent
        opacity={0.9 + smoothedMids.current * 0.5}
        side={THREE.DoubleSide}
        map={texture || undefined}
        emissive={extractedColors?.isNeon ? primaryColor : '#000000'}
        emissiveIntensity={extractedColors?.isNeon ? 0.3 : 0}
      />
    </mesh>
  );
}

function Wing({ side, audioData }: any) {
  const groupRef = useRef<THREE.Group>(null);
  const featherCount = 28; // More feathers for density
  const featherIndices = Array.from({ length: featherCount }, (_, i) => i);
  const { audioSensitivity } = useStudioStore();

  const safeAudioData = audioData || { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 };
  const frequency = safeAudioData.frequency || Array(256).fill(0);

  // Smoothing refs
  const smoothedBass = useRef(0);
  const smoothedMids = useRef(0);
  // Base rotation ref
  const baseRotation = useRef(0);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const animSpeed = audioSensitivity.animationSpeed;
    const spinSpeed = audioSensitivity.spinSpeed ?? 0;
    
    // Calculate audio per-frame with sensitivity multipliers
    let bassSum = 0, midsSum = 0;
    for (let i = 0; i <= 85; i++) bassSum += frequency[i] || 0;
    for (let i = 86; i <= 170; i++) midsSum += frequency[i] || 0;
    
    const rawBass = Math.min((bassSum / 86 / 255) * audioSensitivity.bassMultiplier, 1.5);
    const rawMids = Math.min((midsSum / 85 / 255) * audioSensitivity.midsMultiplier, 1.5);
    
    // Asymmetric smoothing - fast attack
    const lerpVal = (current: number, target: number) => {
      const factor = target > current ? 0.65 : 0.25;
      return current + (target - current) * factor;
    };
    
    smoothedBass.current = lerpVal(smoothedBass.current, rawBass);
    smoothedMids.current = lerpVal(smoothedMids.current, rawMids);
    
    const bass = smoothedBass.current * 0.5 + rawBass * 0.5;
    const mids = smoothedMids.current * 0.5 + rawMids * 0.5;
    
    // Audio threshold check
    const audioThreshold = 0.02;
    const hasAudio = bass > audioThreshold || mids > audioThreshold;
    const shouldAnimate = spinSpeed > 0 || hasAudio;
    
    if (groupRef.current) {
      // More fluid, organic flapping with breathing
      const breatheAmplitude = 0.15;
      const breathe = Math.sin(t * 0.6) * breatheAmplitude;
      
      // Audio-reactive flap - dramatic on bass hits
      const flapAmplitude = hasAudio ? 0.3 + bass * 1.0 : breatheAmplitude;
      const flapFrequency = hasAudio ? 1.2 + bass * 1.5 : 0.8;
      const flapAngle = Math.sin(t * flapFrequency) * flapAmplitude;
      
      groupRef.current.rotation.z = side * (shouldAnimate ? flapAngle : breathe * 0.5);
      groupRef.current.rotation.x = (shouldAnimate ? Math.sin(t * 0.8) * 0.15 : 0) * animSpeed + (hasAudio ? bass * 0.4 : 0);
      
      // Only add Y rotation with spinSpeed
      if (spinSpeed > 0) {
        baseRotation.current += spinSpeed * 0.02;
        groupRef.current.rotation.y = baseRotation.current;
      }
      
      // Scale response - organic breathing + audio
      const wingScale = hasAudio ? 1 + bass * 1.8 + mids * 0.6 : 1 + Math.sin(t * 0.5) * 0.05;
      groupRef.current.scale.setScalar(wingScale);
      
      // Position bob - gentle breathing motion + audio
      groupRef.current.position.y = 0.4 + (hasAudio ? bass * 0.8 + mids * 0.3 : Math.sin(t * 0.6) * 0.05);
    }
  });

  return (
    <group ref={groupRef} position={[side * 0.12, 0.4, 0]}>
      {featherIndices.map((i) => (
        <Feather key={i} index={i} side={side} audioData={audioData} totalFeathers={featherCount} />
      ))}
    </group>
  );
}

function HologramWings({ audioData }: any) {
  const groupRef = useRef<THREE.Group>(null);
  const { audioSensitivity } = useStudioStore();
  
  const extractedColors = (window as any).extractedColors;
  const accentColor = extractedColors?.accent || '#ffffff';
  
  const safeAudioData = audioData || { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 };
  const frequency = safeAudioData.frequency || Array(256).fill(0);

  // Smoothing refs
  const smoothedHighs = useRef(0);
  const smoothedBass = useRef(0);
  // Base rotation ref
  const baseRotation = useRef({ x: 0, y: 0 });

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const animSpeed = audioSensitivity.animationSpeed;
    const spinSpeed = audioSensitivity.spinSpeed ?? 0;
    
    // Calculate audio per-frame with sensitivity multipliers
    let highsSum = 0, bassSum = 0;
    for (let i = 171; i <= 255; i++) highsSum += frequency[i] || 0;
    for (let i = 0; i <= 85; i++) bassSum += frequency[i] || 0;
    
    const rawHighs = Math.min((highsSum / 85 / 255) * audioSensitivity.highsMultiplier, 1.5);
    const rawBass = Math.min((bassSum / 86 / 255) * audioSensitivity.bassMultiplier, 1.5);
    
    // Asymmetric smoothing - fast attack
    const lerpVal = (current: number, target: number) => {
      const factor = target > current ? 0.65 : 0.25;
      return current + (target - current) * factor;
    };
    
    smoothedHighs.current = lerpVal(smoothedHighs.current, rawHighs);
    smoothedBass.current = lerpVal(smoothedBass.current, rawBass);
    
    const highs = smoothedHighs.current * 0.5 + rawHighs * 0.5;
    const bass = smoothedBass.current * 0.5 + rawBass * 0.5;
    
    // Audio threshold check
    const audioThreshold = 0.02;
    const hasAudio = bass > audioThreshold || highs > audioThreshold;
    const shouldAnimate = spinSpeed > 0 || hasAudio;
    
    if (groupRef.current) {
      // Only rotate when spinSpeed > 0 OR audio is playing
      if (spinSpeed > 0) {
        baseRotation.current.y += spinSpeed * 0.02;
      }
      if (hasAudio) {
        baseRotation.current.y += bass * 0.015 + highs * 0.008;
      }
      
      groupRef.current.rotation.y = baseRotation.current.y;
      groupRef.current.rotation.x = shouldAnimate ? Math.sin(t * 0.8) * 0.08 * animSpeed + (hasAudio ? bass * 0.1 : 0) : 0;
      
      // Position proportional to audio
      groupRef.current.position.y = hasAudio ? bass * 0.6 + highs * 0.2 : 0;
    }
  });

  return (
    <group ref={groupRef}>
      <Wing side={1} audioData={audioData} />
      <Wing side={-1} audioData={audioData} />
      <Sparkles
        count={(smoothedHighs.current > 0.02 || smoothedBass.current > 0.02) ? Math.round(5 + smoothedHighs.current * 12 + smoothedBass.current * 8) : 0}
        scale={[0.8, 0.8, 0.8]}
        size={1 + smoothedHighs.current * 2 + smoothedBass.current * 1.5}
        speed={(smoothedHighs.current > 0.02 || smoothedBass.current > 0.02) ? (0.3 + smoothedHighs.current * 0.8 + smoothedBass.current * 0.6) : 0}
        opacity={0.01 + smoothedHighs.current * 0.04}
        color={accentColor}
        position={[0, 0.8, 0]}
      />
    </group>
  );
}

export default function AngelWingsVisualizer({
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
        <HologramWings audioData={audioData} />
      </group>
    </>
  );
}
