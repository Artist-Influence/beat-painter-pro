// Seeded random number generator for reproducible results
export function seededRandom(seed: number) {
  let state = seed;
  return function() {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

export type BaseShape = 'orb' | 'geometric' | 'ribbons' | 'particles' | 'tunnel' | 'crystal';
export type AnimationStyle = 'pulsing' | 'rotating' | 'flowing' | 'chaotic' | 'smooth';
export type Intensity = 'subtle' | 'medium' | 'intense';

export interface RandomVisualizerParams {
  seed: number;
  baseShape: BaseShape;
  animationStyle: AnimationStyle;
  intensity: Intensity;
  elementCount: number;
  particleCount: number;
  symmetry: boolean;
  rotationSpeed: number;
  colorShift: number;
}

export const BASE_SHAPES: BaseShape[] = ['orb', 'geometric', 'ribbons', 'particles', 'tunnel', 'crystal'];
export const ANIMATION_STYLES: AnimationStyle[] = ['pulsing', 'rotating', 'flowing', 'chaotic', 'smooth'];
export const INTENSITIES: Intensity[] = ['subtle', 'medium', 'intense'];

export function generateRandomSeed(): number {
  return Math.floor(Math.random() * 1000000);
}

export function generateRandomParams(
  seed: number,
  preferences?: Partial<Pick<RandomVisualizerParams, 'baseShape' | 'animationStyle' | 'intensity'>>
): RandomVisualizerParams {
  const random = seededRandom(seed);
  
  const baseShape = preferences?.baseShape || BASE_SHAPES[Math.floor(random() * BASE_SHAPES.length)];
  const animationStyle = preferences?.animationStyle || ANIMATION_STYLES[Math.floor(random() * ANIMATION_STYLES.length)];
  const intensity = preferences?.intensity || INTENSITIES[Math.floor(random() * INTENSITIES.length)];
  
  // Intensity affects element counts
  const intensityMultiplier = intensity === 'subtle' ? 0.5 : intensity === 'medium' ? 1 : 1.5;
  
  return {
    seed,
    baseShape,
    animationStyle,
    intensity,
    elementCount: Math.floor((10 + random() * 30) * intensityMultiplier),
    particleCount: Math.floor((200 + random() * 800) * intensityMultiplier),
    symmetry: random() > 0.4,
    rotationSpeed: 0.2 + random() * 0.8,
    colorShift: random() * Math.PI * 2,
  };
}

const SHAPE_NAMES: Record<BaseShape, string[]> = {
  orb: ['Sphere', 'Orb', 'Globe', 'Bubble'],
  geometric: ['Prism', 'Polyhedron', 'Fractal', 'Matrix'],
  ribbons: ['Flow', 'Stream', 'Wave', 'Ribbon'],
  particles: ['Swarm', 'Storm', 'Cloud', 'Burst'],
  tunnel: ['Vortex', 'Portal', 'Warp', 'Void'],
  crystal: ['Crystal', 'Gem', 'Shard', 'Facet'],
};

const ANIMATION_ADJECTIVES: Record<AnimationStyle, string[]> = {
  pulsing: ['Pulsing', 'Breathing', 'Throbbing', 'Living'],
  rotating: ['Spinning', 'Rotating', 'Orbiting', 'Twirling'],
  flowing: ['Flowing', 'Drifting', 'Gliding', 'Streaming'],
  chaotic: ['Chaotic', 'Wild', 'Frenetic', 'Electric'],
  smooth: ['Smooth', 'Serene', 'Gentle', 'Calm'],
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
  };
  
  const random = seededRandom(params.seed + 777);
  const options = emojiMap[params.baseShape];
  return options[Math.floor(random() * options.length)];
}
