import React from 'react';
import { motion } from 'framer-motion';
import { useStudioStore } from '@/stores/studioStore';
import { visualizerRegistry, type VisualizerKey } from '@/components/visualizers';

export function VisualizerGrid() {
  const { selected, setSelected } = useStudioStore();

  const visualizers = [
    { id: 'DiamondOrbVisualizer', name: 'Diamond Orb', preview: '💎', description: 'Crystalline energy patterns' },
    { id: 'AlienMembraneVisualizer', name: 'Alien Membrane', preview: '👽', description: 'Organic flowing surfaces' },
    { id: 'NeuralLatticeVisualizer', name: 'Neural Lattice', preview: '🧠', description: 'Interconnected neural networks' },
    { id: 'AngelWingsVisualizer', name: 'Angel Wings', preview: '🪶', description: 'Ethereal wing formations' },
    { id: 'CubicCloudsVisualizer', name: 'Cubic Clouds', preview: '☁️', description: 'Geometric cloud patterns' },
    { id: 'DancingGnomeCapsVisualizer', name: 'Dancing Gnome Caps', preview: '🍄', description: 'Rhythmic mushroom dance' },
    { id: 'PsychedelicMandalaVisualizer', name: 'Psychedelic Mandala', preview: '🌀', description: 'Kaleidoscopic patterns' },
    { id: 'HypercubePortalVisualizer', name: 'Hypercube Portal', preview: '🔮', description: 'Dimensional gateway' },
    { id: 'SacredGeometryPulseVisualizer', name: 'Sacred Geometry', preview: '⚡', description: 'Ancient geometric forms' },
    { id: 'StroboscopicTunnelVisualizer', name: 'Stroboscopic Tunnel', preview: '🌪️', description: 'Hypnotic tunnel vision' },
    { id: 'ChakraActivatorVisualizer', name: 'Chakra Activator', preview: '🧘', description: 'Energy center alignment' },
    { id: 'WaveRibbonsVisualizer', name: 'Wave Ribbons', preview: '🌊', description: 'Flowing silk ribbons' },
    { id: 'DNAHelixVisualizer', name: 'DNA Helix', preview: '🧬', description: 'Double helix structures' },
    { id: 'ParticleFieldVisualizer', name: 'Particle Field', preview: '✨', description: 'Starfield particles' },
    { id: 'LiquidMetalVisualizer', name: 'Liquid Metal', preview: '🌐', description: 'Ferrofluid morphing' },
    { id: 'CircuitPulseVisualizer', name: 'Circuit Pulse', preview: '⚡', description: 'Electronic pathways' },
    { id: 'NeonSkylineVisualizer', name: 'Neon Skyline', preview: '🏙️', description: 'Cyberpunk cityscape' },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-white/80 text-sm font-medium mb-3">Choose Visualizer</h3>
      
      <div className="grid grid-cols-3 gap-2">
        {visualizers.map((viz, index) => (
          <motion.button
            key={viz.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => setSelected(viz.id as VisualizerKey)}
            className={`group relative aspect-square rounded-xl border transition-all overflow-hidden ${
              selected === viz.id
                ? 'bg-purple-600/20 border-purple-500/50 shadow-lg shadow-purple-600/20'
                : 'bg-white/5 border-white/10 hover:border-purple-500/30 hover:bg-white/10'
            }`}
          >
            {/* Preview */}
            <div className="absolute inset-0 flex flex-col items-center justify-center p-2">
              <div className="text-lg mb-1">{viz.preview}</div>
              <div className="text-[10px] text-white/60 text-center leading-tight">
                {viz.name}
              </div>
            </div>
            
            {/* Hover overlay with description */}
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="text-lg mb-2">{viz.preview}</div>
              <div className="text-xs text-white font-medium text-center mb-1">
                {viz.name}
              </div>
              <div className="text-xs text-white/60 text-center leading-tight">
                {viz.description}
              </div>
            </div>
            
            {/* Active indicator */}
            {selected === viz.id && (
              <div className="absolute top-2 right-2 w-2 h-2 bg-purple-400 rounded-full"></div>
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );
}