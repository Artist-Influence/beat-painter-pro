/**
 * Vortex Shape - Spiral arm structure
 * Audio: Bass = arm extension, Mids = spiral speed, Highs = particle scatter
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ShapeProps, NEUTRAL_SOLID, clamp } from './ShapeBase';

export function VortexShape({ config, audioData, time, audioSensitivity = 1 }: ShapeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const instancedRef = useRef<THREE.InstancedMesh>(null);
  
  const { elementCount, scale: shapeScale } = config.shapeParams;
  const armCount = clamp(Math.floor(elementCount / 30), 3, 8);
  const particlesPerArm = Math.floor(clamp(elementCount, 60, 200) / armCount);
  const totalParticles = armCount * particlesPerArm;
  
  // Generate vortex spiral data
  const particleData = useMemo(() => {
    const particles: {
      armIndex: number;
      t: number;
      baseAngle: number;
      baseRadius: number;
      yOffset: number;
    }[] = [];
    
    for (let arm = 0; arm < armCount; arm++) {
      const armBaseAngle = (arm / armCount) * Math.PI * 2;
      
      for (let i = 0; i < particlesPerArm; i++) {
        const t = i / particlesPerArm;
        const spiralTurns = 2;
        const angle = armBaseAngle + t * spiralTurns * Math.PI * 2;
        const radius = t * shapeScale * 1.5;
        const yOffset = (Math.random() - 0.5) * 0.3;
        
        particles.push({
          armIndex: arm,
          t,
          baseAngle: angle,
          baseRadius: radius,
          yOffset
        });
      }
    }
    
    return particles;
  }, [armCount, particlesPerArm, shapeScale]);
  
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  useFrame(() => {
    if (!instancedRef.current || !groupRef.current) return;
    
    const bass = audioData.bass * audioSensitivity;
    const mids = audioData.mids * audioSensitivity;
    const highs = audioData.highs * audioSensitivity;
    
    // Spiral rotation speed from mids
    const spiralSpeed = time * (0.5 + mids * 1.5);
    
    particleData.forEach((particle, i) => {
      const { t, baseAngle, baseRadius, yOffset, armIndex } = particle;
      
      // Bass extends the arm radius
      const armExtension = 1 + bass * 0.4;
      const radius = baseRadius * armExtension;
      
      // Animate angle with spiral rotation
      const phaseOffset = armIndex * 0.2;
      const angle = baseAngle + spiralSpeed + Math.sin(time + phaseOffset) * 0.1;
      
      // Vertical wave
      const y = yOffset + Math.sin(t * Math.PI * 2 + time * 2) * 0.2 * bass;
      
      // Highs scatter particles
      const scatter = highs * 0.15;
      
      dummy.position.set(
        Math.cos(angle) * radius + (Math.random() - 0.5) * scatter,
        y + (Math.random() - 0.5) * scatter * 0.5,
        Math.sin(angle) * radius + (Math.random() - 0.5) * scatter
      );
      
      // Size varies along arm
      const size = 0.06 + t * 0.04 + bass * 0.03;
      dummy.scale.setScalar(size);
      
      dummy.updateMatrix();
      instancedRef.current!.setMatrixAt(i, dummy.matrix);
    });
    
    instancedRef.current.instanceMatrix.needsUpdate = true;
    
    // Core rotation
    groupRef.current.rotation.y += 0.008 + mids * 0.012;
  });
  
  return (
    <group ref={groupRef}>
      <instancedMesh ref={instancedRef} args={[undefined, undefined, totalParticles]}>
        <sphereGeometry args={[1, 8, 6]} />
        <meshStandardMaterial {...NEUTRAL_SOLID} />
      </instancedMesh>
    </group>
  );
}

export default VortexShape;
