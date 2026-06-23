/**
 * Sand flow-field visualizer config. Tens of thousands of particles are emitted
 * from the outline of a SHAPE and stream outward, forming a glowing sandy form.
 *
 * Shapes are limitless: a Gielis superformula (m, n1, n2, n3) covers standard
 * forms (circles, polygons, stars, flowers, gears) across a continuous space,
 * and a harmonic mode (random sinusoids) covers very abstract organic outlines.
 * A prompt can steer the shape; otherwise it is fully random.
 */
export type ShapeMode =
  | 'super' | 'harmonic' | 'heart'
  | 'rose' | 'lissajous' | 'spiral' | 'star' | 'polygon' | 'gear'
  | 'epicycloid' | 'hypocycloid' | 'astroid' | 'lemniscate' | 'cardioid'
  | 'butterfly' | 'superellipse' | 'cross' | 'crescent' | 'wave_ring'
  | 'flower_layered' | 'infinity' | 'teardrop' | 'spirograph';

export interface ShapeDesc {
  mode: ShapeMode;
  m: number; n1: number; n2: number; n3: number; // superformula
  harmonics: number[];                            // flat [freq, amp, phase, ...]
  // Generic optional params reused by the new modes (kept flat & cheap).
  k?: number;   // primary frequency / petal / point / tooth / lobe count
  a?: number;   // primary radius / amplitude / scale
  b?: number;   // secondary radius / amplitude
  p?: number;   // phase / offset / ratio
  q?: number;   // secondary frequency / exponent / depth
}

export interface SandConfig {
  id: string;
  name: string;
  emoji: string;
  shape: ShapeDesc;
  palette: [string, string]; // cool (far/old) -> hot (near/new)
  count: number;
  speed: number;
  swirl: number;
  spread: number;
  pointSize: number;  // fine dust vs chunky grains
  flow: number;       // 0 = tight radial burst, 1 = swirly turbulent streams
}

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const hsl = (h: number, s: number, l: number) => {
  h = ((h % 360) + 360) % 360 / 360; s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => { const k = (n + h * 12) % 12; const c = l - a * Math.max(-1, Math.min(Math.min(k - 3, 9 - k), 1)); return Math.round(255 * c).toString(16).padStart(2, '0'); };
  return `#${f(0)}${f(8)}${f(4)}`;
};
const promptHue = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) { h = (h << 5) - h + s.charCodeAt(i); h |= 0; } return Math.abs(h) % 360; };

const sup = (m: number, n1: number, n2: number, n3: number): ShapeDesc => ({ mode: 'super', m, n1, n2, n3, harmonics: [] });
// Base descriptor for the parametric modes (superformula fields go unused).
const base = (mode: ShapeMode, params: Partial<ShapeDesc> = {}): ShapeDesc =>
  ({ mode, m: 0, n1: 1, n2: 1, n3: 1, harmonics: [], ...params });

function randomHarmonic(r: () => number): ShapeDesc {
  const n = 3 + Math.floor(r() * 4);
  const h: number[] = [];
  for (let i = 0; i < n; i++) h.push(Math.round(lerp(2, 9, r())), lerp(0.1, 0.45, r()) / (i + 1), r() * Math.PI * 2);
  return { mode: 'harmonic', m: 0, n1: 1, n2: 1, n3: 1, harmonics: h };
}

// Builders for every new mode - each randomizes its own params so even the
// same mode looks different roll to roll.
const SHAPE_BUILDERS: Array<(r: () => number) => ShapeDesc> = [
  // existing families (kept generously represented)
  (r) => sup(Math.round(lerp(2, 14, r())), lerp(0.3, 8, r()), lerp(0.3, 8, r()), lerp(0.3, 8, r())),
  (r) => randomHarmonic(r),
  () => base('heart'),
  // new families
  (r) => base('rose', { k: Math.round(lerp(2, 9, r())), p: r() < 0.5 ? 0 : 1 }),
  (r) => base('lissajous', { k: Math.round(lerp(2, 6, r())), q: Math.round(lerp(2, 6, r())), p: r() * Math.PI }),
  (r) => base('spiral', { k: Math.round(lerp(2, 6, r())), p: r() < 0.5 ? 0 : 1, a: lerp(0.2, 0.5, r()) }),
  (r) => base('star', { k: Math.round(lerp(5, 12, r())), a: lerp(0.35, 0.7, r()) }),
  (r) => base('polygon', { k: Math.round(lerp(3, 9, r())), p: r() * Math.PI }),
  (r) => base('gear', { k: Math.round(lerp(8, 20, r())), a: lerp(0.08, 0.22, r()), q: lerp(0.45, 0.75, r()) }),
  (r) => base('epicycloid', { k: Math.round(lerp(2, 8, r())) }),
  (r) => base('hypocycloid', { k: Math.round(lerp(3, 8, r())) }),
  () => base('astroid'),
  (r) => base('lemniscate', { a: lerp(0.9, 1.15, r()) }),
  () => base('cardioid'),
  () => base('butterfly'),
  (r) => base('superellipse', { q: lerp(2.2, 6, r()), b: lerp(0.7, 1, r()) }),
  (r) => base('cross', { a: lerp(0.28, 0.5, r()) }),
  (r) => base('crescent', { a: lerp(0.3, 0.6, r()) }),
  (r) => base('wave_ring', { k: Math.round(lerp(6, 18, r())), a: lerp(0.08, 0.25, r()) }),
  (r) => base('flower_layered', { k: Math.round(lerp(3, 7, r())), q: Math.round(lerp(8, 16, r())), a: lerp(0.12, 0.28, r()), b: lerp(0.05, 0.14, r()) }),
  () => base('infinity'),
  (r) => base('teardrop', { p: r() < 0.5 ? -1 : 1 }),
  (r) => base('spirograph', { k: Math.round(lerp(3, 7, r())), q: Math.round(lerp(2, 5, r())), a: lerp(0.3, 0.6, r()) }),
];

