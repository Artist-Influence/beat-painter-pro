/**
 * Module Definitions for Procedural Visualizer Factory
 * 
 * Combinatorial space: 15 shapes × 12 layouts × 12 motions × 10 audio = 21,600 combos
 */

// =============================================================================
// SHAPE SYSTEM (15 Geometry Families)
// =============================================================================

export type ShapeFamily = 
  | 'lattice'           // Wireframe polyhedra with nodes
  | 'organic'           // Blobby deformed sphere
  | 'particle_sphere'   // Spherical particle cloud
  | 'particle_ring'     // Ring/torus particle field
  | 'ribbons'           // Flowing curved planes
  | 'helix'             // DNA-style double helix
  | 'shards'            // Crystalline fragments
  | 'vortex'            // Spiral arms
  | 'torus_knot'        // Torus knot variations
  | 'metaball'          // Blob cluster
  | 'wave_grid'         // Undulating plane grid
  | 'radial_spokes'     // Wheel/spoke pattern
  | 'fractal_tree'      // Branching structure
  | 'cube_lattice'      // 3D cube grid
  | 'kaleidoscope';     // N-fold symmetry

export interface ShapeConfig {
  id: ShapeFamily;
  name: string;
  elementRange: [number, number];
  polyBudget: number;         // Max polygons for this shape
  supportsWireframe: boolean;
  defaultScale: number;
}

export const SHAPE_FAMILIES: ShapeConfig[] = [
  { id: 'lattice', name: 'Lattice', elementRange: [40, 120], polyBudget: 15000, supportsWireframe: true, defaultScale: 2.5 },
  { id: 'organic', name: 'Organic Blob', elementRange: [1, 1], polyBudget: 20000, supportsWireframe: false, defaultScale: 2.0 },
  { id: 'particle_sphere', name: 'Particle Sphere', elementRange: [200, 500], polyBudget: 5000, supportsWireframe: false, defaultScale: 2.5 },
  { id: 'particle_ring', name: 'Particle Ring', elementRange: [150, 400], polyBudget: 4000, supportsWireframe: false, defaultScale: 3.0 },
  { id: 'ribbons', name: 'Ribbons', elementRange: [4, 12], polyBudget: 25000, supportsWireframe: false, defaultScale: 2.5 },
  { id: 'helix', name: 'Helix', elementRange: [30, 80], polyBudget: 18000, supportsWireframe: true, defaultScale: 2.0 },
  { id: 'shards', name: 'Shards', elementRange: [15, 40], polyBudget: 12000, supportsWireframe: true, defaultScale: 2.5 },
  { id: 'vortex', name: 'Vortex', elementRange: [3, 8], polyBudget: 20000, supportsWireframe: false, defaultScale: 2.5 },
  { id: 'torus_knot', name: 'Torus Knot', elementRange: [1, 3], polyBudget: 30000, supportsWireframe: true, defaultScale: 2.0 },
  { id: 'metaball', name: 'Metaball', elementRange: [3, 8], polyBudget: 25000, supportsWireframe: false, defaultScale: 2.0 },
  { id: 'wave_grid', name: 'Wave Grid', elementRange: [400, 1600], polyBudget: 20000, supportsWireframe: true, defaultScale: 3.5 },
  { id: 'radial_spokes', name: 'Radial Spokes', elementRange: [6, 16], polyBudget: 15000, supportsWireframe: true, defaultScale: 2.5 },
  { id: 'fractal_tree', name: 'Fractal Tree', elementRange: [30, 150], polyBudget: 18000, supportsWireframe: true, defaultScale: 2.5 },
  { id: 'cube_lattice', name: 'Cube Lattice', elementRange: [27, 125], polyBudget: 15000, supportsWireframe: true, defaultScale: 3.0 },
  { id: 'kaleidoscope', name: 'Kaleidoscope', elementRange: [4, 12], polyBudget: 25000, supportsWireframe: false, defaultScale: 2.5 },
];

// =============================================================================
// LAYOUT SYSTEM (12 Formations)
// =============================================================================

export type LayoutFormation = 
  | 'centered_single'      // One element at origin
  | 'spherical_shell'      // Elements on sphere surface
  | 'double_ring'          // Concentric horizontal rings
  | 'vertical_stack'       // Stacked layers along Y
  | 'orbital_planes'       // Multiple orbital rings at angles
  | 'fibonacci_spiral'     // Golden ratio spiral placement
  | 'cube_corners'         // 8 corners of cube
  | 'icosahedron_vertices' // 12 vertices of icosahedron
  | 'random_cloud'         // Random spherical distribution
  | 'grid_3d'              // Regular 3D grid
  | 'tunnel'               // Rings along Z-axis
  | 'explosion';           // Radial burst from center

export interface LayoutConfig {
  id: LayoutFormation;
  name: string;
  radiusRange: [number, number];
  supportsMultiple: boolean;
}

