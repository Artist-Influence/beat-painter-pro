import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";
import { VisualizerProps } from ".";
import { useStudioStore } from "@/stores/studioStore";

function ElectricField({ audioData }: any) {
  const fieldGroupRef = useRef<THREE.Group>(null);
  const chargeRefs = useRef<THREE.Mesh[]>([]);
  const fieldLineRefs = useRef<THREE.Mesh[]>([]);
  const electronCloudRef = useRef<THREE.Points>(null);
  const conductorRingRef = useRef<THREE.Mesh>(null);
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

  // Generate field line paths between charges
  const fieldLines = useMemo(() => {
    const lines = [];
    const lineCount = 24;
    const stepsPerLine = 30;
    
    for (let i = 0; i < lineCount; i++) {
      const angle = (i / lineCount) * Math.PI * 2;
      const points = [];
      
      for (let j = 0; j <= stepsPerLine; j++) {
        const t = j / stepsPerLine;
        const radius = 0.5 + t * 1.5;
        
        const x = Math.cos(angle) * radius * (1 - t * 0.3);
        const y = Math.sin(angle) * radius * (1 - t * 0.3);
        const z = (t - 0.5) * 3;
        
        const waveX = x + Math.sin(t * Math.PI * 2) * 0.1;
        const waveY = y + Math.cos(t * Math.PI * 2) * 0.1;
        
        points.push(new THREE.Vector3(waveX, z, waveY));
      }
      
      lines.push(points);
    }
    
    return lines;
  }, []);
  
  // Electron cloud particles
  const electronPositions = useMemo(() => {
    const positions = new Float32Array(500 * 3);
    
    for (let i = 0; i < 500; i++) {
      const majorRadius = 1.5;
      const minorRadius = 0.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 2;
      
      positions[i * 3] = (majorRadius + minorRadius * Math.cos(phi)) * Math.cos(theta);
      positions[i * 3 + 1] = minorRadius * Math.sin(phi);
      positions[i * 3 + 2] = (majorRadius + minorRadius * Math.cos(phi)) * Math.sin(theta);
    }
    
    return positions;
  }, []);
  
  // Charge positions
  const chargePositions = [
    { x: 0, y: 2, z: 0, charge: 1 },
    { x: 0, y: -2, z: 0, charge: -1 },
    { x: 1.5, y: 0, z: 0, charge: 1 },
    { x: -1.5, y: 0, z: 0, charge: -1 },
  ];

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
    
    // Rotate entire field
    if (fieldGroupRef.current) {
      fieldGroupRef.current.rotation.y = time * 0.1 * animSpeed;
      fieldGroupRef.current.scale.setScalar(0.7 + smoothedBass.current * 0.5);
    }
    
    // Animate charges - VIOLENT vibration
    chargeRefs.current.forEach((charge, i) => {
      if (charge) {
        const pos = chargePositions[i];
        const chargeType = pos.charge;
        
        // Violent oscillation
        const oscillation = Math.sin(time * 2 * animSpeed + i) * smoothedMids.current * 0.8;
        charge.position.x = pos.x + oscillation * chargeType;
        charge.position.y = pos.y + Math.cos(time * 1.5 * animSpeed + i) * smoothedBass.current * 0.6;
        
        // Arc between charges
        const arcMotion = Math.sin(time * 3 * animSpeed) * smoothedBeat.current * 0.3;
        charge.position.z = pos.z + arcMotion;
        
        // Dramatic scale variation
        const freqResponse = chargeType > 0 ? smoothedHighs.current : smoothedMids.current;
        const pulseScale = 0.3 + smoothedBeat.current * 0.7 + freqResponse * 0.4 + (isPeakMoment ? 0.3 : 0);
        charge.scale.setScalar(pulseScale);
        
        if (charge.material) {
          (charge.material as THREE.MeshStandardMaterial).emissiveIntensity = 
            0.2 + smoothedBeat.current * 1.8 + (isPeakMoment ? 0.8 : 0);
        }
      }
    });
    
    // Animate field lines - pulse with energy and thickness
    fieldLineRefs.current.forEach((line, i) => {
      if (line) {
        const bandIndex = Math.floor((i / fieldLineRefs.current.length) * frequency.length);
        const bandValue = (frequency[bandIndex] || 0) / 255;
        
        // Thickness pulse
        const thicknessPulse = 1 + bandValue * 0.5 + (isPeakMoment ? 0.3 : 0);
        line.scale.x = thicknessPulse;
        line.scale.z = thicknessPulse;
        
        // Wave propagation
        const wave = Math.sin(time * 4 * animSpeed - i * 0.3) * 0.5 + 0.5;
        
        if (line.material) {
          (line.material as THREE.MeshBasicMaterial).opacity = 
            0.2 + bandValue * 0.8 + wave * smoothedBeat.current * 0.4;
        }
      }
    });
    
    // Animate electron cloud - MORE chaotic swarming
    if (electronCloudRef.current) {
      const orbitSpeed = 1 + smoothedBass.current * 2;
      electronCloudRef.current.rotation.x = time * 0.2 * animSpeed * orbitSpeed;
      electronCloudRef.current.rotation.z = -time * 0.15 * animSpeed * orbitSpeed;
      
      const positions = electronCloudRef.current.geometry.attributes.position.array as Float32Array;
      const originalPositions = electronPositions;
      
      for (let i = 0; i < positions.length; i += 3) {
        const drift = Math.sin(time * 2 * animSpeed + i) * smoothedBeat.current * 0.6;
        const chaos = Math.cos(time * 4 * animSpeed + i * 0.1) * smoothedBass.current * 0.4;
        
        positions[i] = originalPositions[i] + drift + chaos;
        positions[i + 1] = originalPositions[i + 1] + Math.sin(time * 3 * animSpeed + i) * smoothedHighs.current * 0.4;
        positions[i + 2] = originalPositions[i + 2] + drift - chaos;
      }
      
      electronCloudRef.current.geometry.attributes.position.needsUpdate = true;
      electronCloudRef.current.scale.setScalar(1 + smoothedHighs.current * 1.0 + (isPeakMoment ? 0.5 : 0));
    }
    
    // Central conductor ring - intense glow
    if (conductorRingRef.current) {
      if (conductorRingRef.current.material) {
        (conductorRingRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 
          0.1 + smoothedBass.current * 0.8 + (isPeakMoment ? 0.5 : 0);
      }
      conductorRingRef.current.scale.setScalar(1 + smoothedBass.current * 0.3);
    }
  });

  return (
    <group ref={fieldGroupRef}>
      {/* Electric charges */}
      {chargePositions.map((pos, i) => (
        <mesh
          key={i}
          ref={el => { if (el) chargeRefs.current[i] = el; }}
          position={[pos.x, pos.y, pos.z]}
        >
          <sphereGeometry args={[0.3, 32, 32]} />
          <meshStandardMaterial
            color={i % 2 === 0 ? primaryColor : secondaryColor}
            metalness={extractedColors?.isMetallic ? 0.9 : 0.8}
            roughness={extractedColors?.isMetallic ? 0.1 : 0.2}
            emissive={extractedColors?.isNeon ? (i % 2 === 0 ? primaryColor : secondaryColor) : accentColor}
            emissiveIntensity={0.3}
            map={texture || undefined}
          />
        </mesh>
      ))}
      
      {/* Field lines */}
      {fieldLines.map((points, i) => {
        const curve = new THREE.CatmullRomCurve3(points);
        return (
          <mesh key={i} ref={(el: any) => { if (el) fieldLineRefs.current[i] = el; }}>
            <tubeGeometry args={[curve, 30, 0.01, 8, false]} />
            <meshBasicMaterial
              color={accentColor}
              transparent
              opacity={0.4}
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
          size={0.015 * (1 + smoothedHighs.current * 2)}
          transparent
          opacity={0.5}
          sizeAttenuation={true}
        />
      </points>
      
      {/* Central conductor ring */}
      <mesh ref={conductorRingRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.5, 0.05, 16, 100]} />
        <meshStandardMaterial
          color={primaryColor}
          metalness={extractedColors?.isMetallic ? 0.98 : 0.95}
          roughness={extractedColors?.isMetallic ? 0.02 : 0.05}
          emissive={extractedColors?.isNeon ? primaryColor : secondaryColor}
          emissiveIntensity={0.1}
          map={texture || undefined}
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
      <pointLight position={[0, 0, 0]} intensity={0.5} />
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
