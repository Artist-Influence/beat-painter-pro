import DiamondOrbVisualizer from "./DiamondOrbVisualizer";
import AlienMembraneVisualizer from "./AlienMembraneVisualizer";
import NeuralLatticeVisualizer from "./NeuralLatticeVisualizer";
import AngelWingsVisualizer from "./AngelWingsVisualizer";
import CubicCloudsVisualizer from "./CubicCloudsVisualizer";
import DancingGnomeCapsVisualizer from "./DancingGnomeCapsVisualizer";
import PsychedelicMandalaVisualizer from "./PsychedelicMandalaVisualizer";
import HypercubePortalVisualizer from "./HypercubePortalVisualizer";
import SacredGeometryPulseVisualizer from "./SacredGeometryPulseVisualizer";
import StroboscopicTunnelVisualizer from "./StroboscopicTunnelVisualizer";
import WaveRibbonsVisualizer from "./WaveRibbonsVisualizer";
import DNAHelixVisualizer from "./DNAHelixVisualizer";
import CircuitPulseVisualizer from "./CircuitPulseVisualizer";
import NeonSkylineVisualizer from "./NeonSkylineVisualizer";
import ElectricFieldVisualizer from "./ElectricFieldVisualizer";
import { CustomVisualizerLoader } from "./CustomVisualizerLoader";
import { makeFractalVisualizer, RandomFractalVisualizer } from "./FractalVisualizer";
import { FRACTAL_PRESETS } from "@/lib/fractal/engine";
import { makeCartoonVisualizer } from "./Cartoon2DVisualizer";
import { CARTOON_PRESETS } from "@/lib/cartoon/cartoonEngine";
import { makeProceduralVisualizer, modelName, modelEmoji } from "./ProceduralPreset";
import { MODEL_PRESETS } from "@/lib/modelGenerator";
import { lazy } from "react";
import { makeSandVisualizer } from "./SandFlowVisualizer";
import { SAND_PRESETS } from "@/lib/sand/sandEngine";
import { SAND3D_PRESETS, SAND3D_PALETTES, type Sand3DConfig } from "@/lib/sand3d/unicornEngine";
import { DAW_PRESETS, type DawConfig } from "@/lib/daw/dawEngine";

// Sand3D (GPGPU particle sim) and DAW (waveform decode + FFT spectrogram) are the
// two heaviest visualizers. We import only their PRESET DATA eagerly (the picker
// needs it); the component modules - and therefore their GLSL shaders, FFT and
// audio-decode code - load on demand via React.lazy, so they're tree-shaken into
// a separate chunk and never parsed on a phone that only opens a light visualizer.
const makeSand3DLazy = (preset: Sand3DConfig) =>
  lazy(async () => ({ default: (await import("./Sand3DVisualizer")).makeSand3DVisualizer(preset) }));
const makeDawLazy = (preset: DawConfig) =>
  lazy(async () => ({ default: (await import("./DawWaveformVisualizer")).makeDawVisualizer(preset) }));

export type { VisualizerProps } from "../visualizer";

