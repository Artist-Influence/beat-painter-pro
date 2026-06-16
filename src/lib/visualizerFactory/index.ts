/**
 * Main Visualizer Factory
 * Generates complete visualizer configurations from a seed
 */

import { createRNG, createSubRNGs, generateHighEntropySeed, type RNG } from './rng';
import { 
  SHAPE_FAMILIES, 
  LAYOUT_FORMATIONS, 
  MOTION_PATTERNS, 
  AUDIO_PROFILES,
  getShapeConfig,
  getLayoutConfig,
  getMotionConfig,
  getAudioConfig,
  type ShapeFamily,
  type LayoutFormation,
  type MotionPattern,
  type AudioProfile,
} from './modules';
import type { VisualizerConfig, ShapeParams, LayoutParams, MotionParams, AudioParams } from './config';
import { isUniqueEnough, addToHistory, computeSignature, signatureToString } from './signatureSystem';
import { validateConfig } from './validation';

const MAX_GENERATION_ATTEMPTS = 10;

/**
 * Generate shape parameters based on shape family and RNG
 */
function generateShapeParams(shape: ShapeFamily, rng: RNG): ShapeParams {
  const config = getShapeConfig(shape);
  
  // Element count within family's range
  const elementCount = rng.int(config.elementRange[0], config.elementRange[1]);
  
  // Cap for performance in preview (raised from 150 so particle/grid shapes read
  // far denser and more varied; still bounded for production smoothness).
  const cappedElementCount = Math.min(elementCount, 360);

  // Scale variation (wider for more size variety roll-to-roll)
  const scale = rng.float(0.5, 2.0);

  // Wireframe decision (only if supported)
  const useWireframe = config.supportsWireframe && rng.bool(0.35);

  // Detail level (affects geometry segments)
  const segmentDetail = rng.int(12, 56);

  // Noise parameters (wider so forms vary from smooth to gnarled)
  const noiseStrength = rng.float(0.02, 0.6);
  const noiseScale = rng.float(0.4, 3.0);

  // Aspect ratio variation (can stretch noticeably)
  const aspectRatio: [number, number, number] = [
    rng.float(0.65, 1.4),
    rng.float(0.65, 1.4),
    rng.float(0.65, 1.4),
  ];
  
  return {
    elementCount: cappedElementCount,
    scale,
    useWireframe,
    segmentDetail,
    noiseStrength,
    noiseScale,
    aspectRatio,
  };
}

/**
 * Generate layout parameters based on layout formation and RNG
 */
function generateLayoutParams(layout: LayoutFormation, rng: RNG): LayoutParams {
  const config = getLayoutConfig(layout);
  
  const radius = rng.float(config.radiusRange[0], config.radiusRange[1]);
  const spread = rng.float(0.4, 1.9);
  const offsetY = rng.float(-0.7, 0.7);
  const rotationOffset = rng.float(0, Math.PI * 2);
  const density = rng.float(0.2, 1.0);
  
  return {
    radius,
    spread,
    offsetY,
    rotationOffset,
    density,
  };
}

/**
 * Generate motion parameters based on motion pattern and RNG
 */
function generateMotionParams(motion: MotionPattern, rng: RNG): MotionParams {
  const config = getMotionConfig(motion);
  
  const speed = rng.float(config.speedRange[0], config.speedRange[1]);
  const intensity = rng.float(config.intensityRange[0], config.intensityRange[1]);
  const phaseOffset = rng.float(0, Math.PI * 2);
  const secondarySpeed = speed * rng.float(0.3, 0.7);
  const damping = rng.float(0.9, 0.98);
  
  return {
    speed,
    intensity,
    phaseOffset,
    secondarySpeed,
    damping,
  };
}

/**
 * Generate audio parameters based on audio profile and RNG
 */
function generateAudioParams(audioProfile: AudioProfile, rng: RNG): AudioParams {
  const config = getAudioConfig(audioProfile);
  
  // Use profile's intensity ranges with RNG variation
  const bassMultiplier = rng.float(config.bass.intensity[0], config.bass.intensity[1]);
  const midsMultiplier = rng.float(config.mids.intensity[0], config.mids.intensity[1]);
  const highsMultiplier = rng.float(config.highs.intensity[0], config.highs.intensity[1]);
  
  const globalSensitivity = rng.float(0.8, 1.2);
  const smoothingFactor = rng.float(0.2, 0.5);
  const reactivityThreshold = rng.float(0.03, 0.08);
  
  return {
    bassMultiplier,
    midsMultiplier,
    highsMultiplier,
    globalSensitivity,
    smoothingFactor,
    reactivityThreshold,
  };
}

