import React from 'react';
import type { RandomVisualizerParams } from '@/lib/randomVisualizerGenerator';
import { ProceduralVisualizer } from './ProceduralVisualizer';
import type { VisualizerConfig } from '@/lib/visualizerFactory/config';

interface RandomVisualizerTemplateProps {
  params: RandomVisualizerParams;
  audioData: {
    frequency: number[];
    amplitude: number;
    beatStrength: number;
  };
  isPlaying?: boolean;
}

/**
 * RandomVisualizerTemplate - Legacy adapter
 * Bridges old RandomVisualizerParams to new ProceduralVisualizer
 */
export function RandomVisualizerTemplate({ 
  params, 
  audioData,
  isPlaying = true 
}: RandomVisualizerTemplateProps) {
  // If we have a procedural config, use new system
  if (params.proceduralConfig) {
    return (
      <ProceduralVisualizer 
        config={params.proceduralConfig as VisualizerConfig}
        audioData={audioData}
        isPlaying={isPlaying}
      />
    );
  }
  
  // Legacy fallback for old saved visualizers
  return (
    <group>
      <mesh>
        <sphereGeometry args={[1.5, 32, 32]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.1} />
      </mesh>
      <ambientLight intensity={0.5} />
      <pointLight position={[4, 4, 4]} intensity={1} />
    </group>
  );
}
