/**
 * Torus Knot Shape - Mathematical torus knot geometry
 * Audio: Bass = scale pulse, Mids = twist deformation, Highs = emissive glow
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ShapeProps, NEUTRAL_SOLID, clamp } from './ShapeBase';

export function TorusKnotShape({ config, audioData, time, audioSensitivity = 1 }: ShapeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  
  const { scale: shapeScale, elementCount } = config.shapeParams;
  
  // Determine knot parameters based on element count
  const { p, q } = useMemo(() => {
    const knotTypes = [
      { p: 2, q: 3 },  // Trefoil
      { p: 3, q: 2 },  // Trefoil variant
      { p: 2, q: 5 },  // Solomon's seal
      { p: 3, q: 4 },  // Complex knot
      { p: 5, q: 2 },  // Cinquefoil
    ];
    return knotTypes[elementCount % knotTypes.length];
  }, [elementCount]);
  
  // Store original positions
  const originalPositions = useMemo(() => {
    const geometry = new THREE.TorusKnotGeometry(shapeScale * 0.8, shapeScale * 0.25, 128, 16, p, q);
    return geometry.attributes.position.array.slice();
  }, [shapeScale, p, q]);
  
  useFrame(() => {
    if (!meshRef.current || !groupRef.current) return;
    
    const geometry = meshRef.current.geometry as THREE.BufferGeometry;
    const positions = geometry.attributes.position.array as Float32Array;
    
    const bass = audioData.bass * audioSensitivity;
    const mids = audioData.mids * audioSensitivity;
    const highs = audioData.highs * audioSensitivity;
    
    // Apply twist deformation
    for (let i = 0; i < positions.length; i += 3) {
      const ox = originalPositions[i];
      const oy = originalPositions[i + 1];
      const oz = originalPositions[i + 2];
      
      // Calculate cylindrical coordinates for twist
      const r = Math.sqrt(ox * ox + oz * oz);
      const theta = Math.atan2(oz, ox);
      
      // Mids drive twist amount
      const twistAngle = oy * 0.3 * mids * Math.sin(time * 2);
      const newTheta = theta + twistAngle;
      
      // Bass pulses the scale
      const scalePulse = 1 + bass * 0.2 * Math.sin(time * 4);
      
      // Highs add ripple
      const ripple = Math.sin(theta * 8 + time * 5) * 0.02 * highs;
      
      positions[i] = Math.cos(newTheta) * (r + ripple) * scalePulse;
      positions[i + 1] = oy * scalePulse;
      positions[i + 2] = Math.sin(newTheta) * (r + ripple) * scalePulse;
    }
    
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
    
    // Rotate the knot
    groupRef.current.rotation.y += 0.004 + mids * 0.008;
    groupRef.current.rotation.x = Math.sin(time * 0.3) * 0.2;
    
    // Emissive glow on highs
    if (materialRef.current) {
      materialRef.current.emissiveIntensity = clamp(0.08 + highs * 0.2, 0.05, 0.35);
    }
  });
  
  return (
    <group ref={groupRef}>
      <mesh ref={meshRef}>
        <torusKnotGeometry args={[shapeScale * 0.8, shapeScale * 0.25, 128, 16, p, q]} />
        <meshStandardMaterial ref={materialRef} {...NEUTRAL_SOLID} />
      </mesh>
    </group>
  );
}

export default TorusKnotShape;
