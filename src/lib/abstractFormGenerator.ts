// Abstract Form Generator - Purely abstract, generative, non-representational visualizers
// NO literal objects (cars, faces, etc.) - only geometric/organic/energy abstractions

import { seededRandom } from './randomVisualizerGenerator';

// ==================== ABSTRACT FORM TYPES ====================

export type AbstractFormFamily = 
  | 'lattice'        // Wireframe structures, polyhedra, fractal meshes
  | 'organic'        // Blobs, membranes, morphing surfaces  
  | 'energy'         // Particle storms, force lines, plasma arcs
  | 'topology'       // Audio-driven structure changes
  | 'symmetry'       // Controlled chaos, non-repeating patterns
  | 'ribbon'         // Flowing ribbons, waves, streams
  | 'crystalline'    // Shards, clusters, growing crystals
  | 'vortex';        // Spiral fields, tornado patterns

export type BassTopologyMode = 'expand' | 'fracture' | 'ripple' | 'morph' | 'explode' | 'warp';
export type MidsTopologyMode = 'subdivide' | 'oscillate' | 'wave' | 'twist' | 'fold' | 'pulse';
export type HighsTopologyMode = 'jitter' | 'sparkle' | 'dissolve' | 'edge-glow' | 'flicker' | 'shimmer';

export type NoiseType = 'perlin' | 'simplex' | 'curl' | 'worley' | 'fbm';

export const ABSTRACT_FORM_FAMILIES: AbstractFormFamily[] = [
  'lattice', 'organic', 'energy', 'topology', 'symmetry', 'ribbon', 'crystalline', 'vortex'
];

export const BASS_TOPOLOGY_MODES: BassTopologyMode[] = ['expand', 'fracture', 'ripple', 'morph', 'explode', 'warp'];
export const MIDS_TOPOLOGY_MODES: MidsTopologyMode[] = ['subdivide', 'oscillate', 'wave', 'twist', 'fold', 'pulse'];
export const HIGHS_TOPOLOGY_MODES: HighsTopologyMode[] = ['jitter', 'sparkle', 'dissolve', 'edge-glow', 'flicker', 'shimmer'];
export const NOISE_TYPES: NoiseType[] = ['perlin', 'simplex', 'curl', 'worley', 'fbm'];

// ==================== ABSTRACT FORM PARAMETERS ====================

export interface AbstractFormParams {
  // Form family determines base generation approach
  formFamily: AbstractFormFamily;
  
  // Multiple independent seeds for true uniqueness (5 seeds)
  geometrySeed: number;      // Base structure
  arrangementSeed: number;   // Spatial layout
  motionSeed: number;        // Animation patterns
  noiseSeed: number;         // Noise functions
  mappingSeed: number;       // Audio curve mapping
  
  // Geometry generation params
  nodeCount: number;         // 20-200 nodes
  connectionDensity: number; // 0-1 how connected
  organicness: number;       // 0=geometric, 1=organic blob
  fragmentationLevel: number;// 0-1 how fractured/split
  
  // Topology mutation modes (must have all 3 for multi-band)
  bassTopologyMode: BassTopologyMode;
  midsTopologyMode: MidsTopologyMode;
  highsTopologyMode: HighsTopologyMode;
  
  // Noise configuration
  noiseType: NoiseType;
  noiseScale: number;        // 0.5-5.0
  noiseSpeed: number;        // 0.1-2.0
  noiseAmplitude: number;    // 0.1-1.5
  
  // Motion complexity
  motionLayers: number;      // 1-5 overlapping motion patterns
  asymmetryFactor: number;   // 0-1 how much symmetry breaking
  chaosLevel: number;        // 0-1 controlled randomness
  rotationAxes: [boolean, boolean, boolean];
  rotationSpeeds: [number, number, number];
  
  // Visual style
  wireframeProbability: number;  // 0-1
  emissiveMin: number;           // 0.2-0.8
  emissiveMax: number;           // 0.8-2.0
  colorVariance: number;         // 0-1
  layerCount: number;            // 1-5 concentric layers
  
  // Form-specific parameters
  latticeSpacing: number;        // For lattice forms
  organicBlobCount: number;      // For organic forms
  energyParticleCount: number;   // For energy forms
  spiralArmCount: number;        // For vortex forms
  ribbonCount: number;           // For ribbon forms
  crystalShardCount: number;     // For crystalline forms
  symmetryFold: number;          // 3, 4, 5, 6, 8, 12 for symmetry forms
  
  // Audio reactivity curves (controls how audio maps to effect)
  bassReactivityCurve: 'linear' | 'exponential' | 'logarithmic' | 'stepped';
  midsReactivityCurve: 'linear' | 'exponential' | 'logarithmic' | 'stepped';
  highsReactivityCurve: 'linear' | 'exponential' | 'logarithmic' | 'stepped';
  
