/**
 * Fractal Frequencies engine
 * ---------------------------------------------------------------------------
 * A data model + seeded randomizer for shader-driven fractal visualizers.
 * The actual rendering is GLSL (see ./shaders.ts); this file only produces the
 * FractalConfig that parameterizes a shader instance.
 *
 * Two families:
 *   - '2d'  escape-time fractals (Mandelbrot, Julia, Burning Ship, Celtic, Phoenix)
 *   - '3d'  raymarched distance-estimator fractals (Mandelbulb, Mandelbox, Menger,
 *           Quaternion Julia, Sierpinski tetrahedron)
 *
 * Every config also carries an AudioReactivity weight set so the music can drive
 * zoom, hue, glow, morph, rotation, iteration depth, domain warp and kaleidoscope
 * folding. Randomization perturbs all of it, so no two rolls look the same.
 */

export type FractalFamily = '2d' | '3d';

// Shader int ids - keep in sync with shaders.ts
export const TYPE_2D = {
  mandelbrot: 0,
  julia: 1,
  burningShip: 2,
  celtic: 3,
  phoenix: 4,
  tricorn: 5,
  newton: 6,
  // --- appended new types (ids stable; never reorder) ---
  perpendicularMandelbrot: 7,
  perpendicularBurningShip: 8,
  buffalo: 9,
  heartMandelbrot: 10,
  celticMandelbar: 11,
  mandelbarPower3: 12,
  multibrot3: 13,
  multibrot4: 14,
  multibrot5: 15,
  lambda: 16,
  magnet1: 17,
  magnet2: 18,
  spider: 19,
  manowar: 20,
  nova: 21,
  sinZ: 22,
  cosZ: 23,
  simonbrot: 24,
  celticMandelbrot: 25,
  burningShipPower3: 26,
  // --- batch to 40 (ids stable) ---
  multibrot6: 27,
  multibrot7: 28,
  multibrot8: 29,
  burningShipPower4: 30,
  burningShipPower5: 31,
  celticPower3: 32,
  celticPower4: 33,
  heartPower3: 34,
  buffalo: 35,
  buffaloPower3: 36,
  tricornPower4: 37,
  mandelbarPower5: 38,
  perpBurningPower3: 39,
} as const;
export const TYPE_3D = {
  mandelbulb: 0,
  mandelbox: 1,
  menger: 2,
  quaternion: 3,
  sierpinski: 4,
  apollonian: 5,
  // --- appended new types (ids stable; never reorder) ---
  juliaBulb: 6,
  pseudoKleinian: 7,
  sierpinskiOctahedron: 8,
  mengerCross: 9,
  jerusalemCube: 10,
  amazingBox: 11,
  aboxMod: 12,
  tgladBox: 13,
  hybridBulbBox: 14,
  quaternionCubic: 15,
  octahedralIFS: 16,
  kaliBox: 17,
  mandelbrotCylinder: 18,
  kleinianGroup: 19,
  mausoleumBox: 20,
  coral: 21,
  // --- batch to 40 (ids stable): baked-param variants + new IFS ---
  mandelbulbP4: 22,
  mandelbulbP8: 23,
  mandelbulbP3: 24,
  mandelbulbP6: 25,
  juliaBulbP5: 26,
  juliaBulbP7: 27,
  amazingBoxHi: 28,
  amazingBoxLo: 29,
  tgladHi: 30,
  aboxModB: 31,
  kaliBoxB: 32,
  mausoleumB: 33,
  hybridBulbBoxB: 34,
  quaternionB: 35,
  sierpinskiTet: 36,
  kifs: 37,
  mengerRound: 38,
  octaFlake: 39,
} as const;

/* --------------------------------------------------------------------------
 * Per-type 3D camera-fit baselines. Different distance estimators have very
 * different intrinsic sizes, so a single camDist range crops some types and
 * frames others fine. This maps each 3D typeName to a base camera distance
 * that frames that DE with comfortable margin. Tuned toward "fits with margin"
 * (slightly too far out beats too zoomed in). The randomizer multiplies this
 * by range(1.05, 1.35) so the camera is always pulled back enough.
 * ------------------------------------------------------------------------ */
