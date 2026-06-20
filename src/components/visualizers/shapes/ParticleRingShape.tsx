/**
 * Particle Ring Shape - Torus-distributed point cloud
 * Audio: Bass = radial breathing, Mids = ring rotation, Highs = sparkle
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ShapeProps, clamp } from './ShapeBase';

export function ParticleRingShape({ config, audioData, time, audioSensitivity = 1 }: ShapeProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.PointsMaterial>(null);
  
  const { elementCount, scale: shapeScale } = config.shapeParams;
  const particleCount = clamp(elementCount, 100, 400);
  
  const { positions, originalPositions, ringData } = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const origPos = new Float32Array(particleCount * 3);
    const rings: { angle: number; tubeAngle: number; ringIndex: number }[] = [];
    
    const ringRadius = shapeScale * 1.2;
    const tubeRadius = shapeScale * 0.4;
    const numRings = 3;
    
    for (let i = 0; i < particleCount; i++) {
      const ringIndex = i % numRings;
      const ringOffset = (ringIndex - 1) * 0.3;
      
      const angle = (i / particleCount) * Math.PI * 2 * 3;
      const tubeAngle = Math.random() * Math.PI * 2;
      
      const x = (ringRadius + tubeRadius * Math.cos(tubeAngle)) * Math.cos(angle);
      const y = ringOffset + tubeRadius * Math.sin(tubeAngle) * 0.3;
      const z = (ringRadius + tubeRadius * Math.cos(tubeAngle)) * Math.sin(angle);
      
      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;
      
      origPos[i * 3] = x;
      origPos[i * 3 + 1] = y;
      origPos[i * 3 + 2] = z;
      
      rings.push({ angle, tubeAngle, ringIndex });
    }
    
    return { positions: pos, originalPositions: origPos, ringData: rings };
  }, [particleCount, shapeScale]);
  
  useFrame(() => {
    if (!pointsRef.current) return;
    
    const geometry = pointsRef.current.geometry as THREE.BufferGeometry;
    const posAttr = geometry.attributes.position.array as Float32Array;
    
    const bass = audioData.bass * audioSensitivity;
    const mids = audioData.mids * audioSensitivity;
    const highs = audioData.highs * audioSensitivity;
    
    const ringRadius = shapeScale * 1.2;
    
    for (let i = 0; i < particleCount; i++) {
      const { angle, tubeAngle, ringIndex } = ringData[i];
      
      // Bass breathes the ring radius
      const breathe = 1 + bass * 0.25 * Math.sin(time * 3 + ringIndex);
      
      // Mids rotate each ring at different speeds
      const rotationOffset = time * (0.3 + ringIndex * 0.2) * (1 + mids);
      const newAngle = angle + rotationOffset;
      
      // Highs add sparkle jitter
      const jitter = highs * 0.1 * Math.sin(time * 15 + i * 3);
      
      const tubeRadius = shapeScale * 0.4 * breathe;
      
      posAttr[i * 3] = (ringRadius * breathe + tubeRadius * Math.cos(tubeAngle)) * Math.cos(newAngle) + jitter;
      posAttr[i * 3 + 1] = originalPositions[i * 3 + 1] + jitter * 0.5;
      posAttr[i * 3 + 2] = (ringRadius * breathe + tubeRadius * Math.cos(tubeAngle)) * Math.sin(newAngle) + jitter;
    }
    
    geometry.attributes.position.needsUpdate = true;
    
    // Global tilt
    pointsRef.current.rotation.x = Math.sin(time * 0.2) * 0.1;
    
    if (materialRef.current) {
      materialRef.current.size = clamp(0.05 + bass * 0.05, 0.03, 0.15);
      materialRef.current.opacity = clamp(0.7 + highs * 0.25, 0.6, 1);
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
        size={0.24}
        sizeAttenuation
        transparent
        opacity={0.95}
      />
    </points>
  );
}

export default ParticleRingShape;
