/**
 * Tower / spiral family II - cone spiral, box tower, sphere helix, double helix,
 * crystal spire. Neutral white materials (parent recolours); bass pulse, mids
 * spin, highs shimmer. Bounded ~1.2r for clean framing.
 */
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ShapeProps, NEUTRAL_SOLID, clamp } from '../ShapeBase';

// --- Cone Spiral: cones climbing a vertical spiral staircase ---
export function ConeSpiralShape({ config, audioData, time, audioSensitivity = 1 }: ShapeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = clamp(config.shapeParams.elementCount, 14, 30);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useFrame(() => {
    if (!meshRef.current || !groupRef.current) return;
    const bass = audioData.bass * audioSensitivity, mids = audioData.mids * audioSensitivity, highs = audioData.highs * audioSensitivity;
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      const a = t * Math.PI * 4 + time * (0.3 + mids * 0.5);
      const rad = 0.7 * (1 + bass * 0.18) * (0.4 + t * 0.6);
      dummy.position.set(Math.cos(a) * rad, (t - 0.5) * 1.7, Math.sin(a) * rad);
      dummy.rotation.set(0, a, 0.3);
      dummy.scale.setScalar(0.16 + bass * 0.06 + highs * 0.05 * Math.sin(time * 8 + i));
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
    groupRef.current.rotation.y += 0.003 + mids * 0.008;
  });
  return (
    <group ref={groupRef}>
      <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
        <coneGeometry args={[1, 1.6, 5]} />
        <meshStandardMaterial {...NEUTRAL_SOLID} flatShading />
      </instancedMesh>
    </group>
  );
}

// --- Box Tower: stacked cubes twisting up a tower, pulse climbing it ---
export function BoxTowerShape({ config, audioData, time, audioSensitivity = 1 }: ShapeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const count = clamp(config.shapeParams.elementCount, 7, 13);
  const items = useMemo(() => Array.from({ length: count }, (_, i) => {
    const t = i / (count - 1);
    return { y: (t - 0.5) * 1.8, base: 0.5 - Math.abs(t - 0.5) * 0.18, twist: i * 0.5 };
  }), [count]);
  useFrame(() => {
    if (!groupRef.current) return;
    const bass = audioData.bass * audioSensitivity, mids = audioData.mids * audioSensitivity, highs = audioData.highs * audioSensitivity;
    items.forEach((it, i) => {
      const m = refs.current[i]; if (!m) return;
      const wave = Math.max(0, Math.sin(time * 5 - i * 0.8));
      const s = it.base * (1 + bass * 0.2 + wave * (0.16 + highs * 0.18));
      m.scale.set(s, 1, s);
      m.rotation.y = it.twist + time * (0.3 + mids * 0.5);
    });
    groupRef.current.rotation.y += 0.0015 + mids * 0.004;
  });
  return (
    <group ref={groupRef}>
      {items.map((it, i) => (
        <mesh key={i} ref={(el) => (refs.current[i] = el)} position={[0, it.y, 0]}>
          <boxGeometry args={[1, 1.8 / count, 1]} />
          <meshStandardMaterial {...NEUTRAL_SOLID} />
        </mesh>
      ))}
    </group>
  );
}

// --- Sphere Helix: beads threaded along a single helix ---
export function SphereHelixShape({ config, audioData, time, audioSensitivity = 1 }: ShapeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = clamp(config.shapeParams.elementCount, 16, 34);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useFrame(() => {
    if (!meshRef.current || !groupRef.current) return;
    const bass = audioData.bass * audioSensitivity, mids = audioData.mids * audioSensitivity, highs = audioData.highs * audioSensitivity;
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      const a = t * Math.PI * 6;
      const rad = 0.6 * (1 + bass * 0.2);
      dummy.position.set(Math.cos(a) * rad, (t - 0.5) * 1.7, Math.sin(a) * rad);
      dummy.scale.setScalar(0.14 + bass * 0.06 + highs * 0.05 * Math.sin(time * 9 - i * 0.5));
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
    groupRef.current.rotation.y += 0.005 + mids * 0.014;
  });
  return (
    <group ref={groupRef}>
      <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
        <sphereGeometry args={[1, 14, 12]} />
        <meshStandardMaterial {...NEUTRAL_SOLID} />
      </instancedMesh>
    </group>
  );
}

// --- Double Helix: two intertwined bead strands (DNA-like) ---
export function HelixDoubleShape({ config, audioData, time, audioSensitivity = 1 }: ShapeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const per = clamp(Math.round(config.shapeParams.elementCount / 2), 10, 20);
  const count = per * 2;
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useFrame(() => {
    if (!meshRef.current || !groupRef.current) return;
    const bass = audioData.bass * audioSensitivity, mids = audioData.mids * audioSensitivity, highs = audioData.highs * audioSensitivity;
    const rad = 0.5 * (1 + bass * 0.2);
    for (let k = 0; k < count; k++) {
      const strand = k < per ? 0 : 1;
      const i = strand === 0 ? k : k - per;
      const t = i / (per - 1);
      const a = t * Math.PI * 4 + strand * Math.PI;
      dummy.position.set(Math.cos(a) * rad, (t - 0.5) * 1.7, Math.sin(a) * rad);
      dummy.scale.setScalar(0.12 + bass * 0.05 + highs * 0.04 * Math.sin(time * 8 + k));
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(k, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
    groupRef.current.rotation.y += 0.004 + mids * 0.012;
  });
  return (
    <group ref={groupRef}>
      <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
        <sphereGeometry args={[1, 12, 10]} />
        <meshStandardMaterial {...NEUTRAL_SOLID} />
      </instancedMesh>
    </group>
  );
}

// --- Crystal Spire: clustered tall bipyramids pointing up like quartz ---
export function CrystalSpireShape({ config, audioData, time, audioSensitivity = 1 }: ShapeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const refs = useRef<(THREE.Group | null)[]>([]);
  const count = clamp(config.shapeParams.elementCount, 5, 9);
  const spires = useMemo(() => Array.from({ length: count }, (_, i) => {
    const a = (i / count) * Math.PI * 2;
    const r = i === 0 ? 0 : 0.4;
    return { x: Math.cos(a) * r, z: Math.sin(a) * r, h: i === 0 ? 1.0 : 0.6 + (i % 3) * 0.12, lean: (i % 2 ? 1 : -1) * 0.12 };
  }), [count]);
  useFrame(() => {
    if (!groupRef.current) return;
    const bass = audioData.bass * audioSensitivity, mids = audioData.mids * audioSensitivity, highs = audioData.highs * audioSensitivity;
    spires.forEach((sp, i) => {
      const g = refs.current[i]; if (!g) return;
      g.scale.set(0.22, sp.h * (1 + bass * 0.22 + highs * 0.1 * Math.sin(time * 6 + i)), 0.22);
    });
    groupRef.current.rotation.y += 0.0025 + mids * 0.008;
  });
  return (
    <group ref={groupRef}>
      {spires.map((sp, i) => (
        <group key={i} ref={(el) => (refs.current[i] = el)} position={[sp.x, 0, sp.z]} rotation={[sp.lean, 0, sp.lean]}>
          <mesh position={[0, 0.5, 0]}><coneGeometry args={[1, 1, 6]} /><meshStandardMaterial {...NEUTRAL_SOLID} flatShading /></mesh>
          <mesh position={[0, -0.5, 0]} rotation={[Math.PI, 0, 0]}><coneGeometry args={[1, 1, 6]} /><meshStandardMaterial {...NEUTRAL_SOLID} flatShading /></mesh>
        </group>
      ))}
    </group>
  );
}
