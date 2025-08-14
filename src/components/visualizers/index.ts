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
import ParticleFieldVisualizer from "./ParticleFieldVisualizer";
import LiquidMetalVisualizer from "./LiquidMetalVisualizer";
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
  ParticleFieldVisualizer: 0.2,
  LiquidMetalVisualizer: 0.35,
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
  ParticleFieldVisualizer,
  LiquidMetalVisualizer,
  CircuitPulseVisualizer,
  NeonSkylineVisualizer,
};

export type VisualizerKey = keyof typeof visualizerRegistry;
