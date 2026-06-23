/**
 * Family III (to 80) - cube ring, cone ring, pillar ring, sphere cage, plate
 * stack, orbit rings, tetra tower, wedge fan, burst lines. Neutral white
 * materials (parent recolours); bass pulse, mids spin/orbit, highs shimmer.
 * Bounded ~1.2r for clean framing.
 */
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ShapeProps, NEUTRAL_SOLID, clamp } from '../ShapeBase';

const up = new THREE.Vector3(0, 1, 0);

// --- Cube Ring: cubes orbiting on a flat ring, tumbling ---
export function CubeRingShape({ config, audioData, time, audioSensitivity = 1 }: ShapeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = clamp(config.shapeParams.elementCount, 8, 16);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useFrame(() => {
    if (!meshRef.current || !groupRef.current) return;
    const bass = audioData.bass * audioSensitivity, mids = audioData.mids * audioSensitivity, highs = audioData.highs * audioSensitivity;
    const r = 0.85 * (1 + bass * 0.22);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + time * (0.25 + mids * 0.45);
      dummy.position.set(Math.cos(a) * r, Math.sin(time * 1.4 + i) * 0.1, Math.sin(a) * r);
      dummy.rotation.set(time + i, time * 0.8, 0);
      dummy.scale.setScalar(0.26 + bass * 0.12 + highs * 0.05 * Math.sin(time * 9 + i));
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
    groupRef.current.rotation.x = 0.32 + Math.sin(time * 0.3) * 0.1;
  });
  return (
    <group ref={groupRef}>
      <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
        <boxGeometry args={[1, 1, 1]} /><meshStandardMaterial {...NEUTRAL_SOLID} />
      </instancedMesh>
    </group>
  );
}

// --- Cone Ring: upright cones standing in a circle, pulsing ---
export function ConeRingShape({ config, audioData, time, audioSensitivity = 1 }: ShapeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = clamp(config.shapeParams.elementCount, 8, 16);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useFrame(() => {
    if (!meshRef.current || !groupRef.current) return;
    const bass = audioData.bass * audioSensitivity, mids = audioData.mids * audioSensitivity, highs = audioData.highs * audioSensitivity;
    const r = 0.8 * (1 + bass * 0.18);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const h = 0.5 + bass * 0.4 + highs * 0.12 * Math.sin(time * 8 + i);
      dummy.position.set(Math.cos(a) * r, h * 0.5 - 0.3, Math.sin(a) * r);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(0.22, h, 0.22);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
    groupRef.current.rotation.y += 0.004 + mids * 0.012;
  });
  return (
    <group ref={groupRef}>
      <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
        <coneGeometry args={[1, 1, 6]} /><meshStandardMaterial {...NEUTRAL_SOLID} flatShading />
      </instancedMesh>
    </group>
  );
}

// --- Pillar Ring: tall slabs standing in a circle (stonehenge) ---
export function PillarRingShape({ config, audioData, time, audioSensitivity = 1 }: ShapeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = clamp(config.shapeParams.elementCount, 7, 14);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useFrame(() => {
    if (!meshRef.current || !groupRef.current) return;
    const bass = audioData.bass * audioSensitivity, mids = audioData.mids * audioSensitivity, highs = audioData.highs * audioSensitivity;
    const r = 0.85;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const h = 1.0 + bass * 0.3 + highs * 0.2 * Math.sin(time * 5 + i);
      dummy.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
      dummy.rotation.set(0, -a, 0);
      dummy.scale.set(0.3, h, 0.12);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
    groupRef.current.rotation.y += 0.0025 + mids * 0.008;
    groupRef.current.rotation.x = Math.sin(time * 0.2) * 0.08;
  });
  return (
    <group ref={groupRef}>
      <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
        <boxGeometry args={[1, 1, 1]} /><meshStandardMaterial {...NEUTRAL_SOLID} />
      </instancedMesh>
    </group>
  );
}

