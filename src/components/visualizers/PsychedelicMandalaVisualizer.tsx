import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment, Sparkles } from "@react-three/drei";
import * as THREE from "three";
import type { VisualizerProps } from "../visualizer";
import { useVisualizerTexture, createVisualizerMaterial } from "@/hooks/useVisualizerTexture";
import { useStudioStore } from "@/stores/studioStore";

function MandalaRing({ radius, segments, depth, audioData, textureData }) {
  const meshRef = useRef<THREE.Group>(null);
  const { audioSensitivity } = useStudioStore();
  
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
    if (meshRef.current) {
      const t = clock.getElapsedTime();
      const speed = audioSensitivity.animationSpeed;
      // Balanced hypnotic rotation with strong bass response
      meshRef.current.rotation.z = t * (1.0 + depth * 0.3) * speed + bass * 3.0 + mids * 0.5;
      
      // Strong bass pulsing with subtle baseline
      const pulse = 1 + Math.sin(t * 8 * speed) * 0.2 + bass * 1.8 + mids * 0.3;
      meshRef.current.scale.setScalar(pulse);
      
      // Subtle depth movement - strong bass, minimal highs
      meshRef.current.position.z = Math.sin(t * 2 * speed + depth) * (bass * 0.8 + highs * 0.2);
      
      // Minimal X-Y movement for subtle organic feel
      meshRef.current.position.x = Math.cos(t * 1.5 * speed + depth) * bass * 0.3;
      meshRef.current.position.y = Math.sin(t * 1.2 * speed + depth) * bass * 0.2;
    }
  });
  
  const primaryColor = textureData.colors.primary;
  const accentColor = textureData.colors.accent;
  
  return (
    <group ref={meshRef}>
      {Array.from({ length: segments }).map((_, i) => {
        const angle = (i / segments) * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        
        const material = createVisualizerMaterial(
          i % 2 === 0 ? primaryColor : accentColor,
          textureData,
          {
            emissive: i % 2 === 0 ? primaryColor : accentColor,
            emissiveIntensity: 0.5 + bass * 2,
            metalness: 0.8,
            roughness: 0.2,
          }
        );

        return (
          <mesh key={i} position={[x, y, 0]} material={material}>
            <torusGeometry args={[0.1, 0.05, 8, 16]} />
          </mesh>
        );
      })}
    </group>
  );
}

export default function PsychedelicMandalaVisualizer({
  audioData = { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 },
  styleAdjustments = { brightness: 100, saturation: 100, contrast: 100 },
  width = 1080,
  height = 1080,
  zoomLevel = 1,
  backgroundColor = '#00FF00',
}: VisualizerProps) {
  const groupRef = useRef<THREE.Group>(null);
  const textureData = useVisualizerTexture();
  const { audioSensitivity } = useStudioStore();
  
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

  useFrame(({ clock }) => {
    if (groupRef.current) {
      const t = clock.getElapsedTime();
      const speed = audioSensitivity.animationSpeed;
      // Balanced hypnotic rotation with strong bass response
      groupRef.current.rotation.z = t * (0.2 + bass * 1.2) * speed;
      
      // Strong bass breathing with subtle baseline
      const breathe = 1 + Math.sin(t * 1.0 * speed) * (0.15 + bass * 1.0 + mids * 0.2);
      groupRef.current.scale.setScalar(breathe);
      
      // Minimal movement for subtle organic feel
      groupRef.current.position.y = Math.sin(t * 1.5 * speed) * bass * 0.3;
      groupRef.current.rotation.x = Math.sin(t * 1.0 * speed) * bass * 0.2;
    }
  });
  
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <Environment preset="city" />
      
      <group ref={groupRef}>
        {/* Multiple concentric rings create depth illusion */}
        <MandalaRing radius={0.5} segments={8} depth={0} audioData={audioData} textureData={textureData} />
        <MandalaRing radius={1} segments={16} depth={1} audioData={audioData} textureData={textureData} />
        <MandalaRing radius={1.5} segments={24} depth={2} audioData={audioData} textureData={textureData} />
        <MandalaRing radius={2} segments={32} depth={3} audioData={audioData} textureData={textureData} />
        
        {/* Sacred geometry center - attracts focus */}
        <mesh
          material={createVisualizerMaterial(
            textureData.colors.primary,
            textureData,
            {
              emissive: textureData.colors.primary,
              emissiveIntensity: 1 + bass * 2,
              wireframe: true,
            }
          )}
        >
          <octahedronGeometry args={[0.3, 2]} />
        </mesh>
        
        <Sparkles
          count={100 + bass * 200}
          scale={[5, 5, 5]}
          size={2 + bass * 5}
          speed={2 + bass * 3}
          opacity={0.8}
          color={textureData.colors.accent}
        />
      </group>
    </>
  );
}