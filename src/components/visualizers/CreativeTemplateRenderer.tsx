import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { CreativeTemplateType } from '@/lib/randomVisualizerGenerator';
import { useStudioStore } from '@/stores/studioStore';
import { useVisualizerTexture, createVisualizerMaterial } from '@/hooks/useVisualizerTexture';

interface CreativeTemplateRendererProps {
  templateType: CreativeTemplateType;
  audioData: {
    frequency: number[];
    amplitude: number;
    beatStrength: number;
  };
}

// Audio analysis helper
function analyzeAudio(frequency: number[]) {
  const freq = frequency || [];
  const bassRange = freq.slice(0, 3);
  const midRange = freq.slice(3, 47);
  const highRange = freq.slice(47);
  
  return {
    bass: bassRange.length > 0 ? bassRange.reduce((a, b) => a + b, 0) / bassRange.length / 255 : 0,
    mids: midRange.length > 0 ? midRange.reduce((a, b) => a + b, 0) / midRange.length / 255 : 0,
    highs: highRange.length > 0 ? highRange.reduce((a, b) => a + b, 0) / highRange.length / 255 : 0,
  };
}

// ===================== TEMPLATE COMPONENTS =====================

function SmileyTemplate({ audioData }: { audioData: CreativeTemplateRendererProps['audioData'] }) {
  const groupRef = useRef<THREE.Group>(null);
  const leftEyeRef = useRef<THREE.Group>(null);
  const rightEyeRef = useRef<THREE.Group>(null);
  const mouthRef = useRef<THREE.Group>(null);
  const audioSensitivity = useStudioStore((s) => s.audioSensitivity);
  const smoothedBass = useRef(0);
  const smoothedMids = useRef(0);
  
  const material = useMemo(() => createVisualizerMaterial(), []);
  
  const mouthSegments = useMemo(() => {
    const segments = [];
    for (let i = 0; i < 15; i++) {
      const t = (i / 14) * Math.PI;
      segments.push({ id: i, baseX: Math.cos(t) * 1.5, baseY: -1.2 });
    }
    return segments;
  }, []);
  
  useFrame(({ clock }) => {
    const { bass, mids, highs } = analyzeAudio(audioData.frequency);
    smoothedBass.current = THREE.MathUtils.lerp(smoothedBass.current, bass * audioSensitivity.bassMultiplier, 0.12);
    smoothedMids.current = THREE.MathUtils.lerp(smoothedMids.current, mids * audioSensitivity.midsMultiplier, 0.15);
    
    if (groupRef.current) {
      groupRef.current.scale.setScalar(1 + smoothedBass.current * 0.15);
      groupRef.current.rotation.y = Math.sin(clock.getElapsedTime() * 0.3) * 0.1;
    }
    
    if (leftEyeRef.current && rightEyeRef.current) {
      const eyeSquint = 1 - smoothedBass.current * 0.5;
      leftEyeRef.current.scale.y = Math.max(0.3, eyeSquint);
      rightEyeRef.current.scale.y = Math.max(0.3, eyeSquint);
    }
    
    if (mouthRef.current) {
      const smileFactor = (smoothedBass.current - highs) * 2;
      mouthRef.current.children.forEach((child, i) => {
        const seg = mouthSegments[i];
        if (seg && child) {
          const smileY = smileFactor * Math.sin((i / 14) * Math.PI) * 0.5;
          child.position.y = seg.baseY + smileY;
        }
      });
    }
  });
  
  return (
    <group ref={groupRef} scale={0.4}>
      <mesh><sphereGeometry args={[3, 32, 32]} /><primitive object={material} /></mesh>
      <group ref={leftEyeRef} position={[-0.9, 0.7, 2.5]}>
        <mesh><sphereGeometry args={[0.5, 16, 16]} /><primitive object={material} /></mesh>
      </group>
      <group ref={rightEyeRef} position={[0.9, 0.7, 2.5]}>
        <mesh><sphereGeometry args={[0.5, 16, 16]} /><primitive object={material} /></mesh>
      </group>
      <group ref={mouthRef}>
        {mouthSegments.map((seg) => (
          <mesh key={seg.id} position={[seg.baseX, seg.baseY, 2.6]}>
            <sphereGeometry args={[0.15, 8, 8]} /><primitive object={material} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function WingsTemplate({ audioData }: { audioData: CreativeTemplateRendererProps['audioData'] }) {
  const groupRef = useRef<THREE.Group>(null);
  const leftWingRef = useRef<THREE.Group>(null);
  const rightWingRef = useRef<THREE.Group>(null);
  const audioSensitivity = useStudioStore((s) => s.audioSensitivity);
  const smoothedBass = useRef(0);
  const material = useMemo(() => createVisualizerMaterial(), []);
  
  const feathers = useMemo(() => {
    const left = [];
    const right = [];
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 0.7;
      const length = 0.3 + i * 0.12;
      left.push({ angle, length, delay: i * 0.1 });
      right.push({ angle: -angle, length, delay: i * 0.1 });
    }
    return { left, right };
  }, []);
  
  useFrame(({ clock }) => {
    const { bass } = analyzeAudio(audioData.frequency);
    smoothedBass.current = THREE.MathUtils.lerp(smoothedBass.current, bass * audioSensitivity.bassMultiplier, 0.15);
    const t = clock.getElapsedTime();
    const flapAngle = Math.sin(t * 2 + smoothedBass.current * 4) * 0.4 * (1 + smoothedBass.current);
    
    if (leftWingRef.current) leftWingRef.current.rotation.z = 0.3 + flapAngle;
    if (rightWingRef.current) rightWingRef.current.rotation.z = -0.3 - flapAngle;
    if (groupRef.current) groupRef.current.scale.setScalar(1.5 + smoothedBass.current * 0.2);
  });
  
  return (
    <group ref={groupRef}>
      <group ref={leftWingRef} position={[-0.3, 0, 0]}>
        {feathers.left.map((f, i) => (
          <mesh key={i} position={[Math.cos(f.angle) * f.length - 0.2, Math.sin(f.angle) * f.length * 0.5, 0]} rotation={[0, 0, f.angle]}>
            <capsuleGeometry args={[0.04, f.length, 4, 8]} /><primitive object={material} />
          </mesh>
        ))}
      </group>
      <group ref={rightWingRef} position={[0.3, 0, 0]}>
        {feathers.right.map((f, i) => (
          <mesh key={i} position={[Math.cos(f.angle) * f.length + 0.2, Math.sin(f.angle) * f.length * 0.5, 0]} rotation={[0, 0, f.angle]}>
            <capsuleGeometry args={[0.04, f.length, 4, 8]} /><primitive object={material} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function DragonTemplate({ audioData }: { audioData: CreativeTemplateRendererProps['audioData'] }) {
  const groupRef = useRef<THREE.Group>(null);
  const jawRef = useRef<THREE.Mesh>(null);
  const audioSensitivity = useStudioStore((s) => s.audioSensitivity);
  const smoothedBass = useRef(0);
  const material = useMemo(() => createVisualizerMaterial(), []);
  
  useFrame(({ clock }) => {
    const { bass, mids } = analyzeAudio(audioData.frequency);
    smoothedBass.current = THREE.MathUtils.lerp(smoothedBass.current, bass * audioSensitivity.bassMultiplier, 0.12);
    const t = clock.getElapsedTime();
    
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(t * 0.5) * 0.2;
      groupRef.current.scale.setScalar(1.2 + smoothedBass.current * 0.3);
    }
    if (jawRef.current) {
      jawRef.current.rotation.x = smoothedBass.current * 0.6;
    }
  });
  
  return (
    <group ref={groupRef}>
      {/* Head */}
      <mesh position={[0, 0, 0.5]}><coneGeometry args={[0.8, 1.5, 6]} /><primitive object={material} /></mesh>
      {/* Snout */}
      <mesh position={[0, 0, 1.2]} rotation={[Math.PI / 2, 0, 0]}><coneGeometry args={[0.4, 0.8, 4]} /><primitive object={material} /></mesh>
      {/* Lower jaw */}
      <mesh ref={jawRef} position={[0, -0.3, 1]}><boxGeometry args={[0.6, 0.15, 0.5]} /><primitive object={material} /></mesh>
      {/* Eyes */}
      <mesh position={[-0.4, 0.3, 0.8]}><sphereGeometry args={[0.15, 12, 12]} /><primitive object={material} /></mesh>
      <mesh position={[0.4, 0.3, 0.8]}><sphereGeometry args={[0.15, 12, 12]} /><primitive object={material} /></mesh>
      {/* Horns */}
      <mesh position={[-0.5, 0.5, -0.2]} rotation={[0, 0, -0.4]}><coneGeometry args={[0.1, 0.5, 4]} /><primitive object={material} /></mesh>
      <mesh position={[0.5, 0.5, -0.2]} rotation={[0, 0, 0.4]}><coneGeometry args={[0.1, 0.5, 4]} /><primitive object={material} /></mesh>
      {/* Spines */}
      {[0, 1, 2, 3].map(i => (
        <mesh key={i} position={[0, 0.4 - i * 0.15, -0.5 - i * 0.3]} rotation={[-0.3, 0, 0]}>
          <coneGeometry args={[0.08, 0.3 - i * 0.05, 4]} /><primitive object={material} />
        </mesh>
      ))}
    </group>
  );
}

function SpaceshipTemplate({ audioData }: { audioData: CreativeTemplateRendererProps['audioData'] }) {
  const groupRef = useRef<THREE.Group>(null);
  const audioSensitivity = useStudioStore((s) => s.audioSensitivity);
  const smoothedBass = useRef(0);
  const smoothedMids = useRef(0);
  const material = useMemo(() => createVisualizerMaterial(), []);
  
  useFrame(({ clock }) => {
    const { bass, mids } = analyzeAudio(audioData.frequency);
    smoothedBass.current = THREE.MathUtils.lerp(smoothedBass.current, bass * audioSensitivity.bassMultiplier, 0.1);
    smoothedMids.current = THREE.MathUtils.lerp(smoothedMids.current, mids * audioSensitivity.midsMultiplier, 0.12);
    const t = clock.getElapsedTime();
    
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(t * 1.5) * 0.2 + smoothedBass.current * 0.3;
      groupRef.current.rotation.z = Math.sin(t * 0.8) * 0.1;
      groupRef.current.rotation.y = t * 0.5 * audioSensitivity.spinSpeed;
      groupRef.current.scale.setScalar(1.3 + smoothedMids.current * 0.2);
    }
  });
  
  return (
    <group ref={groupRef}>
      {/* Dome */}
      <mesh position={[0, 0.3, 0]}><sphereGeometry args={[0.5, 24, 24, 0, Math.PI * 2, 0, Math.PI / 2]} /><primitive object={material} /></mesh>
      {/* Body disc */}
      <mesh><cylinderGeometry args={[1.2, 1, 0.25, 24]} /><primitive object={material} /></mesh>
      {/* Bottom */}
      <mesh position={[0, -0.2, 0]}><cylinderGeometry args={[0.6, 0.3, 0.2, 16]} /><primitive object={material} /></mesh>
      {/* Lights around edge */}
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(angle) * 1, 0, Math.sin(angle) * 1]}>
            <sphereGeometry args={[0.08, 8, 8]} /><primitive object={material} />
          </mesh>
        );
      })}
    </group>
  );
}

function SkullTemplate({ audioData }: { audioData: CreativeTemplateRendererProps['audioData'] }) {
  const groupRef = useRef<THREE.Group>(null);
  const jawRef = useRef<THREE.Mesh>(null);
  const audioSensitivity = useStudioStore((s) => s.audioSensitivity);
  const smoothedBass = useRef(0);
  const material = useMemo(() => createVisualizerMaterial(), []);
  
  useFrame(({ clock }) => {
    const { bass } = analyzeAudio(audioData.frequency);
    smoothedBass.current = THREE.MathUtils.lerp(smoothedBass.current, bass * audioSensitivity.bassMultiplier, 0.15);
    
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(clock.getElapsedTime() * 0.3) * 0.15;
      groupRef.current.scale.setScalar(1.4 + smoothedBass.current * 0.2);
    }
    if (jawRef.current) {
      jawRef.current.rotation.x = smoothedBass.current * 0.5;
      jawRef.current.position.y = -0.5 - smoothedBass.current * 0.15;
    }
  });
  
  return (
    <group ref={groupRef}>
      {/* Cranium */}
      <mesh position={[0, 0.3, 0]}><sphereGeometry args={[0.8, 24, 24]} /><primitive object={material} /></mesh>
      {/* Face */}
      <mesh position={[0, -0.1, 0.5]}><boxGeometry args={[0.6, 0.5, 0.3]} /><primitive object={material} /></mesh>
      {/* Eye sockets */}
      <mesh position={[-0.25, 0.1, 0.7]}><sphereGeometry args={[0.15, 12, 12]} /><meshBasicMaterial color="#000000" /></mesh>
      <mesh position={[0.25, 0.1, 0.7]}><sphereGeometry args={[0.15, 12, 12]} /><meshBasicMaterial color="#000000" /></mesh>
      {/* Nose hole */}
      <mesh position={[0, -0.15, 0.7]}><boxGeometry args={[0.12, 0.15, 0.1]} /><meshBasicMaterial color="#000000" /></mesh>
      {/* Jaw */}
      <mesh ref={jawRef} position={[0, -0.5, 0.3]}><boxGeometry args={[0.5, 0.25, 0.35]} /><primitive object={material} /></mesh>
      {/* Teeth */}
      {[-0.15, -0.05, 0.05, 0.15].map((x, i) => (
        <mesh key={i} position={[x, -0.3, 0.55]}><boxGeometry args={[0.08, 0.12, 0.05]} /><primitive object={material} /></mesh>
      ))}
    </group>
  );
}

