/**
 * Kaleidoscope Shape - N-fold symmetry with mirrored geometry
 * Audio: Bass = radial expansion, Mids = rotation speed, Highs = segment shimmer
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ShapeProps, NEUTRAL_SOLID, clamp } from './ShapeBase';

export function KaleidoscopeShape({ config, audioData, time, audioSensitivity = 1 }: ShapeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const segmentsRef = useRef<THREE.InstancedMesh>(null);
  const innerRef = useRef<THREE.InstancedMesh>(null);
  
  const { elementCount, scale: shapeScale } = config.shapeParams;
  const foldCount = clamp(elementCount, 4, 12);
  const layerCount = 3;
  const totalSegments = foldCount * layerCount;
  
  // Generate kaleidoscope segment data
  const segmentData = useMemo(() => {
    const segments: {
      foldIndex: number;
      layerIndex: number;
      baseAngle: number;
      baseRadius: number;
      baseScale: number;
    }[] = [];
    
    for (let layer = 0; layer < layerCount; layer++) {
      const layerRadius = shapeScale * (0.5 + layer * 0.5);
      
      for (let fold = 0; fold < foldCount; fold++) {
        const angle = (fold / foldCount) * Math.PI * 2;
        
        segments.push({
          foldIndex: fold,
          layerIndex: layer,
          baseAngle: angle,
          baseRadius: layerRadius,
          baseScale: 0.15 + (layerCount - layer) * 0.05
        });
      }
    }
    
    return segments;
  }, [foldCount, layerCount, shapeScale]);
  
  const segmentDummy = useMemo(() => new THREE.Object3D(), []);
  const innerDummy = useMemo(() => new THREE.Object3D(), []);
  
  useFrame(() => {
    if (!segmentsRef.current || !innerRef.current || !groupRef.current) return;
    
    const bass = audioData.bass * audioSensitivity;
    const mids = audioData.mids * audioSensitivity;
    const highs = audioData.highs * audioSensitivity;
    
    // Rotation speed from mids
    const rotationSpeed = time * (0.3 + mids * 0.8);
    
    segmentData.forEach((segment, i) => {
      const { foldIndex, layerIndex, baseAngle, baseRadius, baseScale } = segment;
      
      // Bass expands radius
      const expansion = 1 + bass * 0.3;
      const radius = baseRadius * expansion;
      
      // Rotate with alternating direction per layer
      const direction = layerIndex % 2 === 0 ? 1 : -1;
      const angle = baseAngle + rotationSpeed * direction * (1 + layerIndex * 0.2);
      
      // Position
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = (layerIndex - 1) * 0.3;
      
      segmentDummy.position.set(x, y, z);
      
      // Point toward center
      segmentDummy.lookAt(0, y, 0);
      
      // Highs shimmer scale
      const shimmer = 1 + highs * 0.2 * Math.sin(time * 10 + foldIndex + layerIndex * 2);
      segmentDummy.scale.setScalar(baseScale * shimmer);
      
      segmentDummy.updateMatrix();
      segmentsRef.current!.setMatrixAt(i, segmentDummy.matrix);
    });
    
    segmentsRef.current.instanceMatrix.needsUpdate = true;
    
    // Update inner ring elements
    for (let i = 0; i < foldCount; i++) {
      const angle = (i / foldCount) * Math.PI * 2 + rotationSpeed * 0.5;
      const innerRadius = shapeScale * 0.25 * (1 + bass * 0.4);
      
      innerDummy.position.set(
        Math.cos(angle) * innerRadius,
        0,
        Math.sin(angle) * innerRadius
      );
      
      const innerScale = 0.08 + bass * 0.04;
      innerDummy.scale.setScalar(innerScale);
      innerDummy.rotation.y = angle + time;
      
      innerDummy.updateMatrix();
      innerRef.current!.setMatrixAt(i, innerDummy.matrix);
    }
    
    innerRef.current.instanceMatrix.needsUpdate = true;
    
    // Gentle tilt
    groupRef.current.rotation.x = Math.sin(time * 0.2) * 0.1;
    groupRef.current.rotation.z = Math.cos(time * 0.15) * 0.05;
  });
  
  return (
    <group ref={groupRef}>
      {/* Outer segments */}
      <instancedMesh ref={segmentsRef} args={[undefined, undefined, totalSegments]}>
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial {...NEUTRAL_SOLID} />
      </instancedMesh>
      
      {/* Inner ring */}
      <instancedMesh ref={innerRef} args={[undefined, undefined, foldCount]}>
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial {...NEUTRAL_SOLID} emissiveIntensity={0.12} />
      </instancedMesh>
      
      {/* Central element */}
      <mesh>
        <icosahedronGeometry args={[shapeScale * 0.12, 1]} />
        <meshStandardMaterial {...NEUTRAL_SOLID} emissiveIntensity={0.15} />
      </mesh>
    </group>
  );
}

export default KaleidoscopeShape;
