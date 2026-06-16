/**
 * Klein Bottle Shape - Immersed 4D surface parametric mesh
 * Audio: Bass = scale pulse, Mids = rotation, Highs = surface ripple
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ShapeProps, NEUTRAL_SOLID, clamp } from './ShapeBase';

export function KleinBottleShape({ config, audioData, time, audioSensitivity = 1 }: ShapeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);

  const { scale: shapeScale } = config.shapeParams;

  const { geometry, original } = useMemo(() => {
    const uSeg = 90;
    const vSeg = 24;
    const positions: number[] = [];
    const indices: number[] = [];
    const s = shapeScale * 0.22;

    for (let i = 0; i <= uSeg; i++) {
      const u = (i / uSeg) * Math.PI * 2;
      for (let j = 0; j <= vSeg; j++) {
        const v = (j / vSeg) * Math.PI * 2;
        const cu = Math.cos(u);
        const su = Math.sin(u);
        const cv = Math.cos(v);
        const sv = Math.sin(v);
        let x: number, y: number, z: number;
        if (u < Math.PI) {
          x = 3 * cu * (1 + su) + 2 * (1 - cu / 2) * cu * cv;
          z = -8 * su - 2 * (1 - cu / 2) * su * cv;
        } else {
          x = 3 * cu * (1 + su) + 2 * (1 - cu / 2) * Math.cos(v + Math.PI);
          z = -8 * su;
        }
        y = -2 * (1 - cu / 2) * sv;
        positions.push(x * s, y * s, z * s);
      }
    }

    const cols = vSeg + 1;
    for (let i = 0; i < uSeg; i++) {
      for (let j = 0; j < vSeg; j++) {
        const a = i * cols + j;
        const b = (i + 1) * cols + j;
        const c = (i + 1) * cols + (j + 1);
        const d = i * cols + (j + 1);
        indices.push(a, b, d, b, c, d);
      }
    }

    const arr = new Float32Array(positions);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    geo.center();

    return { geometry: geo, original: (geo.attributes.position.array as Float32Array).slice() };
  }, [shapeScale]);

  useFrame(() => {
    if (!meshRef.current || !groupRef.current) return;

    const bass = audioData.bass * audioSensitivity;
    const mids = audioData.mids * audioSensitivity;
    const highs = audioData.highs * audioSensitivity;

    const geo = meshRef.current.geometry as THREE.BufferGeometry;
    const pos = geo.attributes.position.array as Float32Array;
    const pulse = 1 + bass * 0.2 * Math.sin(time * 3);

    for (let k = 0; k < pos.length; k += 3) {
      const ox = original[k];
      const oy = original[k + 1];
      const oz = original[k + 2];
      const ripple = 1 + highs * 0.1 * Math.sin(time * 6 + oy * 5);
      pos[k] = ox * pulse * ripple;
      pos[k + 1] = oy * pulse * ripple;
      pos[k + 2] = oz * pulse * ripple;
    }
    geo.attributes.position.needsUpdate = true;
    geo.computeVertexNormals();

    groupRef.current.rotation.y += 0.004 + mids * 0.009;
    groupRef.current.rotation.z = Math.sin(time * 0.3) * 0.25;

    if (materialRef.current) {
      materialRef.current.emissiveIntensity = clamp(0.08 + highs * 0.18, 0.05, 0.3);
    }
  });

  return (
    <group ref={groupRef}>
      <mesh ref={meshRef} geometry={geometry}>
        <meshStandardMaterial ref={materialRef} {...NEUTRAL_SOLID} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

export default KleinBottleShape;
