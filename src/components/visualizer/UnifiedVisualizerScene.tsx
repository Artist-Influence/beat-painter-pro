/**
 * UnifiedVisualizerScene
 * Single source of truth renderer used by both preview and export
 * Ensures identical scene graph generation for consistent output
 */

import React, { useEffect, useRef, Suspense } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { renderGate } from '@/lib/renderReadyGate';
import { ProceduralVisualizer } from '@/components/visualizers/ProceduralVisualizer';
import { OverlayCompositor } from './OverlayCompositor';
import type { VisualizerConfig, AudioData } from '@/lib/visualizerFactory/config';
import type { RandomVisualizerParams } from '@/lib/randomVisualizerGenerator';

interface ColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  isNeon?: boolean;
  isMetallic?: boolean;
}

interface VisualStyle {
  colors?: ColorPalette;
  textureUrl?: string | null;
  blendMode?: 'screen' | 'multiply' | 'overlay' | 'add' | 'normal';
  opacity?: number;
}

interface UnifiedVisualizerSceneProps {
  // Either provide a full VisualizerConfig or RandomVisualizerParams
  config?: VisualizerConfig;
  params?: RandomVisualizerParams;
  
  // Audio data for reactivity
  audioData: AudioData;
  isPlaying?: boolean;
  
  // Visual style overlay
  style?: VisualStyle;
  enableOverlay?: boolean;
  
  // Callbacks
  onRenderReady?: (ready: boolean) => void;
}

/**
 * Frame counter component to track render progress
 */
function RenderReadyTracker({ onReady }: { onReady?: (ready: boolean) => void }) {
  const frameCount = useRef(0);
  const hasSignaledReady = useRef(false);
  
  useEffect(() => {
    // Reset gate on mount
    renderGate.reset();
    frameCount.current = 0;
    hasSignaledReady.current = false;
  }, []);
  
  useFrame(() => {
    frameCount.current++;
    renderGate.incrementFrame();
    
    if (!hasSignaledReady.current && renderGate.isReady) {
      hasSignaledReady.current = true;
      onReady?.(true);
    }
  });
  
  return null;
}

/**
 * Geometry ready signal component
 */
function GeometryReadySignal() {
  useEffect(() => {
    // Signal geometry is loaded after mount
    requestAnimationFrame(() => {
      renderGate.markGeometryReady();
    });
  }, []);
  
  return null;
}

export function UnifiedVisualizerScene({
  config,
  params,
  audioData,
  isPlaying = true,
  style,
  enableOverlay = false,
  onRenderReady,
}: UnifiedVisualizerSceneProps) {
  const groupRef = useRef<THREE.Group>(null);
  
  // Get the actual config - either directly passed or from params
  const visualizerConfig: VisualizerConfig | null = config || params?.proceduralConfig || null;
  
  // Apply global style colors if provided
  useEffect(() => {
    if (style?.colors) {
      (window as any).extractedColors = {
        primary: style.colors.primary,
        secondary: style.colors.secondary,
        accent: style.colors.accent,
        isNeon: style.colors.isNeon || false,
        isMetallic: style.colors.isMetallic || false,
      };
      window.dispatchEvent(new CustomEvent('style:applied'));
    }
  }, [style?.colors]);
  
  // Mark texture loading/ready
  useEffect(() => {
    if (enableOverlay && style?.textureUrl) {
      renderGate.markTextureLoading();
      
      // Load texture and mark ready when done
      const img = new Image();
      img.onload = () => renderGate.markTextureReady();
      img.onerror = () => renderGate.markTextureReady(); // Mark ready even on error
      img.src = style.textureUrl;
    } else {
      renderGate.markTextureReady();
    }
  }, [enableOverlay, style?.textureUrl]);
  
  if (!visualizerConfig) {
    console.warn('UnifiedVisualizerScene: No config or params provided');
    return null;
  }
  
  return (
    <group ref={groupRef}>
      {/* Render ready tracking */}
      <RenderReadyTracker onReady={onRenderReady} />
      
      {/* Main visualizer with geometry ready signal */}
      <Suspense fallback={null}>
        <ProceduralVisualizer
          config={visualizerConfig}
          audioData={audioData}
          isPlaying={isPlaying}
        />
        <GeometryReadySignal />
      </Suspense>
      
      {/* Optional style overlay */}
      {enableOverlay && style?.textureUrl && (
        <OverlayCompositor
          enabled={enableOverlay}
          textureUrl={style.textureUrl}
          blendMode={style.blendMode || 'screen'}
          opacity={style.opacity ?? 0.5}
        />
      )}
      
      {/* Standard lighting */}
      <ambientLight intensity={0.5} />
      <pointLight position={[5, 5, 5]} intensity={1} />
      <pointLight position={[-3, -3, 3]} intensity={0.5} />
    </group>
  );
}

export default UnifiedVisualizerScene;
