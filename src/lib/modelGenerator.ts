/**
 * Procedural 3D MODEL generation for the studio generator.
 * Wraps the visualizer factory and can bias toward more-complex configs than
 * the built-in library (denser element counts, heavier noise, ornate shapes).
 */
import { generateVisualizer } from '@/lib/visualizerFactory';
import type { VisualizerConfig } from '@/lib/visualizerFactory/config';
import type { ShapeFamily } from '@/lib/visualizerFactory/modules';

const COMPLEX_SHAPES: ShapeFamily[] = [
  'metaball', 'fractal_tree', 'kaleidoscope', 'torus_knot', 'cube_lattice', 'vortex', 'helix',
] as ShapeFamily[];

const KNOWN_SHAPES = new Set<string>([
  'lattice', 'organic', 'particle_sphere', 'particle_ring', 'ribbons', 'helix', 'shards',
  'vortex', 'torus_knot', 'metaball', 'wave_grid', 'radial_spokes', 'fractal_tree',
  'cube_lattice', 'kaleidoscope',
]);

interface ModelOpts { complex?: boolean; shapes?: string[] }

/**
 * Procedural model config. Always richer than the base library; if the prompt
 * suggested shapes, force one of them so "tree" actually builds a tree.
 */
export function generateModelConfig(seed: number, opts: ModelOpts = {}): VisualizerConfig {
  const cfg = generateVisualizer(seed);
  const { complex = true, shapes } = opts;

  // prompt-driven shape, else an ornate default when complex
  const promptShapes = (shapes || []).filter((s) => KNOWN_SHAPES.has(s)) as ShapeFamily[];
  const shape = promptShapes.length
    ? promptShapes[Math.abs(seed) % promptShapes.length]
    : complex
      ? COMPLEX_SHAPES[Math.abs(seed) % COMPLEX_SHAPES.length]
      : cfg.shape;

  if (shape === cfg.shape && !complex) return cfg;

  return {
    ...cfg,
    shape,
    shapeParams: {
      ...cfg.shapeParams,
      elementCount: Math.min(150, Math.round(cfg.shapeParams.elementCount * 1.8) + 24),
      noiseStrength: Math.min(0.6, cfg.shapeParams.noiseStrength * 1.6 + 0.05),
      segmentDetail: Math.min(64, cfg.shapeParams.segmentDetail + 16),
    },
    motionParams: {
      ...cfg.motionParams,
      intensity: Math.min(1, cfg.motionParams.intensity * 1.3),
    },
  };
}
