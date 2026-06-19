/**
 * Style-aware procedural texture engine (internal, no external API).
 * Maps a Visual-Style NAME to a matching pattern family, so "Cyberpunk Grid"
 * renders a grid, "Crystal Shards" renders shards, "Marble Veins" renders
 * turbulent veins, etc. Palette is derived from the selected style hues.
 */
import { renderGradient, type GradientConfig, type GradientType } from '@/lib/gradientEngine';

export type PatternKind =
  | 'gradient' | 'grid' | 'hex' | 'shards' | 'noise'
  | 'dots' | 'stripes' | 'voronoi' | 'rings' | 'stars' | 'kaleido';

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hash = (str: string) => {
  let h = 0;
  for (let i = 0; i < str.length; i++) { h = (h << 5) - h + str.charCodeAt(i); h |= 0; }
  return Math.abs(h);
};

/** Keyword → pattern family. First match wins. */
export function categorize(style: string): PatternKind {
  const s = style.toLowerCase();
  const has = (...k: string[]) => k.some((w) => s.includes(w));
  if (has('grid', 'circuit', 'blueprint', 'tech', 'wireframe', 'checker')) return 'grid';
  if (has('hex', 'honeycomb')) return 'hex';
  if (has('shard', 'shatter', 'crystal', 'low poly', 'origami', 'glass', 'diamond')) return 'shards';
  if (has('dot', 'halftone')) return 'dots';
  if (has('star', 'dust', 'particle', 'speckle', 'granite')) return 'stars';
  if (has('stripe', 'glitch', 'retro', 'scan', 'ribbon', 'weave', 'sand', 'dune')) return 'stripes';
  if (has('voronoi', 'cell', 'foam')) return 'voronoi';
  if (has('ring', 'diffraction', 'ripple', 'wave', 'moire', 'moiré', 'interference', 'sunburst')) return 'rings';
  if (has('kaleido', 'polar', 'prismatic', 'holographic', 'iridescent', 'chromatic', 'mandala')) return 'kaleido';
  if (has('marble', 'ink', 'nebula', 'plasma', 'fog', 'aurora', 'vapor', 'smoke', 'cloud', 'fluid',
          'organic', 'flow', 'liquid', 'lava', 'storm', 'ocean', 'velvet', 'satin', 'frost', 'metal', 'chrome', 'weather'))
    return 'noise';
  return 'gradient';
}

