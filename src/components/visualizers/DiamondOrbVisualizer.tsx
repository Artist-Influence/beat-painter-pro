import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment, Sparkles } from "@react-three/drei";
import * as THREE from "three";
import { VisualizerProps } from ".";
import { useStudioStore } from "@/stores/studioStore";

function CrackedCrystalOrb({ audioData }: any) {
  const group = useRef<THREE.Group>(null);
  const orb = useRef<THREE.Mesh>(null);
  const innerCore = useRef<THREE.Mesh>(null);
  const shards = useRef<THREE.Mesh[]>([]);
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

  // Smooth audio values with interpolation
  const smoothedBass = useRef(0);
  const smoothedMids = useRef(0);
  const smoothedHighs = useRef(0);
  const smoothedBeat = useRef(0);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    const animSpeed = audioSensitivity.animationSpeed;
    const amp = amplitude;
    const beat = Math.max(beatStrength, bass);
    
    // Smooth audio interpolation for fluid movement
    const lerp = 0.15;
    smoothedBass.current = THREE.MathUtils.lerp(smoothedBass.current, bass, lerp);
    smoothedMids.current = THREE.MathUtils.lerp(smoothedMids.current, mids, lerp);
    smoothedHighs.current = THREE.MathUtils.lerp(smoothedHighs.current, highs, lerp);
    smoothedBeat.current = THREE.MathUtils.lerp(smoothedBeat.current, beat, lerp);
    
    const scalePulse = 1 + 0.5 * smoothedBeat.current + 0.15 * Math.sin(time * 6 * animSpeed);
    const baseScale = 0.7 + 0.4 * amp;
    
    const beatExplosion = smoothedBeat.current > 0.5 ? 1 + smoothedBeat.current * 0.8 : 1;

    if (group.current) {
      group.current.rotation.y = time * 1.2 * animSpeed + smoothedMids.current * 3.0;
      group.current.rotation.x = Math.sin(time * 2.0 * animSpeed) * 0.6 + smoothedBeat.current * 1.5;
      group.current.position.y = 0.8 * Math.sin(time * 3 * animSpeed) + smoothedBeat.current * 2.0;
      group.current.scale.setScalar(baseScale * scalePulse * beatExplosion);
    }

    if (orb.current) {
      const orbPulse = 1 + smoothedBeat.current * 1.2 + smoothedHighs.current * 0.9;
      orb.current.scale.setScalar(orbPulse);
      
      // Smoother shake effect
      const shakeIntensity = smoothedBeat.current * 0.4;
      orb.current.position.x = Math.sin(time * 20 * animSpeed) * shakeIntensity;
      orb.current.position.z = Math.cos(time * 18 * animSpeed) * shakeIntensity;
    }

    if (innerCore.current) {
      innerCore.current.rotation.y = time * 4.0 * animSpeed + smoothedMids.current * 6.0;
      innerCore.current.rotation.x = time * 3.5 * animSpeed + smoothedHighs.current * 5.0;
      const coreScale = 0.4 + 0.5 * Math.sin(time * 6 * animSpeed) + smoothedBeat.current * 1.2;
      innerCore.current.scale.setScalar(coreScale);
    }

    shards.current.forEach((shard, i) => {
      if (shard) {
        const angle = (i / shards.current.length) * Math.PI * 2 + time * 3 * animSpeed;
        const radius = 1.2 + 1.0 * Math.sin(time * 4 * animSpeed + i) + smoothedBeat.current * 2.0;
        
        // Smoother orbital motion
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const y = Math.sin(time * 4.0 * animSpeed + i * 0.5) * 0.8 + smoothedBeat.current * 1.5;
        
        // Smooth position interpolation
        shard.position.x = THREE.MathUtils.lerp(shard.position.x, x, 0.1);
        shard.position.z = THREE.MathUtils.lerp(shard.position.z, z, 0.1);
        shard.position.y = THREE.MathUtils.lerp(shard.position.y, y, 0.1);
        
        shard.rotation.y = time * 5.0 * animSpeed + i * 0.8;
        shard.rotation.x = time * 4.0 * animSpeed + smoothedBeat.current * 8.0;
        shard.rotation.z = time * 3.0 * animSpeed + smoothedHighs.current * 10.0;
        
        const shardScale = 1.0 + smoothedBeat.current * 1.0 + smoothedHighs.current * 0.7;
        shard.scale.setScalar(shardScale);
      }
    });
  });

  const outerGeom = useMemo(() => {
    const geo = new THREE.IcosahedronGeometry(1, 4);
    geo.computeVertexNormals();
    return geo;
  }, []);

  const innerGeom = useMemo(() => {
    return new THREE.OctahedronGeometry(0.65, 3);
  }, []);

  const shardGeom = useMemo(() => {
    return new THREE.TetrahedronGeometry(0.25, 1);
  }, []);

  return (
    <group ref={group} scale={1.0}>
      <mesh ref={orb} geometry={outerGeom}>
        <meshStandardMaterial 
          color={primaryColor} 
          roughness={extractedColors?.isMetallic ? 0.1 : 0.25} 
          metalness={extractedColors?.isMetallic ? 0.95 : 0.9}
           map={texture || undefined}
          emissive={extractedColors?.isNeon ? primaryColor : '#000000'}
          emissiveIntensity={extractedColors?.isNeon ? 0.3 : 0}
        />
      </mesh>
      <mesh ref={innerCore} geometry={innerGeom}>
        <meshStandardMaterial 
          color={secondaryColor} 
          roughness={extractedColors?.isMetallic ? 0.15 : 0.3} 
          metalness={extractedColors?.isMetallic ? 0.9 : 0.85}
           map={texture || undefined}
          emissive={extractedColors?.isNeon ? secondaryColor : '#000000'}
          emissiveIntensity={extractedColors?.isNeon ? 0.2 : 0}
        />
      </mesh>
      {Array.from({ length: 16 }).map((_, i) => (
        <mesh
          key={i}
          ref={(el) => (shards.current[i] = el as any)}
          geometry={shardGeom}
          position={[0, 0, 0]}
        >
          <meshStandardMaterial 
            color={accentColor} 
            roughness={extractedColors?.isMetallic ? 0.05 : 0.2} 
            metalness={extractedColors?.isMetallic ? 0.98 : 0.95}
             map={texture || undefined}
            emissive={extractedColors?.isNeon ? accentColor : '#000000'}
            emissiveIntensity={extractedColors?.isNeon ? 0.4 : 0}
          />
        </mesh>
      ))}
      <Sparkles
        count={8 + highs * 20}
        scale={[1, 1, 1]}
        size={1 + highs * 3 + Math.max(beatStrength, bass) * 2}
        speed={0.4 + highs * 1 + Math.max(beatStrength, bass) * 1.5}
        opacity={0.02 + 0.03 * highs + Math.max(beatStrength, bass) * 0.02}
        color={accentColor}
      />
    </group>
  );
}

export default function DiamondOrbVisualizer({
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
      <ambientLight intensity={0.85} />
      <directionalLight position={[4, 7, 6]} intensity={0.9} />
      <Environment preset="city" />
      <CrackedCrystalOrb audioData={audioData} />
      <group>
        <mesh position={[0, -8, 0]}>
          <planeGeometry args={[8.6, 8.6]} />
          <meshBasicMaterial color={backgroundColor} transparent opacity={0} />
        </mesh>
      </group>
    </>
  );
}
