/**
 * Gyroid Shape - Dot-sampled gyroid minimal surface (approximated by points near the iso-surface)
 * Audio: Bass = cell scale breathing, Mids = rotation, Highs = point brightness
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ShapeProps, NEUTRAL_SOLID, clamp } from './ShapeBase';

export function GyroidShape({ config, audioData, time, audioSensitivity = 1 }: ShapeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const instancedRef = useRef<THREE.InstancedMesh>(null);

  const { elementCount, scale: shapeScale } = config.shapeParams;

  // Sample a grid, keep points where the gyroid implicit is near zero
  const samplePoints = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const res = 22;
    const freq = 2.4;
    const maxPoints = clamp(elementCount * 8, 200, 700);
    for (let xi = 0; xi < res; xi++) {
      for (let yi = 0; yi < res; yi++) {
        for (let zi = 0; zi < res; zi++) {
          const x = (xi / (res - 1) - 0.5) * 2;
          const y = (yi / (res - 1) - 0.5) * 2;
          const z = (zi / (res - 1) - 0.5) * 2;
          const g =
            Math.sin(x * freq) * Math.cos(y * freq) +
            Math.sin(y * freq) * Math.cos(z * freq) +
            Math.sin(z * freq) * Math.cos(x * freq);
          if (Math.abs(g) < 0.18) {
            pts.push(new THREE.Vector3(x, y, z));
          }
        }
      }
    }
    // Decimate to budget
    if (pts.length > maxPoints) {
      const stride = pts.length / maxPoints;
      const out: THREE.Vector3[] = [];
      for (let i = 0; i < maxPoints; i++) out.push(pts[Math.floor(i * stride)]);
      return out;
    }
    return pts;
  }, [elementCount]);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(() => {
    if (!instancedRef.current || !groupRef.current) return;

    const bass = audioData.bass * audioSensitivity;
    const mids = audioData.mids * audioSensitivity;
    const highs = audioData.highs * audioSensitivity;

    const breathe = shapeScale * (1.4 + bass * 0.35 * Math.sin(time * 3));

    samplePoints.forEach((p, i) => {
      dummy.position.set(p.x * breathe, p.y * breathe, p.z * breathe);
      const s = 0.05 + bass * 0.03 + highs * 0.02 * Math.sin(time * 8 + i);
      dummy.scale.setScalar(Math.max(0.02, s));
      dummy.updateMatrix();
      instancedRef.current!.setMatrixAt(i, dummy.matrix);
    });

    instancedRef.current.instanceMatrix.needsUpdate = true;
    groupRef.current.rotation.y += 0.002 + mids * 0.006;
    groupRef.current.rotation.x += 0.001 + mids * 0.003;
  });

  return (
    <group ref={groupRef}>
      <instancedMesh ref={instancedRef} args={[undefined, undefined, samplePoints.length]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial {...NEUTRAL_SOLID} />
      </instancedMesh>
    </group>
  );
}

export default GyroidShape;