function LightningTemplate({ audioData }: { audioData: CreativeTemplateRendererProps['audioData'] }) {
  const groupRef = useRef<THREE.Group>(null);
  const audioSensitivity = useStudioStore((s) => s.audioSensitivity);
  const smoothedBass = useRef(0);
  const material = useMemo(() => createVisualizerMaterial(), []);
  
  const boltPoints = useMemo(() => {
    const points = [];
    let y = 1.5;
    let x = 0;
    for (let i = 0; i < 8; i++) {
      x += (Math.random() - 0.5) * 0.6;
      y -= 0.4;
      points.push({ x, y, z: 0 });
    }
    return points;
  }, []);
  
  useFrame(() => {
    const { bass } = analyzeAudio(audioData.frequency);
    smoothedBass.current = THREE.MathUtils.lerp(smoothedBass.current, bass * audioSensitivity.bassMultiplier, 0.2);
    
    if (groupRef.current) {
      groupRef.current.scale.setScalar(1.2 + smoothedBass.current * 0.5);
      // Flash effect on beats
      groupRef.current.children.forEach(child => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
          child.material.emissiveIntensity = 0.5 + smoothedBass.current * 2;
        }
      });
    }
  });
  
  return (
    <group ref={groupRef}>
      {boltPoints.map((point, i) => {
        if (i === 0) return null;
        const prev = boltPoints[i - 1];
        const midX = (point.x + prev.x) / 2;
        const midY = (point.y + prev.y) / 2;
        const length = Math.sqrt(Math.pow(point.x - prev.x, 2) + Math.pow(point.y - prev.y, 2));
        const angle = Math.atan2(point.y - prev.y, point.x - prev.x);
        return (
          <mesh key={i} position={[midX, midY, 0]} rotation={[0, 0, angle + Math.PI / 2]}>
            <boxGeometry args={[0.15 - i * 0.01, length, 0.1]} /><primitive object={material} />
          </mesh>
        );
      })}
    </group>
  );
}

