/**
 * Sphere Grid Shape - Geodesic dots evenly spread on a sphere surface
 * Audio: Bass = radial breathing, Mids = rotation, Highs = dot jitter + scale
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ShapeProps, NEUTRAL_SOLID, clamp } from './ShapeBase';

export function SphereGridShape({ config, audioData, time, audioSensitivity = 1 }: ShapeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const instancedRef = useRef<THREE.InstancedMesh>(null);

  const { elementCount, scale: shapeScale } = config.shapeParams;
  const dotCount = clamp(elementCount, 80, 400);

  const dotData = useMemo(() => {
    const dots: { dir: THREE.Vector3 }[] = [];
    for (let i = 0; i < dotCount; i++) {
      const phi = Math.acos(1 - 2 * (i + 0.5) / dotCount);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      dots.push({
        dir: new THREE.Vector3(
          Math.sin(phi) * Math.cos(theta),
          Math.sin(phi) * Math.sin(theta),
          Math.cos(phi)
        ),
      });
    }
    return dots;
  }, [dotCount]);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(() => {
    if (!instancedRef.current || !groupRef.current) return;

    const bass = audioData.bass * audioSensitivity;
    const mids = audioData.mids * audioSensitivity;
    const highs = audioData.highs * audioSensitivity;

    const radius = shapeScale * (0.9 + bass * 0.3 * Math.sin(time * 3) + bass * 0.15);

    dotData.forEach((dot, i) => {
      const jitter = highs * 0.06 * Math.sin(time * 11 + i * 1.7);
      const r = radius + jitter;
      dummy.position.set(dot.dir.x * r, dot.dir.y * r, dot.dir.z * r);
      const s = 0.06 + bass * 0.04 + highs * 0.03 * Math.sin(time * 9 + i);
      dummy.scale.setScalar(Math.max(0.02, s));
      dummy.updateMatrix();
      instancedRef.current!.setMatrixAt(i, dummy.matrix);
    });

    instancedRef.current.instanceMatrix.needsUpdate = true;
    groupRef.current.rotation.y += 0.0015 + mids * 0.006;
    groupRef.current.rotation.x = Math.sin(time * 0.25) * 0.15;
  });

  return (
    <group ref={groupRef}>
      <instancedMesh ref={instancedRef} args={[undefined, undefined, dotCount]}>
        <sphereGeometry args={[1, 8, 6]} />
        <meshStandardMaterial {...NEUTRAL_SOLID} />
      </instancedMesh>
    </group>
  );
}

export default SphereGridShape;
