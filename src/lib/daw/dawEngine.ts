/**
 * DAW Waveform / Spectrogram Hybrid - engine.
 *
 * Analyses the *actual* uploaded track once (decoded PCM) into a cached bundle:
 *  - env  : per-column peak envelope (the classic DAW waveform shape)
 *  - rms  : per-column RMS (body / thickness)
 *  - envL / envR : per-channel envelopes (stereo mode)
 *  - spectro : an FFT magnitude heatmap [cols × bands] (the spectrogram panel)
 * Everything downstream is driven by this real data; live transient reactivity is
 * layered on top via the shared reactive engine.
 */

export type DawLayout = 'split' | 'full' | 'stacked' | 'minimal';
export type WaveAlign = 'center' | 'top' | 'bottom' | 'mirror';
export type WaveMode =
  | 'filled' | 'line' | 'bars' | 'pixel' | 'mirrored'
  | 'smoothed' | 'clipped' | 'glitch' | 'stereo' | 'freqsep'
  | 'granular' | 'peakhold';
export type SpectroPlacement = 'left' | 'right' | 'top' | 'bottom' | 'background';
export type PlayMode = 'static' | 'scroll';

export interface DawConfig {
  id: string;
  name: string;
  emoji: string;
  seed: number;
  layout: DawLayout;
  playMode: PlayMode;
  background: string;            // hex, or 'transparent' to composite over a clip
  // waveform
  waveMode: WaveMode;
  waveAlign: WaveAlign;
  waveColor: string;
  waveColor2: string;            // gradient end
  waveHeight: number;            // 0..1 of its panel
  waveThickness: number;         // px for line/bar modes
  waveDensity: number;           // bar/pixel coarseness (0.2..1)
  fillOpacity: number;           // 0..1
  symmetry: boolean;
  glow: number;                  // 0..40 shadow blur px
  edgeRoughness: number;         // 0..1 audio-locked jitter
  clipping: number;              // 0..1 hard clip of the envelope
  smoothing: number;             // 0..1 visual smoothing
  scanlines: number;             // 0..1 waveform scanline overlay
  glowTrails: number;            // 0..1 persistence
  // reactivity
  peakSensitivity: number;       // 0..2
  transientSensitivity: number;  // 0..2
  bassResponse: number;          // 0..2
  midResponse: number;           // 0..2
  highResponse: number;          // 0..2
  beatPulse: number;             // 0..0.5 vertical scale on beat
  scrollSpeed: number;           // seconds of audio across the panel in scroll mode
  // spectrogram
  spectro: boolean;
  spectroPlacement: SpectroPlacement;
  spectroPalette: number;
  spectroIntensity: number;      // 0..2
  spectroContrast: number;       // 0..2
  spectroNoise: number;          // 0..1
  spectroScanlines: number;      // 0..1
  spectroGlitch: number;         // 0..1
  // overlays / chrome
  grain: number;                 // 0..1
  glitch: number;                // 0..1 horizontal tearing
  playhead: boolean;
  progressBar: boolean;
}

/** Spectrogram heatmap palettes (low energy → high energy color stops). */
export const SPECTRO_PALETTES: { name: string; stops: string[] }[] = [
  { name: 'Magenta',  stops: ['#000000', '#1a0030', '#5e0a8a', '#c71585', '#ff1493', '#ff3b3b', '#00e5ff'] },
  { name: 'Inferno',  stops: ['#000000', '#1b0c3b', '#7d1a6f', '#d94343', '#ff8a00', '#ffd000', '#fff5c0'] },
  { name: 'Ice',      stops: ['#000000', '#031326', '#0a3a66', '#1e7fd0', '#46c8ff', '#a8ecff', '#ffffff'] },
  { name: 'Matrix',   stops: ['#000000', '#021a06', '#0a4d18', '#1aa83a', '#4dff7a', '#c8ffd6', '#ffffff'] },
];

export interface DawAudioData {
  env: Float32Array;     // 0..1 peak envelope (mono)
  rms: Float32Array;     // 0..1
  envL: Float32Array;
  envR: Float32Array;
  cols: number;          // waveform columns
  spectro: Uint8Array;   // [sCols * bands], 0..255
  sCols: number;
  bands: number;
  duration: number;
}

const WAVE_COLS = 2048;
const SPECTRO_COLS = 640;
const SPECTRO_BANDS = 110;
const FFT_SIZE = 1024;

const cache = new Map<string, DawAudioData>();
const inflight = new Map<string, Promise<DawAudioData | null>>();