function EyeTemplate({ audioData }: { audioData: CreativeTemplateRendererProps['audioData'] }) {
  const groupRef = useRef<THREE.Group>(null);
  const irisRef = useRef<THREE.Group>(null);
  const pupilRef = useRef<THREE.Mesh>(null);
  const audioSensitivity = useStudioStore((s) => s.audioSensitivity);
  const smoothedBass = useRef(0);
  const material = useMemo(() => createVisualizerMaterial(), []);
  
  useFrame(({ clock }) => {
    const { bass, mids } = analyzeAudio(audioData.frequency);
    smoothedBass.current = THREE.MathUtils.lerp(smoothedBass.current, bass * audioSensitivity.bassMultiplier, 0.12);
    
    if (pupilRef.current) pupilRef.current.scale.setScalar(0.3 + smoothedBass.current * 0.4);
    if (irisRef.current) irisRef.current.rotation.z = clock.getElapsedTime() * 0.5 + mids * 2;
    if (groupRef.current) groupRef.current.scale.setScalar(1.5 + smoothedBass.current * 0.15);
  });
  
  return (
    <group ref={groupRef}>
      <mesh><sphereGeometry args={[1, 32, 32]} /><meshStandardMaterial color="#ffffff" /></mesh>
      <group ref={irisRef} position={[0, 0, 0.5]}>
        <mesh><circleGeometry args={[0.6, 32]} /><primitive object={material} /></mesh>
        {Array.from({ length: 12 }).map((_, i) => (
          <mesh key={i} rotation={[0, 0, (i / 12) * Math.PI * 2]}>
            <boxGeometry args={[0.5, 0.02, 0.01]} /><primitive object={material} />
          </mesh>
        ))}
      </group>
      <mesh ref={pupilRef} position={[0, 0, 0.55]}><circleGeometry args={[0.3, 32]} /><meshBasicMaterial color="#000000" /></mesh>
    </group>
  );
}

function PhoenixTemplate({ audioData }: { audioData: CreativeTemplateRendererProps['audioData'] }) {
  const groupRef = useRef<THREE.Group>(null);
  const wingsRef = useRef<THREE.Group>(null);
  const audioSensitivity = useStudioStore((s) => s.audioSensitivity);
  const smoothedBass = useRef(0);
  const material = useMemo(() => createVisualizerMaterial(), []);
  
  useFrame(({ clock }) => {
    const { bass } = analyzeAudio(audioData.frequency);
    smoothedBass.current = THREE.MathUtils.lerp(smoothedBass.current, bass * audioSensitivity.bassMultiplier, 0.12);
    const t = clock.getElapsedTime();
    
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(t * 1.5) * 0.2;
      groupRef.current.scale.setScalar(1.3 + smoothedBass.current * 0.3);
    }
    if (wingsRef.current) {
      wingsRef.current.rotation.x = Math.sin(t * 3) * 0.3 * (1 + smoothedBass.current);
    }
  });
  
  return (
    <group ref={groupRef}>
      {/* Body */}
      <mesh><sphereGeometry args={[0.4, 16, 16]} /><primitive object={material} /></mesh>
      {/* Head */}
      <mesh position={[0, 0.5, 0.3]}><sphereGeometry args={[0.25, 16, 16]} /><primitive object={material} /></mesh>
      {/* Beak */}
      <mesh position={[0, 0.4, 0.5]} rotation={[0.3, 0, 0]}><coneGeometry args={[0.08, 0.3, 4]} /><primitive object={material} /></mesh>
      {/* Wings */}
      <group ref={wingsRef}>
        <mesh position={[-0.6, 0.1, 0]} rotation={[0, 0, -0.5]}><boxGeometry args={[0.8, 0.05, 0.4]} /><primitive object={material} /></mesh>
        <mesh position={[0.6, 0.1, 0]} rotation={[0, 0, 0.5]}><boxGeometry args={[0.8, 0.05, 0.4]} /><primitive object={material} /></mesh>
      </group>
      {/* Tail feathers */}
      {[0, 1, 2].map(i => (
        <mesh key={i} position={[0, -0.3 - i * 0.2, -0.3 - i * 0.15]} rotation={[-0.3, 0, 0]}>
          <boxGeometry args={[0.1 - i * 0.02, 0.4, 0.02]} /><primitive object={material} />
        </mesh>
      ))}
    </group>
  );
}

function OctopusTemplate({ audioData }: { audioData: CreativeTemplateRendererProps['audioData'] }) {
  const groupRef = useRef<THREE.Group>(null);
  const tentacleRefs = useRef<THREE.Mesh[]>([]);
  const audioSensitivity = useStudioStore((s) => s.audioSensitivity);
  const smoothedBass = useRef(0);
  const material = useMemo(() => createVisualizerMaterial(), []);
  
  useFrame(({ clock }) => {
    const { bass, mids } = analyzeAudio(audioData.frequency);
    smoothedBass.current = THREE.MathUtils.lerp(smoothedBass.current, bass * audioSensitivity.bassMultiplier, 0.1);
    const t = clock.getElapsedTime();
    
    if (groupRef.current) {
      groupRef.current.scale.setScalar(1.2 + smoothedBass.current * 0.2);
      groupRef.current.rotation.y = t * 0.3 * audioSensitivity.spinSpeed;
    }
    
    tentacleRefs.current.forEach((tent, i) => {
      if (tent) {
        const wave = Math.sin(t * 2 + i * 0.5) * 0.3 * (1 + smoothedBass.current);
        tent.rotation.x = wave;
        tent.rotation.z = Math.sin(t * 1.5 + i) * 0.2;
      }
    });
  });
  
  return (
    <group ref={groupRef}>
      {/* Head */}
      <mesh position={[0, 0.3, 0]}><sphereGeometry args={[0.6, 24, 24]} /><primitive object={material} /></mesh>
      {/* Eyes */}
      <mesh position={[-0.25, 0.4, 0.45]}><sphereGeometry args={[0.12, 12, 12]} /><primitive object={material} /></mesh>
      <mesh position={[0.25, 0.4, 0.45]}><sphereGeometry args={[0.12, 12, 12]} /><primitive object={material} /></mesh>
      {/* Tentacles */}
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        return (
          <mesh 
            key={i} 
            ref={el => { if (el) tentacleRefs.current[i] = el; }}
            position={[Math.cos(angle) * 0.4, -0.2, Math.sin(angle) * 0.4]}
            rotation={[0.5, 0, angle]}
          >
            <cylinderGeometry args={[0.08, 0.03, 0.8, 8]} /><primitive object={material} />
          </mesh>
        );
      })}
    </group>
  );
}

