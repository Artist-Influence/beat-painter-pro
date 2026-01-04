import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";
import { VisualizerProps } from ".";
import { useVisualizerTexture, createVisualizerMaterial } from "@/hooks/useVisualizerTexture";
import { useStudioStore } from "@/stores/studioStore";

function TeslaCoil({ audioData }: any) {
  const groupRef = useRef<THREE.Group>(null);
  const arcRefs = useRef<THREE.Mesh[]>([]);
  const particlesRef = useRef<THREE.Points>(null);
  const topTerminalRef = useRef<THREE.Mesh>(null);
  const coilBaseRef = useRef<THREE.Mesh>(null);
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

  // Create arc geometry paths
  const arcPaths = useMemo(() => {
    const paths = [];
    const arcCount = 12;
    
    for (let i = 0; i < arcCount; i++) {
      const angle = (i / arcCount) * Math.PI * 2;
      const points = [];
      
      for (let j = 0; j <= 20; j++) {
        const t = j / 20;
        const radius = 0.3 + t * 1.2;
        const jitter = Math.random() * 0.2;
        
        points.push(new THREE.Vector3(
          Math.cos(angle) * (radius + jitter),
          -1.0 + t * 2,
          Math.sin(angle) * (radius + jitter)
        ));
      }
      
      const curve = new THREE.CatmullRomCurve3(points);
      paths.push(curve.getPoints(50));
    }
    
    return paths;
  }, []);

  // Particle positions for spark effects - smaller radius
  const particles = useMemo(() => {
    const positions = new Float32Array(300 * 3);
    for (let i = 0; i < 300; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const r = 0.3 + Math.random() * 1.2;
      
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi) - 0.3;
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    return positions;
  }, []);

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
    
    if (groupRef.current) {
      groupRef.current.rotation.y = time * 0.15 * animSpeed;
      groupRef.current.scale.setScalar(0.8 + bassFinal * 0.6 + (isPeakMoment ? 0.3 : 0));
    }
    
    // Animate electric arcs - SHOOT OUT dramatically on bass
    arcRefs.current.forEach((arc, i) => {
      if (arc) {
        const offset = time * 2.5 * animSpeed + i * 0.5;
        const bandIndex = Math.floor((i / arcRefs.current.length) * frequency.length);
        const bandValue = (frequency[bandIndex] || 0) / 255;
        
        // Dramatic scale increase - 5x multiplier
        const arcScale = 0.2 + bandValue * 5.0 + smoothedBass.current * 2.0 + (isPeakMoment ? 1.5 : 0);
        arc.scale.setScalar(arcScale);
        
        // Full rotation on bass
        arc.rotation.z = smoothedBass.current * Math.PI;
        arc.rotation.x = Math.sin(time * 3 * animSpeed + i) * smoothedMids.current * 0.5;
        arc.position.y = Math.sin(offset) * smoothedBass.current * 1.2;
        
        // Individual arc pulsing
        const individualPulse = Math.sin(time * 5 * animSpeed + i * 2) * 0.5 + 0.5;
        arc.visible = smoothedBeat.current > 0.03 || (i % 2 === 0);
        
        if (arc.material) {
          (arc.material as THREE.MeshBasicMaterial).opacity = 0.5 + smoothedHighs.current * 0.5 + individualPulse * bandValue * 0.4;
        }
      }
    });
    
    // Animate spark particles - BURST outward explosively
    if (particlesRef.current) {
      particlesRef.current.rotation.y = time * 0.4 * animSpeed * (1 + smoothedBass.current * 3);
      particlesRef.current.rotation.x = Math.sin(time * animSpeed) * 0.3;
      particlesRef.current.scale.setScalar(1 + smoothedHighs.current * 1.8 + smoothedBass.current * 1.2 + (isPeakMoment ? 0.8 : 0));
      
      const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < positions.length; i += 3) {
        const originalX = particles[i];
        const originalY = particles[i + 1];
        const originalZ = particles[i + 2];
        
        // Radial burst on bass peaks - 2.5x
        const radialBurst = isPeakMoment ? 2.5 : 1.0 + smoothedBass.current * 0.8;
        const waveMotion = Math.sin(time * 4 * animSpeed + i) * smoothedBass.current * 1.0;
        
        positions[i] = originalX * radialBurst + waveMotion;
        positions[i + 1] = originalY + waveMotion * 0.7;
        positions[i + 2] = originalZ * radialBurst + waveMotion;
      }
      particlesRef.current.geometry.attributes.position.needsUpdate = true;
      
      // Update particle size
      if (particlesRef.current.material) {
        (particlesRef.current.material as THREE.PointsMaterial).size = 0.03 * (1 + smoothedBass.current * 5);
      }
    }

    // EXPLODE top terminal on beats
    if (topTerminalRef.current) {
      const terminalPulse = 0.5 + smoothedBeat.current * 3.0 + (isPeakMoment ? 1.0 : 0);
      topTerminalRef.current.scale.setScalar(terminalPulse);
      
      if (topTerminalRef.current.material) {
        (topTerminalRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 
          (isNeon ? 0.5 : 0.3) + smoothedBeat.current * 4.0;
      }
    }
    
    // Coil base vertical stretching and glow
    if (coilBaseRef.current) {
      coilBaseRef.current.scale.y = 1 + smoothedBass.current * 1.2;
      coilBaseRef.current.scale.x = 1 + smoothedMids.current * 0.4;
      coilBaseRef.current.scale.z = 1 + smoothedMids.current * 0.4;
      
      if (coilBaseRef.current.material) {
        (coilBaseRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 
          (isNeon ? 0.3 : 0.2) + smoothedBeat.current * 4.0;
      }
    }
  });

  return (
    <group ref={groupRef}>
      {/* Central coil structure */}
      <mesh ref={coilBaseRef} position={[0, -1.0, 0]}>
        <cylinderGeometry args={[0.3, 0.5, 0.7, 32]} />
        <meshStandardMaterial 
          color={primaryColor}
          metalness={isMetallic ? 0.95 : 0.9}
          roughness={isMetallic ? 0.05 : 0.1}
          emissive={isNeon ? primaryColor : secondaryColor}
          emissiveIntensity={isNeon ? 0.2 : 0.1}
          map={textureData?.texture || undefined}
        />
      </mesh>
      
      {/* Top terminal */}
      <mesh ref={topTerminalRef} position={[0, 1.0, 0]}>
        <sphereGeometry args={[0.25, 32, 32]} />
        <meshStandardMaterial 
          color={primaryColor}
          metalness={isMetallic ? 0.98 : 0.95}
          roughness={isMetallic ? 0.02 : 0.05}
          emissive={isNeon ? primaryColor : accentColor}
          emissiveIntensity={isNeon ? 0.5 : 0.3}
          map={textureData?.texture || undefined}
        />
      </mesh>
      
      {/* Electric arcs - with texture overlay support */}
      {arcPaths.map((points, i) => {
        const curve = new THREE.CatmullRomCurve3(points);
        return (
          <mesh key={i} ref={(el: any) => { if (el) arcRefs.current[i] = el; }}>
            <tubeGeometry args={[curve, 50, 0.015, 8, false]} />
            <meshStandardMaterial 
              color={accentColor}
              transparent 
              opacity={0.7}
              emissive={accentColor}
              emissiveIntensity={0.5}
              map={textureData?.texture || undefined}
              emissiveMap={textureData?.texture || undefined}
            />
          </mesh>
        );
      })}
      
      {/* Spark particles */}
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={particles.length / 3}
            array={particles}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          color={accentColor}
          size={0.02}
          transparent
          opacity={0.9}
          sizeAttenuation={true}
          map={textureData?.texture || undefined}
        />
      </points>
    </group>
  );
}

export default function TeslaCoilVisualizer({
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
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <directionalLight position={[-5, -5, -5]} intensity={0.5} />
      <Environment preset="city" />
      <TeslaCoil audioData={audioData} />
      <group>
        <mesh position={[0, -8, 0]}>
          <planeGeometry args={[8.6, 8.6]} />
          <meshBasicMaterial color={backgroundColor} transparent opacity={0} />
        </mesh>
      </group>
    </>
  );
}
