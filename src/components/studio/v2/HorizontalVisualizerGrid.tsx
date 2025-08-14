import React from 'react';
import { motion } from 'framer-motion';
import { useStudioStore } from '@/stores/studioStore';
import { type VisualizerKey } from '@/components/visualizers';

export function HorizontalVisualizerGrid() {
  const { selected, setSelected } = useStudioStore();

  const horizontalVisualizers = [
    { id: 'WaveRibbonsVisualizer', name: 'Wave Ribbons', preview: '🌊', description: 'Flowing silk ribbons' },
    { id: 'DNAHelixVisualizer', name: 'DNA Helix', preview: '🧬', description: 'Double helix structures' },
    { id: 'LiquidMetalVisualizer', name: 'Liquid Metal', preview: '🌐', description: 'Ferrofluid morphing' },
    { id: 'CircuitPulseVisualizer', name: 'Circuit Pulse', preview: '⚡', description: 'Electronic pathways' },
    { id: 'NeonSkylineVisualizer', name: 'Neon Skyline', preview: '🏙️', description: 'Cyberpunk cityscape' },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-white/80 text-sm font-medium mb-3">Horizontal Visualizers</h3>
      <p className="text-white/60 text-xs mb-3">These visualizers stretch beyond the preview window for short-form video editing</p>
      
      <div className="grid grid-cols-2 gap-2">
        {horizontalVisualizers.map((viz, index) => (
          <motion.button
            key={viz.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => setSelected(viz.id as VisualizerKey)}
            className={`group relative h-16 rounded-xl border transition-all overflow-hidden ${
              selected === viz.id
                ? 'bg-purple-600/20 border-purple-500/50 shadow-lg shadow-purple-600/20'
                : 'bg-white/5 border-white/10 hover:border-purple-500/30 hover:bg-white/10'
            }`}
          >
            {/* Content */}
            <div className="absolute inset-0 flex items-center p-3">
              <div className="text-xl mr-3">{viz.preview}</div>
              <div className="flex-1 text-left">
                <div className="text-xs text-white font-medium">
                  {viz.name}
                </div>
                <div className="text-xs text-white/60 leading-tight">
                  {viz.description}
                </div>
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