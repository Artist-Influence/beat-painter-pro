// Seeded random number generator for reproducible results
export function seededRandom(seed: number) {
  let state = seed;
  return function() {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

import { AbstractFormParams, generateAbstractFormParams, ABSTRACT_FORM_FAMILIES, FORM_FAMILY_NAMES, FORM_FAMILY_EMOJIS, abstractFormToName, abstractFormToEmoji } from './abstractFormGenerator';

export type BaseShape = 'orb' | 'geometric' | 'ribbons' | 'particles' | 'tunnel' | 'crystal' | 'spiral' | 'lattice' | 'helix' | 'nebula' | 'matrix' | 'membrane' | 'pulsar' | 'vortexCore' | 'cosmicEye';
export type AnimationStyle = 'pulsing' | 'rotating' | 'flowing' | 'chaotic' | 'smooth' | 'breathing' | 'explosive';
export type BackgroundEffect = 'none' | 'stars' | 'movingLines' | 'energyField' | 'particles' | 'lightRays' | 'aurora';
export type ColorScheme = 'mono' | 'neon' | 'pastel' | 'fire' | 'ice' | 'rainbow' | 'sunset' | 'ocean';

export interface RandomVisualizerParams {
  seed: number;
  baseShape: BaseShape;
  animationStyle: AnimationStyle;
  elementCount: number;
  particleCount: number;
  symmetry: boolean;
  rotationSpeed: number;
  colorShift: number;
  backgroundEffect: BackgroundEffect;
  mixedGeometry: boolean;
  connectionLines: boolean;
  // Variance parameters for unique generations
  scaleVariation: number;
  positionSpread: number;
  rotationOffset: number;
  // Color scheme for the visualizer
  colorScheme: ColorScheme;
  // Glow intensity (0.0 - 2.0)
  glowIntensity: number;
  // NEW: Abstract form params (replaces old standalone/creative templates)
  abstractForm?: AbstractFormParams;
  // Style snapshot at save time (for persisting visual styles with saved visualizers)
  savedStyle?: {
    colors: {
      primary: string;
      secondary: string;
      accent: string;
      isNeon: boolean;
      isMetallic: boolean;
    };
  };
}

export const BASE_SHAPES: BaseShape[] = ['orb', 'geometric', 'ribbons', 'particles', 'tunnel', 'crystal', 'spiral', 'lattice', 'helix', 'nebula', 'matrix', 'membrane', 'pulsar', 'vortexCore', 'cosmicEye'];
export const ANIMATION_STYLES: AnimationStyle[] = ['pulsing', 'rotating', 'flowing', 'chaotic', 'smooth', 'breathing', 'explosive'];
export const BACKGROUND_EFFECTS: BackgroundEffect[] = ['none', 'stars', 'movingLines', 'energyField', 'particles', 'lightRays', 'aurora'];
export const COLOR_SCHEMES: ColorScheme[] = ['mono', 'neon', 'pastel', 'fire', 'ice', 'rainbow', 'sunset', 'ocean'];

export function generateRandomSeed(): number {
  return Math.floor(Math.random() * 1000000);
}

export function generateRandomParams(
  seed: number,
  preferences?: Partial<Pick<RandomVisualizerParams, 'baseShape' | 'animationStyle' | 'backgroundEffect' | 'elementCount' | 'connectionLines' | 'colorScheme' | 'glowIntensity' | 'abstractForm'>>
): RandomVisualizerParams {
  const random = seededRandom(seed);
  
  const baseShape = preferences?.baseShape || BASE_SHAPES[Math.floor(random() * BASE_SHAPES.length)];
  const animationStyle = preferences?.animationStyle || ANIMATION_STYLES[Math.floor(random() * ANIMATION_STYLES.length)];
  const colorScheme = preferences?.colorScheme || COLOR_SCHEMES[Math.floor(random() * COLOR_SCHEMES.length)];
  
  // Element count from preference or default to 1 (abstract forms are single elements)
  const elementCount = preferences?.elementCount ?? 1;
  
  // Background effect
  const backgroundEffect = preferences?.backgroundEffect ?? 
    BACKGROUND_EFFECTS[Math.floor(random() * BACKGROUND_EFFECTS.length)];
  
  // Abstract form - use provided or generate new one
  const abstractForm = preferences?.abstractForm ?? generateAbstractFormParams(seed);
  
  // Glow intensity: 0.3 - 2.0 (default random or from preferences)
  const glowIntensity = preferences?.glowIntensity ?? (0.3 + random() * 1.7);
  
  return {
    seed,
    baseShape,
    animationStyle,
    backgroundEffect,
    elementCount,
    particleCount: Math.floor(100 + random() * 300),
    symmetry: random() > 0.5,
    rotationSpeed: 0.1 + random() * 1.2,
    colorShift: random() * Math.PI * 2,
    mixedGeometry: false,
    connectionLines: preferences?.connectionLines ?? false,
    scaleVariation: 0.5 + random() * 1.0,
    positionSpread: 2 + random() * 4,
    rotationOffset: random() * Math.PI * 2,
    colorScheme,
    glowIntensity,
    abstractForm,
  };
}

// Generate name from abstract form
export function paramsToName(params: RandomVisualizerParams): string {
  if (params.abstractForm) {
    return abstractFormToName(params.abstractForm);
  }
  
  // Fallback for legacy params
  const random = seededRandom(params.seed + 999);
  const uniqueNum = params.seed % 10000;
  return `Visualizer #${uniqueNum}`;
}

// Generate emoji from abstract form
export function paramsToEmoji(params: RandomVisualizerParams): string {
  if (params.abstractForm) {
    return abstractFormToEmoji(params.abstractForm);
  }
  
  // Fallback
  return '✨';
}

// Color palettes for visualizers
export const COLOR_PALETTES: Record<ColorScheme, string[]> = {
  mono: ['#ffffff', '#cccccc', '#888888', '#444444'],
  neon: ['#ff00ff', '#00ffff', '#ffff00', '#ff0088'],
  pastel: ['#ffb3ba', '#bae1ff', '#baffc9', '#ffffba'],
  fire: ['#ff4500', '#ff6600', '#ff9900', '#ffcc00'],
  ice: ['#00bfff', '#87ceeb', '#e0ffff', '#ffffff'],
  rainbow: ['#ff0000', '#ff7f00', '#ffff00', '#00ff00', '#0000ff', '#8b00ff'],
  sunset: ['#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3'],
  ocean: ['#0077be', '#00a8cc', '#00d4aa', '#71c9ce'],
};
