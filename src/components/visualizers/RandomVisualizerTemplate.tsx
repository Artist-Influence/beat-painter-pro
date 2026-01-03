import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { RandomVisualizerParams } from '@/lib/randomVisualizerGenerator';
import { seededRandom, COLOR_PALETTES } from '@/lib/randomVisualizerGenerator';

interface RandomVisualizerTemplateProps {
  params: RandomVisualizerParams;
  audioData: {
    frequency: number[];
    amplitude: number;
    beatStrength: number;
  };
}

// All available geometry types
const GEOMETRY_TYPES = [
  'box', 'sphere', 'torus', 'cone', 'octahedron', 'icosahedron',
  'dodecahedron', 'tetrahedron', 'torusKnot', 'ring', 'cylinder', 'capsule'
] as const;

type GeometryType = typeof GEOMETRY_TYPES[number];

// Background effects component - renders behind main visualizer
function BackgroundEffects({ 
  effect, 
  colors, 
  bass, 
  seed 
}: { 
  effect: string; 
  colors: THREE.Color[]; 
  bass: number;
  seed: number;
}) {
  const pointsRef = useRef<THREE.Points>(null);
  const linesRef = useRef<THREE.LineSegments>(null);
  const shootingStarsRef = useRef<THREE.Points>(null);
  
  // Shooting star velocities for movingLines effect
  const shootingStarData = useRef<{
    velocities: Float32Array;
    startPositions: Float32Array;
  } | null>(null);
  
  // Generate positions based on effect type
  const effectData = useMemo(() => {
    const r = seededRandom(seed + 999);
    
    if (effect === 'stars') {
      const count = 300;
      const positions = new Float32Array(count * 3);
      const opacities = new Float32Array(count);
      
      for (let i = 0; i < count; i++) {
        // Spread stars in a large sphere behind the visualizer
        const phi = r() * Math.PI * 2;
        const theta = r() * Math.PI;
        const radius = 12 + r() * 8;
        positions[i * 3] = Math.sin(theta) * Math.cos(phi) * radius;
        positions[i * 3 + 1] = Math.sin(theta) * Math.sin(phi) * radius;
        positions[i * 3 + 2] = Math.cos(theta) * radius - 10; // Push back
        opacities[i] = r();
      }
      return { positions, opacities, count };
    }
    
    if (effect === 'movingLines') {
      // Shooting stars that move diagonally across the screen
      const count = 25;
      const positions = new Float32Array(count * 3);
      const velocities = new Float32Array(count * 3);
      const startPositions = new Float32Array(count * 3);
      
      for (let i = 0; i < count; i++) {
        // Start at random positions
        const x = (r() - 0.5) * 30;
        const y = (r() - 0.5) * 20;
        const z = -8 + r() * 4; // Behind the main visualizer
        
        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;
        
        startPositions[i * 3] = x;
        startPositions[i * 3 + 1] = y;
        startPositions[i * 3 + 2] = z;
        
        // Random diagonal velocities (shooting star movement)
        const speed = 0.15 + r() * 0.25;
        const angle = -Math.PI / 4 + (r() - 0.5) * 0.5; // Mostly diagonal down-right
        velocities[i * 3] = Math.cos(angle) * speed;
        velocities[i * 3 + 1] = Math.sin(angle) * speed;
        velocities[i * 3 + 2] = 0;
      }
      
      shootingStarData.current = { velocities, startPositions };
      return { positions, count };
    }
    
    if (effect === 'grid') {
      const linePositions: number[] = [];
      const gridSize = 8;
      const spacing = 2;
      
      // Floor grid, pushed back
      for (let i = -gridSize; i <= gridSize; i += spacing) {
        linePositions.push(-gridSize, -5, i - 5, gridSize, -5, i - 5);
        linePositions.push(i, -5, -gridSize - 5, i, -5, gridSize - 5);
      }
      return { linePositions: new Float32Array(linePositions), count: linePositions.length / 6 };
    }
    
    if (effect === 'particles') {
      const count = 150;
      const positions = new Float32Array(count * 3);
      const velocities = new Float32Array(count * 3);
      
      for (let i = 0; i < count; i++) {
        positions[i * 3] = (r() - 0.5) * 16;
        positions[i * 3 + 1] = (r() - 0.5) * 16;
        positions[i * 3 + 2] = (r() - 0.5) * 8 - 5; // Push back
        velocities[i * 3] = (r() - 0.5) * 0.02;
        velocities[i * 3 + 1] = (r() - 0.5) * 0.02;
        velocities[i * 3 + 2] = (r() - 0.5) * 0.01;
      }
      return { positions, velocities, count };
    }
    
    if (effect === 'lightRays') {
      const count = 8;
      const linePositions: number[] = [];
      
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const x = Math.cos(angle) * 12;
        const y = Math.sin(angle) * 12;
        linePositions.push(0, 0, -8, x, y, -8); // Push back
      }
      return { linePositions: new Float32Array(linePositions), count };
    }
    
    if (effect === 'aurora') {
      const count = 100;
      const positions = new Float32Array(count * 3);
      
      for (let i = 0; i < count; i++) {
        positions[i * 3] = (i / count - 0.5) * 25;
        positions[i * 3 + 1] = 6 + r() * 3;
        positions[i * 3 + 2] = -12 + r() * 2; // Push further back
      }
      return { positions, count };
    }
    
    return null;
  }, [effect, seed]);
  
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    
    if (effect === 'stars' && pointsRef.current && effectData?.opacities) {
      // Twinkle effect
      const material = pointsRef.current.material as THREE.PointsMaterial;
      material.opacity = 0.4 + Math.sin(t * 2) * 0.2 + bass * 0.3;
    }
    
    // Shooting stars effect - animate individual points moving diagonally
    if (effect === 'movingLines' && shootingStarsRef.current && shootingStarData.current) {
      const positions = shootingStarsRef.current.geometry.attributes.position;
      const { velocities, startPositions } = shootingStarData.current;
      const bounds = 15;
      
      for (let i = 0; i < effectData!.count; i++) {
        let x = positions.getX(i);
        let y = positions.getY(i);
        
        // Move in velocity direction
        const speedMult = 1 + bass * 0.5;
        x += velocities[i * 3] * speedMult;
        y += velocities[i * 3 + 1] * speedMult;
        
        // Reset when out of bounds
        if (x > bounds || x < -bounds || y > bounds || y < -bounds) {
          // Respawn at opposite edge
          x = -bounds + Math.random() * bounds * 0.5;
          y = bounds * 0.5 + Math.random() * bounds * 0.5;
        }
        
        positions.setX(i, x);
        positions.setY(i, y);
      }
      positions.needsUpdate = true;
      
      const material = shootingStarsRef.current.material as THREE.PointsMaterial;
      material.opacity = 0.5 + bass * 0.4;
    }
    
    if (effect === 'grid' && linesRef.current) {
      const material = linesRef.current.material as THREE.LineBasicMaterial;
      material.opacity = 0.1 + bass * 0.15;
    }
    
    if (effect === 'particles' && pointsRef.current && effectData?.velocities) {
      const positions = pointsRef.current.geometry.attributes.position;
      for (let i = 0; i < Math.min(50, effectData.count); i++) {
        let y = positions.getY(i);
        y += effectData.velocities[i * 3 + 1] + bass * 0.01;
        if (y > 8) y = -8;
        if (y < -8) y = 8;
        positions.setY(i, y);
      }
      positions.needsUpdate = true;
    }
    
    if (effect === 'lightRays' && linesRef.current) {
      linesRef.current.rotation.z = t * 0.1;
      const material = linesRef.current.material as THREE.LineBasicMaterial;
      material.opacity = 0.1 + bass * 0.4;
    }
    
    if (effect === 'aurora' && pointsRef.current && effectData) {
      const positions = pointsRef.current.geometry.attributes.position;
      for (let i = 0; i < effectData.count; i++) {
        const x = positions.getX(i);
        const baseY = 6 + Math.sin(x * 0.3 + t) * 2;
        positions.setY(i, baseY + bass * 2);
      }
      positions.needsUpdate = true;
    }
  });
  
  if (!effectData || effect === 'none') return null;
  
  const primaryColor = colors[0] || new THREE.Color('#ffffff');
  
  // Stars effect
  if (effect === 'stars' && effectData.positions) {
    return (
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={effectData.count}
            array={effectData.positions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          color="#ffffff"
          size={0.08}
          transparent
          opacity={0.5}
          sizeAttenuation
        />
      </points>
    );
  }
  
  // Shooting stars (movingLines effect) - points that move like meteors
  if (effect === 'movingLines' && effectData.positions) {
    return (
      <points ref={shootingStarsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={effectData.count}
            array={effectData.positions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          color={primaryColor}
          size={0.15}
          transparent
          opacity={0.6}
          sizeAttenuation
        />
      </points>
    );
  }
  
  // Grid or light rays
  if ((effect === 'grid' || effect === 'lightRays') && effectData.linePositions) {
    return (
      <lineSegments ref={linesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={effectData.linePositions.length / 3}
            array={effectData.linePositions}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial
          color={primaryColor}
          transparent
          opacity={0.2}
        />
      </lineSegments>
    );
  }
  
  // Ambient particles
  if (effect === 'particles' && effectData.positions) {
    return (
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={effectData.count}
            array={effectData.positions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          color={primaryColor}
          size={0.05}
          transparent
          opacity={0.3}
          sizeAttenuation
        />
      </points>
    );
  }
  
  // Aurora
  if (effect === 'aurora' && effectData.positions) {
    return (
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={effectData.count}
            array={effectData.positions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          color={colors[1] || primaryColor}
          size={0.3}
          transparent
          opacity={0.4}
          sizeAttenuation
        />
      </points>
    );
  }
  
  return null;
}

export function RandomVisualizerTemplate({ params, audioData }: RandomVisualizerTemplateProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRefs = useRef<THREE.Mesh[]>([]);
  const particlesRef = useRef<THREE.Points>(null);
  const linesRef = useRef<THREE.LineSegments>(null);
  
  const random = useMemo(() => seededRandom(params.seed), [params.seed]);
  
  // Get color palette
  const colors = useMemo(() => {
    const palette = COLOR_PALETTES[params.colorScheme] || COLOR_PALETTES.mono;
    return palette.map(c => new THREE.Color(c));
  }, [params.colorScheme]);

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

  // Scale elements inversely with count (more elements = smaller each)
  const elementScale = useMemo(() => {
    const count = params.elementCount;
    if (count <= 10) return 1;
    if (count <= 30) return 0.7;
    if (count <= 60) return 0.5;
    return 0.35;
  }, [params.elementCount]);
  
  // Generate mesh positions based on shape type
  const meshConfigs = useMemo(() => {
    const configs: Array<{
      position: [number, number, number];
      rotation: [number, number, number];
      scale: number;
      geometry: GeometryType;
      colorIndex: number;
      wireframe: boolean;
    }> = [];
    
    const count = params.elementCount;
    const r = seededRandom(params.seed);
    
    // Pick random geometries for mixed mode
    const getRandomGeometry = (): GeometryType => {
      if (params.mixedGeometry) {
        return GEOMETRY_TYPES[Math.floor(r() * GEOMETRY_TYPES.length)];
      }
      // Return shape-appropriate default
      switch (params.baseShape) {
        case 'orb': return r() > 0.5 ? 'sphere' : 'icosahedron';
        case 'geometric': return ['box', 'octahedron', 'dodecahedron', 'tetrahedron'][Math.floor(r() * 4)] as GeometryType;
        case 'crystal': return r() > 0.5 ? 'cone' : 'octahedron';
        case 'helix': return r() > 0.5 ? 'torusKnot' : 'sphere';
        case 'lattice': return r() > 0.5 ? 'box' : 'octahedron';
        case 'matrix': return r() > 0.5 ? 'box' : 'cylinder';
        case 'nebula': return r() > 0.5 ? 'sphere' : 'icosahedron';
        default: return 'sphere';
      }
    };
    
    for (let i = 0; i < count; i++) {
      let pos: [number, number, number];
      const geo = getRandomGeometry();
      
      switch (params.baseShape) {
        case 'orb': {
          const phi = r() * Math.PI * 2;
          const theta = r() * Math.PI;
          const radius = 2 + r() * 2;
          pos = [
            Math.sin(theta) * Math.cos(phi) * radius,
            Math.sin(theta) * Math.sin(phi) * radius,
            Math.cos(theta) * radius
          ];
          break;
        }
        
        case 'geometric': {
          pos = [
            (r() - 0.5) * 6,
            (r() - 0.5) * 6,
            (r() - 0.5) * 6
          ];
          break;
        }
        
        case 'ribbons': {
          const t = i / count * Math.PI * 4;
          pos = [
            Math.sin(t) * 3,
            (i / count - 0.5) * 8,
            Math.cos(t) * 3
          ];
          break;
        }
        
        case 'tunnel': {
          const angle = (i / count) * Math.PI * 2;
          const depth = (r() - 0.5) * 10;
          pos = [
            Math.cos(angle) * 3,
            Math.sin(angle) * 3,
            depth
          ];
          break;
        }
        
        case 'crystal': {
          const cAngle = r() * Math.PI * 2;
          const cHeight = (r() - 0.5) * 6;
          const cRadius = 1 + r() * 3;
          pos = [
            Math.cos(cAngle) * cRadius,
            cHeight,
            Math.sin(cAngle) * cRadius
          ];
          break;
        }
        
        case 'spiral': {
          const spiralT = i / count * Math.PI * 6;
          const spiralRadius = 1 + (i / count) * 3;
          const spiralHeight = (i / count - 0.5) * 8;
          pos = [
            Math.cos(spiralT) * spiralRadius,
            spiralHeight,
            Math.sin(spiralT) * spiralRadius
          ];
          break;
        }
        
        case 'lattice': {
          const gridSize = Math.ceil(Math.cbrt(count));
          const xi = i % gridSize;
          const yi = Math.floor(i / gridSize) % gridSize;
          const zi = Math.floor(i / (gridSize * gridSize));
          const spacing = 6 / gridSize;
          pos = [
            (xi - gridSize / 2) * spacing + (r() - 0.5) * 0.3,
            (yi - gridSize / 2) * spacing + (r() - 0.5) * 0.3,
            (zi - gridSize / 2) * spacing + (r() - 0.5) * 0.3
          ];
          break;
        }
        
        case 'helix': {
          const helixT = i / count * Math.PI * 4;
          const strand = i % 2;
          const helixRadius = 2;
          pos = [
            Math.cos(helixT + strand * Math.PI) * helixRadius,
            (i / count - 0.5) * 10,
            Math.sin(helixT + strand * Math.PI) * helixRadius
          ];
          break;
        }
        
        case 'nebula': {
          // Gaussian-like distribution
          const u1 = r();
          const u2 = r();
          const radius = Math.sqrt(-2 * Math.log(u1 || 0.001)) * 2;
          const theta = u2 * Math.PI * 2;
          pos = [
            Math.cos(theta) * radius + (r() - 0.5) * 2,
            (r() - 0.5) * 4,
            Math.sin(theta) * radius + (r() - 0.5) * 2
          ];
          break;
        }
        
        case 'matrix': {
          const columns = Math.ceil(Math.sqrt(count));
          const col = i % columns;
          const spacing = 8 / columns;
          pos = [
            (col - columns / 2) * spacing,
            (r() - 0.5) * 10,
            (r() - 0.5) * 4
          ];
          break;
        }
        
        case 'particles':
        default: {
          pos = [
            (r() - 0.5) * 8,
            (r() - 0.5) * 8,
            (r() - 0.5) * 8
          ];
        }
      }
      
      // Apply symmetry if enabled
      if (params.symmetry && i % 2 === 1 && configs.length > 0) {
        const prev = configs[configs.length - 1];
        pos = [-prev.position[0], prev.position[1], prev.position[2]];
      }
      
      configs.push({
        position: pos,
        rotation: [r() * Math.PI, r() * Math.PI, r() * Math.PI],
        scale: (0.15 + r() * 0.45) * elementScale,
        geometry: geo,
        colorIndex: Math.floor(r() * colors.length),
        wireframe: false,
      });
    }
    
    return configs;
  }, [params.seed, params.baseShape, params.elementCount, params.symmetry, params.mixedGeometry, colors.length, elementScale]);

  // Particle system positions
  const particlePositions = useMemo(() => {
    const positions = new Float32Array(params.particleCount * 3);
    const particleColors = new Float32Array(params.particleCount * 3);
    const r = seededRandom(params.seed + 123);
    
    for (let i = 0; i < params.particleCount; i++) {
      let x, y, z;
      
      switch (params.baseShape) {
        case 'orb':
        case 'particles':
        case 'nebula': {
          const phi = r() * Math.PI * 2;
          const theta = r() * Math.PI;
          const radius = 3 + r() * 4;
          x = Math.sin(theta) * Math.cos(phi) * radius;
          y = Math.sin(theta) * Math.sin(phi) * radius;
          z = Math.cos(theta) * radius;
          break;
        }
        
        case 'tunnel': {
          const tAngle = r() * Math.PI * 2;
          const tRadius = 2 + r() * 2;
          x = Math.cos(tAngle) * tRadius;
          y = Math.sin(tAngle) * tRadius;
          z = (r() - 0.5) * 15;
          break;
        }
        
        case 'spiral':
        case 'helix': {
          const sT = r() * Math.PI * 6;
          const sR = 1 + r() * 4;
          x = Math.cos(sT) * sR;
          y = (r() - 0.5) * 12;
          z = Math.sin(sT) * sR;
          break;
        }
        
        case 'matrix': {
          x = (r() - 0.5) * 10;
          y = (r() - 0.5) * 15;
          z = (r() - 0.5) * 4;
          break;
        }
        
        default: {
          x = (r() - 0.5) * 10;
          y = (r() - 0.5) * 10;
          z = (r() - 0.5) * 10;
        }
      }
      
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      
      // Assign colors
      const color = colors[Math.floor(r() * colors.length)];
      particleColors[i * 3] = color.r;
      particleColors[i * 3 + 1] = color.g;
      particleColors[i * 3 + 2] = color.b;
    }
    
    return { positions, colors: particleColors };
  }, [params.seed, params.baseShape, params.particleCount, colors]);

  // Connection lines (threading effect)
  const linePositions = useMemo(() => {
    if (!params.connectionLines || meshConfigs.length < 2) return null;
    
    const connections: number[] = [];
    const lineColors: number[] = [];
    const r = seededRandom(params.seed + 456);
    const maxDist = 4;
    
    for (let i = 0; i < meshConfigs.length; i++) {
      for (let j = i + 1; j < meshConfigs.length; j++) {
        const a = meshConfigs[i].position;
        const b = meshConfigs[j].position;
        const dist = Math.sqrt(
          Math.pow(a[0] - b[0], 2) + 
          Math.pow(a[1] - b[1], 2) + 
          Math.pow(a[2] - b[2], 2)
        );
        
        if (dist < maxDist && r() > 0.5) {
          connections.push(a[0], a[1], a[2], b[0], b[1], b[2]);
          const color = colors[Math.floor(r() * colors.length)];
          lineColors.push(color.r, color.g, color.b, color.r, color.g, color.b);
        }
      }
    }
    
    return { 
      positions: new Float32Array(connections), 
      colors: new Float32Array(lineColors) 
    };
  }, [meshConfigs, params.connectionLines, params.seed, colors]);

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
          const pulseScale = 1 + bass * 0.3;
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
          
        case 'breathing':
          const breathScale = 1 + Math.sin(t * 0.5) * 0.15 + bass * 0.2;
          groupRef.current.scale.setScalar(breathScale);
          groupRef.current.rotation.y = t * speed * 0.2;
          break;
          
        case 'explosive':
          const explodeScale = 1 + audioData.beatStrength * 0.5;
          groupRef.current.scale.setScalar(explodeScale);
          groupRef.current.rotation.y = t * speed * 0.5;
          groupRef.current.rotation.x = audioData.beatStrength * 0.3;
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
      const audioScale = 1 + freqValue * 0.5;
      mesh.scale.setScalar(baseScale * audioScale);
      
      // Position offset based on animation style
      if (params.animationStyle === 'chaotic') {
        mesh.rotation.x = t + i * 0.1;
        mesh.rotation.y = t * 0.7 + i * 0.2;
      } else if (params.animationStyle === 'flowing') {
        mesh.position.y += Math.sin(t + i * 0.5) * 0.01;
      } else if (params.animationStyle === 'explosive' && audioData.beatStrength > 0.5) {
        const config = meshConfigs[i];
        if (config) {
          const dir = new THREE.Vector3(...config.position).normalize();
          mesh.position.x += dir.x * 0.02;
          mesh.position.y += dir.y * 0.02;
          mesh.position.z += dir.z * 0.02;
        }
      }
      
      // Matrix falling effect - use time-based animation for smoother results
      if (params.baseShape === 'matrix' && meshConfigs[i]) {
        const config = meshConfigs[i];
        const fallSpeed = 2;
        const range = 12;
        const offset = (t * fallSpeed + config.position[1] + 6) % range;
        mesh.position.y = offset - 6;
      }
    });

    // Animate particles
    if (particlesRef.current) {
      particlesRef.current.rotation.y = t * speed * 0.2;
      particlesRef.current.rotation.x = Math.sin(t * 0.3) * 0.1;
      
      const positions = particlesRef.current.geometry.attributes.position;
      if (positions && (params.animationStyle === 'chaotic' || params.baseShape === 'matrix')) {
        for (let i = 0; i < Math.min(100, params.particleCount); i++) {
          const y = positions.getY(i);
          
          if (params.baseShape === 'matrix') {
            positions.setY(i, y - 0.05);
            if (y < -8) positions.setY(i, 8);
          } else {
            const x = positions.getX(i);
            positions.setY(i, y + Math.sin(t + i * 0.1) * 0.01);
            positions.setX(i, x + Math.cos(t + i * 0.1) * 0.005);
          }
        }
        positions.needsUpdate = true;
      }
    }
    
    // Animate connection lines
    if (linesRef.current && linePositions) {
      const material = linesRef.current.material as THREE.LineBasicMaterial;
      material.opacity = 0.3 + bass * 0.5;
    }
  });

  const getGeometry = (type: GeometryType) => {
    switch (type) {
      case 'box': return <boxGeometry args={[1, 1, 1]} />;
      case 'sphere': return <sphereGeometry args={[0.5, 16, 16]} />;
      case 'torus': return <torusGeometry args={[0.4, 0.15, 12, 24]} />;
      case 'cone': return <coneGeometry args={[0.5, 1, 8]} />;
      case 'octahedron': return <octahedronGeometry args={[0.5]} />;
      case 'icosahedron': return <icosahedronGeometry args={[0.5]} />;
      case 'dodecahedron': return <dodecahedronGeometry args={[0.5]} />;
      case 'tetrahedron': return <tetrahedronGeometry args={[0.5]} />;
      case 'torusKnot': return <torusKnotGeometry args={[0.3, 0.1, 64, 8]} />;
      case 'ring': return <ringGeometry args={[0.3, 0.5, 16]} />;
      case 'cylinder': return <cylinderGeometry args={[0.3, 0.3, 0.8, 12]} />;
      case 'capsule': return <capsuleGeometry args={[0.25, 0.5, 4, 8]} />;
      default: return <sphereGeometry args={[0.5, 16, 16]} />;
    }
  };

  return (
    <>
      {/* Background effects layer */}
      <BackgroundEffects 
        effect={params.backgroundEffect} 
        colors={colors} 
        bass={bass}
        seed={params.seed}
      />
      
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
              color={colors[config.colorIndex]}
              emissive={colors[config.colorIndex]}
              emissiveIntensity={0.5 + bass * 0.4}
              metalness={0.7}
              roughness={0.3}
              wireframe={config.wireframe}
            />
          </mesh>
        ))}
        
        {/* Connection lines (threading) */}
        {linePositions && (
          <lineSegments ref={linesRef}>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                count={linePositions.positions.length / 3}
                array={linePositions.positions}
                itemSize={3}
              />
              <bufferAttribute
                attach="attributes-color"
                count={linePositions.colors.length / 3}
                array={linePositions.colors}
                itemSize={3}
              />
            </bufferGeometry>
            <lineBasicMaterial 
              vertexColors 
              transparent 
              opacity={0.5}
              linewidth={1}
            />
          </lineSegments>
        )}
        
        {/* Particle system */}
        {params.baseShape !== 'ribbons' && (
          <points ref={particlesRef}>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                count={params.particleCount}
                array={particlePositions.positions}
                itemSize={3}
              />
              <bufferAttribute
                attach="attributes-color"
                count={params.particleCount}
                array={particlePositions.colors}
                itemSize={3}
              />
            </bufferGeometry>
            <pointsMaterial
              vertexColors
              size={0.06}
              transparent
              opacity={0.6 + highs * 0.4}
              sizeAttenuation
            />
          </points>
        )}
        
        {/* Lights */}
        <ambientLight intensity={0.3} />
        <pointLight position={[5, 5, 5]} intensity={1 + bass * 0.5} color={colors[0]} />
        <pointLight position={[-5, -3, 3]} intensity={0.5 + mids * 0.3} color={colors[colors.length > 1 ? 1 : 0]} />
      </group>
    </>
  );
}

export default RandomVisualizerTemplate;