function RocketTemplate({ audioData }: { audioData: CreativeTemplateRendererProps['audioData'] }) {
  const groupRef = useRef<THREE.Group>(null);
  const flameRef = useRef<THREE.Mesh>(null);
  const audioSensitivity = useStudioStore((s) => s.audioSensitivity);
  const smoothedBass = useRef(0);
  const material = useMemo(() => createVisualizerMaterial(), []);
  
  useFrame(({ clock }) => {
    const { bass } = analyzeAudio(audioData.frequency);
    smoothedBass.current = THREE.MathUtils.lerp(smoothedBass.current, bass * audioSensitivity.bassMultiplier, 0.15);
    const t = clock.getElapsedTime();
    
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(t * 2) * 0.1 + smoothedBass.current * 0.3;
      groupRef.current.rotation.z = Math.sin(t * 1.5) * 0.05;
      groupRef.current.scale.setScalar(1.3 + smoothedBass.current * 0.2);
    }
    if (flameRef.current) {
      flameRef.current.scale.y = 1 + smoothedBass.current * 2;
    }
  });
  
  return (
    <group ref={groupRef}>
      {/* Body */}
      <mesh><cylinderGeometry args={[0.3, 0.3, 1.2, 16]} /><primitive object={material} /></mesh>
      {/* Nose cone */}
      <mesh position={[0, 0.8, 0]}><coneGeometry args={[0.3, 0.5, 16]} /><primitive object={material} /></mesh>
      {/* Fins */}
      {[0, 1, 2, 3].map(i => {
        const angle = (i / 4) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(angle) * 0.35, -0.5, Math.sin(angle) * 0.35]} rotation={[0, -angle, 0]}>
            <boxGeometry args={[0.02, 0.4, 0.2]} /><primitive object={material} />
          </mesh>
        );
      })}
      {/* Flame */}
      <mesh ref={flameRef} position={[0, -0.9, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.2, 0.5, 8]} /><primitive object={material} />
      </mesh>
    </group>
  );
}

function FishTemplate({ audioData }: { audioData: CreativeTemplateRendererProps['audioData'] }) {
  const groupRef = useRef<THREE.Group>(null);
  const tailRef = useRef<THREE.Mesh>(null);
  const audioSensitivity = useStudioStore((s) => s.audioSensitivity);
  const smoothedMids = useRef(0);
  const material = useMemo(() => createVisualizerMaterial(), []);
  
  useFrame(({ clock }) => {
    const { bass, mids } = analyzeAudio(audioData.frequency);
    smoothedMids.current = THREE.MathUtils.lerp(smoothedMids.current, mids * audioSensitivity.midsMultiplier, 0.12);
    const t = clock.getElapsedTime();
    
    if (groupRef.current) {
      groupRef.current.position.x = Math.sin(t * 0.5) * 0.5;
      groupRef.current.rotation.y = Math.sin(t * 2) * 0.1;
      groupRef.current.scale.setScalar(1.4 + smoothedMids.current * 0.2);
    }
    if (tailRef.current) {
      tailRef.current.rotation.y = Math.sin(t * 5 + smoothedMids.current * 3) * 0.4;
    }
  });
  
  return (
    <group ref={groupRef} rotation={[0, Math.PI / 2, 0]}>
      {/* Body */}
      <mesh scale={[1.2, 0.6, 0.4]}><sphereGeometry args={[0.5, 24, 24]} /><primitive object={material} /></mesh>
      {/* Tail */}
      <mesh ref={tailRef} position={[-0.7, 0, 0]} rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[0.3, 0.4, 0.05]} /><primitive object={material} />
      </mesh>
      {/* Fins */}
      <mesh position={[0, 0.35, 0]} rotation={[0, 0, 0]}><boxGeometry args={[0.3, 0.2, 0.02]} /><primitive object={material} /></mesh>
      <mesh position={[0.1, 0, 0.25]}><boxGeometry args={[0.15, 0.1, 0.02]} /><primitive object={material} /></mesh>
      <mesh position={[0.1, 0, -0.25]}><boxGeometry args={[0.15, 0.1, 0.02]} /><primitive object={material} /></mesh>
      {/* Eye */}
      <mesh position={[0.4, 0.1, 0.2]}><sphereGeometry args={[0.08, 12, 12]} /><primitive object={material} /></mesh>
    </group>
  );
}

// Simple fallback components for other templates
function HeartTemplate({ audioData }: { audioData: CreativeTemplateRendererProps['audioData'] }) {
  const groupRef = useRef<THREE.Group>(null);
  const audioSensitivity = useStudioStore((s) => s.audioSensitivity);
  const smoothedBass = useRef(0);
  const material = useMemo(() => createVisualizerMaterial(), []);
  
  useFrame(() => {
    const { bass } = analyzeAudio(audioData.frequency);
    smoothedBass.current = THREE.MathUtils.lerp(smoothedBass.current, bass * audioSensitivity.bassMultiplier, 0.15);
    if (groupRef.current) groupRef.current.scale.setScalar(1.5 + smoothedBass.current * 0.4);
  });
  
  return (
    <group ref={groupRef}>
      <mesh position={[-0.35, 0.2, 0]}><sphereGeometry args={[0.5, 24, 24]} /><primitive object={material} /></mesh>
      <mesh position={[0.35, 0.2, 0]}><sphereGeometry args={[0.5, 24, 24]} /><primitive object={material} /></mesh>
      <mesh position={[0, -0.3, 0]} rotation={[0, 0, Math.PI / 4]}><boxGeometry args={[0.7, 0.7, 0.5]} /><primitive object={material} /></mesh>
    </group>
  );
}

