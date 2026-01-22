/**
 * Random Visualizer Generator
 * Now uses the new VisualizerFactory for procedural generation
 */

import { generateVisualizer, generateSeed, type VisualizerConfig } from './visualizerFactory';

// Legacy types for backwards compatibility
export type BaseShape = 'orb' | 'geometric' | 'ribbons' | 'particles' | 'tunnel' | 'crystal' | 'spiral' | 'lattice' | 'helix' | 'nebula' | 'matrix' | 'membrane' | 'pulsar' | 'vortexCore' | 'cosmicEye';
export type AnimationStyle = 'pulsing' | 'rotating' | 'flowing' | 'chaotic' | 'smooth' | 'breathing' | 'explosive';
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
  mixedGeometry: boolean;
  connectionLines: boolean;
  scaleVariation: number;
  positionSpread: number;
  rotationOffset: number;
  colorScheme: ColorScheme;
  glowIntensity: number;
  abstractForm?: any;
  savedStyle?: any;
  // NEW: Procedural config from factory
  proceduralConfig?: VisualizerConfig;
}

/**
 * Generate a high-entropy seed
 */
export function generateRandomSeed(): number {
  return generateSeed();
}

/**
 * Generate random params using new factory system
 */
export function generateRandomParams(
  seed: number,
  preferences?: Partial<Pick<RandomVisualizerParams, 'baseShape' | 'animationStyle' | 'elementCount' | 'connectionLines' | 'colorScheme' | 'glowIntensity'>>
): RandomVisualizerParams {
  // Generate procedural config from factory
  const proceduralConfig = generateVisualizer(seed);
  
  // Map to legacy format for compatibility
  return {
    seed,
    baseShape: 'orb',
    animationStyle: 'pulsing',
    elementCount: proceduralConfig.shapeParams.elementCount,
    particleCount: 100,
    symmetry: false,
    rotationSpeed: proceduralConfig.motionParams.speed,
    colorShift: 0,
    mixedGeometry: false,
    connectionLines: false,
    scaleVariation: 1,
    positionSpread: proceduralConfig.layoutParams.radius,
    rotationOffset: proceduralConfig.layoutParams.rotationOffset,
    colorScheme: 'mono',
    glowIntensity: 0.1,
    proceduralConfig,
  };
}

/**
 * Generate name from config
 */
export function paramsToName(params: RandomVisualizerParams): string {
  if (params.proceduralConfig) {
    const { shape, layout, motion } = params.proceduralConfig;
    const shapeNames: Record<string, string> = {
      lattice: 'Lattice', organic: 'Organic', particle_sphere: 'Particle Sphere',
      particle_ring: 'Particle Ring', ribbons: 'Ribbons', helix: 'Helix',
      shards: 'Shards', vortex: 'Vortex', torus_knot: 'Torus Knot',
      metaball: 'Metaball', wave_grid: 'Wave Grid', radial_spokes: 'Radial Spokes',
      fractal_tree: 'Fractal Tree', cube_lattice: 'Cube Lattice', kaleidoscope: 'Kaleidoscope',
    };
    return `${shapeNames[shape] || shape} ${params.seed % 1000}`;
  }
  return `Visualizer #${params.seed % 10000}`;
}

/**
 * Generate emoji from config
 */
export function paramsToEmoji(params: RandomVisualizerParams): string {
  if (params.proceduralConfig) {
    const emojiMap: Record<string, string> = {
      lattice: '🔷', organic: '🫧', particle_sphere: '✨', particle_ring: '💫',
      ribbons: '🎀', helix: '🧬', shards: '💎', vortex: '🌀',
      torus_knot: '🔮', metaball: '🟣', wave_grid: '🌊', radial_spokes: '☀️',
      fractal_tree: '🌳', cube_lattice: '🧊', kaleidoscope: '🎭',
    };
    return emojiMap[params.proceduralConfig.shape] || '✨';
  }
  return '✨';
}

// Legacy exports for compatibility
export const BASE_SHAPES: BaseShape[] = ['orb', 'geometric', 'ribbons', 'particles', 'tunnel', 'crystal', 'spiral', 'lattice', 'helix', 'nebula', 'matrix', 'membrane', 'pulsar', 'vortexCore', 'cosmicEye'];
export const ANIMATION_STYLES: AnimationStyle[] = ['pulsing', 'rotating', 'flowing', 'chaotic', 'smooth', 'breathing', 'explosive'];
export const COLOR_SCHEMES: ColorScheme[] = ['mono'];

// Deprecated - no longer used
export const COLOR_PALETTES: Record<ColorScheme, string[]> = {
  mono: ['#ffffff', '#cccccc', '#888888', '#444444'],
  neon: ['#ffffff'], pastel: ['#ffffff'], fire: ['#ffffff'],
  ice: ['#ffffff'], rainbow: ['#ffffff'], sunset: ['#ffffff'], ocean: ['#ffffff'],
};

// Legacy seeded random - use createRNG from factory instead
export function seededRandom(seed: number) {
  let state = Math.abs(seed) || 1;
  return function() {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}
