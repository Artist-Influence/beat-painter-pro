/**
 * Ribbons Shape - Flowing curved tube geometry
 * Audio: Bass = wave amplitude, Mids = wave frequency, Highs = edge glow
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ShapeProps, NEUTRAL_SOLID, clamp } from './ShapeBase';

export function RibbonsShape({ config, audioData, time, audioSensitivity = 1 }: ShapeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRefs = useRef<THREE.Mesh[]>([]);
  
  const { elementCount, scale: shapeScale } = config.shapeParams;
  const ribbonCount = clamp(elementCount, 3, 12);
  
  // Generate ribbon curve data
  const ribbonData = useMemo(() => {
    const ribbons: { basePoints: THREE.Vector3[]; phase: number }[] = [];
    
    for (let r = 0; r < ribbonCount; r++) {
      const phase = (r / ribbonCount) * Math.PI * 2;
      const points: THREE.Vector3[] = [];
      
      for (let i = 0; i <= 32; i++) {
        const t = i / 32;
        const angle = phase + t * Math.PI * 2;
        const radius = shapeScale * (0.8 + Math.sin(t * Math.PI) * 0.4);
        const y = (t - 0.5) * shapeScale * 2;
        
        points.push(new THREE.Vector3(
          Math.cos(angle) * radius,
          y,
          Math.sin(angle) * radius
        ));
      }
      
      ribbons.push({ basePoints: points, phase });
    }
    
    return ribbons;
  }, [ribbonCount, shapeScale]);
  
  useFrame(() => {
    if (!groupRef.current) return;
    
    const bass = audioData.bass * audioSensitivity;
    const mids = audioData.mids * audioSensitivity;
    
    // Update each ribbon mesh
    meshRefs.current.forEach((mesh, r) => {
      if (!mesh) return;
      
      const { basePoints, phase } = ribbonData[r];
      const geometry = mesh.geometry as THREE.TubeGeometry;
      
      // Create animated curve
      const animatedPoints = basePoints.map((p, i) => {
        const t = i / basePoints.length;
        
        // Bass drives wave amplitude
        const waveAmp = bass * 0.3;
        const waveFreq = 2 + mids * 2;
        const wave = Math.sin(t * Math.PI * waveFreq + time * 2 + phase) * waveAmp;
        
        // Add wave displacement
        const angle = Math.atan2(p.z, p.x);
        return new THREE.Vector3(
          p.x + Math.cos(angle) * wave,
          p.y + Math.sin(time * 1.5 + t * Math.PI) * 0.1 * bass,
          p.z + Math.sin(angle) * wave
        );
      });
      
      // Create new curve and geometry
      const curve = new THREE.CatmullRomCurve3(animatedPoints);
      const newGeometry = new THREE.TubeGeometry(curve, 32, 0.08 + bass * 0.04, 8, false);
      
      mesh.geometry.dispose();
      mesh.geometry = newGeometry;
    });
    
    // Rotate group
    groupRef.current.rotation.y += 0.003 + mids * 0.007;
  });
  
  return (
    <group ref={groupRef}>
      {ribbonData.map((ribbon, index) => (
        <mesh
          key={index}
          ref={(el) => { if (el) meshRefs.current[index] = el; }}
        >
          <tubeGeometry args={[
            new THREE.CatmullRomCurve3(ribbon.basePoints),
            32,
            0.08,
            8,
            false
          ]} />
          <meshStandardMaterial {...NEUTRAL_SOLID} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

export default RibbonsShape;
