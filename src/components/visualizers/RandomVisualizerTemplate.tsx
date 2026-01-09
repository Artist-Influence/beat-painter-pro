import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { RandomVisualizerParams, StandaloneVariant, GeometryType, AnimationStyle, ColorScheme } from '@/lib/randomVisualizerGenerator';
import { seededRandom, COLOR_PALETTES, GEOMETRY_TYPES } from '@/lib/randomVisualizerGenerator';
import { useVisualizerTexture } from '@/hooks/useVisualizerTexture';
import { useStudioStore } from '@/stores/studioStore';
import { CreativeTemplateRenderer } from './CreativeTemplateRenderer';
import { ComposedVisualizerRenderer } from './ComposedVisualizerRenderer';

// Animation style behavior modifiers
// SUPERCHARGED animation behaviors for dramatic audio reactivity
function getAnimationBehavior(style: AnimationStyle, bass: number, mids: number, highs: number, time: number) {
  switch (style) {
    case 'pulsing':
      return {
        scaleMultiplier: 1 + Math.sin(time * 6) * 0.25 * (1 + bass * 1.5),
        rotationBoost: 0.04 + bass * 0.06,
        positionJitter: 0,
        explosionFactor: 0,
        yBounce: bass * 0.3,
      };
    case 'breathing':
      return {
        scaleMultiplier: 1 + Math.sin(time * 2) * 0.2 * (1 + bass),
        rotationBoost: 0.02 + mids * 0.03,
        positionJitter: 0,
        explosionFactor: 0,
        yBounce: Math.sin(time * 2) * 0.15 * bass,
      };
    case 'chaotic':
      return {
        scaleMultiplier: 1 + (Math.random() - 0.5) * 0.6 * bass,
        rotationBoost: 0.25 * (1 + mids * 1.5),
        positionJitter: 0.25 * highs,
        explosionFactor: bass > 0.5 ? (bass - 0.5) * 1.5 : 0,
        yBounce: (Math.random() - 0.5) * bass * 0.4,
      };
    case 'explosive':
      return {
        scaleMultiplier: 1 + bass * 0.8,
        rotationBoost: 0.12 + bass * 0.1,
        positionJitter: bass * 0.15,
        explosionFactor: bass > 0.3 ? (bass - 0.3) * 4 : 0,
        yBounce: bass * 0.5,
      };
    case 'smooth':
      return {
        scaleMultiplier: 1 + bass * 0.15,
        rotationBoost: 0.01 + mids * 0.02,
        positionJitter: 0,
        explosionFactor: 0,
        yBounce: bass * 0.1,
      };
    case 'flowing':
      return {
        scaleMultiplier: 1 + Math.sin(time * 3) * 0.15 * (1 + bass),
        rotationBoost: 0.06 + mids * 0.04,
        positionJitter: Math.sin(time * 4) * 0.1 * mids,
        explosionFactor: 0,
        yBounce: Math.sin(time * 2.5) * 0.2 * bass,
      };
    case 'rotating':
    default:
      return {
        scaleMultiplier: 1 + bass * 0.25,
        rotationBoost: 0.15 + bass * 0.1,
        positionJitter: 0,
        explosionFactor: 0,
        yBounce: bass * 0.2,
      };
  }
}
interface RandomVisualizerTemplateProps {
  params: RandomVisualizerParams;
  audioData: {
    frequency: number[];
    amplitude: number;
    beatStrength: number;
  };
  isPlaying?: boolean;
}

// Audio analysis helper - SUPERCHARGED for maximum reactivity
function analyzeAudioData(frequency: number[]) {
  const freq = frequency || [];
  if (freq.length === 0) {
    return { bass: 0, mids: 0, highs: 0 };
  }
  
  // Extended frequency ranges for full punch detection
  const bassRange = freq.slice(0, 15);     // 0-320Hz: kick, sub-bass
  const midRange = freq.slice(15, 100);    // 320-2150Hz: snare, vocals  
  const highRange = freq.slice(100);       // 2150Hz+: hi-hats, cymbals
  
  // PEAK detection for bass and mids (maximum punch)
  // Safely handle empty arrays with 0 fallback
  const bass = bassRange.length > 0 ? Math.max(0, ...bassRange) / 255 : 0;
  const lowMids = midRange.slice(0, 20);
  const mids = lowMids.length > 0 ? Math.max(0, ...lowMids) / 255 : 0;
  const highs = highRange.length > 0 ? highRange.reduce((a, b) => a + b, 0) / highRange.length / 255 : 0;
  
  // AGGRESSIVE amplification for DRAMATIC reactivity
  return {
    bass: Math.min(bass * 3.5, 2.5),   // Massive bass punch
    mids: Math.min(mids * 2.8, 2.0),   // Strong mid presence
    highs: Math.min(highs * 2.5, 1.8), // Crisp highs
  };
}

// Geometry component factory for standalone shapes
function getStandaloneGeometry(type: GeometryType, detail: number) {
  const d = Math.max(1, Math.min(4, detail));
  switch (type) {
    case 'sphere': return <sphereGeometry args={[1, 16 * d, 16 * d]} />;
    case 'icosahedron': return <icosahedronGeometry args={[1, d]} />;
    case 'octahedron': return <octahedronGeometry args={[1, d - 1]} />;
    case 'dodecahedron': return <dodecahedronGeometry args={[1, d - 1]} />;
    case 'tetrahedron': return <tetrahedronGeometry args={[1, d - 1]} />;
    case 'torusKnot': return <torusKnotGeometry args={[0.6, 0.25, 64 * d, 16 * d]} />;
    case 'torus': return <torusGeometry args={[0.7, 0.3, 16 * d, 32 * d]} />;
    case 'box': return <boxGeometry args={[1.4, 1.4, 1.4]} />;
    case 'cone': return <coneGeometry args={[0.8, 1.6, 16 * d]} />;
    case 'cylinder': return <cylinderGeometry args={[0.6, 0.6, 1.4, 16 * d]} />;
    case 'capsule': return <capsuleGeometry args={[0.5, 1, 8, 16 * d]} />;
    case 'ring': return <torusGeometry args={[0.9, 0.15, 8, 32 * d]} />;
    default: return <sphereGeometry args={[1, 32, 32]} />;
  }
}