// --- Sphere Cage: spheres at the corners + edge midpoints of a cube ---
export function SphereCageShape({ audioData, time, audioSensitivity = 1 }: ShapeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const pts = useMemo(() => {
    const arr: THREE.Vector3[] = [];
    for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) {
      if (Math.abs(x) + Math.abs(y) + Math.abs(z) >= 2) arr.push(new THREE.Vector3(x, y, z));
    }
    return arr;
  }, []);
  const count = pts.length;
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useFrame(() => {
    if (!meshRef.current || !groupRef.current) return;
    const bass = audioData.bass * audioSensitivity, mids = audioData.mids * audioSensitivity, highs = audioData.highs * audioSensitivity;
    const s = 0.62 * (1 + bass * 0.22);
    pts.forEach((p, i) => {
      dummy.position.copy(p).multiplyScalar(s);
      dummy.scale.setScalar(0.16 + bass * 0.05 + highs * 0.05 * Math.sin(time * 8 + i));
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
    groupRef.current.rotation.x += 0.003 + mids * 0.008;
    groupRef.current.rotation.y += 0.004 + mids * 0.01;
  });
  return (
    <group ref={groupRef}>
      <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
        <sphereGeometry args={[1, 14, 12]} /><meshStandardMaterial {...NEUTRAL_SOLID} />
      </instancedMesh>
    </group>
  );
}

// --- Plate Stack: thin discs stacked and fanned by rotation ---
export function PlateStackShape({ config, audioData, time, audioSensitivity = 1 }: ShapeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const count = clamp(config.shapeParams.elementCount, 7, 13);
  const items = useMemo(() => Array.from({ length: count }, (_, i) => {
    const t = i / (count - 1);
    return { y: (t - 0.5) * 1.6, base: 0.55 - Math.abs(t - 0.5) * 0.2 };
  }), [count]);
  useFrame(() => {
    if (!groupRef.current) return;
    const bass = audioData.bass * audioSensitivity, mids = audioData.mids * audioSensitivity, highs = audioData.highs * audioSensitivity;
    items.forEach((it, i) => {
      const m = refs.current[i]; if (!m) return;
      const s = it.base * (1 + bass * 0.2 + highs * 0.1 * Math.sin(time * 6 - i * 0.6));
      m.scale.set(s, 1, s);
      m.rotation.y = time * (0.3 + mids * 0.6) + i * 0.5;
    });
    groupRef.current.rotation.x = 0.18;
    groupRef.current.rotation.y += 0.002 + mids * 0.005;
  });
  return (
    <group ref={groupRef}>
      {items.map((it, i) => (
        <mesh key={i} ref={(el) => (refs.current[i] = el)} position={[0, it.y, 0]}>
          <cylinderGeometry args={[1, 1, 0.08, 20]} /><meshStandardMaterial {...NEUTRAL_SOLID} />
        </mesh>
      ))}
    </group>
  );
}

// --- Orbit Rings: several flat rings at staggered tilts, no electrons ---
export function OrbitRingsShape({ config, audioData, time, audioSensitivity = 1 }: ShapeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const coreRef = useRef<THREE.Mesh>(null);
  const count = clamp(Math.round(config.shapeParams.elementCount / 3), 3, 6);
  const rings = useMemo(() => Array.from({ length: count }, (_, i) => ({
    tilt: [(i / count) * Math.PI, (i * 0.7), (i * 1.3)] as [number, number, number], r: 0.6 + (i % 3) * 0.16, dir: i % 2 ? 1 : -1,
  })), [count]);
  useFrame(() => {
    if (!groupRef.current) return;
    const bass = audioData.bass * audioSensitivity, mids = audioData.mids * audioSensitivity, highs = audioData.highs * audioSensitivity;
    if (coreRef.current) coreRef.current.scale.setScalar(0.28 * (1 + bass * 0.5 + highs * 0.15));
    rings.forEach((rg, i) => {
      const m = refs.current[i]; if (!m) return;
      m.rotation.z = time * rg.dir * (0.3 + mids * 0.5);
      m.scale.setScalar(rg.r * (1 + bass * 0.12));
    });
    groupRef.current.rotation.y += 0.003 + mids * 0.008;
  });
  return (
    <group ref={groupRef}>
      <mesh ref={coreRef}><icosahedronGeometry args={[1, 0]} /><meshStandardMaterial {...NEUTRAL_SOLID} flatShading /></mesh>
      {rings.map((rg, i) => (
        <mesh key={i} ref={(el) => (refs.current[i] = el)} rotation={rg.tilt}>
          <torusGeometry args={[1, 0.035, 8, 44]} /><meshStandardMaterial {...NEUTRAL_SOLID} />
        </mesh>
      ))}
    </group>
  );
}

// --- Tetra Tower: tetrahedra stacked + alternately flipped into a spire ---
export function TetraTowerShape({ config, audioData, time, audioSensitivity = 1 }: ShapeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const count = clamp(config.shapeParams.elementCount, 6, 11);
  const items = useMemo(() => Array.from({ length: count }, (_, i) => {
    const t = i / (count - 1);
    return { y: (t - 0.5) * 1.8, base: 0.4 - Math.abs(t - 0.5) * 0.16, flip: i % 2 === 1 };
  }), [count]);
  useFrame(() => {
    if (!groupRef.current) return;
    const bass = audioData.bass * audioSensitivity, mids = audioData.mids * audioSensitivity, highs = audioData.highs * audioSensitivity;
    items.forEach((it, i) => {
      const m = refs.current[i]; if (!m) return;
      const wave = Math.max(0, Math.sin(time * 5 - i * 0.8));
      m.scale.setScalar(it.base * (1 + bass * 0.22 + wave * (0.14 + highs * 0.16)));
      m.rotation.y = time * (0.4 + mids * 0.5) + i * 0.5;
    });
    groupRef.current.rotation.y += 0.0015 + mids * 0.004;
  });
  return (
    <group ref={groupRef}>
      {items.map((it, i) => (
        <mesh key={i} ref={(el) => (refs.current[i] = el)} position={[0, it.y, 0]} rotation={[it.flip ? Math.PI : 0, 0, 0]}>
          <tetrahedronGeometry args={[1, 0]} /><meshStandardMaterial {...NEUTRAL_SOLID} flatShading />
        </mesh>
      ))}
    </group>
  );
}

// --- Wedge Fan: cylinder-segment wedges fanning out radially ---
export function WedgeFanShape({ config, audioData, time, audioSensitivity = 1 }: ShapeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = clamp(config.shapeParams.elementCount, 6, 14);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useFrame(() => {
    if (!meshRef.current || !groupRef.current) return;
    const bass = audioData.bass * audioSensitivity, mids = audioData.mids * audioSensitivity, highs = audioData.highs * audioSensitivity;
    const len = 0.85 * (1 + bass * 0.2);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      dummy.position.set(Math.cos(a) * len * 0.5, 0, Math.sin(a) * len * 0.5);
      dummy.rotation.set(Math.PI / 2, 0, -a + Math.PI / 2);
      dummy.scale.set(0.22, len, 0.1 + highs * 0.06 * Math.sin(time * 7 + i));
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
    groupRef.current.rotation.y += 0.006 + mids * 0.02;
    groupRef.current.rotation.x = 0.4;
  });
  return (
    <group ref={groupRef}>
      <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
        <cylinderGeometry args={[1, 1, 1, 3]} /><meshStandardMaterial {...NEUTRAL_SOLID} flatShading />
      </instancedMesh>
    </group>
  );
}

// --- Burst Lines: thin long rods radiating from the centre ---
export function BurstLinesShape({ config, audioData, time, audioSensitivity = 1 }: ShapeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = clamp(config.shapeParams.elementCount, 30, 90);
  const dirs = useMemo(() => Array.from({ length: count }, (_, i) => {
    const phi = Math.acos(1 - 2 * (i + 0.5) / count);
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;
    return new THREE.Vector3(Math.sin(phi) * Math.cos(theta), Math.sin(phi) * Math.sin(theta), Math.cos(phi));
  }), [count]);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const quat = useMemo(() => new THREE.Quaternion(), []);
  useFrame(() => {
    if (!meshRef.current || !groupRef.current) return;
    const bass = audioData.bass * audioSensitivity, mids = audioData.mids * audioSensitivity, highs = audioData.highs * audioSensitivity;
    dirs.forEach((d, i) => {
      const len = 0.5 + bass * 0.55 + highs * 0.15 * Math.sin(time * 11 + i);
      quat.setFromUnitVectors(up, d);
      dummy.position.copy(d).multiplyScalar(len * 0.5);
      dummy.quaternion.copy(quat);
      dummy.scale.set(0.02, len, 0.02);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
    groupRef.current.rotation.y += 0.004 + mids * 0.012;
    groupRef.current.rotation.x += 0.002 + mids * 0.005;
  });
  return (
    <group ref={groupRef}>
      <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
        <cylinderGeometry args={[1, 1, 1, 5]} /><meshStandardMaterial {...NEUTRAL_SOLID} />
      </instancedMesh>
    </group>
  );
}