/* ---- compact iterative radix-2 FFT (in-place, complex) ---- */
function fft(re: Float32Array, im: Float32Array) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { const tr = re[i]; re[i] = re[j]; re[j] = tr; const ti = im[i]; im[i] = im[j]; im[j] = ti; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k, b = i + k + len / 2;
        const xr = re[b] * cr - im[b] * ci;
        const xi = re[b] * ci + im[b] * cr;
        re[b] = re[a] - xr; im[b] = im[a] - xi;
        re[a] += xr; im[a] += xi;
        const ncr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = ncr;
      }
    }
  }
}

function buildEnvelopes(ch: Float32Array, cols: number): { env: Float32Array; rms: Float32Array } {
  const env = new Float32Array(cols), rms = new Float32Array(cols);
  const step = ch.length / cols;
  for (let c = 0; c < cols; c++) {
    const s = Math.floor(c * step), e = Math.min(ch.length, Math.floor((c + 1) * step));
    let peak = 0, sum = 0;
    for (let i = s; i < e; i++) { const v = Math.abs(ch[i]); if (v > peak) peak = v; sum += ch[i] * ch[i]; }
    env[c] = peak;
    rms[c] = Math.sqrt(sum / Math.max(1, e - s));
  }
  // normalize to the loudest peak so quiet masters still fill the panel
  let max = 1e-6; for (let i = 0; i < cols; i++) if (env[i] > max) max = env[i];
  const inv = 1 / max;
  for (let i = 0; i < cols; i++) { env[i] = Math.min(1, env[i] * inv); rms[i] = Math.min(1, rms[i] * inv); }
  return { env, rms };
}

function buildSpectrogram(mono: Float32Array, sampleRate: number): Uint8Array {
  const out = new Uint8Array(SPECTRO_COLS * SPECTRO_BANDS);
  const re = new Float32Array(FFT_SIZE), im = new Float32Array(FFT_SIZE);
  // Hann window
  const win = new Float32Array(FFT_SIZE);
  for (let i = 0; i < FFT_SIZE; i++) win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (FFT_SIZE - 1));
  const half = FFT_SIZE / 2;
  // log-spaced band edges across the usable spectrum
  const bandBin = new Int32Array(SPECTRO_BANDS + 1);
  for (let b = 0; b <= SPECTRO_BANDS; b++) {
    const t = b / SPECTRO_BANDS;
    bandBin[b] = Math.min(half - 1, Math.floor(Math.pow(t, 2.1) * (half - 1)) + 1);
  }
  const hop = Math.max(1, Math.floor((mono.length - FFT_SIZE) / SPECTRO_COLS));
  for (let c = 0; c < SPECTRO_COLS; c++) {
    const start = c * hop;
    for (let i = 0; i < FFT_SIZE; i++) { const s = start + i; re[i] = (s < mono.length ? mono[s] : 0) * win[i]; im[i] = 0; }
    fft(re, im);
    for (let b = 0; b < SPECTRO_BANDS; b++) {
      let m = 0;
      const lo = bandBin[b], hi = Math.max(bandBin[b] + 1, bandBin[b + 1]);
      for (let k = lo; k < hi; k++) { const mag = re[k] * re[k] + im[k] * im[k]; if (mag > m) m = mag; }
      // log-compress to dB-ish 0..255
      const db = Math.log10(m + 1e-9) * 10;
      out[c * SPECTRO_BANDS + b] = Math.max(0, Math.min(255, Math.round((db + 90) * 3.4)));
    }
  }
  return out;
}

/** Analyse (and cache) the track at `url`. Returns null on failure. */
export function analyzeDawAudio(url: string): Promise<DawAudioData | null> {
  if (cache.has(url)) return Promise.resolve(cache.get(url)!);
  if (inflight.has(url)) return inflight.get(url)!;
  const p = (async () => {
    try {
      const W = window as any;
      const ctx: AudioContext = W.__AUDIO_CTX__ || (W.__AUDIO_CTX__ = new (window.AudioContext || W.webkitAudioContext)());
      const buf = await (await fetch(url)).arrayBuffer();
      const audio: AudioBuffer = await ctx.decodeAudioData(buf.slice(0));
      const L = audio.getChannelData(0);
      const R = audio.numberOfChannels > 1 ? audio.getChannelData(1) : L;
      const mono = new Float32Array(L.length);
      for (let i = 0; i < L.length; i++) mono[i] = (L[i] + R[i]) * 0.5;
      const m = buildEnvelopes(mono, WAVE_COLS);
      const l = buildEnvelopes(L, WAVE_COLS);
      const r = buildEnvelopes(R, WAVE_COLS);
      const data: DawAudioData = {
        env: m.env, rms: m.rms, envL: l.env, envR: r.env,
        cols: WAVE_COLS,
        spectro: buildSpectrogram(mono, audio.sampleRate),
        sCols: SPECTRO_COLS, bands: SPECTRO_BANDS, duration: audio.duration,
      };
      cache.set(url, data);
      return data;
    } catch (e) {
      console.warn('DAW analyse failed', e);
      return null;
    } finally {
      inflight.delete(url);
    }
  })();
  inflight.set(url, p);
  return p;
}