// Standalone procedural shape component - renders unique shapes based on variant
function StandaloneShape({ 
  variant, 
  audioData,
  seed,
  audioSensitivity
}: { 
  variant: StandaloneVariant;
  audioData: { frequency: number[]; amplitude: number; beatStrength: number };
  seed: number;
  audioSensitivity: {
    bassMultiplier: number;
    midsMultiplier: number;
    highsMultiplier: number;
    animationSpeed: number;
    spinSpeed: number;
  };
}) {
  // If creative template is NOT 'geometric', render the pre-built creative template
  if (variant.creativeTemplate && variant.creativeTemplate !== 'geometric') {
    return (
      <group>
        <CreativeTemplateRenderer 
          templateType={variant.creativeTemplate}
          audioData={audioData}
        />
        <ambientLight intensity={0.4} />
        <pointLight position={[4, 4, 4]} intensity={1.2} />
        <pointLight position={[-3, -2, 2]} intensity={0.6} />
      </group>
    );
  }
  
  // For complex compositions (not 'simple'), use the new ComposedVisualizerRenderer
  if (variant.compositionStyle && variant.compositionStyle !== 'simple') {
    return (
      <ComposedVisualizerRenderer
        variant={variant}
        audioData={audioData}
        seed={seed}
        audioSensitivity={audioSensitivity}
      />
    );
  }
  
  // Otherwise, render the existing procedural geometry
  const groupRef = useRef<THREE.Group>(null);
  const innerGroupRef = useRef<THREE.Group>(null);
  const meshRefs = useRef<THREE.Mesh[]>([]);
  const ringRefs = useRef<THREE.Mesh[]>([]);
  const particlesRef = useRef<THREE.Points>(null);
  
  // Per-frame smoothing refs for butter-smooth transitions
  const smoothedBassRef = useRef(0);
  const smoothedMidsRef = useRef(0);
  const smoothedHighsRef = useRef(0);
  const smoothedBeatRef = useRef(0);
  
  // Get applied texture and colors from style system
  const textureData = useVisualizerTexture();
  
  // Ref pattern for audioData to avoid stale closures in useFrame
  const audioDataRef = useRef(audioData);
  audioDataRef.current = audioData;
  
  // Audio sensitivity stored for use in useFrame
  const audioSensitivityRef = useRef(audioSensitivity);
  audioSensitivityRef.current = audioSensitivity;
  
  // Create texture-aware materials that respond to applied styles
  const mainMaterial = useMemo(() => {
    const colors = textureData.colors;
    const primaryColor = new THREE.Color(colors.primary);
    const secondaryColor = new THREE.Color(colors.secondary);
    
    const mat = new THREE.MeshStandardMaterial({
      color: primaryColor,
      emissive: primaryColor,
      emissiveIntensity: colors.isNeon ? variant.emissiveIntensity * 1.5 : variant.emissiveIntensity,
      metalness: colors.isMetallic ? 0.9 : 0.7,
      roughness: colors.isMetallic ? 0.1 : 0.3,
      wireframe: variant.wireframeMix === 1,
      transparent: variant.wireframeMix > 0,
      opacity: variant.wireframeMix === 1 ? 0.9 : 1,
    });
    
    if (textureData.texture) {
      mat.map = textureData.texture;
      mat.emissiveMap = textureData.texture;
      mat.needsUpdate = true;
    }
    
    return mat;
  }, [textureData, variant]);
  
  const secondaryMaterial = useMemo(() => {
    const colors = textureData.colors;
    const secondaryColor = new THREE.Color(colors.secondary);
    
    const mat = new THREE.MeshStandardMaterial({
      color: secondaryColor,
      emissive: new THREE.Color(colors.accent),
      emissiveIntensity: variant.emissiveIntensity * 0.5,
      metalness: colors.isMetallic ? 0.9 : 0.8,
      roughness: colors.isMetallic ? 0.15 : 0.2,
      transparent: true,
      opacity: 0.6,
    });
    
    if (textureData.texture) {
      mat.map = textureData.texture;
      mat.emissiveMap = textureData.texture;
      mat.needsUpdate = true;
    }
    
    return mat;
  }, [textureData, variant]);
  
  const accentColor = useMemo(() => new THREE.Color(textureData.colors.accent), [textureData.colors.accent]);
  const primaryColor = useMemo(() => new THREE.Color(textureData.colors.primary), [textureData.colors.primary]);
  
  // Generate particle halo positions
  const particlePositions = useMemo(() => {
    if (!variant.hasParticleHalo) return null;
    const count = variant.particleHaloCount;
    const positions = new Float32Array(count * 3);
    const r = seededRandom(seed + 888);
    
    for (let i = 0; i < count; i++) {
      // Distribute in a shell around the shape
      const phi = r() * Math.PI * 2;
      const theta = r() * Math.PI;
      const radius = 2 + r() * 1.5;
      positions[i * 3] = Math.sin(theta) * Math.cos(phi) * radius;
      positions[i * 3 + 1] = Math.sin(theta) * Math.sin(phi) * radius;
      positions[i * 3 + 2] = Math.cos(theta) * radius;
    }
    return positions;
  }, [variant.hasParticleHalo, variant.particleHaloCount, seed]);
  
  // Generate fractured pieces if enabled
  const fracturedPieces = useMemo(() => {
    if (!variant.fractured) return null;
    const pieces: Array<{ position: [number, number, number]; rotation: [number, number, number]; scale: number }> = [];
    const r = seededRandom(seed + 777);
    
    for (let i = 0; i < variant.fracturedCount; i++) {
      const angle = (i / variant.fracturedCount) * Math.PI * 2;
      const radius = 0.3 + r() * 0.5;
      pieces.push({
        position: [Math.cos(angle) * radius, (r() - 0.5) * 0.8, Math.sin(angle) * radius],
        rotation: [r() * Math.PI, r() * Math.PI, r() * Math.PI],
        scale: 0.3 + r() * 0.4,
      });
    }
    return pieces;
  }, [variant.fractured, variant.fracturedCount, seed]);
  
  // Animation frame - AUDIO-FIRST: dramatic reactivity
  useFrame(() => {
    // Calculate audio EVERY FRAME inside useFrame using REF (NOT stale closure)
    const currentAudioData = audioDataRef.current;
    const raw = analyzeAudioData(currentAudioData.frequency);
    const sens = audioSensitivityRef.current;
    
    // Step 1: Detect raw audio (0-1.8 after amplification)
    const detectedBass = raw.bass;
    const detectedMids = raw.mids;
    const detectedHighs = raw.highs;
    
    // Step 2: Apply multipliers for EFFECT (controls reactivity)
    const targetBass = Math.min(detectedBass * sens.bassMultiplier, 2.5);
    const targetMids = Math.min(detectedMids * sens.midsMultiplier, 2.0);
    const targetHighs = Math.min(detectedHighs * sens.highsMultiplier, 2.0);
    
    // FAST asymmetric lerp (instant attack, quick decay for punchy response)
    const attackLerp = 0.9;   // Near-instant attack
    const decayLerp = 0.6;    // Fast decay for quick release
    const lerpAudio = (current: number, target: number) => {
      const factor = target > current ? attackLerp : decayLerp;
      return current + (target - current) * factor;
    };
    
    smoothedBassRef.current = lerpAudio(smoothedBassRef.current, targetBass);
    smoothedMidsRef.current = lerpAudio(smoothedMidsRef.current, targetMids);
    smoothedHighsRef.current = lerpAudio(smoothedHighsRef.current, targetHighs);
    smoothedBeatRef.current = lerpAudio(smoothedBeatRef.current, currentAudioData.beatStrength);
    
    // Transient blend: 70% raw audio for MAXIMUM punch
    const bassEffect = smoothedBassRef.current * 0.3 + targetBass * 0.7;
    const midsEffect = smoothedMidsRef.current * 0.3 + targetMids * 0.7;
    const highsEffect = smoothedHighsRef.current * 0.3 + targetHighs * 0.7;
    const beat = smoothedBeatRef.current;
    
    // Audio threshold - use raw values for hasAudio check
    const audioThreshold = 0.02;
    const hasAudio = detectedBass > audioThreshold || detectedMids > audioThreshold || detectedHighs > audioThreshold;
    
    // DRAMATIC beat pop effect
    const beatPop = beat > 0.15 ? 1 + (beat - 0.15) * 1.2 : 1;
    
    if (groupRef.current) {
      const g = groupRef.current;
      const spinSpeed = sens.spinSpeed ?? 0;
      
      // Scale: BASE + DRAMATIC reactivity
      const baseScale = 1.8;
      // LARGER boosts for visible effect
      const bassScaleBoost = Math.min(detectedBass * sens.bassMultiplier * 0.4, 0.7);
      const midsScaleBoost = Math.min(detectedMids * sens.midsMultiplier * 0.2, 0.35);
      // Final scale with beat pop
      const finalGroupScale = Math.min(baseScale + bassScaleBoost + midsScaleBoost, 3.0);
      g.scale.setScalar(finalGroupScale * beatPop);
      
      // Y-BOUNCE on bass hits
      g.position.y = bassEffect * 0.35;
      
      // STRONGER rotation when audio is playing
      if (spinSpeed > 0.1 && hasAudio) {
        g.rotation.y += spinSpeed * 0.06;
        g.rotation.y += bassEffect * 0.3 * (spinSpeed / 2);
        g.rotation.x += midsEffect * 0.15 * (spinSpeed / 2);
        g.rotation.z += highsEffect * 0.1 * (spinSpeed / 2);
      }
    }
    
    // Animate inner group for twist effect - STRONGER when audio present
    if (innerGroupRef.current && variant.twisted > 0 && hasAudio) {
      innerGroupRef.current.rotation.y += bassEffect * variant.twisted * 0.2;  // Increased
    }
    
    // Animate orbit rings - STRONGER when audio present
    ringRefs.current.forEach((ring, i) => {
      if (!ring) return;
      const baseRingScale = 1.0;
      const ringScaleBoost = Math.min(bassEffect * 0.35, 0.6);  // Increased
      ring.scale.setScalar(baseRingScale + ringScaleBoost);
      if (hasAudio) {
        ring.rotation.z += midsEffect * 0.1 * (i % 2 === 0 ? 1 : -1);  // Increased
      }
    });
    
    // Animate particles - STRONGER when audio present
    if (particlesRef.current && variant.hasParticleHalo) {
      const material = particlesRef.current.material as THREE.PointsMaterial;
      material.opacity = 0.3 + bassEffect * 0.5 + highsEffect * 0.3;  // Increased
      if (hasAudio) {
        particlesRef.current.rotation.y += bassEffect * 0.04;   // Increased
        particlesRef.current.rotation.x += midsEffect * 0.02;   // Increased
      }
    }
    
    // Animate fractured pieces - DRAMATIC explosion when audio present
    if (variant.fractured && fracturedPieces && hasAudio) {
      meshRefs.current.forEach((mesh, i) => {
        if (!mesh || i >= fracturedPieces.length) return;
        const piece = fracturedPieces[i];
        const explosionAmount = bassEffect * 1.0;  // DOUBLED
        const dir = new THREE.Vector3(...piece.position).normalize();
        mesh.position.x = piece.position[0] + dir.x * explosionAmount;
        mesh.position.y = piece.position[1] + dir.y * explosionAmount;
        mesh.position.z = piece.position[2] + dir.z * explosionAmount;
        mesh.rotation.x += bassEffect * 0.2;   // Increased
        mesh.rotation.y += midsEffect * 0.25;  // Increased
      });
    }
  });
  
  return (
    <group ref={groupRef}>
      <group ref={innerGroupRef}>
        {/* Main primary geometry - with axis stretching */}
        {!variant.fractured && (
          <mesh scale={[variant.stretchX, variant.stretchY, variant.stretchZ]}>
            {getStandaloneGeometry(variant.primaryGeometry, variant.detailLevel)}
            <primitive object={mainMaterial} attach="material" />
          </mesh>
        )}
        
        {/* Wireframe overlay if mixed mode */}
        {variant.wireframeMix === 0.5 && !variant.fractured && (
          <mesh scale={[variant.stretchX * 1.02, variant.stretchY * 1.02, variant.stretchZ * 1.02]}>
            {getStandaloneGeometry(variant.primaryGeometry, variant.detailLevel)}
            <meshBasicMaterial color={accentColor} wireframe transparent opacity={0.4} />
          </mesh>
        )}
        
        {/* Additional concentric layers */}
        {variant.layerCount > 1 && !variant.fractured && Array.from({ length: variant.layerCount - 1 }).map((_, i) => {
          const layerScale = 1 - (i + 1) * variant.layerSpacing;
          if (layerScale <= 0.1) return null;
          return (
            <mesh 
              key={`layer-${i}`}
              scale={[
                variant.stretchX * layerScale, 
                variant.stretchY * layerScale, 
                variant.stretchZ * layerScale
              ]}
            >
              {getStandaloneGeometry(i % 2 === 0 ? variant.primaryGeometry : variant.secondaryGeometry, variant.detailLevel)}
              <primitive object={secondaryMaterial.clone()} attach="material" />
            </mesh>
          );
        })}
        
        {/* Inner core */}
        {variant.hasInnerCore && !variant.fractured && (
          <mesh scale={[variant.innerCoreScale, variant.innerCoreScale, variant.innerCoreScale]}>
            {getStandaloneGeometry(variant.secondaryGeometry, 2)}
            <meshBasicMaterial color={accentColor} />
          </mesh>
        )}
        
        {/* Outer shell (hollow transparent version) */}
        {variant.hasOuterShell && !variant.fractured && (
          <mesh scale={[variant.stretchX * 1.3, variant.stretchY * 1.3, variant.stretchZ * 1.3]}>
            {getStandaloneGeometry(variant.primaryGeometry, 1)}
            <meshBasicMaterial 
              color={primaryColor} 
              wireframe 
              transparent 
              opacity={variant.outerShellOpacity}
            />
          </mesh>
        )}
        
        {/* Fractured pieces - replaces main geometry when enabled */}
        {variant.fractured && fracturedPieces?.map((piece, i) => (
          <mesh
            key={`frac-${i}`}
            ref={(el) => { if (el) meshRefs.current[i] = el; }}
            position={piece.position}
            rotation={piece.rotation}
            scale={piece.scale}
          >
            {getStandaloneGeometry(variant.primaryGeometry, variant.detailLevel)}
            <primitive object={mainMaterial.clone()} attach="material" />
          </mesh>
        ))}
      </group>
      
      {/* Orbit rings */}
      {variant.hasOrbitRings && Array.from({ length: variant.orbitRingCount }).map((_, i) => {
        const ringRadius = 1.4 + i * 0.5;
        const tiltAngle = variant.orbitRingTilt + i * 0.4;
        return (
          <mesh
            key={`ring-${i}`}
            ref={(el) => { if (el) ringRefs.current[i] = el; }}
            rotation={[tiltAngle, i * 0.3, 0]}
          >
            <torusGeometry args={[ringRadius, 0.02, 8, 64]} />
            <meshBasicMaterial 
              color={accentColor} 
              transparent 
              opacity={0.4 - i * 0.08}
            />
          </mesh>
        );
      })}
      
      {/* Mirror copy */}
      {variant.hasMirrorCopy && (
        <mesh 
          position={[variant.mirrorDistance, 0, 0]} 
          scale={[-variant.stretchX * 0.7, variant.stretchY * 0.7, variant.stretchZ * 0.7]}
        >
          {getStandaloneGeometry(variant.primaryGeometry, variant.detailLevel - 1)}
          <primitive object={secondaryMaterial.clone()} attach="material" />
        </mesh>
      )}
      
      {/* Particle halo */}
      {variant.hasParticleHalo && particlePositions && (
        <points ref={particlesRef}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={variant.particleHaloCount}
              array={particlePositions}
              itemSize={3}
            />
          </bufferGeometry>
          <pointsMaterial
            color={accentColor}
            size={0.05}
            transparent
            opacity={0.4}
            sizeAttenuation
          />
        </points>
      )}
      
      {/* Lights for standalone shape */}
      <ambientLight intensity={0.4} />
      <pointLight position={[4, 4, 4]} intensity={1.2} color={primaryColor} />
      <pointLight position={[-3, -2, 2]} intensity={0.6} color={accentColor} />
    </group>
  );
}