export const FIT_3D: Record<string, number> = {
  // bulb / quaternion family - compact, bounded to radius ~1.2
  mandelbulb: 4.6,
  juliaBulb: 4.6,
  quaternion: 4.4,
  quaternionCubic: 4.6,
  // menger / sierpinski / octahedral - mid-sized lattices
  menger: 5.6,
  sierpinski: 4.8,
  sierpinskiOctahedron: 5.0,
  octahedralIFS: 5.0,
  mengerCross: 5.4,
  mandelbrotCylinder: 5.0,
  // box-fold family - MUCH more compact than they look; framed at ~d3.4 not d7
  // (measured: a scale-2.2 mandelbox fills the frame at d3.2 and is a speck at d6.5)
  mandelbox: 3.4,
  amazingBox: 3.4,
  aboxMod: 3.4,
  tgladBox: 3.6,
  kaliBox: 3.4,
  mausoleumBox: 3.8,
  hybridBulbBox: 3.8,
  jerusalemCube: 4.4,
  // kleinian / apollonian / coral - space-filling; pull back to show the structure
  apollonian: 8.5,
  pseudoKleinian: 8.0,
  kleinianGroup: 8.5,
  coral: 7.5,
  // batch-to-40 variants
  mandelbulbP4: 4.6, mandelbulbP8: 4.6, mandelbulbP3: 4.6, mandelbulbP6: 4.6,
  juliaBulbP5: 4.6, juliaBulbP7: 4.6, quaternionB: 4.4,
  amazingBoxHi: 3.4, amazingBoxLo: 3.4, tgladHi: 3.6, aboxModB: 3.4,
  kaliBoxB: 3.4, mausoleumB: 3.8, hybridBulbBoxB: 3.8,
  sierpinskiTet: 4.8, kifs: 5.0, mengerRound: 5.6, octaFlake: 5.0,
};
const fit3d = (typeName: string): number => FIT_3D[typeName] ?? 5.0;

// Box-fold DEs (Mandelbox & relatives). Their size swings wildly with the scale /
// julia-offset / rotation params, so a julia offset or a big rotation fold turns
// them into a sprawling space-filling mess that overflows any framing. We keep
// these BOUNDED (no julia offset, tiny rotation, classic scale band) so they sit
// as a compact form the camera can actually frame.
const BOX_FOLD = new Set<string>([
  'mandelbox', 'amazingBox', 'aboxMod', 'tgladBox', 'kaliBox', 'mausoleumBox', 'hybridBulbBox',
  'amazingBoxHi', 'amazingBoxLo', 'tgladHi', 'aboxModB', 'kaliBoxB', 'mausoleumB', 'hybridBulbBoxB',
]);
// Genuinely space-filling tilings (use fract()/inversion to repeat forever). There
// is no "whole form" to frame - they are immersive detail views by nature.
const SPACE_FILLING = new Set<string>([
  'apollonian', 'pseudoKleinian', 'kleinianGroup', 'coral', 'mengerCross', 'jerusalemCube',
]);
// Bounded, framable types only - these render as a WHOLE form the camera can fit, so
// rolls never come out oversized/space-filling. Variety comes from heavy parameter
// variation (power, julia, rotation, iterations, palette) per roll - the same type
// looks wildly different each time. The space-filling types (apollonian, kleinian,
// box-fold variants) still appear rarely from the full set, for the occasional wild one.
const WELL_FRAMED_3D: string[] = [
  'mandelbulb', 'juliaBulb', 'quaternion', 'quaternionCubic',
  'sierpinski', 'sierpinskiOctahedron', 'octahedralIFS',
  'menger', 'mandelbrotCylinder', 'mandelbox',
  // batch-to-40 framable variants
  'mandelbulbP4', 'mandelbulbP8', 'mandelbulbP3', 'mandelbulbP6',
  'juliaBulbP5', 'juliaBulbP7', 'quaternionB',
  'sierpinskiTet', 'mengerRound', 'octaFlake', 'kifs',
];

export type Fractal2DType = keyof typeof TYPE_2D;
export type Fractal3DType = keyof typeof TYPE_3D;

export interface PaletteCoeffs {
  a: [number, number, number];
  b: [number, number, number];
  c: [number, number, number];
  d: [number, number, number];
}

