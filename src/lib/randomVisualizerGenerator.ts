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
  // New variance parameters for unique generations
  scaleVariation: number;
  positionSpread: number;
  rotationOffset: number;
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
  preferences?: Partial<Pick<RandomVisualizerParams, 'baseShape' | 'animationStyle' | 'backgroundEffect' | 'elementCount' | 'connectionLines'>>
): RandomVisualizerParams {
  const random = seededRandom(seed);
  
  const baseShape = preferences?.baseShape || BASE_SHAPES[Math.floor(random() * BASE_SHAPES.length)];
  const animationStyle = preferences?.animationStyle || ANIMATION_STYLES[Math.floor(random() * ANIMATION_STYLES.length)];
  const backgroundEffect = preferences?.backgroundEffect || BACKGROUND_EFFECTS[Math.floor(random() * BACKGROUND_EFFECTS.length)];
  
  // Element count: use preference or random between 8-40
  const elementCount = preferences?.elementCount ?? Math.floor(8 + random() * 32);
  
  // If user explicitly selected a shape, don't mix geometries
  const shapeWasExplicitlyChosen = preferences?.baseShape !== undefined;
  const mixedGeometry = shapeWasExplicitlyChosen ? false : random() > 0.5;
  
  return {
    seed,
    baseShape,
    animationStyle,
    backgroundEffect,
    elementCount,
    particleCount: Math.floor(100 + random() * 300),
    symmetry: random() > 0.5, // 50/50 for more variation
    rotationSpeed: 0.1 + random() * 1.2, // Wider range
    colorShift: random() * Math.PI * 2,
    mixedGeometry,
    connectionLines: preferences?.connectionLines ?? false,
    // New variance parameters - these create unique looks even with same shape/animation
    scaleVariation: 0.5 + random() * 1.0, // 0.5x to 1.5x
    positionSpread: 2 + random() * 4, // How spread out elements are
    rotationOffset: random() * Math.PI * 2, // Starting rotation angle
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
