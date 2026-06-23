/**
 * Ring family II - tetra ring, pyramid ring, capsule ring, torus chain, spike disk.
 * Neutral white materials (parent recolours); bass pulse, mids orbit/spin, highs
 * shimmer. Every arrangement stays within ~1.2 unit radius for clean framing.
 */
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ShapeProps, NEUTRAL_SOLID, clamp } from '../ShapeBase';

const up = new THREE.Vector3(0, 1, 0);

// --- Tetra Ring: tetrahedra evenly spaced on a ring, tips facing out ---
export function TetraRingShape({ config, audioData, time, audioSensitivity = 1 }: ShapeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = clamp(config.shapeParams.elementCount, 8, 16);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useFrame(() => {
    if (!meshRef.current || !groupRef.current) return;
    const bass = audioData.bass * audioSensitivity, mids = audioData.mids * audioSensitivity, highs = audioData.highs * audioSensitivity;
    const r = 0.85 * (1 + bass * 0.22);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      dummy.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
      dummy.rotation.set(time + i, a + time * (0.4 + mids * 0.6), 0);
      dummy.scale.setScalar(0.24 + bass * 0.12 + highs * 0.06 * Math.sin(time * 9 + i));
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
    groupRef.current.rotation.y += 0.004 + mids * 0.012;
    groupRef.current.rotation.x = 0.32 + Math.sin(time * 0.3) * 0.12;
  });
  return (
    <group ref={groupRef}>
      <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
        <tetrahedronGeometry args={[1, 0]} />
        <meshStandardMaterial {...NEUTRAL_SOLID} flatShading />
      </instancedMesh>
    </group>
  );
}

// --- Pyramid Ring: 4-sided cones in a ring pointing toward the centre ---
export function PyramidRingShape({ config, audioData, time, audioSensitivity = 1 }: ShapeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = clamp(config.shapeParams.elementCount, 8, 16);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const quat = useMemo(() => new THREE.Quaternion(), []);
  const dir = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    if (!meshRef.current || !groupRef.current) return;
    const bass = audioData.bass * audioSensitivity, mids = audioData.mids * audioSensitivity, highs = audioData.highs * audioSensitivity;
    const r = 0.9 * (1 + bass * 0.18);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + time * (0.2 + mids * 0.4);
      dir.set(-Math.cos(a), 0, -Math.sin(a)); // point inward
      quat.setFromUnitVectors(up, dir);
      dummy.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
      dummy.quaternion.copy(quat);
      const len = 0.5 + bass * 0.3 + highs * 0.1 * Math.sin(time * 8 + i);
      dummy.scale.set(0.22, len, 0.22);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
    groupRef.current.rotation.x = 0.4;
    groupRef.current.rotation.z += 0.003 + mids * 0.008;
  });
  return (
    <group ref={groupRef}>
      <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
        <coneGeometry args={[1, 1, 4]} />
        <meshStandardMaterial {...NEUTRAL_SOLID} flatShading />
      </instancedMesh>
    </group>
  );
}

// --- Capsule Ring: capsules tumbling around a ring like a bracelet ---
export function CapsuleRingShape({ config, audioData, time, audioSensitivity = 1 }: ShapeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = clamp(config.shapeParams.elementCount, 7, 14);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useFrame(() => {
    if (!meshRef.current || !groupRef.current) return;
    const bass = audioData.bass * audioSensitivity, mids = audioData.mids * audioSensitivity, highs = audioData.highs * audioSensitivity;
    const r = 0.8 * (1 + bass * 0.2);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + time * (0.25 + mids * 0.5);
      dummy.position.set(Math.cos(a) * r, Math.sin(time * 1.4 + i) * 0.1, Math.sin(a) * r);
      dummy.rotation.set(a, time + i, Math.PI / 2);
      dummy.scale.setScalar(0.3 + bass * 0.12 + highs * 0.05 * Math.sin(time * 7 + i));
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
    groupRef.current.rotation.x = 0.34 + Math.sin(time * 0.25) * 0.1;
    groupRef.current.rotation.y += 0.003 + mids * 0.009;
  });
  return (
    <group ref={groupRef}>
      <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
        <capsuleGeometry args={[0.5, 1, 4, 8]} />
        <meshStandardMaterial {...NEUTRAL_SOLID} />
      </instancedMesh>
    </group>
  );
}

// --- Torus Chain: small tori interlocked into a closed loop ---
export function TorusChainShape({ config, audioData, time, audioSensitivity = 1 }: ShapeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const count = clamp(config.shapeParams.elementCount, 8, 14);
  const items = useMemo(() => Array.from({ length: count }, (_, i) => ({ a: (i / count) * Math.PI * 2, flip: i % 2 === 0 })), [count]);
  useFrame(() => {
    if (!groupRef.current) return;
    const bass = audioData.bass * audioSensitivity, mids = audioData.mids * audioSensitivity, highs = audioData.highs * audioSensitivity;
    const r = 0.8 * (1 + bass * 0.16);
    items.forEach((it, i) => {
      const m = refs.current[i]; if (!m) return;
      m.position.set(Math.cos(it.a) * r, Math.sin(it.a) * r, 0);
      m.rotation.set(it.flip ? Math.PI / 2 : 0, it.flip ? 0 : Math.PI / 2, it.a + time * (0.3 + mids * 0.5));
      m.scale.setScalar(1 + bass * 0.15 + highs * 0.08 * Math.sin(time * 8 + i));
    });
    groupRef.current.rotation.z += 0.004 + mids * 0.01;
    groupRef.current.rotation.x = 0.2;
  });
  return (
    <group ref={groupRef}>
      {items.map((it, i) => (
        <mesh key={i} ref={(el) => (refs.current[i] = el)}>
          <torusGeometry args={[0.26, 0.08, 10, 24]} />
          <meshStandardMaterial {...NEUTRAL_SOLID} />
        </mesh>
      ))}
    </group>
  );
}

// --- Spike Disk: spikes radiating flat in a disk, like a saw/sun ---
export function SpikeDiskShape({ config, audioData, time, audioSensitivity = 1 }: ShapeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const hubRef = useRef<THREE.Mesh>(null);
  const count = clamp(config.shapeParams.elementCount, 14, 30);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const quat = useMemo(() => new THREE.Quaternion(), []);
  const dir = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    if (!meshRef.current || !groupRef.current) return;
    const bass = audioData.bass * audioSensitivity, mids = audioData.mids * audioSensitivity, highs = audioData.highs * audioSensitivity;
    if (hubRef.current) hubRef.current.scale.setScalar(0.32 * (1 + bass * 0.4));
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      dir.set(Math.cos(a), 0, Math.sin(a));
      quat.setFromUnitVectors(up, dir);
      const len = 0.55 + bass * 0.4 + highs * 0.14 * Math.sin(time * 10 + i);
      dummy.position.set(Math.cos(a) * (0.3 + len * 0.5), 0, Math.sin(a) * (0.3 + len * 0.5));
      dummy.quaternion.copy(quat);
      dummy.scale.set(0.09, len, 0.09);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
    groupRef.current.rotation.y += 0.006 + mids * 0.02;
    groupRef.current.rotation.x = 0.5 + Math.sin(time * 0.3) * 0.12;
  });
  return (
    <group ref={groupRef}>
      <mesh ref={hubRef}><sphereGeometry args={[1, 16, 12]} /><meshStandardMaterial {...NEUTRAL_SOLID} /></mesh>
      <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
        <coneGeometry args={[1, 1, 4]} />
        <meshStandardMaterial {...NEUTRAL_SOLID} flatShading />
      </instancedMesh>
    </group>
  );
}
