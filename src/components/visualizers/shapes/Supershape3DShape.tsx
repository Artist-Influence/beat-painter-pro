/**
 * Supershape 3D Shape - Gielis superformula mesh (spiky/organic morphing solid)
 * Audio: Bass = scale pulse, Mids = superformula morph, Highs = surface displacement
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ShapeProps, NEUTRAL_SOLID, clamp } from './ShapeBase';

function superR(angle: number, m: number, n1: number, n2: number, n3: number): number {
  const t1 = Math.pow(Math.abs(Math.cos((m * angle) / 4)), n2);
  const t2 = Math.pow(Math.abs(Math.sin((m * angle) / 4)), n3);
  const r = Math.pow(t1 + t2, -1 / n1);
  return isFinite(r) ? r : 0;
}

export function Supershape3DShape({ config, audioData, time, audioSensitivity = 1 }: ShapeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);

  const { scale: shapeScale } = config.shapeParams;

  const { geometry, dirs, uSeg, vSeg } = useMemo(() => {
    const uSegments = 64;
    const vSegments = 48;
    const directions: THREE.Vector3[] = [];
    const positions: number[] = [];
    const indices: number[] = [];

    for (let i = 0; i <= vSegments; i++) {
      const lat = -Math.PI / 2 + (i / vSegments) * Math.PI;
      for (let j = 0; j <= uSegments; j++) {
        const lon = -Math.PI + (j / uSegments) * Math.PI * 2;
        directions.push(new THREE.Vector3(lon, lat, 0));
        positions.push(0, 0, 0);
      }
    }

    const cols = uSegments + 1;
    for (let i = 0; i < vSegments; i++) {
      for (let j = 0; j < uSegments; j++) {
        const a = i * cols + j;
        const b = (i + 1) * cols + j;
        const c = (i + 1) * cols + (j + 1);
        const d = i * cols + (j + 1);
        indices.push(a, b, d, b, c, d);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
    geo.setIndex(indices);

    return { geometry: geo, dirs: directions, uSeg: uSegments, vSeg: vSegments };
  }, []);

  useFrame(() => {
    if (!meshRef.current || !groupRef.current) return;

    const bass = audioData.bass * audioSensitivity;
    const mids = audioData.mids * audioSensitivity;
    const highs = audioData.highs * audioSensitivity;

    const geo = meshRef.current.geometry as THREE.BufferGeometry;
    const pos = geo.attributes.position.array as Float32Array;

    const m = 6 + Math.round(mids * 6);
    const n1 = 0.3 + mids * 0.5;
    const pulse = shapeScale * (0.9 + bass * 0.3 * Math.sin(time * 3));

    dirs.forEach((d, idx) => {
      const lon = d.x;
      const lat = d.y;
      const r1 = superR(lon, m, n1, 1.7, 1.7);
      const r2 = superR(lat, m, n1, 1.7, 1.7);
      const disp = 1 + highs * 0.15 * Math.sin(time * 5 + lon * 5 + lat * 5);
      const x = r1 * Math.cos(lon) * r2 * Math.cos(lat) * pulse * disp;
      const y = r2 * Math.sin(lat) * pulse * disp;
      const z = r1 * Math.sin(lon) * r2 * Math.cos(lat) * pulse * disp;
      pos[idx * 3] = x;
      pos[idx * 3 + 1] = y;
      pos[idx * 3 + 2] = z;
    });

    geo.attributes.position.needsUpdate = true;
    geo.computeVertexNormals();

    groupRef.current.rotation.y += 0.003 + mids * 0.008;
    groupRef.current.rotation.x = Math.sin(time * 0.25) * 0.2;

    if (materialRef.current) {
      materialRef.current.emissiveIntensity = clamp(0.08 + highs * 0.2, 0.05, 0.3);
    }
  });

  void uSeg;
  void vSeg;

  return (
    <group ref={groupRef}>
      <mesh ref={meshRef} geometry={geometry}>
        <meshStandardMaterial ref={materialRef} {...NEUTRAL_SOLID} side={THREE.DoubleSide} flatShading />
      </mesh>
    </group>
  );
}

export default Supershape3DShape;
