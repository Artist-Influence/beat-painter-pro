/**
 * Cube Lattice Shape - 3D cubic grid structure
 * Audio: Bass = node scale pulse, Mids = lattice breathing, Highs = edge flicker
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ShapeProps, NEUTRAL_SOLID, clamp } from './ShapeBase';

export function CubeLatticeShape({ config, audioData, time, audioSensitivity = 1 }: ShapeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const nodesRef = useRef<THREE.InstancedMesh>(null);
  const edgesRef = useRef<THREE.InstancedMesh>(null);
  
  const { elementCount, scale: shapeScale } = config.shapeParams;
  
  // Determine grid size (3x3x3, 4x4x4, or 5x5x5)
  const gridSize = elementCount < 50 ? 3 : elementCount < 100 ? 4 : 5;
  const nodeCount = gridSize * gridSize * gridSize;
  
  // Generate lattice structure
  const { nodePositions, edges } = useMemo(() => {
    const positions: THREE.Vector3[] = [];
    const edgeList: { start: THREE.Vector3; end: THREE.Vector3 }[] = [];
    
    const spacing = shapeScale * 2 / (gridSize - 1);
    const offset = shapeScale;
    
    // Create nodes
    for (let x = 0; x < gridSize; x++) {
      for (let y = 0; y < gridSize; y++) {
        for (let z = 0; z < gridSize; z++) {
          positions.push(new THREE.Vector3(
            x * spacing - offset,
            y * spacing - offset,
            z * spacing - offset
          ));
        }
      }
    }
    
    // Create edges between adjacent nodes
    for (let i = 0; i < positions.length; i++) {
      const [x, y, z] = [
        Math.floor(i / (gridSize * gridSize)),
        Math.floor((i / gridSize) % gridSize),
        i % gridSize
      ];
      
      // Connect to neighbors in +x, +y, +z directions
      if (x < gridSize - 1) {
        const neighborIdx = i + gridSize * gridSize;
        if (neighborIdx < positions.length) {
          edgeList.push({ start: positions[i], end: positions[neighborIdx] });
        }
      }
      if (y < gridSize - 1) {
        const neighborIdx = i + gridSize;
        if (neighborIdx < positions.length) {
          edgeList.push({ start: positions[i], end: positions[neighborIdx] });
        }
      }
      if (z < gridSize - 1) {
        const neighborIdx = i + 1;
        if (neighborIdx < positions.length) {
          edgeList.push({ start: positions[i], end: positions[neighborIdx] });
        }
      }
    }
    
    return { nodePositions: positions, edges: edgeList };
  }, [gridSize, shapeScale]);
  
  const nodeDummy = useMemo(() => new THREE.Object3D(), []);
  const edgeDummy = useMemo(() => new THREE.Object3D(), []);
  
  useFrame(() => {
    if (!nodesRef.current || !edgesRef.current || !groupRef.current) return;
    
    const bass = audioData.bass * audioSensitivity;
    const mids = audioData.mids * audioSensitivity;
    const highs = audioData.highs * audioSensitivity;
    
    // Lattice breathing factor from mids
    const breathe = 1 + mids * 0.2 * Math.sin(time * 2);
    
    // Update nodes
    nodePositions.forEach((pos, i) => {
      const breathedPos = pos.clone().multiplyScalar(breathe);
      nodeDummy.position.copy(breathedPos);
      
      // Bass pulses node scale
      const pulse = 1 + bass * 0.4 * Math.sin(time * 4 + i * 0.3);
      const nodeScale = 0.08 * pulse;
      nodeDummy.scale.setScalar(nodeScale);
      
      nodeDummy.updateMatrix();
      nodesRef.current!.setMatrixAt(i, nodeDummy.matrix);
    });
    
    nodesRef.current.instanceMatrix.needsUpdate = true;
    
    // Update edges
    edges.forEach((edge, i) => {
      const start = edge.start.clone().multiplyScalar(breathe);
      const end = edge.end.clone().multiplyScalar(breathe);
      
      const mid = start.clone().add(end).multiplyScalar(0.5);
      const length = start.distanceTo(end);
      
      edgeDummy.position.copy(mid);
      edgeDummy.lookAt(end);
      edgeDummy.rotateX(Math.PI / 2);
      
      // Highs flicker edge thickness
      const thickness = 0.02 + highs * 0.015 * Math.sin(time * 12 + i);
      edgeDummy.scale.set(thickness, length, thickness);
      
      edgeDummy.updateMatrix();
      edgesRef.current!.setMatrixAt(i, edgeDummy.matrix);
    });
    
    edgesRef.current.instanceMatrix.needsUpdate = true;
    
    // Rotate the lattice
    groupRef.current.rotation.y += 0.003 + mids * 0.005;
    groupRef.current.rotation.x = Math.sin(time * 0.3) * 0.15;
  });
  
  return (
    <group ref={groupRef}>
      {/* Nodes */}
      <instancedMesh ref={nodesRef} args={[undefined, undefined, nodeCount]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial {...NEUTRAL_SOLID} />
      </instancedMesh>
      
      {/* Edges */}
      <instancedMesh ref={edgesRef} args={[undefined, undefined, edges.length]}>
        <cylinderGeometry args={[1, 1, 1, 4]} />
        <meshStandardMaterial {...NEUTRAL_SOLID} emissiveIntensity={0.05} />
      </instancedMesh>
    </group>
  );
}

export default CubeLatticeShape;
