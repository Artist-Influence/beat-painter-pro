import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";
import { VisualizerProps } from ".";
import { useVisualizerTexture, createVisualizerMaterial } from "@/hooks/useVisualizerTexture";
import { useStudioStore } from "@/stores/studioStore";

function ElectricField({ audioData }: any) {
  const fieldGroupRef = useRef<THREE.Group>(null);
  const chargeRefs = useRef<THREE.Mesh[]>([]);
  const fieldLineRefs = useRef<THREE.Mesh[]>([]);
  const electronCloudRef = useRef<THREE.Points>(null);
  const conductorRingRef = useRef<THREE.Mesh>(null);
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

  // Generate field line paths between charges - smaller dimensions
  const fieldLines = useMemo(() => {
    const lines = [];
    const lineCount = 24;
    const stepsPerLine = 30;
    
    for (let i = 0; i < lineCount; i++) {
      const angle = (i / lineCount) * Math.PI * 2;
      const points = [];
      
      for (let j = 0; j <= stepsPerLine; j++) {
        const t = j / stepsPerLine;
        const radius = 0.3 + t * 1.0;
        
        const x = Math.cos(angle) * radius * (1 - t * 0.3);
        const y = Math.sin(angle) * radius * (1 - t * 0.3);
        const z = (t - 0.5) * 2;
        
        const waveX = x + Math.sin(t * Math.PI * 2) * 0.07;
        const waveY = y + Math.cos(t * Math.PI * 2) * 0.07;
        
        points.push(new THREE.Vector3(waveX, z, waveY));
      }
      
      lines.push(points);
    }
    
    return lines;
  }, []);
  
  // Electron cloud particles - smaller radius
  const electronPositions = useMemo(() => {
    const positions = new Float32Array(500 * 3);
    
    for (let i = 0; i < 500; i++) {
      const majorRadius = 1.0;
      const minorRadius = 0.35;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 2;
      
      positions[i * 3] = (majorRadius + minorRadius * Math.cos(phi)) * Math.cos(theta);
      positions[i * 3 + 1] = minorRadius * Math.sin(phi);
      positions[i * 3 + 2] = (majorRadius + minorRadius * Math.cos(phi)) * Math.sin(theta);
    }
    
    return positions;
  }, []);
  
  // Charge positions - smaller distances
  const chargePositions = [
    { x: 0, y: 1.3, z: 0, charge: 1 },
    { x: 0, y: -1.3, z: 0, charge: -1 },
    { x: 1.0, y: 0, z: 0, charge: 1 },
    { x: -1.0, y: 0, z: 0, charge: -1 },
  ];

  const smoothedBass = useRef(0);
  const smoothedMids = useRef(0);
  const smoothedHighs = useRef(0);
  const smoothedBeat = useRef(0);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    const animSpeed = audioSensitivity.animationSpeed;
    
    // Calculate frequency bands per-frame
    let bassSum = 0, midsSum = 0, highsSum = 0;
    for (let i = 0; i <= 85; i++) bassSum += frequency[i] || 0;
    for (let i = 86; i <= 170; i++) midsSum += frequency[i] || 0;
    for (let i = 171; i <= 255; i++) highsSum += frequency[i] || 0;
    
    const rawBass = Math.min((bassSum / 86 / 255) * audioSensitivity.bassMultiplier, 1.0);
    const rawMids = Math.min((midsSum / 85 / 255) * audioSensitivity.midsMultiplier, 1.0);
    const rawHighs = Math.min((highsSum / 85 / 255) * audioSensitivity.highsMultiplier, 1.0);
    const rawBeat = Math.max(beatStrength, rawBass);
    
    // Asymmetric smoothing: fast attack (0.55), fast decay (0.35) for accurate beat tracking
    const lerp = (current: number, target: number) => {
      const factor = target > current ? 0.55 : 0.35;
      return current + (target - current) * factor;
    };
    smoothedBass.current = lerp(smoothedBass.current, rawBass);
    smoothedMids.current = lerp(smoothedMids.current, rawMids);
    smoothedHighs.current = lerp(smoothedHighs.current, rawHighs);
    smoothedBeat.current = lerp(smoothedBeat.current, rawBeat);
    
    // Transient blend: 30% raw for immediate punch on bass
    const bassFinal = smoothedBass.current * 0.7 + rawBass * 0.3;
    const beatFinal = smoothedBeat.current * 0.7 + rawBeat * 0.3;
    
    const isPeakMoment = beatFinal > 0.7;
    
    // Rotate entire field
    if (fieldGroupRef.current) {
      fieldGroupRef.current.rotation.y = time * 0.15 * animSpeed;
      fieldGroupRef.current.scale.setScalar(0.7 + bassFinal * 0.7 + (isPeakMoment ? 0.3 : 0));
    }
    
    // Animate charges - VIOLENT vibration (1.5x oscillation, 1.2x position)
    chargeRefs.current.forEach((charge, i) => {
      if (charge) {
        const pos = chargePositions[i];
        const chargeType = pos.charge;
        
        // Violent oscillation - 1.5x
        const oscillation = Math.sin(time * 3 * animSpeed + i) * smoothedMids.current * 1.5;
        charge.position.x = pos.x + oscillation * chargeType;
        charge.position.y = pos.y + Math.cos(time * 2 * animSpeed + i) * smoothedBass.current * 1.2;
        
        // Arc between charges
        const arcMotion = Math.sin(time * 4 * animSpeed) * smoothedBeat.current * 0.5;
        charge.position.z = pos.z + arcMotion;
        
        // Dramatic scale variation - 1.5x beat, 1.0x freq
        const freqResponse = chargeType > 0 ? smoothedHighs.current : smoothedMids.current;
        const pulseScale = 0.2 + smoothedBeat.current * 1.5 + freqResponse * 1.0 + (isPeakMoment ? 0.5 : 0);
        charge.scale.setScalar(pulseScale);
        
        if (charge.material) {
          (charge.material as THREE.MeshStandardMaterial).emissiveIntensity = 
            0.3 + smoothedBeat.current * 3.0 + (isPeakMoment ? 1.5 : 0);
        }
      }
    });
    
    // Animate field lines - pulse with energy and thickness (1.5x thickness)
    fieldLineRefs.current.forEach((line, i) => {
      if (line) {
        const bandIndex = Math.floor((i / fieldLineRefs.current.length) * frequency.length);
        const bandValue = (frequency[bandIndex] || 0) / 255;
        
        // Thickness pulse - 1.5x
        const thicknessPulse = 1 + bandValue * 1.5 + smoothedBeat.current * 0.8 + (isPeakMoment ? 0.5 : 0);
        line.scale.x = thicknessPulse;
        line.scale.z = thicknessPulse;
        
        // Wave propagation
        const wave = Math.sin(time * 5 * animSpeed - i * 0.3) * 0.5 + 0.5;
        
        if (line.material) {
          (line.material as THREE.MeshBasicMaterial).opacity = 
            0.3 + bandValue * 1.0 + wave * smoothedBeat.current * 0.5;
        }
      }
    });
    
    // Animate electron cloud - MORE chaotic swarming (1.5x drift, 1.0x highs, 2.5x scale)
    if (electronCloudRef.current) {
      const orbitSpeed = 1 + smoothedBass.current * 3;
      electronCloudRef.current.rotation.x = time * 0.3 * animSpeed * orbitSpeed;
      electronCloudRef.current.rotation.z = -time * 0.2 * animSpeed * orbitSpeed;
      
      const positions = electronCloudRef.current.geometry.attributes.position.array as Float32Array;
      const originalPositions = electronPositions;
      
      for (let i = 0; i < positions.length; i += 3) {
        const drift = Math.sin(time * 3 * animSpeed + i) * smoothedBeat.current * 1.5;
        const chaos = Math.cos(time * 5 * animSpeed + i * 0.1) * smoothedBass.current * 0.8;
        
        positions[i] = originalPositions[i] + drift + chaos;
        positions[i + 1] = originalPositions[i + 1] + Math.sin(time * 4 * animSpeed + i) * smoothedHighs.current * 1.0;
        positions[i + 2] = originalPositions[i + 2] + drift - chaos;
      }
      
      electronCloudRef.current.geometry.attributes.position.needsUpdate = true;
      electronCloudRef.current.scale.setScalar(1 + smoothedHighs.current * 2.5 + smoothedBass.current * 1.0 + (isPeakMoment ? 0.8 : 0));
      
      // Update particle size
      if (electronCloudRef.current.material) {
        (electronCloudRef.current.material as THREE.PointsMaterial).size = 0.02 * (1 + smoothedHighs.current * 4);
      }
    }
    
    // Central conductor ring - intense glow (2.0x emissive, 0.5x scale)
    if (conductorRingRef.current) {
      if (conductorRingRef.current.material) {
        (conductorRingRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 
          0.2 + smoothedBass.current * 2.0 + (isPeakMoment ? 1.0 : 0);
      }
      conductorRingRef.current.scale.setScalar(1 + smoothedBass.current * 0.5 + smoothedMids.current * 0.3);
    }
  });

  return (
    <group ref={fieldGroupRef}>
      {/* Electric charges - smaller */}
      {chargePositions.map((pos, i) => (
        <mesh
          key={i}
          ref={el => { if (el) chargeRefs.current[i] = el; }}
          position={[pos.x, pos.y, pos.z]}
        >
          <sphereGeometry args={[0.2, 32, 32]} />
          <meshStandardMaterial
            color={i % 2 === 0 ? primaryColor : secondaryColor}
            metalness={isMetallic ? 0.9 : 0.8}
            roughness={isMetallic ? 0.1 : 0.2}
            emissive={isNeon ? (i % 2 === 0 ? primaryColor : secondaryColor) : accentColor}
            emissiveIntensity={0.5}
            map={textureData?.texture || undefined}
          />
        </mesh>
      ))}
      
      {/* Field lines - with texture overlay */}
      {fieldLines.map((points, i) => {
        const curve = new THREE.CatmullRomCurve3(points);
        return (
          <mesh key={i} ref={(el: any) => { if (el) fieldLineRefs.current[i] = el; }}>
            <tubeGeometry args={[curve, 30, 0.01, 8, false]} />
            <meshStandardMaterial
              color={accentColor}
              transparent
              opacity={0.5}
              emissive={accentColor}
              emissiveIntensity={0.3}
              map={textureData?.texture || undefined}
              emissiveMap={textureData?.texture || undefined}
            />
          </mesh>
        );
      })}
      
      {/* Electron cloud */}
      <points ref={electronCloudRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={electronPositions.length / 3}
            array={electronPositions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          color={accentColor}
          size={0.015}
          transparent
          opacity={0.6}
          sizeAttenuation={true}
          map={textureData?.texture || undefined}
        />
      </points>
      
      {/* Central conductor ring - smaller */}
      <mesh ref={conductorRingRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.0, 0.04, 16, 100]} />
        <meshStandardMaterial
          color={primaryColor}
          metalness={isMetallic ? 0.98 : 0.95}
          roughness={isMetallic ? 0.02 : 0.05}
          emissive={isNeon ? primaryColor : secondaryColor}
          emissiveIntensity={0.2}
          map={textureData?.texture || undefined}
        />
      </mesh>
    </group>
  );
}

export default function ElectricFieldVisualizer({
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
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <directionalLight position={[-5, -5, -5]} intensity={0.5} />
      <pointLight position={[0, 0, 0]} intensity={0.6} />
      <Environment preset="city" />
      <ElectricField audioData={audioData} />
      <group>
        <mesh position={[0, -8, 0]}>
          <planeGeometry args={[8.6, 8.6]} />
          <meshBasicMaterial color={backgroundColor} transparent opacity={0} />
        </mesh>
      </group>
    </>
  );
}
