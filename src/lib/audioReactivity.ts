import * as THREE from 'three';

export interface AudioValues {
  bass: number;
  mids: number;
  highs: number;
  beat: number;
}

export interface AudioSensitivity {
  bassMultiplier: number;
  midsMultiplier: number;
  highsMultiplier: number;
  animationSpeed: number;
}

/**
 * Asymmetric audio smoothing - fast attack for immediate response, slow decay for smooth falloff
 * This creates punchy but smooth audio-reactive animations
 */
export function smoothAudio(
  current: AudioValues,
  target: AudioValues,
  attackFactor = 0.5,
  decayFactor = 0.1
): AudioValues {
  const lerp = (c: number, t: number) => {
    const factor = t > c ? attackFactor : decayFactor;
    return c + (t - c) * factor;
  };
  return {
    bass: lerp(current.bass, target.bass),
    mids: lerp(current.mids, target.mids),
    highs: lerp(current.highs, target.highs),
    beat: lerp(current.beat, target.beat),
  };
}

/**
 * Calculate raw audio values from frequency data with sensitivity multipliers
 * Values are capped at 1.5 to allow for punchy peaks while preventing overflow
 */
export function calculateAudioValues(
  frequency: number[],
  beatStrength: number,
  sensitivity: AudioSensitivity
): AudioValues {
  let bassSum = 0, midsSum = 0, highsSum = 0;
  
  // Bass: 0-85 (roughly 20-250Hz)
  for (let i = 0; i <= 85; i++) bassSum += frequency[i] || 0;
  // Mids: 86-170 (roughly 250Hz-2kHz)
  for (let i = 86; i <= 170; i++) midsSum += frequency[i] || 0;
  // Highs: 171-255 (roughly 2kHz+)
  for (let i = 171; i <= 255; i++) highsSum += frequency[i] || 0;
  
  const rawBass = (bassSum / 86 / 255) * sensitivity.bassMultiplier;
  const rawMids = (midsSum / 85 / 255) * sensitivity.midsMultiplier;
  const rawHighs = (highsSum / 85 / 255) * sensitivity.highsMultiplier;
  
  return {
    bass: Math.min(rawBass, 1.5),
    mids: Math.min(rawMids, 1.5),
    highs: Math.min(rawHighs, 1.5),
    // Beat combines detected beatStrength with raw bass for responsive kick detection
    beat: Math.max(beatStrength, rawBass * 0.8),
  };
}

/**
 * Audio-first rotation - time provides subtle base motion, audio dominates
 * Returns rotation in radians for x, y, z axes
 */
export function audioRotation(
  time: number, 
  audio: AudioValues, 
  speed: number = 1
): { x: number; y: number; z: number } {
  return {
    // Time is subtle (0.1 multiplier), audio is dominant (Math.PI multipliers)
    x: time * 0.1 * speed + audio.mids * Math.PI * 0.5,
    y: time * 0.15 * speed + audio.bass * Math.PI * 0.4,
    z: audio.highs * Math.PI * 0.3,
  };
}

/**
 * Audio-first scale - base scale with strong beat pop effect
 * Returns a scale multiplier
 */
export function audioScale(
  audio: AudioValues, 
  baseScale: number = 1, 
  beatMultiplier: number = 0.8,
  bassMultiplier: number = 0.4
): number {
  // Beat pop: scale spike when beat crosses threshold
  const beatPop = audio.beat > 0.4 ? 1 + (audio.beat - 0.4) * beatMultiplier : 1;
  // Bass adds continuous breathing
  const bassBreath = 1 + audio.bass * bassMultiplier;
  
  return baseScale * bassBreath * beatPop;
}

/**
 * Create a ref-based audio smoother for use in useFrame
 * Returns an object with refs and an update function
 */
export function createAudioSmoother() {
  return {
    bassRef: { current: 0 },
    midsRef: { current: 0 },
    highsRef: { current: 0 },
    beatRef: { current: 0 },
    
    update(target: AudioValues, attackFactor = 0.5, decayFactor = 0.1): AudioValues {
      const lerp = (ref: { current: number }, t: number) => {
        const factor = t > ref.current ? attackFactor : decayFactor;
        ref.current = ref.current + (t - ref.current) * factor;
        return ref.current;
      };
      
      return {
        bass: lerp(this.bassRef, target.bass),
        mids: lerp(this.midsRef, target.mids),
        highs: lerp(this.highsRef, target.highs),
        beat: lerp(this.beatRef, target.beat),
      };
    },
    
    current(): AudioValues {
      return {
        bass: this.bassRef.current,
        mids: this.midsRef.current,
        highs: this.highsRef.current,
        beat: this.beatRef.current,
      };
    }
  };
}