/** Hand-tuned palettes matched to each style's actual look (hero colours first). */
export const STYLE_PALETTES: Record<string, string[]> = {
  'Neon Glow': ['#ff2d95', '#00eaff', '#9d4dff', '#0a0a14'],
  'Metallic Chrome': ['#eef3f8', '#9aa3ad', '#5c646e', '#c9d2db'],
  'Organic Flow': ['#2bd4a0', '#7af0c8', '#1f8f76', '#0e2c26'],
  'Cyberpunk Grid': ['#ff007a', '#00f0ff', '#7a00ff', '#15002a'],
  'Retro Wave': ['#ff5e7a', '#ffae3b', '#7a3cff', '#2a0a4a'],
  'Crystal Shards': ['#bfe9ff', '#6fb3e0', '#e8f6ff', '#274b66'],
  'Holographic Film': ['#9bffd9', '#bca8ff', '#ffb3e6', '#a8e0ff'],
  'Lava Flow': ['#ff3b0f', '#ff8a00', '#ffd000', '#1a0600'],
  'Electric Storm': ['#5b6cff', '#9d8bff', '#e8ecff', '#0b0f2a'],
  'Marble Veins': ['#f4f1ea', '#c9c2b6', '#caa46a', '#6f6759'],
  'Aurora Borealis': ['#46f2a0', '#39d0ff', '#a36bff', '#06122a'],
  'Vaporwave Gradient': ['#ff6ad5', '#26d9d9', '#8a5cff', '#2a1240'],
  'Iridescent Film': ['#3ef0c8', '#ff5ed6', '#ffd86b', '#16242a'],
  'Prismatic Noise': ['#ff4d4d', '#4dff88', '#4d88ff', '#ffe14d'],
  'Moiré Pattern': ['#f5f5f5', '#101015', '#ff3366', '#8892a0'],
  'Circuit Trace': ['#1affa0', '#00bcd4', '#39ffcf', '#0a1f14'],
  'Hex Mesh': ['#36e0d0', '#2a8fd0', '#7af0e6', '#10202a'],
  'Particle Dust': ['#ffd9a0', '#ffb347', '#fff0d0', '#1a1410'],
  'Ribbon Weave': ['#e0457b', '#3a8dde', '#3fbf7f', '#1a1430'],
  'Sand Dunes': ['#e8c79a', '#c79a5b', '#8a6034', '#2a1c10'],
  'Ocean Foam': ['#3fd0c0', '#7af0e0', '#e8fffb', '#0a3a3a'],
  'Glitch Stripe': ['#ff2a6d', '#05d9e8', '#d1f7ff', '#101018'],
  'Chromatic Aberration': ['#ff3b3b', '#3bff7a', '#3b7aff', '#0d0d12'],
  'Diffraction Rings': ['#ff5e5e', '#ffd24d', '#4dff9e', '#4db8ff'],
  'Starfield': ['#ffffff', '#cfe0ff', '#7a8cff', '#05060f'],
  'Wireframe Blueprint': ['#7ad7ff', '#2a6fb0', '#bfeaff', '#0a1a2a'],
  'Honeycomb Pattern': ['#ffc24d', '#e09b2a', '#ffe199', '#2a1d08'],
  'Liquid Metal': ['#dfe6ee', '#8b94a0', '#bcc6d2', '#4a525c'],
  'Frosted Glass': ['#dbe9f2', '#aac4d6', '#f4fbff', '#5a6e7a'],
  'Plasma Field': ['#ff3df0', '#3df0ff', '#9d3dff', '#1a0826'],
  'Vapor Trails': ['#ffb3d9', '#b3d9ff', '#e6ccff', '#1a1426'],
  'Ink Diffusion': ['#e8e8f0', '#3a3a6a', '#5a5a8a', '#12121a'],
  'Nebula Clouds': ['#b14dff', '#ff4db8', '#4d6bff', '#0a0620'],
  'Tech Blueprint': ['#5ad0ff', '#2a6fb0', '#a8e6ff', '#081420'],
  'Origami Folds': ['#ffd6a5', '#a5d8ff', '#caffbf', '#2a2a33'],
  'Fiber Optic': ['#00eaff', '#ff4dd2', '#a0fff5', '#0a0a14'],
  'Low Poly': ['#2fc4a8', '#ff7a5c', '#ffd0a0', '#1a2a30'],
  'Speckled Granite': ['#c2c2c2', '#3a3a3a', '#e8e8e8', '#6a6a6a'],
  'Weathered Metal': ['#9a8270', '#5a6a72', '#c2a890', '#2c2018'],
  'Velvet Texture': ['#b01540', '#7a0f2a', '#d04a6a', '#2a0610'],
  'Satin Sheen': ['#f0d9c0', '#d9a8b0', '#fff0e6', '#7a5a50'],
  'Volumetric Fog': ['#aebccc', '#7a8a9a', '#dde6ee', '#3a4651'],
  'Shattered Glass': ['#dbeeff', '#9ec4e0', '#ffffff', '#3a5a72'],
  'Halftone Dots': ['#ff3b3b', '#fff4e0', '#888888', '#101010'],
  'Wave Interference': ['#3a8fd0', '#36d0c0', '#7ad0e0', '#0a2230'],
  'Checker Warp': ['#f0f0f0', '#141414', '#ff3366', '#8892a0'],
  'Gradient Flow': ['#5b8cff', '#9d6bff', '#ff6bb0', '#6bffd0'],
  'Noise Cells': ['#3fbf8f', '#2a8f7a', '#7af0c8', '#0e2622'],
  'Ripple Grid': ['#3fd0ff', '#2a6fb0', '#a8e6ff', '#0a1a2a'],
  'Voronoi Foam': ['#5fe0d0', '#3fb0c0', '#bff7f0', '#0a2a2e'],
  'Polar Kaleidoscope': ['#ff5e5e', '#ffd24d', '#4dff9e', '#4db8ff'],
  'Sunburst Rays': ['#ffd24d', '#ff8a3b', '#fff0c0', '#3a1f08'],
};

const hexLum = (hex: string) => {
  const h = hex.replace('#', '');
  const n = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(n.slice(0, 2), 16), g = parseInt(n.slice(2, 4), 16), b = parseInt(n.slice(4, 6), 16);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
};

function palette(styles: string[], seed: number): string[] {
  // Use the curated per-style palette(s) when available - accurate to the selection.
  const named = styles.map((s) => STYLE_PALETTES[s]).filter(Boolean) as string[][];
  if (named.length) {
    const merged = Array.from(new Set(named.flat()));
    merged.sort((a, b) => hexLum(a) - hexLum(b)); // darkest→lightest: bg stops dark, accents pop
    return merged;
  }
  // fallback: hash-based hues (legacy, for prompt-derived/unknown styles)
  const r = rng(hash(styles.join('|')) + seed * 2654435761);
  const hues = styles.length
    ? styles.map((st, i) => (hash(st) + i * 47 + seed * 29) % 360)
    : [Math.floor(r() * 360)];
  while (hues.length < 3) hues.push((hues[hues.length - 1] + 40 + Math.floor(r() * 90)) % 360);
  const lights = [40, 56, 72, 64, 50];
  return hues.map((h, i) => `hsl(${h} ${66 + Math.floor(r() * 22)}% ${lights[i % lights.length]}%)`);
}

