/**
 * Organic Shape - Blobby deformed sphere with vertex displacement
 * Audio: Bass = vertex displacement, Mids = surface wave, Highs = emissive shimmer
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ShapeProps, NEUTRAL_SOLID, simplex3D, clamp } from './ShapeBase';

export function OrganicShape({ config, audioData, time, audioSensitivity = 1 }: ShapeProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  
  const { scale: shapeScale, segmentDetail, noiseStrength } = config.shapeParams;
  
  // Store original positions for stable deformation
  const originalPositions = useMemo(() => {
    const geometry = new THREE.IcosahedronGeometry(shapeScale, Math.min(segmentDetail, 4));
    return geometry.attributes.position.array.slice();
  }, [shapeScale, segmentDetail]);
  
  useFrame(() => {
    if (!meshRef.current) return;
    
    const geometry = meshRef.current.geometry as THREE.BufferGeometry;
    const positions = geometry.attributes.position.array as Float32Array;
    
    const bass = audioData.bass * audioSensitivity;
    const mids = audioData.mids * audioSensitivity;
    const highs = audioData.highs * audioSensitivity;
    
    // Apply organic deformation
    for (let i = 0; i < positions.length; i += 3) {
      const ox = originalPositions[i];
      const oy = originalPositions[i + 1];
      const oz = originalPositions[i + 2];
      
      // Normalize to get direction
      const len = Math.sqrt(ox * ox + oy * oy + oz * oz);
      const nx = ox / len;
      const ny = oy / len;
      const nz = oz / len;
      
      // Multi-frequency noise displacement
      const noise1 = simplex3D(ox * 0.5 + time * 0.3, oy * 0.5, oz * 0.5 + time * 0.2);
      const noise2 = simplex3D(ox * 1.5 + time * 0.5, oy * 1.5, oz * 1.5);
      
      // Bass drives large displacement
      const bassDisplacement = noise1 * noiseStrength * (1 + bass * 2);
      // Mids create surface waves
      const midsWave = Math.sin(oy * 3 + time * 2) * 0.1 * mids;
      // Highs add fine detail
      const highsDetail = noise2 * 0.05 * highs;
      
      const totalDisplacement = bassDisplacement + midsWave + highsDetail;
      
      positions[i] = ox + nx * totalDisplacement;
      positions[i + 1] = oy + ny * totalDisplacement;
      positions[i + 2] = oz + nz * totalDisplacement;
    }
    
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
    
    // Subtle rotation
    meshRef.current.rotation.y += 0.003 + mids * 0.005;
    meshRef.current.rotation.x = Math.sin(time * 0.3) * 0.15;
    
    // Emissive shimmer on highs
    if (materialRef.current) {
      materialRef.current.emissiveIntensity = clamp(0.08 + highs * 0.15, 0.05, 0.3);
    }
  });
  
  return (
    <mesh ref={meshRef}>
      <icosahedronGeometry args={[shapeScale, Math.min(segmentDetail, 4)]} />
      <meshStandardMaterial ref={materialRef} {...NEUTRAL_SOLID} />
    </mesh>
  );
}

export default OrganicShape;
