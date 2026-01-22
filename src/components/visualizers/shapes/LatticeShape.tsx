/**
 * Lattice Shape - Wireframe polyhedra with pulsing vertex nodes
 * Audio: Bass = node scale, Mids = rotation, Highs = edge opacity
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ShapeProps, NEUTRAL_SOLID, getIcosahedronVertices, getDodecahedronVertices, clamp } from './ShapeBase';

export function LatticeShape({ config, audioData, time, audioSensitivity = 1 }: ShapeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const nodesRef = useRef<THREE.InstancedMesh>(null);
  const edgesRef = useRef<THREE.LineSegments>(null);
  
  const { elementCount, scale: shapeScale } = config.shapeParams;
  
  // Generate lattice structure
  const { nodePositions, edgeIndices } = useMemo(() => {
    const useIcosahedron = elementCount < 60;
    const baseVertices = useIcosahedron 
      ? getIcosahedronVertices(shapeScale)
      : getDodecahedronVertices(shapeScale);
    
    // Create layers of vertices
    const layers = Math.ceil(elementCount / baseVertices.length);
    const positions: THREE.Vector3[] = [];
    
    for (let layer = 0; layer < layers; layer++) {
      const layerScale = 0.6 + layer * 0.4;
      baseVertices.forEach(v => {
        if (positions.length < elementCount) {
          positions.push(v.clone().multiplyScalar(layerScale));
        }
      });
    }
    
    // Generate edges between nearby vertices
    const edges: number[] = [];
    const maxDist = shapeScale * 0.8;
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        if (positions[i].distanceTo(positions[j]) < maxDist) {
          edges.push(i, j);
        }
      }
    }
    
    return { nodePositions: positions, edgeIndices: edges };
  }, [elementCount, shapeScale]);
  
  // Create edge geometry
  const edgeGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(edgeIndices.length * 3);
    
    for (let i = 0; i < edgeIndices.length; i++) {
      const vertex = nodePositions[edgeIndices[i]];
      positions[i * 3] = vertex.x;
      positions[i * 3 + 1] = vertex.y;
      positions[i * 3 + 2] = vertex.z;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geometry;
  }, [nodePositions, edgeIndices]);
  
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  useFrame(() => {
    if (!nodesRef.current || !groupRef.current) return;
    
    const bass = audioData.bass * audioSensitivity;
    const mids = audioData.mids * audioSensitivity;
    const highs = audioData.highs * audioSensitivity;
    
    // Update node instances with bass-driven scaling
    const nodeScale = 0.08 + bass * 0.12;
    nodePositions.forEach((pos, i) => {
      const phaseOffset = i * 0.2;
      const breathe = Math.sin(time * 2 + phaseOffset) * 0.02 * bass;
      
      dummy.position.copy(pos);
      dummy.position.multiplyScalar(1 + breathe);
      dummy.scale.setScalar(nodeScale + highs * 0.03 * Math.sin(time * 8 + i));
      dummy.updateMatrix();
      nodesRef.current!.setMatrixAt(i, dummy.matrix);
    });
    nodesRef.current.instanceMatrix.needsUpdate = true;
    
    // Rotate group based on mids
    groupRef.current.rotation.y += 0.002 + mids * 0.01;
    groupRef.current.rotation.x = Math.sin(time * 0.5) * 0.1 * mids;
    
    // Update edge opacity based on highs
    if (edgesRef.current && edgesRef.current.material instanceof THREE.LineBasicMaterial) {
      edgesRef.current.material.opacity = clamp(0.3 + highs * 0.5, 0.2, 0.9);
    }
  });
  
  return (
    <group ref={groupRef}>
      {/* Vertex nodes */}
      <instancedMesh ref={nodesRef} args={[undefined, undefined, nodePositions.length]}>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial {...NEUTRAL_SOLID} />
      </instancedMesh>
      
      {/* Edge lines */}
      <lineSegments ref={edgesRef} geometry={edgeGeometry}>
        <lineBasicMaterial color={0xcccccc} transparent opacity={0.5} />
      </lineSegments>
    </group>
  );
}

export default LatticeShape;
