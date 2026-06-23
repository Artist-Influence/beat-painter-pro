/**
 * Bar / spike / totem family - equalizer pillar grids, sea-urchin spikes, stacked
 * diamond totems, concentric ripple rings. Neutral white materials (parent
 * recolours); bass/mids/highs drive heights, spike length, pulse. Bounded ~1.3r.
 */
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ShapeProps, NEUTRAL_SOLID, clamp } from '../ShapeBase';

// --- Pillar Array: a grid of vertical bars that jump like an equalizer ---
export function PillarArrayShape({ config, audioData, time, audioSensitivity = 1 }: ShapeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const side = clamp(Math.round(Math.sqrt(config.shapeParams.elementCount)), 4, 8);
  const count = side * side;
  const cells = useMemo(() => {
    const arr: { x: number; z: number; ph: number; band: number }[] = [];
    for (let r = 0; r < side; r++) for (let c = 0; c < side; c++) {
      arr.push({ x: (c - (side - 1) / 2) * (1.8 / side), z: (r - (side - 1) / 2) * (1.8 / side), ph: (r + c) * 0.5, band: (r + c) % 3 });
    }
    return arr;
  }, [side]);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useFrame(() => {
    if (!meshRef.current || !groupRef.current) return;
    const bass = audioData.bass * audioSensitivity, mids = audioData.mids * audioSensitivity, highs = audioData.highs * audioSensitivity;
    const w = 1.5 / side;
    cells.forEach((c, i) => {
      const band = c.band === 0 ? bass : c.band === 1 ? mids : highs;
      const h = 0.2 + band * 1.0 + 0.12 * Math.sin(time * 4 + c.ph);
      dummy.position.set(c.x, h / 2 - 0.4, c.z);
      dummy.scale.set(w * 0.8, h, w * 0.8);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
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

// --- Spike Urchin: dense thin spikes bristling from a core ---
export function SpikeUrchinShape({ config, audioData, time, audioSensitivity = 1 }: ShapeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const count = clamp(config.shapeParams.elementCount, 40, 120);
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
    if (coreRef.current) coreRef.current.scale.setScalar(0.3 * (1 + bass * 0.4));
    dirs.forEach((d, i) => {
      const len = 0.5 + bass * 0.5 + highs * 0.18 * Math.sin(time * 11 + i);
      quat.setFromUnitVectors(up, d);
      dummy.position.copy(d).multiplyScalar(0.25 + len * 0.5);
      dummy.quaternion.copy(quat);
      dummy.scale.set(0.04, len, 0.04);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
    groupRef.current.rotation.y += 0.003 + mids * 0.01;
    groupRef.current.rotation.x += 0.0015 + mids * 0.004;
  });
  return (
    <group ref={groupRef}>
      <mesh ref={coreRef}><sphereGeometry args={[1, 18, 14]} /><meshStandardMaterial {...NEUTRAL_SOLID} /></mesh>
      <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
        <coneGeometry args={[1, 1, 4]} />
        <meshStandardMaterial {...NEUTRAL_SOLID} flatShading />
      </instancedMesh>
    </group>
  );
}

// --- Diamond Totem: octahedra stacked into a totem, a pulse travelling up ---
export function DiamondTotemShape({ config, audioData, time, audioSensitivity = 1 }: ShapeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const count = clamp(config.shapeParams.elementCount, 5, 9);
  const items = useMemo(() => Array.from({ length: count }, (_, i) => {
    const t = i / (count - 1);
    return { y: (t - 0.5) * 1.8, base: 0.42 - Math.abs(t - 0.5) * 0.3 };
  }), [count]);
  useFrame(() => {
    if (!groupRef.current) return;
    const bass = audioData.bass * audioSensitivity, mids = audioData.mids * audioSensitivity, highs = audioData.highs * audioSensitivity;
    items.forEach((it, i) => {
      const m = refs.current[i]; if (!m) return;
      const wave = Math.sin(time * 5 - i * 0.9);
      m.scale.setScalar(it.base * (1 + bass * 0.3 + Math.max(0, wave) * (0.18 + highs * 0.2)));
      m.rotation.y = time * (0.4 + mids * 0.5) + i * 0.4;
    });
    groupRef.current.rotation.y += 0.002 + mids * 0.006;
  });
  return (
    <group ref={groupRef}>
      {items.map((it, i) => (
        <mesh key={i} ref={(el) => (refs.current[i] = el)} position={[0, it.y, 0]}>
          <octahedronGeometry args={[1, 0]} />
          <meshStandardMaterial {...NEUTRAL_SOLID} flatShading />
        </mesh>
      ))}
    </group>
  );
}

// --- Ring Ripple: flat concentric rings rippling outward on the beat ---
export function RingRippleShape({ config, audioData, time, audioSensitivity = 1 }: ShapeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const count = clamp(config.shapeParams.elementCount, 5, 9);
  useFrame(() => {
    if (!groupRef.current) return;
    const bass = audioData.bass * audioSensitivity, mids = audioData.mids * audioSensitivity, highs = audioData.highs * audioSensitivity;
    for (let i = 0; i < count; i++) {
      const m = refs.current[i]; if (!m) continue;
      const phase = time * 2.4 - i * 0.7;
      const pulse = 0.5 + 0.5 * Math.sin(phase);
      const s = 0.2 + i * (1.1 / count) + bass * 0.15 + pulse * (0.06 + highs * 0.08);
      m.scale.set(s, s, 1);
      m.position.z = Math.sin(phase) * 0.12;
    }
    groupRef.current.rotation.z += 0.004 + mids * 0.012;
    groupRef.current.rotation.x = 0.45;
  });
  return (
    <group ref={groupRef}>
      {Array.from({ length: count }, (_, i) => (
        <mesh key={i} ref={(el) => (refs.current[i] = el)}>
          <torusGeometry args={[1, 0.045, 10, 40]} />
          <meshStandardMaterial {...NEUTRAL_SOLID} />
        </mesh>
      ))}
    </group>
  );
}
