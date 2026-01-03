import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { RandomVisualizerParams } from '@/lib/randomVisualizerGenerator';
import { seededRandom } from '@/lib/randomVisualizerGenerator';

interface RandomVisualizerTemplateProps {
  params: RandomVisualizerParams;
  audioData: {
    frequency: number[];
    amplitude: number;
    beatStrength: number;
  };
}

export function RandomVisualizerTemplate({ params, audioData }: RandomVisualizerTemplateProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRefs = useRef<THREE.Mesh[]>([]);
  const particlesRef = useRef<THREE.Points>(null);
  
  const random = useMemo(() => seededRandom(params.seed), [params.seed]);
  
  // Analyze audio
  const { bass, mids, highs } = useMemo(() => {
    const freq = audioData.frequency || [];
    const bassRange = freq.slice(0, Math.floor(freq.length * 0.2));
    const midRange = freq.slice(Math.floor(freq.length * 0.2), Math.floor(freq.length * 0.6));
    const highRange = freq.slice(Math.floor(freq.length * 0.6));
    
    return {
      bass: bassRange.length > 0 ? bassRange.reduce((a, b) => a + b, 0) / bassRange.length / 255 : 0,
      mids: midRange.length > 0 ? midRange.reduce((a, b) => a + b, 0) / midRange.length / 255 : 0,
      highs: highRange.length > 0 ? highRange.reduce((a, b) => a + b, 0) / highRange.length / 255 : 0,
    };
  }, [audioData.frequency]);

  // Intensity multipliers
  const intensityMult = params.intensity === 'subtle' ? 0.5 : params.intensity === 'medium' ? 1 : 1.5;
  
  // Generate mesh positions based on shape type
  const meshConfigs = useMemo(() => {
    const configs: Array<{
      position: [number, number, number];
      rotation: [number, number, number];
      scale: number;
      geometry: 'box' | 'sphere' | 'torus' | 'cone' | 'octahedron' | 'icosahedron';
    }> = [];
    
    const count = params.elementCount;
    const r = seededRandom(params.seed);
    
    for (let i = 0; i < count; i++) {
      let pos: [number, number, number];
      let geo: typeof configs[0]['geometry'];
      
      switch (params.baseShape) {
        case 'orb':
          const phi = r() * Math.PI * 2;
          const theta = r() * Math.PI;
          const radius = 2 + r() * 2;
          pos = [
            Math.sin(theta) * Math.cos(phi) * radius,
            Math.sin(theta) * Math.sin(phi) * radius,
            Math.cos(theta) * radius
          ];
          geo = r() > 0.5 ? 'sphere' : 'icosahedron';
          break;
          
        case 'geometric':
          pos = [
            (r() - 0.5) * 6,
            (r() - 0.5) * 6,
            (r() - 0.5) * 6
          ];
          geo = ['box', 'octahedron', 'icosahedron'][Math.floor(r() * 3)] as typeof geo;
          break;
          
        case 'ribbons':
          const t = i / count * Math.PI * 4;
          pos = [
            Math.sin(t) * 3,
            (i / count - 0.5) * 8,
            Math.cos(t) * 3
          ];
          geo = 'box';
          break;
          
        case 'tunnel':
          const angle = (i / count) * Math.PI * 2;
          const depth = (r() - 0.5) * 10;
          pos = [
            Math.cos(angle) * 3,
            Math.sin(angle) * 3,
            depth
          ];
          geo = r() > 0.5 ? 'torus' : 'sphere';
          break;
          
        case 'crystal':
          const cAngle = r() * Math.PI * 2;
          const cHeight = (r() - 0.5) * 6;
          const cRadius = 1 + r() * 3;
          pos = [
            Math.cos(cAngle) * cRadius,
            cHeight,
            Math.sin(cAngle) * cRadius
          ];
          geo = r() > 0.7 ? 'cone' : 'octahedron';
          break;
          
        case 'particles':
        default:
          pos = [
            (r() - 0.5) * 8,
            (r() - 0.5) * 8,
            (r() - 0.5) * 8
          ];
          geo = 'sphere';
      }
      
      // Apply symmetry if enabled
      if (params.symmetry && i % 2 === 1 && configs.length > 0) {
        const prev = configs[configs.length - 1];
        pos = [-prev.position[0], prev.position[1], prev.position[2]];
      }
      
      configs.push({
        position: pos,
        rotation: [r() * Math.PI, r() * Math.PI, r() * Math.PI],
        scale: 0.2 + r() * 0.4,
        geometry: geo,
      });
    }
    
    return configs;
  }, [params.seed, params.baseShape, params.elementCount, params.symmetry]);

  // Particle system positions
  const particlePositions = useMemo(() => {
    const positions = new Float32Array(params.particleCount * 3);
    const r = seededRandom(params.seed + 123);
    
    for (let i = 0; i < params.particleCount; i++) {
      switch (params.baseShape) {
        case 'orb':
        case 'particles':
          const phi = r() * Math.PI * 2;
          const theta = r() * Math.PI;
          const radius = 3 + r() * 4;
          positions[i * 3] = Math.sin(theta) * Math.cos(phi) * radius;
          positions[i * 3 + 1] = Math.sin(theta) * Math.sin(phi) * radius;
          positions[i * 3 + 2] = Math.cos(theta) * radius;
          break;
          
        case 'tunnel':
          const tAngle = r() * Math.PI * 2;
          const tRadius = 2 + r() * 2;
          positions[i * 3] = Math.cos(tAngle) * tRadius;
          positions[i * 3 + 1] = Math.sin(tAngle) * tRadius;
          positions[i * 3 + 2] = (r() - 0.5) * 15;
          break;
          
        default:
          positions[i * 3] = (r() - 0.5) * 10;
          positions[i * 3 + 1] = (r() - 0.5) * 10;
          positions[i * 3 + 2] = (r() - 0.5) * 10;
      }
    }
    
    return positions;
  }, [params.seed, params.baseShape, params.particleCount]);

  // Animation frame
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const speed = params.rotationSpeed;
    
    if (groupRef.current) {
      // Apply animation style
      switch (params.animationStyle) {
        case 'rotating':
          groupRef.current.rotation.y = t * speed;
          groupRef.current.rotation.x = Math.sin(t * speed * 0.5) * 0.2;
          break;
          
        case 'pulsing':
          const pulseScale = 1 + bass * 0.3 * intensityMult;
          groupRef.current.scale.setScalar(pulseScale);
          break;
          
        case 'flowing':
          groupRef.current.position.y = Math.sin(t * speed) * 0.5;
          groupRef.current.rotation.z = Math.sin(t * speed * 0.3) * 0.1;
          break;
          
        case 'chaotic':
          groupRef.current.rotation.x = Math.sin(t * speed * 2) * 0.3 + bass * 0.5;
          groupRef.current.rotation.y = t * speed;
          groupRef.current.rotation.z = Math.cos(t * speed * 1.5) * 0.2 + mids * 0.3;
          break;
          
        case 'smooth':
        default:
          groupRef.current.rotation.y = t * speed * 0.3;
          groupRef.current.rotation.x = Math.sin(t * speed * 0.2) * 0.1;
      }
    }

    // Animate individual meshes
    meshRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      
      const freqIndex = Math.floor((i / meshRefs.current.length) * (audioData.frequency?.length || 1));
      const freqValue = (audioData.frequency?.[freqIndex] || 0) / 255;
      
      // Scale based on frequency
      const baseScale = meshConfigs[i]?.scale || 0.3;
      const audioScale = 1 + freqValue * 0.5 * intensityMult;
      mesh.scale.setScalar(baseScale * audioScale);
      
      // Position offset based on animation style
      if (params.animationStyle === 'chaotic') {
        mesh.rotation.x = t + i * 0.1;
        mesh.rotation.y = t * 0.7 + i * 0.2;
      } else if (params.animationStyle === 'flowing') {
        mesh.position.y += Math.sin(t + i * 0.5) * 0.01;
      }
    });

    // Animate particles
    if (particlesRef.current) {
      particlesRef.current.rotation.y = t * speed * 0.2;
      particlesRef.current.rotation.x = Math.sin(t * 0.3) * 0.1;
      
      const positions = particlesRef.current.geometry.attributes.position;
      if (positions && params.animationStyle === 'chaotic') {
        for (let i = 0; i < Math.min(100, params.particleCount); i++) {
          const x = positions.getX(i);
          const y = positions.getY(i);
          positions.setY(i, y + Math.sin(t + i * 0.1) * 0.01 * intensityMult);
          positions.setX(i, x + Math.cos(t + i * 0.1) * 0.005 * intensityMult);
        }
        positions.needsUpdate = true;
      }
    }
  });

  const getGeometry = (type: string) => {
    switch (type) {
      case 'box': return <boxGeometry args={[1, 1, 1]} />;
      case 'sphere': return <sphereGeometry args={[0.5, 16, 16]} />;
      case 'torus': return <torusGeometry args={[0.4, 0.15, 12, 24]} />;
      case 'cone': return <coneGeometry args={[0.5, 1, 8]} />;
      case 'octahedron': return <octahedronGeometry args={[0.5]} />;
      case 'icosahedron': return <icosahedronGeometry args={[0.5]} />;
      default: return <sphereGeometry args={[0.5, 16, 16]} />;
    }
  };

  return (
    <group ref={groupRef} scale={0.8}>
      {/* Main meshes */}
      {meshConfigs.map((config, i) => (
        <mesh
          key={i}
          ref={(el) => { if (el) meshRefs.current[i] = el; }}
          position={config.position}
          rotation={config.rotation}
          scale={config.scale}
        >
          {getGeometry(config.geometry)}
          <meshStandardMaterial
            color="#ffffff"
            emissive="#ffffff"
            emissiveIntensity={0.3 + bass * 0.4}
            metalness={0.8}
            roughness={0.2}
            wireframe={params.baseShape === 'geometric' || params.baseShape === 'crystal'}
          />
        </mesh>
      ))}
      
      {/* Particle system */}
      {params.baseShape !== 'ribbons' && (
        <points ref={particlesRef}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={params.particleCount}
              array={particlePositions}
              itemSize={3}
            />
          </bufferGeometry>
          <pointsMaterial
            color="#ffffff"
            size={0.05}
            transparent
            opacity={0.6 + highs * 0.4}
            sizeAttenuation
          />
        </points>
      )}
      
      {/* Ambient light */}
      <ambientLight intensity={0.3} />
      <pointLight position={[5, 5, 5]} intensity={1 + bass * 0.5} />
    </group>
  );
}

export default RandomVisualizerTemplate;
