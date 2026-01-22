/**
 * ProceduralVisualizer
 * Unified renderer for procedurally generated visualizers
 * Uses neutral white/gray materials suitable for texture overlays
 */

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { VisualizerConfig, AudioData } from '@/lib/visualizerFactory/config';
import { getShapeConfig, getAudioConfig } from '@/lib/visualizerFactory/modules';
import { generateLayoutPositions } from '@/lib/visualizerFactory/layoutGenerator';
import { analyzeFrequencyBands, createAudioSmoother, transientBlend, getIdleAnimation } from '@/lib/visualizerFactory/audioProcessing';
import { updateMotionState, createMotionState, getElementMotionOffset } from '@/lib/visualizerFactory/motionGenerator';
import { useStudioStore } from '@/stores/studioStore';

interface ProceduralVisualizerProps {
  config: VisualizerConfig;
  audioData: AudioData;
  isPlaying?: boolean;
}

// Neutral material for texture overlays
const NEUTRAL_MATERIAL_PROPS = {
  color: '#ffffff',
  emissive: '#ffffff',
  emissiveIntensity: 0.1,
  metalness: 0.0,
  roughness: 0.8,
};

const NEUTRAL_WIREFRAME_PROPS = {
  color: '#cccccc',
  transparent: true,
  opacity: 0.9,
};

export function ProceduralVisualizer({ config, audioData, isPlaying = true }: ProceduralVisualizerProps) {
  const groupRef = useRef<THREE.Group>(null);
  const audioDataRef = useRef(audioData);
  const { audioSensitivity, spinSpeed } = useStudioStore();
  
  // Audio smoother with attack/release from audio profile
  const audioConfig = getAudioConfig(config.audioProfile);
  const smoother = useMemo(() => createAudioSmoother({
    bassAttack: audioConfig.bass.attack,
    bassRelease: audioConfig.bass.release,
    midsAttack: audioConfig.mids.attack,
    midsRelease: audioConfig.mids.release,
    highsAttack: audioConfig.highs.attack,
    highsRelease: audioConfig.highs.release,
  }), [config.audioProfile]);
  
  // Motion state
  const motionState = useMemo(() => createMotionState(config.shapeParams.elementCount), [config]);
  
  // Generate layout positions
  const layoutPoints = useMemo(() => generateLayoutPositions(
    config.layout,
    config.shapeParams.elementCount,
    config.layoutParams,
    config.seed
  ), [config]);
  
  // Shape config for scaling
  const shapeConfig = getShapeConfig(config.shape);
  
  // Keep audioData ref updated
  audioDataRef.current = audioData;
  
  useFrame((state, delta) => {
    if (!groupRef.current) return;
    
    const time = state.clock.elapsedTime;
    const audio = audioDataRef.current;
    
    // Analyze audio
    const rawBands = analyzeFrequencyBands(audio.frequency);
    const bands = smoother.update(rawBands);
    
    // Apply idle animation if no audio
    let effectiveBass = bands.bass;
    let effectiveMids = bands.mids;
    let effectiveHighs = bands.highs;
    
    if (bands.isIdle) {
      const idle = getIdleAnimation(time);
      effectiveBass = idle.bass;
      effectiveMids = idle.mids;
      effectiveHighs = idle.highs;
    }
    
    // Blend raw and smoothed for punch
    const punchyBass = transientBlend(bands.rawBass, effectiveBass, 0.55);
    
    // Update motion state
    updateMotionState(motionState, config.motion, config.motionParams, delta, effectiveMids);
    
    // Apply audio profile effects
    const sensitivity = audioSensitivity * config.audioParams.globalSensitivity;
    const bassEffect = punchyBass * config.audioParams.bassMultiplier * sensitivity;
    const midsEffect = effectiveMids * config.audioParams.midsMultiplier * sensitivity;
    const highsEffect = effectiveHighs * config.audioParams.highsMultiplier * sensitivity;
    
    // Apply to group based on audio profile target
    const baseScale = shapeConfig.defaultScale * config.shapeParams.scale;
    
    switch (audioConfig.bass.target) {
      case 'scale':
        groupRef.current.scale.setScalar(baseScale * (1 + bassEffect * 0.5));
        break;
      case 'expand':
        groupRef.current.scale.setScalar(baseScale * (1 + bassEffect * 0.7));
        break;
      default:
        groupRef.current.scale.setScalar(baseScale * (1 + bassEffect * 0.3));
    }
    
    // Apply motion
    groupRef.current.rotation.x = motionState.groupRotation.x;
    groupRef.current.rotation.y = motionState.groupRotation.y + spinSpeed * time * 0.5;
    groupRef.current.rotation.z = motionState.groupRotation.z;
    groupRef.current.position.copy(motionState.groupPosition);
    
    // Apply mids rotation boost
    if (audioConfig.mids.target === 'rotation') {
      groupRef.current.rotation.y += midsEffect * 0.3;
    }
  });
  
  // Render shape based on family
  const renderShape = () => {
    const { elementCount, useWireframe, segmentDetail, aspectRatio } = config.shapeParams;
    
    // Simple shape rendering - can be extended per family
    switch (config.shape) {
      case 'organic':
        return (
          <mesh scale={aspectRatio}>
            <icosahedronGeometry args={[1, 4]} />
            <meshStandardMaterial {...NEUTRAL_MATERIAL_PROPS} />
          </mesh>
        );
        
      case 'torus_knot':
        return (
          <mesh scale={aspectRatio}>
            <torusKnotGeometry args={[0.8, 0.3, 100, 16]} />
            <meshStandardMaterial {...NEUTRAL_MATERIAL_PROPS} />
          </mesh>
        );
        
      case 'wave_grid':
        return (
          <mesh rotation={[-Math.PI / 2, 0, 0]} scale={aspectRatio}>
            <planeGeometry args={[4, 4, 32, 32]} />
            <meshStandardMaterial {...NEUTRAL_MATERIAL_PROPS} side={THREE.DoubleSide} />
          </mesh>
        );
        
      default:
        // Multi-element shapes use layout positions
        return (
          <group>
            {layoutPoints.map((point, i) => (
              <mesh
                key={i}
                position={point.position}
                rotation={point.rotation}
                scale={point.scale * 0.15}
              >
                {useWireframe ? (
                  <>
                    <icosahedronGeometry args={[1, 1]} />
                    <meshBasicMaterial {...NEUTRAL_WIREFRAME_PROPS} wireframe />
                  </>
                ) : (
                  <>
                    <sphereGeometry args={[1, segmentDetail / 4, segmentDetail / 4]} />
                    <meshStandardMaterial {...NEUTRAL_MATERIAL_PROPS} />
                  </>
                )}
              </mesh>
            ))}
          </group>
        );
    }
  };
  
  return (
    <group ref={groupRef}>
      {renderShape()}
      <ambientLight intensity={0.5} />
      <pointLight position={[5, 5, 5]} intensity={1} />
      <pointLight position={[-3, -3, 3]} intensity={0.5} />
    </group>
  );
}

export default ProceduralVisualizer;