function StarTemplate({ audioData }: { audioData: CreativeTemplateRendererProps['audioData'] }) {
  const groupRef = useRef<THREE.Group>(null);
  const audioSensitivity = useStudioStore((s) => s.audioSensitivity);
  const smoothedBass = useRef(0);
  const material = useMemo(() => createVisualizerMaterial(), []);
  
  useFrame(({ clock }) => {
    const { bass } = analyzeAudio(audioData.frequency);
    smoothedBass.current = THREE.MathUtils.lerp(smoothedBass.current, bass * audioSensitivity.bassMultiplier, 0.12);
    if (groupRef.current) {
      groupRef.current.rotation.z = clock.getElapsedTime() * audioSensitivity.spinSpeed;
      groupRef.current.scale.setScalar(1.5 + smoothedBass.current * 0.3);
    }
  });
  
  return (
    <group ref={groupRef}>
      {Array.from({ length: 5 }).map((_, i) => {
        const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
        return (
          <mesh key={i} position={[Math.cos(angle) * 0.5, Math.sin(angle) * 0.5, 0]} rotation={[0, 0, angle + Math.PI / 2]}>
            <coneGeometry args={[0.25, 0.8, 4]} /><primitive object={material} />
          </mesh>
        );
      })}
      <mesh><dodecahedronGeometry args={[0.4, 0]} /><primitive object={material} /></mesh>
    </group>
  );
}

function CarTemplate({ audioData }: { audioData: CreativeTemplateRendererProps['audioData'] }) {
  const groupRef = useRef<THREE.Group>(null);
  const wheelRefs = useRef<THREE.Mesh[]>([]);
  const audioSensitivity = useStudioStore((s) => s.audioSensitivity);
  const smoothedMids = useRef(0);
  const wheelRotation = useRef(0);
  const material = useMemo(() => createVisualizerMaterial(), []);
  
  useFrame(() => {
    const { mids } = analyzeAudio(audioData.frequency);
    smoothedMids.current = THREE.MathUtils.lerp(smoothedMids.current, mids * audioSensitivity.midsMultiplier, 0.12);
    wheelRotation.current += audioSensitivity.animationSpeed * 0.15 * (1 + smoothedMids.current * 3);
    
    wheelRefs.current.forEach(wheel => { if (wheel) wheel.rotation.x = wheelRotation.current; });
    if (groupRef.current) groupRef.current.scale.setScalar(0.8);
  });
  
  return (
    <group ref={groupRef}>
      <mesh position={[0, 0.4, 0]}><boxGeometry args={[1.5, 0.4, 0.7]} /><primitive object={material} /></mesh>
      <mesh position={[0.1, 0.7, 0]}><boxGeometry args={[0.8, 0.35, 0.65]} /><primitive object={material} /></mesh>
      {[[-0.45, 0.15, 0.4], [-0.45, 0.15, -0.4], [0.45, 0.15, 0.4], [0.45, 0.15, -0.4]].map((pos, i) => (
        <mesh key={i} ref={el => { if (el) wheelRefs.current[i] = el; }} position={pos as [number, number, number]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.15, 0.15, 0.1, 16]} /><primitive object={material} />
        </mesh>
      ))}
    </group>
  );
}

function RobotTemplate({ audioData }: { audioData: CreativeTemplateRendererProps['audioData'] }) {
  const groupRef = useRef<THREE.Group>(null);
  const audioSensitivity = useStudioStore((s) => s.audioSensitivity);
  const smoothedBass = useRef(0);
  const material = useMemo(() => createVisualizerMaterial(), []);
  
  useFrame(({ clock }) => {
    const { bass } = analyzeAudio(audioData.frequency);
    smoothedBass.current = THREE.MathUtils.lerp(smoothedBass.current, bass * audioSensitivity.bassMultiplier, 0.12);
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(clock.getElapsedTime()) * 0.1;
      groupRef.current.scale.setScalar(1 + smoothedBass.current * 0.2);
    }
  });
  
  return (
    <group ref={groupRef}>
      <mesh position={[0, 0.8, 0]}><boxGeometry args={[0.5, 0.5, 0.4]} /><primitive object={material} /></mesh>
      <mesh position={[0, 0.2, 0]}><boxGeometry args={[0.6, 0.7, 0.4]} /><primitive object={material} /></mesh>
      <mesh position={[-0.15, 0.9, 0.2]}><sphereGeometry args={[0.08, 8, 8]} /><primitive object={material} /></mesh>
      <mesh position={[0.15, 0.9, 0.2]}><sphereGeometry args={[0.08, 8, 8]} /><primitive object={material} /></mesh>
      <mesh position={[-0.45, 0.3, 0]}><boxGeometry args={[0.15, 0.5, 0.15]} /><primitive object={material} /></mesh>
      <mesh position={[0.45, 0.3, 0]}><boxGeometry args={[0.15, 0.5, 0.15]} /><primitive object={material} /></mesh>
      <mesh position={[-0.2, -0.35, 0]}><boxGeometry args={[0.15, 0.4, 0.15]} /><primitive object={material} /></mesh>
      <mesh position={[0.2, -0.35, 0]}><boxGeometry args={[0.15, 0.4, 0.15]} /><primitive object={material} /></mesh>
    </group>
  );
}

function FlowerTemplate({ audioData }: { audioData: CreativeTemplateRendererProps['audioData'] }) {
  const groupRef = useRef<THREE.Group>(null);
  const audioSensitivity = useStudioStore((s) => s.audioSensitivity);
  const smoothedMids = useRef(0);
  const material = useMemo(() => createVisualizerMaterial(), []);
  
  useFrame(({ clock }) => {
    const { mids } = analyzeAudio(audioData.frequency);
    smoothedMids.current = THREE.MathUtils.lerp(smoothedMids.current, mids * audioSensitivity.midsMultiplier, 0.1);
    if (groupRef.current) {
      groupRef.current.rotation.z = Math.sin(clock.getElapsedTime() * 0.5) * 0.1;
      groupRef.current.scale.setScalar(1.5 + smoothedMids.current * 0.3);
    }
  });
  
  return (
    <group ref={groupRef}>
      <mesh><sphereGeometry args={[0.25, 16, 16]} /><primitive object={material} /></mesh>
      {Array.from({ length: 6 }).map((_, i) => {
        const angle = (i / 6) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(angle) * 0.5, Math.sin(angle) * 0.5, 0]}>
            <sphereGeometry args={[0.3, 16, 16]} /><primitive object={material} />
          </mesh>
        );
      })}
      <mesh position={[0, -0.8, 0]}><cylinderGeometry args={[0.05, 0.05, 1, 8]} /><primitive object={material} /></mesh>
    </group>
  );
}