  // Intensity multipliers
  bassIntensity: number;     // 0.5-3.0
  midsIntensity: number;     // 0.5-3.0
  highsIntensity: number;    // 0.5-3.0
}

// ==================== SEED HASHING ====================

function hashSeed(baseSeed: number, salt: string): number {
  let hash = baseSeed;
  for (let i = 0; i < salt.length; i++) {
    hash = ((hash << 5) - hash) + salt.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

// ==================== ROUND-ROBIN FORM FAMILY SELECTION ====================
// Guarantees all 8 form families are shown before any repeats

let familyQueue: AbstractFormFamily[] = [];

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function getNextFormFamily(): AbstractFormFamily {
  // If queue empty, shuffle all families
  if (familyQueue.length === 0) {
    familyQueue = shuffleArray(ABSTRACT_FORM_FAMILIES);
    console.log('🎰 NEW QUEUE:', familyQueue.join(' → '));
  }
  const next = familyQueue.pop()!;
  console.log(`🎲 PICKED: ${next.toUpperCase()} (${familyQueue.length} left)`);
  return next;
}

// ==================== ABSTRACT FORM GENERATOR ====================

export function generateAbstractFormParams(
  baseSeed: number,
  preferences?: Partial<Pick<AbstractFormParams, 'formFamily' | 'chaosLevel' | 'nodeCount'>>
): AbstractFormParams {
  // Use performance.now() for microsecond resolution + multiple random sources
  const perfEntropy = Math.floor((typeof performance !== 'undefined' ? performance.now() : Date.now()) * 10000) % 100000000;
  const randomEntropy = Math.floor(Math.random() * 100000000);
  const secondRandom = Math.floor(Math.random() * 10000000);
  const thirdRandom = Math.floor(Math.random() * 10000000);
  const timeEntropy = Date.now() % 1000000;
  
  // XOR all entropy sources for maximum uniqueness per generation
  // CRITICAL: Use >>> 0 to ensure positive, then ensure non-zero with || 1
  const enhancedSeed = (((baseSeed ^ perfEntropy ^ randomEntropy ^ secondRandom ^ thirdRandom ^ timeEntropy) >>> 0) % 2147483647) || 1;
  
  // Generate INDEPENDENT seeds - ENSURE ALL ARE POSITIVE AND NON-ZERO
  // Use Math.abs and modulo to guarantee valid seeds for seededRandom
  const seeds = {
    geometry: (Math.abs((enhancedSeed * 31337) ^ Math.floor(Math.random() * 1000000)) % 2147483647) || 1,
    arrangement: (Math.abs((enhancedSeed * 73856093) ^ Math.floor(Math.random() * 1000000)) % 2147483647) || 1,
    motion: (Math.abs((enhancedSeed * 19349663) ^ Math.floor(Math.random() * 1000000)) % 2147483647) || 1,
    noise: (Math.abs((enhancedSeed * 83492791) ^ Math.floor(Math.random() * 1000000)) % 2147483647) || 1,
    mapping: (Math.abs((enhancedSeed * 45678901) ^ Math.floor(Math.random() * 1000000)) % 2147483647) || 1,
  };
  
  // Create TRULY INDEPENDENT random functions for each decision category
  // Use different XOR salts to break deterministic patterns
  const rFamily = seededRandom((enhancedSeed ^ 0xDEADBEEF) >>> 0 || 1);
  const rTopology = seededRandom((seeds.geometry ^ 0xCAFEBABE) >>> 0 || 1);
  const rGeo = seededRandom(seeds.geometry);
  const rMotion = seededRandom(seeds.motion);
  const rNoise = seededRandom(seeds.noise);
  const rMapping = seededRandom(seeds.mapping);
  const rVisual = seededRandom((seeds.arrangement ^ 0xFEEDFACE) >>> 0 || 1);
  
  // ALWAYS use round-robin for form family - never allow preferences to override
  // This guarantees all 8 families are shown before any repeats
  const formFamily = getNextFormFamily();
  
  // Chaos level with wider range (0.1 to 0.9) - use visual random
  const chaosLevel = preferences?.chaosLevel ?? (0.1 + rVisual() * 0.8);
  
  // Node count based on form family with more variation
  let baseNodeCount = preferences?.nodeCount ?? Math.floor(25 + rGeo() * 150);
  if (formFamily === 'lattice') baseNodeCount = Math.floor(35 + rGeo() * 120);
  if (formFamily === 'organic') baseNodeCount = Math.floor(15 + rGeo() * 50);
  if (formFamily === 'energy') baseNodeCount = Math.floor(80 + rGeo() * 250);
  if (formFamily === 'crystalline') baseNodeCount = Math.floor(10 + rGeo() * 40);
  if (formFamily === 'vortex') baseNodeCount = Math.floor(3 + Math.floor(rGeo() * 6)); // spiral arms
  if (formFamily === 'ribbon') baseNodeCount = Math.floor(5 + Math.floor(rGeo() * 15));
  if (formFamily === 'symmetry') baseNodeCount = [3, 4, 5, 6, 8, 12][Math.floor(rGeo() * 6)];
  
  // PERFORMANCE CAP: Limit node count to 50 for smooth preview
  baseNodeCount = Math.min(baseNodeCount, 50);
  
  // Topology modes - use DEDICATED topology random (not geometry random) for variety
  const bassTopologyMode = BASS_TOPOLOGY_MODES[Math.floor(rTopology() * BASS_TOPOLOGY_MODES.length)];
  const midsTopologyMode = MIDS_TOPOLOGY_MODES[Math.floor(rTopology() * MIDS_TOPOLOGY_MODES.length)];
  const highsTopologyMode = HIGHS_TOPOLOGY_MODES[Math.floor(rTopology() * HIGHS_TOPOLOGY_MODES.length)];
  
  // Noise configuration with more variety
  const noiseType = NOISE_TYPES[Math.floor(rNoise() * NOISE_TYPES.length)];
  
  // Motion configuration - ensure at least one axis rotates
  const rotationAxes: [boolean, boolean, boolean] = [
    rMotion() > 0.25,
    rMotion() > 0.35,
    rMotion() > 0.45,
  ];
  if (!rotationAxes[0] && !rotationAxes[1] && !rotationAxes[2]) {
    rotationAxes[Math.floor(rMotion() * 3)] = true;
  }
  
  // Reactivity curves
  const curves: Array<'linear' | 'exponential' | 'logarithmic' | 'stepped'> = 
    ['linear', 'exponential', 'logarithmic', 'stepped'];
  
  // Symmetry fold for symmetry forms
  const symmetryFolds = [3, 4, 5, 6, 8, 12];
  
  return {
    formFamily,
    
    // Seeds - use independent enhanced seeds
    geometrySeed: seeds.geometry,
    arrangementSeed: seeds.arrangement,
    motionSeed: seeds.motion,
    noiseSeed: seeds.noise,
    mappingSeed: seeds.mapping,
    
    // Geometry with wider ranges
    nodeCount: baseNodeCount,
    connectionDensity: 0.05 + rGeo() * 0.8,
    organicness: formFamily === 'organic' ? (0.5 + rGeo() * 0.5) : (rGeo() * 0.5),
    fragmentationLevel: chaosLevel * (0.2 + rGeo() * 0.6),
    
    // Topology modes (all 3 required for multi-band)
    bassTopologyMode,
    midsTopologyMode,
    highsTopologyMode,
    
    // Noise with wider ranges
    noiseType,
    noiseScale: 0.3 + rNoise() * 5.0,
    noiseSpeed: 0.05 + rNoise() * 2.5,
    noiseAmplitude: 0.05 + rNoise() * 1.8,
    
    // Motion with more variation
    motionLayers: Math.floor(1 + rMotion() * 5),
    asymmetryFactor: chaosLevel * (0.1 + rMotion() * 0.7),
    chaosLevel,
    rotationAxes,
    rotationSpeeds: [
      0.15 + rMotion() * 1.6,
      0.15 + rMotion() * 1.6,
      0.15 + rMotion() * 1.6,
    ],
    
    // Visual with more variety
    wireframeProbability: rGeo() > 0.65 ? (rGeo() > 0.5 ? 1 : 0.5) : 0,
    emissiveMin: 0.15 + rGeo() * 0.7,
    emissiveMax: 0.7 + rGeo() * 1.5,
    colorVariance: 0.15 + rGeo() * 0.7,
    layerCount: Math.floor(1 + rGeo() * 5),
    
    // Form-specific with wider ranges
    latticeSpacing: 0.2 + rGeo() * 0.9,
    organicBlobCount: Math.floor(2 + rGeo() * 10),
    energyParticleCount: Math.floor(150 + rGeo() * 500),
    spiralArmCount: Math.floor(2 + rGeo() * 8),
    ribbonCount: Math.floor(3 + rGeo() * 15),
    crystalShardCount: Math.floor(6 + rGeo() * 30),
    symmetryFold: symmetryFolds[Math.floor(rGeo() * symmetryFolds.length)],
    
    // Audio mapping with varied intensities
    bassReactivityCurve: curves[Math.floor(rMapping() * curves.length)],
    midsReactivityCurve: curves[Math.floor(rMapping() * curves.length)],
    highsReactivityCurve: curves[Math.floor(rMapping() * curves.length)],
    bassIntensity: 0.4 + rMapping() * 2.8,
    midsIntensity: 0.4 + rMapping() * 2.8,
    highsIntensity: 0.4 + rMapping() * 2.8,
  };
}

// ==================== FORM FAMILY NAMES & EMOJIS ====================

export const FORM_FAMILY_NAMES: Record<AbstractFormFamily, string[]> = {
  lattice: ['Lattice', 'Grid', 'Network', 'Web', 'Matrix', 'Mesh'],
  organic: ['Membrane', 'Blob', 'Organism', 'Cell', 'Amoeba', 'Fluid'],
  energy: ['Storm', 'Field', 'Plasma', 'Arc', 'Pulse', 'Current'],
  topology: ['Morph', 'Shift', 'Flux', 'Transform', 'Mutate', 'Evolve'],
  symmetry: ['Fractal', 'Mandala', 'Pattern', 'Mirror', 'Radial', 'Fold'],
  ribbon: ['Flow', 'Stream', 'Wave', 'Ribbon', 'Spiral', 'Thread'],
  crystalline: ['Crystal', 'Shard', 'Cluster', 'Facet', 'Prism', 'Gem'],
  vortex: ['Vortex', 'Spiral', 'Tornado', 'Whirl', 'Cyclone', 'Twist'],
};

export const FORM_FAMILY_EMOJIS: Record<AbstractFormFamily, string[]> = {
  lattice: ['🔷', '🔶', '⬡', '🔗', '🕸️', '📐'],
  organic: ['🫧', '💧', '🧬', '🦠', '🌊', '💠'],
  energy: ['⚡', '💫', '✨', '🌟', '⭐', '💥'],
  topology: ['🌀', '♾️', '🔄', '🎭', '🔮', '🌌'],
  symmetry: ['❄️', '🔯', '☯️', '🌸', '💎', '🏵️'],
  ribbon: ['🌈', '〰️', '🎗️', '🎀', '🌊', '🌬️'],
  crystalline: ['💎', '🔷', '❄️', '💠', '🔮', '✨'],
  vortex: ['🌀', '🌪️', '🔄', '♾️', '⚡', '🌌'],
};

export function abstractFormToName(params: AbstractFormParams): string {
  const r = seededRandom(params.geometrySeed + 999);
  const names = FORM_FAMILY_NAMES[params.formFamily];
  const name = names[Math.floor(r() * names.length)];
  
  // Add topology descriptor
  const bassDescriptors: Record<BassTopologyMode, string> = {
    expand: 'Pulsing',
    fracture: 'Fractured',
    ripple: 'Rippling',
    morph: 'Morphing',
    explode: 'Explosive',
    warp: 'Warping',
  };
  
  const descriptor = bassDescriptors[params.bassTopologyMode];
  const uniqueNum = params.geometrySeed % 10000;
  
  return `${descriptor} ${name} #${uniqueNum}`;
}

export function abstractFormToEmoji(params: AbstractFormParams): string {
  const r = seededRandom(params.geometrySeed + 888);
  const emojis = FORM_FAMILY_EMOJIS[params.formFamily];
  return emojis[Math.floor(r() * emojis.length)];
}

// ==================== VALIDATION (QUALITY CHECK) ====================

export function validateAbstractForm(params: AbstractFormParams): boolean {
  // ❌ Is motion mostly scale/rotation only? -> Check topology modes are meaningful
  const hasTopologyMutation = 
    params.bassTopologyMode !== undefined &&
    params.midsTopologyMode !== undefined &&
    params.highsTopologyMode !== undefined;
  
  if (!hasTopologyMutation) return false;
  
  // ✅ Does it have multi-band audio reactivity?
  const hasMultiBandReactivity = 
    params.bassIntensity > 0.3 &&
    params.midsIntensity > 0.3 &&
    params.highsIntensity > 0.3;
  
  if (!hasMultiBandReactivity) return false;
  
  // ✅ Is it abstract? (all form families are abstract by design)
  const isAbstract = ABSTRACT_FORM_FAMILIES.includes(params.formFamily);
  
  return isAbstract;
}

// ==================== AUDIO MAPPING CURVES ====================

export function applyReactivityCurve(
  value: number, 
  curve: 'linear' | 'exponential' | 'logarithmic' | 'stepped'
): number {
  switch (curve) {
    case 'linear':
      return value;
    case 'exponential':
      return value * value;
    case 'logarithmic':
      return Math.log1p(value * 9) / Math.log(10); // log(1+x*9)/log(10)
    case 'stepped':
      return Math.floor(value * 4) / 4; // 4 discrete steps
    default:
      return value;
  }
}
