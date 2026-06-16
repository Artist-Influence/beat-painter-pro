/**
 * Cylinder Stack Shape - Stacked discs/cylinders of varying radius (totem column)
 * Audio: Bass = stack height bounce, Mids = per-disc twist, Highs = radius wobble
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ShapeProps, NEUTRAL_SOLID, clamp } from './ShapeBase';

export function CylinderStackShape({ config, audioData, time, audioSensitivity = 1 }: ShapeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const instancedRef = useRef<THREE.InstancedMesh>(null);

  const { elementCount, scale: shapeScale } = config.shapeParams;
  const discCount = clamp(elementCount, 6, 24);

  const discs = useMemo(() => {
    const arr: { baseRadius: number }[] = [];
    for (let i = 0; i < discCount; i++) {
      const t = i / (discCount - 1);
      // hourglass-ish profile
      const profile = 0.5 + 0.5 * Math.sin(t * Math.PI);
      arr.push({ baseRadius: shapeScale * (0.3 + profile * 0.7) });
    }
    return arr;
  }, [discCount, shapeScale]);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const discHeight = useMemo(() => (shapeScale * 3) / discCount, [shapeScale, discCount]);

  useFrame(() => {
    if (!instancedRef.current || !groupRef.current) return;

    const bass = audioData.bass * audioSensitivity;
    const mids = audioData.mids * audioSensitivity;
    const highs = audioData.highs * audioSensitivity;

    const totalHeight = shapeScale * 3 * (1 + bass * 0.25 * Math.sin(time * 4));
    const step = totalHeight / discCount;

    discs.forEach((disc, i) => {
      const t = i / (discCount - 1);
      const y = (t - 0.5) * totalHeight;
      const wobble = 1 + highs * 0.15 * Math.sin(time * 8 + i);
      const r = disc.baseRadius * wobble;
      dummy.position.set(0, y, 0);
      dummy.rotation.y = time * (0.3 + mids * 1.2) + i * 0.4;
      dummy.scale.set(r, step * 0.42, r);
      dummy.updateMatrix();
      instancedRef.current!.setMatrixAt(i, dummy.matrix);
    });

    instancedRef.current.instanceMatrix.needsUpdate = true;
    groupRef.current.rotation.y += 0.002 + mids * 0.004;
  });

  void discHeight;

  return (
    <group ref={groupRef}>
      <instancedMesh ref={instancedRef} args={[undefined, undefined, discCount]}>
        <cylinderGeometry args={[1, 1, 1, 24]} />
        <meshStandardMaterial {...NEUTRAL_SOLID} />
      </instancedMesh>
    </group>
  );
}

export default CylinderStackShape;
