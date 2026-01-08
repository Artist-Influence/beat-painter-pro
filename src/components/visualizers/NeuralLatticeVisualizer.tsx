import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";
import { VisualizerProps } from ".";
import { useStudioStore } from "@/stores/studioStore";

function NeuralLattice({ audioData }: any) {
  const groupRef = useRef<THREE.Group>(null);
  const sphere1Ref = useRef<THREE.Mesh>(null);
  const sphere2Ref = useRef<THREE.Mesh>(null);
  const sphere3Ref = useRef<THREE.Mesh>(null);
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
  const secondaryColor = extractedColors?.secondary || '#ffffff';
  const accentColor = extractedColors?.accent || '#ffffff';

  const safeAudioData = audioData || { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 };
  const frequency = safeAudioData.frequency || Array(256).fill(0);
  const amplitude = safeAudioData.amplitude || 0;

  const smoothedBass = useRef(0);
  const smoothedMids = useRef(0);
  const smoothedHighs = useRef(0);
  
  // Base rotation for position-based rotation
  const baseRotation = useRef({ x: 0, y: 0, z: 0 });

  useFrame(() => {
    // Calculate audio - DETECT first, then apply multipliers for EFFECT
    // TRUE EQ SEPARATION: Bass 0-250Hz, Mids 250-4000Hz, Highs 4000Hz+
    let bassSum = 0, midsSum = 0, highsSum = 0;
    for (let i = 0; i <= 2; i++) bassSum += frequency[i] || 0;      // 0-250 Hz (kick/sub-bass)
    for (let i = 3; i <= 46; i++) midsSum += frequency[i] || 0;    // 250-4000 Hz (vocals/snare)
    for (let i = 47; i <= 255; i++) highsSum += frequency[i] || 0; // 4000+ Hz (hi-hats/cymbals)
    
    // Step 1: Detect normalized audio (0-1) WITHOUT multipliers
    const detectedBass = Math.min(bassSum / 3 / 255, 1.0);
    const detectedMids = Math.min(midsSum / 44 / 255, 1.0);
    const detectedHighs = Math.min(highsSum / 209 / 255, 1.0);
    
    // Step 2: Apply multipliers for EFFECT (controls reactivity)
    const rawBass = detectedBass * audioSensitivity.bassMultiplier;
    const rawMids = detectedMids * audioSensitivity.midsMultiplier;
    const rawHighs = detectedHighs * audioSensitivity.highsMultiplier;
    
    // Faster lerp for 170+ BPM
    const lerp = (c: number, t: number) => c + (t - c) * (t > c ? 0.85 : 0.5);
    smoothedBass.current = lerp(smoothedBass.current, rawBass);
    smoothedMids.current = lerp(smoothedMids.current, rawMids);
    smoothedHighs.current = lerp(smoothedHighs.current, rawHighs);
    
    // 60/40 blend for even more immediate response
    const bass = smoothedBass.current * 0.4 + rawBass * 0.6;
    const mids = smoothedMids.current * 0.4 + rawMids * 0.6;
    const highs = smoothedHighs.current * 0.4 + rawHighs * 0.6;
    
    // Audio threshold check - use DETECTED values
    const hasAudio = detectedBass > 0.02 || detectedMids > 0.02 || detectedHighs > 0.02;

    if (groupRef.current) {
      const spinSpeed = audioSensitivity.spinSpeed ?? 0;
      
      // Scale: BASE + TIGHTLY CLAMPED reactivity (multipliers control effect intensity, not base size)
      const baseScale = 0.65;  // Constant base size
      // Each boost is clamped independently so high multipliers can't overflow
      const bassScaleBoost = Math.min(detectedBass * audioSensitivity.bassMultiplier * 0.15, 0.25);
      const midsScaleBoost = Math.min(detectedMids * audioSensitivity.midsMultiplier * 0.08, 0.12);
      // Final scale has a hard cap to prevent going off-screen
      const finalScale = Math.min(baseScale + bassScaleBoost + midsScaleBoost, 1.0);
      groupRef.current.scale.setScalar(finalScale);
      
      // Only rotate when spinSpeed > 0 OR audio is present
      if (spinSpeed > 0 || hasAudio) {
        baseRotation.current.y += (spinSpeed > 0 ? 0.05 * spinSpeed : 0) + (hasAudio ? 0.002 : 0);
        baseRotation.current.x += hasAudio ? 0.001 : 0;
        baseRotation.current.z += hasAudio ? 0.0008 : 0;
      }
      
      // Audio offset for rotation
      const offsetY = hasAudio ? mids * Math.PI * 0.2 : 0;
      const offsetX = hasAudio ? bass * Math.PI * 0.1 : 0;
      const offsetZ = hasAudio ? highs * Math.PI * 0.06 : 0;
      
      groupRef.current.rotation.y = baseRotation.current.y + offsetY;
      groupRef.current.rotation.x = baseRotation.current.x + offsetX;
      groupRef.current.rotation.z = baseRotation.current.z + offsetZ;
      
      groupRef.current.position.y = bass * 2.0 + amplitude * 2.0;
    }
    
    if (sphere1Ref.current?.material) {
      (sphere1Ref.current.material as THREE.MeshStandardMaterial).opacity = 0.25 + mids * 0.4 + bass * 0.3;
    }
    if (sphere2Ref.current?.material) {
      (sphere2Ref.current.material as THREE.MeshStandardMaterial).opacity = 0.15 + highs * 0.35;
    }
    if (sphere3Ref.current?.material) {
      (sphere3Ref.current.material as THREE.MeshStandardMaterial).opacity = 0.1 + bass * 0.25;
    }
  });

  return (
    <group ref={groupRef} scale={0.65}>
      <mesh ref={sphere1Ref}><sphereGeometry args={[2.0, 32, 32]} /><meshStandardMaterial color={primaryColor} wireframe transparent opacity={0.25} map={texture || undefined} /></mesh>
      <mesh ref={sphere2Ref}><sphereGeometry args={[2.8, 16, 16]} /><meshStandardMaterial color={secondaryColor} wireframe transparent opacity={0.15} map={texture || undefined} /></mesh>
      <mesh ref={sphere3Ref}><sphereGeometry args={[3.5, 8, 8]} /><meshStandardMaterial color={accentColor} wireframe transparent opacity={0.1} map={texture || undefined} /></mesh>
    </group>
  );
}

export default function NeuralLatticeVisualizer({
  audioData = { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 },
  styleAdjustments = { brightness: 100, saturation: 100, contrast: 100 },
  width = 1080, height = 1080, zoomLevel = 1, backgroundColor = '#00FF00',
}: VisualizerProps & { styleAdjustments?: { brightness: number; saturation: number; contrast: number }; }) {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[4, 7, 6]} intensity={0.8} />
      <Environment preset="city" />
      <NeuralLattice audioData={audioData} />
    </>
  );
}
