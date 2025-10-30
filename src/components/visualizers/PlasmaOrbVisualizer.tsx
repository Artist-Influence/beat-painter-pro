import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";
import { VisualizerProps } from ".";
import { useStudioStore } from "@/stores/studioStore";

function PlasmaOrb({ audioData }: any) {
  const orbRef = useRef<THREE.Mesh>(null);
  const plasmaStreamsRef = useRef<THREE.Mesh[]>([]);
  const innerCoreRef = useRef<THREE.Mesh>(null);
  const fieldLinesRef = useRef<THREE.Points>(null);
  const { audioSensitivity } = useStudioStore();

  const safeAudioData = audioData || { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 };
  const frequency = safeAudioData.frequency || Array(256).fill(0);
  const amplitude = safeAudioData.amplitude || 0;
  const beatStrength = safeAudioData.beatStrength || 0;

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
  
  // Particle field for plasma effect
  const particleField = useMemo(() => {
    const positions = new Float32Array(1000 * 3);
    const colors = new Float32Array(1000 * 3);
    
    for (let i = 0; i < 1000; i++) {
      const radius = 0.5 + Math.random() * 1.5;
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
    const beat = Math.max(beatStrength, bass);
    
    const lerp = 0.08;
    smoothedBass.current = THREE.MathUtils.lerp(smoothedBass.current, bass, lerp);
    smoothedMids.current = THREE.MathUtils.lerp(smoothedMids.current, mids, lerp);
    smoothedHighs.current = THREE.MathUtils.lerp(smoothedHighs.current, highs, lerp);
    smoothedBeat.current = THREE.MathUtils.lerp(smoothedBeat.current, beat, lerp);
    
    const isPeakMoment = smoothedBeat.current > 0.7;
    
    // Animate outer orb - significant breathing
    if (orbRef.current) {
      orbRef.current.rotation.x = time * 0.1 * animSpeed;
      orbRef.current.rotation.y = time * 0.15 * animSpeed;
      
      const scale = 1 + smoothedBass.current * 0.8 + (isPeakMoment ? 0.3 : 0);
      orbRef.current.scale.setScalar(scale);
      
      if (orbRef.current.material) {
        const mat = orbRef.current.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = 0.1 + smoothedMids.current * 0.6;
        mat.opacity = 0.15 + Math.sin(time * 5) * smoothedBeat.current * 0.3;
      }
    }
    
    // Animate inner core - INTENSE pulsing
    if (innerCoreRef.current) {
      const rotSpeed = 1 + smoothedBass.current * 3;
      innerCoreRef.current.rotation.x = -time * 0.3 * animSpeed * rotSpeed;
      innerCoreRef.current.rotation.y = -time * 0.2 * animSpeed * rotSpeed;
      
      const coreScale = 0.3 + smoothedBeat.current * 0.9 + (isPeakMoment ? 0.4 : 0);
      innerCoreRef.current.scale.setScalar(coreScale);
      
      if (innerCoreRef.current.material) {
        (innerCoreRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 
          0.3 + smoothedBeat.current * 2.5 + (isPeakMoment ? 1.0 : 0);
      }
    }
    
    // Animate plasma streams - LANCE outward dramatically
    plasmaStreamsRef.current.forEach((stream, i) => {
      if (stream) {
        const offset = i * 0.3;
        const wave = Math.sin(time * 3 * animSpeed + offset) * 0.5 + 0.5;
        
        const bandIndex = Math.floor((i / plasmaStreamsRef.current.length) * frequency.length);
        const bandValue = (frequency[bandIndex] || 0) / 255;
        
        // Dramatic extension on frequency bands
        const baseScale = 0.3 + bandValue * 4.0 + (isPeakMoment ? 1.5 : 0);
        stream.scale.x = baseScale;
        stream.scale.z = baseScale;
        stream.scale.y = baseScale * (1 + bandValue * 2); // Length extends more
        
        // Whipping motion at tips
        const whipAngle = Math.sin(time * 4 * animSpeed + offset) * bandValue * 0.4;
        stream.rotation.x = whipAngle;
        
        if (stream.material) {
          (stream.material as THREE.MeshStandardMaterial).opacity = 0.4 + wave * 0.3 + bandValue * 0.4;
          (stream.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.3 + bandValue * 1.2;
        }
        
        const pos = streamPositions[i];
        const positionMultiplier = 1 + Math.sin(time * 2 * animSpeed + offset) * smoothedBass.current * 0.5;
        stream.position.x = pos.x * positionMultiplier;
        stream.position.y = pos.y * positionMultiplier;
        stream.position.z = pos.z * positionMultiplier;
      }
    });
    
    // Animate particle field - EXPLODE outward chaotically
    if (fieldLinesRef.current) {
      fieldLinesRef.current.rotation.y = time * 0.05 * animSpeed * (1 + smoothedBass.current * 2);
      
      const positions = fieldLinesRef.current.geometry.attributes.position.array as Float32Array;
      const originalPositions = particleField.positions;
      
      for (let i = 0; i < positions.length; i += 3) {
        const audioIndex = Math.floor((i / 3 / 1000) * frequency.length);
        const audioValue = (frequency[audioIndex] || 0) / 255;
        
        // Chaotic explosion on bass
        const distortion = 1 + audioValue * 1.5 + smoothedBass.current * 0.8;
        const chaos = Math.sin(time * 5 * animSpeed + i) * smoothedBeat.current * 0.3;
        
        positions[i] = originalPositions[i] * distortion + chaos;
        positions[i + 1] = originalPositions[i + 1] * distortion + chaos * 0.5;
        positions[i + 2] = originalPositions[i + 2] * distortion + chaos;
      }
      
      fieldLinesRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <group>
      {/* Outer glass sphere */}
      <mesh ref={orbRef}>
        <sphereGeometry args={[2, 64, 64]} />
        <meshStandardMaterial
          color={primaryColor}
          transparent
          opacity={0.15}
          metalness={extractedColors?.isMetallic ? 0.95 : 0.9}
          roughness={extractedColors?.isMetallic ? 0.05 : 0.1}
          emissive={extractedColors?.isNeon ? primaryColor : secondaryColor}
          emissiveIntensity={0.1}
          map={texture || undefined}
        />
      </mesh>
      
      {/* Inner energy core */}
      <mesh ref={innerCoreRef}>
        <sphereGeometry args={[0.3, 32, 32]} />
        <meshStandardMaterial
          color={secondaryColor}
          emissive={extractedColors?.isNeon ? secondaryColor : accentColor}
          emissiveIntensity={0.5}
          metalness={extractedColors?.isMetallic ? 1 : 0.9}
          roughness={0}
          map={texture || undefined}
        />
      </mesh>
      
      {/* Plasma streams */}
      {streamPositions.map((pos, i) => (
        <mesh
          key={i}
          ref={el => { if (el) plasmaStreamsRef.current[i] = el; }}
          position={[pos.x, pos.y, pos.z]}
        >
          <coneGeometry args={[0.05, 1.5, 8]} />
          <meshStandardMaterial
            color={accentColor}
            transparent
            opacity={0.5}
            emissive={extractedColors?.isNeon ? accentColor : primaryColor}
            emissiveIntensity={0.3}
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
          size={0.01 * (1 + smoothedBeat.current * 2)}
          transparent
          opacity={0.6}
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
