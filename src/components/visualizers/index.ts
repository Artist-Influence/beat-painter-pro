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
import ChakraActivatorVisualizer from "./ChakraActivatorVisualizer";
import WaveRibbonsVisualizer from "./WaveRibbonsVisualizer";
import DNAHelixVisualizer from "./DNAHelixVisualizer";
import LiquidMetalVisualizer from "./LiquidMetalVisualizer";
import LiquidMetalVisualizerStandalone from "./LiquidMetalVisualizerStandalone";
import CircuitPulseVisualizer from "./CircuitPulseVisualizer";
import NeonSkylineVisualizer from "./NeonSkylineVisualizer";

export type { VisualizerProps } from "../visualizer";

export const VISUALIZER_SCALES: Record<string, number> = {
  DiamondOrbVisualizer: 0.15,
  AlienMembraneVisualizer: 0.08,
  NeuralLatticeVisualizer: 0.033,
  AngelWingsVisualizer: 0.6,
  CubicCloudsVisualizer: 0.1,
  DancingGnomeCapsVisualizer: 0.25,
  PsychedelicMandalaVisualizer: 0.3,
  HypercubePortalVisualizer: 0.4,
  SacredGeometryPulseVisualizer: 0.35,
  StroboscopicTunnelVisualizer: 0.3,
  ChakraActivatorVisualizer: 0.25,
  WaveRibbonsVisualizer: 0.4,
  DNAHelixVisualizer: 0.3,
  LiquidMetalVisualizer: 0.35,
  LiquidMetalVisualizerStandalone: 0.3,
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
  ChakraActivatorVisualizer,
  WaveRibbonsVisualizer,
  DNAHelixVisualizer,
  LiquidMetalVisualizer,
  LiquidMetalVisualizerStandalone,
  CircuitPulseVisualizer,
  NeonSkylineVisualizer,
};

export type VisualizerKey = keyof typeof visualizerRegistry;
