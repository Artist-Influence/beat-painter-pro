import type { AspectRatio, CompositeState } from '@/stores/studioStore';

/** Numeric width/height ratio for each named aspect. */
export const ASPECT_RATIO_VALUE: Record<AspectRatio, number> = {
  horizontal: 16 / 9,
  vertical: 9 / 16,
  square: 1,
};

export interface VizBox {
  /** position + size as fractions of the export stage (0..1) */
  left: number; top: number; w: number; h: number;
  /** contain-fit fractions at scale = 1 (used for resize math) */
  fw: number; fh: number;
}

/**
 * The visualizer's box within the export stage. The visualizer can have its own
 * aspect (`composite.vizAspect`) that differs from the export frame — e.g. a 1:1
 * or 16:9 visualizer sitting inside a 9:16 short-form video. At scale 1 the box is
 * the largest box of that aspect that fits ("contains") inside the stage; scale,
 * x and y then size and place it. When vizAspect is 'match' (default) the box is
 * simply the full stage scaled, i.e. the original behaviour.
 */
export function vizBox(comp: CompositeState, exportAspect: AspectRatio): VizBox {
  const stageRatio = ASPECT_RATIO_VALUE[exportAspect];
  const key = comp.vizAspect && comp.vizAspect !== 'match' ? comp.vizAspect : exportAspect;
  const vizRatio = ASPECT_RATIO_VALUE[key];
  // contain-fit fractions of the stage
  const fw = Math.min(1, vizRatio / stageRatio);
  const fh = fw * stageRatio / vizRatio;
  const w = fw * comp.scale, h = fh * comp.scale;
  return { w, h, left: comp.x - w / 2, top: comp.y - h / 2, fw, fh };
}
