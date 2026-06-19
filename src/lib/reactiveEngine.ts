/**
 * Reactive audio engine - the single source of truth for transient-driven motion.
 *
 * Design goals (per spec):
 *  - React to DRUMS/onsets, not average loudness. Each band runs spectral-flux
 *    onset detection (rectified energy rise vs a running baseline), peak-normalised
 *    so it fires across genres/masters.
 *  - Exponential envelopes: near-instant attack (0-30 ms) and short punchy decay
 *    (80-250 ms) so movement SNAPS on impact then resets, without mush.
 *  - Separate smoothing PER frequency band (sub/bass/lowMid/highMid/high) so a
 *    kick doesn't smear the hats and vice-versa.
 *  - Adaptive normalisation + gain so quiet sections still move and loud sections
 *    don't peg. Soft-knee headroom keeps drops/hard hits feeling bigger.
 *  - Everything is tunable live via ReactivityConfig.
 *
 * Pure TS, no DOM/THREE deps, so it can be unit-tested and run anywhere.
 */

export interface ReactivityConfig {
  enabled: boolean;
  transientSensitivity: number; // 0..2 - how easily onsets fire (higher = touchier)
  attackMs: number;             // 0..40 - envelope rise time (near-instant)
  decayMs: number;              // 60..400 - transient fall time (punchy)
  bassResponse: number;         // 0..2 - sub+bass layer gain
  midResponse: number;          // 0..2 - low/high-mid layer gain
  highResponse: number;         // 0..2 - highs layer gain
  peakBoost: number;            // 0..2 - how much transients dominate over sustain
  smoothing: number;            // 0..1 - extra smoothing on sustained motion (low = sharp)
  motionIntensity: number;      // 0..2 - overall movement drive
  dynamics: number;             // 0..1 - adaptive normalisation strength (0 raw, 1 fully levelled)
}

// Default tuned toward "lively but not jarring": still snaps to drums, but with a
// gentler peak/transient dominance, more smoothing and a slightly longer decay so it
// doesn't strobe. Users can pick the Hard/Punchy presets for the old aggressive feel.
export const DEFAULT_REACTIVITY: ReactivityConfig = {
  enabled: true,
  transientSensitivity: 1.15,
  attackMs: 6,
  decayMs: 155,
  bassResponse: 1.15,
  midResponse: 1.05,
  highResponse: 1.15,
  peakBoost: 1.2,
  smoothing: 0.2,
  motionIntensity: 1.08,
  dynamics: 0.66,
};

/** Tasteful presets, all biased toward sharp impact. */
export const REACTIVITY_PRESETS: Record<string, Partial<ReactivityConfig>> = {
  hard:     { transientSensitivity: 1.6, attackMs: 2,  decayMs: 95,  peakBoost: 1.7, smoothing: 0.05, motionIntensity: 1.6, dynamics: 0.8 },
  punchy:   { transientSensitivity: 1.35, attackMs: 4, decayMs: 130, peakBoost: 1.45, smoothing: 0.1, motionIntensity: 1.35, dynamics: 0.72 },
  balanced: { transientSensitivity: 1.1, attackMs: 8,  decayMs: 180, peakBoost: 1.2, smoothing: 0.22, motionIntensity: 1.1, dynamics: 0.6 },
  smooth:   { transientSensitivity: 0.85, attackMs: 16, decayMs: 260, peakBoost: 0.9, smoothing: 0.4, motionIntensity: 0.95, dynamics: 0.45 },
};

export interface ReactiveFrame {
  // sustained, enveloped band levels (~0..1.7) - secondary motion
  sub: number; bass: number; lowMid: number; highMid: number; high: number;
  // sharp transient pulses per band (~0..1.7) - instant attack, punchy decay
  subHit: number; bassHit: number; lowMidHit: number; highMidHit: number; highHit: number;
  // legacy/aggregate channels
  bassBand: number;   // max(sub, bass) - kick/sub
  midBand: number;    // max(lowMid, highMid) - body/snare
  trebleBand: number; // high - hats/air
  level: number;      // overall enveloped level (adaptive)
  beat: number;       // master drum onset (kick+snare weighted), sharp
  punch: number;      // strongest transient across all bands
  flux: number;       // overall spectral flux (debug)
}

export const ZERO_FRAME: ReactiveFrame = {
  sub: 0, bass: 0, lowMid: 0, highMid: 0, high: 0,
  subHit: 0, bassHit: 0, lowMidHit: 0, highMidHit: 0, highHit: 0,
  bassBand: 0, midBand: 0, trebleBand: 0, level: 0, beat: 0, punch: 0, flux: 0,
};