export interface AudioReactivity {
  zoom: number;       // bass-driven zoom pulse
  hue: number;        // palette shift
  glow: number;       // orbit-trap / bloom intensity
  morph: number;      // julia-c / power morph
  rotation: number;   // spin
  iterations: number; // detail depth
  warp: number;       // domain warp
  kaleido: number;    // kaleidoscope fold strength
}

export interface FractalConfig {
  id: string;
  name: string;
  emoji: string;
  family: FractalFamily;
  type: number;        // shader int id (TYPE_2D / TYPE_3D)
  typeName: string;

  palette: PaletteCoeffs;
  paletteShift: number;
  colorScale: number;
  glow: number;

  // 2D
  center: [number, number];
  baseZoom: number;     // plane span; smaller = deeper
  zoomDrift: number;    // per-second drift (negative zooms in)
  juliaC: [number, number];
  iterations: number;
  kaleido: number;      // 0 = off, else fold count
  rotationSpeed: number;
  warpAmount: number;

  // 3D
  power: number;        // mandelbulb exponent / box scale
  camDist: number;
  camSpeed: number;
  rotIter: [number, number, number];  // per-iteration rotation (radians) - infinite variety
  juliaC3: [number, number, number];  // 3D julia offset
  juliaMode: number;                  // 0 mandelbrot, 1 julia

  react: AudioReactivity;
}

/* --------------------------------------------------------------------------
 * Seeded RNG (mulberry32) - deterministic, so a seed reproduces a scene.
 * ------------------------------------------------------------------------ */
export function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const pick = <T,>(r: () => number, arr: T[]): T => arr[Math.floor(r() * arr.length) % arr.length];
const range = (r: () => number, lo: number, hi: number) => lerp(lo, hi, r());

/* --------------------------------------------------------------------------
 * Palette generation - IQ cosine palettes. Produces vivid, varied gradients.
 * ------------------------------------------------------------------------ */
export function randomPalette(r: () => number): PaletteCoeffs {
  // a = base, b = amplitude, c = frequency (per-channel for wild variety), d = phase.
  // Per-channel frequency + occasional high amplitude gives a huge colour space.
  const a: [number, number, number] = [range(r, 0.32, 0.66), range(r, 0.32, 0.66), range(r, 0.32, 0.66)];
  const b: [number, number, number] = [range(r, 0.28, 0.6), range(r, 0.28, 0.6), range(r, 0.28, 0.6)];
  const same = r() < 0.45;                 // sometimes coherent, sometimes wild
  const base = range(r, 0.5, 2.4);
  const c: [number, number, number] = same
    ? [base, base, base]
    : [range(r, 0.4, 2.6), range(r, 0.4, 2.6), range(r, 0.4, 2.6)];
  const d: [number, number, number] = [range(r, 0, 1), range(r, 0, 1), range(r, 0, 1)];
  return { a, b, c, d };
}

// A few curated palettes for the named presets (vivid, club-ready)
export const PALETTES: Record<string, PaletteCoeffs> = {
  neon: { a: [0.5, 0.5, 0.5], b: [0.5, 0.5, 0.5], c: [1.0, 1.0, 1.0], d: [0.0, 0.33, 0.67] },
  inferno: { a: [0.55, 0.4, 0.32], b: [0.5, 0.45, 0.4], c: [1.0, 1.0, 1.0], d: [0.0, 0.1, 0.2] },
  ice: { a: [0.46, 0.5, 0.6], b: [0.4, 0.4, 0.45], c: [1.0, 1.1, 1.2], d: [0.6, 0.5, 0.4] },
  acid: { a: [0.5, 0.55, 0.45], b: [0.5, 0.45, 0.55], c: [1.2, 0.9, 1.4], d: [0.1, 0.45, 0.8] },
  magenta: { a: [0.55, 0.4, 0.55], b: [0.45, 0.35, 0.5], c: [1.0, 0.7, 1.3], d: [0.2, 0.0, 0.5] },
  spectrum: { a: [0.5, 0.5, 0.5], b: [0.5, 0.5, 0.5], c: [1.0, 1.0, 1.0], d: [0.3, 0.2, 0.2] },
  sunset: { a: [0.6, 0.4, 0.3], b: [0.45, 0.35, 0.3], c: [1.0, 1.0, 0.5], d: [0.0, 0.25, 0.5] },
  emerald: { a: [0.4, 0.55, 0.45], b: [0.35, 0.5, 0.4], c: [1.1, 1.0, 0.9], d: [0.5, 0.4, 0.3] },
  vapor: { a: [0.55, 0.5, 0.6], b: [0.45, 0.4, 0.5], c: [0.9, 1.2, 1.0], d: [0.7, 0.2, 0.5] },
  gold: { a: [0.5, 0.42, 0.28], b: [0.5, 0.45, 0.3], c: [1.0, 1.0, 1.0], d: [0.15, 0.2, 0.3] },
};

