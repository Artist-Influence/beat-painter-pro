/**
 * Fibonacci Sphere Shape - Phyllotaxis points on a sphere with golden-angle spacing
 * Audio: Bass = radius breathing, Mids = phyllotaxis rotation, Highs = point brightness
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ShapeProps, clamp } from './ShapeBase';

export function FibonacciSphereShape({ config, audioData, time, audioSensitivity = 1 }: ShapeProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.PointsMaterial>(null);

  const { elementCount, scale: shapeScale } = config.shapeParams;
  const count = clamp(elementCount * 2, 200, 800);

  const { positions, dirs } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const d = new Float32Array(count * 3);
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < count; i++) {
      const y = 1 - (i / (count - 1)) * 2;
      const radius = Math.sqrt(1 - y * y);
      const theta = golden * i;
      const x = Math.cos(theta) * radius;
      const z = Math.sin(theta) * radius;
      d[i * 3] = x;
      d[i * 3 + 1] = y;
      d[i * 3 + 2] = z;
      pos[i * 3] = x * shapeScale;
      pos[i * 3 + 1] = y * shapeScale;
      pos[i * 3 + 2] = z * shapeScale;
    }
    return { positions: pos, dirs: d };
  }, [count, shapeScale]);

  useFrame(() => {
    if (!pointsRef.current) return;

    const bass = audioData.bass * audioSensitivity;
    const mids = audioData.mids * audioSensitivity;
    const highs = audioData.highs * audioSensitivity;

    const geo = pointsRef.current.geometry as THREE.BufferGeometry;
    const arr = geo.attributes.position.array as Float32Array;

    const radius = shapeScale * (0.9 + bass * 0.3 * Math.sin(time * 3) + bass * 0.1);
    for (let i = 0; i < count; i++) {
      const ripple = 1 + highs * 0.08 * Math.sin(time * 7 + i * 0.3);
      const r = radius * ripple;
      arr[i * 3] = dirs[i * 3] * r;
      arr[i * 3 + 1] = dirs[i * 3 + 1] * r;
      arr[i * 3 + 2] = dirs[i * 3 + 2] * r;
    }
    geo.attributes.position.needsUpdate = true;

    pointsRef.current.rotation.y += 0.002 + mids * 0.008;
    pointsRef.current.rotation.x = Math.sin(time * 0.2) * 0.15;

    if (materialRef.current) {
      materialRef.current.size = clamp(0.06 + bass * 0.05, 0.04, 0.16);
      materialRef.current.opacity = clamp(0.6 + highs * 0.35, 0.5, 1);
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        ref={materialRef}
        color={0xffffff}
        size={0.26}
        sizeAttenuation
        transparent
        opacity={0.95}
      />
    </points>
  );
}

export default FibonacciSphereShape;
