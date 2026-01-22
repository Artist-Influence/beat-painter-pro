/**
 * Wave Grid Shape - Undulating plane with vertex animation
 * Audio: Bass = wave height, Mids = wave propagation speed, Highs = surface shimmer
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ShapeProps, NEUTRAL_SOLID, clamp } from './ShapeBase';

export function WaveGridShape({ config, audioData, time, audioSensitivity = 1 }: ShapeProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  
  const { elementCount, scale: shapeScale } = config.shapeParams;
  
  // Grid resolution based on element count
  const resolution = clamp(Math.floor(Math.sqrt(elementCount)), 16, 48);
  
  // Store original positions
  const originalPositions = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(
      shapeScale * 3,
      shapeScale * 3,
      resolution,
      resolution
    );
    geometry.rotateX(-Math.PI / 2);
    return geometry.attributes.position.array.slice();
  }, [shapeScale, resolution]);
  
  useFrame(() => {
    if (!meshRef.current) return;
    
    const geometry = meshRef.current.geometry as THREE.BufferGeometry;
    const positions = geometry.attributes.position.array as Float32Array;
    
    const bass = audioData.bass * audioSensitivity;
    const mids = audioData.mids * audioSensitivity;
    const highs = audioData.highs * audioSensitivity;
    
    // Wave propagation speed from mids
    const waveSpeed = time * (1 + mids * 2);
    
    for (let i = 0; i < positions.length; i += 3) {
      const ox = originalPositions[i];
      const oz = originalPositions[i + 2];
      
      // Distance from center for radial waves
      const dist = Math.sqrt(ox * ox + oz * oz);
      
      // Multiple wave frequencies
      const wave1 = Math.sin(dist * 2 - waveSpeed * 2) * 0.3;
      const wave2 = Math.sin(ox * 1.5 + waveSpeed) * Math.cos(oz * 1.5 + waveSpeed * 0.7) * 0.2;
      
      // Bass drives wave height
      const waveHeight = (wave1 + wave2) * (0.3 + bass * 0.7);
      
      // Highs add surface shimmer
      const shimmer = Math.sin(ox * 8 + oz * 8 + time * 10) * 0.02 * highs;
      
      positions[i] = ox;
      positions[i + 1] = waveHeight + shimmer;
      positions[i + 2] = oz;
    }
    
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
    
    // Subtle rotation
    meshRef.current.rotation.y += 0.001 + mids * 0.002;
    
    // Emissive on highs
    if (materialRef.current) {
      materialRef.current.emissiveIntensity = clamp(0.05 + highs * 0.12, 0.03, 0.25);
    }
  });
  
  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[shapeScale * 3, shapeScale * 3, resolution, resolution]} />
      <meshStandardMaterial ref={materialRef} {...NEUTRAL_SOLID} side={THREE.DoubleSide} />
    </mesh>
  );
}

export default WaveGridShape;
