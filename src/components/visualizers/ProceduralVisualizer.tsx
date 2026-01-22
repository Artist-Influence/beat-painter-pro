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
import { updateMotionState, createMotionState } from '@/lib/visualizerFactory/motionGenerator';
import { useStudioStore } from '@/stores/studioStore';
import { SHAPE_COMPONENTS } from './shapes';

interface ProceduralVisualizerProps {
  config: VisualizerConfig;
  audioData: AudioData;
  isPlaying?: boolean;
}

export function ProceduralVisualizer({ config, audioData, isPlaying = true }: ProceduralVisualizerProps) {
  const groupRef = useRef<THREE.Group>(null);
  const audioDataRef = useRef(audioData);
  const timeRef = useRef(0);
  const bandsRef = useRef({ bass: 0, mids: 0, highs: 0, rawBass: 0, rawMids: 0, rawHighs: 0 });
  const audioSensitivity = useStudioStore((s) => s.audioSensitivity);
  
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
    timeRef.current = time;
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
    
    // Store for shape components
    bandsRef.current = {
      bass: punchyBass,
      mids: effectiveMids,
      highs: effectiveHighs,
      rawBass: bands.rawBass,
      rawMids: bands.rawMids,
      rawHighs: bands.rawHighs,
    };
    
    // Update motion state
    updateMotionState(motionState, config.motion, config.motionParams, delta, effectiveMids);
    
    // Apply audio profile effects
    const sensitivity = audioSensitivity.animationSpeed * config.audioParams.globalSensitivity;
    const bassEffect = punchyBass * config.audioParams.bassMultiplier * sensitivity;
    
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
    groupRef.current.rotation.y = motionState.groupRotation.y + audioSensitivity.spinSpeed * time * 0.5;
    groupRef.current.rotation.z = motionState.groupRotation.z;
    groupRef.current.position.copy(motionState.groupPosition);
  });
  
  // Get the shape component for this family
  const ShapeComponent = SHAPE_COMPONENTS[config.shape];
  
  return (
    <group ref={groupRef}>
      <ShapeComponent
        config={config}
        layoutPoints={layoutPoints}
        audioData={bandsRef.current}
        time={timeRef.current}
        motionState={motionState}
        audioSensitivity={audioSensitivity.animationSpeed}
      />
      <ambientLight intensity={0.5} />
      <pointLight position={[5, 5, 5]} intensity={1} />
      <pointLight position={[-3, -3, 3]} intensity={0.5} />
    </group>
  );
}

export default ProceduralVisualizer;
