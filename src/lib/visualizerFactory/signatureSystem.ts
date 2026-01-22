/**
 * Signature & Anti-Duplicate System
 * Tracks last 50 visualizers to prevent repetition
 */

import type { VisualizerConfig, VisualizerSignature } from './config';

const HISTORY_KEY = 'visualizer_signature_history';
const MAX_HISTORY = 50;

/**
 * Compute a signature from a visualizer config
 */
export function computeSignature(config: VisualizerConfig): VisualizerSignature {
  // Bucket element count
  let elementBucket: 'low' | 'mid' | 'high' = 'mid';
  if (config.shapeParams.elementCount < 30) {
    elementBucket = 'low';
  } else if (config.shapeParams.elementCount > 100) {
    elementBucket = 'high';
  }
  
  // Bucket noise strength
  let noiseBucket: 'none' | 'subtle' | 'heavy' = 'subtle';
  if (config.shapeParams.noiseStrength < 0.05) {
    noiseBucket = 'none';
  } else if (config.shapeParams.noiseStrength > 0.25) {
    noiseBucket = 'heavy';
  }
  
  return {
    shape: config.shape,
    layout: config.layout,
    motion: config.motion,
    audioProfile: config.audioProfile,
    elementBucket,
    noiseBucket,
  };
}

/**
 * Convert signature to string for storage/comparison
 */
export function signatureToString(sig: VisualizerSignature): string {
  return `${sig.shape}|${sig.layout}|${sig.motion}|${sig.audioProfile}|${sig.elementBucket}|${sig.noiseBucket}`;
}

/**
 * Check if two signatures are "too similar"
 * Too similar = same shape+layout OR same motion+audioProfile OR 3+ matching modules
 */
export function isTooSimilar(a: VisualizerSignature, b: VisualizerSignature): boolean {
  let matches = 0;
  
  if (a.shape === b.shape) matches++;
  if (a.layout === b.layout) matches++;
  if (a.motion === b.motion) matches++;
  if (a.audioProfile === b.audioProfile) matches++;
  
  // Critical combinations that feel like duplicates
  const sameShapeLayout = a.shape === b.shape && a.layout === b.layout;
  const sameMotionAudio = a.motion === b.motion && a.audioProfile === b.audioProfile;
  
  return sameShapeLayout || sameMotionAudio || matches >= 3;
}

/**
 * Get signature history from localStorage
 */
export function getSignatureHistory(): VisualizerSignature[] {
  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as VisualizerSignature[];
  } catch {
    return [];
  }
}

/**
 * Add a signature to history
 */
export function addToHistory(signature: VisualizerSignature): void {
  try {
    const history = getSignatureHistory();
    history.unshift(signature);
    
    // Keep only last MAX_HISTORY
    const trimmed = history.slice(0, MAX_HISTORY);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Check if a config is unique enough compared to recent history
 */
export function isUniqueEnough(config: VisualizerConfig): boolean {
  const signature = computeSignature(config);
  const history = getSignatureHistory();
  
  // Check against all history
  for (const past of history) {
    if (isTooSimilar(signature, past)) {
      return false;
    }
  }
  
  return true;
}

/**
 * Clear signature history (for testing/reset)
 */
export function clearHistory(): void {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch {
    // Ignore
  }
}

/**
 * Get statistics about history diversity
 */
export function getHistoryStats(): {
  total: number;
  uniqueShapes: number;
  uniqueLayouts: number;
  uniqueMotions: number;
  uniqueAudioProfiles: number;
} {
  const history = getSignatureHistory();
  
  return {
    total: history.length,
    uniqueShapes: new Set(history.map(h => h.shape)).size,
    uniqueLayouts: new Set(history.map(h => h.layout)).size,
    uniqueMotions: new Set(history.map(h => h.motion)).size,
    uniqueAudioProfiles: new Set(history.map(h => h.audioProfile)).size,
  };
}
