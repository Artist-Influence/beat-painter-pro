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
  const secondaryColor = textureData.colors.secondary;

  const angle = useMemo(() => (index / 40) * Math.PI * 2, [index]);
  const radius = 0.8;

  const safeAudioData = audioData || { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 };
  const frequency = safeAudioData.frequency || Array(256).fill(0);

  const bass = useMemo(() => {
    let sum = 0;
    for (let i = 0; i <= 85; i++) sum += frequency[i] || 0;
    return Math.min((sum / 86 / 255) * audioSensitivity.bassMultiplier, 1.0);
  }, [frequency, audioSensitivity.bassMultiplier]);

  const mids = useMemo(() => {
    let sum = 0;
    for (let i = 86; i <= 170; i++) sum += frequency[i] || 0;
    return Math.min((sum / 85 / 255) * audioSensitivity.midsMultiplier, 1.0);
  }, [frequency, audioSensitivity.midsMultiplier]);

  const highs = useMemo(() => {
    let sum = 0;
    for (let i = 171; i <= 255; i++) sum += frequency[i] || 0;
    return Math.min((sum / 85 / 255) * audioSensitivity.highsMultiplier, 1.0);
  }, [frequency, audioSensitivity.highsMultiplier]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const animSpeed = audioSensitivity.animationSpeed;

    // Much more dramatic audio-reactive movement
    const speed = 1.0 + bass * 6.0 + mids * 3.0;
    const x = Math.cos(angle + t * speed * animSpeed) * radius * (1 + bass * 2.5);
    const z = Math.sin(angle + t * speed * animSpeed) * radius * (1 + bass * 2.5);
    const y = Math.sin((t + index) * 3.0 * animSpeed) * 0.4 + bass * 4.0 + highs * 2.0;

    if (meshRef.current) {
      meshRef.current.position.set(x, y, z);
      
      // Much more dramatic rotation with stronger audio response
      meshRef.current.rotation.x += (mids * 2.0 + bass * 3.0) * 0.032 * animSpeed;
      meshRef.current.rotation.y += (mids * 1.5 + highs * 2.5) * 0.032 * animSpeed;
      meshRef.current.rotation.z += (bass * 1.0 + highs * 2.0) * 0.032 * animSpeed;
      
      // Clamped beat scaling to prevent overflow
      const beatScale = Math.min(Math.max(bass > 0.3 ? 1 + bass * 5.0 : 1 + Math.sin(t * 8 * animSpeed) * 0.8, 0.7), 2.0);
      meshRef.current.scale.setScalar(beatScale);
      
      if (meshRef.current.material) {
        const material = meshRef.current.material as THREE.MeshStandardMaterial;
        material.emissiveIntensity = 0.8 + highs * 4.0 + bass * 3.0;
      }
    }
  });

  const material = useMemo(() => {
    return createVisualizerMaterial("#ffffff", textureData, {
      emissive: primaryColor,
      emissiveIntensity: 1.0 + highs * 4.0 + bass * 3.0,
      metalness: textureData.colors.isMetallic ? 1 : 0.5,
      roughness: textureData.colors.isMetallic ? 0.1 : 0.3,
      transparent: true,
      opacity: 0.9 + highs * 0.1
    });
  }, [textureData, primaryColor, highs, bass]);

  return (
    <mesh ref={meshRef} material={material}>
      <coneGeometry args={[0.08, 0.3, 6]} />
    </mesh>
  );
}

function CircumferenceCap({ index, audioData, textureData }: any) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { audioSensitivity } = useStudioStore();
  
  const primaryColor = textureData.colors.primary;
  const accentColor = textureData.colors.accent;

  const angle = useMemo(() => (index / 20) * Math.PI * 2, [index]);
  const radius = 1.2;

  const safeAudioData = audioData || { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 };
  const frequency = safeAudioData.frequency || Array(256).fill(0);

  const bass = useMemo(() => {
    let sum = 0;
    for (let i = 0; i <= 85; i++) sum += frequency[i] || 0;
    return Math.min((sum / 86 / 255) * audioSensitivity.bassMultiplier, 1.0);
  }, [frequency, audioSensitivity.bassMultiplier]);

  const mids = useMemo(() => {
    let sum = 0;
    for (let i = 86; i <= 170; i++) sum += frequency[i] || 0;
    return Math.min((sum / 85 / 255) * audioSensitivity.midsMultiplier, 1.0);
  }, [frequency, audioSensitivity.midsMultiplier]);

  const highs = useMemo(() => {
    let sum = 0;
    for (let i = 171; i <= 255; i++) sum += frequency[i] || 0;
    return Math.min((sum / 85 / 255) * audioSensitivity.highsMultiplier, 1.0);
  }, [frequency, audioSensitivity.highsMultiplier]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const animSpeed = audioSensitivity.animationSpeed;

    // Much more dramatic audio-reactive cap movement
    const speed = 0.8 + bass * 5.0 + mids * 2.5;
    const x = Math.cos(angle + t * speed * animSpeed) * radius * (1 + bass * 2.0);
    const z = Math.sin(angle + t * speed * animSpeed) * radius * (1 + bass * 2.0);
    const y = Math.sin((t + index) * 3.0 * animSpeed) * 0.3 + bass * 3.0 + mids * 1.5;

    if (meshRef.current) {
      meshRef.current.position.set(x, y, z);
      
      // Face towards center for cap effect
      meshRef.current.lookAt(0, y, 0);
      
      // Much more dramatic rotation
      meshRef.current.rotation.z += (bass * 1.5 + highs * 1.0) * 0.032 * animSpeed;
      
      // Clamped beat scaling to prevent overflow
      const beatScale = Math.min(Math.max(bass > 0.3 ? 1 + bass * 4.0 : 1 + Math.sin(t * 6 * animSpeed) * 0.5, 0.7), 2.0);
      meshRef.current.scale.setScalar(beatScale);
      
      if (meshRef.current.material) {
        const material = meshRef.current.material as THREE.MeshStandardMaterial;
        material.emissiveIntensity = 0.6 + highs * 3.5 + bass * 2.5;
      }
    }
  });

  const material = useMemo(() => {
    return createVisualizerMaterial("#ffffff", textureData, {
      emissive: accentColor,
      emissiveIntensity: 1.5 + highs * 3.5 + bass * 2.5,
      metalness: textureData.colors.isMetallic ? 1 : 0.7,
      roughness: textureData.colors.isMetallic ? 0.05 : 0.2,
      transparent: true,
      opacity: 0.8 + mids * 0.2
    });
  }, [textureData, accentColor, highs, bass, mids]);

  return (
    <mesh ref={meshRef} material={material}>
      <cylinderGeometry args={[0.15, 0.05, 0.1, 8]} />
    </mesh>
  );
}

