/**
 * Organic / misc family - orbiting atom, merging blob cluster, 3D star grid,
 * twisting prism tower. Neutral white materials (parent recolours); bass pulses,
 * mids spin/orbit, highs shimmer. Bounded ~1.3r so the parent frames cleanly.
 */
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ShapeProps, NEUTRAL_SOLID, clamp } from '../ShapeBase';

// --- Atom: nucleus + tilted orbit rings with electrons whipping around ---
export function AtomShape({ config, audioData, time, audioSensitivity = 1 }: ShapeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const nucRef = useRef<THREE.Mesh>(null);
  const elecRef = useRef<THREE.InstancedMesh>(null);
  const rings = useMemo(() => ([
    { tilt: [0, 0, 0] as [number, number, number] },
    { tilt: [Math.PI / 3, 0, Math.PI / 4] as [number, number, number] },
    { tilt: [-Math.PI / 3, 0, -Math.PI / 4] as [number, number, number] },
  ]), []);
  const count = 3;
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const m4 = useMemo(() => new THREE.Matrix4(), []);
  const euler = useMemo(() => new THREE.Euler(), []);
  useFrame(() => {
    if (!groupRef.current || !elecRef.current) return;
    const bass = audioData.bass * audioSensitivity, mids = audioData.mids * audioSensitivity, highs = audioData.highs * audioSensitivity;
    if (nucRef.current) nucRef.current.scale.setScalar(0.34 * (1 + bass * 0.5 + highs * 0.15));
    rings.forEach((r, i) => {
      const a = time * (1.4 + mids * 1.2) + i * 2.1;
      const local = new THREE.Vector3(Math.cos(a) * 0.95, Math.sin(a) * 0.95, 0);
      euler.set(r.tilt[0], r.tilt[1], r.tilt[2]);
      m4.makeRotationFromEuler(euler);
      local.applyMatrix4(m4);
      dummy.position.copy(local);
      dummy.scale.setScalar(0.12 + bass * 0.05);
      dummy.updateMatrix();
      elecRef.current!.setMatrixAt(i, dummy.matrix);
    });
    elecRef.current.instanceMatrix.needsUpdate = true;
    groupRef.current.rotation.y += 0.003 + mids * 0.008;
  });
  return (
    <group ref={groupRef}>
      <mesh ref={nucRef}><icosahedronGeometry args={[1, 1]} /><meshStandardMaterial {...NEUTRAL_SOLID} flatShading /></mesh>
      {rings.map((r, i) => (
        <mesh key={i} rotation={r.tilt}><torusGeometry args={[0.95, 0.022, 8, 60]} /><meshStandardMaterial {...NEUTRAL_SOLID} /></mesh>
      ))}
      <instancedMesh ref={elecRef} args={[undefined, undefined, count]}>
        <sphereGeometry args={[1, 12, 10]} />
        <meshStandardMaterial {...NEUTRAL_SOLID} />
      </instancedMesh>
    </group>
  );
}