/* --------------------------------------------------------------------------
 * Prompt → theme. A fully internal keyword engine (no AI API): a text prompt
 * like "mushrooms" or "cars racing" biases palette, fractal type, motion and
 * kaleidoscope so the roll feels on-theme. Unknown words fall back to a hue
 * derived from the prompt text, so every prompt still produces something.
 * ------------------------------------------------------------------------ */
export interface PromptTheme {
  palette?: PaletteCoeffs;
  family?: FractalFamily;
  types2d?: Fractal2DType[];
  types3d?: Fractal3DType[];
  shapes?: string[];      // procedural-model shape family ids the prompt suggests
  kaleido?: number;       // 0 = leave to chance
  speed?: number;         // motion multiplier
  glow?: number;
  label: string;
}

// Prompt keyword → procedural shape family. Lets "tree" build a fractal tree,
// "bubbles" build metaballs, "spiral" build a vortex, etc.
const SHAPE_KEYWORDS: { k: RegExp; shapes: string[] }[] = [
  { k: /tree|branch|forest|root|plant|leaf/, shapes: ['fractal_tree'] },
  { k: /bubble|blob|ball|sphere|orb|round|drop|mushroom|cell|molecule/, shapes: ['metaball', 'organic', 'particle_sphere'] },
  { k: /spiral|swirl|whirl|tornado|vortex|hurricane|galaxy/, shapes: ['vortex', 'helix'] },
  { k: /dna|helix|twist|spring|coil/, shapes: ['helix'] },
  { k: /cube|box|block|brick|building|city|pixel/, shapes: ['cube_lattice', 'lattice'] },
  { k: /ring|halo|circle|loop|donut|orbit|portal/, shapes: ['particle_ring', 'torus_knot'] },
  { k: /wave|ocean|water|ripple|sea|fluid/, shapes: ['wave_grid'] },
  { k: /star|sun|burst|ray|spike|explosion|fireworks/, shapes: ['radial_spokes'] },
  { k: /crystal|shard|diamond|ice|glass|gem/, shapes: ['shards'] },
  { k: /knot|pretzel|tangle/, shapes: ['torus_knot'] },
  { k: /kaleido|mandala|flower|psych|trippy|sacred/, shapes: ['kaleidoscope'] },
  { k: /particle|dust|spark|swarm|snow/, shapes: ['particle_sphere', 'particle_ring'] },
  { k: /car|race|engine|machine|mech|robot|tech/, shapes: ['cube_lattice', 'shards'] },
];
function shapesFromPrompt(prompt: string): string[] | undefined {
  for (const r of SHAPE_KEYWORDS) if (r.k.test(prompt)) return r.shapes;
  return undefined;
}

export function paletteFromHue(h: number): PaletteCoeffs {
  const k = ((h % 360) + 360) % 360 / 360;
  return { a: [0.5, 0.5, 0.5], b: [0.5, 0.5, 0.5], c: [1, 1, 1], d: [k, k + 0.12, k + 0.24] };
}
const promptHue = (s: string) => {
  let h = 0; for (let i = 0; i < s.length; i++) { h = (h << 5) - h + s.charCodeAt(i); h |= 0; }
  return Math.abs(h) % 360;
};
const titleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase()).slice(0, 40);

