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
    let bassSum = 0, midsSum = 0, highsSum = 0;
    for (let i = 0; i <= 85; i++) bassSum += frequency[i] || 0;
    for (let i = 86; i <= 170; i++) midsSum += frequency[i] || 0;
    for (let i = 171; i <= 255; i++) highsSum += frequency[i] || 0;
    
    const rawBass = bassSum / 86 / 255;
    const rawMids = midsSum / 85 / 255;
    const rawHighs = highsSum / 85 / 255;
    
    // Faster lerp for immediate response
    const lerp = (c: number, t: number) => c + (t - c) * (t > c ? 0.85 : 0.5);
    smoothedBass.current = lerp(smoothedBass.current, rawBass);
    smoothedMids.current = lerp(smoothedMids.current, rawMids);
    smoothedHighs.current = lerp(smoothedHighs.current, rawHighs);
    
    // 60/40 blend for even more immediate response
    const bass = smoothedBass.current * 0.4 + rawBass * 0.6;
    const mids = smoothedMids.current * 0.4 + rawMids * 0.6;
    const highs = smoothedHighs.current * 0.4 + rawHighs * 0.6;
    
    const hasAudio = bass > 0.02 || mids > 0.02 || highs > 0.02;

    if (groupRef.current) {
      const spinSpeed = audioSensitivity.spinSpeed ?? 0;
      
      // Direct scale - no lerp for zero latency - bigger multiplier
      const targetScale = 1 + bass * 2.2; // Increased from 1.5
      groupRef.current.scale.setScalar(targetScale);
      
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