// Background effects component - renders behind main visualizer
function BackgroundEffects({ 
  effect, 
  colors, 
  bass,
  mids,
  highs,
  isPlaying,
  seed 
}: { 
  effect: string; 
  colors: THREE.Color[]; 
  bass: number;
  mids: number;
  highs: number;
  isPlaying: boolean;
  seed: number;
}) {
  const pointsRef = useRef<THREE.Points>(null);
  const linesRef = useRef<THREE.LineSegments>(null);
  const shootingStarsRef = useRef<THREE.Points>(null);
  
  // Persistent refs for audio-driven state (not time-driven)
  const auroraPhaseRef = useRef<Float32Array | null>(null);
  
  // Get applied style texture and colors
  const textureData = useVisualizerTexture();
  
  // Use applied style colors if available, otherwise fall back to palette
  const styleColors = useMemo(() => ({
    primary: new THREE.Color(textureData.colors.primary),
    secondary: new THREE.Color(textureData.colors.secondary),
    accent: new THREE.Color(textureData.colors.accent),
    isNeon: textureData.colors.isNeon,
  }), [textureData.colors]);
  
  // Shooting star velocities for movingLines effect
  const shootingStarData = useRef<{
    velocities: Float32Array;
    startPositions: Float32Array;
  } | null>(null);
  
  // Generate positions based on effect type - EXPANDED FOR FULL SCREEN COVERAGE
  const effectData = useMemo(() => {
    const r = seededRandom(seed + 999);
    
    if (effect === 'stars') {
      const count = 500; // Increased for full coverage
      const positions = new Float32Array(count * 3);
      const opacities = new Float32Array(count);
      
      for (let i = 0; i < count; i++) {
        // Spread stars in a MUCH larger sphere to fill entire viewport
        const phi = r() * Math.PI * 2;
        const theta = r() * Math.PI;
        const radius = 15 + r() * 20; // Expanded from 12+8 to 15+20
        positions[i * 3] = Math.sin(theta) * Math.cos(phi) * radius;
        positions[i * 3 + 1] = Math.sin(theta) * Math.sin(phi) * radius;
        positions[i * 3 + 2] = Math.cos(theta) * radius - 15; // Push back further
        opacities[i] = r();
      }
      return { positions, opacities, count };
    }
    
    if (effect === 'movingLines') {
      // Pre-generate stable star configs - EXPANDED for full screen
      const starCount = 35; // Increased from 20
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
          startX: (r() - 0.5) * 60, // Expanded from 35 to 60
          startY: r() * 35 - 10, // Expanded from 20 to 35
          phase: r() * 100,
        });
      }
      return { stars, count: starCount };
    }
    
    if (effect === 'energyField') {
      // Concentric pulsing rings - EXPANDED for full screen
      const ringCount = 10; // Increased from 6
      const rings: Array<{
        baseRadius: number;
        phase: number;
        speed: number;
        thickness: number;
      }> = [];
      
      for (let i = 0; i < ringCount; i++) {
        rings.push({
          baseRadius: 3 + i * 2.5, // Increased from 2 + i*1.8
          phase: r() * Math.PI * 2,
          speed: 0.3 + r() * 0.3,
          thickness: 0.02 + r() * 0.015, // Slightly thicker
        });
      }
      return { rings, count: ringCount };
    }
    
    if (effect === 'particles') {
      const count = 350; // Increased from 150 for full coverage
      const positions = new Float32Array(count * 3);
      const velocities = new Float32Array(count * 3);
      
      for (let i = 0; i < count; i++) {
        // EXPANDED volume to cover full screen
        positions[i * 3] = (r() - 0.5) * 50; // Increased from 16 to 50
        positions[i * 3 + 1] = (r() - 0.5) * 50; // Increased from 16 to 50
        positions[i * 3 + 2] = (r() - 0.5) * 25 - 8; // Increased from 8 to 25, push back more
        velocities[i * 3] = (r() - 0.5) * 0.02;
        velocities[i * 3 + 1] = (r() - 0.5) * 0.02;
        velocities[i * 3 + 2] = (r() - 0.5) * 0.01;
      }
      return { positions, velocities, count };
    }
    
    if (effect === 'lightRays') {
      // Volumetric god rays - EXPANDED for full screen coverage
      const count = 16; // Increased from 10
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
          width: 1.2 + r() * 1.8, // Increased from 0.8+1.2
          length: 22 + r() * 14, // Increased from 12+8 to 22+14
          phase: r() * Math.PI * 2,
          speed: 0.2 + r() * 0.4,
          opacity: 0.12 + r() * 0.12,
        });
      }
      return { rays, count };
    }
    
    if (effect === 'aurora') {
      const count = 250; // Increased from 100 for full coverage
      const positions = new Float32Array(count * 3);
      
      for (let i = 0; i < count; i++) {
        positions[i * 3] = (i / count - 0.5) * 60; // Increased from 25 to 60
        positions[i * 3 + 1] = 8 + r() * 6; // Increased spread
        positions[i * 3 + 2] = -15 + r() * 4; // Push further back
      }
      return { positions, count };
    }
    
    return null;
  }, [effect, seed]);
  
  useFrame(() => {
    // Freeze completely when not playing
    if (!isPlaying) return;
    
    // Audio threshold for movement
    const hasAudio = bass > 0.02 || mids > 0.02 || highs > 0.02;
    if (!hasAudio) return;
    
    if (effect === 'stars' && pointsRef.current && effectData?.opacities) {
      // Fully audio-reactive - stars pulse with bass, brighten with highs
      const material = pointsRef.current.material as THREE.PointsMaterial;
      material.opacity = 0.3 + bass * 0.5 + highs * 0.2;
    }
    
    // MovingLines and EnergyField are handled by their own components
    
    if (effect === 'particles' && pointsRef.current && effectData?.velocities) {
      // Only move when there's audio - use mids as velocity driver
      const positions = pointsRef.current.geometry.attributes.position;
      for (let i = 0; i < Math.min(50, effectData.count); i++) {
        let y = positions.getY(i);
        // Movement driven by mids intensity, not time
        y += effectData.velocities[i * 3 + 1] * (1 + mids * 5);
        if (y > 25) y = -25;
        if (y < -25) y = 25;
        positions.setY(i, y);
      }
      positions.needsUpdate = true;
      
      // Opacity reacts to audio
      const material = pointsRef.current.material as THREE.PointsMaterial;
      material.opacity = 0.3 + bass * 0.4 + highs * 0.2;
    }
    
    // Light rays animation is handled in the render loop via mesh updates
    
    if (effect === 'aurora' && pointsRef.current && effectData) {
      // Initialize phase tracking if needed
      if (!auroraPhaseRef.current || auroraPhaseRef.current.length !== effectData.count) {
        auroraPhaseRef.current = new Float32Array(effectData.count);
      }
      
      const positions = pointsRef.current.geometry.attributes.position;
      for (let i = 0; i < effectData.count; i++) {
        // Aurora wave height driven by mids, vertical offset by bass
        const baseY = 8 + mids * 4;
        // Accumulate phase only when there's audio
        auroraPhaseRef.current[i] += mids * 0.02;
        const wave = Math.sin(auroraPhaseRef.current[i] + i * 0.1) * (1 + highs);
        positions.setY(i, baseY + bass * 2 + wave);
      }
      positions.needsUpdate = true;
      
      // Opacity reacts to overall audio energy
      const material = pointsRef.current.material as THREE.PointsMaterial;
      material.opacity = 0.4 + bass * 0.3 + mids * 0.2;
    }
  });
  
  if (!effectData || effect === 'none') return null;
  
  // Stars effect - uses style accent color
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
          color={styleColors.accent}
          size={0.1}
          transparent
          opacity={0.6}
          sizeAttenuation
        />
      </points>
    );
  }
  
  // Moving lines - use separate component with style colors
  if (effect === 'movingLines' && effectData.stars) {
    return <MovingLinesEffect stars={effectData.stars} bass={bass} mids={mids} isPlaying={isPlaying} color={styleColors.accent} />;
  }
  
  // Energy field - pulsing rings with style colors
  if (effect === 'energyField' && effectData.rings) {
    return <EnergyFieldEffect rings={effectData.rings} bass={bass} mids={mids} isPlaying={isPlaying} color={styleColors.primary} accentColor={styleColors.accent} />;
  }
  
  // Light rays - volumetric glowing beams with style colors
  if (effect === 'lightRays' && effectData.rays) {
    return (
      <LightRaysEffect rays={effectData.rays} bass={bass} mids={mids} isPlaying={isPlaying} color={styleColors.primary} accentColor={styleColors.accent} />
    );
  }
  
  // Ambient particles - uses style primary color
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
          color={styleColors.primary}
          size={0.06}
          transparent
          opacity={0.4}
          sizeAttenuation
        />
      </points>
    );
  }
  
  // Aurora - uses style secondary color
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
          color={styleColors.secondary}
          size={0.4}
          transparent
          opacity={0.5}
          sizeAttenuation
        />
      </points>
    );
  }
  
  return null;
}

