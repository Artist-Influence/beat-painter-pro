/**
 * MergeVisualizer - renders TWO generated bases together as a single visualizer.
 * The generator rolls two same-type bases and merges them so N bases yield N^2
 * combinations (effectively infinite) without the user manually layering.
 *
 * 3D models are offset side-by-side so both read clearly. Full-screen shader
 * types (cartoon / fractal) output transparent cutouts, so two of them blend in
 * place. Mixed pairs fall back to stacking.
 */
import React from 'react';
import type { VisualizerProps } from './visualizer';
import type { PresetItem } from '@/stores/presetStore';
import { makeFractalVisualizer } from './FractalVisualizer';
import { makeProceduralVisualizer } from './ProceduralPreset';
import { makeCartoonVisualizer } from './Cartoon2DVisualizer';

/** Resolve a single (non-merge) preset item to its visualizer component. */
function resolveComponent(item: PresetItem): React.FC<VisualizerProps> | null {
  switch (item.kind) {
    case 'fractal': return makeFractalVisualizer(item.fractal);
    case 'procedural': return makeProceduralVisualizer(item.procedural);
    case 'cartoon': return makeCartoonVisualizer(item.cartoon);
    default: return null; // sand/daw/merge not mergeable here
  }
}

export function makeMergeVisualizer(a: PresetItem, b: PresetItem) {
  const A = resolveComponent(a);
  const B = resolveComponent(b);
  const both3D = a.kind === 'procedural' && b.kind === 'procedural';

  const Comp: React.FC<VisualizerProps> = (props) => {
    if (!A || !B) return A ? <A {...props} /> : B ? <B {...props} /> : null;
    if (both3D) {
      // offset the two model groups so each is clearly visible
      return (
        <>
          <group position={[-0.62, 0, 0]} scale={0.7}><A {...props} /></group>
          <group position={[0.62, 0, 0]} scale={0.7}><B {...props} /></group>
        </>
      );
    }
    // full-screen shader cutouts blend in place
    return (<><A {...props} /><B {...props} /></>);
  };
  Comp.displayName = `Merge(${a.kind}+${b.kind})`;
  return Comp;
}
