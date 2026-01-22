/**
 * Audio Processing Utilities for Procedural Visualizers
 * Extracts bass/mids/highs from frequency data with proper smoothing
 */

import type { AudioData, AudioBands } from './config';

/**
 * Analyze frequency data into bands
 */
export function analyzeFrequencyBands(frequency: number[]): AudioBands {
  if (!frequency || frequency.length === 0) {
    return {
      bass: 0,
      mids: 0,
      highs: 0,
      rawBass: 0,
      rawMids: 0,
      rawHighs: 0,
      rms: 0,
      isIdle: true,
    };
  }
  
  const len = frequency.length;
  
  // Frequency bin ranges (assuming 128-256 bins at 44.1kHz)
  // Bass: 20-120Hz (bins 0-3)
  // Mids: 120-2000Hz (bins 4-50)
  // Highs: 2000-10000Hz (bins 51+)
  
  const bassEnd = Math.min(4, len);
  const midsEnd = Math.min(50, len);
  
  // Calculate raw values
  let bassSum = 0;
  let midsSum = 0;
  let highsSum = 0;
  let totalSum = 0;
  
  for (let i = 0; i < len; i++) {
    const val = frequency[i] / 255;
    totalSum += val * val;
    
    if (i < bassEnd) {
      bassSum += val;
    } else if (i < midsEnd) {
      midsSum += val;
    } else {
      highsSum += val;
    }
  }
  
  // Normalize
  const rawBass = Math.min(1, bassSum / bassEnd);
  const rawMids = Math.min(1, midsSum / (midsEnd - bassEnd));
  const rawHighs = len > midsEnd ? Math.min(1, highsSum / (len - midsEnd)) : 0;
  const rms = Math.sqrt(totalSum / len);
  
  // Detect idle state
  const isIdle = rms < 0.02;
  
  return {
    bass: rawBass,
    mids: rawMids,
    highs: rawHighs,
    rawBass,
    rawMids,
    rawHighs,
    rms,
    isIdle,
  };
}

/**
 * Asymmetric smoothing with attack/release
 */
export function smoothValue(
  current: number, 
  target: number, 
  attack: number, 
  release: number
): number {
  if (target > current) {
    // Attack: fast rise
    return current + (target - current) * attack;
  } else {
    // Release: slow decay
    return current + (target - current) * release;
  }
}

/**
 * Create a stateful audio smoother for use in useFrame
 */
export function createAudioSmoother(config: {
  bassAttack?: number;
  bassRelease?: number;
  midsAttack?: number;
  midsRelease?: number;
  highsAttack?: number;
  highsRelease?: number;
}) {
  const {
    bassAttack = 0.9,
    bassRelease = 0.3,
    midsAttack = 0.7,
    midsRelease = 0.4,
    highsAttack = 0.95,
    highsRelease = 0.5,
  } = config;
  
  let smoothedBass = 0;
  let smoothedMids = 0;
  let smoothedHighs = 0;
  
  return {
    update(bands: AudioBands): AudioBands {
      smoothedBass = smoothValue(smoothedBass, bands.rawBass, bassAttack, bassRelease);
      smoothedMids = smoothValue(smoothedMids, bands.rawMids, midsAttack, midsRelease);
      smoothedHighs = smoothValue(smoothedHighs, bands.rawHighs, highsAttack, highsRelease);
      
      return {
        ...bands,
        bass: smoothedBass,
        mids: smoothedMids,
        highs: smoothedHighs,
      };
    },
    
    reset() {
      smoothedBass = 0;
      smoothedMids = 0;
      smoothedHighs = 0;
    },
    
    current(): { bass: number; mids: number; highs: number } {
      return {
        bass: smoothedBass,
        mids: smoothedMids,
        highs: smoothedHighs,
      };
    },
  };
}

/**
 * Transient blend: mix raw and smoothed for punchy but stable response
 */
export function transientBlend(
  raw: number, 
  smoothed: number, 
  rawWeight: number = 0.55
): number {
  return raw * rawWeight + smoothed * (1 - rawWeight);
}

/**
 * Apply idle animation when no audio
 */
export function getIdleAnimation(time: number): { bass: number; mids: number; highs: number } {
  const slowPulse = Math.sin(time * 0.5) * 0.5 + 0.5;
  const medPulse = Math.sin(time * 0.8 + 1) * 0.5 + 0.5;
  const fastPulse = Math.sin(time * 1.2 + 2) * 0.5 + 0.5;
  
  return {
    bass: slowPulse * 0.15,
    mids: medPulse * 0.1,
    highs: fastPulse * 0.05,
  };
}
