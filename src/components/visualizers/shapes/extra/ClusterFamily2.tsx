/**
 * Cluster / misc family II - star tetra, bloom cones, orbit swarm, gem cluster,
 * cylinder fan. Neutral white materials (parent recolours); bass pulse, mids
 * orbit/spin, highs shimmer. Bounded ~1.2r for clean framing.
 */
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ShapeProps, NEUTRAL_SOLID, clamp } from '../ShapeBase';

const up = new THREE.Vector3(0, 1, 0);

// --- Star Tetra: two interpenetrating tetrahedra (stella octangula) ---
export function StarTetraShape({ audioData, time, audioSensitivity = 1 }: ShapeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const a = useRef<THREE.Mesh>(null), b = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (!groupRef.current) return;
    const bass = audioData.bass * audioSensitivity, mids = audioData.mids * audioSensitivity, highs = audioData.highs * audioSensitivity;
    const s = 0.85 * (1 + bass * 0.3 + highs * 0.1 * Math.sin(time * 7));
    if (a.current) { a.current.scale.setScalar(s); a.current.rotation.y = time * (0.3 + mids * 0.5); }
    if (b.current) { b.current.scale.setScalar(s); b.current.rotation.y = -time * (0.3 + mids * 0.5); }
    groupRef.current.rotation.x = 0.3 + Math.sin(time * 0.3) * 0.15;
    groupRef.current.rotation.z += 0.002 + mids * 0.006;
  });
  return (
    <group ref={groupRef}>
      <mesh ref={a}><tetrahedronGeometry args={[1, 0]} /><meshStandardMaterial {...NEUTRAL_SOLID} flatShading /></mesh>
      <mesh ref={b} rotation={[Math.PI, 0, 0]}><tetrahedronGeometry args={[1, 0]} /><meshStandardMaterial {...NEUTRAL_SOLID} flatShading /></mesh>
    </group>
  );
}

