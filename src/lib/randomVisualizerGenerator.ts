// Seeded random number generator for reproducible results
export function seededRandom(seed: number) {
  let state = seed;
  return function() {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

export type BaseShape = 'orb' | 'geometric' | 'ribbons' | 'particles' | 'tunnel' | 'crystal' | 'spiral' | 'lattice' | 'helix' | 'nebula' | 'matrix' | 'membrane' | 'pulsar' | 'vortexCore' | 'cosmicEye';
export type AnimationStyle = 'pulsing' | 'rotating' | 'flowing' | 'chaotic' | 'smooth' | 'breathing' | 'explosive';
export type BackgroundEffect = 'none' | 'stars' | 'movingLines' | 'energyField' | 'particles' | 'lightRays' | 'aurora';
export type ColorScheme = 'mono' | 'neon' | 'pastel' | 'fire' | 'ice' | 'rainbow' | 'sunset' | 'ocean';

// Geometry types for standalone procedural generation
export type GeometryType = 'sphere' | 'icosahedron' | 'octahedron' | 'dodecahedron' | 'tetrahedron' | 
  'torusKnot' | 'torus' | 'box' | 'cone' | 'cylinder' | 'capsule' | 'ring';

export type PulseMode = 'none' | 'breathe' | 'heartbeat' | 'erratic' | 'stutter' | 'swell';

// Creative template types for standalone visualizers - these trigger full pre-built visualizers
export type CreativeTemplateType = 
  | 'geometric'   // Default procedural geometry (sphere, torus, etc.)
  | 'smiley' | 'car' | 'heart' | 'star' | 'robot' | 'flower'
  | 'wings' | 'butterfly' | 'dragon' | 'spaceship' | 'crown'
  | 'skull' | 'diamond' | 'moon' | 'sun' | 'planet' | 'lightning' | 'tornado'
  // Extended creative templates
  | 'eye' | 'hand' | 'sword' | 'anchor' | 'rocket'
  | 'fish' | 'bird' | 'snake' | 'octopus' | 'jellyfish' | 'phoenix';

export const CREATIVE_TEMPLATES: CreativeTemplateType[] = [
  'geometric', 'geometric', // Weight geometric slightly
  'smiley', 'car', 'heart', 'star', 'robot', 'flower',
  'wings', 'butterfly', 'dragon', 'spaceship', 'crown',
  'skull', 'diamond', 'moon', 'sun', 'planet', 'lightning', 'tornado',
  'eye', 'hand', 'sword', 'anchor', 'rocket',
  'fish', 'bird', 'snake', 'octopus', 'jellyfish', 'phoenix'
];

// Standalone variant for procedural generation - 100,000+ unique combinations
export interface StandaloneVariant {
  // NEW: Which creative template to use ('geometric' = use procedural geometry)
  creativeTemplate: CreativeTemplateType;
  
  // Core geometry (12 types) - used when creativeTemplate === 'geometric'
  primaryGeometry: GeometryType;
  secondaryGeometry: GeometryType;
  
  // Geometry modifiers (axis stretching)
  stretchX: number;  // 0.3 - 2.5
  stretchY: number;
  stretchZ: number;
  
  // Secondary decorative elements
  hasOrbitRings: boolean;
  orbitRingCount: number;     // 1-4
  orbitRingTilt: number;      // rotation angle
  hasParticleHalo: boolean;
  particleHaloCount: number;  // 50-200
  hasInnerCore: boolean;
  innerCoreScale: number;     // 0.2-0.5
  hasMirrorCopy: boolean;
  mirrorDistance: number;
  hasOuterShell: boolean;
  outerShellOpacity: number;
  
  // Animation modifiers
  wobbleIntensity: number;    // 0 - 1
  wobbleSpeed: number;        // 0.5 - 3
  spinAxes: [boolean, boolean, boolean];
  spinSpeeds: [number, number, number];
  pulseMode: PulseMode;
  pulseIntensity: number;     // 0.1 - 0.5
  morphSpeed: number;
  
  // Visual style modifiers
  wireframeMix: number;       // 0 = solid, 1 = wireframe, 0.5 = layered
  detailLevel: number;        // 1-4
  emissiveIntensity: number;  // 0.3 - 1.5
  
  // Structural complexity
  layerCount: number;         // 1-4 concentric layers
  layerSpacing: number;       // 0.2 - 0.8
  fractured: boolean;         // Split into shards
  fracturedCount: number;     // 3-8 pieces
  hollowed: boolean;          // Ring/hollow version
  twisted: number;            // 0-1 twist amount
}

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
  // NEW: Color scheme for the visualizer
  colorScheme: ColorScheme;
  // NEW: Glow intensity (0.0 - 2.0)
  glowIntensity: number;
  // Standalone variant for single-element procedural generation
  standaloneVariant?: StandaloneVariant;
}

export const BASE_SHAPES: BaseShape[] = ['orb', 'geometric', 'ribbons', 'particles', 'tunnel', 'crystal', 'spiral', 'lattice', 'helix', 'nebula', 'matrix', 'membrane', 'pulsar', 'vortexCore', 'cosmicEye'];
export const ANIMATION_STYLES: AnimationStyle[] = ['pulsing', 'rotating', 'flowing', 'chaotic', 'smooth', 'breathing', 'explosive'];
export const BACKGROUND_EFFECTS: BackgroundEffect[] = ['none', 'stars', 'movingLines', 'energyField', 'particles', 'lightRays', 'aurora'];
export const COLOR_SCHEMES: ColorScheme[] = ['mono', 'neon', 'pastel', 'fire', 'ice', 'rainbow', 'sunset', 'ocean'];
export const GEOMETRY_TYPES: GeometryType[] = ['sphere', 'icosahedron', 'octahedron', 'dodecahedron', 'tetrahedron', 'torusKnot', 'torus', 'box', 'cone', 'cylinder', 'capsule', 'ring'];
export const PULSE_MODES: PulseMode[] = ['none', 'breathe', 'heartbeat', 'erratic', 'stutter', 'swell'];

export function generateRandomSeed(): number {
  return Math.floor(Math.random() * 1000000);
}

// Generate a procedural standalone variant with massive variety
export function generateStandaloneVariant(seed: number): StandaloneVariant {
  const r = seededRandom(seed);
  
  // Select a random creative template - this determines if we use a pre-built visualizer
  const creativeTemplate = CREATIVE_TEMPLATES[Math.floor(r() * CREATIVE_TEMPLATES.length)];
  
  // Helper for weighted random choices
  const weightedChoice = <T>(options: T[], weights: number[]): T => {
    const total = weights.reduce((a, b) => a + b, 0);
    let random = r() * total;
    for (let i = 0; i < options.length; i++) {
      random -= weights[i];
      if (random <= 0) return options[i];
    }
    return options[options.length - 1];
  };
  
  // Primary geometry with weighted distribution (favor interesting shapes)
  const primaryGeometry = weightedChoice(GEOMETRY_TYPES, [
    0.8, 1.2, 1.0, 1.0, 0.8, 1.5, 1.3, 0.6, 0.9, 0.7, 0.8, 1.0
  ]);
  
  // Secondary geometry (different from primary for contrast)
  const filteredGeometries = GEOMETRY_TYPES.filter(g => g !== primaryGeometry);
  const secondaryGeometry = filteredGeometries[Math.floor(r() * filteredGeometries.length)];
  
  // Axis stretching - sometimes extreme, sometimes subtle
  const stretchMode = r();
  let stretchX: number, stretchY: number, stretchZ: number;
  if (stretchMode < 0.3) {
    // Uniform scale
    const s = 0.6 + r() * 1.0;
    stretchX = stretchY = stretchZ = s;
  } else if (stretchMode < 0.6) {
    // One axis stretched
    stretchX = 0.5 + r() * 0.5;
    stretchY = 0.5 + r() * 0.5;
    stretchZ = 0.5 + r() * 0.5;
    const axis = Math.floor(r() * 3);
    if (axis === 0) stretchX = 1.5 + r() * 1.0;
    else if (axis === 1) stretchY = 1.5 + r() * 1.0;
    else stretchZ = 1.5 + r() * 1.0;
  } else {
    // Random per-axis
    stretchX = 0.4 + r() * 1.8;
    stretchY = 0.4 + r() * 1.8;
    stretchZ = 0.4 + r() * 1.8;
  }
  
  // Decorative elements
  const hasOrbitRings = r() > 0.5;
  const hasParticleHalo = r() > 0.6;
  const hasInnerCore = r() > 0.45;
  const hasMirrorCopy = r() > 0.75;
  const hasOuterShell = r() > 0.65;
  
  // Animation style
  const pulseMode = PULSE_MODES[Math.floor(r() * PULSE_MODES.length)];
  
  // Spin configuration
  const spinAxes: [boolean, boolean, boolean] = [r() > 0.3, r() > 0.4, r() > 0.5];
  // Ensure at least one axis spins
  if (!spinAxes[0] && !spinAxes[1] && !spinAxes[2]) {
    spinAxes[Math.floor(r() * 3)] = true;
  }
  
  return {
    creativeTemplate,
    primaryGeometry,
    secondaryGeometry,
    stretchX,
    stretchY,
    stretchZ,
    hasOrbitRings,
    orbitRingCount: hasOrbitRings ? Math.floor(1 + r() * 3) : 0,
    orbitRingTilt: r() * Math.PI,
    hasParticleHalo,
    particleHaloCount: hasParticleHalo ? Math.floor(50 + r() * 150) : 0,
    hasInnerCore,
    innerCoreScale: 0.15 + r() * 0.35,
    hasMirrorCopy,
    mirrorDistance: 2.5 + r() * 2,
    hasOuterShell,
    outerShellOpacity: 0.1 + r() * 0.25,
    wobbleIntensity: r() * 0.8,
    wobbleSpeed: 0.5 + r() * 2.5,
    spinAxes,
    spinSpeeds: [0.2 + r() * 1.5, 0.2 + r() * 1.5, 0.2 + r() * 1.5],
    pulseMode,
    pulseIntensity: 0.1 + r() * 0.4,
    morphSpeed: 0.5 + r() * 2.5,
    wireframeMix: r() > 0.7 ? (r() > 0.5 ? 1 : 0.5) : 0,
    detailLevel: Math.floor(1 + r() * 3),
    emissiveIntensity: 0.3 + r() * 1.0,
    layerCount: Math.floor(1 + r() * 3),
    layerSpacing: 0.25 + r() * 0.5,
    fractured: r() > 0.85,
    fracturedCount: Math.floor(3 + r() * 5),
    hollowed: r() > 0.8,
    twisted: r() > 0.7 ? r() * 0.8 : 0,
  };
}

export function generateRandomParams(
  seed: number,
  preferences?: Partial<Pick<RandomVisualizerParams, 'baseShape' | 'animationStyle' | 'backgroundEffect' | 'elementCount' | 'connectionLines' | 'colorScheme' | 'glowIntensity'>>
): RandomVisualizerParams {
  const random = seededRandom(seed);
  
  const baseShape = preferences?.baseShape || BASE_SHAPES[Math.floor(random() * BASE_SHAPES.length)];
  const animationStyle = preferences?.animationStyle || ANIMATION_STYLES[Math.floor(random() * ANIMATION_STYLES.length)];
  const colorScheme = preferences?.colorScheme || COLOR_SCHEMES[Math.floor(random() * COLOR_SCHEMES.length)];
  
  // Element count: use preference or random between 8-40
  const elementCount = preferences?.elementCount ?? Math.floor(8 + random() * 32);
  
  // For standalone mode (elementCount === 1): NO background effects by default
  // Users can add particles/aurora/stars manually via Visual Effects section if desired
  const isStandalone = elementCount === 1;
  const backgroundEffect = isStandalone 
    ? 'none' as BackgroundEffect
    : (preferences?.backgroundEffect || BACKGROUND_EFFECTS[Math.floor(random() * BACKGROUND_EFFECTS.length)]);
  
  // If user explicitly selected a shape, don't mix geometries
  const shapeWasExplicitlyChosen = preferences?.baseShape !== undefined;
  const mixedGeometry = shapeWasExplicitlyChosen ? false : random() > 0.5;
  
  // Generate standalone variant only when in standalone mode
  const standaloneVariant = isStandalone ? generateStandaloneVariant(seed) : undefined;
  
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
    mixedGeometry,
    connectionLines: preferences?.connectionLines ?? false,
    scaleVariation: 0.5 + random() * 1.0,
    positionSpread: 2 + random() * 4,
    rotationOffset: random() * Math.PI * 2,
    colorScheme,
    glowIntensity,
    standaloneVariant,
  };
}

