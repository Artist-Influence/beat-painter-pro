import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Sparkles } from '@react-three/drei';
import type { StandaloneVariant, GeometryType, CompositionStyle } from '@/lib/randomVisualizerGenerator';
import { seededRandom } from '@/lib/randomVisualizerGenerator';
import { useVisualizerTexture } from '@/hooks/useVisualizerTexture';

interface ComposedVisualizerRendererProps {
  variant: StandaloneVariant;
  audioData: {
    frequency: number[];
    amplitude: number;
    beatStrength: number;
  };
  seed: number;
  audioSensitivity: {
    bassMultiplier: number;
    midsMultiplier: number;
    highsMultiplier: number;
    animationSpeed: number;
    spinSpeed: number;
  };
}

// Audio analysis with true EQ separation
function analyzeAudioEQ(frequency: number[]) {
  const freq = frequency || [];
  if (freq.length === 0) {
    return { bass: 0, mids: 0, highs: 0 };
  }
  
  // True frequency bin separation (assuming 44.1kHz sample rate, 256 bins)
  const bassRange = freq.slice(0, 8);      // 0-350Hz: sub-bass, kick
  const lowMidRange = freq.slice(8, 24);   // 350-1000Hz: punch, body
  const midRange = freq.slice(24, 60);     // 1000-2500Hz: vocals, snare
  const highMidRange = freq.slice(60, 100); // 2500-4400Hz: presence
  const highRange = freq.slice(100);        // 4400Hz+: air, cymbals
  
  // Peak detection for bass (maximum punch)
  const bass = bassRange.length > 0 ? Math.max(0, ...bassRange) / 255 : 0;
  const mids = midRange.length > 0 ? Math.max(0, ...midRange) / 255 : 0;
  const highs = highRange.length > 0 ? highRange.reduce((a, b) => a + b, 0) / highRange.length / 255 : 0;
  
  return {
    bass: Math.min(bass * 2.5, 2.0),
    mids: Math.min(mids * 2.0, 1.5),
    highs: Math.min(highs * 2.0, 1.5),
  };
}

// Get geometry component for a given type
function getGeometry(type: GeometryType, detail: number = 2) {
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

// Individual orbiting shard with its own frequency bin
function OrbitingShard({
  index,
  totalCount,
  baseRadius,
  audioData,
  seed,
  primaryColor,
  accentColor,
  geometry,
  audioSensitivity,
}: {
  index: number;
  totalCount: number;
  baseRadius: number;
  audioData: { frequency: number[]; amplitude: number; beatStrength: number };
  seed: number;
  primaryColor: THREE.Color;
  accentColor: THREE.Color;
  geometry: GeometryType;
  audioSensitivity: {
    bassMultiplier: number;
    midsMultiplier: number;
  };
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const orbitAngleRef = useRef((index / totalCount) * Math.PI * 2);
  const phaseOffset = (index / totalCount) * Math.PI * 2;
  
  // Ref pattern to fix stale closure in useFrame
  const audioDataRef = useRef(audioData);
  audioDataRef.current = audioData;
  const audioSensitivityRef = useRef(audioSensitivity);
  audioSensitivityRef.current = audioSensitivity;
  
  // Each shard responds to its own frequency bin
  const freqBin = useMemo(() => Math.floor((index / totalCount) * 64), [index, totalCount]);
  
  // Orbit direction alternates
  const orbitDirection = index % 2 === 0 ? 1 : -1;
  
  // Speed variation per shard
  const speedMultiplier = 0.6 + (index / totalCount) * 0.8;
  
  const r = useMemo(() => seededRandom(seed + index), [seed, index]);
  const shardScale = 0.15 + r() * 0.15;
  const yOffset = (r() - 0.5) * 2;
  
  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    
    const time = clock.getElapsedTime();
    const freq = audioDataRef.current.frequency || [];
    const sensitivity = audioSensitivityRef.current;
    
    // Get this shard's specific frequency
    const myFreq = Math.min((freq[freqBin] || 0) / 255, 1.0);
    const bass = Math.min((freq[2] || 0) / 255 * sensitivity.bassMultiplier, 1.5);
    
    // Check for audio
    const hasAudio = myFreq > 0.02 || bass > 0.02;
    
    // Update orbit angle based on audio
    if (hasAudio) {
      orbitAngleRef.current += (bass * 0.08 + myFreq * 0.12) * orbitDirection * speedMultiplier;
    }
    
    // Calculate position
    const radiusMultiplier = 1 + myFreq * 0.8 + bass * 0.4;
    const currentRadius = baseRadius * radiusMultiplier;
    
    // Phase-shifted vertical wave
    const yWave = Math.sin(time * 2.5 + phaseOffset) * myFreq * 0.4;
    
    meshRef.current.position.x = Math.cos(orbitAngleRef.current) * currentRadius;
    meshRef.current.position.y = yOffset + yWave + bass * 0.3;
    meshRef.current.position.z = Math.sin(orbitAngleRef.current) * currentRadius;
    
    // Scale reacts to frequency
    const scaleBoost = Math.min(myFreq * 0.4 + bass * 0.2, 0.6);
    meshRef.current.scale.setScalar(shardScale * (1 + scaleBoost));
    
    // Rotation
    if (hasAudio) {
      meshRef.current.rotation.x += myFreq * 0.15 * orbitDirection;
      meshRef.current.rotation.y += bass * 0.1;
    }
    
    // Update material emissive
    const mat = meshRef.current.material as THREE.MeshStandardMaterial;
    if (mat.emissiveIntensity !== undefined) {
      mat.emissiveIntensity = 0.3 + myFreq * 1.5 + bass * 0.8;
    }
  });
  
  return (
    <mesh ref={meshRef}>
      {getGeometry(geometry, 1)}
      <meshStandardMaterial
        color={index % 3 === 0 ? accentColor : primaryColor}
        emissive={index % 3 === 0 ? accentColor : primaryColor}
        emissiveIntensity={0.5}
        metalness={0.7}
        roughness={0.3}
      />
    </mesh>
  );
}