function randomShape(r: () => number): ShapeDesc {
  const idx = Math.floor(r() * SHAPE_BUILDERS.length);
  return SHAPE_BUILDERS[idx](r);
}

// Prompt keyword -> shape. Falls through to a prompt-seeded random shape.
export function sandShapeFromPrompt(prompt: string, seed: number): ShapeDesc {
  const p = prompt.toLowerCase();
  const r = rng(seed);
  if (/\bheart\b|\blove\b/.test(p)) return base('heart');
  if (/\brose\b|\brhodonea\b|\bpetal(s)?\b/.test(p)) return base('rose', { k: Math.round(lerp(3, 8, r())) });
  if (/\bflower\b|\bbloom\b|\bdaisy\b/.test(p)) return base('flower_layered', { k: Math.round(lerp(4, 7, r())), q: Math.round(lerp(8, 14, r())), a: lerp(0.14, 0.26, r()), b: lerp(0.06, 0.12, r()) });
  if (/\bstar\b|\bsparkle\b/.test(p)) return base('star', { k: Math.round(lerp(5, 8, r())), a: lerp(0.4, 0.6, r()) });
  if (/\bgear\b|\bcog\b|\bsaw\b/.test(p)) return base('gear', { k: Math.round(lerp(10, 18, r())), a: lerp(0.1, 0.2, r()), q: 0.6 });
  if (/\bwheel\b|\bspike(s)?\b/.test(p)) return base('gear', { k: Math.round(lerp(12, 20, r())), a: lerp(0.12, 0.22, r()), q: 0.55 });
  if (/\binfinity\b|\bfigure.?8\b|\bfigure.?eight\b/.test(p)) return base('infinity');
  if (/\blemniscate\b/.test(p)) return base('lemniscate', { a: 1 });
  if (/\bcardioid\b|\bapple\b/.test(p)) return base('cardioid');
  if (/\bspiral\b|\bswirl\b/.test(p)) return base('spiral', { k: Math.round(lerp(3, 6, r())), p: r() < 0.5 ? 0 : 1, a: lerp(0.25, 0.5, r()) });
  if (/\bspirograph\b/.test(p)) return base('spirograph', { k: Math.round(lerp(3, 7, r())), q: Math.round(lerp(2, 5, r())), a: lerp(0.3, 0.6, r()) });
  if (/\blissajous\b/.test(p)) return base('lissajous', { k: Math.round(lerp(2, 5, r())), q: Math.round(lerp(2, 5, r())), p: r() * Math.PI });
  if (/\bbutterfly\b|\bmoth\b/.test(p)) return base('butterfly');
  if (/\bcross\b|\bplus\b/.test(p)) return base('cross', { a: lerp(0.3, 0.5, r()) });
  if (/\bcrescent\b|\bmoon\b/.test(p)) return base('crescent', { a: lerp(0.35, 0.55, r()) });
  if (/\bteardrop\b|\btear\b|\bdrop\b/.test(p)) return base('teardrop', { p: r() < 0.5 ? -1 : 1 });
  if (/\bastroid\b|\bstarfish\b/.test(p)) return base('astroid');
  if (/\bepicycloid\b/.test(p)) return base('epicycloid', { k: Math.round(lerp(3, 7, r())) });
  if (/\bhypocycloid\b/.test(p)) return base('hypocycloid', { k: Math.round(lerp(3, 7, r())) });
  if (/\bsquircle\b|\bsuperellipse\b|\brounded square\b/.test(p)) return base('superellipse', { q: lerp(3, 5, r()), b: 1 });
  if (/\bcircle\b|\bball\b|\bsun\b|\borb\b|\bround\b|\bcoin\b/.test(p)) return sup(8, 8, 8, 8);
  if (/\bsquare\b|\bbox\b|\bblock\b/.test(p)) return sup(4, 10, 10, 10);
  if (/\btriangle\b|\btri\b|\bpyramid\b/.test(p)) return sup(3, 10, 10, 10);
  if (/\bpentagon\b/.test(p)) return base('polygon', { k: 5, p: 0 });
  if (/\bhexagon\b|\bhex\b/.test(p)) return base('polygon', { k: 6, p: 0 });
  if (/\bpolygon\b/.test(p)) return base('polygon', { k: Math.round(lerp(3, 9, r())), p: 0 });
  if (/\bdiamond\b|\bgem\b/.test(p)) return sup(4, 1, 1, 1);
  return randomShape(rng(seed)); // abstract / anything else
}