const isNeon = (styles: string[]) =>
  styles.some((s) => /neon|electric|cyber|glow|holographic|laser|plasma/i.test(s));

/** Render a style-matched texture to a data URL. */
export function renderStyleTexture(styles: string[], seed = 0, size = 512): string {
  const kind = categorize(styles[0] || 'gradient');
  const cols = palette(styles, seed);
  const neon = isNeon(styles);

  if (kind === 'gradient') {
    // Favor the multi-blob "mesh" gradient (the most layered/complex one).
    const types: GradientType[] = ['mesh', 'mesh', 'mesh', 'radial', 'conic', 'linear'];
    const r = rng(seed + hash(styles.join()));
    const cfg: GradientConfig = {
      type: types[Math.floor(r() * types.length) % types.length],
      colors: cols, angle: Math.floor(r() * 360), noise: 0.08, vignette: 0.28, seed: seed + 7,
    };
    return renderGradient(cfg, size);
  }

  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  const r = rng(seed * 131 + hash(styles.join('#')) + 1);

  // darker base (first two stops) so the lighter accent patterns pop
  const bg = ctx.createLinearGradient(0, 0, size, size);
  bg.addColorStop(0, cols[0] || '#15151c');
  bg.addColorStop(1, cols[1] || cols[0] || '#0d0d12');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);

  const stroke = cols[cols.length - 1] || '#ffffff';   // lightest
  const accent = cols[2] || cols[cols.length - 1] || '#ffffff';

  if (kind === 'grid') {
    const step = size / (8 + Math.floor(r() * 8));
    ctx.strokeStyle = accent;
    ctx.lineWidth = neon ? 2 : 1;
    if (neon) { ctx.shadowColor = accent; ctx.shadowBlur = 12; }
    for (let x = 0; x <= size; x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, size); ctx.stroke(); }
    for (let y = 0; y <= size; y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size, y); ctx.stroke(); }
    ctx.shadowBlur = 0;
  } else if (kind === 'hex') {
    const rad = size / (10 + Math.floor(r() * 6));
    const h = rad * Math.sqrt(3);
    ctx.strokeStyle = accent; ctx.lineWidth = 1.5;
    if (neon) { ctx.shadowColor = accent; ctx.shadowBlur = 10; }
    for (let row = -1, y = 0; y < size + h; row++, y = (row * h) / 2) {
      for (let x = (row % 2) * rad * 1.5; x < size + rad; x += rad * 3) {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (Math.PI / 3) * i + Math.PI / 6;
          const px = x + rad * Math.cos(a); const py = y + rad * Math.sin(a);
          i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath(); ctx.stroke();
      }
    }
    ctx.shadowBlur = 0;
  } else if (kind === 'shards') {
    const n = 36 + Math.floor(r() * 40);
    for (let i = 0; i < n; i++) {
      const cx = r() * size, cy = r() * size, s2 = size * (0.06 + r() * 0.14);
      ctx.beginPath();
      const sides = 3 + Math.floor(r() * 2);
      for (let k = 0; k < sides; k++) {
        const a = r() * Math.PI * 2;
        const px = cx + Math.cos(a) * s2 * (0.5 + r()); const py = cy + Math.sin(a) * s2 * (0.5 + r());
        k === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = cols[Math.floor(r() * cols.length)] + '';
      ctx.globalAlpha = 0.4 + r() * 0.5;
      ctx.fill();
      ctx.globalAlpha = 1; ctx.strokeStyle = stroke; ctx.lineWidth = 0.6; ctx.stroke();
    }
  } else if (kind === 'dots') {
    const step = size / (16 + Math.floor(r() * 16));
    for (let y = step / 2; y < size; y += step) {
      for (let x = step / 2; x < size; x += step) {
        const rad = (step / 2) * (0.3 + r() * 0.6);
        ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2);
        ctx.fillStyle = accent; ctx.globalAlpha = 0.5 + r() * 0.5; ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  } else if (kind === 'stars') {
    const n = 400 + Math.floor(r() * 600);
    for (let i = 0; i < n; i++) {
      const x = r() * size, y = r() * size, rad = r() * 1.6 + 0.3;
      ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2);
      ctx.fillStyle = r() > 0.85 ? accent : '#ffffff';
      ctx.globalAlpha = 0.3 + r() * 0.7; ctx.fill();
    }
    ctx.globalAlpha = 1;
  } else if (kind === 'stripes') {
    const step = size / (10 + Math.floor(r() * 18));
    const ang = r() * Math.PI;
    ctx.save(); ctx.translate(size / 2, size / 2); ctx.rotate(ang); ctx.translate(-size, -size);
    for (let x = 0, i = 0; x < size * 2; x += step, i++) {
      ctx.fillStyle = cols[i % cols.length];
      ctx.globalAlpha = 0.55 + (i % 2) * 0.3;
      ctx.fillRect(x, 0, step * (0.5 + r() * 0.5), size * 2);
    }
    ctx.restore(); ctx.globalAlpha = 1;
  } else if (kind === 'voronoi') {
    const sites: { x: number; y: number; c: string }[] = [];
    const n = 14 + Math.floor(r() * 18);
    for (let i = 0; i < n; i++) sites.push({ x: r() * size, y: r() * size, c: cols[Math.floor(r() * cols.length)] });
    const img = ctx.getImageData(0, 0, size, size);
    const d = img.data;
    // resolve each site's hsl string to rgb once
    const probe = document.createElement('canvas'); probe.width = 1; probe.height = 1;
    const pctx = probe.getContext('2d')!;
    for (const s of sites) { pctx.fillStyle = s.c; pctx.fillRect(0, 0, 1, 1); const p = pctx.getImageData(0, 0, 1, 1).data; (s as any)._r = p[0]; (s as any)._g = p[1]; (s as any)._b = p[2]; }
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        let best = 1e9, bc = sites[0];
        for (const s of sites) { const dd = (s.x - x) * (s.x - x) + (s.y - y) * (s.y - y); if (dd < best) { best = dd; bc = s; } }
        const idx = (y * size + x) * 4;
        d[idx] = (bc as any)._r; d[idx + 1] = (bc as any)._g; d[idx + 2] = (bc as any)._b; d[idx + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    // cell edges
    ctx.strokeStyle = stroke; ctx.globalAlpha = 0.25;
    for (const s of sites) { ctx.beginPath(); ctx.arc(s.x, s.y, 2, 0, Math.PI * 2); ctx.fillStyle = stroke; ctx.fill(); }
    ctx.globalAlpha = 1;
  } else if (kind === 'rings') {
    const cx = size / 2, cy = size / 2;
    const step = size / (18 + Math.floor(r() * 24));
    ctx.lineWidth = step * 0.5;
    for (let rad = step, i = 0; rad < size; rad += step, i++) {
      ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.strokeStyle = cols[i % cols.length]; ctx.globalAlpha = 0.6; ctx.stroke();
    }
    ctx.globalAlpha = 1;
  } else if (kind === 'kaleido') {
    const segs = 6 + Math.floor(r() * 8) * 2;
    const cx = size / 2, cy = size / 2;
    for (let i = 0; i < segs; i++) {
      ctx.save(); ctx.translate(cx, cy); ctx.rotate((Math.PI * 2 * i) / segs);
      const g = ctx.createLinearGradient(0, 0, size / 2, 0);
      g.addColorStop(0, cols[i % cols.length]);
      g.addColorStop(1, 'transparent');
      ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.arc(0, 0, size * 0.7, -Math.PI / segs, Math.PI / segs);
      ctx.closePath(); ctx.fillStyle = g; ctx.globalAlpha = 0.7; ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  } else {
    // noise / marble - value-noise turbulence mapped to palette
    const img = ctx.getImageData(0, 0, size, size);
    const d = img.data;
    const probe = document.createElement('canvas'); probe.width = cols.length; probe.height = 1;
    const pctx = probe.getContext('2d')!;
    cols.forEach((c, i) => { pctx.fillStyle = c; pctx.fillRect(i, 0, 1, 1); });
    const lut = pctx.getImageData(0, 0, cols.length, 1).data;
    const off = r() * 1000;
    const fbm = (x: number, y: number) => {
      let v = 0, amp = 0.5, f = 0.012 * (1 + r() * 0.5);
      for (let o = 0; o < 5; o++) {
        v += amp * (Math.sin(x * f + off) * Math.cos(y * f * 1.3 - off) + Math.sin((x + y) * f * 0.7));
        amp *= 0.5; f *= 2.1;
      }
      return v;
    };
    const marble = /marble|vein|ink/i.test(styles.join());
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        let t = fbm(x, y);
        if (marble) t = Math.sin((x * 0.02) + t * 2.5);
        t = (t * 0.5 + 0.5);
        t = Math.max(0, Math.min(0.999, t));
        const ci = Math.floor(t * cols.length);
        const li = Math.min(cols.length - 1, ci) * 4;
        const idx = (y * size + x) * 4;
        d[idx] = lut[li]; d[idx + 1] = lut[li + 1]; d[idx + 2] = lut[li + 2]; d[idx + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  // light grain + vignette for cohesion
  const v = ctx.createRadialGradient(size / 2, size / 2, size * 0.3, size / 2, size / 2, size * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.3)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, size, size);

  return canvas.toDataURL('image/png');
}
