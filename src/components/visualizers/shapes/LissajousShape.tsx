/**
 * Lissajous Curve Shape - 3D Lissajous knot rendered as a glowing tube
 * Audio: Bass = amplitude pulse, Mids = phase drift (morphs curve), Highs = tube glow
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ShapeProps, NEUTRAL_SOLID, clamp } from './ShapeBase';

export function LissajousShape({ config, audioData, time, audioSensitivity = 1 }: ShapeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);

  const { elementCount, scale: shapeScale } = config.shapeParams;

  // Frequency ratios from element count for variety
  const { a, b, c } = useMemo(() => {
    const sets = [
      { a: 3, b: 2, c: 5 },
      { a: 3, b: 4, c: 2 },
      { a: 5, b: 4, c: 3 },
      { a: 2, b: 3, c: 4 },
      { a: 4, b: 5, c: 3 },
    ];
    return sets[elementCount % sets.length];
  }, [elementCount]);

  const samples = 240;

  const buildGeo = (amp: number, phase: number) => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= samples; i++) {
      const t = (i / samples) * Math.PI * 2;
      pts.push(
        new THREE.Vector3(
          Math.sin(a * t + phase) * amp,
          Math.sin(b * t) * amp,
          Math.sin(c * t + phase * 0.5) * amp
        )
      );
    }
    const curve = new THREE.CatmullRomCurve3(pts, true);
    return new THREE.TubeGeometry(curve, 280, shapeScale * 0.05, 6, true);
  };

  const initialGeo = useMemo(() => buildGeo(shapeScale, 0), [shapeScale, a, b, c]);

  useFrame(() => {
    if (!meshRef.current || !groupRef.current) return;

    const bass = audioData.bass * audioSensitivity;
    const mids = audioData.mids * audioSensitivity;
    const highs = audioData.highs * audioSensitivity;

    const amp = shapeScale * (0.85 + bass * 0.25 * Math.sin(time * 3));
    const phase = time * (0.2 + mids * 0.8);
    const newGeo = buildGeo(amp, phase);
    meshRef.current.geometry.dispose();
    meshRef.current.geometry = newGeo;

    groupRef.current.rotation.y += 0.003 + mids * 0.006;

    if (materialRef.current) {
      materialRef.current.emissiveIntensity = clamp(0.1 + highs * 0.25, 0.05, 0.4);
    }
  });

  return (
    <group ref={groupRef}>
      <mesh ref={meshRef} geometry={initialGeo}>
        <meshStandardMaterial ref={materialRef} {...NEUTRAL_SOLID} />
      </mesh>
    </group>
  );
}

export default LissajousShape;
