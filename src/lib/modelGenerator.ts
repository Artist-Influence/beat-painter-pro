/**
 * Procedural 3D MODEL generation for the studio generator.
 * Wraps the visualizer factory and can bias toward more-complex configs than
 * the built-in library (denser element counts, heavier noise, ornate shapes).
 */
import { generateVisualizer, getShapeConfig } from '@/lib/visualizerFactory';
import type { VisualizerConfig } from '@/lib/visualizerFactory/config';
import type { ShapeFamily } from '@/lib/visualizerFactory/modules';

// Every shape that has a wired renderer (SHAPE_COMPONENTS). The factory already
// picks across all of these; we list them so prompt-driven themes can target any
// shape and so KNOWN_SHAPES no longer silently filters the 20 newer families out.
const ALL_SHAPES: ShapeFamily[] = [
  'lattice', 'organic', 'particle_sphere', 'particle_ring', 'ribbons', 'helix', 'shards',
  'vortex', 'torus_knot', 'metaball', 'wave_grid', 'radial_spokes', 'fractal_tree',
  'cube_lattice', 'kaleidoscope', 'sphere_grid', 'dna_ladder', 'mobius_strip', 'supershape_3d',
  'klein_bottle', 'spring_coil', 'star_burst', 'cylinder_stack', 'pyramid_array', 'ring_system',
  'particle_galaxy', 'honeycomb', 'crystal_cluster', 'flower_3d', 'sphere_swarm', 'fibonacci_sphere',
  'terrain_mesh', 'lissajous_curve', 'gyroid_surface', 'tube_lattice',
  // expansion pack
  'tetra_cluster', 'octa_ring', 'icosa_orbit', 'dodeca_scatter', 'torus_stack', 'gyro_rings',
  'cube_spiral', 'cone_crown', 'pillar_array', 'spike_urchin', 'diamond_totem', 'ring_ripple',
  'atom', 'blob_cluster', 'star_grid', 'prism_tower',
  // expansion pack II
  'tetra_ring', 'pyramid_ring', 'capsule_ring', 'torus_chain', 'spike_disk', 'cone_spiral',
  'box_tower', 'sphere_helix', 'helix_double', 'crystal_spire', 'diamond_grid', 'cube_cross',
  'nested_shells', 'ring_tunnel', 'fan_blades', 'star_tetra', 'bloom_cones', 'orbit_swarm',
  'gem_cluster', 'cylinder_fan',
];

const KNOWN_SHAPES = new Set<string>(ALL_SHAPES);

// Shapes that fill/clip the frame as a lone hero object (>90% coverage, measured
// across many seeds). When the caller asks for a "complex" look we re-roll ONLY
// these into the ornate pool and leave every other shape exactly as the factory
// picked it, so a roll keeps the factory's full shape variety instead of
// collapsing to a handful of templates. (The pure point-clouds used to be here
// too because their GL points rendered sub-pixel; fixed via fixed-pixel point
// size, so they're back in the pool.)
const RESWAP_SHAPES = new Set<ShapeFamily>([
  'organic', 'ribbons', 'mobius_strip', 'cylinder_stack', 'honeycomb',
]);

// Rich, dimensional shapes used to replace a flat/sparse pick.
const ORNATE_POOL: ShapeFamily[] = [
  'metaball', 'fractal_tree', 'kaleidoscope', 'torus_knot', 'crystal_cluster', 'flower_3d',
  'supershape_3d', 'klein_bottle', 'star_burst', 'honeycomb', 'spring_coil', 'lissajous_curve',
  'gyroid_surface', 'shards', 'ring_system', 'helix', 'cube_lattice', 'vortex',
];

// Small integer hash so sequential seeds don't march through a pool in order
// (the studio sometimes generates from seed, seed+1, ... while auto-piloting).
const hash32 = (n: number): number => {
  let x = (n | 0) ^ 0x9e3779b9;
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  return (x ^ (x >>> 16)) >>> 0;
};

interface ModelOpts { complex?: boolean; shapes?: string[] }

/**
 * Procedural model config. Keeps the factory's full shape variety; "complex"
 * only thickens params and re-rolls the few flat shapes into something ornate.
 * If the prompt suggested shapes, force one of them so "tree" builds a tree.
 */
export function generateModelConfig(seed: number, opts: ModelOpts = {}): VisualizerConfig {
  const cfg = generateVisualizer(seed);
  const { complex = true, shapes } = opts;

  // prompt-driven shape wins; otherwise keep the factory pick and only swap out a
  // genuinely flat/sparse shape so the result still reads as a rich 3D object.
  const promptShapes = (shapes || []).filter((s) => KNOWN_SHAPES.has(s)) as ShapeFamily[];
  let shape = cfg.shape;
  if (promptShapes.length) {
    shape = promptShapes[hash32(seed) % promptShapes.length];
  } else if (complex && RESWAP_SHAPES.has(cfg.shape)) {
    shape = ORNATE_POOL[hash32(seed) % ORNATE_POOL.length];
  }

  // Cap the RESTING footprint so a roll never loads oversized, WITHOUT flattening
  // the natural size variety. The factory picks scale 0.5..2.0 and each shape has
  // its own defaultScale (2.0..3.5); together that let baseScale reach ~7x and fill
  // the frame. We keep the factory's pick but clamp baseScale (= defaultScale *
  // scale) to a ceiling, so only the oversized outliers shrink and everything else
  // keeps its natural size. Audio pulse and the Zoom slider scale this live.
  const ds = getShapeConfig(shape).defaultScale || 2.5;
  const rawBase = ds * cfg.shapeParams.scale;
  const normScale = Math.min(rawBase, 3.0) / ds;

  // Density-preserving enrichment: thicken noise/detail and nudge motion, but
  // NEVER reduce a shape's element count - particle/grid shapes need their points.
  const ec = cfg.shapeParams.elementCount;
  return {
    ...cfg,
    shape,
    shapeParams: {
      ...cfg.shapeParams,
      scale: normScale,
      elementCount: complex ? Math.min(420, Math.round(ec * 1.25) + 12) : ec,
      noiseStrength: complex ? Math.min(0.6, cfg.shapeParams.noiseStrength * 1.4 + 0.04) : cfg.shapeParams.noiseStrength,
      segmentDetail: complex ? Math.min(64, cfg.shapeParams.segmentDetail + 12) : cfg.shapeParams.segmentDetail,
    },
    motionParams: {
      ...cfg.motionParams,
      intensity: Math.min(1, cfg.motionParams.intensity * 1.2),
    },
  };
}