// Sacred geometry pattern component
function SacredGeometryPattern({
  pattern,
  fold,
  audioData,
  color,
  accentColor,
  seed,
}: {
  pattern: StandaloneVariant['sacredPattern'];
  fold: number;
  audioData: { frequency: number[]; amplitude: number; beatStrength: number };
  color: THREE.Color;
  accentColor: THREE.Color;
  seed: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const ringRefs = useRef<THREE.Mesh[]>([]);
  
  // Ref pattern to fix stale closure in useFrame
  const audioDataRef = useRef(audioData);
  audioDataRef.current = audioData;
  
  const ringCount = fold;
  
  useFrame(() => {
    if (!groupRef.current) return;
    
    const freq = audioDataRef.current.frequency || [];
    const bass = Math.min((freq[2] || 0) / 255, 1.0);
    const mids = Math.min((freq[30] || 0) / 255, 1.0);
    const hasAudio = bass > 0.02 || mids > 0.02;
    
    // Rotate the whole pattern
    if (hasAudio) {
      groupRef.current.rotation.z += mids * 0.02;
    }
    
    // Animate individual rings
    ringRefs.current.forEach((ring, i) => {
      if (!ring) return;
      const phase = (i / ringCount) * Math.PI * 2;
      const ringBass = bass * (1 + Math.sin(phase) * 0.5);
      
      // Scale pulse
      ring.scale.setScalar(1 + ringBass * 0.3);
      
      // Counter-rotate alternating rings
      if (hasAudio) {
        ring.rotation.z += mids * 0.03 * (i % 2 === 0 ? 1 : -1);
      }
    });
  });
  
  if (pattern === 'none') return null;
  
  return (
    <group ref={groupRef}>
      {Array.from({ length: ringCount }).map((_, i) => {
        const angle = (i / ringCount) * Math.PI * 2;
        const radius = 2.5;
        return (
          <mesh
            key={i}
            ref={(el) => { if (el) ringRefs.current[i] = el; }}
            position={[
              Math.cos(angle) * radius * 0.5,
              Math.sin(angle) * radius * 0.5,
              0,
            ]}
            rotation={[0, 0, angle]}
          >
            <torusGeometry args={[0.8, 0.02, 8, 32]} />
            <meshBasicMaterial
              color={i % 2 === 0 ? color : accentColor}
              transparent
              opacity={0.4}
            />
          </mesh>
        );
      })}
      {/* Central pattern */}
      {pattern === 'flower' && (
        <>
          {Array.from({ length: 6 }).map((_, i) => (
            <mesh
              key={`petal-${i}`}
              position={[
                Math.cos((i / 6) * Math.PI * 2) * 0.8,
                Math.sin((i / 6) * Math.PI * 2) * 0.8,
                0,
              ]}
            >
              <circleGeometry args={[0.5, 32]} />
              <meshBasicMaterial color={accentColor} transparent opacity={0.2} />
            </mesh>
          ))}
        </>
      )}
    </group>
  );
}

// Main composed visualizer renderer
export function ComposedVisualizerRenderer({
  variant,
  audioData,
  seed,
  audioSensitivity,
}: ComposedVisualizerRendererProps) {
  const groupRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const innerCoreRef = useRef<THREE.Mesh>(null);
  
  // Ref pattern to fix stale closure in useFrame
  const audioDataRef = useRef(audioData);
  audioDataRef.current = audioData;
  const audioSensitivityRef = useRef(audioSensitivity);
  audioSensitivityRef.current = audioSensitivity;
  
  // Audio smoothing refs
  const smoothedBassRef = useRef(0);
  const smoothedMidsRef = useRef(0);
  const smoothedHighsRef = useRef(0);
  
  const textureData = useVisualizerTexture();
  
  const primaryColor = useMemo(() => new THREE.Color(textureData.colors.primary), [textureData.colors.primary]);
  const secondaryColor = useMemo(() => new THREE.Color(textureData.colors.secondary), [textureData.colors.secondary]);
  const accentColor = useMemo(() => new THREE.Color(textureData.colors.accent), [textureData.colors.accent]);
  
  // Create materials
  const coreMaterial = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      color: primaryColor,
      emissive: primaryColor,
      emissiveIntensity: variant.emissiveIntensity,
      metalness: textureData.colors.isMetallic ? 0.9 : 0.7,
      roughness: textureData.colors.isMetallic ? 0.1 : 0.3,
      wireframe: variant.wireframeMix === 1,
    });
    
    if (textureData.texture) {
      mat.map = textureData.texture;
      mat.emissiveMap = textureData.texture;
      mat.needsUpdate = true;
    }
    
    return mat;
  }, [primaryColor, textureData, variant]);
  
  const innerCoreMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: accentColor,
      emissive: accentColor,
      emissiveIntensity: variant.emissiveIntensity * 1.5,
      metalness: 0.8,
      roughness: 0.2,
    });
  }, [accentColor, variant.emissiveIntensity]);
  
  // Animation
  useFrame(() => {
    const sensitivity = audioSensitivityRef.current;
    const currentAudioData = audioDataRef.current;
    const audio = analyzeAudioEQ(currentAudioData.frequency);
    
    // Asymmetric smoothing
    const attackLerp = 0.85;
    const decayLerp = 0.5;
    const lerpAudio = (current: number, target: number) => {
      const factor = target > current ? attackLerp : decayLerp;
      return current + (target - current) * factor;
    };
    
    smoothedBassRef.current = lerpAudio(smoothedBassRef.current, audio.bass * sensitivity.bassMultiplier);
    smoothedMidsRef.current = lerpAudio(smoothedMidsRef.current, audio.mids * sensitivity.midsMultiplier);
    smoothedHighsRef.current = lerpAudio(smoothedHighsRef.current, audio.highs * sensitivity.highsMultiplier);
    
    const bass = smoothedBassRef.current;
    const mids = smoothedMidsRef.current;
    const highs = smoothedHighsRef.current;
    const hasAudio = bass > 0.02 || mids > 0.02;
    
    const beatPop = currentAudioData.beatStrength > 0.15 ? 1 + (currentAudioData.beatStrength - 0.15) * 0.8 : 1;
    
    // Animate main group
    if (groupRef.current) {
      const baseScale = 1.6;
      const scaleBoost = Math.min(bass * 0.35 + mids * 0.15, 0.6);
      groupRef.current.scale.setScalar((baseScale + scaleBoost) * beatPop);
      
      groupRef.current.position.y = bass * 0.25;
      
      if (sensitivity.spinSpeed > 0.1 && hasAudio) {
        groupRef.current.rotation.y += sensitivity.spinSpeed * 0.04;
        groupRef.current.rotation.y += bass * 0.15;
        groupRef.current.rotation.x += mids * 0.05;
      }
    }
    
    // Animate core
    if (coreRef.current) {
      const coreScale = 1 + bass * 0.25;
      coreRef.current.scale.set(
        variant.stretchX * coreScale,
        variant.stretchY * coreScale,
        variant.stretchZ * coreScale
      );
      
      if (hasAudio) {
        coreRef.current.rotation.x += bass * 0.08;
        coreRef.current.rotation.y += mids * 0.06;
      }
      
      // Update emissive based on audio
      const mat = coreRef.current.material as THREE.MeshStandardMaterial;
      if (mat.emissiveIntensity !== undefined) {
        mat.emissiveIntensity = variant.emissiveIntensity + bass * 2.0 + currentAudioData.beatStrength * 1.5;
        mat.roughness = Math.max(0.1, 0.3 - mids * 0.2);
      }
    }
    
    // Animate inner core (counter-rotation for visual interest)
    if (innerCoreRef.current && variant.hasInnerCore) {
      if (hasAudio) {
        innerCoreRef.current.rotation.x -= mids * 0.12;
        innerCoreRef.current.rotation.y -= bass * 0.08;
      }
      
      const innerScale = variant.innerCoreScale * (1 + mids * 0.3);
      innerCoreRef.current.scale.setScalar(innerScale);
      
      const mat = innerCoreRef.current.material as THREE.MeshStandardMaterial;
      if (mat.emissiveIntensity !== undefined) {
        mat.emissiveIntensity = variant.emissiveIntensity * 1.5 + highs * 2.0;
      }
    }
  });
  
  // Calculate sparkle intensity based on composition
  const sparkleCount = useMemo(() => {
    if (variant.outerHaloType === 'sparkles') {
      return Math.round(30 + variant.complexity * 15);
    }
    if (variant.outerHaloType === 'particles') {
      return Math.round(50 + variant.complexity * 20);
    }
    return 0;
  }, [variant.outerHaloType, variant.complexity]);
  
  return (
    <group ref={groupRef}>
      {/* Core shape */}
      <mesh ref={coreRef}>
        {getGeometry(variant.primaryGeometry, variant.detailLevel)}
        <primitive object={coreMaterial} attach="material" />
      </mesh>
      
      {/* Wireframe overlay for layered style */}
      {variant.wireframeMix === 0.5 && (
        <mesh scale={[variant.stretchX * 1.02, variant.stretchY * 1.02, variant.stretchZ * 1.02]}>
          {getGeometry(variant.primaryGeometry, variant.detailLevel)}
          <meshBasicMaterial color={accentColor} wireframe transparent opacity={0.4} />
        </mesh>
      )}
      
      {/* Inner core */}
      {variant.hasInnerCore && (
        <mesh ref={innerCoreRef} scale={variant.innerCoreScale}>
          {getGeometry(variant.innerCoreType, 2)}
          <primitive object={innerCoreMaterial} attach="material" />
        </mesh>
      )}
      
      {/* Concentric layers */}
      {variant.layerCount > 1 && Array.from({ length: variant.layerCount - 1 }).map((_, i) => {
        const layerScale = 1 - (i + 1) * variant.layerSpacing;
        if (layerScale <= 0.1) return null;
        return (
          <mesh
            key={`layer-${i}`}
            scale={[
              variant.stretchX * layerScale,
              variant.stretchY * layerScale,
              variant.stretchZ * layerScale,
            ]}
          >
            {getGeometry(i % 2 === 0 ? variant.primaryGeometry : variant.secondaryGeometry, variant.detailLevel)}
            <meshStandardMaterial
              color={secondaryColor}
              emissive={accentColor}
              emissiveIntensity={variant.emissiveIntensity * 0.5}
              metalness={0.8}
              roughness={0.2}
              transparent
              opacity={0.5}
            />
          </mesh>
        );
      })}
      
      {/* Outer shell */}
      {variant.hasOuterShell && (
        <mesh scale={[variant.stretchX * 1.4, variant.stretchY * 1.4, variant.stretchZ * 1.4]}>
          {getGeometry(variant.primaryGeometry, 1)}
          <meshBasicMaterial
            color={primaryColor}
            wireframe
            transparent
            opacity={variant.outerShellOpacity}
          />
        </mesh>
      )}
      
      {/* Orbiting shards */}
      {variant.compositionStyle !== 'simple' && Array.from({ length: variant.orbitalShardCount }).map((_, i) => (
        <OrbitingShard
          key={`shard-${i}`}
          index={i}
          totalCount={variant.orbitalShardCount}
          baseRadius={2.2}
          audioData={audioData}
          seed={seed + i * 100}
          primaryColor={primaryColor}
          accentColor={accentColor}
          geometry={i % 3 === 0 ? variant.secondaryGeometry : 'octahedron'}
          audioSensitivity={audioSensitivity}
        />
      ))}
      
      {/* Sacred geometry overlay */}
      {variant.compositionStyle === 'sacred' && (
        <SacredGeometryPattern
          pattern={variant.sacredPattern}
          fold={variant.symmetryFold}
          audioData={audioData}
          color={secondaryColor}
          accentColor={accentColor}
          seed={seed}
        />
      )}
      
      {/* Sparkles/particles halo */}
      {sparkleCount > 0 && (
        <Sparkles
          count={sparkleCount}
          scale={4 + variant.complexity * 0.3}
          size={2 + variant.complexity * 0.2}
          speed={0.4}
          color={accentColor}
        />
      )}
      
      {/* Orbit rings */}
      {variant.hasOrbitRings && Array.from({ length: variant.orbitRingCount }).map((_, i) => {
        const ringRadius = 1.6 + i * 0.5;
        const tiltAngle = variant.orbitRingTilt + i * 0.4;
        return (
          <mesh
            key={`ring-${i}`}
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
      
      {/* Dynamic lighting */}
      <ambientLight intensity={0.4} />
      <pointLight position={[4, 4, 4]} intensity={1.2} color={primaryColor} />
      <pointLight position={[-3, -2, 2]} intensity={0.6} color={accentColor} />
    </group>
  );
}

export default ComposedVisualizerRenderer;
