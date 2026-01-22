/**
 * Metaball Shape - Multiple overlapping blob spheres
 * Audio: Bass = blob pulsing, Mids = orbit motion, Highs = size variation
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ShapeProps, NEUTRAL_SOLID, clamp } from './ShapeBase';

export function MetaballShape({ config, audioData, time, audioSensitivity = 1 }: ShapeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const instancedRef = useRef<THREE.InstancedMesh>(null);
  
  const { elementCount, scale: shapeScale } = config.shapeParams;
  const blobCount = clamp(elementCount, 3, 8);
  
  // Generate blob orbital data
  const blobData = useMemo(() => {
    const blobs: {
      orbitRadius: number;
      orbitSpeed: number;
      orbitPhase: number;
      orbitTilt: number;
      baseScale: number;
    }[] = [];
    
    // Central large blob
    blobs.push({
      orbitRadius: 0,
      orbitSpeed: 0,
      orbitPhase: 0,
      orbitTilt: 0,
      baseScale: shapeScale * 0.6
    });
    
    // Orbiting blobs
    for (let i = 1; i < blobCount; i++) {
      blobs.push({
        orbitRadius: shapeScale * (0.4 + Math.random() * 0.4),
        orbitSpeed: 0.3 + Math.random() * 0.5,
        orbitPhase: (i / blobCount) * Math.PI * 2,
        orbitTilt: (Math.random() - 0.5) * Math.PI * 0.5,
        baseScale: shapeScale * (0.25 + Math.random() * 0.2)
      });
    }
    
    return blobs;
  }, [blobCount, shapeScale]);
  
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  useFrame(() => {
    if (!instancedRef.current || !groupRef.current) return;
    
    const bass = audioData.bass * audioSensitivity;
    const mids = audioData.mids * audioSensitivity;
    const highs = audioData.highs * audioSensitivity;
    
    blobData.forEach((blob, i) => {
      // Calculate position
      if (blob.orbitRadius > 0) {
        const angle = blob.orbitPhase + time * blob.orbitSpeed * (1 + mids);
        const x = Math.cos(angle) * blob.orbitRadius;
        const z = Math.sin(angle) * blob.orbitRadius;
        const y = Math.sin(blob.orbitTilt) * blob.orbitRadius * 0.3;
        
        dummy.position.set(x, y, z);
      } else {
        dummy.position.set(0, 0, 0);
      }
      
      // Bass pulses the scale
      const pulseFactor = 1 + bass * 0.35 * Math.sin(time * 4 + i);
      
      // Highs add scale variation
      const sizeVariation = 1 + highs * 0.15 * Math.sin(time * 8 + i * 2);
      
      const scale = blob.baseScale * pulseFactor * sizeVariation;
      dummy.scale.setScalar(scale);
      
      dummy.updateMatrix();
      instancedRef.current!.setMatrixAt(i, dummy.matrix);
    });
    
    instancedRef.current.instanceMatrix.needsUpdate = true;
    
    // Slow group rotation
    groupRef.current.rotation.y += 0.002 + mids * 0.004;
  });
  
  return (
    <group ref={groupRef}>
      <instancedMesh ref={instancedRef} args={[undefined, undefined, blobCount]}>
        <sphereGeometry args={[1, 32, 24]} />
        <meshStandardMaterial {...NEUTRAL_SOLID} />
      </instancedMesh>
    </group>
  );
}

export default MetaballShape;