export const LAYOUT_FORMATIONS: LayoutConfig[] = [
  { id: 'centered_single', name: 'Centered', radiusRange: [0, 0], supportsMultiple: false },
  { id: 'spherical_shell', name: 'Spherical Shell', radiusRange: [1.5, 3.5], supportsMultiple: true },
  { id: 'double_ring', name: 'Double Ring', radiusRange: [1.5, 3.0], supportsMultiple: true },
  { id: 'vertical_stack', name: 'Vertical Stack', radiusRange: [0.5, 2.0], supportsMultiple: true },
  { id: 'orbital_planes', name: 'Orbital Planes', radiusRange: [2.0, 4.0], supportsMultiple: true },
  { id: 'fibonacci_spiral', name: 'Fibonacci Spiral', radiusRange: [1.0, 3.0], supportsMultiple: true },
  { id: 'cube_corners', name: 'Cube Corners', radiusRange: [1.5, 2.5], supportsMultiple: true },
  { id: 'icosahedron_vertices', name: 'Icosahedron', radiusRange: [2.0, 3.0], supportsMultiple: true },
  { id: 'random_cloud', name: 'Random Cloud', radiusRange: [1.5, 3.5], supportsMultiple: true },
  { id: 'grid_3d', name: '3D Grid', radiusRange: [2.0, 4.0], supportsMultiple: true },
  { id: 'tunnel', name: 'Tunnel', radiusRange: [1.5, 2.5], supportsMultiple: true },
  { id: 'explosion', name: 'Explosion', radiusRange: [2.0, 4.0], supportsMultiple: true },
];

// =============================================================================
// MOTION SYSTEM (12 Patterns)
// =============================================================================

export type MotionPattern = 
  | 'static'           // No base motion (audio only)
  | 'spin_y'           // Rotate around Y
  | 'spin_tumble'      // Rotate around all axes
  | 'orbit'            // Elements orbit center
  | 'breathe'          // Pulsing scale
  | 'wave_propagate'   // Wave travels through elements
  | 'oscillate_xz'     // Side-to-side + front-back
  | 'spiral_in_out'    // Spiral path toward/away from center
  | 'bounce'           // Vertical bounce with gravity
  | 'pendulum'         // Swing motion
  | 'flutter'          // Random micro-movements
  | 'drift';           // Slow random walk

export interface MotionConfig {
  id: MotionPattern;
  name: string;
  speedRange: [number, number];
  intensityRange: [number, number];
}

export const MOTION_PATTERNS: MotionConfig[] = [
  { id: 'static', name: 'Static', speedRange: [0, 0], intensityRange: [0, 0] },
  { id: 'spin_y', name: 'Spin Y', speedRange: [0.2, 0.8], intensityRange: [1, 1] },
  { id: 'spin_tumble', name: 'Tumble', speedRange: [0.1, 0.5], intensityRange: [0.5, 1.5] },
  { id: 'orbit', name: 'Orbit', speedRange: [0.3, 1.0], intensityRange: [0.5, 1.5] },
  { id: 'breathe', name: 'Breathe', speedRange: [0.5, 1.5], intensityRange: [0.1, 0.3] },
  { id: 'wave_propagate', name: 'Wave', speedRange: [1.0, 3.0], intensityRange: [0.2, 0.5] },
  { id: 'oscillate_xz', name: 'Oscillate', speedRange: [0.5, 1.5], intensityRange: [0.2, 0.5] },
  { id: 'spiral_in_out', name: 'Spiral', speedRange: [0.3, 0.8], intensityRange: [0.3, 0.8] },
  { id: 'bounce', name: 'Bounce', speedRange: [1.0, 2.0], intensityRange: [0.2, 0.5] },
  { id: 'pendulum', name: 'Pendulum', speedRange: [0.5, 1.2], intensityRange: [0.3, 0.7] },
  { id: 'flutter', name: 'Flutter', speedRange: [2.0, 4.0], intensityRange: [0.05, 0.15] },
  { id: 'drift', name: 'Drift', speedRange: [0.1, 0.3], intensityRange: [0.1, 0.3] },
];

// =============================================================================
// AUDIO MAPPING SYSTEM (10 Profiles)
// =============================================================================

export type AudioProfile = 
  | 'pulse_dominant'    // Bass drives big scale pulses
  | 'explode_on_beat'   // Bass causes radial expansion
  | 'breathe_heavy'     // Deep breathing with bass
  | 'jitter_focus'      // Highs drive intense jitter
  | 'wave_driven'       // Bass controls wave amplitude
  | 'rotation_focus'    // Mids drive heavy rotation
  | 'morph_heavy'       // Bass drives vertex morphing
  | 'strobe_reactive'   // All bands control flash intensity
  | 'gravity_pull'      // Bass pulls elements inward
  | 'organic_flow';     // Noise-based organic motion

export interface AudioMappingConfig {
  id: AudioProfile;
  name: string;
  bass: {
    target: 'scale' | 'expand' | 'morph' | 'position' | 'noise';
    intensity: [number, number]; // min, max multiplier
    attack: number;              // 0-1, higher = faster
    release: number;             // 0-1, higher = faster
  };
  mids: {
    target: 'rotation' | 'orbit' | 'twist' | 'sway' | 'wave';
    intensity: [number, number];
    attack: number;
    release: number;
  };
  highs: {
    target: 'jitter' | 'shimmer' | 'sparkle' | 'flicker' | 'edge';
    intensity: [number, number];
    attack: number;
    release: number;
  };
}

