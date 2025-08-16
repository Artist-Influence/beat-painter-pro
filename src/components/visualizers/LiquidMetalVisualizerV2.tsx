import React, { useRef, useMemo, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";
import { VisualizerProps } from ".";
import { useVisualizerTexture } from "@/hooks/useVisualizerTexture";
import { useStudioStore } from "@/stores/studioStore";

function FluidOrb({ position, index, audioData, textureData }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const { audioSensitivity } = useStudioStore();
  
  const safeAudioData = audioData || { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 };
  const freqData = safeAudioData.frequency || Array(256).fill(0);
  
  const bass = useMemo(() => {
    let sum = 0;
    for (let i = 0; i <= 85; i++) sum += freqData[i] || 0;
    return Math.min((sum / 86 / 255) * audioSensitivity.bassMultiplier, 1.0);
  }, [freqData, audioSensitivity.bassMultiplier]);

  const mids = useMemo(() => {
    let sum = 0;
    for (let i = 86; i <= 170; i++) sum += freqData[i] || 0;
    return Math.min((sum / 85 / 255) * audioSensitivity.midsMultiplier, 1.0);
  }, [freqData, audioSensitivity.midsMultiplier]);

  const highs = useMemo(() => {
    let sum = 0;
    for (let i = 171; i <= 255; i++) sum += freqData[i] || 0;
    return Math.min((sum / 85 / 255) * audioSensitivity.highsMultiplier, 1.0);
  }, [freqData, audioSensitivity.highsMultiplier]);

  const primaryColor = new THREE.Color(textureData.colors.primary);

  useEffect(() => {
    if (materialRef.current && textureData.texture) {
      const mat = materialRef.current;
      // Apply texture to diffuse and emissive maps for seamless integration
      mat.map = textureData.texture;
      mat.emissiveMap = textureData.texture;
      mat.needsUpdate = true;
    }
  }, [textureData.texture, textureData.textureVersion]);

  useFrame(({ clock }) => {
    if (meshRef.current && materialRef.current) {
      const t = clock.getElapsedTime();
      const speed = audioSensitivity.animationSpeed;
      
      // Smooth organic movement
      const spreadDistance = 6 + bass * 12.0;
      const direction = position[0] > 0 ? 1 : -1;
      const x = position[0] + (direction * spreadDistance);
      const y = position[1] + Math.sin(t * 0.8 * speed + index) * 2.0 * mids;
      const z = position[2] + Math.cos(t * 0.6 * speed + index) * 1.5 * bass;
      
      meshRef.current.position.set(x, y, z);
      
      // Fluid scaling
      const scale = 0.5 + bass * 1.2 + mids * 0.8;
      meshRef.current.scale.setScalar(scale);
      
      // Gentle rotation
      meshRef.current.rotation.y = t * (0.5 + highs * 1.0) * speed;
      meshRef.current.rotation.z = Math.sin(t * 0.3 * speed) * 0.5;
      
      // Material properties for liquid metal effect
      materialRef.current.roughness = 0.1 + highs * 0.2;
      materialRef.current.metalness = 0.8 + bass * 0.2;
      materialRef.current.emissiveIntensity = 0.8 + bass * 2.0;
      
      // Keep emissive neutral white so texture shows full color
      materialRef.current.emissive.set('#ffffff');
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshStandardMaterial
        ref={materialRef}
        color="#ffffff"
        roughness={0.1}
        metalness={0.8}
        emissive="#ffffff"
        emissiveIntensity={0.8}
        map={textureData.texture}
        emissiveMap={textureData.texture}
      />
    </mesh>
  );
}

export default function LiquidMetalVisualizerV2({
  audioData = { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 },
  styleAdjustments = { brightness: 100, saturation: 100, contrast: 100 },
  width = 1080,
  height = 1080,
  zoomLevel = 1,
  backgroundColor = '#000000',
}: VisualizerProps) {
  const groupRef = useRef<THREE.Group>(null);
  const textureData = useVisualizerTexture();
  const { viewport } = useThree();
  
  const orbs = useMemo(() => [
    { position: [-15, 0, 0], index: 0 },
    { position: [-8, 0, 0], index: 1 },
    { position: [-2, 0, 0], index: 2 },
    { position: [2, 0, 0], index: 3 },
    { position: [8, 0, 0], index: 4 },
    { position: [15, 0, 0], index: 5 },
  ], []);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      const t = clock.getElapsedTime();
      groupRef.current.rotation.y = t * 0.015; // Subtle overall rotation
      groupRef.current.position.y = Math.sin(t * 0.5) * 0.5; // Gentle floating
    }
  });

  return (
    <>
      <color attach="background" args={["#ffffff"]} />
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 5, 5]} intensity={0.7} />
      <pointLight position={[0, 0, 10]} intensity={1.0} color={textureData.colors.primary} />
      <Environment preset="warehouse" />
      
      <group ref={groupRef}>
        {orbs.map((orb) => (
          <FluidOrb
            key={orb.index}
            position={orb.position}
            index={orb.index}
            audioData={audioData}
            textureData={textureData}
          />
        ))}
      </group>
      </>
    );
 }