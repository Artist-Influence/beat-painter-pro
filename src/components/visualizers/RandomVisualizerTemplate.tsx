import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { RandomVisualizerParams, AnimationStyle, ColorScheme } from '@/lib/randomVisualizerGenerator';
import { seededRandom, COLOR_PALETTES } from '@/lib/randomVisualizerGenerator';
import { useVisualizerTexture } from '@/hooks/useVisualizerTexture';
import { useStudioStore } from '@/stores/studioStore';
import { AbstractFormRenderer } from './AbstractFormRenderer';

interface RandomVisualizerTemplateProps {
  params: RandomVisualizerParams;
  audioData: {
    frequency: number[];
    amplitude: number;
    beatStrength: number;
  };
  isPlaying?: boolean;
}

// Main template component
export function RandomVisualizerTemplate({ 
  params, 
  audioData,
  isPlaying = true 
}: RandomVisualizerTemplateProps) {
  // If we have abstract form params, render the abstract visualizer
  if (params.abstractForm) {
    return (
      <group>
        {/* Abstract form visualizer - pass savedStyle for color fallback */}
        <AbstractFormRenderer 
          params={params.abstractForm}
          audioData={audioData}
          savedStyle={params.savedStyle}
        />
        
        {/* Lighting */}
        <ambientLight intensity={0.4} />
        <pointLight position={[4, 4, 4]} intensity={1.2} />
        <pointLight position={[-3, -2, 2]} intensity={0.6} />
      </group>
    );
  }
  
  // Fallback - should not reach here with new system
  return (
    <group>
      <mesh>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial color="#8866ff" emissive="#4422aa" emissiveIntensity={0.5} />
      </mesh>
      <ambientLight intensity={0.4} />
      <pointLight position={[4, 4, 4]} intensity={1.2} />
    </group>
  );
}
