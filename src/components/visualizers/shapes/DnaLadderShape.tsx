/**
 * DNA Ladder Shape - Straight twin rails with rungs between them (ladder, not coiled)
 * Audio: Bass = rail spread breathing, Mids = ladder spin, Highs = rung shimmer scale
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ShapeProps, NEUTRAL_SOLID, clamp } from './ShapeBase';

export function DnaLadderShape({ config, audioData, time, audioSensitivity = 1 }: ShapeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const railsRef = useRef<THREE.InstancedMesh>(null);
  const rungsRef = useRef<THREE.InstancedMesh>(null);

  const { elementCount, scale: shapeScale } = config.shapeParams;
  const rungCount = clamp(Math.floor(elementCount / 2), 12, 40);
  const railNodeCount = rungCount * 2; // two rails

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const rungDummy = useMemo(() => new THREE.Object3D(), []);
  const height = shapeScale * 3;

  useFrame(() => {
    if (!railsRef.current || !rungsRef.current || !groupRef.current) return;

    const bass = audioData.bass * audioSensitivity;
    const mids = audioData.mids * audioSensitivity;
    const highs = audioData.highs * audioSensitivity;

    const halfWidth = shapeScale * (0.7 + bass * 0.25 * Math.sin(time * 2.5));

    // Rails: two columns of small spheres
    for (let rail = 0; rail < 2; rail++) {
      const x = (rail === 0 ? -1 : 1) * halfWidth;
      for (let i = 0; i < rungCount; i++) {
        const t = i / (rungCount - 1);
        const y = (t - 0.5) * height;
        const idx = rail * rungCount + i;
        dummy.position.set(x, y, 0);
        dummy.scale.setScalar(0.1 + bass * 0.04);
        dummy.updateMatrix();
        railsRef.current!.setMatrixAt(idx, dummy.matrix);
      }
    }
    railsRef.current.instanceMatrix.needsUpdate = true;

    // Rungs connecting the two rails
    for (let i = 0; i < rungCount; i++) {
      const t = i / (rungCount - 1);
      const y = (t - 0.5) * height;
      rungDummy.position.set(0, y, 0);
      rungDummy.rotation.z = Math.PI / 2;
      const shimmer = 1 + highs * 0.4 * Math.sin(time * 8 + i);
      rungDummy.scale.set(0.035 * shimmer, halfWidth * 0.95, 0.035 * shimmer);
      rungDummy.updateMatrix();
      rungsRef.current!.setMatrixAt(i, rungDummy.matrix);
    }
    rungsRef.current.instanceMatrix.needsUpdate = true;

    groupRef.current.rotation.y += 0.004 + mids * 0.01;
  });

  return (
    <group ref={groupRef}>
      <instancedMesh ref={railsRef} args={[undefined, undefined, railNodeCount]}>
        <sphereGeometry args={[1, 10, 8]} />
        <meshStandardMaterial {...NEUTRAL_SOLID} />
      </instancedMesh>
      <instancedMesh ref={rungsRef} args={[undefined, undefined, rungCount]}>
        <cylinderGeometry args={[1, 1, 1, 6]} />
        <meshStandardMaterial {...NEUTRAL_SOLID} emissiveIntensity={0.05} />
      </instancedMesh>
    </group>
  );
}

export default DnaLadderShape;