interface BandDef { key: string; lo: number; hi: number; group: 'bass' | 'mid' | 'high'; }
const BANDS: BandDef[] = [
  { key: 'sub',     lo: 20,   hi: 60,    group: 'bass' },
  { key: 'bass',    lo: 60,   hi: 160,   group: 'bass' },
  { key: 'lowMid',  lo: 160,  hi: 500,   group: 'mid'  },
  { key: 'highMid', lo: 500,  hi: 2500,  group: 'mid'  },
  { key: 'high',    lo: 2500, hi: 16000, group: 'high' },
];

interface BandState {
  slow: number;     // running baseline (flux reference)
  env: number;      // sustained envelope
  hit: number;      // transient pulse
  peak: number;     // adaptive energy peak (for normalisation/gain)
  fluxPeak: number; // adaptive flux peak (for onset normalisation)
  gain: number;     // last adaptive gain (for frequency boost)
  i0: number; i1: number; // cached bin range
}

const SLOW_TAU = 0.32;      // s - flux baseline tracker
const PEAK_TAU = 1.6;       // s - energy peak decay
const FLUXPEAK_TAU = 1.1;   // s - flux peak decay
const ENERGY_FLOOR = 0.04;
const FLUX_FLOOR = 0.015;
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
// Soft-knee: near-linear for small x (so the punchy decay stays readable) and
// gently compresses large hits for headroom. Never saturates flat at the top.
const softclip = (x: number) => (x <= 0 ? 0 : x / (1 + 0.42 * x));

export interface ReactiveEngine {
  update: (freq: ArrayLike<number>, sampleRate: number, dt: number, cfg: ReactivityConfig) => ReactiveFrame;
  /** Transient-boost + adaptively gain a copy of the spectrum (for naive band-average visualizers). */
  boost: (freq: ArrayLike<number>, cfg: ReactivityConfig, out?: number[]) => number[];
}