// Volumetric light rays component with glow effect - now with style colors
function LightRaysEffect({ rays, bass, mids, isPlaying, color, accentColor }: { 
  rays: Array<{ angle: number; width: number; length: number; phase: number; speed: number; opacity: number }>;
  bass: number;
  mids: number;
  isPlaying: boolean;
  color: THREE.Color;
  accentColor: THREE.Color;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRefs = useRef<THREE.Mesh[]>([]);
  // Track accumulated slide per ray - audio-driven, not time-driven
  const slideRef = useRef<number[]>([]);
  
  useFrame(() => {
    // Freeze when not playing
    if (!isPlaying) return;
    
    const hasAudio = bass > 0.02 || mids > 0.02;
    
    meshRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const ray = rays[i];
      if (!ray) return;
      
      // Initialize slide tracking
      if (slideRef.current[i] === undefined) slideRef.current[i] = 0;
      
      // Audio-driven slide - rays extend/contract with bass
      if (hasAudio) {
        // Accumulate movement based on bass intensity
        slideRef.current[i] += (bass - 0.3) * ray.speed * 0.5;
        // Decay back toward center when bass is low
        slideRef.current[i] *= 0.98;
      }
      
      const slideAmount = slideRef.current[i] * 6;
      
      // Move along the ray direction (toward/away from center) - expanded positions
      mesh.position.x = Math.cos(ray.angle) * (14 + slideAmount);
      mesh.position.y = Math.sin(ray.angle) * (10 + slideAmount * 0.5);
      mesh.position.z = -15 + slideAmount * 0.5;
      
      // Opacity reacts to audio intensity
      const material = mesh.material as THREE.MeshBasicMaterial;
      material.opacity = ray.opacity * (0.4 + bass * 0.6) + mids * 0.1;
    });
  });
  
  return (
    <group ref={groupRef}>
      {rays.map((ray, i) => (
        <mesh
          key={i}
          ref={(el) => { if (el) meshRefs.current[i] = el; }}
          position={[Math.cos(ray.angle) * 14, Math.sin(ray.angle) * 10, -15]}
          rotation={[0, 0, ray.angle - Math.PI / 2]}
        >
          {/* Cone for volumetric ray appearance */}
          <coneGeometry args={[ray.width, ray.length, 6, 1, true]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={ray.opacity}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      ))}
      {/* Add softer glow layer with accent color */}
      {rays.map((ray, i) => (
        <mesh
          key={`glow-${i}`}
          position={[Math.cos(ray.angle) * 14, Math.sin(ray.angle) * 10, -15.5]}
          rotation={[0, 0, ray.angle - Math.PI / 2]}
        >
          <coneGeometry args={[ray.width * 2.5, ray.length * 0.9, 4, 1, true]} />
          <meshBasicMaterial
            color={accentColor}
            transparent
            opacity={ray.opacity * 0.25}
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
  mids,
  isPlaying,
  color 
}: { 
  stars: Array<{ speed: number; angle: number; startX: number; startY: number; phase: number }>;
  bass: number;
  mids: number;
  isPlaying: boolean;
  color: THREE.Color;
}) {
  const meshRefs = useRef<THREE.Mesh[]>([]);
  // Track progress per star - audio-driven, not time-driven
  const progressRef = useRef<number[]>([]);
  
  useFrame(() => {
    // Freeze when not playing
    if (!isPlaying) return;
    
    const hasAudio = bass > 0.02 || mids > 0.02;
    
    meshRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const star = stars[i];
      if (!star) return;
      
      // Initialize progress tracking
      if (progressRef.current[i] === undefined) progressRef.current[i] = star.phase / 100;
      
      // Only move when there's audio - use bass as velocity driver
      if (hasAudio) {
        progressRef.current[i] = (progressRef.current[i] + bass * star.speed * 0.08) % 1;
      }
      
      const progress = progressRef.current[i];
      const travelDist = 40; // Total travel distance
      
      // Move from start position in diagonal direction
      const dx = Math.cos(star.angle) * progress * travelDist;
      const dy = Math.sin(star.angle) * progress * travelDist;
      
      mesh.position.x = star.startX + dx;
      mesh.position.y = star.startY + dy;
      mesh.position.z = -8;
      
      // Fade in at start, fade out at end - intensity based on audio
      const fadeIn = Math.min(progress * 5, 1);
      const fadeOut = Math.min((1 - progress) * 5, 1);
      const opacity = fadeIn * fadeOut * (0.3 + bass * 0.5 + mids * 0.2);
      
      const material = mesh.material as THREE.MeshBasicMaterial;
      material.opacity = opacity;
      
      // Scale based on audio intensity (louder = longer trail)
      mesh.scale.x = 0.5 + bass * 2 + mids * 0.5;
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

// Energy field effect - pulsing concentric rings - now with style colors
function EnergyFieldEffect({ 
  rings, 
  bass,
  mids,
  isPlaying,
  color,
  accentColor
}: { 
  rings: Array<{ baseRadius: number; phase: number; speed: number; thickness: number }>;
  bass: number;
  mids: number;
  isPlaying: boolean;
  color: THREE.Color;
  accentColor: THREE.Color;
}) {
  const meshRefs = useRef<THREE.Mesh[]>([]);
  // Track rotation per ring - audio-driven, not time-driven
  const rotationRef = useRef<number[]>([]);
  
  useFrame(() => {
    // Freeze when not playing
    if (!isPlaying) return;
    
    const hasAudio = bass > 0.02 || mids > 0.02;
    
    meshRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const ring = rings[i];
      if (!ring) return;
      
      // Initialize rotation tracking
      if (rotationRef.current[i] === undefined) rotationRef.current[i] = 0;
      
      // Pulse scale with bass - beat-synced expansion
      const pulse = bass * 1.5 + mids * 0.5;
      const scale = 1 + pulse * 0.3;
      
      mesh.scale.setScalar(scale);
      
      // Opacity reacts to audio intensity
      const material = mesh.material as THREE.MeshBasicMaterial;
      const baseOpacity = 0.1 + (i / rings.length) * 0.06;
      material.opacity = baseOpacity + bass * 0.2 + mids * 0.1;
      
      // Rotation only when audio present - accumulate based on mids
      if (hasAudio) {
        rotationRef.current[i] += mids * 0.03 * (i % 2 === 0 ? 1 : -1);
      }
      mesh.rotation.z = rotationRef.current[i];
    });
  });
  
  return (
    <group position={[0, 0, -12]}>
      {rings.map((ring, i) => (
        <mesh
          key={i}
          ref={(el) => { if (el) meshRefs.current[i] = el; }}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <torusGeometry args={[ring.baseRadius, ring.thickness, 8, 64]} />
          <meshBasicMaterial
            color={i % 2 === 0 ? color : accentColor}
            transparent
            opacity={0.12}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

export function RandomVisualizerTemplate({ params, audioData, isPlaying = false }: RandomVisualizerTemplateProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRefs = useRef<THREE.Mesh[]>([]);
  const particlesRef = useRef<THREE.Points>(null);
  const linesRef = useRef<THREE.LineSegments>(null);
  
  // Per-frame smoothing refs for butter-smooth transitions
  const smoothedBassRef = useRef(0);
  const smoothedMidsRef = useRef(0);
  const smoothedHighsRef = useRef(0);
  const smoothedBeatRef = useRef(0);
  
  // REF PATTERN: Fix stale closure in useFrame - these refs always hold current values
  const audioDataRef = useRef(audioData);
  audioDataRef.current = audioData;
  
  const random = useMemo(() => seededRandom(params.seed), [params.seed]);
  
  // Get applied visual style texture and colors
  const textureData = useVisualizerTexture();
  
  // Get background effect from store (overrides params if set)
  const storeBackgroundEffect = useStudioStore((state) => state.backgroundEffect);
  
  // Get glow intensity from params (fallback to 1.0)
  const glowIntensity = params.glowIntensity ?? 1.0;
  
  // Use params colorScheme if no style applied, otherwise use style colors
  const colors = useMemo(() => {
    // If there's an applied style, use it
    if (textureData.colors.primary !== '#8B5CF6') {
      return [
        new THREE.Color(textureData.colors.primary),
        new THREE.Color(textureData.colors.secondary),
        new THREE.Color(textureData.colors.accent),
      ];
    }
    
    // Otherwise, use the colorScheme from params
    const palette = COLOR_PALETTES[params.colorScheme] || COLOR_PALETTES.neon;
    return palette.slice(0, 3).map(hex => new THREE.Color(hex));
  }, [textureData.colors.primary, textureData.colors.secondary, textureData.colors.accent, params.colorScheme]);
  
  // Create texture-aware material for meshes with glow intensity
  const createStyledMaterial = useMemo(() => {
    return (colorIndex: number, wireframe: boolean, baseEmissiveIntensity: number) => {
      const color = colors[colorIndex % colors.length];
      // Apply glowIntensity multiplier from params
      const finalEmissive = (textureData.colors.isNeon ? 0.8 : 0.5) + baseEmissiveIntensity;
      const glowMultiplied = finalEmissive * glowIntensity;
      
      const mat = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: glowMultiplied,
        metalness: textureData.colors.isMetallic ? 0.9 : 0.7,
        roughness: textureData.colors.isMetallic ? 0.1 : 0.3,
        wireframe,
      });
      
      if (textureData.texture) {
        mat.map = textureData.texture;
        mat.emissiveMap = textureData.texture;
        mat.needsUpdate = true;
      }
      
      return mat;
    };
  }, [colors, textureData.texture, textureData.colors.isNeon, textureData.colors.isMetallic, glowIntensity]);

  // Get audio sensitivity settings from store
  const audioSensitivity = useStudioStore((state) => state.audioSensitivity);
  
  // REF PATTERN: Fix stale closure for audioSensitivity in useFrame
  const audioSensitivityRef = useRef(audioSensitivity);
  audioSensitivityRef.current = audioSensitivity;

  // Analyze audio WITH sensitivity multipliers (raw target values for smoothing)
  const { targetBass, targetMids, targetHighs } = useMemo(() => {
    const freq = audioData.frequency || [];
    const bassRange = freq.slice(0, Math.floor(freq.length * 0.2));
    const midRange = freq.slice(Math.floor(freq.length * 0.2), Math.floor(freq.length * 0.6));
    const highRange = freq.slice(Math.floor(freq.length * 0.6));
    
    const rawBass = bassRange.length > 0 ? bassRange.reduce((a, b) => a + b, 0) / bassRange.length / 255 : 0;
    const rawMids = midRange.length > 0 ? midRange.reduce((a, b) => a + b, 0) / midRange.length / 255 : 0;
    const rawHighs = highRange.length > 0 ? highRange.reduce((a, b) => a + b, 0) / highRange.length / 255 : 0;
    
    return {
      targetBass: Math.min(rawBass * audioSensitivity.bassMultiplier, 1.5),
      targetMids: Math.min(rawMids * audioSensitivity.midsMultiplier, 1.5),
      targetHighs: Math.min(rawHighs * audioSensitivity.highsMultiplier, 1.5),
    };
  }, [audioData.frequency, audioSensitivity.bassMultiplier, audioSensitivity.midsMultiplier, audioSensitivity.highsMultiplier]);
  
  // Expose target values for JSX usage (smoothing happens inside useFrame)
  const bass = targetBass;
  const mids = targetMids;
  const highs = targetHighs;
  
  // Animation speed from store
  const animSpeed = audioSensitivity.animationSpeed;

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
    
    // Single-element when elementCount is 1
    const isSingleElement = params.elementCount === 1;
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

  // Track animation time for animation styles
  const animTimeRef = useRef(0);

  // Animation frame - AUDIO-FIRST: no motion when audio is silent
  // Uses REF PATTERN to avoid stale closures - all audio data read from refs each frame
  useFrame((_, delta) => {
    // Update animation time
    animTimeRef.current += delta;
    const time = animTimeRef.current;
    
    // READ FRESH DATA FROM REFS (not stale closure values)
    const currentAudioData = audioDataRef.current;
    const sens = audioSensitivityRef.current;
    const freq = currentAudioData.frequency || [];
    
    // COMPUTE AUDIO VALUES FRESH EACH FRAME
    const bassRange = freq.slice(0, Math.floor(freq.length * 0.2));
    const midRange = freq.slice(Math.floor(freq.length * 0.2), Math.floor(freq.length * 0.6));
    const highRange = freq.slice(Math.floor(freq.length * 0.6));
    
    const rawBass = bassRange.length > 0 ? bassRange.reduce((a, b) => a + b, 0) / bassRange.length / 255 : 0;
    const rawMids = midRange.length > 0 ? midRange.reduce((a, b) => a + b, 0) / midRange.length / 255 : 0;
    const rawHighs = highRange.length > 0 ? highRange.reduce((a, b) => a + b, 0) / highRange.length / 255 : 0;
    
    // Apply multipliers for target values
    const targetBass = Math.min(rawBass * sens.bassMultiplier, 1.5);
    const targetMids = Math.min(rawMids * sens.midsMultiplier, 1.5);
    const targetHighs = Math.min(rawHighs * sens.highsMultiplier, 1.5);
    
    // Detected values (without multipliers) for hasAudio check
    const detectedBass = rawBass;
    const detectedMids = rawMids;
    const detectedHighs = rawHighs;
    
    // Per-frame smoothing with asymmetric lerp (fast attack, fast decay for 170+ BPM)
    const attackLerp = 0.85;  // Near-instant attack
    const decayLerp = 0.50;   // Fast decay
    const lerpAudio = (current: number, target: number) => {
      const factor = target > current ? attackLerp : decayLerp;
      return current + (target - current) * factor;
    };
    
    smoothedBassRef.current = lerpAudio(smoothedBassRef.current, targetBass);
    smoothedMidsRef.current = lerpAudio(smoothedMidsRef.current, targetMids);
    smoothedHighsRef.current = lerpAudio(smoothedHighsRef.current, targetHighs);
    smoothedBeatRef.current = lerpAudio(smoothedBeatRef.current, currentAudioData.beatStrength);
    
    // Transient blend: 60% raw audio for immediate punch
    const bassEffect = smoothedBassRef.current * 0.4 + targetBass * 0.6;
    const midsEffect = smoothedMidsRef.current * 0.4 + targetMids * 0.6;
    const highsEffect = smoothedHighsRef.current * 0.4 + targetHighs * 0.6;
    const beat = smoothedBeatRef.current;
    
    // Audio threshold - use DETECTED values (not multiplied) so hasAudio works correctly
    const audioThreshold = 0.02;
    const hasAudio = detectedBass > audioThreshold || detectedMids > audioThreshold || detectedHighs > audioThreshold;
    
    // Get animation style behavior
    const animBehavior = getAnimationBehavior(params.animationStyle, bassEffect, midsEffect, highsEffect, time);
    
    // Beat pop effect - lower threshold for snappier response
    const beatPop = beat > 0.2 ? 1 + (beat - 0.2) * 0.8 : 1;
    
    if (groupRef.current) {
      const spinSpeed = sens.spinSpeed ?? 0;
      
      // Scale: BASE + TIGHTLY CLAMPED reactivity (multipliers control effect intensity, not base size)
      const baseScale = 1.0;
      // Each boost is clamped independently so high multipliers can't overflow
      const bassScaleBoost = Math.min(detectedBass * sens.bassMultiplier * 0.12, 0.22);
      const midsScaleBoost = Math.min(detectedMids * sens.midsMultiplier * 0.06, 0.1);
      // Apply animation style scale multiplier
      const styleScale = animBehavior.scaleMultiplier;
      // Final scale has a hard cap to prevent going off-screen
      const finalGroupScale = Math.min((baseScale + bassScaleBoost + midsScaleBoost) * styleScale, 1.5);
      groupRef.current.scale.setScalar(finalGroupScale * beatPop);
      
      // ONLY rotate when audio is playing AND spinSpeed is enabled
      if (spinSpeed > 0.1 && hasAudio) {
        // Base spin from slider + audio amplification + animation style boost
        const styleRotBoost = animBehavior.rotationBoost;
        groupRef.current.rotation.y += spinSpeed * 0.05 + styleRotBoost;
        groupRef.current.rotation.y += bassEffect * 0.08 * (spinSpeed / 2);
        groupRef.current.rotation.x += midsEffect * 0.03 * (spinSpeed / 2);
      }
      // NO rotation when music is paused or spinSpeed <= 0.1
      
      // Position stays centered (no drift)
      groupRef.current.position.set(0, 0, 0);
    }

    // Check if we're using a single-element shape (elementCount is 1)
    const isSingleElementShape = params.elementCount === 1;

    // Animate individual meshes - AUDIO-FIRST with animation style effects
    meshRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      
      const config = meshConfigs[i];
      if (!config) return;
      
      const freqIndex = Math.floor((i / meshRefs.current.length) * (freq.length || 1));
      const freqValue = (freq[freqIndex] || 0) / 255;
      
      // Base scale from config
      const baseScale = config.scale || 0.3;
      
      const spinSpeed = sens.spinSpeed ?? 0;
      
      // Single-element shapes get audio-reactive animations
      if (isSingleElementShape) {
        // Reactivity controlled by multipliers
        const bassReactivity = Math.min(bassEffect * 0.6, 1.0);
        const midsReactivity = Math.min(midsEffect * 0.3, 0.5);
        const intensity = 1 + bassReactivity + midsReactivity;
        
        // Apply animation style scale multiplier
        const styleScale = animBehavior.scaleMultiplier;
        
        // Scale reacts to audio (returns to base when silent)
        mesh.scale.setScalar(baseScale * intensity * beatPop * styleScale);
        
        // Rotation ONLY if spinSpeed is enabled
        if (spinSpeed > 0.1 && hasAudio) {
          const styleRotBoost = animBehavior.rotationBoost;
          mesh.rotation.x += (bassEffect * 0.1 + styleRotBoost) * (spinSpeed / 2);
          mesh.rotation.y += (midsEffect * 0.15 + styleRotBoost) * (spinSpeed / 2);
          mesh.rotation.z += (highsEffect * 0.06) * (spinSpeed / 2);
        }
        return;
      }
      
      // Multi-element: position with animation style jitter and explosion effect
      const jitter = animBehavior.positionJitter;
      const explosion = animBehavior.explosionFactor;
      
      // Calculate explosion direction (away from center)
      const explosionDir = new THREE.Vector3(...config.position).normalize();
      const explosionOffset = explosionDir.multiplyScalar(explosion * 2);
      
      mesh.position.set(
        config.position[0] + (jitter > 0 ? (Math.random() - 0.5) * jitter : 0) + explosionOffset.x,
        config.position[1] + (jitter > 0 ? (Math.random() - 0.5) * jitter : 0) + explosionOffset.y,
        config.position[2] + (jitter > 0 ? (Math.random() - 0.5) * jitter : 0) + explosionOffset.z
      );
      
      // Apply animation style scale
      const freqReactivity = Math.min(freqValue * 0.5, 0.6);
      const styleScale = animBehavior.scaleMultiplier;
      mesh.scale.setScalar(baseScale * (1 + freqReactivity) * beatPop * styleScale);
      
      // Rotation ONLY if spinSpeed is enabled
      if (spinSpeed > 0.1 && hasAudio) {
        const styleRotBoost = animBehavior.rotationBoost;
        mesh.rotation.y += (midsEffect * 0.04 + styleRotBoost * 0.5) * (spinSpeed / 2);
        mesh.rotation.x += (bassEffect * 0.03 + styleRotBoost * 0.5) * (spinSpeed / 2);
      }
    });

    // Animate particles - only rotate when audio present
    if (particlesRef.current) {
      const material = particlesRef.current.material as THREE.PointsMaterial;
      material.opacity = 0.3 + bassEffect * 0.5 + highsEffect * 0.2;
      
      if (hasAudio) {
        particlesRef.current.rotation.y += bassEffect * 0.03;
        particlesRef.current.rotation.x += midsEffect * 0.015;
      }
    }
    
    // Animate connection lines - opacity reacts to audio
    if (linesRef.current && linePositions) {
      const material = linesRef.current.material as THREE.LineBasicMaterial;
      material.opacity = 0.3 + bassEffect * 0.5;
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

  // Determine effective background effect (store overrides if not 'none')
  const effectiveBackgroundEffect = storeBackgroundEffect !== 'none' ? storeBackgroundEffect : params.backgroundEffect;

  // Use standalone procedural shape if we have a standalone variant
  if (params.standaloneVariant) {
    return (
      <>
        {/* Background effects layer */}
        <BackgroundEffects 
          effect={effectiveBackgroundEffect} 
          colors={colors} 
          bass={bass}
          mids={mids}
          highs={highs}
          isPlaying={isPlaying}
          seed={params.seed}
        />
        
        <StandaloneShape 
          variant={params.standaloneVariant}
          audioData={audioData}
          seed={params.seed}
          audioSensitivity={audioSensitivity}
        />
      </>
    );
  }

  return (
    <>
      {/* Background effects layer */}
      <BackgroundEffects 
        effect={effectiveBackgroundEffect} 
        colors={colors} 
        bass={bass}
        mids={mids}
        highs={highs}
        isPlaying={isPlaying}
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
            material={createStyledMaterial(config.colorIndex, config.wireframe, bass * 0.4)}
          >
            {getGeometry(config.geometry)}
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
        <pointLight position={[5, 5, 5]} intensity={1 + bass * 0.5} color={textureData.colors.primary} />
        <pointLight position={[-5, -3, 3]} intensity={0.5 + mids * 0.3} color={textureData.colors.accent} />
      </group>
    </>
  );
}

export default RandomVisualizerTemplate;
