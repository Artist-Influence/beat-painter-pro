/**
 * Visualizer Configuration Types
 * Complete specification for a procedurally generated visualizer
 */

import type { ShapeFamily, LayoutFormation, MotionPattern, AudioProfile } from './modules';

/**
 * Complete configuration for a procedural visualizer
 */
export interface VisualizerConfig {
  // Identity
  seed: number;
  signature: string;
  
  // Module selections
  shape: ShapeFamily;
  layout: LayoutFormation;
  motion: MotionPattern;
  audioProfile: AudioProfile;
  
  // Shape parameters
  shapeParams: ShapeParams;
  
  // Layout parameters
  layoutParams: LayoutParams;
  
  // Motion parameters
  motionParams: MotionParams;
  
  // Audio reactivity parameters
  audioParams: AudioParams;
  
  // Validation status
  validated: boolean;
  validationAttempts: number;
}

export interface ShapeParams {
  elementCount: number;
  scale: number;
  useWireframe: boolean;
  segmentDetail: number;      // Geometry detail level
  noiseStrength: number;      // Vertex noise intensity
  noiseScale: number;         // Noise frequency
  aspectRatio: [number, number, number]; // Non-uniform scaling
}

export interface LayoutParams {
  radius: number;
  spread: number;             // How spread out elements are
  offsetY: number;            // Vertical offset
  rotationOffset: number;     // Initial rotation offset
  density: number;            // How tightly packed (0-1)
}

export interface MotionParams {
  speed: number;
  intensity: number;
  phaseOffset: number;        // Phase offset for animations
  secondarySpeed: number;     // Secondary motion speed
  damping: number;            // Motion damping factor
}

export interface AudioParams {
  bassMultiplier: number;
  midsMultiplier: number;
  highsMultiplier: number;
  globalSensitivity: number;  // Overall audio sensitivity
  smoothingFactor: number;    // Audio smoothing
  reactivityThreshold: number; // Min audio level to react
}

/**
 * Signature for anti-duplicate tracking
 */
export interface VisualizerSignature {
  shape: ShapeFamily;
  layout: LayoutFormation;
  motion: MotionPattern;
  audioProfile: AudioProfile;
  elementBucket: 'low' | 'mid' | 'high';
  noiseBucket: 'none' | 'subtle' | 'heavy';
}

/**
 * Audio analysis data passed to visualizers
 */
export interface AudioData {
  frequency: number[];
  amplitude: number;
  beatStrength: number;
}

/**
 * Processed audio bands for reactive effects
 */
export interface AudioBands {
  bass: number;      // 0-1, smoothed
  mids: number;      // 0-1, smoothed
  highs: number;     // 0-1, smoothed
  rawBass: number;   // 0-1, unsmoothed (for transients)
  rawMids: number;
  rawHighs: number;
  rms: number;       // Overall RMS amplitude
  isIdle: boolean;   // True if no significant audio
}

/**
 * Validation result for quality gates
 */
export interface ValidationResult {
  passed: boolean;
  reason?: string;
  score?: number;
}

/**
 * Default/fallback configuration values
 */
export const DEFAULT_CONFIG: Partial<VisualizerConfig> = {
  validated: false,
  validationAttempts: 0,
  shapeParams: {
    elementCount: 50,
    scale: 2.0,
    useWireframe: false,
    segmentDetail: 32,
    noiseStrength: 0.1,
    noiseScale: 1.0,
    aspectRatio: [1, 1, 1],
  },
  layoutParams: {
    radius: 2.5,
    spread: 1.0,
    offsetY: 0,
    rotationOffset: 0,
    density: 0.5,
  },
  motionParams: {
    speed: 0.5,
    intensity: 0.5,
    phaseOffset: 0,
    secondarySpeed: 0.3,
    damping: 0.95,
  },
  audioParams: {
    bassMultiplier: 1.0,
    midsMultiplier: 1.0,
    highsMultiplier: 1.0,
    globalSensitivity: 1.0,
    smoothingFactor: 0.3,
    reactivityThreshold: 0.05,
  },
};