/**
 * Generate a single visualizer configuration (may not pass validation)
 */
function generateConfigFromSeed(seed: number): VisualizerConfig {
  const subRngs = createSubRNGs(seed);
  
  // Select modules using weighted random (equal weights for now)
  const shape = subRngs.shape.pick(SHAPE_FAMILIES.map(s => s.id));
  const layout = subRngs.layout.pick(LAYOUT_FORMATIONS.map(l => l.id));
  const motion = subRngs.motion.pick(MOTION_PATTERNS.map(m => m.id));
  const audioProfile = subRngs.audio.pick(AUDIO_PROFILES.map(a => a.id));
  
  // Generate parameters for each module
  const shapeParams = generateShapeParams(shape, subRngs.params);
  const layoutParams = generateLayoutParams(layout, subRngs.params);
  const motionParams = generateMotionParams(motion, subRngs.params);
  const audioParams = generateAudioParams(audioProfile, subRngs.params);
  
  const config: VisualizerConfig = {
    seed,
    signature: '', // Will be computed
    shape,
    layout,
    motion,
    audioProfile,
    shapeParams,
    layoutParams,
    motionParams,
    audioParams,
    validated: false,
    validationAttempts: 0,
  };
  
  // Compute and set signature
  config.signature = signatureToString(computeSignature(config));
  
  return config;
}

/**
 * Generate a valid, unique visualizer configuration
 * Retries up to MAX_GENERATION_ATTEMPTS times if validation fails or too similar
 */
export function generateVisualizer(baseSeed?: number): VisualizerConfig {
  const seed = baseSeed ?? generateHighEntropySeed();
  let attempts = 0;
  let lastConfig: VisualizerConfig | null = null;
  
  while (attempts < MAX_GENERATION_ATTEMPTS) {
    // Bump seed for each attempt
    const attemptSeed = seed + attempts * 0xDEADBEEF;
    const config = generateConfigFromSeed(attemptSeed);
    config.validationAttempts = attempts + 1;
    lastConfig = config;
    
    // Check uniqueness
    if (!isUniqueEnough(config)) {
      console.log(`[Factory] Attempt ${attempts + 1}: Too similar to recent, retrying...`);
      attempts++;
      continue;
    }
    
    // Run validation
    const { valid, results } = validateConfig(config);
    if (!valid) {
      const failures = Object.entries(results)
        .filter(([_, r]) => !r.passed)
        .map(([name, r]) => `${name}: ${r.reason}`)
        .join(', ');
      console.log(`[Factory] Attempt ${attempts + 1}: Validation failed - ${failures}`);
      attempts++;
      continue;
    }
    
    // Success!
    config.validated = true;
    addToHistory(computeSignature(config));
    
    console.log(`[Factory] Generated: ${config.shape} + ${config.layout} + ${config.motion} + ${config.audioProfile}`);
    
    return config;
  }
  
  // Fallback: return last attempt even if not ideal
  console.warn(`[Factory] Max attempts reached, using last config`);
  if (lastConfig) {
    lastConfig.validated = true;
    addToHistory(computeSignature(lastConfig));
    return lastConfig;
  }
  
  // Ultimate fallback
  return generateConfigFromSeed(seed);
}

/**
 * Generate a new seed
 */
export function generateSeed(): number {
  return generateHighEntropySeed();
}

/**
 * Re-export types for convenience
 */
export type { VisualizerConfig, ShapeParams, LayoutParams, MotionParams, AudioParams } from './config';
export type { ShapeFamily, LayoutFormation, MotionPattern, AudioProfile } from './modules';
export { SHAPE_FAMILIES, LAYOUT_FORMATIONS, MOTION_PATTERNS, AUDIO_PROFILES } from './modules';
export { getShapeConfig, getLayoutConfig, getMotionConfig, getAudioConfig } from './modules';
export { computeSignature, signatureToString, getHistoryStats, clearHistory } from './signatureSystem';
export { validateConfig, getValidationSummary } from './validation';
export { createRNG, type RNG } from './rng';