const SHAPE_NAMES: Record<BaseShape, string[]> = {
  orb: ['Sphere', 'Orb', 'Globe', 'Bubble'],
  geometric: ['Prism', 'Polyhedron', 'Fractal', 'Matrix'],
  ribbons: ['Flow', 'Stream', 'Wave', 'Ribbon'],
  particles: ['Swarm', 'Storm', 'Cloud', 'Burst'],
  tunnel: ['Vortex', 'Portal', 'Warp', 'Void'],
  crystal: ['Crystal', 'Gem', 'Shard', 'Facet'],
  spiral: ['Spiral', 'Coil', 'Twist', 'Helix'],
  lattice: ['Lattice', 'Grid', 'Web', 'Network'],
  helix: ['DNA', 'Double-Helix', 'Strand', 'Chain'],
  nebula: ['Nebula', 'Cosmos', 'Galaxy', 'Stardust'],
  matrix: ['Matrix', 'Rain', 'Cascade', 'Digital'],
  membrane: ['Membrane', 'Blob', 'Organism', 'Cell'],
  pulsar: ['Pulsar', 'Star', 'Nova', 'Core'],
  vortexCore: ['Vortex', 'Warp', 'Twist', 'Knot'],
  cosmicEye: ['Eye', 'Oracle', 'Iris', 'Watcher'],
};

