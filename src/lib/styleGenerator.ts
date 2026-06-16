import { renderStyleTexture, STYLE_PALETTES } from "@/lib/textureEngine";

// Extract dominant colors from an uploaded image
export async function extractColorsFromImage(imageUrl: string): Promise<{
  primary: string;
  secondary: string;
  accent: string;
  isNeon: boolean;
  isMetallic: boolean;
}> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve({ primary: "#ff00ff", secondary: "#cccccc", accent: "#00ffff", isNeon: false, isMetallic: false });
        return;
      }
      
      ctx.drawImage(img, 0, 0, 64, 64);
      const imageData = ctx.getImageData(0, 0, 64, 64).data;
      
      // Sample colors from different regions
      const colors: [number, number, number][] = [];
      const samplePoints = [
        [16, 16], [48, 16], [32, 32], [16, 48], [48, 48]
      ];
      
      for (const [x, y] of samplePoints) {
        const i = (y * 64 + x) * 4;
        colors.push([imageData[i], imageData[i + 1], imageData[i + 2]]);
      }
      
      // Sort by saturation to get most vibrant colors
      colors.sort((a, b) => {
        const satA = Math.max(...a) - Math.min(...a);
        const satB = Math.max(...b) - Math.min(...b);
        return satB - satA;
      });
      
      const toHex = (r: number, g: number, b: number) => 
        `#${[r, g, b].map(c => c.toString(16).padStart(2, '0')).join('')}`;
      
      // Detect if colors are neon-like or metallic
      const avgBrightness = colors[0].reduce((a, b) => a + b, 0) / 3;
      const avgSaturation = Math.max(...colors[0]) - Math.min(...colors[0]);
      
      resolve({
        primary: toHex(...colors[0]),
        secondary: toHex(...colors[1]),
        accent: toHex(...colors[2]),
        isNeon: avgSaturation > 100 && avgBrightness > 150,
        isMetallic: avgSaturation < 50 && avgBrightness > 180,
      });
    };
    img.onerror = () => {
      resolve({ primary: "#ff00ff", secondary: "#cccccc", accent: "#00ffff", isNeon: false, isMetallic: false });
    };
    img.src = imageUrl;
  });
}
const STYLE_DESCRIPTORS: Record<string, string> = {
  "Organic Flow": "organic flowing contours, fluid sine patterns, cellular noise, smooth curvature",
  "Marble Veins": "marble stone veins, calcite streaks, high-contrast veining, natural stone texture",
  "Aurora Borealis": "aurora ribbons, atmospheric scattering, chromatic bands, luminous wisps",
  "Cyberpunk Grid": "emissive neon grid, circuit traces, scanlines, tech paneling",
  "Retro Wave": "80s retrowave gradient ramps, neon airbrush, scanline grain",
  "Crystal Shards": "faceted crystalline shards, refractive facets, hard edges",
  "Holographic Film": "iridescent diffraction film, rainbow specular, micro-prismatic",
  "Lava Flow": "molten lava rivers, cooling crust cracks, glowing fissures",
  "Electric Storm": "lightning filaments, plasma arcs, branching bolts",
  "Hex Mesh": "hexagonal mesh lattice, repeating honeycomb grid, beveled edges",
  "Honeycomb Pattern": "beeswax honeycomb cells, hexagonal tiling, waxy translucency",
  "Liquid Metal": "mercurial liquid metal ripples, mirror reflections, smooth waves",
  "Nebula Clouds": "nebular gas clouds, volumetric wisps, star dust",
  "Tech Blueprint": "technical blueprint linework, orthographic schematics, grid and annotations",
  "Wireframe Blueprint": "wireframe 3D mesh, blueprint lines, thin strokes",
  "Voronoi Foam": "voronoi tessellation, foam cells, irregular polygons",
  "Noise Cells": "cellular noise, Worley noise, mottled texture",
  "Halftone Dots": "printer halftone dot matrix, screen tone",
  "Checker Warp": "checkerboard warped grid, lens distortion, wave deformations",
  "Wave Interference": "interference ripples, moiré wave superposition",
  "Chromatic Aberration": "RGB separation fringes, lens dispersion, prismatic edges",
  "Shattered Glass": "cracked shards, fracture lines, splinters",
  "Velvet Texture": "soft velvet microfibers, diffuse sheen, plush fabric",
  "Satin Sheen": "satin weave, gentle anisotropic highlights, soft luster",
  // Additional style descriptors for better AI generation
  "Neon Glow": "vibrant neon light emission, fluorescent edges, glowing outlines, electric luminescence",
  "Metallic Chrome": "polished chrome metal, mirror-like reflections, liquid metal surface, high-gloss finish",
  "Vaporwave Gradient": "soft pastel gradients, 80s aesthetic, pink and cyan transitions, dreamy atmosphere",
  "Iridescent Film": "iridescent soap bubble film, oil slick rainbow, shifting spectral colors",
  "Prismatic Noise": "refracted light noise, prism dispersion, rainbow static",
  "Moiré Pattern": "interference moiré lines, overlapping grids, optical illusion patterns",
  "Circuit Trace": "PCB circuit board traces, electronic pathways, copper etching",
  "Particle Dust": "floating dust particles, motes in light, scattered specks",
  "Ribbon Weave": "interlaced ribbon bands, woven fabric, flowing streams",
  "Sand Dunes": "desert sand ripples, windswept dune ridges, granular texture",
  "Ocean Foam": "sea foam bubbles, wave froth, churning white water",
  "Glitch Stripe": "digital glitch bands, corrupted data stripes, pixel artifacts",
  "Diffraction Rings": "diffraction grating rings, CD rainbow, interference circles",
  "Starfield": "deep space star field, galaxy stars, cosmic points of light",
  "Frosted Glass": "frosted glass diffusion, sandblasted surface, blurred translucency",
  "Plasma Field": "plasma energy field, ionized gas glow, electromagnetic aurora",
  "Vapor Trails": "jet contrail wisps, smoke trails, lingering vapor",
  "Ink Diffusion": "ink bleeding in water, watercolor diffusion, organic spreading",
  "Origami Folds": "paper origami creases, geometric folds, crisp edges",
  "Fiber Optic": "fiber optic light strands, glowing cables, light transmission",
  "Low Poly": "low polygon facets, triangulated surface, geometric simplification",
  "Speckled Granite": "granite stone speckles, feldspar crystals, polished rock",
  "Weathered Metal": "rusted weathered metal, oxidized patina, corroded surface",
  "Volumetric Fog": "volumetric light fog, god rays through mist, atmospheric haze",
  "Gradient Flow": "smooth color gradient transitions, flowing hue shifts",
  "Ripple Grid": "water ripple interference on grid, concentric wave patterns",
  "Polar Kaleidoscope": "kaleidoscopic radial symmetry, mirrored segments, polar coordinates",
  "Sunburst Rays": "radiating sunburst beams, light rays from center, starburst pattern",
};

