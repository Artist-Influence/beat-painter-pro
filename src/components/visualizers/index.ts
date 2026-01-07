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

export type { VisualizerProps } from "../visualizer";

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