const ANIMATION_ADJECTIVES: Record<AnimationStyle, string[]> = {
  pulsing: ['Pulsing', 'Breathing', 'Throbbing', 'Living'],
  rotating: ['Spinning', 'Rotating', 'Orbiting', 'Twirling'],
  flowing: ['Flowing', 'Drifting', 'Gliding', 'Streaming'],
  chaotic: ['Chaotic', 'Wild', 'Frenetic', 'Electric'],
  smooth: ['Smooth', 'Serene', 'Gentle', 'Calm'],
  breathing: ['Breathing', 'Organic', 'Alive', 'Pulsating'],
  explosive: ['Explosive', 'Bursting', 'Dynamic', 'Fierce'],
};

export function paramsToName(params: RandomVisualizerParams): string {
  const random = seededRandom(params.seed + 999);
  
  const shapeNames = SHAPE_NAMES[params.baseShape];
  const shapeName = shapeNames[Math.floor(random() * shapeNames.length)];
  
  const adjectives = ANIMATION_ADJECTIVES[params.animationStyle];
  const adjective = adjectives[Math.floor(random() * adjectives.length)];
  
  // Add a unique number from seed
  const uniqueNum = params.seed % 10000;
  
  return `${adjective} ${shapeName} #${uniqueNum}`;
}