interface ThemeRule { k: RegExp; t: Omit<PromptTheme, 'label'> }
const THEME_RULES: ThemeRule[] = [
  { k: /fire|lava|flame|hot|burn|ember|inferno|magma/, t: { palette: PALETTES.inferno, types2d: ['burningShip', 'mandelbrot'], glow: 1.2 } },
  { k: /ocean|water|sea|wave|aqua|river|liquid|rain/, t: { palette: PALETTES.ice, types2d: ['julia'], speed: 0.8 } },
  { k: /space|galaxy|cosmos|nebula|star|universe|orbit|planet/, t: { palette: PALETTES.magenta, family: '3d', types3d: ['mandelbulb', 'quaternion'], speed: 0.7 } },
  { k: /neon|cyber|electric|laser|techno|rave|club/, t: { palette: PALETTES.acid, glow: 1.2, kaleido: 6 } },
  { k: /mushroom|psych|trippy|acid|shroom|forest|nature|plant|leaf|jungle/, t: { palette: PALETTES.emerald, types2d: ['julia'], kaleido: 8 } },
  { k: /gold|lux|royal|rich|crown|king/, t: { palette: PALETTES.gold, family: '3d', types3d: ['apollonian', 'menger'] } },
  { k: /ice|winter|frost|snow|cold|crystal|diamond/, t: { palette: PALETTES.ice, types2d: ['julia'], family: '3d', types3d: ['mandelbulb'] } },
  { k: /car|race|racing|speed|fast|sport|engine|motor|drift/, t: { palette: PALETTES.neon, family: '3d', types3d: ['mandelbox', 'menger'], speed: 2.2, glow: 1.0 } },
  { k: /love|heart|rose|pink|valentine/, t: { palette: PALETTES.magenta, types2d: ['julia'], kaleido: 6 } },
  { k: /sunset|sunrise|dawn|dusk|desert|sand/, t: { palette: PALETTES.sunset, types2d: ['mandelbrot'] } },
  { k: /vapor|retro|80s|synth|miami/, t: { palette: PALETTES.vapor, types2d: ['julia'], kaleido: 4 } },
];

export function parsePrompt(promptRaw: string): PromptTheme | undefined {
  const prompt = promptRaw.trim().toLowerCase();
  if (!prompt) return undefined;
  const shapes = shapesFromPrompt(prompt);
  const label = titleCase(promptRaw.trim());
  for (const rule of THEME_RULES) {
    if (rule.k.test(prompt)) return { ...rule.t, shapes, label };
  }
  // unknown prompt → derive a palette hue from the text
  return { palette: paletteFromHue(promptHue(prompt)), shapes, label };
}

const defaultReact = (): AudioReactivity => ({
  zoom: 0.8, hue: 0.7, glow: 1.0, morph: 0.7, rotation: 0.6, iterations: 0.6, warp: 0.5, kaleido: 0.0,
});

function randomReact(r: () => number): AudioReactivity {
  return {
    zoom: range(r, 0.5, 1.0),
    hue: range(r, 0.4, 1.0),
    glow: range(r, 0.6, 1.0),
    morph: range(r, 0.4, 1.0),
    rotation: range(r, 0.3, 0.9),
    iterations: range(r, 0.2, 0.8),
    warp: range(r, 0.2, 0.8),
    kaleido: r() < 0.4 ? range(r, 0.3, 0.9) : 0.0,
  };
}

/* --------------------------------------------------------------------------
 * Interesting parameter regions per fractal type.
 * ------------------------------------------------------------------------ */
const JULIA_LOCI: [number, number][] = [
  [-0.8, 0.156], [0.285, 0.01], [-0.70176, -0.3842], [-0.4, 0.6],
  [0.355, 0.355], [-0.54, 0.54], [-0.835, -0.2321], [0.37, 0.1],
];
const MANDEL_CENTERS: [number, number][] = [
  [-0.745, 0.113], [-0.748, 0.1], [-0.1, 0.651], [-1.25066, 0.02012],
  [0.001643, 0.822467], [-0.235125, 0.827215],
];

/* --------------------------------------------------------------------------
 * The randomizer - produce a unique FractalConfig from a seed.
 * ------------------------------------------------------------------------ */