/* ---------------- presets ---------------- */
const BASE: DawConfig = {
  id: 'daw', name: 'DAW', emoji: '🎛️', seed: 1, layout: 'full', playMode: 'scroll',
  background: '#000000',
  waveMode: 'filled', waveAlign: 'center', waveColor: '#19e6ff', waveColor2: '#2a7bff',
  waveHeight: 0.7, waveThickness: 2, waveDensity: 1, fillOpacity: 0.9, symmetry: true,
  glow: 10, edgeRoughness: 0, clipping: 0, smoothing: 0.15, scanlines: 0, glowTrails: 0,
  peakSensitivity: 1, transientSensitivity: 1.2, bassResponse: 1, midResponse: 1, highResponse: 1,
  beatPulse: 0.12, scrollSpeed: 6,
  spectro: false, spectroPlacement: 'left', spectroPalette: 0, spectroIntensity: 1,
  spectroContrast: 1, spectroNoise: 0.06, spectroScanlines: 0.15, spectroGlitch: 0,
  grain: 0.05, glitch: 0, playhead: true, progressBar: true,
};

const DAW_CURATED: DawConfig[] = [
  { ...BASE, id: 'DawSeratoBlue', name: 'Serato Blue', emoji: '🟦',
    layout: 'full', waveMode: 'filled', waveColor: '#1fd0ff', waveColor2: '#1f8bff',
    glow: 6, beatPulse: 0.1, spectro: false, playhead: true, progressBar: false, grain: 0.03 },
  { ...BASE, id: 'DawPurpleSpectral', name: 'Purple Spectral', emoji: '🟪',
    layout: 'split', waveMode: 'filled', waveColor: '#19e6ff', waveColor2: '#37b6ff',
    glow: 12, spectro: true, spectroPlacement: 'left', spectroPalette: 0, spectroIntensity: 1.25,
    spectroScanlines: 0.2, beatPulse: 0.14, progressBar: true },
  { ...BASE, id: 'DawBassFace', name: 'Bass Face', emoji: '🔊',
    layout: 'full', waveMode: 'mirrored', waveAlign: 'mirror', waveColor: '#22f0ff', waveColor2: '#6a3bff',
    waveHeight: 0.82, waveThickness: 3, glow: 22, beatPulse: 0.28, bassResponse: 1.6,
    transientSensitivity: 1.5, spectro: false, grain: 0.06 },
  { ...BASE, id: 'DawGlitchDAW', name: 'Glitch DAW', emoji: '📟',
    layout: 'stacked', waveMode: 'pixel', waveColor: '#19e6ff', waveColor2: '#ff1493',
    waveDensity: 0.5, glow: 8, edgeRoughness: 0.35, glitch: 0.4, spectro: true, spectroPlacement: 'top',
    spectroNoise: 0.18, spectroGlitch: 0.4, spectroScanlines: 0.3, grain: 0.12, beatPulse: 0.16 },
  { ...BASE, id: 'DawCleanLabel', name: 'Clean Label', emoji: '⬛',
    layout: 'minimal', waveMode: 'line', waveColor: '#15d8ff', waveColor2: '#15d8ff',
    waveHeight: 0.42, waveThickness: 2, glow: 4, beatPulse: 0.08, smoothing: 0.4,
    spectro: false, playhead: false, progressBar: true, grain: 0.02 },
  { ...BASE, id: 'DawFestivalClip', name: 'Festival Clip', emoji: '🎆',
    layout: 'full', waveMode: 'filled', waveColor: '#00f0ff', waveColor2: '#ff1493',
    waveHeight: 0.9, glow: 34, beatPulse: 0.34, peakSensitivity: 1.4, transientSensitivity: 1.7,
    bassResponse: 1.4, highResponse: 1.4, spectro: true, spectroPlacement: 'background',
    spectroIntensity: 0.7, spectroPalette: 0, grain: 0.07, scanlines: 0.12 },
];

