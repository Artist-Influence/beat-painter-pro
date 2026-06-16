/**
 * Spring Coil Shape - A single thick coiled spring (tube along a helix path)
 * Audio: Bass = coil compression/stretch, Mids = spin, Highs = tube glow
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ShapeProps, NEUTRAL_SOLID, clamp, generateHelixPoints } from './ShapeBase';

export function SpringCoilShape({ config, audioData, time, audioSensitivity = 1 }: ShapeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);

  const { elementCount, scale: shapeScale } = config.shapeParams;
  const turns = clamp(Math.floor(elementCount / 6), 4, 12);

  const basePoints = useMemo(
    () => generateHelixPoints(220, shapeScale * 0.7, shapeScale * 3, turns),
    [shapeScale, turns]
  );

  useFrame(() => {
    if (!meshRef.current || !groupRef.current) return;

    const bass = audioData.bass * audioSensitivity;
    const mids = audioData.mids * audioSensitivity;
    const highs = audioData.highs * audioSensitivity;

    // Compress/stretch the coil along Y with bass
    const stretch = 1 + bass * 0.4 * Math.sin(time * 4);
    const pts = basePoints.map((p) => new THREE.Vector3(p.x, p.y * stretch, p.z));
    const curve = new THREE.CatmullRomCurve3(pts);
    const newGeo = new THREE.TubeGeometry(curve, 200, shapeScale * 0.08, 8, false);

    meshRef.current.geometry.dispose();
    meshRef.current.geometry = newGeo;

    groupRef.current.rotation.y += 0.005 + mids * 0.012;

    if (materialRef.current) {
      materialRef.current.emissiveIntensity = clamp(0.08 + highs * 0.2, 0.05, 0.32);
    }
  });

  const initialGeo = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(basePoints);
    return new THREE.TubeGeometry(curve, 200, shapeScale * 0.08, 8, false);
  }, [basePoints, shapeScale]);

  return (
    <group ref={groupRef}>
      <mesh ref={meshRef} geometry={initialGeo}>
        <meshStandardMaterial ref={materialRef} {...NEUTRAL_SOLID} />
      </mesh>
    </group>
  );
}

export default SpringCoilShape;
