/**
 * Ring / spiral shape family - stacked tori, interlocked gyro rings, helical cube
 * trails, radiating cone crowns. Neutral white materials (parent recolours);
 * bass pumps scale, mids drive rotation/orbit, highs add shimmer. Bounded ~1.3r.
 */
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ShapeProps, NEUTRAL_SOLID, clamp } from '../ShapeBase';

// --- Torus Stack: tori stacked along Y into a vase/barrel that ripples ---
export function TorusStackShape({ config, audioData, time, audioSensitivity = 1 }: ShapeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const count = clamp(config.shapeParams.elementCount, 6, 11);
  const rings = useMemo(() => Array.from({ length: count }, (_, i) => {
    const t = i / (count - 1);
    return { y: (t - 0.5) * 1.7, base: 0.35 + Math.sin(t * Math.PI) * 0.45 };
  }), [count]);
  useFrame(() => {
    if (!groupRef.current) return;
    const bass = audioData.bass * audioSensitivity, mids = audioData.mids * audioSensitivity, highs = audioData.highs * audioSensitivity;
    rings.forEach((r, i) => {
      const m = refs.current[i]; if (!m) return;
      const ripple = 1 + bass * 0.3 + Math.sin(time * 5 - i * 0.8) * (0.06 + highs * 0.1);
      m.scale.setScalar(ripple);
      m.rotation.z = time * (0.2 + mids * 0.4) + i * 0.3;
    });
    groupRef.current.rotation.y += 0.004 + mids * 0.012;
  });
  return (
    <group ref={groupRef}>
      {rings.map((r, i) => (
        <mesh key={i} ref={(el) => (refs.current[i] = el)} position={[0, r.y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[r.base, 0.1, 12, 28]} />
          <meshStandardMaterial {...NEUTRAL_SOLID} />
        </mesh>
      ))}
    </group>
  );
}

// --- Gyro Rings: three orthogonal tori spinning like a gimbal ---
export function GyroRingsShape({ audioData, time, audioSensitivity = 1 }: ShapeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const a = useRef<THREE.Mesh>(null), b = useRef<THREE.Mesh>(null), c = useRef<THREE.Mesh>(null);
  const core = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (!groupRef.current) return;
    const bass = audioData.bass * audioSensitivity, mids = audioData.mids * audioSensitivity, highs = audioData.highs * audioSensitivity;
    const spin = 0.3 + mids * 0.6;
    if (a.current) a.current.rotation.x = time * spin;
    if (b.current) b.current.rotation.y = time * spin * 1.3;
    if (c.current) c.current.rotation.z = time * spin * 0.8;
    const s = 1 + bass * 0.18;
    groupRef.current.scale.setScalar(s);
    if (core.current) core.current.scale.setScalar(0.3 * (1 + bass * 0.6 + highs * 0.2));
  });
  return (
    <group ref={groupRef}>
      <mesh ref={core}><icosahedronGeometry args={[1, 0]} /><meshStandardMaterial {...NEUTRAL_SOLID} flatShading /></mesh>
      <mesh ref={a}><torusGeometry args={[1.05, 0.045, 12, 48]} /><meshStandardMaterial {...NEUTRAL_SOLID} /></mesh>
      <mesh ref={b} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.85, 0.045, 12, 48]} /><meshStandardMaterial {...NEUTRAL_SOLID} /></mesh>
      <mesh ref={c} rotation={[0, Math.PI / 2, 0]}><torusGeometry args={[0.65, 0.045, 12, 48]} /><meshStandardMaterial {...NEUTRAL_SOLID} /></mesh>
    </group>
  );
}

// --- Cube Spiral: cubes marching along a vertical helix ---
export function CubeSpiralShape({ config, audioData, time, audioSensitivity = 1 }: ShapeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = clamp(config.shapeParams.elementCount, 18, 40);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useFrame(() => {
    if (!meshRef.current || !groupRef.current) return;
    const bass = audioData.bass * audioSensitivity, mids = audioData.mids * audioSensitivity, highs = audioData.highs * audioSensitivity;
    const turns = 3;
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      const a = t * turns * Math.PI * 2 + time * (0.4 + mids * 0.6);
      const rad = 0.75 * (1 + bass * 0.2);
      dummy.position.set(Math.cos(a) * rad, (t - 0.5) * 1.7, Math.sin(a) * rad);
      dummy.rotation.set(a, a * 0.5, 0);
      dummy.scale.setScalar(0.13 + bass * 0.06 + highs * 0.05 * Math.sin(time * 8 + i));
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
    groupRef.current.rotation.y += 0.002 + mids * 0.006;
  });
  return (
    <group ref={groupRef}>
      <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial {...NEUTRAL_SOLID} />
      </instancedMesh>
    </group>
  );
}

// --- Cone Crown: cones radiating outward from a hub like a sun/crown ---
export function ConeCrownShape({ config, audioData, time, audioSensitivity = 1 }: ShapeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const hubRef = useRef<THREE.Mesh>(null);
  const count = clamp(config.shapeParams.elementCount, 10, 22);
  const dirs = useMemo(() => Array.from({ length: count }, (_, i) => {
    const phi = Math.acos(1 - 2 * (i + 0.5) / count);
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;
    return new THREE.Vector3(Math.sin(phi) * Math.cos(theta), Math.sin(phi) * Math.sin(theta), Math.cos(phi));
  }), [count]);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const up = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const quat = useMemo(() => new THREE.Quaternion(), []);
  useFrame(() => {
    if (!meshRef.current || !groupRef.current) return;
    const bass = audioData.bass * audioSensitivity, mids = audioData.mids * audioSensitivity, highs = audioData.highs * audioSensitivity;
    if (hubRef.current) hubRef.current.scale.setScalar(0.32 * (1 + bass * 0.4));
    dirs.forEach((d, i) => {
      const len = 0.55 + bass * 0.45 + highs * 0.12 * Math.sin(time * 7 + i);
      dummy.position.copy(d).multiplyScalar(0.3 + len * 0.5);
      quat.setFromUnitVectors(up, d);
      dummy.quaternion.copy(quat);
      dummy.scale.set(0.13, len, 0.13);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
    groupRef.current.rotation.y += 0.003 + mids * 0.01;
    groupRef.current.rotation.x += 0.001 + mids * 0.004;
  });
  return (
    <group ref={groupRef}>
      <mesh ref={hubRef}><sphereGeometry args={[1, 18, 14]} /><meshStandardMaterial {...NEUTRAL_SOLID} /></mesh>
      <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
        <coneGeometry args={[1, 1, 6]} />
        <meshStandardMaterial {...NEUTRAL_SOLID} flatShading />
      </instancedMesh>
    </group>
  );
}