export function createReactiveEngine(): ReactiveEngine {
  const states: BandState[] = BANDS.map(() => ({
    slow: 0, env: 0, hit: 0, peak: ENERGY_FLOOR, fluxPeak: FLUX_FLOOR, gain: 1, i0: 1, i1: 2,
  }));
  let levelEnv = 0;
  let lastLen = 0, lastBinHz = 0;

  const recomputeBins = (len: number, binHz: number) => {
    let prevHi = 0;
    for (let b = 0; b < BANDS.length; b++) {
      // non-overlapping bins so a kick doesn't leak into the low-mid onset, etc.
      const i0 = Math.max(1, prevHi + 1, Math.floor(BANDS[b].lo / binHz));
      const i1 = Math.max(i0, Math.min(len - 1, Math.floor(BANDS[b].hi / binHz)));
      states[b].i0 = i0; states[b].i1 = i1;
      prevHi = i1;
    }
    lastLen = len; lastBinHz = binHz;
  };

  const update = (freq: ArrayLike<number>, sampleRate: number, dt: number, cfg: ReactivityConfig): ReactiveFrame => {
    const len = freq.length;
    if (len < 8) return ZERO_FRAME;
    if (!cfg.enabled) {
      // bleed everything to zero so motion freezes cleanly
      for (const s of states) { s.env *= 0.6; s.hit *= 0.5; }
      levelEnv *= 0.6;
      return ZERO_FRAME;
    }
    dt = clamp(dt, 0.001, 0.05);
    const binHz = (sampleRate / 2) / len;
    if (len !== lastLen || binHz !== lastBinHz) recomputeBins(len, binHz);

    // exponential coefficients (frame-rate independent)
    const attackTau = Math.max(cfg.attackMs, 0.5) / 1000;
    const decayTau = Math.max(cfg.decayMs, 40) / 1000;
    const aAttack = 1 - Math.exp(-dt / attackTau);
    // sustained motion: attack slowed by `smoothing`, decay ~2.4x the hit decay
    const aAttackSust = aAttack * (1 - cfg.smoothing * 0.85);
    const aDecaySust = 1 - Math.exp(-dt / (decayTau * 2.4));
    const hitDecay = Math.exp(-dt / decayTau);

    const out: ReactiveFrame = { ...ZERO_FRAME };
    const hitByKey: Record<string, number> = {};
    const hitRawByKey: Record<string, number> = {};
    let totalEnergy = 0, maxFlux = 0, maxHit = 0;

    for (let b = 0; b < BANDS.length; b++) {
      const st = states[b];
      const def = BANDS[b];
      let sum = 0;
      for (let i = st.i0; i <= st.i1; i++) sum += freq[i] || 0;
      const energy = sum / (st.i1 - st.i0 + 1) / 255; // 0..1
      totalEnergy += energy;

      // baseline + adaptive peaks
      st.slow += (energy - st.slow) * (1 - Math.exp(-dt / SLOW_TAU));
      st.peak = Math.max(energy, st.peak * Math.exp(-dt / PEAK_TAU), ENERGY_FLOOR);
      const norm = energy / st.peak; // 0..1, adaptive (quiet sections rise)
      const ref = energy * (1 - cfg.dynamics) + norm * cfg.dynamics;

      // spectral-flux onset, peak-normalised so it fires across loudness levels
      const flux = Math.max(0, energy - st.slow);
      st.fluxPeak = Math.max(flux, st.fluxPeak * Math.exp(-dt / FLUXPEAK_TAU), FLUX_FLOOR);
      const transient = clamp((flux / st.fluxPeak) * cfg.transientSensitivity, 0, 1.35);
      if (flux > maxFlux) maxFlux = flux;

      // sustained envelope (secondary motion): asymmetric, smoothing-aware
      if (ref > st.env) st.env += (ref - st.env) * aAttackSust;
      else st.env += (ref - st.env) * aDecaySust;

      // transient pulse (primary motion): instant attack to the onset, exp decay
      st.hit = Math.max(st.hit * hitDecay, transient);

      // adaptive gain for the frequency-boost path (normalise quiet up, clamp)
      st.gain = clamp(1 * (1 - cfg.dynamics) + (1 / st.peak) * cfg.dynamics, 0.6, 4.5);

      const resp = def.group === 'bass' ? cfg.bassResponse : def.group === 'mid' ? cfg.midResponse : cfg.highResponse;
      const sustainedRaw = st.env * resp;
      const hitRaw = st.hit * resp;
      const hitOut = clamp(hitRaw * cfg.motionIntensity, 0, 1.9);
      hitByKey[def.key] = hitOut;
      hitRawByKey[def.key] = hitRaw;
      if (hitOut > maxHit) maxHit = hitOut;

      // combined band: transient-dominant + a little sustained body. Kept LINEAR
      // (peak sits under the safety clamp) so the ratio-decay exactly tracks the
      // punchy hit envelope - no saturation "hold" that smears the reset.
      const combined = hitRaw * cfg.peakBoost * 0.55 + sustainedRaw * 0.4;
      (out as unknown as Record<string, number>)[def.key] = clamp(combined * cfg.motionIntensity, 0, 1.9);
    }

    out.subHit = hitByKey.sub; out.bassHit = hitByKey.bass; out.lowMidHit = hitByKey.lowMid;
    out.highMidHit = hitByKey.highMid; out.highHit = hitByKey.high;
    out.bassBand = Math.max(out.sub, out.bass);
    out.midBand = Math.max(out.lowMid, out.highMid);
    out.trebleBand = out.high;

    // overall adaptive level (secondary)
    const energyAvg = totalEnergy / BANDS.length;
    if (energyAvg > levelEnv) levelEnv += (energyAvg - levelEnv) * aAttackSust;
    else levelEnv += (energyAvg - levelEnv) * aDecaySust;
    out.level = clamp(softclip(levelEnv * 1.3) * cfg.motionIntensity, 0, 1.7);

    // master drum onset: kick (sub+bass) leads, snare/clap (low/high-mid) adds.
    // Built from the pre-motion raw hits so the soft-knee stays in its linear
    // (readable-decay) region; motion drive applied last.
    const drum = Math.max(hitRawByKey.sub, hitRawByKey.bass) + Math.max(hitRawByKey.lowMid, hitRawByKey.highMid) * 0.5;
    out.beat = clamp(drum * cfg.peakBoost * 0.55 * cfg.motionIntensity, 0, 1.9);
    out.punch = clamp(maxHit, 0, 1.9);
    out.flux = maxFlux;
    return out;
  };

  const boost = (freq: ArrayLike<number>, cfg: ReactivityConfig, out: number[] = []): number[] => {
    const len = freq.length;
    out.length = len;
    if (!cfg.enabled) { for (let i = 0; i < len; i++) out[i] = 0; return out; }
    // per-bin boost factor from its band's adaptive gain + transient pulse
    const factor = new Float32Array(len).fill(1);
    for (let b = 0; b < BANDS.length; b++) {
      const st = states[b];
      const def = BANDS[b];
      const resp = def.group === 'bass' ? cfg.bassResponse : def.group === 'mid' ? cfg.midResponse : cfg.highResponse;
      // transient injection: spectrum spikes on onsets; adaptive gain lifts quiet parts
      const f = clamp(st.gain * (1 + st.hit * cfg.peakBoost * 0.9) * (0.7 + 0.55 * cfg.motionIntensity) * resp, 0.4, 7);
      for (let i = st.i0; i <= st.i1; i++) factor[i] = f;
    }
    for (let i = 0; i < len; i++) out[i] = clamp((freq[i] || 0) * factor[i], 0, 255);
    return out;
  };

  return { update, boost };
}
