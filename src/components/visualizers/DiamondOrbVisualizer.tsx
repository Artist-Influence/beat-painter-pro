import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment, Sparkles } from "@react-three/drei";
import * as THREE from "three";
import { VisualizerProps } from ".";

function CrackedCrystalOrb({ audioData }: any) {
  const group = useRef<THREE.Group>(null);
  const orb = useRef<THREE.Mesh>(null);
  const innerCore = useRef<THREE.Mesh>(null);
  const shards = useRef<THREE.Mesh[]>([]);

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
    return sum / 86 / 255;
  }, [frequency]);

  const mids = useMemo(() => {
    let sum = 0;
    for (let i = 86; i <= 170; i++) sum += frequency[i] || 0;
    return sum / 85 / 255;
  }, [frequency]);

  const highs = useMemo(() => {
    let sum = 0;
    for (let i = 171; i <= 255; i++) sum += frequency[i] || 0;
    return sum / 85 / 255;
  }, [frequency]);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    const amp = amplitude;
    const beat = Math.max(beatStrength, bass);
    
    const scalePulse = 1 + 0.6 * beat + 0.15 * Math.sin(time * 6);
    const baseScale = 0.4 + 0.3 * amp;
    
    const beatExplosion = beat > 0.7 ? 1 + beat * 0.8 : 1;

    if (group.current) {
      group.current.rotation.y = time * 0.8 + mids * 2.0;
      group.current.rotation.x = Math.sin(time * 1.5) * 0.6 + beat * 1.2;
      group.current.position.y = 0.8 * Math.sin(time * 3) + beat * 2.0;
      group.current.scale.setScalar(baseScale * scalePulse * beatExplosion);
    }

    if (orb.current) {
      const orbPulse = 1 + beat * 0.8 + highs * 0.6;
      orb.current.scale.setScalar(orbPulse);
      
      if (beat > 0.6) {
        orb.current.position.x = (Math.random() - 0.5) * beat * 0.3;
        orb.current.position.z = (Math.random() - 0.5) * beat * 0.3;
      } else {
        orb.current.position.x = 0;
        orb.current.position.z = 0;
      }
    }

    if (innerCore.current) {
      innerCore.current.rotation.y = time * 3.0 + mids * 4.0;
      innerCore.current.rotation.x = time * 2.5 + highs * 3.0;
      const coreScale = 0.3 + 0.4 * Math.sin(time * 4) + beat * 0.8;
      innerCore.current.scale.setScalar(coreScale);
    }

    shards.current.forEach((shard, i) => {
      if (shard) {
        const angle = (i / shards.current.length) * Math.PI * 2 + time * 2;
        const radius = 1.0 + 0.8 * Math.sin(time * 3 + i) + beat * 1.2;
        
        shard.position.x = Math.cos(angle) * radius + (Math.random() - 0.5) * beat * 0.4;
        shard.position.z = Math.sin(angle) * radius + (Math.random() - 0.5) * beat * 0.4;
        shard.position.y = Math.sin(time * 2.5 + i) * 0.6 + beat * 0.8;
        
        shard.rotation.y = time * 4.0 + i * 0.5;
        shard.rotation.x = time * 3.0 + beat * 6.0;
        shard.rotation.z = time * 2.0 + highs * 8.0;
        
        const shardScale = 0.8 + beat * 0.6 + highs * 0.4;
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
    <group ref={group} scale={0.18}>
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
