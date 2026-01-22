/**
 * Validation & Quality Gates
 * Auto-rejects and retries visualizers that don't meet quality standards
 */

import type { VisualizerConfig, ValidationResult } from './config';
import { getShapeConfig } from './modules';

/**
 * Minimum thresholds for reactivity
 */
const REACTIVITY_THRESHOLDS = {
  minBassEffect: 0.15,     // Minimum bass effect intensity
  minMidsEffect: 0.1,      // Minimum mids effect intensity
  minHighsEffect: 0.02,    // Minimum highs effect intensity
};

/**
 * Framing bounds
 */
const FRAMING_BOUNDS = {
  minScale: 0.8,           // Minimum visible scale
  maxScale: 5.0,           // Maximum before clipping
  maxRadius: 5.0,          // Maximum layout radius
};

/**
 * Performance limits
 */
const PERFORMANCE_LIMITS = {
  maxPolygons: 100000,
  maxElements: 500,
};

/**
 * Validate audio reactivity is sufficient
 */
export function validateReactivity(config: VisualizerConfig): ValidationResult {
  const { audioParams, audioProfile } = config;
  
  // Calculate effective reactivity based on audio profile and multipliers
  const bassEffect = audioParams.bassMultiplier * audioParams.globalSensitivity;
  const midsEffect = audioParams.midsMultiplier * audioParams.globalSensitivity;
  const highsEffect = audioParams.highsMultiplier * audioParams.globalSensitivity;
  
  if (bassEffect < REACTIVITY_THRESHOLDS.minBassEffect) {
    return { passed: false, reason: 'Bass reactivity too low', score: bassEffect };
  }
  
  if (midsEffect < REACTIVITY_THRESHOLDS.minMidsEffect) {
    return { passed: false, reason: 'Mids reactivity too low', score: midsEffect };
  }
  
  if (highsEffect < REACTIVITY_THRESHOLDS.minHighsEffect) {
    return { passed: false, reason: 'Highs reactivity too low', score: highsEffect };
  }
  
  return { passed: true, score: (bassEffect + midsEffect + highsEffect) / 3 };
}

/**
 * Validate framing is appropriate (not too small, not clipping)
 */
export function validateFraming(config: VisualizerConfig): ValidationResult {
  const { shapeParams, layoutParams } = config;
  const shapeConfig = getShapeConfig(config.shape);
  
  // Check scale
  const effectiveScale = shapeParams.scale * shapeConfig.defaultScale;
  if (effectiveScale < FRAMING_BOUNDS.minScale) {
    return { passed: false, reason: 'Scale too small', score: effectiveScale };
  }
  if (effectiveScale > FRAMING_BOUNDS.maxScale) {
    return { passed: false, reason: 'Scale too large (clipping)', score: effectiveScale };
  }
  
  // Check radius
  if (layoutParams.radius > FRAMING_BOUNDS.maxRadius) {
    return { passed: false, reason: 'Radius too large', score: layoutParams.radius };
  }
  
  return { passed: true };
}

/**
 * Validate complexity is appropriate
 */
export function validateComplexity(config: VisualizerConfig): ValidationResult {
  const { shapeParams, shape } = config;
  const shapeConfig = getShapeConfig(shape);
  
  // For multi-element shapes, ensure sufficient elements
  if (shapeConfig.elementRange[1] > 10 && shapeParams.elementCount < 10) {
    return { 
      passed: false, 
      reason: 'Too few elements for this shape type',
      score: shapeParams.elementCount 
    };
  }
  
  return { passed: true };
}

/**
 * Validate performance is within limits
 */
export function validatePerformance(config: VisualizerConfig): ValidationResult {
  const { shapeParams, shape } = config;
  const shapeConfig = getShapeConfig(shape);
  
  // Estimate polygon count
  const basePolys = shapeConfig.polyBudget;
  const detailMultiplier = shapeParams.segmentDetail / 32;
  const estimatedPolys = basePolys * detailMultiplier * (shapeParams.elementCount / 50);
  
  if (estimatedPolys > PERFORMANCE_LIMITS.maxPolygons) {
    return { 
      passed: false, 
      reason: 'Too many polygons',
      score: estimatedPolys 
    };
  }
  
  if (shapeParams.elementCount > PERFORMANCE_LIMITS.maxElements) {
    return { 
      passed: false, 
      reason: 'Too many elements',
      score: shapeParams.elementCount 
    };
  }
  
  return { passed: true };
}

/**
 * Run all validations
 */
export function validateConfig(config: VisualizerConfig): {
  valid: boolean;
  results: Record<string, ValidationResult>;
} {
  const results = {
    reactivity: validateReactivity(config),
    framing: validateFraming(config),
    complexity: validateComplexity(config),
    performance: validatePerformance(config),
  };
  
  const valid = Object.values(results).every(r => r.passed);
  
  return { valid, results };
}

/**
 * Get a validation summary string
 */
export function getValidationSummary(config: VisualizerConfig): string {
  const { valid, results } = validateConfig(config);
  
  if (valid) {
    return 'All validations passed';
  }
  
  const failures = Object.entries(results)
    .filter(([_, r]) => !r.passed)
    .map(([name, r]) => `${name}: ${r.reason}`)
    .join(', ');
  
  return `Failed: ${failures}`;
}
