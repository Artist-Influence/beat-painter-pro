/**
 * Crystal Cluster Shape - Cluster of elongated angular crystals growing from a center
 * Audio: Bass = crystal growth length, Mids = slow tumble, Highs = facet glint scale
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ShapeProps, NEUTRAL_SOLID, clamp } from './ShapeBase';

export function CrystalClusterShape({ config, audioData, time, audioSensitivity = 1 }: ShapeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const instancedRef = useRef<THREE.InstancedMesh>(null);

  const { elementCount, scale: shapeScale } = config.shapeParams;
  const crystalCount = clamp(elementCount, 12, 40);

  const crystals = useMemo(() => {
    const arr: {
      dir: THREE.Vector3;
      len: number;
      thick: number;
      anchor: THREE.Vector3;
    }[] = [];
    for (let i = 0; i < crystalCount; i++) {
      const phi = Math.acos(1 - 2 * (i + 0.5) / crystalCount);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      const dir = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta),
        Math.sin(phi) * Math.sin(theta),
        Math.cos(phi)
      );
      arr.push({
        dir,
        len: 0.6 + Math.random() * 0.9,
        thick: 0.08 + Math.random() * 0.08,
        anchor: dir.clone().multiplyScalar(shapeScale * 0.3),
      });
    }
    return arr;
  }, [crystalCount, shapeScale]);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const up = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const quat = useMemo(() => new THREE.Quaternion(), []);

  useFrame(() => {
    if (!instancedRef.current || !groupRef.current) return;

    const bass = audioData.bass * audioSensitivity;
    const mids = audioData.mids * audioSensitivity;
    const highs = audioData.highs * audioSensitivity;

    crystals.forEach((c, i) => {
      const length = c.len * shapeScale * (0.7 + bass * 0.4);
      const glint = 1 + highs * 0.2 * Math.sin(time * 10 + i * 2);
      const center = c.anchor.clone().add(c.dir.clone().multiplyScalar(length * 0.5));
      dummy.position.copy(center);
      quat.setFromUnitVectors(up, c.dir);
      dummy.quaternion.copy(quat);
      dummy.scale.set(c.thick * shapeScale * glint, length, c.thick * shapeScale * glint);
      dummy.updateMatrix();
      instancedRef.current!.setMatrixAt(i, dummy.matrix);
    });

    instancedRef.current.instanceMatrix.needsUpdate = true;
    groupRef.current.rotation.y += 0.002 + mids * 0.006;
    groupRef.current.rotation.x += 0.001 + mids * 0.003;
  });

  return (
    <group ref={groupRef}>
      <instancedMesh ref={instancedRef} args={[undefined, undefined, crystalCount]}>
        <coneGeometry args={[1, 1, 6]} />
        <meshStandardMaterial {...NEUTRAL_SOLID} flatShading />
      </instancedMesh>
    </group>
  );
}

export default CrystalClusterShape;
