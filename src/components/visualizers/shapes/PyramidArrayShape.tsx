/**
 * Pyramid Array Shape - Grid of tetrahedra/pyramids on a plane, popping up with audio
 * Audio: Bass = pyramid height pop (wave), Mids = spin, Highs = tip flicker scale
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ShapeProps, NEUTRAL_SOLID, clamp } from './ShapeBase';

export function PyramidArrayShape({ config, audioData, time, audioSensitivity = 1 }: ShapeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const instancedRef = useRef<THREE.InstancedMesh>(null);

  const { elementCount, scale: shapeScale } = config.shapeParams;
  const grid = clamp(Math.round(Math.sqrt(elementCount)), 4, 10);
  const count = grid * grid;

  const cells = useMemo(() => {
    const arr: { x: number; z: number; dist: number }[] = [];
    const spacing = (shapeScale * 3) / grid;
    const offset = ((grid - 1) * spacing) / 2;
    for (let gx = 0; gx < grid; gx++) {
      for (let gz = 0; gz < grid; gz++) {
        const x = gx * spacing - offset;
        const z = gz * spacing - offset;
        arr.push({ x, z, dist: Math.sqrt(x * x + z * z) });
      }
    }
    return arr;
  }, [grid, shapeScale]);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(() => {
    if (!instancedRef.current || !groupRef.current) return;

    const bass = audioData.bass * audioSensitivity;
    const mids = audioData.mids * audioSensitivity;
    const highs = audioData.highs * audioSensitivity;

    cells.forEach((cell, i) => {
      const wave = Math.sin(time * 3 - cell.dist * 1.5);
      const height = shapeScale * (0.3 + bass * 0.7 * (0.5 + 0.5 * wave));
      dummy.position.set(cell.x, height * 0.5 - shapeScale * 0.5, cell.z);
      dummy.rotation.y = time * (0.2 + mids * 0.8) + i;
      const flick = 1 + highs * 0.2 * Math.sin(time * 10 + i);
      dummy.scale.set(shapeScale * 0.18 * flick, height, shapeScale * 0.18 * flick);
      dummy.updateMatrix();
      instancedRef.current!.setMatrixAt(i, dummy.matrix);
    });

    instancedRef.current.instanceMatrix.needsUpdate = true;
    groupRef.current.rotation.y += 0.001 + mids * 0.003;
  });

  return (
    <group ref={groupRef}>
      <instancedMesh ref={instancedRef} args={[undefined, undefined, count]}>
        <coneGeometry args={[1, 1, 4]} />
        <meshStandardMaterial {...NEUTRAL_SOLID} flatShading />
      </instancedMesh>
    </group>
  );
}

export default PyramidArrayShape;
