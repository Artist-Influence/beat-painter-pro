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
  
  // Base rotation for position-based rotation
  const baseRotation = useRef(0);
  
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
      
      // Faster asymmetric smoothing for punchier response
      const attackLerp = 0.8;
      const decayLerp = 0.25;
      const lerpVal = (current: number, target: number) => {
        const factor = target > current ? attackLerp : decayLerp;
        return current + (target - current) * factor;
      };
      
      smoothedBass.current = lerpVal(smoothedBass.current, rawBass);
      smoothedMids.current = lerpVal(smoothedMids.current, rawMids);
      smoothedBeat.current = lerpVal(smoothedBeat.current, rawBeat);
      
      // 50/50 blend for immediate response
      const bass = smoothedBass.current * 0.5 + rawBass * 0.5;
      const mids = smoothedMids.current * 0.5 + rawMids * 0.5;
      const beat = smoothedBeat.current * 0.5 + rawBeat * 0.5;
      
      // Audio threshold check
      const audioThreshold = 0.02;
      const hasAudio = bass > audioThreshold || mids > audioThreshold;
      
      // Beat pop effect - lower threshold, bigger effect
      const beatPop = beat > 0.2 ? 1 + (beat - 0.2) * 2.0 : 1;
      
      // Get spinSpeed from store
      const spinSpeed = audioSensitivity.spinSpeed ?? 0;
      
      // Only rotate when spinSpeed > 0 OR audio is present
      if (spinSpeed > 0 || hasAudio) {
        baseRotation.current += (spinSpeed > 0 ? 0.05 * spinSpeed : 0) + (hasAudio ? 0.002 * speed : 0);
      }
      
      // Audio offset for rotation - reduced multipliers for smoother motion
      const audioOffset = hasAudio ? (bass * 0.2 + mids * 0.12) * Math.PI : 0;
      meshRef.current.rotation.z = baseRotation.current + audioOffset;
      
      // Scale reacts to audio - reduced response for less jarring motion
      const pulse = (1 + bass * 0.5 + mids * 0.25) * beatPop;
      meshRef.current.scale.setScalar(Math.min(pulse, 1.6));
      
      // Position driven by audio - reduced for smoother motion
      meshRef.current.position.z = bass * 0.6;
      meshRef.current.position.x = mids * 0.3;
      meshRef.current.position.y = bass * 0.25;
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
  
  // Base rotation for position-based rotation
  const mainBaseRotation = useRef(0);

  useFrame(() => {
    if (groupRef.current) {
      // Calculate audio per-frame
      let bassSum = 0, midsSum = 0;
      for (let i = 0; i <= 85; i++) bassSum += frequency[i] || 0;
      for (let i = 86; i <= 170; i++) midsSum += frequency[i] || 0;
      
      const rawBass = Math.min((bassSum / 86 / 255) * audioSensitivity.bassMultiplier, 1.5);
      const rawMids = Math.min((midsSum / 85 / 255) * audioSensitivity.midsMultiplier, 1.5);
      const rawBeat = Math.max(beatStrength, rawBass * 0.8);
      
      // ASYMMETRIC smoothing - faster attack
      const attackLerp = 0.7;
      const decayLerp = 0.15;
      const lerpVal = (current: number, target: number) => {
        const factor = target > current ? attackLerp : decayLerp;
        return current + (target - current) * factor;
      };
      
      smoothedBass.current = lerpVal(smoothedBass.current, rawBass);
      smoothedMids.current = lerpVal(smoothedMids.current, rawMids);
      smoothedBeat.current = lerpVal(smoothedBeat.current, rawBeat);
      
      // 50/50 blend for immediate response
      const bass = smoothedBass.current * 0.5 + rawBass * 0.5;
      const mids = smoothedMids.current * 0.5 + rawMids * 0.5;
      const beat = smoothedBeat.current * 0.5 + rawBeat * 0.5;
      
      // Audio threshold check
      const audioThreshold = 0.02;
      const hasAudio = bass > audioThreshold || mids > audioThreshold;
      
      // Beat pop - moderate
      const beatPop = beat > 0.3 ? 1 + (beat - 0.3) * 0.6 : 1;
      
      // Get spinSpeed from store
      const spinSpeed = audioSensitivity.spinSpeed ?? 0;
      const animSpeed = audioSensitivity.animationSpeed;
      
      // Only rotate when spinSpeed > 0 OR audio is present
      if (spinSpeed > 0 || hasAudio) {
        mainBaseRotation.current += (spinSpeed > 0 ? 0.05 * spinSpeed : 0) + (hasAudio ? 0.002 * animSpeed : 0);
      }
      
      // Audio offset for rotation - reduced for smoother motion
      const audioOffset = hasAudio ? (bass * 0.2 + mids * 0.12) * Math.PI : 0;
      groupRef.current.rotation.z = mainBaseRotation.current + audioOffset;
      
      // Scale reacts to audio - reduced for less jarring motion
      const breathe = (1 + bass * 0.4 + mids * 0.2) * beatPop;
      groupRef.current.scale.setScalar(Math.min(breathe, 1.5));
      
      // Position driven by audio - reduced for smoother motion
      groupRef.current.position.y = bass * 0.4;
      groupRef.current.rotation.x = mids * Math.PI * 0.1;
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