function ButterflyTemplate({ audioData }: { audioData: CreativeTemplateRendererProps['audioData'] }) {
  const groupRef = useRef<THREE.Group>(null);
  const leftWingRef = useRef<THREE.Mesh>(null);
  const rightWingRef = useRef<THREE.Mesh>(null);
  const audioSensitivity = useStudioStore((s) => s.audioSensitivity);
  const smoothedBass = useRef(0);
  const material = useMemo(() => createVisualizerMaterial(), []);
  
  useFrame(({ clock }) => {
    const { bass } = analyzeAudio(audioData.frequency);
    smoothedBass.current = THREE.MathUtils.lerp(smoothedBass.current, bass * audioSensitivity.bassMultiplier, 0.15);
    const flapAngle = Math.sin(clock.getElapsedTime() * 4) * 0.5 * (1 + smoothedBass.current);
    if (leftWingRef.current) leftWingRef.current.rotation.y = flapAngle;
    if (rightWingRef.current) rightWingRef.current.rotation.y = -flapAngle;
    if (groupRef.current) groupRef.current.scale.setScalar(1.5);
  });
  
  return (
    <group ref={groupRef}>
      <mesh><capsuleGeometry args={[0.08, 0.5, 4, 8]} /><primitive object={material} /></mesh>
      <mesh ref={leftWingRef} position={[-0.3, 0.1, 0]}><circleGeometry args={[0.4, 16]} /><primitive object={material} /></mesh>
      <mesh ref={rightWingRef} position={[0.3, 0.1, 0]}><circleGeometry args={[0.4, 16]} /><primitive object={material} /></mesh>
      <mesh position={[-0.1, 0.35, 0]} rotation={[0, 0, -0.3]}><cylinderGeometry args={[0.01, 0.01, 0.2, 4]} /><primitive object={material} /></mesh>
      <mesh position={[0.1, 0.35, 0]} rotation={[0, 0, 0.3]}><cylinderGeometry args={[0.01, 0.01, 0.2, 4]} /><primitive object={material} /></mesh>
    </group>
  );
}

function CrownTemplate({ audioData }: { audioData: CreativeTemplateRendererProps['audioData'] }) {
  const groupRef = useRef<THREE.Group>(null);
  const audioSensitivity = useStudioStore((s) => s.audioSensitivity);
  const smoothedBass = useRef(0);
  const material = useMemo(() => createVisualizerMaterial(), []);
  
  useFrame(({ clock }) => {
    const { bass } = analyzeAudio(audioData.frequency);
    smoothedBass.current = THREE.MathUtils.lerp(smoothedBass.current, bass * audioSensitivity.bassMultiplier, 0.12);
    if (groupRef.current) {
      groupRef.current.rotation.y = clock.getElapsedTime() * 0.3 * audioSensitivity.spinSpeed;
      groupRef.current.scale.setScalar(1.5 + smoothedBass.current * 0.2);
    }
  });
  
  return (
    <group ref={groupRef}>
      <mesh><cylinderGeometry args={[0.6, 0.7, 0.3, 24]} /><primitive object={material} /></mesh>
      {Array.from({ length: 5 }).map((_, i) => {
        const angle = (i / 5) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(angle) * 0.55, 0.35, Math.sin(angle) * 0.55]}>
            <coneGeometry args={[0.1, 0.4, 4]} /><primitive object={material} />
          </mesh>
        );
      })}
    </group>
  );
}

function DiamondTemplate({ audioData }: { audioData: CreativeTemplateRendererProps['audioData'] }) {
  const groupRef = useRef<THREE.Group>(null);
  const audioSensitivity = useStudioStore((s) => s.audioSensitivity);
  const smoothedHighs = useRef(0);
  const material = useMemo(() => createVisualizerMaterial(), []);
  
  useFrame(({ clock }) => {
    const { highs } = analyzeAudio(audioData.frequency);
    smoothedHighs.current = THREE.MathUtils.lerp(smoothedHighs.current, highs * audioSensitivity.highsMultiplier, 0.15);
    if (groupRef.current) {
      groupRef.current.rotation.y = clock.getElapsedTime() * audioSensitivity.spinSpeed;
      groupRef.current.scale.setScalar(1.5 + smoothedHighs.current * 0.3);
    }
  });
  
  return (
    <group ref={groupRef}>
      <mesh position={[0, 0.3, 0]}><octahedronGeometry args={[0.6, 0]} /><primitive object={material} /></mesh>
      <mesh position={[0, -0.3, 0]} rotation={[Math.PI, 0, 0]} scale={[1, 0.6, 1]}><coneGeometry args={[0.6, 0.5, 8]} /><primitive object={material} /></mesh>
    </group>
  );
}

function MoonTemplate({ audioData }: { audioData: CreativeTemplateRendererProps['audioData'] }) {
  const groupRef = useRef<THREE.Group>(null);
  const audioSensitivity = useStudioStore((s) => s.audioSensitivity);
  const smoothedMids = useRef(0);
  const material = useMemo(() => createVisualizerMaterial(), []);
  
  useFrame(({ clock }) => {
    const { mids } = analyzeAudio(audioData.frequency);
    smoothedMids.current = THREE.MathUtils.lerp(smoothedMids.current, mids * audioSensitivity.midsMultiplier, 0.1);
    if (groupRef.current) {
      groupRef.current.rotation.z = Math.sin(clock.getElapsedTime() * 0.3) * 0.1;
      groupRef.current.scale.setScalar(1.8 + smoothedMids.current * 0.2);
    }
  });
  
  return (
    <group ref={groupRef}>
      <mesh><sphereGeometry args={[0.8, 32, 32]} /><primitive object={material} /></mesh>
      <mesh position={[0.3, 0.2, 0.1]}><sphereGeometry args={[0.6, 32, 32]} /><meshBasicMaterial color="#000000" /></mesh>
    </group>
  );
}

function SunTemplate({ audioData }: { audioData: CreativeTemplateRendererProps['audioData'] }) {
  const groupRef = useRef<THREE.Group>(null);
  const raysRef = useRef<THREE.Group>(null);
  const audioSensitivity = useStudioStore((s) => s.audioSensitivity);
  const smoothedBass = useRef(0);
  const material = useMemo(() => createVisualizerMaterial(), []);
  
  useFrame(({ clock }) => {
    const { bass } = analyzeAudio(audioData.frequency);
    smoothedBass.current = THREE.MathUtils.lerp(smoothedBass.current, bass * audioSensitivity.bassMultiplier, 0.12);
    if (groupRef.current) groupRef.current.scale.setScalar(1.5 + smoothedBass.current * 0.3);
    if (raysRef.current) raysRef.current.rotation.z = clock.getElapsedTime() * 0.2 * audioSensitivity.spinSpeed;
  });
  
  return (
    <group ref={groupRef}>
      <mesh><sphereGeometry args={[0.5, 32, 32]} /><primitive object={material} /></mesh>
      <group ref={raysRef}>
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = (i / 12) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(angle) * 0.9, Math.sin(angle) * 0.9, 0]} rotation={[0, 0, angle + Math.PI / 2]}>
              <coneGeometry args={[0.08, 0.4, 4]} /><primitive object={material} />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}

function PlanetTemplate({ audioData }: { audioData: CreativeTemplateRendererProps['audioData'] }) {
  const groupRef = useRef<THREE.Group>(null);
  const ringsRef = useRef<THREE.Mesh>(null);
  const audioSensitivity = useStudioStore((s) => s.audioSensitivity);
  const smoothedMids = useRef(0);
  const material = useMemo(() => createVisualizerMaterial(), []);
  
  useFrame(({ clock }) => {
    const { mids } = analyzeAudio(audioData.frequency);
    smoothedMids.current = THREE.MathUtils.lerp(smoothedMids.current, mids * audioSensitivity.midsMultiplier, 0.1);
    if (groupRef.current) {
      groupRef.current.rotation.y = clock.getElapsedTime() * 0.2 * audioSensitivity.spinSpeed;
      groupRef.current.scale.setScalar(1.5 + smoothedMids.current * 0.2);
    }
    if (ringsRef.current) ringsRef.current.rotation.z = clock.getElapsedTime() * 0.1;
  });
  
  return (
    <group ref={groupRef}>
      <mesh><sphereGeometry args={[0.5, 32, 32]} /><primitive object={material} /></mesh>
      <mesh ref={ringsRef} rotation={[Math.PI / 3, 0, 0]}><torusGeometry args={[0.9, 0.08, 8, 48]} /><primitive object={material} /></mesh>
    </group>
  );
}

