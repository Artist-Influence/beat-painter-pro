/**
 * Deterministic PRNG System
 * Uses Mulberry32 algorithm for fast, reproducible random number generation.
 * ALL randomness in the visualizer factory MUST come from this module.
 */

// Mulberry32 PRNG - fast, deterministic, excellent distribution
export function mulberry32(seed: number): () => number {
  return function(): number {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/**
 * RNG Interface - all random operations must use these helpers
 */
export interface RNG {
  /** Get random float in range [min, max) */
  float: (min?: number, max?: number) => number;
  /** Get random integer in range [min, max] inclusive */
  int: (min: number, max: number) => number;
  /** Pick random element from array, optionally weighted */
  pick: <T>(array: T[], weights?: number[]) => T;
  /** Shuffle array in place using Fisher-Yates */
  shuffle: <T>(array: T[]) => T[];
  /** Return true with given probability (default 0.5) */
  bool: (probability?: number) => boolean;
  /** Get multiple unique picks from array */
  pickMultiple: <T>(array: T[], count: number) => T[];
  /** Get the raw random function (for advanced use) */
  raw: () => number;
}

/**
 * Create a deterministic RNG from a seed
 */
export function createRNG(seed: number): RNG {
  // Ensure seed is positive and non-zero
  const safeSeed = Math.abs(seed) || 1;
  const random = mulberry32(safeSeed);
  
  const rng: RNG = {
    raw: random,
    
    float: (min = 0, max = 1) => {
      return min + random() * (max - min);
    },
    
    int: (min, max) => {
      return Math.floor(min + random() * (max - min + 1));
    },
    
    pick: <T>(array: T[], weights?: number[]): T => {
      if (array.length === 0) {
        throw new Error('Cannot pick from empty array');
      }
      
      if (!weights) {
        // Uniform selection
        const index = Math.floor(random() * array.length);
        return array[index];
      }
      
      // Weighted selection
      const totalWeight = weights.reduce((a, b) => a + b, 0);
      let r = random() * totalWeight;
      
      for (let i = 0; i < array.length; i++) {
        r -= weights[i] || 0;
        if (r <= 0) {
          return array[i];
        }
      }
      
      return array[array.length - 1];
    },
    
    shuffle: <T>(array: T[]): T[] => {
      // Fisher-Yates shuffle with seeded random
      const result = [...array];
      for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
      }
      return result;
    },
    
    bool: (probability = 0.5) => {
      return random() < probability;
    },
    
    pickMultiple: <T>(array: T[], count: number): T[] => {
      if (count >= array.length) {
        return rng.shuffle([...array]);
      }
      
      const shuffled = rng.shuffle([...array]);
      return shuffled.slice(0, count);
    },
  };
  
  return rng;
}

/**
 * Generate a high-entropy seed from multiple sources
 * This is the ONLY place where Math.random() is allowed
 */
export function generateHighEntropySeed(): number {
  const random1 = Math.random();
  const random2 = Math.random();
  const time = Date.now();
  const perf = typeof performance !== 'undefined' ? performance.now() : 0;
  
  // XOR mix with bit shifting for better distribution
  const mixed = (
    Math.floor(random1 * 0x7FFFFFFF) ^
    Math.floor(random2 * 0x3FFFFFFF) ^
    (time & 0x7FFFFFFF) ^
    Math.floor(perf * 1000)
  ) >>> 0;
  
  return mixed % 1000000000 || 1; // Ensure non-zero
}

/**
 * Create sub-RNGs from a parent seed for independent randomization
 * Each sub-RNG uses a different salt to ensure independent sequences
 */
export function createSubRNGs(baseSeed: number) {
  return {
    shape: createRNG(baseSeed ^ 0x12345678),
    layout: createRNG(baseSeed ^ 0x23456789),
    motion: createRNG(baseSeed ^ 0x3456789A),
    audio: createRNG(baseSeed ^ 0x456789AB),
    params: createRNG(baseSeed ^ 0x56789ABC),
  };
}
