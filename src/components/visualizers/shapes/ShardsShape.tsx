/**
 * Shards Shape - Crystalline fragments with explosive scatter
 * Audio: Bass = explosive outward burst, Mids = tumble rotation, Highs = micro-jitter
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ShapeProps, NEUTRAL_SOLID, clamp } from './ShapeBase';

export function ShardsShape({ config, audioData, time, audioSensitivity = 1 }: ShapeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const instancedRef = useRef<THREE.InstancedMesh>(null);
  
  const { elementCount, scale: shapeScale } = config.shapeParams;
  const shardCount = clamp(elementCount, 10, 40);
  
  // Generate shard positions and orientations
  const shardData = useMemo(() => {
    const shards: {
      basePos: THREE.Vector3;
      direction: THREE.Vector3;
      rotationAxis: THREE.Vector3;
      rotationSpeed: number;
      scale: number;
    }[] = [];
    
    for (let i = 0; i < shardCount; i++) {
      // Spherical distribution
      const phi = Math.acos(1 - 2 * (i + 0.5) / shardCount);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      
      const r = shapeScale * (0.5 + Math.random() * 0.5);
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);
      
      const pos = new THREE.Vector3(x, y, z);
      const direction = pos.clone().normalize();
      
      shards.push({
        basePos: pos,
        direction,
        rotationAxis: new THREE.Vector3(
          Math.random() - 0.5,
          Math.random() - 0.5,
          Math.random() - 0.5
        ).normalize(),
        rotationSpeed: 0.5 + Math.random() * 1.5,
        scale: 0.1 + Math.random() * 0.15
      });
    }
    
    return shards;
  }, [shardCount, shapeScale]);
  
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  useFrame(() => {
    if (!instancedRef.current || !groupRef.current) return;
    
    const bass = audioData.bass * audioSensitivity;
    const mids = audioData.mids * audioSensitivity;
    const highs = audioData.highs * audioSensitivity;
    
    // Update each shard
    shardData.forEach((shard, i) => {
      // Bass drives explosive expansion
      const explosionFactor = 1 + bass * 0.6;
      
      // Calculate position with explosion
      const pos = shard.basePos.clone().multiplyScalar(explosionFactor);
      
      // Highs add micro-jitter
      const jitter = highs * 0.1;
      pos.x += Math.sin(time * 15 + i * 3) * jitter;
      pos.y += Math.cos(time * 13 + i * 2) * jitter;
      pos.z += Math.sin(time * 11 + i * 4) * jitter;
      
      dummy.position.copy(pos);
      
      // Mids drive rotation
      const rotationAngle = time * shard.rotationSpeed * (1 + mids * 2);
      dummy.quaternion.setFromAxisAngle(shard.rotationAxis, rotationAngle);
      
      // Scale with bass
      const scale = shard.scale * (1 + bass * 0.3);
      dummy.scale.setScalar(scale);
      
      dummy.updateMatrix();
      instancedRef.current!.setMatrixAt(i, dummy.matrix);
    });
    
    instancedRef.current.instanceMatrix.needsUpdate = true;
    
    // Subtle group rotation
    groupRef.current.rotation.y += 0.001 + mids * 0.003;
  });
  
  return (
    <group ref={groupRef}>
      <instancedMesh ref={instancedRef} args={[undefined, undefined, shardCount]}>
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial {...NEUTRAL_SOLID} flatShading />
      </instancedMesh>
    </group>
  );
}

export default ShardsShape;
