/**
 * Star Burst Shape - 3D spikes radiating from a central core
 * Audio: Bass = spike length burst, Mids = spin, Highs = spike jitter + scale
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ShapeProps, NEUTRAL_SOLID, clamp } from './ShapeBase';

export function StarBurstShape({ config, audioData, time, audioSensitivity = 1 }: ShapeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const spikesRef = useRef<THREE.InstancedMesh>(null);

  const { elementCount, scale: shapeScale } = config.shapeParams;
  const spikeCount = clamp(elementCount, 20, 80);

  const spikes = useMemo(() => {
    const arr: { dir: THREE.Vector3; len: number }[] = [];
    for (let i = 0; i < spikeCount; i++) {
      const phi = Math.acos(1 - 2 * (i + 0.5) / spikeCount);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      arr.push({
        dir: new THREE.Vector3(
          Math.sin(phi) * Math.cos(theta),
          Math.sin(phi) * Math.sin(theta),
          Math.cos(phi)
        ),
        len: 0.7 + Math.random() * 0.6,
      });
    }
    return arr;
  }, [spikeCount]);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const up = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const quat = useMemo(() => new THREE.Quaternion(), []);

  useFrame(() => {
    if (!spikesRef.current || !groupRef.current) return;

    const bass = audioData.bass * audioSensitivity;
    const mids = audioData.mids * audioSensitivity;
    const highs = audioData.highs * audioSensitivity;

    spikes.forEach((spike, i) => {
      const burst = spike.len * shapeScale * (0.8 + bass * 0.6);
      const jitter = highs * 0.05 * Math.sin(time * 12 + i);
      const length = burst + jitter;
      const mid = spike.dir.clone().multiplyScalar(length * 0.5);
      dummy.position.copy(mid);
      quat.setFromUnitVectors(up, spike.dir);
      dummy.quaternion.copy(quat);
      const thick = 0.06 + bass * 0.03;
      dummy.scale.set(thick, length, thick);
      dummy.updateMatrix();
      spikesRef.current!.setMatrixAt(i, dummy.matrix);
    });

    spikesRef.current.instanceMatrix.needsUpdate = true;
    groupRef.current.rotation.y += 0.003 + mids * 0.01;
    groupRef.current.rotation.x += 0.001 + mids * 0.004;
  });

  return (
    <group ref={groupRef}>
      <instancedMesh ref={spikesRef} args={[undefined, undefined, spikeCount]}>
        <coneGeometry args={[1, 1, 5]} />
        <meshStandardMaterial {...NEUTRAL_SOLID} flatShading />
      </instancedMesh>
      <mesh>
        <sphereGeometry args={[shapeScale * 0.3, 16, 12]} />
        <meshStandardMaterial {...NEUTRAL_SOLID} />
      </mesh>
    </group>
  );
}

export default StarBurstShape;
