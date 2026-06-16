/**
 * Tube Lattice Shape - 3D cage of cylindrical struts connecting cube-grid nodes
 * Audio: Bass = lattice expansion, Mids = rotation, Highs = strut shimmer thickness
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ShapeProps, NEUTRAL_SOLID, clamp } from './ShapeBase';

export function TubeLatticeShape({ config, audioData, time, audioSensitivity = 1 }: ShapeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const nodesRef = useRef<THREE.InstancedMesh>(null);
  const strutsRef = useRef<THREE.InstancedMesh>(null);

  const { elementCount, scale: shapeScale } = config.shapeParams;
  const n = clamp(Math.round(Math.cbrt(elementCount)), 2, 4); // nodes per axis

  const { nodes, edges } = useMemo(() => {
    const nodeList: THREE.Vector3[] = [];
    const indexAt = (x: number, y: number, z: number) => x * n * n + y * n + z;
    const spacing = (shapeScale * 2.4) / (n - 1 || 1);
    const offset = ((n - 1) * spacing) / 2;
    for (let x = 0; x < n; x++)
      for (let y = 0; y < n; y++)
        for (let z = 0; z < n; z++)
          nodeList.push(new THREE.Vector3(x * spacing - offset, y * spacing - offset, z * spacing - offset));

    const edgeList: [number, number][] = [];
    for (let x = 0; x < n; x++) {
      for (let y = 0; y < n; y++) {
        for (let z = 0; z < n; z++) {
          const a = indexAt(x, y, z);
          if (x + 1 < n) edgeList.push([a, indexAt(x + 1, y, z)]);
          if (y + 1 < n) edgeList.push([a, indexAt(x, y + 1, z)]);
          if (z + 1 < n) edgeList.push([a, indexAt(x, y, z + 1)]);
        }
      }
    }
    return { nodes: nodeList, edges: edgeList };
  }, [n, shapeScale]);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const strutDummy = useMemo(() => new THREE.Object3D(), []);
  const up = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const quat = useMemo(() => new THREE.Quaternion(), []);

  useFrame(() => {
    if (!nodesRef.current || !strutsRef.current || !groupRef.current) return;

    const bass = audioData.bass * audioSensitivity;
    const mids = audioData.mids * audioSensitivity;
    const highs = audioData.highs * audioSensitivity;

    const expand = 1 + bass * 0.3 * Math.sin(time * 3);

    nodes.forEach((node, i) => {
      dummy.position.copy(node).multiplyScalar(expand);
      dummy.scale.setScalar(shapeScale * 0.1 + bass * 0.03);
      dummy.updateMatrix();
      nodesRef.current!.setMatrixAt(i, dummy.matrix);
    });
    nodesRef.current.instanceMatrix.needsUpdate = true;

    edges.forEach((edge, i) => {
      const p0 = nodes[edge[0]].clone().multiplyScalar(expand);
      const p1 = nodes[edge[1]].clone().multiplyScalar(expand);
      const mid = p0.clone().add(p1).multiplyScalar(0.5);
      const dir = p1.clone().sub(p0);
      const length = dir.length();
      dir.normalize();
      strutDummy.position.copy(mid);
      quat.setFromUnitVectors(up, dir);
      strutDummy.quaternion.copy(quat);
      const thick = shapeScale * 0.025 * (1 + highs * 0.4 * Math.sin(time * 8 + i));
      strutDummy.scale.set(thick, length, thick);
      strutDummy.updateMatrix();
      strutsRef.current!.setMatrixAt(i, strutDummy.matrix);
    });
    strutsRef.current.instanceMatrix.needsUpdate = true;

    groupRef.current.rotation.y += 0.003 + mids * 0.008;
    groupRef.current.rotation.x += 0.001 + mids * 0.003;
  });

  return (
    <group ref={groupRef}>
      <instancedMesh ref={nodesRef} args={[undefined, undefined, nodes.length]}>
        <sphereGeometry args={[1, 10, 8]} />
        <meshStandardMaterial {...NEUTRAL_SOLID} />
      </instancedMesh>
      <instancedMesh ref={strutsRef} args={[undefined, undefined, edges.length]}>
        <cylinderGeometry args={[1, 1, 1, 6]} />
        <meshStandardMaterial {...NEUTRAL_SOLID} emissiveIntensity={0.05} />
      </instancedMesh>
    </group>
  );
}

export default TubeLatticeShape;