// --- Blob Cluster: overlapping spheres that breathe and merge (metaball feel) ---
export function BlobClusterShape({ config, audioData, time, audioSensitivity = 1 }: ShapeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = clamp(config.shapeParams.elementCount, 7, 16);
  const blobs = useMemo(() => Array.from({ length: count }, (_, i) => {
    const phi = Math.acos(1 - 2 * (i + 0.5) / count);
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;
    return {
      dir: new THREE.Vector3(Math.sin(phi) * Math.cos(theta), Math.sin(phi) * Math.sin(theta), Math.cos(phi)),
      r: 0.32 + (i % 4) * 0.06, ph: i * 0.9,
    };
  }), [count]);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useFrame(() => {
    if (!meshRef.current || !groupRef.current) return;
    const bass = audioData.bass * audioSensitivity, mids = audioData.mids * audioSensitivity, highs = audioData.highs * audioSensitivity;
    const spread = 0.45 + Math.sin(time * 0.6) * 0.1 - bass * 0.18; // bass pulls them together
    blobs.forEach((b, i) => {
      dummy.position.copy(b.dir).multiplyScalar(Math.max(0.12, spread));
      dummy.scale.setScalar(b.r * (1 + bass * 0.35 + highs * 0.12 * Math.sin(time * 6 + b.ph)));
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
    groupRef.current.rotation.y += 0.0025 + mids * 0.008;
    groupRef.current.rotation.x = Math.sin(time * 0.4) * 0.2;
  });
  return (
    <group ref={groupRef}>
      <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
        <sphereGeometry args={[1, 18, 14]} />
        <meshStandardMaterial {...NEUTRAL_SOLID} />
      </instancedMesh>
    </group>
  );
}

// --- Star Grid: small octahedra in a 3x3x3 lattice, pulsing from the centre ---
export function StarGridShape({ config, audioData, time, audioSensitivity = 1 }: ShapeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const n = clamp(Math.round(Math.cbrt(config.shapeParams.elementCount)), 3, 4);
  const cells = useMemo(() => {
    const arr: { pos: THREE.Vector3; d: number }[] = [];
    const step = 1.8 / (n - 1);
    for (let x = 0; x < n; x++) for (let y = 0; y < n; y++) for (let z = 0; z < n; z++) {
      const p = new THREE.Vector3((x - (n - 1) / 2) * step, (y - (n - 1) / 2) * step, (z - (n - 1) / 2) * step);
      arr.push({ pos: p, d: p.length() });
    }
    return arr;
  }, [n]);
  const count = cells.length;
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useFrame(() => {
    if (!meshRef.current || !groupRef.current) return;
    const bass = audioData.bass * audioSensitivity, mids = audioData.mids * audioSensitivity, highs = audioData.highs * audioSensitivity;
    cells.forEach((c, i) => {
      const wave = Math.sin(time * 5 - c.d * 3.0);
      dummy.position.copy(c.pos).multiplyScalar(1 + bass * 0.12);
      dummy.scale.setScalar(0.12 + Math.max(0, wave) * (0.1 + bass * 0.15) + highs * 0.04);
      dummy.rotation.set(time * 0.5 + i, time * 0.4, 0);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
    groupRef.current.rotation.y += 0.003 + mids * 0.01;
    groupRef.current.rotation.x += 0.0015 + mids * 0.004;
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

// --- Prism Tower: stacked hexagonal prisms twisting into a tower ---
export function PrismTowerShape({ config, audioData, time, audioSensitivity = 1 }: ShapeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const count = clamp(config.shapeParams.elementCount, 6, 12);
  const items = useMemo(() => Array.from({ length: count }, (_, i) => {
    const t = i / (count - 1);
    return { y: (t - 0.5) * 1.8, base: 0.5 - Math.abs(t - 0.5) * 0.22, twist: i * 0.4 };
  }), [count]);
  useFrame(() => {
    if (!groupRef.current) return;
    const bass = audioData.bass * audioSensitivity, mids = audioData.mids * audioSensitivity, highs = audioData.highs * audioSensitivity;
    items.forEach((it, i) => {
      const m = refs.current[i]; if (!m) return;
      const pulse = 1 + bass * 0.25 + highs * 0.12 * Math.sin(time * 6 - i * 0.7);
      m.scale.set(it.base * pulse, 1, it.base * pulse);
      m.rotation.y = it.twist + time * (0.3 + mids * 0.6);
    });
    groupRef.current.rotation.y += 0.0015 + mids * 0.005;
  });
  return (
    <group ref={groupRef}>
      {items.map((it, i) => (
        <mesh key={i} ref={(el) => (refs.current[i] = el)} position={[0, it.y, 0]}>
          <cylinderGeometry args={[1, 1, 1.8 / count, 6]} />
          <meshStandardMaterial {...NEUTRAL_SOLID} flatShading />
        </mesh>
      ))}
    </group>
  );
}