// --- Bloom Cones: cones opening outward from a bud like a flower blooming ---
export function BloomConesShape({ config, audioData, time, audioSensitivity = 1 }: ShapeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = clamp(config.shapeParams.elementCount, 8, 18);
  const dirs = useMemo(() => Array.from({ length: count }, (_, i) => {
    const phi = Math.acos(1 - (i + 0.5) / count); // upper hemisphere bias = bloom
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;
    return new THREE.Vector3(Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta));
  }), [count]);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const quat = useMemo(() => new THREE.Quaternion(), []);
  useFrame(() => {
    if (!meshRef.current || !groupRef.current) return;
    const bass = audioData.bass * audioSensitivity, mids = audioData.mids * audioSensitivity, highs = audioData.highs * audioSensitivity;
    const open = 0.4 + bass * 0.5 + 0.1 * Math.sin(time * 0.8); // bass opens the bloom
    dirs.forEach((d, i) => {
      quat.setFromUnitVectors(up, d);
      dummy.position.copy(d).multiplyScalar(0.25 + open * 0.4);
      dummy.quaternion.copy(quat);
      const len = 0.55 + highs * 0.12 * Math.sin(time * 7 + i);
      dummy.scale.set(0.18, len, 0.18);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
    groupRef.current.rotation.y += 0.003 + mids * 0.01;
  });
  return (
    <group ref={groupRef}>
      <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
        <coneGeometry args={[1, 1.4, 5]} />
        <meshStandardMaterial {...NEUTRAL_SOLID} flatShading />
      </instancedMesh>
    </group>
  );
}

// --- Orbit Swarm: small cubes whirling on several tilted orbit rings ---
export function OrbitSwarmShape({ config, audioData, time, audioSensitivity = 1 }: ShapeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const count = clamp(config.shapeParams.elementCount, 24, 80);
  const seeds = useMemo(() => Array.from({ length: count }, (_, i) => ({
    ring: i % 4, off: (i * 1.7) % (Math.PI * 2), r: 0.55 + (i % 4) * 0.12, sp: 0.5 + (i % 3) * 0.25,
  })), [count]);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const m4 = useMemo(() => new THREE.Matrix4(), []);
  const euler = useMemo(() => new THREE.Euler(), []);
  useFrame(() => {
    if (!meshRef.current || !groupRef.current) return;
    const bass = audioData.bass * audioSensitivity, mids = audioData.mids * audioSensitivity, highs = audioData.highs * audioSensitivity;
    if (coreRef.current) coreRef.current.scale.setScalar(0.26 * (1 + bass * 0.5));
    seeds.forEach((s, i) => {
      const a = time * s.sp * (0.6 + mids * 0.8) + s.off;
      const v = new THREE.Vector3(Math.cos(a) * s.r * (1 + bass * 0.15), 0, Math.sin(a) * s.r * (1 + bass * 0.15));
      euler.set(s.ring * 0.7, s.ring * 0.5, s.ring * 0.9);
      m4.makeRotationFromEuler(euler);
      v.applyMatrix4(m4);
      dummy.position.copy(v);
      dummy.scale.setScalar(0.08 + highs * 0.05 * Math.sin(time * 10 + i));
      dummy.rotation.set(a, a, 0);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
    groupRef.current.rotation.y += 0.002 + mids * 0.006;
  });
  return (
    <group ref={groupRef}>
      <mesh ref={coreRef}><icosahedronGeometry args={[1, 0]} /><meshStandardMaterial {...NEUTRAL_SOLID} flatShading /></mesh>
      <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial {...NEUTRAL_SOLID} />
      </instancedMesh>
    </group>
  );
}

// --- Gem Cluster: faceted icosahedra packed into a glinting gemstone ---
export function GemClusterShape({ config, audioData, time, audioSensitivity = 1 }: ShapeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = clamp(config.shapeParams.elementCount, 8, 18);
  const seeds = useMemo(() => Array.from({ length: count }, (_, i) => {
    const phi = Math.acos(1 - 2 * (i + 0.5) / count);
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;
    const r = 0.15 + (i % 4) * 0.12;
    return { pos: new THREE.Vector3(Math.sin(phi) * Math.cos(theta), Math.sin(phi) * Math.sin(theta), Math.cos(phi)).multiplyScalar(r), sc: 0.3 + (i % 3) * 0.08, ph: i };
  }), [count]);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useFrame(() => {
    if (!meshRef.current || !groupRef.current) return;
    const bass = audioData.bass * audioSensitivity, mids = audioData.mids * audioSensitivity, highs = audioData.highs * audioSensitivity;
    seeds.forEach((s, i) => {
      dummy.position.copy(s.pos).multiplyScalar(1 + bass * 0.25);
      dummy.scale.setScalar(s.sc * (1 + bass * 0.2 + highs * 0.12 * Math.sin(time * 6 + s.ph)));
      dummy.rotation.set(time * 0.3 + i, time * 0.2, 0);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
    groupRef.current.rotation.y += 0.004 + mids * 0.012;
    groupRef.current.rotation.x = Math.sin(time * 0.4) * 0.25;
  });
  return (
    <group ref={groupRef}>
      <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial {...NEUTRAL_SOLID} flatShading />
      </instancedMesh>
    </group>
  );
}

// --- Cylinder Fan: cylinders fanning out from a hub like a spinner ---
export function CylinderFanShape({ config, audioData, time, audioSensitivity = 1 }: ShapeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = clamp(config.shapeParams.elementCount, 6, 14);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const quat = useMemo(() => new THREE.Quaternion(), []);
  const dir = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    if (!meshRef.current || !groupRef.current) return;
    const bass = audioData.bass * audioSensitivity, mids = audioData.mids * audioSensitivity, highs = audioData.highs * audioSensitivity;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const tilt = 0.5 + 0.3 * Math.sin(time * 1.5 + i);
      dir.set(Math.cos(a) * Math.cos(tilt), Math.sin(tilt), Math.sin(a) * Math.cos(tilt));
      quat.setFromUnitVectors(up, dir);
      const len = 0.7 + bass * 0.3 + highs * 0.1 * Math.sin(time * 8 + i);
      dummy.position.copy(dir).multiplyScalar(len * 0.5);
      dummy.quaternion.copy(quat);
      dummy.scale.set(0.1, len, 0.1);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
    groupRef.current.rotation.y += 0.005 + mids * 0.016;
  });
  return (
    <group ref={groupRef}>
      <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
        <cylinderGeometry args={[1, 1, 1, 8]} />
        <meshStandardMaterial {...NEUTRAL_SOLID} />
      </instancedMesh>
    </group>
  );
}