export function randomFractal(seed: number, forceFamily?: FractalFamily, theme?: PromptTheme): FractalConfig {
  const r = makeRng(seed);
  const roll = r();
  const family: FractalFamily = theme?.family ?? forceFamily ?? (roll < 0.62 ? '2d' : '3d');
  const palette = theme?.palette ?? randomPalette(r);
  const react = randomReact(r);
  const speed = theme?.speed ?? 1;
  const themeName = theme?.label;
  const themeEmoji = theme ? '✨' : '🎲';

  if (family === '2d') {
    const pool = theme?.types2d?.length ? theme.types2d : (Object.keys(TYPE_2D) as Fractal2DType[]);
    const typeName = pick(r, pool);
    const type = TYPE_2D[typeName];
    const isJulia = typeName === 'julia' || typeName === 'phoenix' || typeName === 'lambda';

    // place each family where its detail lives
    let center: [number, number];
    let baseZoom: number;
    if (isJulia) {
      center = [0, 0]; baseZoom = range(r, 2.2, 3.0);
    } else if (typeName === 'mandelbrot') {
      center = pick(r, MANDEL_CENTERS); baseZoom = range(r, 0.35, 1.4); // zoom near boundary
    } else if (typeName === 'burningShip' || typeName === 'burningShipPower3') {
      center = [range(r, -1.8, -0.3), range(r, -0.6, 0.0)]; baseZoom = range(r, 0.4, 2.0);
    } else if (typeName === 'perpendicularBurningShip') {
      center = [range(r, -1.2, -0.2), range(r, -0.3, 0.2)]; baseZoom = range(r, 1.2, 2.4);
    } else if (typeName === 'buffalo') {
      center = [range(r, -0.9, 0.2), 0.0]; baseZoom = range(r, 1.6, 2.6);
    } else if (typeName === 'heartMandelbrot') {
      center = [range(r, -0.3, 0.3), 0.0]; baseZoom = range(r, 2.0, 2.8);
    } else if (typeName === 'multibrot3' || typeName === 'multibrot4' || typeName === 'multibrot5'
            || typeName === 'mandelbarPower3' || typeName === 'simonbrot') {
      center = [0, 0]; baseZoom = range(r, 2.2, 2.8); // multibrots are centered, larger span
    } else if (typeName === 'magnet1' || typeName === 'magnet2') {
      center = [range(r, 0.5, 1.5), 0.0]; baseZoom = range(r, 2.2, 3.2); // detail sits to the right
    } else if (typeName === 'nova') {
      center = [range(r, -0.4, 0.4), 0.0]; baseZoom = range(r, 1.8, 2.8);
    } else if (typeName === 'sinZ' || typeName === 'cosZ') {
      center = [0, 0]; baseZoom = range(r, 3.0, 5.0); // transcendental: wide view
    } else if (typeName === 'spider' || typeName === 'manowar') {
      center = [range(r, -0.6, 0.4), 0.0]; baseZoom = range(r, 2.0, 3.0);
    } else {
      center = [0, 0]; baseZoom = range(r, 2.2, 2.9); // celtic / tricorn / newton / etc full view
    }

    // continuous julia point: a known-interesting locus + jitter = endless variants
    const jLoc = pick(r, JULIA_LOCI);
    const juliaC: [number, number] = [jLoc[0] + range(r, -0.2, 0.2), jLoc[1] + range(r, -0.2, 0.2)];

    return {
      id: `fr_${seed}`,
      name: themeName ?? 'Random Fractal',
      emoji: themeEmoji,
      family,
      type,
      typeName,
      palette,
      paletteShift: range(r, 0, 1),
      colorScale: range(r, 0.4, 3.4),
      glow: theme?.glow ?? range(r, 0.4, 1.6),
      center,
      baseZoom,
      zoomDrift: range(r, -0.04, 0.02),
      juliaC,
      iterations: Math.round(range(r, 90, 280)),
      kaleido: theme?.kaleido ?? (r() < 0.45 ? pick(r, [3, 4, 5, 6, 8, 10, 12, 16]) : 0),
      rotationSpeed: range(r, -0.16, 0.16) * speed,
      warpAmount: r() < 0.6 ? range(r, 0.05, 0.55) : 0,
      power: 8,
      camDist: 3,
      camSpeed: 0.1,
      rotIter: [0, 0, 0],
      juliaC3: [0, 0, 0],
      juliaMode: 0,
      react,
    };
  }

  // Theme types win; otherwise favour the well-framed set 80% of the time so a
  // random roll is rarely a space-filling wall.
  const pool3 = (theme?.types3d?.length
    ? theme.types3d
    : (r() < 0.85 ? WELL_FRAMED_3D : Object.keys(TYPE_3D))) as Fractal3DType[];
  const typeName = pick(r, pool3);
  const type = TYPE_3D[typeName];

  const isBox = BOX_FOLD.has(typeName);
  const isFill = SPACE_FILLING.has(typeName);

  // Per-iteration rotation + julia offset give each roll a different form. Box-folds
  // and space-filling types get a MODERATE range (was tiny - they all looked the
  // same) - enough variety to feel random without ballooning wildly past the frame.
  const rotAmt = isFill
    ? (r() < 0.5 ? range(r, 0.02, 0.14) : 0)
    : isBox
      ? (r() < 0.6 ? range(r, 0.04, 0.26) : 0)
      : (r() < 0.78 ? range(r, 0.04, 0.55) : 0);
  const julia = isFill ? false : isBox ? r() < 0.35 : r() < 0.7; // more julia offsets = more distinct forms
  const boxScale = range(r, 1.7, 2.7); // wider scale band = more distinct box forms
  return {
    id: `fr_${seed}`,
    name: themeName ?? 'Random Fractal',
    emoji: themeEmoji,
    family,
    type,
    typeName,
    palette,
    paletteShift: range(r, 0, 1),
    colorScale: range(r, 0.6, 2.2),
    glow: theme?.glow ?? range(r, 0.5, 1.3),
    center: [0, 0],
    baseZoom: 2,
    zoomDrift: 0,
    juliaC: [range(r, -0.8, 0.8), range(r, -0.8, 0.8)],
    iterations: 100,
    kaleido: 0,
    rotationSpeed: range(r, -0.1, 0.1) * speed,
    warpAmount: 0,
    power: typeName === 'mandelbulb' || typeName === 'juliaBulb' ? range(r, 2, 18) // wide: blobby (low) -> spiky (high)
      : isBox ? boxScale
      : range(r, 1.6, 3.2),
    // Per-type fit baseline (now calibrated to frame the whole form with the
    // wider ~47deg FOV) with a small random pull-back for variety. Zoom-out still
    // doubles it, so the form is always fully in frame.
    camDist: fit3d(typeName) * range(r, 1.1, 1.4),
    camSpeed: range(r, 0.05, 0.25) * speed,
    rotIter: [range(r, -rotAmt, rotAmt), range(r, -rotAmt, rotAmt), range(r, -rotAmt, rotAmt)],
    juliaC3: julia ? [range(r, -1.0, 1.0), range(r, -1.0, 1.0), range(r, -1.0, 1.0)] : [0, 0, 0],
    juliaMode: julia ? range(r, 0.5, 1.0) : 0,
    react,
  };
}

