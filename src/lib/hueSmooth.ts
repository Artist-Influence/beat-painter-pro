/**
 * Ease a hue (0-360 degrees) toward a target along the SHORTEST angular path, so a
 * recolor slides smoothly instead of snapping when the colour slider is dragged.
 * `t` is the per-frame approach factor (0..1); ~0.12 feels smooth without lag.
 */
export const lerpHueDeg = (cur: number, target: number, t: number): number => {
  const d = ((target - cur + 540) % 360) - 180; // shortest signed difference
  return (cur + d * t + 360) % 360;
};
