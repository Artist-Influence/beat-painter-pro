/**
 * Polyhedra shape family - clustered / ringed / orbiting platonic solids.
 * Ships neutral white materials (ProceduralVisualizer recolours by traversal);
 * audio drives scale (bass), orbit/spin (mids), shimmer jitter (highs). Every
 * arrangement stays within ~1.2 unit radius so the parent frames it cleanly.
 */
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ShapeProps, NEUTRAL_SOLID, clamp } from '../ShapeBase';

// --- Tetra Cluster: a rough ball of tumbling tetrahedrons ---
export function TetraClusterShape({ config, audioData, time, audioSensitivity = 1 }: ShapeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = clamp(config.shapeParams.elementCount, 14, 30);
  const seeds = useMemo(() => {
    const arr: { pos: THREE.Vector3; ph: number; sc: number }[] = [];
    for (let i = 0; i < count; i++) {
      const phi = Math.acos(1 - 2 * (i + 0.5) / count);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      const r = 0.45 + (i % 5) * 0.1;
      arr.push({
        pos: new THREE.Vector3(Math.sin(phi) * Math.cos(theta), Math.sin(phi) * Math.sin(theta), Math.cos(phi)).multiplyScalar(r),
        ph: i * 0.6, sc: 0.16 + (i % 3) * 0.05,
      });
    }
    return arr;
  }, [count]);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useFrame(() => {
    if (!meshRef.current || !groupRef.current) return;
    const bass = audioData.bass * audioSensitivity, mids = audioData.mids * audioSensitivity, highs = audioData.highs * audioSensitivity;
    seeds.forEach((s, i) => {
      dummy.position.copy(s.pos).multiplyScalar(1 + bass * 0.4);
      dummy.scale.setScalar(s.sc * (1 + bass * 0.3 + highs * 0.2 * Math.sin(time * 8 + i)));
      dummy.rotation.set(time * 0.6 + s.ph, time * 0.8 + s.ph, 0);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
    groupRef.current.rotation.y += 0.003 + mids * 0.012;
    groupRef.current.rotation.x = Math.sin(time * 0.3) * 0.2;
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

// --- Octa Ring: octahedrons orbiting in a horizontal band ---
export function OctaRingShape({ config, audioData, time, audioSensitivity = 1 }: ShapeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = clamp(config.shapeParams.elementCount, 8, 18);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useFrame(() => {
    if (!meshRef.current || !groupRef.current) return;
    const bass = audioData.bass * audioSensitivity, mids = audioData.mids * audioSensitivity, highs = audioData.highs * audioSensitivity;
    const ringR = 0.9 * (1 + bass * 0.25);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + time * (0.3 + mids * 0.5);
      dummy.position.set(Math.cos(a) * ringR, Math.sin(time * 1.5 + i) * 0.12, Math.sin(a) * ringR);
      dummy.scale.setScalar(0.2 + bass * 0.16 + highs * 0.06 * Math.sin(time * 9 + i));
      dummy.rotation.set(time + i, time * 0.7, 0);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
    groupRef.current.rotation.x = 0.35 + Math.sin(time * 0.2) * 0.1;
  });
  return (
    <group ref={groupRef}>
      <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial {...NEUTRAL_SOLID} flatShading />
      </instancedMesh>
    </group>
  );
}

// --- Icosa Orbit: a pulsing core with smaller icosahedra orbiting it ---
export function IcosaOrbitShape({ config, audioData, time, audioSensitivity = 1 }: ShapeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = clamp(config.shapeParams.elementCount, 6, 14);
  const orbits = useMemo(() => Array.from({ length: count }, (_, i) => ({
    r: 0.7 + (i % 3) * 0.18, tilt: (i / count) * Math.PI, speed: 0.4 + (i % 4) * 0.18, ph: i * 1.1,
  })), [count]);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useFrame(() => {
    if (!meshRef.current || !groupRef.current) return;
    const bass = audioData.bass * audioSensitivity, mids = audioData.mids * audioSensitivity, highs = audioData.highs * audioSensitivity;
    if (coreRef.current) coreRef.current.scale.setScalar(0.42 * (1 + bass * 0.5));
    orbits.forEach((o, i) => {
      const a = time * o.speed + o.ph;
      const x = Math.cos(a) * o.r, z = Math.sin(a) * o.r;
      dummy.position.set(x, Math.sin(a) * o.r * Math.sin(o.tilt), z * Math.cos(o.tilt));
      dummy.scale.setScalar(0.13 + highs * 0.08 + bass * 0.05);
      dummy.rotation.set(time + i, time, 0);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
    groupRef.current.rotation.y += 0.004 + mids * 0.01;
  });
  return (
    <group ref={groupRef}>
      <mesh ref={coreRef}>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial {...NEUTRAL_SOLID} flatShading />
      </mesh>
      <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial {...NEUTRAL_SOLID} flatShading />
      </instancedMesh>
    </group>
  );
}

// --- Dodeca Scatter: dodecahedra on an expanding spherical shell ---
export function DodecaScatterShape({ config, audioData, time, audioSensitivity = 1 }: ShapeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = clamp(config.shapeParams.elementCount, 10, 22);
  const dirs = useMemo(() => Array.from({ length: count }, (_, i) => {
    const phi = Math.acos(1 - 2 * (i + 0.5) / count);
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;
    return new THREE.Vector3(Math.sin(phi) * Math.cos(theta), Math.sin(phi) * Math.sin(theta), Math.cos(phi));
  }), [count]);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useFrame(() => {
    if (!meshRef.current || !groupRef.current) return;
    const bass = audioData.bass * audioSensitivity, mids = audioData.mids * audioSensitivity, highs = audioData.highs * audioSensitivity;
    const shell = 0.7 + bass * 0.4;
    dirs.forEach((d, i) => {
      dummy.position.copy(d).multiplyScalar(shell);
      dummy.scale.setScalar(0.17 + highs * 0.07 * Math.sin(time * 7 + i) + bass * 0.05);
      dummy.rotation.set(time * 0.5 + i, time * 0.6, 0);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
    groupRef.current.rotation.y += 0.002 + mids * 0.009;
    groupRef.current.rotation.z = Math.sin(time * 0.25) * 0.15;
  });
  return (
    <group ref={groupRef}>
      <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial {...NEUTRAL_SOLID} flatShading />
      </instancedMesh>
    </group>
  );
}
