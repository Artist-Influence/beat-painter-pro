import { useEffect, useRef } from 'react';
import { createReactiveEngine, DEFAULT_REACTIVITY, type ReactiveFrame } from '@/lib/reactiveEngine';
import { useStudioStore } from '@/stores/studioStore';

export interface AudioData {
  frequency: number[];      // transient-boosted + adaptively-gained spectrum (for band-average visualizers)
  frequencyRaw: number[];   // lightly-smoothed raw spectrum (for createBandProcessor / spectrum displays)
  amplitude: number;        // adaptive overall level (secondary motion)
  beatStrength: number;     // sharp master drum onset (instant attack, punchy decay)
  sampleRate: number;
}

declare global {
  interface Window { __REACTIVE_FRAME__?: ReactiveFrame; }
}

export const useAudioAnalysis = (
  analyser: AnalyserNode | null,
  isPlaying: boolean,
  onDataUpdate: (data: AudioData) => void
) => {
  const animationFrameRef = useRef<number>();
  const dataArrayRef = useRef<Uint8Array<ArrayBuffer>>();
  const engineRef = useRef(createReactiveEngine());
  const smoothedFreqRef = useRef<number[]>([]);
  const boostBufRef = useRef<number[]>([]);
  const lastTimeRef = useRef<number>(0);
  // Live values read inside the loop via refs, so play/pause/seek never tears down
  // and restarts the rAF loop (that restart used to race and freeze the visualizer
  // when scrubbing the audio back and forth).
  const playingRef = useRef(isPlaying);
  const onUpdateRef = useRef(onDataUpdate);
  playingRef.current = isPlaying;
  onUpdateRef.current = onDataUpdate;

  useEffect(() => {
    if (!analyser) return;

    // Lowest-latency analyser: zero smoothing = raw transients (the engine owns envelopes).
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.0;
    dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
    lastTimeRef.current = performance.now();
    let stopped = false;

    const updateAudioData = () => {
      if (stopped) return;
      // Schedule the next frame FIRST so the loop is self-healing - a single persistent
      // loop that survives scrubbing/seeking instead of being restarted by an effect.
      animationFrameRef.current = requestAnimationFrame(updateAudioData);

      const now = performance.now();
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTimeRef.current) / 1000));
      lastTimeRef.current = now;

      const ctx = analyser.context;
      const sampleRate = ctx.sampleRate || 44100;
      const playing = playingRef.current;

      // Browsers auto-suspend the context on seek / backgrounding, which silently froze
      // the spectrum. Resume it whenever we expect audio.
      if (ctx.state === 'suspended' && playing) { (ctx as AudioContext).resume().catch(() => {}); }

      if (!dataArrayRef.current || !playing) {
        // Paused/scrubbing: zero everything so visualizers freeze, and bleed the engine down.
        const cfg = { ...useStudioStore.getState().reactivity, enabled: false };
        engineRef.current.update([0, 0, 0, 0, 0, 0, 0, 0], sampleRate, dt, cfg);
        const zeros = new Array(256).fill(0);
        (window as Window).__REACTIVE_FRAME__ = undefined;
        onUpdateRef.current({ frequency: zeros, frequencyRaw: zeros, amplitude: 0, beatStrength: 0, sampleRate });
        return;
      }

      analyser.getByteFrequencyData(dataArrayRef.current);
      const raw = dataArrayRef.current;
      const n = raw.length;

      // Light per-bin asymmetric smoothing: fast attack keeps transients, gentle
      // release tames per-frame spectral flicker before the engine analyses it.
      const sm = smoothedFreqRef.current;
      if (sm.length !== n) { sm.length = n; sm.fill(0); }
      for (let i = 0; i < n; i++) {
        const v = raw[i];
        const p = sm[i];
        sm[i] = v > p ? p + (v - p) * 0.92 : p + (v - p) * 0.5;
      }

      const store = useStudioStore.getState();
      const cfg = { ...store.reactivity, enabled: store.fractalReactivity.enabled !== false };

      // Run the transient engine, publish the rich frame, and boost the spectrum.
      const frame = engineRef.current.update(sm, sampleRate, dt, cfg);
      (window as Window).__REACTIVE_FRAME__ = frame;
      const boosted = engineRef.current.boost(sm, cfg, boostBufRef.current);

      // Pass the live reused arrays (no per-frame slice allocation) - the consumer
      // copies them into its stable ref synchronously.
      onUpdateRef.current({
        frequency: boosted,
        frequencyRaw: sm,
        amplitude: frame.level,
        beatStrength: frame.beat,
        sampleRate,
      });
    };

    updateAudioData();

    return () => {
      stopped = true;
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [analyser]);
};

export { DEFAULT_REACTIVITY };