// Shader-driven fractal visualizers (2D escape-time + 3D raymarched), built from
// the curated preset library. Full-screen shaders, so their scale is fixed at 1.
const fractalComponents = Object.fromEntries(
  FRACTAL_PRESETS.map((c) => [c.id, makeFractalVisualizer(c)]),
);
const cartoonComponents = Object.fromEntries(
  CARTOON_PRESETS.map((c) => [c.id, makeCartoonVisualizer(c)]),
);
const sandComponents = Object.fromEntries(
  SAND_PRESETS.map((c) => [c.id, makeSandVisualizer(c)]),
);
const sand3dComponents = Object.fromEntries(
  SAND3D_PRESETS.map((c) => [c.id, makeSand3DLazy(c)]),
);
const dawComponents = Object.fromEntries(
  DAW_PRESETS.map((c) => [c.id, makeDawLazy(c)]),
);
// 80 browsable 3D model bases (configs carry no id; assign Model{i} here).
const modelComponents = Object.fromEntries(
  MODEL_PRESETS.map((c, i) => [`Model${i}`, makeProceduralVisualizer(c)]),
);
// ---- per-preset colour swatch (so the library can show each as its own gradient
// card instead of a wall of repeating icons). Derived from each config's real
// palette so the swatch actually matches what the preset looks like. ----
const hx = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
const hslHex = (h: number, s: number, l: number) => {
  h = (((h % 360) + 360) % 360) / 360; s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => { const k = (n + h * 12) % 12; return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
  return `#${hx(f(0) * 255)}${hx(f(8) * 255)}${hx(f(4) * 255)}`;
};
const cosHex = (p: { a: number[]; b: number[]; c: number[]; d: number[] }, t: number) =>
  `#${[0, 1, 2].map((i) => hx(255 * (p.a[i] + p.b[i] * Math.cos(6.28318 * (p.c[i] * t + p.d[i]))))).join('')}`;

export const FRACTAL_META = [
  ...MODEL_PRESETS.map((c, i) => {
    const h = (((c.seed % 360) + 360) % 360);
    return { id: `Model${i}`, name: modelName(c), emoji: modelEmoji(c), kind: '3D · MODEL', swatch: [hslHex(h, 68, 52), hslHex(h + 46, 64, 38)] as [string, string] };
  }),
  ...CARTOON_PRESETS.map((c) => ({ id: c.id, name: c.name, emoji: c.emoji, kind: '2D · CARTOON', swatch: [c.palette[0], c.palette[2]] as [string, string] })),
  ...FRACTAL_PRESETS.map((c) => ({
    id: c.id, name: c.name, emoji: c.emoji,
    kind: c.family === '3d' ? '3D · RAYMARCH' : '2D · ESCAPE',
    swatch: [cosHex(c.palette, 0.32), cosHex(c.palette, 0.72)] as [string, string],
  })),
  ...SAND3D_PRESETS.map((c) => {
    const p = SAND3D_PALETTES[c.paletteIndex];
    let hsh = 0; for (let k = 0; k < c.id.length; k++) hsh = (hsh * 31 + c.id.charCodeAt(k)) | 0;
    // base palette hue + the roll's hueShift + a per-preset jitter so the 5 base
    // palettes don't read as 5 repeating swatches across 80 cards
    const h = (p.hue + (c.hueShift || 0)) * 360 + (Math.abs(hsh) % 64) - 32;
    return { id: c.id, name: c.name, emoji: c.emoji, kind: 'PARTICLE · 3D SAND', swatch: [hslHex(h, p.sat * 100, 60), hslHex(h + 20, p.sat * 100, 32)] as [string, string] };
  }),
  ...SAND_PRESETS.map((c) => ({ id: c.id, name: c.name, emoji: c.emoji, kind: 'PARTICLE · SAND', swatch: [c.palette[1] || c.palette[0], c.palette[0]] as [string, string] })),
  ...DAW_PRESETS.map((c) => ({ id: c.id, name: c.name, emoji: c.emoji, kind: 'DAW · WAVEFORM', swatch: [c.waveColor, c.waveColor2] as [string, string] })),
];

// Normalized scales for consistent sizing across all visualizers
export const VISUALIZER_SCALES: Record<string, number> = {
  DiamondOrbVisualizer: 0.30,
  AlienMembraneVisualizer: 0.30,
  NeuralLatticeVisualizer: 0.30,
  AngelWingsVisualizer: 0.30,
  CubicCloudsVisualizer: 0.30,
  DancingGnomeCapsVisualizer: 0.30,
  PsychedelicMandalaVisualizer: 0.30,
  HypercubePortalVisualizer: 0.30,
  SacredGeometryPulseVisualizer: 0.30,
  StroboscopicTunnelVisualizer: 0.30,
  WaveRibbonsVisualizer: 0.30,
  DNAHelixVisualizer: 0.30,
  CircuitPulseVisualizer: 0.30,
  NeonSkylineVisualizer: 0.30,
  ElectricFieldVisualizer: 0.30,
  // fractals + cartoons fill the screen via a clip-space quad; scale is irrelevant (kept at 1)
  ...Object.fromEntries(FRACTAL_PRESETS.map((c) => [c.id, 1])),
  ...Object.fromEntries(CARTOON_PRESETS.map((c) => [c.id, 1])),
  ...Object.fromEntries(SAND_PRESETS.map((c) => [c.id, 1])),
  ...Object.fromEntries(SAND3D_PRESETS.map((c) => [c.id, 1])),
  ...Object.fromEntries(DAW_PRESETS.map((c) => [c.id, 1])),
  // 3D models render in-scene; match the procedural preview scale
  ...Object.fromEntries(MODEL_PRESETS.map((_, i) => [`Model${i}`, 0.5])),
  FractalRandom: 1,
};

export const visualizerRegistry = {
  ...fractalComponents,
  ...cartoonComponents,
  ...sandComponents,
  ...sand3dComponents,
  ...dawComponents,
  ...modelComponents,
  FractalRandom: RandomFractalVisualizer,
  DiamondOrbVisualizer,
  AlienMembraneVisualizer,
  NeuralLatticeVisualizer,
  AngelWingsVisualizer,
  CubicCloudsVisualizer,
  DancingGnomeCapsVisualizer,
  PsychedelicMandalaVisualizer,
  HypercubePortalVisualizer,
  SacredGeometryPulseVisualizer,
  StroboscopicTunnelVisualizer,
  WaveRibbonsVisualizer,
  DNAHelixVisualizer,
  CircuitPulseVisualizer,
  NeonSkylineVisualizer,
  ElectricFieldVisualizer,
  CustomVisualizerLoader,
};

export type VisualizerKey = keyof typeof visualizerRegistry | `custom_${string}`;

// Helper function to check if a key is a custom visualizer
export function isCustomVisualizer(key: string): key is `custom_${string}` {
  return key.startsWith('custom_');
}
