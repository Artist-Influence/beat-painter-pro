/**
 * Grid / cage family II - diamond grid, cube cross, nested shells, ring tunnel,
 * fan blades. Neutral white materials (parent recolours); bass pulse, mids spin,
 * highs shimmer. Bounded ~1.2r for clean framing.
 */
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ShapeProps, NEUTRAL_SOLID, NEUTRAL_WIREFRAME, clamp } from '../ShapeBase';

// --- Diamond Grid: octahedra on a flat plane, a ripple crossing the grid ---
export function DiamondGridShape({ config, audioData, time, audioSensitivity = 1 }: ShapeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const side = clamp(Math.round(Math.sqrt(config.shapeParams.elementCount)), 3, 6);
  const count = side * side;
  const cells = useMemo(() => {
    const arr: { x: number; z: number; d: number }[] = [];
    for (let r = 0; r < side; r++) for (let c = 0; c < side; c++) {
      const x = (c - (side - 1) / 2) * (1.9 / side), z = (r - (side - 1) / 2) * (1.9 / side);
      arr.push({ x, z, d: Math.hypot(x, z) });
    }
    return arr;
  }, [side]);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useFrame(() => {
    if (!meshRef.current || !groupRef.current) return;
    const bass = audioData.bass * audioSensitivity, mids = audioData.mids * audioSensitivity, highs = audioData.highs * audioSensitivity;
    cells.forEach((c, i) => {
      const wave = Math.sin(time * 4 - c.d * 3.0);
      dummy.position.set(c.x, wave * (0.12 + bass * 0.18), c.z);
      dummy.scale.setScalar(0.16 + Math.max(0, wave) * (0.08 + bass * 0.12) + highs * 0.04);
      dummy.rotation.set(0, time * 0.5 + i, 0);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
    groupRef.current.rotation.x = 0.6 + Math.sin(time * 0.25) * 0.1;
    groupRef.current.rotation.z += 0.002 + mids * 0.006;
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

// --- Cube Cross: cubes arranged into a 3D plus/cross that pulses ---
export function CubeCrossShape({ audioData, time, audioSensitivity = 1 }: ShapeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const arms = useMemo(() => {
    const pts: THREE.Vector3[] = [new THREE.Vector3(0, 0, 0)];
    const ax = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
    ax.forEach(([x, y, z]) => { for (let k = 1; k <= 2; k++) pts.push(new THREE.Vector3(x * k, y * k, z * k)); });
    return pts;
  }, []);
  const count = arms.length;
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useFrame(() => {
    if (!meshRef.current || !groupRef.current) return;
    const bass = audioData.bass * audioSensitivity, mids = audioData.mids * audioSensitivity, highs = audioData.highs * audioSensitivity;
    const sp = 0.42 * (1 + bass * 0.3);
    arms.forEach((p, i) => {
      dummy.position.copy(p).multiplyScalar(sp);
      dummy.scale.setScalar(0.28 + highs * 0.06 * Math.sin(time * 8 + i) + (i === 0 ? bass * 0.18 : 0));
      dummy.rotation.set(time * 0.3, time * 0.4, 0);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
    groupRef.current.rotation.x += 0.003 + mids * 0.01;
    groupRef.current.rotation.y += 0.004 + mids * 0.01;
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

// --- Nested Shells: concentric wireframe icosahedra counter-rotating ---
export function NestedShellsShape({ config, audioData, time, audioSensitivity = 1 }: ShapeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const coreRef = useRef<THREE.Mesh>(null);
  const count = clamp(Math.round(config.shapeParams.elementCount / 6), 3, 5);
  const shells = useMemo(() => Array.from({ length: count }, (_, i) => ({ r: 0.45 + i * (0.7 / count), dir: i % 2 ? 1 : -1, detail: i % 2 })), [count]);
  useFrame(() => {
    if (!groupRef.current) return;
    const bass = audioData.bass * audioSensitivity, mids = audioData.mids * audioSensitivity, highs = audioData.highs * audioSensitivity;
    shells.forEach((sh, i) => {
      const m = refs.current[i]; if (!m) return;
      m.rotation.x = time * sh.dir * (0.2 + mids * 0.4);
      m.rotation.y = time * sh.dir * (0.3 + mids * 0.3);
      m.scale.setScalar(sh.r * (1 + bass * 0.1 + highs * 0.05 * Math.sin(time * 6 + i)));
    });
    if (coreRef.current) coreRef.current.scale.setScalar(0.3 * (1 + bass * 0.5));
    groupRef.current.rotation.y += 0.002 + mids * 0.005;
  });
  return (
    <group ref={groupRef}>
      <mesh ref={coreRef}><icosahedronGeometry args={[1, 0]} /><meshStandardMaterial {...NEUTRAL_SOLID} flatShading /></mesh>
      {shells.map((sh, i) => (
        <mesh key={i} ref={(el) => (refs.current[i] = el)}>
          <icosahedronGeometry args={[1, sh.detail]} />
          <meshStandardMaterial {...NEUTRAL_WIREFRAME} />
        </mesh>
      ))}
    </group>
  );
}

// --- Ring Tunnel: tori receding into depth like a wormhole ---
export function RingTunnelShape({ config, audioData, time, audioSensitivity = 1 }: ShapeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const count = clamp(config.shapeParams.elementCount, 8, 16);
  useFrame(() => {
    if (!groupRef.current) return;
    const bass = audioData.bass * audioSensitivity, mids = audioData.mids * audioSensitivity, highs = audioData.highs * audioSensitivity;
    for (let i = 0; i < count; i++) {
      const m = refs.current[i]; if (!m) continue;
      const phase = (i / count + time * (0.15 + bass * 0.2)) % 1;
      m.position.z = (phase - 0.5) * 2.0;
      const s = 0.5 + (1 - phase) * 0.6;
      m.scale.set(s, s, 1);
      m.rotation.z = time * (0.2 + mids * 0.4) + i;
      m.position.x = Math.sin(time + i) * 0.06;
      m.position.y = Math.cos(time + i) * 0.06 + highs * 0.05;
    }
    groupRef.current.rotation.z += 0.002 + mids * 0.006;
  });
  return (
    <group ref={groupRef}>
      {Array.from({ length: count }, (_, i) => (
        <mesh key={i} ref={(el) => (refs.current[i] = el)}>
          <torusGeometry args={[0.6, 0.05, 8, 28]} />
          <meshStandardMaterial {...NEUTRAL_SOLID} />
        </mesh>
      ))}
    </group>
  );
}

// --- Fan Blades: flat blades radiating like a turbine, spinning on mids ---
export function FanBladesShape({ config, audioData, time, audioSensitivity = 1 }: ShapeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const hubRef = useRef<THREE.Mesh>(null);
  const count = clamp(config.shapeParams.elementCount, 6, 14);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useFrame(() => {
    if (!meshRef.current || !groupRef.current) return;
    const bass = audioData.bass * audioSensitivity, mids = audioData.mids * audioSensitivity, highs = audioData.highs * audioSensitivity;
    if (hubRef.current) hubRef.current.scale.setScalar(0.26 * (1 + bass * 0.4));
    const len = 0.85 * (1 + bass * 0.18);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      dummy.position.set(Math.cos(a) * len * 0.5, 0, Math.sin(a) * len * 0.5);
      dummy.rotation.set(0, -a, 0.5 + highs * 0.3 * Math.sin(time * 6 + i));
      dummy.scale.set(len, 0.04, 0.22);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
    groupRef.current.rotation.y += 0.01 + mids * 0.05;
    groupRef.current.rotation.x = 0.4;
  });
  return (
    <group ref={groupRef}>
      <mesh ref={hubRef}><sphereGeometry args={[1, 16, 12]} /><meshStandardMaterial {...NEUTRAL_SOLID} /></mesh>
      <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial {...NEUTRAL_SOLID} />
      </instancedMesh>
    </group>
  );
}
