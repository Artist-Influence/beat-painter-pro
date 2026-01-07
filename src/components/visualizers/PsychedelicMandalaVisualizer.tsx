import React, { useRef, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
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
  const beatStrength = safeAudioData.beatStrength || 0;
  
  // Smoothing refs
  const smoothedBass = useRef(0);
  const smoothedMids = useRef(0);
  const smoothedBeat = useRef(0);
  
  useFrame(() => {
    if (meshRef.current) {
      const speed = audioSensitivity.animationSpeed;
      
      // Calculate audio per-frame (NOT in useMemo)
      let bassSum = 0, midsSum = 0;
      for (let i = 0; i <= 85; i++) bassSum += frequency[i] || 0;
      for (let i = 86; i <= 170; i++) midsSum += frequency[i] || 0;
      
      const rawBass = Math.min((bassSum / 86 / 255) * audioSensitivity.bassMultiplier, 1.5);
      const rawMids = Math.min((midsSum / 85 / 255) * audioSensitivity.midsMultiplier, 1.5);
      const rawBeat = Math.max(beatStrength, rawBass * 0.8);
      
      // ASYMMETRIC smoothing: fast attack (0.5), slow decay (0.1)
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
      
      // Audio threshold check
      const audioThreshold = 0.02;
      const hasAudio = bass > audioThreshold || mids > audioThreshold;
      
      // Beat pop effect
      const beatPop = beat > 0.4 ? 1 + (beat - 0.4) * 1.0 : 1;
      
      // Rotation ONLY when audio is present
      if (hasAudio) {
        meshRef.current.rotation.z += bass * 0.1 * speed;
      }
      
      // Scale reacts to audio (returns to 1 when silent)
      const pulse = (1 + bass * 0.6) * beatPop;
      meshRef.current.scale.setScalar(pulse);
      
      // Position driven by audio (returns to 0 when silent)
      meshRef.current.position.z = bass * 1.5;
      meshRef.current.position.x = mids * 0.8;
      meshRef.current.position.y = bass * 0.6;
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
          primaryColor,
          textureData,
          {
            emissive: i % 2 === 0 ? primaryColor : accentColor,
            emissiveIntensity: 2.0,
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
  const { viewport } = useThree();
  
  const safeAudioData = audioData || { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 };
  const frequency = safeAudioData.frequency || Array(256).fill(0);
  const beatStrength = safeAudioData.beatStrength || 0;
  
  // Smoothing refs
  const smoothedBass = useRef(0);
  const smoothedMids = useRef(0);
  const smoothedBeat = useRef(0);

  useFrame(() => {
    if (groupRef.current) {
      const speed = audioSensitivity.animationSpeed;
      
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
      
      // Audio threshold check
      const audioThreshold = 0.02;
      const hasAudio = bass > audioThreshold || mids > audioThreshold;
      
      // Beat pop
      const beatPop = beat > 0.4 ? 1 + (beat - 0.4) * 0.8 : 1;
      
      // Rotation ONLY when audio is present
      if (hasAudio) {
        groupRef.current.rotation.z += bass * 0.08 * speed;
      }
      
      // Scale reacts to audio (returns to 1 when silent)
      const breathe = (1 + bass * 0.4) * beatPop;
      groupRef.current.scale.setScalar(Math.min(breathe, 1.4));
      
      // Position driven by audio (returns to 0 when silent)
      groupRef.current.position.y = bass * 0.8;
      groupRef.current.rotation.x = mids * Math.PI * 0.15;
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
              emissiveIntensity: 4.0,
              wireframe: true,
            }
          )}
        >
          <octahedronGeometry args={[0.3, 2]} />
        </mesh>
        
        <Sparkles
          count={smoothedBass.current > 0.02 ? 150 : 0}
          scale={[5, 5, 5]}
          size={3}
          speed={smoothedBass.current > 0.02 ? 3 : 0}
          opacity={0.8}
          color={textureData.colors.accent}
        />
      </group>

    </>
  );
}
