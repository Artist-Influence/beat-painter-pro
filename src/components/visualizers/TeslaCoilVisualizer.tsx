import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";
import { VisualizerProps } from ".";
import { useStudioStore } from "@/stores/studioStore";

function TeslaCoil({ audioData }: any) {
  const groupRef = useRef<THREE.Group>(null);
  const arcRefs = useRef<THREE.Mesh[]>([]);
  const particlesRef = useRef<THREE.Points>(null);
  const topTerminalRef = useRef<THREE.Mesh>(null);
  const coilBaseRef = useRef<THREE.Mesh>(null);
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

  // Create arc geometry paths
  const arcPaths = useMemo(() => {
    const paths = [];
    const arcCount = 12;
    
    for (let i = 0; i < arcCount; i++) {
      const angle = (i / arcCount) * Math.PI * 2;
      const points = [];
      
      for (let j = 0; j <= 20; j++) {
        const t = j / 20;
        const radius = 0.5 + t * 2;
        const jitter = Math.random() * 0.3;
        
        points.push(new THREE.Vector3(
          Math.cos(angle) * (radius + jitter),
          -1.5 + t * 3,
          Math.sin(angle) * (radius + jitter)
        ));
      }
      
      const curve = new THREE.CatmullRomCurve3(points);
      paths.push(curve.getPoints(50));
    }
    
    return paths;
  }, []);

  // Particle positions for spark effects
  const particles = useMemo(() => {
    const positions = new Float32Array(300 * 3);
    for (let i = 0; i < 300; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const r = 0.5 + Math.random() * 2;
      
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi) - 0.5;
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
    const beat = Math.max(beatStrength, bass);
    
    const lerp = 0.08;
    smoothedBass.current = THREE.MathUtils.lerp(smoothedBass.current, bass, lerp);
    smoothedMids.current = THREE.MathUtils.lerp(smoothedMids.current, mids, lerp);
    smoothedHighs.current = THREE.MathUtils.lerp(smoothedHighs.current, highs, lerp);
    smoothedBeat.current = THREE.MathUtils.lerp(smoothedBeat.current, beat, lerp);
    
    const isPeakMoment = smoothedBeat.current > 0.7;
    
    if (groupRef.current) {
      groupRef.current.rotation.y = time * 0.1 * animSpeed;
      groupRef.current.scale.setScalar(0.8 + smoothedBass.current * 0.4);
    }
    
    // Animate electric arcs - SHOOT OUT on bass
    arcRefs.current.forEach((arc, i) => {
      if (arc) {
        const offset = time * 2 * animSpeed + i * 0.5;
        const bandIndex = Math.floor((i / arcRefs.current.length) * frequency.length);
        const bandValue = (frequency[bandIndex] || 0) / 255;
        
        // Dramatic scale increase and rotation
        const arcScale = 0.3 + bandValue * 3.5 + (isPeakMoment ? 1.0 : 0);
        arc.scale.setScalar(arcScale);
        arc.rotation.z = smoothedBass.current * Math.PI * 0.5;
        arc.position.y = Math.sin(offset) * smoothedBass.current * 0.8;
        
        // Individual arc pulsing
        const individualPulse = Math.sin(time * 4 * animSpeed + i * 2) * 0.5 + 0.5;
        arc.visible = smoothedBeat.current > 0.05 || (i % 2 === 0);
        
        if (arc.material) {
          (arc.material as THREE.MeshBasicMaterial).opacity = 0.4 + smoothedHighs.current * 0.6 + individualPulse * bandValue * 0.3;
        }
      }
    });
    
    // Animate spark particles - BURST outward on bass
    if (particlesRef.current) {
      particlesRef.current.rotation.y = time * 0.3 * animSpeed * (1 + smoothedBass.current * 2);
      particlesRef.current.rotation.x = Math.sin(time * animSpeed) * 0.2;
      particlesRef.current.scale.setScalar(1 + smoothedHighs.current * 1.2 + (isPeakMoment ? 0.5 : 0));
      
      const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < positions.length; i += 3) {
        const originalX = particles[i];
        const originalY = particles[i + 1];
        const originalZ = particles[i + 2];
        
        // Radial burst on bass peaks
        const radialBurst = isPeakMoment ? 1.5 : 1.0;
        const waveMotion = Math.sin(time * 3 * animSpeed + i) * smoothedBass.current * 0.6;
        
        positions[i] = originalX * radialBurst + waveMotion;
        positions[i + 1] = originalY + waveMotion * 0.5;
        positions[i + 2] = originalZ * radialBurst + waveMotion;
      }
      particlesRef.current.geometry.attributes.position.needsUpdate = true;
    }

    // EXPLODE top terminal on beats
    if (topTerminalRef.current) {
      const terminalPulse = 1 + smoothedBeat.current * 1.5 + (isPeakMoment ? 0.5 : 0);
      topTerminalRef.current.scale.setScalar(terminalPulse);
      
      if (topTerminalRef.current.material) {
        (topTerminalRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 
          (extractedColors?.isNeon ? 0.3 : 0.2) + smoothedBeat.current * 2.0;
      }
    }
    
    // Coil base vertical stretching
    if (coilBaseRef.current) {
      coilBaseRef.current.scale.y = 1 + smoothedBass.current * 0.8;
      
      if (coilBaseRef.current.material) {
        (coilBaseRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 
          (extractedColors?.isNeon ? 0.2 : 0.1) + smoothedBeat.current * 2.0;
      }
    }
  });

  return (
    <group ref={groupRef}>
      {/* Central coil structure */}
      <mesh ref={coilBaseRef} position={[0, -1.5, 0]}>
        <cylinderGeometry args={[0.5, 0.8, 1, 32]} />
        <meshStandardMaterial 
          color={primaryColor}
          metalness={extractedColors?.isMetallic ? 0.95 : 0.9}
          roughness={extractedColors?.isMetallic ? 0.05 : 0.1}
          emissive={extractedColors?.isNeon ? primaryColor : secondaryColor}
          emissiveIntensity={extractedColors?.isNeon ? 0.2 : 0.1}
          map={texture || undefined}
        />
      </mesh>
      
      {/* Top terminal */}
      <mesh ref={topTerminalRef} position={[0, 1.5, 0]}>
        <sphereGeometry args={[0.4, 32, 32]} />
        <meshStandardMaterial 
          color={primaryColor}
          metalness={extractedColors?.isMetallic ? 0.98 : 0.95}
          roughness={extractedColors?.isMetallic ? 0.02 : 0.05}
          emissive={extractedColors?.isNeon ? primaryColor : accentColor}
          emissiveIntensity={extractedColors?.isNeon ? 0.3 : 0.2}
          map={texture || undefined}
        />
      </mesh>
      
      {/* Electric arcs */}
      {arcPaths.map((points, i) => {
        const curve = new THREE.CatmullRomCurve3(points);
        return (
          <mesh key={i} ref={(el: any) => { if (el) arcRefs.current[i] = el; }}>
            <tubeGeometry args={[curve, 50, 0.015, 8, false]} />
            <meshBasicMaterial 
              color={accentColor}
              transparent 
              opacity={0.6}
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
          size={0.02 * (1 + smoothedBass.current * 3)}
          transparent
          opacity={0.8}
          sizeAttenuation={true}
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
