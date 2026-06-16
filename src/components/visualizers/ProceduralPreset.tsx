import React from 'react';
import type { VisualizerProps } from '../visualizer';
import type { VisualizerConfig } from '@/lib/visualizerFactory/config';
import { ProceduralVisualizer } from './ProceduralVisualizer';

const EMOJI: Record<string, string> = {
  lattice: '🔷', organic: '🫧', particle_sphere: '✨', particle_ring: '💫',
  ribbons: '🎀', helix: '🧬', shards: '💎', vortex: '🌀', torus_knot: '🔮',
  metaball: '🟣', wave_grid: '🌊', radial_spokes: '☀️', fractal_tree: '🌳',
  cube_lattice: '🧊', kaleidoscope: '🎭',
};
export const modelEmoji = (c: VisualizerConfig) => EMOJI[c.shape] || '✨';
export const modelName = (c: VisualizerConfig) =>
  `${(c.shape || 'model').replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase())} ${c.seed % 1000}`;

/** Wrap a procedural VisualizerConfig into a registry-compatible component. */
export function makeProceduralVisualizer(config: VisualizerConfig) {
  const Comp: React.FC<VisualizerProps> = (props) => (
    <ProceduralVisualizer config={config} audioData={props.audioData as any} isPlaying={props.isPlaying} />
  );
  Comp.displayName = `Model(${config.shape})`;
  return Comp;
}
