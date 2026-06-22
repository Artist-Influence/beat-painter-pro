/**
 * Particle Galaxy Shape - Spiral particle disk with a bright core
 * Audio: Bass = disk expansion, Mids = differential rotation, Highs = sparkle brightness
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ShapeProps, clamp } from './ShapeBase';

export function ParticleGalaxyShape({ config, audioData, time, audioSensitivity = 1 }: ShapeProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.PointsMaterial>(null);

  const { elementCount, scale: shapeScale } = config.shapeParams;
  const particleCount = clamp(elementCount * 3, 300, 1200);
  const arms = 4;

  const { positions, meta } = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const m: { radius: number; baseAngle: number; y: number }[] = [];
    for (let i = 0; i < particleCount; i++) {
      const arm = i % arms;
      const t = Math.pow(Math.random(), 0.6);
      const radius = t * shapeScale * 1.8;
      const armAngle = (arm / arms) * Math.PI * 2;
      const spread = (Math.random() - 0.5) * 0.5;
      const baseAngle = armAngle + t * 4 + spread;
      const y = (Math.random() - 0.5) * shapeScale * 0.15 * (1 - t);
      m.push({ radius, baseAngle, y });
      pos[i * 3] = Math.cos(baseAngle) * radius;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = Math.sin(baseAngle) * radius;
    }
    return { positions: pos, meta: m };
  }, [particleCount, shapeScale]);

  useFrame(() => {
    if (!pointsRef.current) return;

    const bass = audioData.bass * audioSensitivity;
    const mids = audioData.mids * audioSensitivity;
    const highs = audioData.highs * audioSensitivity;

    const geo = pointsRef.current.geometry as THREE.BufferGeometry;
    const arr = geo.attributes.position.array as Float32Array;

    const expansion = 1 + bass * 0.35;
    for (let i = 0; i < particleCount; i++) {
      const md = meta[i];
      // Differential rotation: inner spins faster
      const angSpeed = 0.3 + mids * 0.8;
      const angle = md.baseAngle + time * angSpeed * (1 / (0.4 + md.radius * 0.5));
      const r = md.radius * expansion;
      arr[i * 3] = Math.cos(angle) * r;
      arr[i * 3 + 1] = md.y;
      arr[i * 3 + 2] = Math.sin(angle) * r;
    }
    geo.attributes.position.needsUpdate = true;

    pointsRef.current.rotation.x = 0.5 + Math.sin(time * 0.2) * 0.1;

    if (materialRef.current) {
      materialRef.current.size = clamp(5 + bass * 3, 4, 9); // pixels (sizeAttenuation off)
      materialRef.current.opacity = clamp(0.55 + highs * 0.4, 0.4, 1);
    }
  });

  return (
    <points ref={pointsRef} rotation={[0.5, 0, 0]}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        ref={materialRef}
        color={0xffffff}
        size={5.0}
        sizeAttenuation={false}
        transparent
        opacity={0.95}
      />
    </points>
  );
}

export default ParticleGalaxyShape;
