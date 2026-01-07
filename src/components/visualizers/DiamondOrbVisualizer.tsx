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

  // Smooth audio values with interpolation
  const smoothedBass = useRef(0);
  const smoothedMids = useRef(0);
  const smoothedHighs = useRef(0);
  const smoothedBeat = useRef(0);

  useFrame(() => {
    const animSpeed = audioSensitivity.animationSpeed;
    
    // Calculate audio per-frame
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
    
    // Transient blend: 30% raw for immediate punch
    const finalBass = smoothedBass.current * 0.7 + rawBass * 0.3;
    const finalMids = smoothedMids.current * 0.7 + rawMids * 0.3;
    const finalHighs = smoothedHighs.current * 0.7 + rawHighs * 0.3;
    const finalBeat = smoothedBeat.current * 0.7 + rawBeat * 0.3;
    
    // Audio threshold check
    const audioThreshold = 0.02;
    const hasAudio = finalBass > audioThreshold || finalMids > audioThreshold || finalHighs > audioThreshold;
    
    const beatExplosion = finalBeat > 0.5 ? 1 + finalBeat * 0.8 : 1;
    const baseScale = 0.7 + 0.4 * amplitude;
    const scalePulse = 1 + 0.5 * finalBeat;

    if (group.current) {
      // Rotation ONLY when audio is present
      if (hasAudio) {
        group.current.rotation.y += finalMids * 0.15 * animSpeed;
        group.current.rotation.x += finalBeat * 0.1 * animSpeed;
      }
      
      // Position proportional to audio (returns to 0 when silent)
      group.current.position.y = finalBeat * 2.0;
      
      // Scale reacts to audio (returns to base when silent)
      group.current.scale.setScalar(baseScale * scalePulse * beatExplosion);
    }

    if (orb.current) {
      // Scale reacts to audio (returns to 1 when silent)
      const orbPulse = 1 + finalBeat * 1.2 + finalHighs * 0.9;
      orb.current.scale.setScalar(orbPulse);
      
      // Shake effect proportional to audio (returns to 0 when silent)
      const shakeIntensity = finalBeat * 0.4;
      orb.current.position.x = hasAudio ? Math.sin(Date.now() * 0.02) * shakeIntensity : 0;
      orb.current.position.z = hasAudio ? Math.cos(Date.now() * 0.018) * shakeIntensity : 0;
    }

    if (innerCore.current) {
      // Rotation ONLY when audio is present
      if (hasAudio) {
        innerCore.current.rotation.y += finalMids * 0.3 * animSpeed;
        innerCore.current.rotation.x += finalHighs * 0.25 * animSpeed;
      }
      // Scale reacts to audio
      const coreScale = 0.4 + finalBeat * 1.2;
      innerCore.current.scale.setScalar(coreScale);
    }

    shards.current.forEach((shard, i) => {
      if (shard) {
        // Rotation ONLY when audio is present
        if (hasAudio) {
          shard.rotation.y += finalMids * 0.25 * animSpeed;
          shard.rotation.x += finalBeat * 0.4 * animSpeed;
          shard.rotation.z += finalHighs * 0.3 * animSpeed;
        }
        
        // Scale reacts to audio
        const shardScale = 1.0 + finalBeat * 1.0 + finalHighs * 0.7;
        shard.scale.setScalar(shardScale);
        
        // Position expansion proportional to audio
        const angle = (i / shards.current.length) * Math.PI * 2;
        const radius = 1.2 + finalBeat * 2.0;
        const targetX = Math.cos(angle) * radius;
        const targetZ = Math.sin(angle) * radius;
        const targetY = finalBeat * 1.5;
        
        shard.position.x = THREE.MathUtils.lerp(shard.position.x, targetX, 0.1);
        shard.position.z = THREE.MathUtils.lerp(shard.position.z, targetZ, 0.1);
        shard.position.y = THREE.MathUtils.lerp(shard.position.y, targetY, 0.1);
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
        count={(smoothedHighs.current > 0.02 || smoothedBeat.current > 0.02) ? Math.round(8 + smoothedHighs.current * 20) : 0}
        scale={[1, 1, 1]}
        size={1 + smoothedHighs.current * 3 + smoothedBeat.current * 2}
        speed={(smoothedHighs.current > 0.02 || smoothedBeat.current > 0.02) ? (0.4 + smoothedHighs.current * 1 + smoothedBeat.current * 1.5) : 0}
        opacity={0.02 + 0.03 * smoothedHighs.current + smoothedBeat.current * 0.02}
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
