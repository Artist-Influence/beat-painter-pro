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
      // Pre-generate stable star configs - no buffer modification needed
      const starCount = 20;
      const stars: Array<{
        speed: number;
        angle: number;
        startX: number;
        startY: number;
        phase: number;
      }> = [];
      
      for (let i = 0; i < starCount; i++) {
        stars.push({
          speed: 0.15 + r() * 0.35,
          angle: -Math.PI / 4 + (r() - 0.5) * 0.4,
          startX: (r() - 0.5) * 35,
          startY: r() * 20 - 5,
          phase: r() * 100,
        });
      }
      return { stars, count: starCount };
    }
    
    if (effect === 'energyField') {
      // Concentric pulsing rings
      const ringCount = 6;
      const rings: Array<{
        baseRadius: number;
        phase: number;
        speed: number;
        thickness: number;
      }> = [];
      
      for (let i = 0; i < ringCount; i++) {
        rings.push({
          baseRadius: 2 + i * 1.8,
          phase: r() * Math.PI * 2,
          speed: 0.3 + r() * 0.3,
          thickness: 0.015 + r() * 0.01,
        });
      }
      return { rings, count: ringCount };
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
      // Volumetric god rays - wide beams with glow effect
      const count = 10;
      const rays: Array<{
        angle: number;
        width: number;
        length: number;
        phase: number;
        speed: number;
        opacity: number;
      }> = [];
      
      for (let i = 0; i < count; i++) {
        // Rays from edges of screen at various angles
        const angle = (i / count) * Math.PI * 2 + r() * 0.3;
        rays.push({
          angle,
          width: 0.8 + r() * 1.2, // Varying widths for depth
          length: 12 + r() * 8,
          phase: r() * Math.PI * 2,
          speed: 0.2 + r() * 0.4,
          opacity: 0.15 + r() * 0.15,
        });
      }
      return { rays, count };
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
    
    // MovingLines and EnergyField are handled by their own components
    
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
    
    // Light rays animation is handled in the render loop via mesh updates
    
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
  
  // Moving lines - use separate component to avoid buffer issues
  if (effect === 'movingLines' && effectData.stars) {
    return <MovingLinesEffect stars={effectData.stars} bass={bass} color={primaryColor} />;
  }
  
  // Energy field - pulsing rings
  if (effect === 'energyField' && effectData.rings) {
    return <EnergyFieldEffect rings={effectData.rings} bass={bass} color={primaryColor} />;
  }
  
  // Light rays - volumetric glowing beams
  if (effect === 'lightRays' && effectData.rays) {
    return (
      <LightRaysEffect rays={effectData.rays} bass={bass} />
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

// Volumetric light rays component with glow effect
function LightRaysEffect({ rays, bass }: { 
  rays: Array<{ angle: number; width: number; length: number; phase: number; speed: number; opacity: number }>;
  bass: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRefs = useRef<THREE.Mesh[]>([]);
  
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    
    meshRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const ray = rays[i];
      if (!ray) return;
      
      // Animate rays sliding in and out of view
      const slidePhase = Math.sin(t * ray.speed + ray.phase);
      const slideAmount = slidePhase * 4;
      
      // Move along the ray direction (toward/away from center)
      mesh.position.x = Math.cos(ray.angle) * (10 + slideAmount);
      mesh.position.y = Math.sin(ray.angle) * (7 + slideAmount * 0.5);
      mesh.position.z = -12 + slideAmount * 0.5;
      
      // Fade opacity based on slide position (more visible when "entering")
      const material = mesh.material as THREE.MeshBasicMaterial;
      const visibilityPhase = (slidePhase + 1) / 2; // 0 to 1
      material.opacity = ray.opacity * (0.3 + visibilityPhase * 0.7) + bass * 0.2;
    });
  });
  
  return (
    <group ref={groupRef}>
      {rays.map((ray, i) => (
        <mesh
          key={i}
          ref={(el) => { if (el) meshRefs.current[i] = el; }}
          position={[Math.cos(ray.angle) * 10, Math.sin(ray.angle) * 7, -12]}
          rotation={[0, 0, ray.angle - Math.PI / 2]}
        >
          {/* Cone for volumetric ray appearance */}
          <coneGeometry args={[ray.width, ray.length, 6, 1, true]} />
          <meshBasicMaterial
            color="#ffffff"
            transparent
            opacity={ray.opacity}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      ))}
      {/* Add softer glow layer */}
      {rays.map((ray, i) => (
        <mesh
          key={`glow-${i}`}
          position={[Math.cos(ray.angle) * 10, Math.sin(ray.angle) * 7, -12.5]}
          rotation={[0, 0, ray.angle - Math.PI / 2]}
        >
          <coneGeometry args={[ray.width * 2, ray.length * 0.8, 4, 1, true]} />
          <meshBasicMaterial
            color="#ffffff"
            transparent
            opacity={ray.opacity * 0.3}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

// Moving lines effect - safe component without buffer modifications
function MovingLinesEffect({ 
  stars, 
  bass, 
  color 
}: { 
  stars: Array<{ speed: number; angle: number; startX: number; startY: number; phase: number }>;
  bass: number;
  color: THREE.Color;
}) {
  const meshRefs = useRef<THREE.Mesh[]>([]);
  
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    
    meshRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const star = stars[i];
      if (!star) return;
      
      // Calculate position along trajectory
      const progress = ((t * star.speed + star.phase) % 50) / 50; // 0-1 cycle
      const travelDist = 40; // Total travel distance
      
      // Move from start position in diagonal direction
      const dx = Math.cos(star.angle) * progress * travelDist;
      const dy = Math.sin(star.angle) * progress * travelDist;
      
      mesh.position.x = star.startX + dx;
      mesh.position.y = star.startY + dy;
      mesh.position.z = -8;
      
      // Fade in at start, fade out at end
      const fadeIn = Math.min(progress * 5, 1);
      const fadeOut = Math.min((1 - progress) * 5, 1);
      const opacity = fadeIn * fadeOut * (0.4 + bass * 0.4);
      
      const material = mesh.material as THREE.MeshBasicMaterial;
      material.opacity = opacity;
      
      // Scale based on speed (faster = longer trail)
      mesh.scale.x = 0.5 + star.speed * 2 + bass * 0.5;
    });
  });
  
  return (
    <group>
      {stars.map((star, i) => (
        <mesh
          key={i}
          ref={(el) => { if (el) meshRefs.current[i] = el; }}
          position={[star.startX, star.startY, -8]}
          rotation={[0, 0, star.angle]}
        >
          <capsuleGeometry args={[0.02, 0.3, 2, 4]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.5}
          />
        </mesh>
      ))}
    </group>
  );
}

// Energy field effect - pulsing concentric rings
function EnergyFieldEffect({ 
  rings, 
  bass, 
  color 
}: { 
  rings: Array<{ baseRadius: number; phase: number; speed: number; thickness: number }>;
  bass: number;
  color: THREE.Color;
}) {
  const meshRefs = useRef<THREE.Mesh[]>([]);
  
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    
    meshRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const ring = rings[i];
      if (!ring) return;
      
      // Pulsing expansion/contraction
      const pulse = Math.sin(t * ring.speed + ring.phase);
      const scale = 1 + pulse * 0.15 + bass * 0.2;
      
      mesh.scale.setScalar(scale);
      
      // Fade opacity based on pulse
      const material = mesh.material as THREE.MeshBasicMaterial;
      const baseOpacity = 0.08 + (i / rings.length) * 0.05;
      material.opacity = baseOpacity + pulse * 0.05 + bass * 0.1;
      
      // Slow rotation
      mesh.rotation.z = t * 0.1 * (i % 2 === 0 ? 1 : -1);
    });
  });
  
  return (
    <group position={[0, 0, -10]}>
      {rings.map((ring, i) => (
        <mesh
          key={i}
          ref={(el) => { if (el) meshRefs.current[i] = el; }}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <torusGeometry args={[ring.baseRadius, ring.thickness, 8, 64]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.1}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

export function RandomVisualizerTemplate({ params, audioData }: RandomVisualizerTemplateProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRefs = useRef<THREE.Mesh[]>([]);
  const particlesRef = useRef<THREE.Points>(null);
  const linesRef = useRef<THREE.LineSegments>(null);
  
  const random = useMemo(() => seededRandom(params.seed), [params.seed]);
  
  // Always use mono (white) color palette for clean layering of aesthetics
  const colors = useMemo(() => {
    const palette = COLOR_PALETTES.mono;
    return palette.map(c => new THREE.Color(c));
  }, []);

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
    
    // Single-element shapes only render 1 element
    const isSingleElement = ['membrane', 'pulsar', 'vortexCore', 'cosmicEye'].includes(params.baseShape);
    const count = isSingleElement ? 1 : params.elementCount;
    const r = seededRandom(params.seed);
    
    // Pick geometries - orb ALWAYS uses spherical shapes regardless of mixedGeometry
    const getRandomGeometry = (): GeometryType => {
      // ORB shape always returns spheres - no exceptions
      if (params.baseShape === 'orb') {
        return r() > 0.5 ? 'sphere' : 'icosahedron';
      }
      
      // For other shapes, allow mixed geometry if enabled
      if (params.mixedGeometry) {
        return GEOMETRY_TYPES[Math.floor(r() * GEOMETRY_TYPES.length)];
      }
      
      // Return shape-appropriate default
      switch (params.baseShape) {
        case 'geometric': return ['box', 'octahedron', 'dodecahedron', 'tetrahedron'][Math.floor(r() * 4)] as GeometryType;
        case 'crystal': return r() > 0.5 ? 'cone' : 'octahedron';
        case 'helix': return r() > 0.5 ? 'torusKnot' : 'sphere';
        case 'lattice': return r() > 0.5 ? 'box' : 'octahedron';
        case 'matrix': return r() > 0.5 ? 'box' : 'cylinder';
        case 'nebula': return r() > 0.5 ? 'sphere' : 'icosahedron';
        // Single-element shapes use specific geometries
        case 'membrane': return 'icosahedron';
        case 'pulsar': return 'sphere';
        case 'vortexCore': return 'torusKnot';
        case 'cosmicEye': return 'torus';
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
          // Ring formations at different depths - clear tunnel effect
          const ringIndex = Math.floor(i / 8); // 8 elements per ring
          const angleInRing = (i % 8) / 8 * Math.PI * 2;
          const depth = (ringIndex / Math.ceil(count / 8) - 0.5) * 12;
          const ringRadius = 2.5 + Math.sin(ringIndex * 0.5) * 0.5;
          pos = [
            Math.cos(angleInRing) * ringRadius,
            Math.sin(angleInRing) * ringRadius,
            depth
          ];
          break;
        }
        
        case 'crystal': {
          // Vertical crystalline spires radiating from center
          const spikeAngle = (i / count) * Math.PI * 2;
          const spikeHeight = (r() * 2 - 0.5) * 5; // Vary height
          const spikeRadius = 0.5 + (Math.abs(spikeHeight) / 5) * 2; // Wider at base, narrower at tips
          pos = [
            Math.cos(spikeAngle) * spikeRadius,
            spikeHeight,
            Math.sin(spikeAngle) * spikeRadius
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
          // Spiral galaxy with arms - distinct from particles
          const armIndex = i % 3; // 3 spiral arms
          const armAngle = (armIndex / 3) * Math.PI * 2;
          const spiralProgress = (i / count) * 3;
          const spiralRadius = 1 + spiralProgress * 1.5;
          const spiralAngle = armAngle + spiralProgress * Math.PI * 1.5;
          const heightVariation = (r() - 0.5) * (1 - spiralProgress / 4); // Flatter toward edges
          pos = [
            Math.cos(spiralAngle) * spiralRadius + (r() - 0.5) * 0.5,
            heightVariation,
            Math.sin(spiralAngle) * spiralRadius + (r() - 0.5) * 0.5
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
        
        case 'particles': {
          // Clustered cloud formations - distinct groupings
          const clusterIndex = i % 5; // 5 clusters
          const clusterCenterAngle = (clusterIndex / 5) * Math.PI * 2;
          const clusterRadius = 3;
          const clusterCenterX = Math.cos(clusterCenterAngle) * clusterRadius;
          const clusterCenterZ = Math.sin(clusterCenterAngle) * clusterRadius;
          // Random position within cluster
          pos = [
            clusterCenterX + (r() - 0.5) * 3,
            (r() - 0.5) * 4,
            clusterCenterZ + (r() - 0.5) * 3
          ];
          break;
        }
        
        // Single-element shapes - only render ONE element at center
        case 'membrane':
        case 'pulsar':
        case 'vortexCore':
        case 'cosmicEye': {
          // These are single-element shapes - just position at center
          pos = [0, 0, 0];
          break;
        }
        
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
      
      // Apply variance parameters for unique generations
      const spreadMult = params.positionSpread ? params.positionSpread / 4 : 1;
      const scaleMult = params.scaleVariation || 1;
      const rotOffset = params.rotationOffset || 0;
      
      // Single-element shapes get a large scale to fill the screen
      const baseScale = isSingleElement 
        ? 2.5 + (params.scaleVariation || 1) * 0.5 
        : (0.15 + r() * 0.45) * elementScale * scaleMult;
      
      configs.push({
        position: isSingleElement ? [0, 0, 0] : [pos[0] * spreadMult, pos[1] * spreadMult, pos[2] * spreadMult],
        rotation: [r() * Math.PI + rotOffset, r() * Math.PI, r() * Math.PI],
        scale: baseScale,
        geometry: geo,
        colorIndex: Math.floor(r() * colors.length),
        wireframe: false,
      });
    }
    
    return configs;
  }, [params.seed, params.baseShape, params.elementCount, params.symmetry, params.mixedGeometry, params.scaleVariation, params.positionSpread, params.rotationOffset, colors.length, elementScale]);

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
      // Apply animation style - each style is dramatically different
      switch (params.animationStyle) {
        case 'rotating':
          // Fast orbital rotation
          groupRef.current.rotation.y = t * speed * 1.5;
          groupRef.current.rotation.x = Math.sin(t * speed) * 0.4;
          groupRef.current.rotation.z = Math.cos(t * speed * 0.7) * 0.2;
          break;
          
        case 'pulsing':
          // Sharp rhythmic pulses on beat
          const pulsePhase = Math.sin(t * 4) * 0.5 + 0.5; // 0-1 wave
          const pulsePop = Math.pow(pulsePhase, 3); // Sharp peaks
          const pulseScale = 0.85 + pulsePop * 0.4 + bass * 0.35;
          groupRef.current.scale.setScalar(pulseScale);
          groupRef.current.rotation.y = t * speed * 0.2;
          break;
          
        case 'flowing':
          // Smooth wave motion - whole group undulates
          groupRef.current.position.y = Math.sin(t * speed * 1.5) * 1.2;
          groupRef.current.position.x = Math.cos(t * speed * 0.8) * 0.6;
          groupRef.current.rotation.z = Math.sin(t * speed) * 0.3;
          groupRef.current.rotation.x = Math.cos(t * speed * 0.6) * 0.15;
          break;
          
        case 'chaotic':
          // Wild, erratic movement - group level
          groupRef.current.rotation.x = Math.sin(t * 3.7) * 0.8;
          groupRef.current.rotation.y = Math.cos(t * 2.3) * 0.9;
          groupRef.current.rotation.z = Math.sin(t * 4.1) * 0.6;
          groupRef.current.position.x = Math.sin(t * 2.9) * 0.5;
          groupRef.current.position.y = Math.cos(t * 3.3) * 0.5;
          break;
          
        case 'breathing':
          // Deep, slow inhale/exhale cycle
          const breathCycle = Math.sin(t * 0.4); // Very slow
          const breathScale = 0.7 + (breathCycle + 1) * 0.35 + bass * 0.15; // 0.7 to 1.4
          groupRef.current.scale.setScalar(breathScale);
          // Slight rotation during breath
          groupRef.current.rotation.y = t * 0.05;
          groupRef.current.rotation.x = breathCycle * 0.1;
          break;
          
        case 'explosive':
          // Burst outward, then reset
          const explosionCycle = (t * 0.8) % 3; // 3 second cycle
          const burstPhase = explosionCycle < 0.5 ? explosionCycle * 2 : Math.max(0, 1 - (explosionCycle - 0.5) * 0.8);
          const explosiveScale = 0.6 + burstPhase * 0.8 + audioData.beatStrength * 0.4;
          groupRef.current.scale.setScalar(explosiveScale);
          groupRef.current.rotation.y = t * speed;
          groupRef.current.rotation.x = burstPhase * 0.5;
          break;
          
        case 'smooth':
        default:
          // Zen-like minimal movement
          groupRef.current.rotation.y = t * speed * 0.15;
          groupRef.current.rotation.x = Math.sin(t * 0.1) * 0.05;
          groupRef.current.position.y = Math.sin(t * 0.2) * 0.1;
      }
    }

    // Check if we're using a single-element shape
    const isSingleElementShape = ['membrane', 'pulsar', 'vortexCore', 'cosmicEye'].includes(params.baseShape);

    // Animate individual meshes - style-specific behavior
    meshRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      
      const config = meshConfigs[i];
      if (!config) return;
      
      const freqIndex = Math.floor((i / meshRefs.current.length) * (audioData.frequency?.length || 1));
      const freqValue = (audioData.frequency?.[freqIndex] || 0) / 255;
      
      // Base scale from config
      const baseScale = config.scale || 0.3;
      
      // Single-element shapes get dramatic wild animations regardless of style
      if (isSingleElementShape) {
        const intensity = 1 + bass * 0.8 + mids * 0.4;
        
        switch (params.baseShape) {
          case 'membrane':
            // Organic pulsing blob - wild deformation
            mesh.rotation.x = t * 0.5 + Math.sin(t * 2.3) * 0.5;
            mesh.rotation.y = t * 0.7 + Math.cos(t * 1.8) * 0.5;
            mesh.rotation.z = Math.sin(t * 1.5) * 0.3;
            mesh.scale.x = baseScale * (1 + Math.sin(t * 3) * 0.3 * intensity);
            mesh.scale.y = baseScale * (1 + Math.cos(t * 2.7) * 0.3 * intensity);
            mesh.scale.z = baseScale * (1 + Math.sin(t * 2.1) * 0.3 * intensity);
            break;
            
          case 'pulsar':
            // Pulsing star with rhythmic beats
            const pulsarBeat = Math.sin(t * 4);
            const pulsarPop = pulsarBeat > 0.6 ? 1.4 : 1;
            mesh.rotation.y = t * 1.5;
            mesh.rotation.x = Math.sin(t * 0.8) * 0.4;
            mesh.scale.setScalar(baseScale * pulsarPop * intensity);
            break;
            
          case 'vortexCore':
            // Wild spinning torusKnot
            mesh.rotation.x = t * 2 + bass;
            mesh.rotation.y = t * 3;
            mesh.rotation.z = t * 1.5;
            mesh.scale.setScalar(baseScale * (0.9 + Math.sin(t * 2) * 0.2) * intensity);
            break;
            
          case 'cosmicEye':
            // Hypnotic iris dilation
            const eyePulse = Math.sin(t * 1.5);
            mesh.rotation.z = t * 0.3;
            mesh.scale.x = baseScale * (1 + eyePulse * 0.4 * intensity);
            mesh.scale.y = baseScale * (1 + eyePulse * 0.4 * intensity);
            mesh.scale.z = baseScale * (0.5 + bass * 0.5);
            break;
        }
        return; // Skip normal animation processing for single elements
      }
      
      // Style-specific individual mesh animations
      switch (params.animationStyle) {
        case 'chaotic':
          // Each element moves independently and erratically
          const chaosX = Math.sin(t * 2.5 + i * 1.7) * 1.5;
          const chaosY = Math.cos(t * 3.1 + i * 0.9) * 1.5;
          const chaosZ = Math.sin(t * 1.9 + i * 2.3) * 1.5;
          mesh.position.x = config.position[0] + chaosX;
          mesh.position.y = config.position[1] + chaosY;
          mesh.position.z = config.position[2] + chaosZ;
          mesh.rotation.x = t * 2 + i;
          mesh.rotation.y = t * 3 + i * 0.5;
          mesh.scale.setScalar(baseScale * (0.8 + Math.sin(t * 4 + i) * 0.4));
          break;
          
        case 'flowing':
          // Wave propagation through elements
          const waveOffset = Math.sin(t * 2 + i * 0.4) * 0.8;
          const waveX = Math.sin(t * 1.5 + i * 0.3) * 0.4;
          mesh.position.x = config.position[0] + waveX;
          mesh.position.y = config.position[1] + waveOffset;
          mesh.position.z = config.position[2];
          mesh.rotation.z = Math.sin(t + i * 0.2) * 0.3;
          mesh.scale.setScalar(baseScale * (1 + freqValue * 0.3));
          break;
          
        case 'explosive':
          // Elements burst outward from center, then reset
          const explosionCycle = (t * 0.8) % 3;
          const burstAmount = explosionCycle < 0.5 ? explosionCycle * 4 : Math.max(0, 2 - (explosionCycle - 0.5) * 1.5);
          const dir = new THREE.Vector3(...config.position).normalize();
          mesh.position.x = config.position[0] + dir.x * burstAmount;
          mesh.position.y = config.position[1] + dir.y * burstAmount;
          mesh.position.z = config.position[2] + dir.z * burstAmount;
          mesh.scale.setScalar(baseScale * (1 + burstAmount * 0.2 + freqValue * 0.3));
          break;
          
        case 'breathing':
          // All elements expand/contract together like lungs
          const breathPhase = Math.sin(t * 0.4);
          const breathExpand = (breathPhase + 1) * 0.3; // 0 to 0.6
          const breathDir = new THREE.Vector3(...config.position).normalize();
          mesh.position.x = config.position[0] + breathDir.x * breathExpand;
          mesh.position.y = config.position[1] + breathDir.y * breathExpand;
          mesh.position.z = config.position[2] + breathDir.z * breathExpand;
          mesh.scale.setScalar(baseScale * (0.9 + breathPhase * 0.2 + freqValue * 0.2));
          break;
          
        case 'pulsing':
          // Sharp scale pops on rhythm
          const pulseWave = Math.sin(t * 4 + i * 0.3);
          const pulsePop = pulseWave > 0.7 ? 1.5 : 1;
          mesh.scale.setScalar(baseScale * pulsePop * (1 + freqValue * 0.4));
          mesh.position.set(...config.position);
          break;
          
        case 'rotating':
          // Elements orbit their original positions
          const orbitRadius = 0.3;
          const orbitSpeed = 1 + (i % 3) * 0.5;
          mesh.position.x = config.position[0] + Math.cos(t * orbitSpeed + i) * orbitRadius;
          mesh.position.y = config.position[1] + Math.sin(t * orbitSpeed * 0.7 + i) * orbitRadius;
          mesh.position.z = config.position[2];
          mesh.rotation.y = t * 2;
          mesh.scale.setScalar(baseScale * (1 + freqValue * 0.4));
          break;
          
        case 'smooth':
        default:
          // Minimal, zen-like gentle drift
          mesh.position.x = config.position[0] + Math.sin(t * 0.3 + i * 0.1) * 0.1;
          mesh.position.y = config.position[1] + Math.cos(t * 0.2 + i * 0.15) * 0.1;
          mesh.position.z = config.position[2];
          mesh.scale.setScalar(baseScale * (1 + freqValue * 0.3));
          break;
      }
      
      // Matrix falling effect - override position for matrix shape
      if (params.baseShape === 'matrix') {
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
        
        {/* Particle system - only for particles shape */}
        {params.baseShape === 'particles' && (
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
