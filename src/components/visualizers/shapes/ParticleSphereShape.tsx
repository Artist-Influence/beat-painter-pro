/**
 * Particle Sphere Shape - Spherical point cloud
 * Audio: Bass = particle size + scatter, Mids = orbital drift, Highs = brightness pulse
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ShapeProps, clamp } from './ShapeBase';

export function ParticleSphereShape({ config, audioData, time, audioSensitivity = 1 }: ShapeProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.PointsMaterial>(null);
  
  const { elementCount, scale: shapeScale } = config.shapeParams;
  const particleCount = clamp(elementCount, 100, 500);
  
  // Generate spherically distributed particles
  const { positions, originalPositions } = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const origPos = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
      // Fibonacci sphere distribution
      const phi = Math.acos(1 - 2 * (i + 0.5) / particleCount);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      
      const r = shapeScale * (0.8 + Math.random() * 0.4);
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);
      
      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;
      
      origPos[i * 3] = x;
      origPos[i * 3 + 1] = y;
      origPos[i * 3 + 2] = z;
    }
    
    return { positions: pos, originalPositions: origPos };
  }, [particleCount, shapeScale]);
  
  useFrame(() => {
    if (!pointsRef.current) return;
    
    const geometry = pointsRef.current.geometry as THREE.BufferGeometry;
    const posAttr = geometry.attributes.position.array as Float32Array;
    
    const bass = audioData.bass * audioSensitivity;
    const mids = audioData.mids * audioSensitivity;
    const highs = audioData.highs * audioSensitivity;
    
    // Animate particles
    for (let i = 0; i < particleCount; i++) {
      const ox = originalPositions[i * 3];
      const oy = originalPositions[i * 3 + 1];
      const oz = originalPositions[i * 3 + 2];
      
      // Normalize for direction
      const len = Math.sqrt(ox * ox + oy * oy + oz * oz);
      const nx = ox / len;
      const ny = oy / len;
      const nz = oz / len;
      
      // Bass expands the sphere
      const expansion = 1 + bass * 0.3;
      
      // Mids create orbital drift
      const angle = time * 0.5 + i * 0.1;
      const orbitOffset = mids * 0.15;
      
      // Individual particle scatter on highs
      const jitter = highs * 0.1 * Math.sin(time * 10 + i * 2);
      
      posAttr[i * 3] = ox * expansion + Math.cos(angle) * orbitOffset + nx * jitter;
      posAttr[i * 3 + 1] = oy * expansion + ny * jitter;
      posAttr[i * 3 + 2] = oz * expansion + Math.sin(angle) * orbitOffset + nz * jitter;
    }
    
    geometry.attributes.position.needsUpdate = true;
    
    // Rotate the whole cloud
    pointsRef.current.rotation.y += 0.002 + mids * 0.008;
    
    // Update particle size with bass
    if (materialRef.current) {
      materialRef.current.size = clamp(0.06 + bass * 0.08, 0.04, 0.2);
      materialRef.current.opacity = clamp(0.6 + highs * 0.3, 0.5, 1);
    }
  });
  
  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        ref={materialRef}
        color={0xffffff}
        size={0.26}
        sizeAttenuation
        transparent
        opacity={0.95}
      />
    </points>
  );
}

export default ParticleSphereShape;
