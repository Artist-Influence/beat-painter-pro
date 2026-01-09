import { supabase } from "@/integrations/supabase/client";

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

export async function generateStyleTexture(styles: string[], seed: number = 0): Promise<{ textureUrl: string; colors: string[] }>
{
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { textureUrl: "", colors: [] };

  // Deterministic hues and gradient based on styles + seed
  const styleHues = styles.map((s, i) => (Math.abs(hashCode(s)) + i * 47 + seed * 29) % 360);
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  styleHues.forEach((h, i) => {
    const stop = i / Math.max(1, styleHues.length - 1);
    gradient.addColorStop(stop, `hsl(${h} 70% 55%)`);
  });

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  // Seeded noise for texture variation
  const rng = mulberry32(hashArray([...styles, String(seed)]));
  const imgData = ctx.getImageData(0, 0, size, size);
  for (let i = 0; i < imgData.data.length; i += 4) {
    const n = (rng() - 0.5) * 10;
    imgData.data[i] = clamp(imgData.data[i] + n, 0, 255);
    imgData.data[i + 1] = clamp(imgData.data[i + 1] + n, 0, 255);
    imgData.data[i + 2] = clamp(imgData.data[i + 2] + n, 0, 255);
  }
  ctx.putImageData(imgData, 0, 0);

  // Procedural result as default
  let textureUrl = canvas.toDataURL("image/png");
  const colors = getStyleColors(styles);

  try {
    const descriptorText = styles.map((s) => STYLE_DESCRIPTORS[s] ?? s).join(" blending into ");
    const colorHints = getStyleColors(styles).join(", ");
    const prompt = `Abstract artistic background, ${descriptorText}, smooth gradients merging together, atmospheric depth, cinematic lighting, ultra high quality, 8K resolution, color palette: ${colorHints}, full frame composition, no borders, no text, no logos, no objects, no people`;
    const negativePrompt = "tiles, tiled pattern, grid, seams, collage, patchwork, separate sections, split image, mosaic, repeated pattern, text, logo, watermark, person, face, object, photograph, realistic";
    const { data, error } = await supabase.functions.invoke("generate-image", {
      body: { prompt, negativePrompt, seed },
    });

    if (!error && data && typeof (data as any).image === "string" && (data as any).image.startsWith("data:image")) {
      textureUrl = (data as any).image as string;
    } else {
      // eslint-disable-next-line no-console
      console.warn("HF generation unavailable, using procedural texture.", error);
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn("HF generation error, using procedural texture.", error);
  }

  return { textureUrl, colors };
}

export function getStyleColors(styles: string[]): string[] {
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
