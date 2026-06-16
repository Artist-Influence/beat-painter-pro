/**
 * Mobius Strip Shape - One-sided parametric ribbon surface
 * Audio: Bass = width breathing + scale, Mids = rotation, Highs = surface ripple
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ShapeProps, NEUTRAL_SOLID, clamp } from './ShapeBase';

export function MobiusStripShape({ config, audioData, time, audioSensitivity = 1 }: ShapeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);

  const { scale: shapeScale } = config.shapeParams;

  // Build mobius parametric geometry once
  const { geometry, original, uSeg, vSeg } = useMemo(() => {
    const uSegments = 120;
    const vSegments = 12;
    const R = shapeScale * 0.9;
    const w = shapeScale * 0.4;

    const positions: number[] = [];
    const indices: number[] = [];

    for (let i = 0; i <= uSegments; i++) {
      const u = (i / uSegments) * Math.PI * 2;
      for (let j = 0; j <= vSegments; j++) {
        const v = (j / vSegments - 0.5) * w;
        const half = u / 2;
        const x = (R + v * Math.cos(half)) * Math.cos(u);
        const y = (R + v * Math.cos(half)) * Math.sin(u);
        const z = v * Math.sin(half);
        positions.push(x, z, y);
      }
    }

    const cols = vSegments + 1;
    for (let i = 0; i < uSegments; i++) {
      for (let j = 0; j < vSegments; j++) {
        const a = i * cols + j;
        const b = (i + 1) * cols + j;
        const c = (i + 1) * cols + (j + 1);
        const d = i * cols + (j + 1);
        indices.push(a, b, d, b, c, d);
      }
    }

    const geo = new THREE.BufferGeometry();
    const arr = new Float32Array(positions);
    geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    return { geometry: geo, original: arr.slice(), uSeg: uSegments, vSeg: vSegments };
  }, [shapeScale]);

  useFrame(() => {
    if (!meshRef.current || !groupRef.current) return;

    const bass = audioData.bass * audioSensitivity;
    const mids = audioData.mids * audioSensitivity;
    const highs = audioData.highs * audioSensitivity;

    const geo = meshRef.current.geometry as THREE.BufferGeometry;
    const pos = geo.attributes.position.array as Float32Array;

    const breathe = 1 + bass * 0.18 * Math.sin(time * 3);
    for (let k = 0; k < pos.length; k += 3) {
      const ox = original[k];
      const oy = original[k + 1];
      const oz = original[k + 2];
      const ripple = 1 + highs * 0.12 * Math.sin(time * 6 + ox * 4 + oz * 4);
      pos[k] = ox * breathe * ripple;
      pos[k + 1] = oy * breathe * ripple;
      pos[k + 2] = oz * breathe * ripple;
    }
    geo.attributes.position.needsUpdate = true;
    geo.computeVertexNormals();

    groupRef.current.rotation.y += 0.004 + mids * 0.01;
    groupRef.current.rotation.x = Math.sin(time * 0.3) * 0.3;

    if (materialRef.current) {
      materialRef.current.emissiveIntensity = clamp(0.08 + highs * 0.18, 0.05, 0.3);
    }
  });

  // Suppress unused vars referenced only at build time
  void uSeg;
  void vSeg;

  return (
    <group ref={groupRef}>
      <mesh ref={meshRef} geometry={geometry}>
        <meshStandardMaterial ref={materialRef} {...NEUTRAL_SOLID} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

export default MobiusStripShape;