const SHAPE_EMOJI: Partial<Record<ShapeMode, string>> = {
  heart: '🩶', harmonic: '✺', super: '✴️',
  rose: '🌹', lissajous: '🪢', spiral: '🌀', star: '⭐', polygon: '⬡',
  gear: '⚙️', epicycloid: '🎡', hypocycloid: '🔺', astroid: '✦', lemniscate: '∞',
  cardioid: '🍎', butterfly: '🦋', superellipse: '🔲', cross: '➕', crescent: '🌙',
  wave_ring: '〰️', flower_layered: '🌸', infinity: '♾️', teardrop: '💧', spirograph: '❇️',
};

export function randomSand(seed: number, opts: { shape?: ShapeDesc; hueBase?: number; label?: string } = {}): SandConfig {
  const r = rng(seed * 9 + 3);
  const shape = opts.shape ?? randomShape(r);
  const hue = opts.hueBase ?? r() * 360;
  const emoji = SHAPE_EMOJI[shape.mode] ?? '✴️';
  return {
    id: `sand_${seed}`,
    name: opts.label ?? 'Sand',
    emoji,
    shape,
    palette: [hsl(hue, 25 + r() * 30, 36 + r() * 12), hsl((hue + lerp(10, 50, r())) % 360, 70 + r() * 20, 80 + r() * 14)],
    count: Math.round(lerp(16000, 34000, r())),
    speed: lerp(0.35, 1.3, r()),
    swirl: lerp(0.3, 1.8, r()),
    spread: lerp(1.2, 3.0, r()),
    pointSize: lerp(1.6, 4.2, r()),
    flow: r(),
  };
}

export function sandFromPrompt(prompt: string, seed: number, label?: string): SandConfig {
  return randomSand(seed, { shape: sandShapeFromPrompt(prompt, seed), hueBase: prompt ? promptHue(prompt.toLowerCase()) : undefined, label });
}

export const SAND_PRESETS: SandConfig[] = [
  randomSand(701, { shape: base('heart'), hueBase: 44, label: 'Sand Heart' }),
  randomSand(702, { shape: base('star', { k: 6, a: 0.45 }), hueBase: 200, label: 'Sand Star' }),
  randomSand(703, { shape: base('flower_layered', { k: 5, q: 12, a: 0.22, b: 0.1 }), hueBase: 320, label: 'Sand Bloom' }),
  randomSand(704, { shape: sup(8, 0.5, 1.2, 1.2), hueBase: 130, label: 'Sand Abstract' }),
  randomSand(705, { shape: base('rose', { k: 5, p: 0 }), hueBase: 350, label: 'Sand Rose' }),
  randomSand(706, { shape: base('gear', { k: 14, a: 0.16, q: 0.6 }), hueBase: 28, label: 'Sand Gear' }),
  randomSand(707, { shape: base('infinity'), hueBase: 265, label: 'Sand Infinity' }),
  randomSand(708, { shape: base('butterfly'), hueBase: 100, label: 'Sand Butterfly' }),
  randomSand(709, { shape: base('spiral', { k: 4, p: 1, a: 0.4 }), hueBase: 180, label: 'Sand Spiral' }),
  randomSand(710, { shape: base('lissajous', { k: 3, q: 4, p: Math.PI / 2 }), hueBase: 50, label: 'Sand Lissajous' }),
  // 70 more form-varied rolls -> 80 browsable bases
  ...Array.from({ length: 70 }, (_, i) => randomSand(720 + i * 37 + i * i * 3, { label: `Sand Flow ${i + 11}` })),
].map((c, i) => ({ ...c, id: `SandFlow${i}` }));
