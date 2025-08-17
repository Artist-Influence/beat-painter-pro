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
import DanasEyeVisualizer from "./DanasEyeVisualizer";
import FluidBloomVisualizer from "./FluidBloomVisualizer";
import CircuitPulseVisualizer from "./CircuitPulseVisualizer";
import NeonSkylineVisualizer from "./NeonSkylineVisualizer";
import { CustomVisualizerLoader } from "./CustomVisualizerLoader";

export type { VisualizerProps } from "../visualizer";

export const VISUALIZER_SCALES: Record<string, number> = {
  DiamondOrbVisualizer: 0.18,
  AlienMembraneVisualizer: 0.08,
  NeuralLatticeVisualizer: 0.066,
  AngelWingsVisualizer: 0.6,
  CubicCloudsVisualizer: 0.1,
  DancingGnomeCapsVisualizer: 0.25,
  PsychedelicMandalaVisualizer: 0.3,
  HypercubePortalVisualizer: 0.4,
  SacredGeometryPulseVisualizer: 0.35,
  StroboscopicTunnelVisualizer: 0.3,
  WaveRibbonsVisualizer: 0.4,
  DNAHelixVisualizer: 0.3,
  DanasEyeVisualizer: 0.25,
  FluidBloomVisualizer: 0.3,
  CircuitPulseVisualizer: 0.4,
  NeonSkylineVisualizer: 0.3,
};

export const visualizerRegistry = {
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
  DanasEyeVisualizer,
  FluidBloomVisualizer,
  CircuitPulseVisualizer,
  NeonSkylineVisualizer,
  CustomVisualizerLoader,
};

export type VisualizerKey = keyof typeof visualizerRegistry | `custom_${string}`;

// Helper function to check if a key is a custom visualizer
export function isCustomVisualizer(key: string): key is `custom_${string}` {
  return key.startsWith('custom_');
}
