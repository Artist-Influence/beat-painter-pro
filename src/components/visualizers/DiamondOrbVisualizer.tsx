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
    // Calculate audio per-frame - DETECT first, then apply multipliers for EFFECT
    // TRUE EQ SEPARATION: Bass 0-250Hz, Mids 250-4000Hz, Highs 4000Hz+
    let bassSum = 0, midsSum = 0, highsSum = 0;
    for (let i = 0; i <= 2; i++) bassSum += frequency[i] || 0;      // 0-250 Hz (kick/sub-bass)
    for (let i = 3; i <= 46; i++) midsSum += frequency[i] || 0;    // 250-4000 Hz (vocals/snare)
    for (let i = 47; i <= 255; i++) highsSum += frequency[i] || 0; // 4000+ Hz (hi-hats/cymbals)
    
    // Step 1: Detect normalized audio (0-1) WITHOUT multipliers
    const detectedBass = Math.min(bassSum / 3 / 255, 1.0);
    const detectedMids = Math.min(midsSum / 44 / 255, 1.0);
    const detectedHighs = Math.min(highsSum / 209 / 255, 1.0);
    
    // Step 2: Apply multipliers for EFFECT (controls reactivity)
    const rawBass = detectedBass * audioSensitivity.bassMultiplier;
    const rawMids = detectedMids * audioSensitivity.midsMultiplier;
    const rawHighs = detectedHighs * audioSensitivity.highsMultiplier;
    const rawBeat = Math.max(beatStrength, detectedBass);
    
    // Faster asymmetric smoothing for 170+ BPM
    const lerp = (current: number, target: number) => {
      const factor = target > current ? 0.9 : 0.5; // Very fast attack
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
    
    // Audio threshold check - use DETECTED values so hasAudio works correctly
    const audioThreshold = 0.02;
    const hasAudio = detectedBass > audioThreshold || detectedMids > audioThreshold || detectedHighs > audioThreshold;
    
    // Scale: BASE + TIGHTLY CLAMPED reactivity (multipliers control effect intensity, not base size)
    const beatExplosion = finalBeat > 0.2 ? 1 + (finalBeat - 0.2) * 0.3 : 1;
    const baseScale = 0.5;  // Constant base size
    // Each boost is clamped independently so high multipliers can't overflow
    const bassScaleBoost = Math.min(detectedBass * audioSensitivity.bassMultiplier * 0.12, 0.2);
    const midsScaleBoost = Math.min(detectedMids * audioSensitivity.midsMultiplier * 0.06, 0.1);

    if (group.current) {
      const animSpeed = audioSensitivity.animationSpeed;
      const spinSpeed = audioSensitivity.spinSpeed ?? 0;
      
      // Only rotate when spinSpeed > 0 OR audio is present
      if (spinSpeed > 0 || hasAudio) {
        baseRotation.current.y += (spinSpeed > 0 ? 0.02 * spinSpeed : 0) + (hasAudio ? 0.002 * animSpeed : 0);
        baseRotation.current.x += hasAudio ? 0.001 * animSpeed : 0;
      }
      
      // Audio OFFSET - snaps to beat, returns when silent (uses effect values)
      const audioOffsetY = hasAudio ? finalMids * Math.PI * 0.25 : 0;
      const audioOffsetX = hasAudio ? finalBeat * Math.PI * 0.15 : 0;
      
      // Final rotation = slow base + audio snap
      group.current.rotation.y = baseRotation.current.y + audioOffsetY;
      group.current.rotation.x = baseRotation.current.x + audioOffsetX;
      
      // Position proportional to audio (returns to 0 when silent)
      group.current.position.y = hasAudio ? finalBeat * 0.25 : 0;
      
      // Scale: BASE + reactivity boosts with hard cap to prevent going off-screen
      const finalScale = Math.min(baseScale + bassScaleBoost + midsScaleBoost, 0.85);
      group.current.scale.setScalar(finalScale * beatExplosion);
    }

    if (orb.current) {
      // Scale: BASE + reactivity
      const orbBase = 1.0;
      const orbBeatBoost = Math.min(finalBeat * 0.4, 0.6);
      const orbHighsBoost = Math.min(finalHighs * 0.2, 0.3);
      orb.current.scale.setScalar(orbBase + orbBeatBoost + orbHighsBoost);
      
      // Shake effect proportional to audio (returns to 0 when silent)
      const shakeIntensity = hasAudio ? finalBeat * 0.3 : 0;
      orb.current.position.x = hasAudio ? Math.sin(Date.now() * 0.02) * shakeIntensity : 0;
      orb.current.position.z = hasAudio ? Math.cos(Date.now() * 0.018) * shakeIntensity : 0;
    }

    if (innerCore.current) {
      const animSpeed = audioSensitivity.animationSpeed;
      const spinSpeed = audioSensitivity.spinSpeed ?? 0;
      
      // Only rotate when spinSpeed > 0 OR audio is present
      if (spinSpeed > 0 || hasAudio) {
        innerCoreBaseRotation.current.y += (spinSpeed > 0 ? 0.025 * spinSpeed : 0) + (hasAudio ? 0.003 * animSpeed : 0);
        innerCoreBaseRotation.current.x += hasAudio ? 0.002 * animSpeed : 0;
      }
      
      // Audio offset for inner core (uses effect values)
      const coreOffsetY = hasAudio ? finalMids * Math.PI * 0.3 : 0;
      const coreOffsetX = hasAudio ? finalHighs * Math.PI * 0.2 : 0;
      
      innerCore.current.rotation.y = innerCoreBaseRotation.current.y + coreOffsetY;
      innerCore.current.rotation.x = innerCoreBaseRotation.current.x + coreOffsetX;
      
      // Scale: BASE + reactivity
      const coreBase = 0.3;
      const coreBeatBoost = Math.min(finalBeat * 1.2, 1.5);
      innerCore.current.scale.setScalar(coreBase + coreBeatBoost);
    }

    shards.current.forEach((shard, i) => {
      if (shard) {
        const animSpeed = audioSensitivity.animationSpeed;
        const spinSpeed = audioSensitivity.spinSpeed ?? 0;
        
        // Only rotate when spinSpeed > 0 OR audio is present
        if (spinSpeed > 0 || hasAudio) {
          shardBaseRotations.current[i].y += (spinSpeed > 0 ? 0.015 * spinSpeed : 0) + (hasAudio ? 0.002 * animSpeed * (1 + i * 0.1) : 0);
          shardBaseRotations.current[i].x += hasAudio ? 0.001 * animSpeed * (1 + i * 0.05) : 0;
          shardBaseRotations.current[i].z += hasAudio ? 0.0015 * animSpeed : 0;
        }
        
        // Audio offset for shards (uses effect values)
        const shardOffsetY = hasAudio ? finalMids * Math.PI * 0.25 : 0;
        const shardOffsetX = hasAudio ? finalBeat * Math.PI * 0.35 : 0;
        const shardOffsetZ = hasAudio ? finalHighs * Math.PI * 0.3 : 0;
        
        shard.rotation.y = shardBaseRotations.current[i].y + shardOffsetY;
        shard.rotation.x = shardBaseRotations.current[i].x + shardOffsetX;
        shard.rotation.z = shardBaseRotations.current[i].z + shardOffsetZ;
        
        // Scale: BASE + reactivity
        const shardBase = 0.6;
        const shardBeatBoost = Math.min(finalBeat * 0.4, 0.5);
        const shardHighsBoost = Math.min(finalHighs * 0.2, 0.3);
        shard.scale.setScalar(shardBase + shardBeatBoost + shardHighsBoost);
        
        // Position expansion: BASE + reactivity
        const angle = (i / shards.current.length) * Math.PI * 2;
        const baseRadius = 1.3;
        const radiusBoost = hasAudio ? finalBeat * 0.4 : 0;
        const radius = baseRadius + radiusBoost;
        const targetX = Math.cos(angle) * radius;
        const targetZ = Math.sin(angle) * radius;
        const targetY = hasAudio ? finalBeat * 0.3 : 0;
        
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
    <group ref={group} scale={0.5}>
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
        count={28}
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
