/**
 * Sphere Swarm Shape - Many small spheres orbiting on independent tilted orbits
 * Audio: Bass = orbit radius expansion, Mids = orbit speed, Highs = sphere size pulse
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ShapeProps, NEUTRAL_SOLID, clamp } from './ShapeBase';

export function SphereSwarmShape({ config, audioData, time, audioSensitivity = 1 }: ShapeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const instancedRef = useRef<THREE.InstancedMesh>(null);

  const { elementCount, scale: shapeScale } = config.shapeParams;
  const swarmCount = clamp(elementCount, 40, 160);

  const orbits = useMemo(() => {
    const arr: {
      radius: number;
      speed: number;
      phase: number;
      axis: THREE.Vector3;
      size: number;
    }[] = [];
    for (let i = 0; i < swarmCount; i++) {
      arr.push({
        radius: shapeScale * (0.5 + Math.random() * 1.0),
        speed: 0.3 + Math.random() * 1.0,
        phase: Math.random() * Math.PI * 2,
        axis: new THREE.Vector3(
          Math.random() - 0.5,
          Math.random() - 0.5,
          Math.random() - 0.5
        ).normalize(),
        size: 0.05 + Math.random() * 0.06,
      });
    }
    return arr;
  }, [swarmCount, shapeScale]);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const basePos = useMemo(() => new THREE.Vector3(), []);
  const quat = useMemo(() => new THREE.Quaternion(), []);

  useFrame(() => {
    if (!instancedRef.current || !groupRef.current) return;

    const bass = audioData.bass * audioSensitivity;
    const mids = audioData.mids * audioSensitivity;
    const highs = audioData.highs * audioSensitivity;

    const expand = 1 + bass * 0.4;

    orbits.forEach((o, i) => {
      const angle = o.phase + time * o.speed * (0.5 + mids * 1.2);
      const r = o.radius * expand;
      basePos.set(Math.cos(angle) * r, 0, Math.sin(angle) * r);
      quat.setFromAxisAngle(o.axis, o.phase);
      basePos.applyQuaternion(quat);
      dummy.position.copy(basePos);
      const s = o.size * shapeScale * (1 + highs * 0.4 * Math.sin(time * 9 + i));
      dummy.scale.setScalar(Math.max(0.02, s));
      dummy.updateMatrix();
      instancedRef.current!.setMatrixAt(i, dummy.matrix);
    });

    instancedRef.current.instanceMatrix.needsUpdate = true;
    groupRef.current.rotation.y += 0.002 + mids * 0.005;
  });

  return (
    <group ref={groupRef}>
      <instancedMesh ref={instancedRef} args={[undefined, undefined, swarmCount]}>
        <sphereGeometry args={[1, 10, 8]} />
        <meshStandardMaterial {...NEUTRAL_SOLID} />
      </instancedMesh>
    </group>
  );
}

export default SphereSwarmShape;