// Fully internal style-texture generation (no external API). Renders a pattern
// that MATCHES the selected style names (grid, shards, marble, voronoi, ...),
// not just a gradient. See textureEngine.categorize for the mapping.
export async function generateStyleTexture(styles: string[], seed: number = 0): Promise<{ textureUrl: string; colors: string[] }>
{
  const textureUrl = renderStyleTexture(styles, seed, 512);
  return { textureUrl, colors: getStyleColors(styles) };
}

export function getStyleColors(styles: string[]): string[] {
  // Prefer the curated per-style palette (hero colours) so the extracted
  // primary/secondary/accent the visualizers use actually match the style.
  const named = styles.map((s) => STYLE_PALETTES[s]).filter(Boolean) as string[][];
  if (named.length) {
    const merged = Array.from(new Set(named.flat()));
    return merged.slice(0, 3);
  }
  const styleHues = styles.map((s, i) => (Math.abs(hashCode(s)) + i * 47) % 360);
  return styleHues.slice(0, 3).map((h, idx) => `hsl(${h} 70% ${idx === 0 ? 60 : idx === 1 ? 50 : 70}%)`);
}

function hashCode(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function hashArray(arr: string[]) {
  return arr.reduce((acc, s) => acc + "-" + s, "");
}

function mulberry32(aStr: string) {
  let a = 0;
  for (let i = 0; i < aStr.length; i++) a = (a + aStr.charCodeAt(i)) | 0;
  return function() {
    let t = (a += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}
