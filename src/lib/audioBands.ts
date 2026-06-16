/**
 * Band processor for the shader/particle visualizers.
 *
 * This is now a thin adapter over the shared {@link createReactiveEngine}: every
 * visualizer family runs the exact same transient-aware DSP (per-band exponential
 * instant-attack / punchy-decay envelopes, spectral-flux onset detection, adaptive
 * normalisation) and honours the live global reactivity controls. The legacy
 * {@link Bands} shape is preserved so existing call-sites keep working.
 */
import { createReactiveEngine } from '@/lib/reactiveEngine';
import { useStudioStore } from '@/stores/studioStore';

export interface Bands {
  bass: number;   // kick / sub punch
  mid: number;    // snare / body
  treble: number; // hats / air
  level: number;  // overall
  beat: number;   // master drum onset (sharp)
  punch: number;  // strongest transient across bands
}

export function createBandProcessor() {
  const engine = createReactiveEngine();
  let last = 0;

  // Signature kept for back-compat: callers pass (frequency, amplitude, beat, gain);
  // amplitude/beat are now ignored — the engine derives everything from the spectrum.
  return (freq: ArrayLike<number>, _amplitude = 0, _beatStrength = 0, gain = 1): Bands => {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const dt = last ? Math.min(0.05, Math.max(0.001, (now - last) / 1000)) : 0.016;
    last = now;

    const cfg = useStudioStore.getState().reactivity;
    const f = engine.update(freq, 44100, dt, cfg);

    return {
      bass: f.bassBand * gain,
      mid: f.midBand * gain,
      treble: f.trebleBand * gain,
      level: f.level * gain,
      beat: f.beat * gain,
      punch: f.punch * gain,
    };
  };
}
