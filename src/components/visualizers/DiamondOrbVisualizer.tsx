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
  
  // Base rotation refs for position-based rotation
  const baseRotation = useRef({ x: 0, y: 0, z: 0 });
  const innerCoreBaseRotation = useRef({ x: 0, y: 0, z: 0 });
  const shardBaseRotations = useRef<{ x: number; y: number; z: number }[]>(
    Array(16).fill(null).map(() => ({ x: 0, y: 0, z: 0 }))
  );

  useFrame(() => {
    // Calculate audio per-frame
    let bassSum = 0, midsSum = 0, highsSum = 0;
    for (let i = 0; i <= 85; i++) bassSum += frequency[i] || 0;
    for (let i = 86; i <= 170; i++) midsSum += frequency[i] || 0;
    for (let i = 171; i <= 255; i++) highsSum += frequency[i] || 0;
    
    const rawBass = Math.min((bassSum / 86 / 255) * audioSensitivity.bassMultiplier, 1.0);
    const rawMids = Math.min((midsSum / 85 / 255) * audioSensitivity.midsMultiplier, 1.0);
    const rawHighs = Math.min((highsSum / 85 / 255) * audioSensitivity.highsMultiplier, 1.0);
    const rawBeat = Math.max(beatStrength, rawBass);
    
    // Asymmetric smoothing: faster attack (0.85), fast decay (0.45) for zero-latency beat tracking
    const lerp = (current: number, target: number) => {
      const factor = target > current ? 0.85 : 0.45;
      return current + (target - current) * factor;
    };
    smoothedBass.current = lerp(smoothedBass.current, rawBass);
    smoothedMids.current = lerp(smoothedMids.current, rawMids);
    smoothedHighs.current = lerp(smoothedHighs.current, rawHighs);
    smoothedBeat.current = lerp(smoothedBeat.current, rawBeat);
    
    // Transient blend: 60% raw for immediate punch (zero-latency)
    const finalBass = smoothedBass.current * 0.4 + rawBass * 0.6;
    const finalMids = smoothedMids.current * 0.4 + rawMids * 0.6;
    const finalHighs = smoothedHighs.current * 0.4 + rawHighs * 0.6;
    const finalBeat = smoothedBeat.current * 0.4 + rawBeat * 0.6;
    
    // Audio threshold check
    const audioThreshold = 0.02;
    const hasAudio = finalBass > audioThreshold || finalMids > audioThreshold || finalHighs > audioThreshold;
    
    // Bigger scale variations - lower threshold, bigger effect
    const beatExplosion = finalBeat > 0.4 ? 1 + finalBeat * 1.2 : 1;
    const baseScale = 0.6 + 0.5 * amplitude;
    const scalePulse = 1 + 0.8 * finalBeat;

    if (group.current) {
      // Base rotation advances slowly (controlled by animationSpeed) + spin speed
      const animSpeed = audioSensitivity.animationSpeed;
      const spinSpeed = audioSensitivity.spinSpeed ?? 0;
      baseRotation.current.y += 0.002 * animSpeed + 0.02 * spinSpeed;
      baseRotation.current.x += 0.001 * animSpeed;
      
      // Audio OFFSET - snaps to beat, returns when silent
      const audioOffsetY = hasAudio ? finalMids * Math.PI * 0.3 : 0;
      const audioOffsetX = hasAudio ? finalBeat * Math.PI * 0.2 : 0;
      
      // Final rotation = slow base + audio snap
      group.current.rotation.y = baseRotation.current.y + audioOffsetY;
      group.current.rotation.x = baseRotation.current.x + audioOffsetX;
      
      // Position proportional to audio (returns to 0 when silent)
      group.current.position.y = finalBeat * 2.0;
      
      // Scale reacts to audio (returns to base when silent) - much bigger
      group.current.scale.setScalar(baseScale * scalePulse * beatExplosion);
    }

    if (orb.current) {
      // Scale reacts to audio (returns to 1 when silent) - much bigger
      const orbPulse = 1 + finalBeat * 1.8 + finalHighs * 1.2;
      orb.current.scale.setScalar(orbPulse);
      
      // Shake effect proportional to audio (returns to 0 when silent)
      const shakeIntensity = finalBeat * 0.4;
      orb.current.position.x = hasAudio ? Math.sin(Date.now() * 0.02) * shakeIntensity : 0;
      orb.current.position.z = hasAudio ? Math.cos(Date.now() * 0.018) * shakeIntensity : 0;
    }

    if (innerCore.current) {
      // Base rotation for inner core
      const animSpeed = audioSensitivity.animationSpeed;
      const spinSpeed = audioSensitivity.spinSpeed ?? 0;
      innerCoreBaseRotation.current.y += 0.003 * animSpeed + 0.025 * spinSpeed;
      innerCoreBaseRotation.current.x += 0.002 * animSpeed;
      
      // Audio offset for inner core
      const coreOffsetY = hasAudio ? finalMids * Math.PI * 0.4 : 0;
      const coreOffsetX = hasAudio ? finalHighs * Math.PI * 0.3 : 0;
      
      innerCore.current.rotation.y = innerCoreBaseRotation.current.y + coreOffsetY;
      innerCore.current.rotation.x = innerCoreBaseRotation.current.x + coreOffsetX;
      
      // Scale reacts to audio - bigger range
      const coreScale = 0.3 + finalBeat * 1.8;
      innerCore.current.scale.setScalar(coreScale);
    }

    shards.current.forEach((shard, i) => {
      if (shard) {
        const animSpeed = audioSensitivity.animationSpeed;
        const spinSpeed = audioSensitivity.spinSpeed ?? 0;
        
        // Base rotation for each shard
        shardBaseRotations.current[i].y += 0.002 * animSpeed * (1 + i * 0.1) + 0.015 * spinSpeed;
        shardBaseRotations.current[i].x += 0.001 * animSpeed * (1 + i * 0.05);
        shardBaseRotations.current[i].z += 0.0015 * animSpeed;
        
        // Audio offset for shards
        const shardOffsetY = hasAudio ? finalMids * Math.PI * 0.35 : 0;
        const shardOffsetX = hasAudio ? finalBeat * Math.PI * 0.5 : 0;
        const shardOffsetZ = hasAudio ? finalHighs * Math.PI * 0.4 : 0;
        
        shard.rotation.y = shardBaseRotations.current[i].y + shardOffsetY;
        shard.rotation.x = shardBaseRotations.current[i].x + shardOffsetX;
        shard.rotation.z = shardBaseRotations.current[i].z + shardOffsetZ;
        
        // Scale reacts to audio - starts smaller, grows bigger
        const shardScale = 0.8 + finalBeat * 1.5 + finalHighs * 1.0;
        shard.scale.setScalar(shardScale);
        
        // Position expansion proportional to audio
        const angle = (i / shards.current.length) * Math.PI * 2;
        const radius = 1.2 + finalBeat * 2.0;
        const targetX = Math.cos(angle) * radius;
        const targetZ = Math.sin(angle) * radius;
        const targetY = finalBeat * 1.5;
        
        // Direct position (no lerp) for zero latency
        shard.position.x = targetX;
        shard.position.z = targetZ;
        shard.position.y = targetY;
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
          emissive={primaryColor}
          emissiveIntensity={extractedColors?.isNeon ? 0.5 : 0.15}
        />
      </mesh>
      <mesh ref={innerCore} geometry={innerGeom}>
        <meshStandardMaterial 
          color={secondaryColor} 
          roughness={extractedColors?.isMetallic ? 0.15 : 0.3} 
          metalness={extractedColors?.isMetallic ? 0.9 : 0.85}
          map={texture || undefined}
          emissive={secondaryColor}
          emissiveIntensity={extractedColors?.isNeon ? 0.4 : 0.1}
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
            emissive={accentColor}
            emissiveIntensity={extractedColors?.isNeon ? 0.6 : 0.2}
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