/* --------------------------------------------------------------------------
 * Curated preset library - the "standard" template base.
 * ------------------------------------------------------------------------ */
function preset(p: Partial<FractalConfig> & Pick<FractalConfig, 'id' | 'name' | 'emoji' | 'family' | 'type' | 'typeName'>): FractalConfig {
  return {
    palette: PALETTES.neon,
    paletteShift: 0,
    colorScale: 1.2,
    glow: 0.9,
    center: [-0.745, 0.113],
    baseZoom: 2.2,
    zoomDrift: -0.015,
    juliaC: [-0.8, 0.156],
    iterations: 160,
    kaleido: 0,
    rotationSpeed: 0.04,
    warpAmount: 0,
    power: 8,
    camDist: 3,
    camSpeed: 0.12,
    rotIter: [0, 0, 0],
    juliaC3: [0, 0, 0],
    juliaMode: 0,
    react: defaultReact(),
    ...p,
  };
}

export const FRACTAL_PRESETS: FractalConfig[] = [
  preset({
    id: 'FractalMandelbrot', name: 'Mandelbrot Flow', emoji: '🌀', family: '2d',
    type: TYPE_2D.mandelbrot, typeName: 'mandelbrot',
    palette: PALETTES.inferno, center: [-0.745, 0.113], baseZoom: 0.55, glow: 1.0,
    iterations: 200, zoomDrift: -0.012,
    react: { ...defaultReact(), zoom: 0.8, glow: 1.0, hue: 0.6 },
  }),
  preset({
    id: 'FractalJulia', name: 'Julia Dreams', emoji: '💠', family: '2d',
    type: TYPE_2D.julia, typeName: 'julia',
    palette: PALETTES.magenta, juliaC: [-0.70176, -0.3842], baseZoom: 2.6, glow: 1.1,
    rotationSpeed: 0.06, react: { ...defaultReact(), morph: 0.8, hue: 0.7, rotation: 0.5 },
  }),
  preset({
    id: 'FractalBurningShip', name: 'Burning Ship', emoji: '🔥', family: '2d',
    type: TYPE_2D.burningShip, typeName: 'burningShip',
    palette: PALETTES.inferno, center: [-1.7625, -0.028], baseZoom: 0.18, iterations: 200,
    zoomDrift: -0.008, react: { ...defaultReact(), glow: 1.0, iterations: 0.5 },
  }),
  preset({
    id: 'FractalKaleido', name: 'Kaleido IFS', emoji: '✶', family: '2d',
    type: TYPE_2D.julia, typeName: 'julia',
    palette: PALETTES.acid, juliaC: [0.355, 0.355], baseZoom: 2.8, kaleido: 6,
    rotationSpeed: 0.08, warpAmount: 0.15,
    react: { ...defaultReact(), kaleido: 0.7, warp: 0.6, rotation: 0.6, hue: 0.8 },
  }),
  preset({
    id: 'FractalPhoenix', name: 'Phoenix Bloom', emoji: '🪶', family: '2d',
    type: TYPE_2D.phoenix, typeName: 'phoenix',
    palette: PALETTES.spectrum, juliaC: [0.5667, 0.0], baseZoom: 2.6, glow: 1.0,
    react: { ...defaultReact(), morph: 0.7, glow: 0.9 },
  }),
  preset({
    id: 'FractalMandelbulb', name: 'Mandelbulb 3D', emoji: '🧬', family: '3d',
    type: TYPE_3D.mandelbulb, typeName: 'mandelbulb',
    palette: PALETTES.ice, power: 8, camDist: 4.6, camSpeed: 0.12, glow: 1.0,
    react: { ...defaultReact(), morph: 0.7, rotation: 0.5, glow: 0.9 },
  }),
  preset({
    id: 'FractalMandelbox', name: 'Mandelbox', emoji: '📦', family: '3d',
    type: TYPE_3D.mandelbox, typeName: 'mandelbox',
    palette: PALETTES.acid, power: 2.2, camDist: 3.2, camSpeed: 0.1,
    react: { ...defaultReact(), morph: 0.6, hue: 0.7 },
  }),
  preset({
    id: 'FractalMenger', name: 'Menger Sponge', emoji: '🔳', family: '3d',
    type: TYPE_3D.menger, typeName: 'menger',
    palette: PALETTES.neon, camDist: 5.6, camSpeed: 0.14,
    react: { ...defaultReact(), rotation: 0.5, glow: 0.8 },
  }),
  preset({
    id: 'FractalNewton', name: 'Newton Roots', emoji: '⚛️', family: '2d',
    type: TYPE_2D.newton, typeName: 'newton',
    palette: PALETTES.vapor, center: [0, 0], baseZoom: 2.4, iterations: 60, glow: 0.7,
    colorScale: 1.0, react: { ...defaultReact(), hue: 0.7, rotation: 0.4, morph: 0.5 },
  }),
  preset({
    id: 'FractalTricorn', name: 'Tricorn', emoji: '🔺', family: '2d',
    type: TYPE_2D.tricorn, typeName: 'tricorn',
    palette: PALETTES.sunset, center: [0, 0], baseZoom: 2.6, iterations: 160,
    react: { ...defaultReact(), glow: 0.9, hue: 0.6 },
  }),
  preset({
    id: 'FractalApollonian', name: 'Apollonian', emoji: '🫧', family: '3d',
    type: TYPE_3D.apollonian, typeName: 'apollonian',
    palette: PALETTES.gold, camDist: 8.5, camSpeed: 0.1, glow: 1.0,
    react: { ...defaultReact(), glow: 0.9, rotation: 0.4 },
  }),
];