function TornadoTemplate({ audioData }: { audioData: CreativeTemplateRendererProps['audioData'] }) {
  const groupRef = useRef<THREE.Group>(null);
  const audioSensitivity = useStudioStore((s) => s.audioSensitivity);
  const smoothedBass = useRef(0);
  const material = useMemo(() => createVisualizerMaterial(), []);
  
  useFrame(({ clock }) => {
    const { bass } = analyzeAudio(audioData.frequency);
    smoothedBass.current = THREE.MathUtils.lerp(smoothedBass.current, bass * audioSensitivity.bassMultiplier, 0.12);
    if (groupRef.current) {
      groupRef.current.rotation.y = clock.getElapsedTime() * 2 * audioSensitivity.spinSpeed;
      groupRef.current.scale.setScalar(1.3 + smoothedBass.current * 0.3);
    }
  });
  
  return (
    <group ref={groupRef}>
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh key={i} position={[0, -0.8 + i * 0.25, 0]}>
          <torusGeometry args={[0.15 + i * 0.08, 0.03, 8, 24]} /><primitive object={material} />
        </mesh>
      ))}
    </group>
  );
}

function HandTemplate({ audioData }: { audioData: CreativeTemplateRendererProps['audioData'] }) {
  const groupRef = useRef<THREE.Group>(null);
  const fingerRefs = useRef<THREE.Mesh[]>([]);
  const audioSensitivity = useStudioStore((s) => s.audioSensitivity);
  const smoothedBass = useRef(0);
  const material = useMemo(() => createVisualizerMaterial(), []);
  
  useFrame(() => {
    const { bass } = analyzeAudio(audioData.frequency);
    smoothedBass.current = THREE.MathUtils.lerp(smoothedBass.current, bass * audioSensitivity.bassMultiplier, 0.12);
    fingerRefs.current.forEach((finger, i) => {
      if (finger) finger.rotation.x = -smoothedBass.current * 0.5 * (1 - i * 0.1);
    });
    if (groupRef.current) groupRef.current.scale.setScalar(1.2);
  });
  
  return (
    <group ref={groupRef}>
      <mesh><boxGeometry args={[0.6, 0.5, 0.15]} /><primitive object={material} /></mesh>
      {[-0.2, -0.1, 0, 0.1, 0.2].map((x, i) => (
        <mesh key={i} ref={el => { if (el) fingerRefs.current[i] = el; }} position={[x, 0.4 + (i === 0 ? -0.15 : 0), 0]}>
          <capsuleGeometry args={[0.04, i === 0 ? 0.2 : 0.35, 4, 8]} /><primitive object={material} />
        </mesh>
      ))}
    </group>
  );
}

function SwordTemplate({ audioData }: { audioData: CreativeTemplateRendererProps['audioData'] }) {
  const groupRef = useRef<THREE.Group>(null);
  const audioSensitivity = useStudioStore((s) => s.audioSensitivity);
  const smoothedBass = useRef(0);
  const material = useMemo(() => createVisualizerMaterial(), []);
  
  useFrame(({ clock }) => {
    const { bass } = analyzeAudio(audioData.frequency);
    smoothedBass.current = THREE.MathUtils.lerp(smoothedBass.current, bass * audioSensitivity.bassMultiplier, 0.15);
    if (groupRef.current) {
      groupRef.current.rotation.z = Math.sin(clock.getElapsedTime() * 2) * 0.1 * (1 + smoothedBass.current);
      groupRef.current.scale.setScalar(1.5 + smoothedBass.current * 0.2);
    }
  });
  
  return (
    <group ref={groupRef}>
      <mesh position={[0, 0.8, 0]}><boxGeometry args={[0.1, 1.5, 0.02]} /><primitive object={material} /></mesh>
      <mesh position={[0, -0.1, 0]}><boxGeometry args={[0.5, 0.1, 0.08]} /><primitive object={material} /></mesh>
      <mesh position={[0, -0.35, 0]}><cylinderGeometry args={[0.06, 0.06, 0.4, 8]} /><primitive object={material} /></mesh>
      <mesh position={[0, -0.6, 0]}><sphereGeometry args={[0.08, 8, 8]} /><primitive object={material} /></mesh>
    </group>
  );
}

function AnchorTemplate({ audioData }: { audioData: CreativeTemplateRendererProps['audioData'] }) {
  const groupRef = useRef<THREE.Group>(null);
  const audioSensitivity = useStudioStore((s) => s.audioSensitivity);
  const smoothedBass = useRef(0);
  const material = useMemo(() => createVisualizerMaterial(), []);
  
  useFrame(({ clock }) => {
    const { bass } = analyzeAudio(audioData.frequency);
    smoothedBass.current = THREE.MathUtils.lerp(smoothedBass.current, bass * audioSensitivity.bassMultiplier, 0.1);
    if (groupRef.current) {
      groupRef.current.rotation.z = Math.sin(clock.getElapsedTime() * 0.5) * 0.1;
      groupRef.current.scale.setScalar(1.3 + smoothedBass.current * 0.2);
    }
  });
  
  return (
    <group ref={groupRef}>
      <mesh position={[0, 0.5, 0]}><torusGeometry args={[0.2, 0.05, 8, 24]} /><primitive object={material} /></mesh>
      <mesh position={[0, 0, 0]}><cylinderGeometry args={[0.05, 0.05, 0.8, 8]} /><primitive object={material} /></mesh>
      <mesh position={[0, 0.15, 0]}><boxGeometry args={[0.5, 0.08, 0.08]} /><primitive object={material} /></mesh>
      <mesh position={[-0.25, -0.3, 0]} rotation={[0, 0, -0.5]}><cylinderGeometry args={[0.04, 0.04, 0.4, 8]} /><primitive object={material} /></mesh>
      <mesh position={[0.25, -0.3, 0]} rotation={[0, 0, 0.5]}><cylinderGeometry args={[0.04, 0.04, 0.4, 8]} /><primitive object={material} /></mesh>
    </group>
  );
}