function GlassSphereVisualizer({ audioData }: any) {
  const groupRef = useRef<THREE.Group>(null);
  const centerSphereRef = useRef<THREE.Mesh>(null);
  const shardCount = 40;
  const capCount = 20;
  const { audioSensitivity } = useStudioStore();
  const textureData = useVisualizerTexture();
  
  const primaryColor = textureData.colors.primary;
  const accentColor = textureData.colors.accent;

  const safeAudioData = audioData || { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 };
  const frequency = safeAudioData.frequency || Array(256).fill(0);

  const bass = useMemo(() => {
    let sum = 0;
    for (let i = 0; i <= 85; i++) sum += frequency[i] || 0;
    return Math.min((sum / 86 / 255) * audioSensitivity.bassMultiplier, 1.0);
  }, [frequency, audioSensitivity.bassMultiplier]);

  const mids = useMemo(() => {
    let sum = 0;
    for (let i = 86; i <= 170; i++) sum += frequency[i] || 0;
    return Math.min((sum / 85 / 255) * audioSensitivity.midsMultiplier, 1.0);
  }, [frequency, audioSensitivity.midsMultiplier]);

  const highs = useMemo(() => {
    let sum = 0;
    for (let i = 171; i <= 255; i++) sum += frequency[i] || 0;
    return Math.min((sum / 85 / 255) * audioSensitivity.highsMultiplier, 1.0);
  }, [frequency, audioSensitivity.highsMultiplier]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const animSpeed = audioSensitivity.animationSpeed;
    
    if (groupRef.current) {
      // Much more dramatic group movement with stronger audio response
      groupRef.current.rotation.y = t * 2.0 * animSpeed + bass * 10.0 + mids * 6.0;
      groupRef.current.rotation.x = Math.sin(t * 3.0 * animSpeed) * 0.8 + bass * 4.0;
      groupRef.current.position.y = Math.sin(t * 4.0 * animSpeed) * 1.2 + bass * 5.0;
      
      // Clamped beat scaling to prevent overflow
      const beatScale = Math.min(Math.max(bass > 0.4 ? 1 + bass * 6.0 : 1 + Math.sin(t * 8 * animSpeed) * 1.0, 0.7), 2.0);
      groupRef.current.scale.setScalar(beatScale);
    }
    
    if (centerSphereRef.current) {
      // Much more dramatic center sphere with stronger pulsing
      const spherePulse = 1 + bass * 6.0 + highs * 4.0 + Math.sin(t * 10.0 * animSpeed) * 1.2;
      centerSphereRef.current.scale.setScalar(spherePulse);
      
      // Much faster rotation with dramatic audio response
      centerSphereRef.current.rotation.x = t * 6.0 * animSpeed + bass * 20.0;
      centerSphereRef.current.rotation.y = t * 5.0 * animSpeed + highs * 24.0;
      centerSphereRef.current.rotation.z = t * 4.0 * animSpeed + mids * 16.0;
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
        material={createVisualizerMaterial("#ffffff", textureData, {
          emissive: primaryColor,
          emissiveIntensity: 2.0 + bass * 4.0,
          metalness: textureData.colors.isMetallic ? 1 : 0,
          roughness: textureData.colors.isMetallic ? 0.05 : 0.3,
        })}
      >
        <sphereGeometry args={[0.15, 32, 32]} />
      </mesh>
      <Sparkles
        count={8 + highs * 25 + bass * 15}
        scale={[1.2, 1.2, 1.2]}
        size={1.2 + highs * 2.5 + bass * 1.5}
        speed={1.0 + highs * 2.0 + bass * 1.5}
        opacity={0.02 + highs * 0.05}
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
      <group scale={0.20}>
        <GlassSphereVisualizer audioData={audioData} />
      </group>
    </>
  );
}