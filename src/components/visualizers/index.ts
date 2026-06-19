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
import { lazy } from "react";
import { makeSandVisualizer } from "./SandFlowVisualizer";
import { SAND_PRESETS } from "@/lib/sand/sandEngine";
import { SAND3D_PRESETS, type Sand3DConfig } from "@/lib/sand3d/unicornEngine";
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
export const FRACTAL_META = [
  ...DAW_PRESETS.map((c) => ({ id: c.id, name: c.name, emoji: c.emoji, kind: 'DAW · WAVEFORM' })),
  ...FRACTAL_PRESETS.map((c) => ({
    id: c.id, name: c.name, emoji: c.emoji,
    kind: c.family === '3d' ? '3D · RAYMARCH' : '2D · ESCAPE',
  })),
  ...SAND3D_PRESETS.map((c) => ({ id: c.id, name: c.name, emoji: c.emoji, kind: 'PARTICLE · 3D SAND' })),
  ...SAND_PRESETS.map((c) => ({ id: c.id, name: c.name, emoji: c.emoji, kind: 'PARTICLE · SAND' })),
  ...CARTOON_PRESETS.map((c) => ({ id: c.id, name: c.name, emoji: c.emoji, kind: '2D · CARTOON' })),
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
  FractalRandom: 1,
};

export const visualizerRegistry = {
  ...fractalComponents,
  ...cartoonComponents,
  ...sandComponents,
  ...sand3dComponents,
  ...dawComponents,
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
