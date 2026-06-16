/**
 * Terrain Mesh Shape - Noise-displaced plane that ripples like an audio landscape
 * Audio: Bass = peak height, Mids = scroll speed, Highs = fine detail jitter
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ShapeProps, NEUTRAL_SOLID, clamp, simplex3D } from './ShapeBase';

export function TerrainMeshShape({ config, audioData, time, audioSensitivity = 1 }: ShapeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);

  const { elementCount, scale: shapeScale } = config.shapeParams;
  const segments = clamp(Math.round(Math.sqrt(elementCount)) * 2, 24, 64);

  const { geometry, baseXZ } = useMemo(() => {
    const geo = new THREE.PlaneGeometry(shapeScale * 3.5, shapeScale * 3.5, segments, segments);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position.array as Float32Array;
    const xz: number[] = [];
    for (let i = 0; i < pos.length; i += 3) {
      xz.push(pos[i], pos[i + 2]);
    }
    return { geometry: geo, baseXZ: xz };
  }, [segments, shapeScale]);

  useFrame(() => {
    if (!meshRef.current || !groupRef.current) return;

    const bass = audioData.bass * audioSensitivity;
    const mids = audioData.mids * audioSensitivity;
    const highs = audioData.highs * audioSensitivity;

    const geo = meshRef.current.geometry as THREE.BufferGeometry;
    const pos = geo.attributes.position.array as Float32Array;
    const scroll = time * (0.3 + mids * 0.8);
    const amp = shapeScale * (0.3 + bass * 0.8);

    for (let i = 0; i < pos.length / 3; i++) {
      const x = baseXZ[i * 2];
      const z = baseXZ[i * 2 + 1];
      const base = simplex3D(x * 0.6 + scroll, 0, z * 0.6);
      const detail = highs * 0.15 * simplex3D(x * 2.5, time, z * 2.5);
      pos[i * 3 + 1] = (base - 0.5) * amp + detail;
    }
    geo.attributes.position.needsUpdate = true;
    geo.computeVertexNormals();

    groupRef.current.rotation.y += 0.0015 + mids * 0.003;

    if (materialRef.current) {
      materialRef.current.emissiveIntensity = clamp(0.08 + highs * 0.15, 0.05, 0.28);
    }
  });

  return (
    <group ref={groupRef} rotation={[0.25, 0, 0]}>
      <mesh ref={meshRef} geometry={geometry}>
        <meshStandardMaterial ref={materialRef} {...NEUTRAL_SOLID} side={THREE.DoubleSide} flatShading />
      </mesh>
    </group>
  );
}

export default TerrainMeshShape;