function BirdTemplate({ audioData }: { audioData: CreativeTemplateRendererProps['audioData'] }) {
  const groupRef = useRef<THREE.Group>(null);
  const wingsRef = useRef<THREE.Group>(null);
  const audioSensitivity = useStudioStore((s) => s.audioSensitivity);
  const smoothedBass = useRef(0);
  const material = useMemo(() => createVisualizerMaterial(), []);
  
  useFrame(({ clock }) => {
    const { bass } = analyzeAudio(audioData.frequency);
    smoothedBass.current = THREE.MathUtils.lerp(smoothedBass.current, bass * audioSensitivity.bassMultiplier, 0.12);
    const t = clock.getElapsedTime();
    if (wingsRef.current) wingsRef.current.rotation.x = Math.sin(t * 4) * 0.4 * (1 + smoothedBass.current);
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(t * 1.5) * 0.15;
      groupRef.current.scale.setScalar(1.3);
    }
  });
  
  return (
    <group ref={groupRef}>
      <mesh><sphereGeometry args={[0.3, 16, 16]} /><primitive object={material} /></mesh>
      <mesh position={[0, 0.25, 0.15]}><sphereGeometry args={[0.18, 12, 12]} /><primitive object={material} /></mesh>
      <mesh position={[0, 0.2, 0.35]} rotation={[0.3, 0, 0]}><coneGeometry args={[0.05, 0.2, 4]} /><primitive object={material} /></mesh>
      <group ref={wingsRef}>
        <mesh position={[-0.4, 0, 0]} rotation={[0, 0, -0.3]}><boxGeometry args={[0.5, 0.05, 0.25]} /><primitive object={material} /></mesh>
        <mesh position={[0.4, 0, 0]} rotation={[0, 0, 0.3]}><boxGeometry args={[0.5, 0.05, 0.25]} /><primitive object={material} /></mesh>
      </group>
      <mesh position={[0, -0.1, -0.35]}><boxGeometry args={[0.15, 0.03, 0.25]} /><primitive object={material} /></mesh>
    </group>
  );
}

function SnakeTemplate({ audioData }: { audioData: CreativeTemplateRendererProps['audioData'] }) {
  const groupRef = useRef<THREE.Group>(null);
  const segmentRefs = useRef<THREE.Mesh[]>([]);
  const audioSensitivity = useStudioStore((s) => s.audioSensitivity);
  const smoothedMids = useRef(0);
  const material = useMemo(() => createVisualizerMaterial(), []);
  
  useFrame(({ clock }) => {
    const { mids } = analyzeAudio(audioData.frequency);
    smoothedMids.current = THREE.MathUtils.lerp(smoothedMids.current, mids * audioSensitivity.midsMultiplier, 0.1);
    const t = clock.getElapsedTime();
    segmentRefs.current.forEach((seg, i) => {
      if (seg) {
        seg.position.x = Math.sin(t * 2 + i * 0.5) * 0.15 * (1 + smoothedMids.current);
      }
    });
    if (groupRef.current) groupRef.current.scale.setScalar(1.2);
  });
  
  return (
    <group ref={groupRef}>
      {Array.from({ length: 10 }).map((_, i) => (
        <mesh key={i} ref={el => { if (el) segmentRefs.current[i] = el; }} position={[0, 0.5 - i * 0.12, 0]}>
          <sphereGeometry args={[0.15 - i * 0.01, 12, 12]} /><primitive object={material} />
        </mesh>
      ))}
      <mesh position={[-0.08, 0.55, 0.1]}><sphereGeometry args={[0.04, 8, 8]} /><primitive object={material} /></mesh>
      <mesh position={[0.08, 0.55, 0.1]}><sphereGeometry args={[0.04, 8, 8]} /><primitive object={material} /></mesh>
    </group>
  );
}

function JellyfishTemplate({ audioData }: { audioData: CreativeTemplateRendererProps['audioData'] }) {
  const groupRef = useRef<THREE.Group>(null);
  const tentacleRefs = useRef<THREE.Mesh[]>([]);
  const audioSensitivity = useStudioStore((s) => s.audioSensitivity);
  const smoothedBass = useRef(0);
  const material = useMemo(() => createVisualizerMaterial(), []);
  
  useFrame(({ clock }) => {
    const { bass } = analyzeAudio(audioData.frequency);
    smoothedBass.current = THREE.MathUtils.lerp(smoothedBass.current, bass * audioSensitivity.bassMultiplier, 0.1);
    const t = clock.getElapsedTime();
    
    if (groupRef.current) {
      groupRef.current.scale.y = 1 + Math.sin(t * 2) * 0.1 * (1 + smoothedBass.current);
      groupRef.current.scale.x = groupRef.current.scale.z = 1.3;
    }
    tentacleRefs.current.forEach((tent, i) => {
      if (tent) tent.rotation.x = Math.sin(t * 1.5 + i * 0.3) * 0.3;
    });
  });
  
  return (
    <group ref={groupRef}>
      <mesh position={[0, 0.2, 0]}><sphereGeometry args={[0.5, 24, 24, 0, Math.PI * 2, 0, Math.PI / 2]} /><primitive object={material} /></mesh>
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        return (
          <mesh key={i} ref={el => { if (el) tentacleRefs.current[i] = el; }} position={[Math.cos(angle) * 0.3, -0.1, Math.sin(angle) * 0.3]}>
            <cylinderGeometry args={[0.02, 0.01, 0.6, 6]} /><primitive object={material} />
          </mesh>
        );
      })}
    </group>
  );
}

// ===================== MAIN RENDERER =====================

export function CreativeTemplateRenderer({ templateType, audioData }: CreativeTemplateRendererProps) {
  switch (templateType) {
    case 'smiley': return <SmileyTemplate audioData={audioData} />;
    case 'car': return <CarTemplate audioData={audioData} />;
    case 'heart': return <HeartTemplate audioData={audioData} />;
    case 'star': return <StarTemplate audioData={audioData} />;
    case 'robot': return <RobotTemplate audioData={audioData} />;
    case 'flower': return <FlowerTemplate audioData={audioData} />;
    case 'wings': return <WingsTemplate audioData={audioData} />;
    case 'butterfly': return <ButterflyTemplate audioData={audioData} />;
    case 'dragon': return <DragonTemplate audioData={audioData} />;
    case 'spaceship': return <SpaceshipTemplate audioData={audioData} />;
    case 'crown': return <CrownTemplate audioData={audioData} />;
    case 'skull': return <SkullTemplate audioData={audioData} />;
    case 'diamond': return <DiamondTemplate audioData={audioData} />;
    case 'moon': return <MoonTemplate audioData={audioData} />;
    case 'sun': return <SunTemplate audioData={audioData} />;
    case 'planet': return <PlanetTemplate audioData={audioData} />;
    case 'lightning': return <LightningTemplate audioData={audioData} />;
    case 'tornado': return <TornadoTemplate audioData={audioData} />;
    case 'eye': return <EyeTemplate audioData={audioData} />;
    case 'hand': return <HandTemplate audioData={audioData} />;
    case 'sword': return <SwordTemplate audioData={audioData} />;
    case 'anchor': return <AnchorTemplate audioData={audioData} />;
    case 'rocket': return <RocketTemplate audioData={audioData} />;
    case 'fish': return <FishTemplate audioData={audioData} />;
    case 'bird': return <BirdTemplate audioData={audioData} />;
    case 'snake': return <SnakeTemplate audioData={audioData} />;
    case 'octopus': return <OctopusTemplate audioData={audioData} />;
    case 'jellyfish': return <JellyfishTemplate audioData={audioData} />;
    case 'phoenix': return <PhoenixTemplate audioData={audioData} />;
    case 'geometric':
    default:
      return null; // Return null to signal using procedural geometry
  }
}
