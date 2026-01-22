/**
 * Helix Shape - DNA-style double helix structure
 * Audio: Bass = helix radius breathing, Mids = twist acceleration, Highs = sphere jitter
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ShapeProps, NEUTRAL_SOLID, clamp } from './ShapeBase';

export function HelixShape({ config, audioData, time, audioSensitivity = 1 }: ShapeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const instancedRef = useRef<THREE.InstancedMesh>(null);
  const connectorsRef = useRef<THREE.InstancedMesh>(null);
  
  const { elementCount, scale: shapeScale } = config.shapeParams;
  const nodeCount = clamp(elementCount, 20, 80);
  
  // Generate helix structure data
  const { nodeData, connectorCount } = useMemo(() => {
    const nodes: { pos: THREE.Vector3; strand: number; index: number }[] = [];
    const nodesPerStrand = Math.floor(nodeCount / 2);
    
    for (let strand = 0; strand < 2; strand++) {
      const strandOffset = strand * Math.PI;
      
      for (let i = 0; i < nodesPerStrand; i++) {
        const t = i / nodesPerStrand;
        const angle = t * Math.PI * 4 + strandOffset;
        const y = (t - 0.5) * shapeScale * 3;
        const radius = shapeScale * 0.8;
        
        nodes.push({
          pos: new THREE.Vector3(
            Math.cos(angle) * radius,
            y,
            Math.sin(angle) * radius
          ),
          strand,
          index: i
        });
      }
    }
    
    return { nodeData: nodes, connectorCount: nodesPerStrand };
  }, [nodeCount, shapeScale]);
  
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const connectorDummy = useMemo(() => new THREE.Object3D(), []);
  
  useFrame(() => {
    if (!instancedRef.current || !groupRef.current) return;
    
    const bass = audioData.bass * audioSensitivity;
    const mids = audioData.mids * audioSensitivity;
    const highs = audioData.highs * audioSensitivity;
    
    // Twist acceleration from mids
    const twistSpeed = time * (0.5 + mids * 1.5);
    
    // Update node positions
    nodeData.forEach((node, i) => {
      const { strand, index } = node;
      const t = index / (nodeCount / 2);
      
      // Bass breathes the radius
      const breathe = 1 + bass * 0.25 * Math.sin(time * 3);
      const radius = shapeScale * 0.8 * breathe;
      
      // Apply twist
      const baseAngle = t * Math.PI * 4 + strand * Math.PI;
      const angle = baseAngle + twistSpeed * 0.5;
      
      const y = (t - 0.5) * shapeScale * 3;
      
      // Highs add jitter
      const jitter = highs * 0.08 * Math.sin(time * 12 + i * 2);
      
      dummy.position.set(
        Math.cos(angle) * radius + jitter,
        y,
        Math.sin(angle) * radius + jitter
      );
      
      const nodeScale = 0.12 + bass * 0.06;
      dummy.scale.setScalar(nodeScale);
      dummy.updateMatrix();
      instancedRef.current!.setMatrixAt(i, dummy.matrix);
    });
    
    instancedRef.current.instanceMatrix.needsUpdate = true;
    
    // Update connectors between strands
    if (connectorsRef.current) {
      const nodesPerStrand = Math.floor(nodeCount / 2);
      
      for (let i = 0; i < connectorCount && i < nodesPerStrand; i++) {
        const strand0Node = nodeData[i];
        const strand1Node = nodeData[nodesPerStrand + i];
        
        if (strand0Node && strand1Node) {
          const t = i / nodesPerStrand;
          const breathe = 1 + bass * 0.25 * Math.sin(time * 3);
          const radius = shapeScale * 0.8 * breathe;
          const baseAngle0 = t * Math.PI * 4 + twistSpeed * 0.5;
          const baseAngle1 = baseAngle0 + Math.PI;
          const y = (t - 0.5) * shapeScale * 3;
          
          const pos0 = new THREE.Vector3(
            Math.cos(baseAngle0) * radius,
            y,
            Math.sin(baseAngle0) * radius
          );
          const pos1 = new THREE.Vector3(
            Math.cos(baseAngle1) * radius,
            y,
            Math.sin(baseAngle1) * radius
          );
          
          const mid = pos0.clone().add(pos1).multiplyScalar(0.5);
          const length = pos0.distanceTo(pos1);
          
          connectorDummy.position.copy(mid);
          connectorDummy.lookAt(pos1);
          connectorDummy.rotateX(Math.PI / 2);
          connectorDummy.scale.set(0.03, length * 0.45, 0.03);
          connectorDummy.updateMatrix();
          connectorsRef.current.setMatrixAt(i, connectorDummy.matrix);
        }
      }
      connectorsRef.current.instanceMatrix.needsUpdate = true;
    }
    
    // Slow global rotation
    groupRef.current.rotation.y += 0.002;
  });
  
  return (
    <group ref={groupRef}>
      {/* Helix nodes */}
      <instancedMesh ref={instancedRef} args={[undefined, undefined, nodeData.length]}>
        <sphereGeometry args={[1, 12, 8]} />
        <meshStandardMaterial {...NEUTRAL_SOLID} />
      </instancedMesh>
      
      {/* Connectors between strands */}
      <instancedMesh ref={connectorsRef} args={[undefined, undefined, connectorCount]}>
        <cylinderGeometry args={[1, 1, 1, 6]} />
        <meshStandardMaterial {...NEUTRAL_SOLID} emissiveIntensity={0.05} />
      </instancedMesh>
    </group>
  );
}

export default HelixShape;
