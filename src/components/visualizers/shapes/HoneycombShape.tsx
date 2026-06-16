/**
 * Honeycomb Shape - Hexagonal prism grid (flat honeycomb panel)
 * Audio: Bass = cell depth pop (wave), Mids = panel rotation, Highs = cell flicker scale
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ShapeProps, NEUTRAL_SOLID, clamp } from './ShapeBase';

export function HoneycombShape({ config, audioData, time, audioSensitivity = 1 }: ShapeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const instancedRef = useRef<THREE.InstancedMesh>(null);

  const { elementCount, scale: shapeScale } = config.shapeParams;
  const rings = clamp(Math.floor(Math.sqrt(elementCount) / 2) + 1, 2, 5);

  const cells = useMemo(() => {
    const arr: { x: number; y: number; dist: number }[] = [];
    const size = shapeScale * 0.45;
    const w = size * Math.sqrt(3);
    const h = size * 1.5;
    for (let q = -rings; q <= rings; q++) {
      for (let r = -rings; r <= rings; r++) {
        const s = -q - r;
        if (Math.abs(q) > rings || Math.abs(r) > rings || Math.abs(s) > rings) continue;
        const x = w * (q + r / 2);
        const y = h * r;
        arr.push({ x, y, dist: Math.sqrt(x * x + y * y) });
      }
    }
    return arr;
  }, [rings, shapeScale]);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const cellRadius = useMemo(() => shapeScale * 0.45 * 0.9, [shapeScale]);

  useFrame(() => {
    if (!instancedRef.current || !groupRef.current) return;

    const bass = audioData.bass * audioSensitivity;
    const mids = audioData.mids * audioSensitivity;
    const highs = audioData.highs * audioSensitivity;

    cells.forEach((cell, i) => {
      const wave = Math.sin(time * 3 - cell.dist * 1.2);
      const depth = shapeScale * (0.2 + bass * 0.6 * (0.5 + 0.5 * wave));
      const flick = 1 + highs * 0.15 * Math.sin(time * 9 + i);
      dummy.position.set(cell.x, cell.y, depth * 0.5);
      dummy.rotation.set(Math.PI / 2, 0, 0);
      dummy.scale.set(cellRadius * flick, depth, cellRadius * flick);
      dummy.updateMatrix();
      instancedRef.current!.setMatrixAt(i, dummy.matrix);
    });

    instancedRef.current.instanceMatrix.needsUpdate = true;
    groupRef.current.rotation.z += 0.001 + mids * 0.004;
    groupRef.current.rotation.y = Math.sin(time * 0.3) * 0.25;
  });

  return (
    <group ref={groupRef}>
      <instancedMesh ref={instancedRef} args={[undefined, undefined, cells.length]}>
        <cylinderGeometry args={[1, 1, 1, 6]} />
        <meshStandardMaterial {...NEUTRAL_SOLID} flatShading />
      </instancedMesh>
    </group>
  );
}

export default HoneycombShape;
