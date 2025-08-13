import DiamondOrbVisualizer from "./DiamondOrbVisualizer";
import AlienMembraneVisualizer from "./AlienMembraneVisualizer";
import NeuralLatticeVisualizer from "./NeuralLatticeVisualizer";
import AngelWingsVisualizer from "./AngelWingsVisualizer";
import CubicCloudsVisualizer from "./CubicCloudsVisualizer";
import DancingGnomeCapsVisualizer from "./DancingGnomeCapsVisualizer";
import PsychedelicMandalaVisualizer from "./PsychedelicMandalaVisualizer";

export type { VisualizerProps } from "../visualizer";

export const VISUALIZER_SCALES: Record<string, number> = {
  DiamondOrbVisualizer: 0.15,
  AlienMembraneVisualizer: 0.08,
  NeuralLatticeVisualizer: 0.033,
  AngelWingsVisualizer: 0.6,
  CubicCloudsVisualizer: 0.2,
  DancingGnomeCapsVisualizer: 0.25,
  PsychedelicMandalaVisualizer: 0.3,
};

export const visualizerRegistry = {
  DiamondOrbVisualizer,
  AlienMembraneVisualizer,
  NeuralLatticeVisualizer,
  AngelWingsVisualizer,
  CubicCloudsVisualizer,
  DancingGnomeCapsVisualizer,
  PsychedelicMandalaVisualizer,
};

export type VisualizerKey = keyof typeof visualizerRegistry;
