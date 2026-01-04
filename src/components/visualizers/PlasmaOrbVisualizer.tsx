import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";
import { VisualizerProps } from ".";
import { useVisualizerTexture, createVisualizerMaterial } from "@/hooks/useVisualizerTexture";
import { useStudioStore } from "@/stores/studioStore";

function PlasmaOrb({ audioData }: any) {
  const orbRef = useRef<THREE.Mesh>(null);
  const plasmaStreamsRef = useRef<THREE.Mesh[]>([]);
  const innerCoreRef = useRef<THREE.Mesh>(null);
  const fieldLinesRef = useRef<THREE.Points>(null);
  const { audioSensitivity } = useStudioStore();
  const textureData = useVisualizerTexture();

  const safeAudioData = audioData || { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 };
  const frequency = safeAudioData.frequency || Array(256).fill(0);
  const beatStrength = safeAudioData.beatStrength || 0;

  const primaryColor = textureData?.colors?.primary || '#ffffff';
  const secondaryColor = textureData?.colors?.secondary || '#ffffff';
  const accentColor = textureData?.colors?.accent || '#ffffff';
  const isNeon = textureData?.colors?.isNeon || false;
  const isMetallic = textureData?.colors?.isMetallic || false;

  // Generate plasma stream positions
  const streamPositions = useMemo(() => {
    const streams = [];
    const streamCount = 16;
    
    for (let i = 0; i < streamCount; i++) {
      const phi = Math.acos(1 - 2 * (i + 0.5) / streamCount);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      
      streams.push({
        x: Math.sin(phi) * Math.cos(theta),
        y: Math.cos(phi),
        z: Math.sin(phi) * Math.sin(theta)
      });
    }
    
    return streams;
  }, []);
  
  // Particle field for plasma effect - smaller radius
  const particleField = useMemo(() => {
    const positions = new Float32Array(1000 * 3);
    const colors = new Float32Array(1000 * 3);
    
    for (let i = 0; i < 1000; i++) {
      const radius = 0.3 + Math.random() * 0.9;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
      
      const color = new THREE.Color(accentColor);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    
    return { positions, colors };
  }, [accentColor]);

  const smoothedBass = useRef(0);
  const smoothedMids = useRef(0);
  const smoothedHighs = useRef(0);
  const smoothedBeat = useRef(0);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    const animSpeed = audioSensitivity.animationSpeed;
    
    // Calculate frequency bands per-frame (NOT in useMemo)
    let bassSum = 0, midsSum = 0, highsSum = 0;
    for (let i = 0; i <= 85; i++) bassSum += frequency[i] || 0;
    for (let i = 86; i <= 170; i++) midsSum += frequency[i] || 0;
    for (let i = 171; i <= 255; i++) highsSum += frequency[i] || 0;
    
    const rawBass = Math.min((bassSum / 86 / 255) * audioSensitivity.bassMultiplier, 1.5);
    const rawMids = Math.min((midsSum / 85 / 255) * audioSensitivity.midsMultiplier, 1.5);
    const rawHighs = Math.min((highsSum / 85 / 255) * audioSensitivity.highsMultiplier, 1.5);
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
    smoothedHighs.current = lerpVal(smoothedHighs.current, rawHighs);
    smoothedBeat.current = lerpVal(smoothedBeat.current, rawBeat);
    
    const bass = smoothedBass.current;
    const mids = smoothedMids.current;
    const highs = smoothedHighs.current;
    const beat = smoothedBeat.current;
    
    // Beat pop effect - THE KEY for kicks/808s
    const beatPop = beat > 0.4 ? 1 + (beat - 0.4) * 1.2 : 1;
    
    // Animate outer orb - AUDIO-FIRST (time is subtle, audio dominates)
    if (orbRef.current) {
      // Time component subtle (0.1x), audio component strong
      orbRef.current.rotation.x = time * 0.1 * animSpeed + bass * Math.PI * 0.3;
      orbRef.current.rotation.y = time * 0.15 * animSpeed + mids * Math.PI * 0.2;
      
      // Scale with strong bass response and beat pop
      const scale = (1 + bass * 0.6) * beatPop;
      orbRef.current.scale.setScalar(scale);
      
      if (orbRef.current.material) {
        const mat = orbRef.current.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = 0.3 + mids * 1.5 + beat * 0.8;
        mat.opacity = 0.3 + beat * 0.4;
      }
    }
    
    // Animate inner core - INTENSE beat-reactive pulsing
    if (innerCoreRef.current) {
      // Rotation speed driven by audio
      const rotSpeed = 1 + bass * 3;
      innerCoreRef.current.rotation.x = time * 0.2 * animSpeed + bass * Math.PI * 0.5;
      innerCoreRef.current.rotation.y = time * 0.15 * animSpeed * rotSpeed;
      
      // Core scale driven by beat with strong pop
      const coreScale = (0.3 + beat * 1.2 + highs * 0.5) * beatPop;
      innerCoreRef.current.scale.setScalar(coreScale);
      
      if (innerCoreRef.current.material) {
        (innerCoreRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 
          0.8 + beat * 4.0 + bass * 2.0;
      }
    }
    
    // Animate plasma streams - AUDIO-FIRST with beat pops
    plasmaStreamsRef.current.forEach((stream, i) => {
      if (stream) {
        const offset = i * 0.3;
        
        const bandIndex = Math.floor((i / plasmaStreamsRef.current.length) * frequency.length);
        const bandValue = (frequency[bandIndex] || 0) / 255;
        
        // AUDIO-FIRST extension - bass and beat dominate, time is subtle
        const audioScale = 0.3 + bandValue * 4.0 + bass * 2.0;
        const streamScale = audioScale * beatPop;
        stream.scale.x = streamScale;
        stream.scale.z = streamScale;
        stream.scale.y = streamScale * (1 + bass * 2); // Length extends with bass
        
        // Whipping motion driven by audio
        const whipAngle = bass * Math.PI * 0.4 + Math.sin(time * 3 + offset) * 0.2;
        stream.rotation.x = whipAngle;
        stream.rotation.z = mids * Math.PI * 0.2;
        
        if (stream.material) {
          (stream.material as THREE.MeshStandardMaterial).opacity = 0.5 + beat * 0.4;
          (stream.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.5 + beat * 3.0;
        }
        
        // Position expansion driven by bass
        const pos = streamPositions[i];
        const positionMultiplier = 1 + bass * 0.6 * beatPop;
        stream.position.x = pos.x * positionMultiplier;
        stream.position.y = pos.y * positionMultiplier;
        stream.position.z = pos.z * positionMultiplier;
      }
    });
    
    // Animate particle field - AUDIO-FIRST explosion
    if (fieldLinesRef.current) {
      // Rotation speed driven by bass
      fieldLinesRef.current.rotation.y = time * 0.05 * animSpeed + bass * Math.PI * 0.3;
      
      const positions = fieldLinesRef.current.geometry.attributes.position.array as Float32Array;
      const originalPositions = particleField.positions;
      
      for (let i = 0; i < positions.length; i += 3) {
        const audioIndex = Math.floor((i / 3 / 1000) * frequency.length);
        const audioValue = (frequency[audioIndex] || 0) / 255;
        
        // AUDIO-FIRST distortion - bass and beat dominate
        const distortion = (1 + audioValue * 2.0 + bass * 1.2) * beatPop;
        const chaos = beat * 0.4 * Math.sin(time * 4 + i * 0.01);
        
        positions[i] = originalPositions[i] * distortion + chaos;
        positions[i + 1] = originalPositions[i + 1] * distortion + chaos * 0.5;
        positions[i + 2] = originalPositions[i + 2] * distortion + chaos;
      }
      
      fieldLinesRef.current.geometry.attributes.position.needsUpdate = true;
      
      // Particle size driven by beat
      if (fieldLinesRef.current.material) {
        (fieldLinesRef.current.material as THREE.PointsMaterial).size = 0.02 * (1 + beat * 3);
      }
    }
  });

  return (
    <group>
      {/* Outer glass sphere - smaller */}
      <mesh ref={orbRef}>
        <sphereGeometry args={[1.2, 64, 64]} />
        <meshStandardMaterial
          color={primaryColor}
          transparent
          opacity={0.2}
          metalness={isMetallic ? 0.95 : 0.9}
          roughness={isMetallic ? 0.05 : 0.1}
          emissive={isNeon ? primaryColor : secondaryColor}
          emissiveIntensity={0.2}
          map={textureData?.texture || undefined}
        />
      </mesh>
      
      {/* Inner energy core - smaller */}
      <mesh ref={innerCoreRef}>
        <sphereGeometry args={[0.2, 32, 32]} />
        <meshStandardMaterial
          color={secondaryColor}
          emissive={isNeon ? secondaryColor : accentColor}
          emissiveIntensity={0.8}
          metalness={isMetallic ? 1 : 0.9}
          roughness={0}
          map={textureData?.texture || undefined}
        />
      </mesh>
      
      {/* Plasma streams - smaller with texture overlay */}
      {streamPositions.map((pos, i) => (
        <mesh
          key={i}
          ref={el => { if (el) plasmaStreamsRef.current[i] = el; }}
          position={[pos.x, pos.y, pos.z]}
        >
          <coneGeometry args={[0.04, 1.0, 8]} />
          <meshStandardMaterial
            color={accentColor}
            transparent
            opacity={0.6}
            emissive={isNeon ? accentColor : primaryColor}
            emissiveIntensity={0.5}
            map={textureData?.texture || undefined}
            emissiveMap={textureData?.texture || undefined}
          />
        </mesh>
      ))}
      
      {/* Electromagnetic particle field */}
      <points ref={fieldLinesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={particleField.positions.length / 3}
            array={particleField.positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={particleField.colors.length / 3}
            array={particleField.colors}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.015}
          transparent
          opacity={0.7}
          vertexColors
          sizeAttenuation={true}
        />
      </points>
    </group>
  );
}

export default function PlasmaOrbVisualizer({
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
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} />
      <directionalLight position={[-5, -5, -5]} intensity={0.4} />
      <Environment preset="city" />
      <PlasmaOrb audioData={audioData} />
      <group>
        <mesh position={[0, -8, 0]}>
          <planeGeometry args={[8.6, 8.6]} />
          <meshBasicMaterial color={backgroundColor} transparent opacity={0} />
        </mesh>
      </group>
    </>
  );
}