export const AUDIO_PROFILES: AudioMappingConfig[] = [
  {
    id: 'pulse_dominant',
    name: 'Pulse Dominant',
    bass: { target: 'scale', intensity: [0.3, 0.6], attack: 0.9, release: 0.3 },
    mids: { target: 'rotation', intensity: [0.1, 0.3], attack: 0.7, release: 0.4 },
    highs: { target: 'shimmer', intensity: [0.05, 0.15], attack: 0.95, release: 0.5 },
  },
  {
    id: 'explode_on_beat',
    name: 'Explode on Beat',
    bass: { target: 'expand', intensity: [0.4, 0.8], attack: 0.95, release: 0.2 },
    mids: { target: 'orbit', intensity: [0.2, 0.5], attack: 0.7, release: 0.4 },
    highs: { target: 'sparkle', intensity: [0.1, 0.25], attack: 0.9, release: 0.5 },
  },
  {
    id: 'breathe_heavy',
    name: 'Heavy Breathing',
    bass: { target: 'scale', intensity: [0.2, 0.5], attack: 0.6, release: 0.15 },
    mids: { target: 'sway', intensity: [0.1, 0.3], attack: 0.5, release: 0.3 },
    highs: { target: 'shimmer', intensity: [0.03, 0.1], attack: 0.8, release: 0.4 },
  },
  {
    id: 'jitter_focus',
    name: 'Jitter Focus',
    bass: { target: 'scale', intensity: [0.1, 0.25], attack: 0.8, release: 0.3 },
    mids: { target: 'twist', intensity: [0.15, 0.35], attack: 0.7, release: 0.4 },
    highs: { target: 'jitter', intensity: [0.1, 0.25], attack: 0.98, release: 0.6 },
  },
  {
    id: 'wave_driven',
    name: 'Wave Driven',
    bass: { target: 'noise', intensity: [0.3, 0.7], attack: 0.85, release: 0.25 },
    mids: { target: 'wave', intensity: [0.2, 0.5], attack: 0.7, release: 0.35 },
    highs: { target: 'edge', intensity: [0.05, 0.15], attack: 0.9, release: 0.5 },
  },
  {
    id: 'rotation_focus',
    name: 'Rotation Focus',
    bass: { target: 'scale', intensity: [0.15, 0.35], attack: 0.85, release: 0.3 },
    mids: { target: 'rotation', intensity: [0.3, 0.8], attack: 0.75, release: 0.4 },
    highs: { target: 'sparkle', intensity: [0.05, 0.15], attack: 0.9, release: 0.5 },
  },
  {
    id: 'morph_heavy',
    name: 'Heavy Morphing',
    bass: { target: 'morph', intensity: [0.3, 0.6], attack: 0.9, release: 0.25 },
    mids: { target: 'twist', intensity: [0.2, 0.4], attack: 0.7, release: 0.35 },
    highs: { target: 'flicker', intensity: [0.05, 0.12], attack: 0.95, release: 0.5 },
  },
  {
    id: 'strobe_reactive',
    name: 'Strobe Reactive',
    bass: { target: 'scale', intensity: [0.2, 0.5], attack: 0.95, release: 0.15 },
    mids: { target: 'rotation', intensity: [0.15, 0.4], attack: 0.85, release: 0.3 },
    highs: { target: 'flicker', intensity: [0.15, 0.35], attack: 0.98, release: 0.7 },
  },
  {
    id: 'gravity_pull',
    name: 'Gravity Pull',
    bass: { target: 'position', intensity: [0.2, 0.5], attack: 0.85, release: 0.2 },
    mids: { target: 'orbit', intensity: [0.15, 0.35], attack: 0.7, release: 0.4 },
    highs: { target: 'sparkle', intensity: [0.08, 0.2], attack: 0.9, release: 0.5 },
  },
  {
    id: 'organic_flow',
    name: 'Organic Flow',
    bass: { target: 'noise', intensity: [0.25, 0.55], attack: 0.75, release: 0.2 },
    mids: { target: 'sway', intensity: [0.2, 0.45], attack: 0.6, release: 0.35 },
    highs: { target: 'shimmer', intensity: [0.05, 0.12], attack: 0.85, release: 0.45 },
  },
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function getShapeConfig(id: ShapeFamily): ShapeConfig {
  return SHAPE_FAMILIES.find(s => s.id === id) || SHAPE_FAMILIES[0];
}

export function getLayoutConfig(id: LayoutFormation): LayoutConfig {
  return LAYOUT_FORMATIONS.find(l => l.id === id) || LAYOUT_FORMATIONS[0];
}

export function getMotionConfig(id: MotionPattern): MotionConfig {
  return MOTION_PATTERNS.find(m => m.id === id) || MOTION_PATTERNS[0];
}

export function getAudioConfig(id: AudioProfile): AudioMappingConfig {
  return AUDIO_PROFILES.find(a => a.id === id) || AUDIO_PROFILES[0];
}
