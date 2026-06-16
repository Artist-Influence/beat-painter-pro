/**
 * Internal procedural gradient / texture engine.
 * Replaces the Hugging Face (FLUX) dependency: everything is generated on a
 * 2D canvas, so it is instant, offline, and free. Used for both background
 * gradients and Visual-Style textures.
 */

export type GradientType = 'mesh' | 'linear' | 'radial' | 'conic';

export interface GradientConfig {
  type: GradientType;
  colors: string[];   // 2-5 hex colors
  angle: number;      // degrees, for linear / conic
  noise: number;      // 0-1 film grain
  vignette: number;   // 0-1 edge darkening
  seed: number;
}

/* -------- seeded RNG -------- */
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

function hsl(h: number, s: number, l: number): string {
  return `hsl(${((h % 360) + 360) % 360} ${Math.round(s)}% ${Math.round(l)}%)`;
}

/* -------- harmonious palette generation -------- */
export function randomPalette(seed: number): string[] {
  const r = rng(seed);
  const base = r() * 360;
  const sat = lerp(55, 88, r());
  const schemes = ['analogous', 'complementary', 'triad', 'spread'] as const;
  const scheme = schemes[Math.floor(r() * schemes.length) % schemes.length];
  const count = 3 + Math.floor(r() * 2); // 3-4
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    let h = base;
    if (scheme === 'analogous') h = base + i * 26 * (r() > 0.5 ? 1 : -1);
    else if (scheme === 'complementary') h = base + (i % 2) * 180 + i * 8;
    else if (scheme === 'triad') h = base + i * 120;
    else h = base + i * (60 + r() * 80);
    const l = lerp(38, 68, i / Math.max(1, count - 1)) + (r() - 0.5) * 10;
    out.push(hsl(h, sat, l));
  }
  return out;
}

export function randomGradientConfig(seed: number): GradientConfig {
  const r = rng(seed * 7 + 13);
  const types: GradientType[] = ['mesh', 'mesh', 'linear', 'radial', 'conic'];
  return {
    type: types[Math.floor(r() * types.length) % types.length],
    colors: randomPalette(seed),
    angle: Math.round(r() * 360),
    noise: r() < 0.6 ? lerp(0.03, 0.14, r()) : 0,
    vignette: lerp(0.1, 0.45, r()),
    seed,
  };
}

/* -------- render to a data URL -------- */
export function renderGradient(cfg: GradientConfig, size = 640): string {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  const cols = cfg.colors.length ? cfg.colors : ['#1a1a22', '#2a2a3a'];

  if (cfg.type === 'mesh') {
    // base wash, then soft colored blobs blurred together (the modern mesh look)
    ctx.fillStyle = cols[0];
    ctx.fillRect(0, 0, size, size);
    const r = rng(cfg.seed * 3 + 1);
    (ctx as any).filter = 'blur(48px)';
    const blobs = Math.max(3, cols.length + 1);
    for (let i = 0; i < blobs; i++) {
      const c = cols[i % cols.length];
      const x = r() * size;
      const y = r() * size;
      const rad = lerp(size * 0.3, size * 0.65, r());
      const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, c);
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, size, size);
    }
    (ctx as any).filter = 'none';
  } else if (cfg.type === 'radial') {
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size * 0.72);
    cols.forEach((c, i) => g.addColorStop(i / Math.max(1, cols.length - 1), c));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  } else if (cfg.type === 'conic' && typeof (ctx as any).createConicGradient === 'function') {
    const g = (ctx as any).createConicGradient((cfg.angle * Math.PI) / 180, size / 2, size / 2);
    cols.forEach((c, i) => g.addColorStop(i / Math.max(1, cols.length - 1), c));
    g.addColorStop(1, cols[0]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  } else {
    // linear (also conic fallback)
    const a = (cfg.angle * Math.PI) / 180;
    const x = Math.cos(a) * size;
    const y = Math.sin(a) * size;
    const g = ctx.createLinearGradient((size - x) / 2, (size - y) / 2, (size + x) / 2, (size + y) / 2);
    cols.forEach((c, i) => g.addColorStop(i / Math.max(1, cols.length - 1), c));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }

  // vignette
  if (cfg.vignette > 0.01) {
    const v = ctx.createRadialGradient(size / 2, size / 2, size * 0.35, size / 2, size / 2, size * 0.75);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, `rgba(0,0,0,${cfg.vignette.toFixed(3)})`);
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, size, size);
  }

  // film grain
  if (cfg.noise > 0.001) {
    const img = ctx.getImageData(0, 0, size, size);
    const d = img.data;
    const amp = cfg.noise * 255;
    const r = rng(cfg.seed * 11 + 5);
    for (let i = 0; i < d.length; i += 4) {
      const n = (r() - 0.5) * amp;
      d[i] = Math.max(0, Math.min(255, d[i] + n));
      d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
      d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
    }
    ctx.putImageData(img, 0, 0);
  }

  return canvas.toDataURL('image/png');
}

/** Convenience: roll a random gradient and return both config + data URL. */
export function generateRandomGradient(seed: number): { config: GradientConfig; url: string } {
  const config = randomGradientConfig(seed);
  return { config, url: renderGradient(config) };
}
