/**
 * Ring System Shape - Planet with concentric flat orbital rings (Saturn-like)
 * Audio: Bass = planet pulse, Mids = ring rotation, Highs = ring shimmer tilt
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ShapeProps, NEUTRAL_SOLID, clamp } from './ShapeBase';

export function RingSystemShape({ config, audioData, time, audioSensitivity = 1 }: ShapeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const planetRef = useRef<THREE.Mesh>(null);
  const ringsGroupRef = useRef<THREE.Group>(null);

  const { elementCount, scale: shapeScale } = config.shapeParams;
  const ringCount = clamp(Math.floor(elementCount / 3), 3, 7);

  const rings = useMemo(() => {
    const arr: { inner: number; outer: number }[] = [];
    for (let i = 0; i < ringCount; i++) {
      const base = shapeScale * (1.0 + i * 0.35);
      arr.push({ inner: base, outer: base + shapeScale * 0.22 });
    }
    return arr;
  }, [ringCount, shapeScale]);

  useFrame(() => {
    if (!groupRef.current) return;

    const bass = audioData.bass * audioSensitivity;
    const mids = audioData.mids * audioSensitivity;
    const highs = audioData.highs * audioSensitivity;

    if (planetRef.current) {
      const pulse = 1 + bass * 0.25 * Math.sin(time * 3);
      planetRef.current.scale.setScalar(pulse);
      planetRef.current.rotation.y += 0.004 + mids * 0.008;
    }

    if (ringsGroupRef.current) {
      ringsGroupRef.current.rotation.z += 0.003 + mids * 0.01;
      ringsGroupRef.current.rotation.x = 1.1 + Math.sin(time * 0.4) * 0.15 + highs * 0.1;
    }

    groupRef.current.rotation.y += 0.001;
  });

  return (
    <group ref={groupRef}>
      <mesh ref={planetRef}>
        <sphereGeometry args={[shapeScale * 0.7, 24, 20]} />
        <meshStandardMaterial {...NEUTRAL_SOLID} />
      </mesh>
      <group ref={ringsGroupRef} rotation={[1.1, 0, 0]}>
        {rings.map((ring, i) => (
          <mesh key={i}>
            <ringGeometry args={[ring.inner, ring.outer, 64]} />
            <meshStandardMaterial
              {...NEUTRAL_SOLID}
              side={THREE.DoubleSide}
              transparent
              opacity={0.8}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}

export default RingSystemShape;