export function paramsToEmoji(params: RandomVisualizerParams): string {
  const emojiMap: Record<BaseShape, string[]> = {
    orb: ['🔮', '🌕', '⚪', '💫'],
    geometric: ['💎', '🔷', '🔶', '⬡'],
    ribbons: ['🌊', '〰️', '🎗️', '🌀'],
    particles: ['✨', '🌟', '⭐', '💥'],
    tunnel: ['🕳️', '🌀', '🌌', '⚡'],
    crystal: ['💎', '🔮', '❄️', '🪩'],
    spiral: ['🌀', '🐚', '🌪️', '♾️'],
    lattice: ['🕸️', '📊', '🔲', '⬜'],
    helix: ['🧬', '🔗', '⛓️', '🧪'],
    nebula: ['🌌', '☁️', '💜', '🌠'],
    matrix: ['🔢', '💚', '📟', '🖥️'],
    membrane: ['🫧', '🧫', '🦠', '💧'],
    pulsar: ['💫', '⭐', '🌟', '☀️'],
    vortexCore: ['🌀', '🌪️', '♾️', '🔄'],
    cosmicEye: ['👁️', '🔮', '👀', '🌌'],
  };
  
  const random = seededRandom(params.seed + 777);
  const options = emojiMap[params.baseShape];
  return options[Math.floor(random() * options.length)];
}

// Color palettes for visualizers
export const COLOR_PALETTES: Record<ColorScheme, string[]> = {
  mono: ['#ffffff', '#cccccc', '#999999', '#666666'],
  neon: ['#ff00ff', '#00ffff', '#ffff00', '#ff0080', '#00ff80'],
  pastel: ['#ffb5e8', '#b5fffc', '#ffffd1', '#d4b5ff', '#ffccb5'],
  fire: ['#ff0000', '#ff6600', '#ffcc00', '#ffffff', '#ff3300'],
  ice: ['#00ffff', '#0088ff', '#ffffff', '#aaddff', '#66ccff'],
  rainbow: ['#ff0000', '#ff8800', '#ffff00', '#00ff00', '#0088ff', '#8800ff'],
  sunset: ['#ff6b6b', '#ffa500', '#ffd93d', '#6bcb77', '#4d96ff'],
  ocean: ['#006994', '#40e0d0', '#00ced1', '#20b2aa', '#48d1cc'],
};
