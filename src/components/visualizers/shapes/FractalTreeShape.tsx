/**
 * Fractal Tree Shape - Recursive branching structure
 * Audio: Bass = branch thickness, Mids = branch sway, Highs = leaf jitter
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ShapeProps, NEUTRAL_SOLID, clamp } from './ShapeBase';

interface Branch {
  start: THREE.Vector3;
  end: THREE.Vector3;
  thickness: number;
  depth: number;
  angle: number;
}

export function FractalTreeShape({ config, audioData, time, audioSensitivity = 1 }: ShapeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const branchesRef = useRef<THREE.InstancedMesh>(null);
  const leavesRef = useRef<THREE.InstancedMesh>(null);
  
  const { elementCount, scale: shapeScale } = config.shapeParams;
  const maxDepth = clamp(Math.floor(elementCount / 25), 3, 5);
  
  // Generate fractal tree structure
  const { branches, leaves } = useMemo(() => {
    const branchList: Branch[] = [];
    const leafList: THREE.Vector3[] = [];
    
    function generateBranch(
      start: THREE.Vector3,
      direction: THREE.Vector3,
      length: number,
      thickness: number,
      depth: number,
      angle: number
    ) {
      const end = start.clone().add(direction.clone().multiplyScalar(length));
      
      branchList.push({ start, end, thickness, depth, angle });
      
      if (depth < maxDepth) {
        const childCount = depth < 2 ? 3 : 2;
        const spreadAngle = Math.PI / 4;
        
        for (let i = 0; i < childCount; i++) {
          const childAngle = ((i / (childCount - 1)) - 0.5) * spreadAngle * 2;
          
          // Rotate direction
          const axis = new THREE.Vector3(
            Math.random() - 0.5,
            0.2,
            Math.random() - 0.5
          ).normalize();
          
          const childDir = direction.clone()
            .applyAxisAngle(axis, childAngle)
            .normalize();
          
          generateBranch(
            end,
            childDir,
            length * 0.7,
            thickness * 0.6,
            depth + 1,
            angle + childAngle
          );
        }
      } else {
        // Add leaf at end
        leafList.push(end);
      }
    }
    
    // Start with trunk
    generateBranch(
      new THREE.Vector3(0, -shapeScale, 0),
      new THREE.Vector3(0, 1, 0),
      shapeScale * 0.8,
      0.1,
      0,
      0
    );
    
    return { branches: branchList, leaves: leafList };
  }, [maxDepth, shapeScale]);
  
  const branchDummy = useMemo(() => new THREE.Object3D(), []);
  const leafDummy = useMemo(() => new THREE.Object3D(), []);
  
  useFrame(() => {
    if (!branchesRef.current || !leavesRef.current || !groupRef.current) return;
    
    const bass = audioData.bass * audioSensitivity;
    const mids = audioData.mids * audioSensitivity;
    const highs = audioData.highs * audioSensitivity;
    
    // Update branches
    branches.forEach((branch, i) => {
      const { start, end, thickness, depth, angle } = branch;
      
      // Mids sway the branches
      const swayAmount = mids * 0.15 * (depth + 1);
      const sway = Math.sin(time * 2 + angle + depth) * swayAmount;
      
      const swayedEnd = end.clone();
      swayedEnd.x += sway;
      swayedEnd.z += sway * 0.5;
      
      // Position at midpoint
      const mid = start.clone().add(swayedEnd).multiplyScalar(0.5);
      branchDummy.position.copy(mid);
      
      // Orient toward end
      branchDummy.lookAt(swayedEnd);
      branchDummy.rotateX(Math.PI / 2);
      
      // Scale: thickness from bass, length from distance
      const length = start.distanceTo(swayedEnd);
      const thicknessFactor = 1 + bass * 0.3;
      branchDummy.scale.set(
        thickness * thicknessFactor,
        length,
        thickness * thicknessFactor
      );
      
      branchDummy.updateMatrix();
      branchesRef.current!.setMatrixAt(i, branchDummy.matrix);
    });
    
    branchesRef.current.instanceMatrix.needsUpdate = true;
    
    // Update leaves
    leaves.forEach((leafPos, i) => {
      // Highs jitter the leaves
      const jitter = highs * 0.1;
      
      leafDummy.position.set(
        leafPos.x + Math.sin(time * 8 + i * 2) * jitter,
        leafPos.y + Math.cos(time * 7 + i * 3) * jitter * 0.5,
        leafPos.z + Math.sin(time * 9 + i) * jitter
      );
      
      const leafScale = 0.06 + bass * 0.03;
      leafDummy.scale.setScalar(leafScale);
      leafDummy.updateMatrix();
      leavesRef.current!.setMatrixAt(i, leafDummy.matrix);
    });
    
    leavesRef.current.instanceMatrix.needsUpdate = true;
    
    // Gentle rotation
    groupRef.current.rotation.y += 0.002 + mids * 0.003;
  });
  
  return (
    <group ref={groupRef}>
      {/* Branches */}
      <instancedMesh ref={branchesRef} args={[undefined, undefined, branches.length]}>
        <cylinderGeometry args={[1, 0.8, 1, 6]} />
        <meshStandardMaterial {...NEUTRAL_SOLID} />
      </instancedMesh>
      
      {/* Leaves */}
      <instancedMesh ref={leavesRef} args={[undefined, undefined, leaves.length]}>
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial {...NEUTRAL_SOLID} emissiveIntensity={0.12} />
      </instancedMesh>
    </group>
  );
}

export default FractalTreeShape;
