/**
 * Radial Spokes Shape - Wheel/spoke pattern radiating from center
 * Audio: Bass = spoke length, Mids = spoke rotation, Highs = tip brightness
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ShapeProps, NEUTRAL_SOLID, clamp } from './ShapeBase';

export function RadialSpokesShape({ config, audioData, time, audioSensitivity = 1 }: ShapeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const spokesRef = useRef<THREE.InstancedMesh>(null);
  const tipsRef = useRef<THREE.InstancedMesh>(null);
  
  const { elementCount, scale: shapeScale } = config.shapeParams;
  const spokeCount = clamp(elementCount, 6, 16);
  
  // Generate spoke data
  const spokeData = useMemo(() => {
    const spokes: {
      angle: number;
      baseLength: number;
      phase: number;
    }[] = [];
    
    for (let i = 0; i < spokeCount; i++) {
      spokes.push({
        angle: (i / spokeCount) * Math.PI * 2,
        baseLength: shapeScale * (0.8 + Math.random() * 0.4),
        phase: i * 0.5
      });
    }
    
    return spokes;
  }, [spokeCount, shapeScale]);
  
  const spokeDummy = useMemo(() => new THREE.Object3D(), []);
  const tipDummy = useMemo(() => new THREE.Object3D(), []);
  
  useFrame(() => {
    if (!spokesRef.current || !tipsRef.current || !groupRef.current) return;
    
    const bass = audioData.bass * audioSensitivity;
    const mids = audioData.mids * audioSensitivity;
    const highs = audioData.highs * audioSensitivity;
    
    spokeData.forEach((spoke, i) => {
      // Bass extends spoke length
      const lengthFactor = 1 + bass * 0.5 * Math.sin(time * 3 + spoke.phase);
      const length = spoke.baseLength * lengthFactor;
      
      // Rotate spokes with mids
      const rotationOffset = time * 0.5 * (1 + mids);
      const angle = spoke.angle + rotationOffset;
      
      // Position spoke cylinder
      const midX = Math.cos(angle) * (length / 2);
      const midZ = Math.sin(angle) * (length / 2);
      
      spokeDummy.position.set(midX, 0, midZ);
      spokeDummy.rotation.set(0, -angle + Math.PI / 2, Math.PI / 2);
      spokeDummy.scale.set(0.05, length, 0.05);
      spokeDummy.updateMatrix();
      spokesRef.current!.setMatrixAt(i, spokeDummy.matrix);
      
      // Position tip sphere
      const tipX = Math.cos(angle) * length;
      const tipZ = Math.sin(angle) * length;
      
      tipDummy.position.set(tipX, 0, tipZ);
      
      // Highs pulse tip size
      const tipScale = 0.1 + highs * 0.08 * Math.sin(time * 10 + i);
      tipDummy.scale.setScalar(tipScale);
      tipDummy.updateMatrix();
      tipsRef.current!.setMatrixAt(i, tipDummy.matrix);
    });
    
    spokesRef.current.instanceMatrix.needsUpdate = true;
    tipsRef.current.instanceMatrix.needsUpdate = true;
    
    // Tilt the whole structure
    groupRef.current.rotation.x = Math.sin(time * 0.3) * 0.2;
    groupRef.current.rotation.z = Math.cos(time * 0.2) * 0.1;
  });
  
  return (
    <group ref={groupRef}>
      {/* Central hub */}
      <mesh>
        <sphereGeometry args={[shapeScale * 0.15, 16, 12]} />
        <meshStandardMaterial {...NEUTRAL_SOLID} />
      </mesh>
      
      {/* Spokes */}
      <instancedMesh ref={spokesRef} args={[undefined, undefined, spokeCount]}>
        <cylinderGeometry args={[1, 1, 1, 8]} />
        <meshStandardMaterial {...NEUTRAL_SOLID} />
      </instancedMesh>
      
      {/* Tips */}
      <instancedMesh ref={tipsRef} args={[undefined, undefined, spokeCount]}>
        <sphereGeometry args={[1, 12, 8]} />
        <meshStandardMaterial {...NEUTRAL_SOLID} emissiveIntensity={0.15} />
      </instancedMesh>
    </group>
  );
}

export default RadialSpokesShape;