// 80 browsable bases: 6 curated + 74 deterministic layout x mode x palette combos.
const DAW_GEN_MODES: WaveMode[] = ['filled', 'mirrored', 'line', 'bars', 'pixel', 'smoothed', 'clipped', 'glitch', 'stereo', 'freqsep', 'granular', 'peakhold'];
const DAW_GEN_LAYOUTS: DawLayout[] = ['full', 'split', 'stacked', 'minimal'];
const DAW_GEN_COLORS: [string, string][] = [
  ['#1fd0ff', '#1f8bff'], ['#22f0ff', '#6a3bff'], ['#19e6ff', '#ff1493'], ['#00f0ff', '#ff8a00'],
  ['#a4f573', '#19e6ff'], ['#ff73b7', '#7a3bff'], ['#15d8ff', '#15d8ff'], ['#ffd23f', '#ff5e3a'],
];
const DAW_GEN_PLACE = ['left', 'right', 'top', 'background'] as const;
export const DAW_PRESETS: DawConfig[] = [
  ...DAW_CURATED,
  // Mixed-radix mapping so each preset's (layout, mode, color) triple is UNIQUE
  // across all 74 - the old (i%4, (i+1)%12, i%8) cycled every 24 and produced
  // near-identical presets (DAW 7 == DAW 31 == DAW 55).
  ...Array.from({ length: 74 }, (_, i): DawConfig => {
    const layout = DAW_GEN_LAYOUTS[i % 4];              // period 4
    const mode = DAW_GEN_MODES[Math.floor(i / 4) % 12]; // period 48
    const col = DAW_GEN_COLORS[Math.floor(i / 48) % DAW_GEN_COLORS.length]; // flips after the 48 layout×mode combos
    return {
      ...BASE, id: `DawGen${i}`, name: `DAW ${i + 7}`, emoji: '🎛️',
      layout, waveMode: mode,
      waveColor: col[0], waveColor2: col[1], waveHeight: 0.45 + (i % 6) * 0.09, waveThickness: 2 + (i % 3),
      glow: 5 + (i % 7) * 5, beatPulse: 0.08 + (i % 5) * 0.05,
      spectro: i % 3 === 0, spectroPlacement: DAW_GEN_PLACE[i % DAW_GEN_PLACE.length], spectroPalette: i % 5,
      spectroIntensity: 0.7 + (i % 4) * 0.2, grain: (i % 4) * 0.03,
    };
  }),
];

export const DAW_BASE = BASE;

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Roll a random-but-deterministic DAW look (for the generator). */
export function randomDaw(seed: number, opts: { label?: string } = {}): DawConfig {
  const r = rng(seed * 7 + 11);
  const base = DAW_PRESETS[Math.floor(r() * DAW_PRESETS.length)];
  const layouts: DawLayout[] = ['split', 'full', 'stacked', 'minimal'];
  const modes: WaveMode[] = ['filled', 'mirrored', 'line', 'bars', 'pixel', 'smoothed', 'clipped', 'glitch', 'stereo', 'freqsep', 'granular', 'peakhold'];
  const places: SpectroPlacement[] = ['left', 'right', 'top', 'bottom', 'background'];
  // Primary wave stays on the cyan/electric-blue brand aesthetic. Magenta/violet
  // are reserved as a rare *secondary* accent so the generator never rolls an
  // off-brand magenta-on-purple look.
  const cyan = ['#19e6ff', '#1fd0ff', '#00f0ff', '#22f0ff', '#15d8ff', '#37b6ff', '#3a8dff', '#0affd9'];
  const accent = ['#7a3cff', '#ff1493', '#a64bff'];
  const layout = layouts[Math.floor(r() * layouts.length)];
  const spectro = layout === 'minimal' ? false : layout === 'split' || layout === 'stacked' ? true : r() < 0.6;
  return {
    ...base,
    id: `daw_${seed}`,
    name: opts.label ?? 'DAW Waveform',
    seed: 1 + Math.floor(r() * 998),
    layout,
    waveMode: modes[Math.floor(r() * modes.length)],
    waveAlign: r() < 0.25 ? 'mirror' : 'center',
    // Primary always cyan; secondary is usually a second cyan, occasionally (~22%) an accent.
    waveColor: cyan[Math.floor(r() * cyan.length)],
    waveColor2: r() < 0.22 ? accent[Math.floor(r() * accent.length)] : cyan[Math.floor(r() * cyan.length)],
    waveHeight: 0.45 + r() * 0.5,
    waveThickness: 1.5 + r() * 4,
    glow: Math.floor(r() * 32),
    beatPulse: 0.06 + r() * 0.28,
    fillOpacity: 0.7 + r() * 0.3,
    edgeRoughness: r() < 0.4 ? r() * 0.3 : 0,
    glowTrails: r() < 0.3 ? r() * 0.55 : 0,
    smoothing: r() * 0.4,
    spectro,
    spectroPlacement: layout === 'split' ? (r() < 0.5 ? 'left' : 'right') : places[Math.floor(r() * places.length)],
    spectroPalette: Math.floor(r() * SPECTRO_PALETTES.length),
    spectroIntensity: 0.7 + r() * 0.8,
    spectroNoise: r() * 0.18,
    spectroScanlines: r() * 0.3,
    grain: r() * 0.12,
    glitch: r() < 0.3 ? r() * 0.4 : 0,
  };
}
