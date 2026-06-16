import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useStudioStore } from '@/stores/studioStore';
import { visualizerRegistry, FRACTAL_META, type VisualizerKey } from '@/components/visualizers';
import { useCustomVisualizers } from '@/hooks/useCustomVisualizers';
import { GeneratorModal } from './GeneratorModal';
import { usePresetStore } from '@/stores/presetStore';
import { Wand2, Trash2, Crown, Star, RefreshCcw, Bookmark } from 'lucide-react';

export function VisualizerGrid() {
  const { selected, setSelected, setBackgroundTransparent } = useStudioStore();
  const {
    customVisualizers,
    deleteVisualizer,
    promoteToStandard,
    userRole,
    quotaRemaining,
    refetch,
  } = useCustomVisualizers();
  const savedPresets = usePresetStore((s) => s.presets);
  const removePreset = usePresetStore((s) => s.removePreset);
  const [showGenerator, setShowGenerator] = useState(false);

  const fractalVisualizers = [
    { id: 'FractalRandom', name: 'Random Fractal', preview: '🎲', description: 'Re-rolls a unique fractal every click' },
    ...FRACTAL_META.map((f) => ({ id: f.id, name: f.name, preview: f.emoji, description: f.kind })),
  ];

  const standardVisualizers = [
    { id: 'DiamondOrbVisualizer', name: 'Diamond Orb', preview: '💎', description: 'Crystalline energy patterns' },
    { id: 'AlienMembraneVisualizer', name: 'Alien Membrane', preview: '👽', description: 'Organic flowing surfaces' },
    { id: 'NeuralLatticeVisualizer', name: 'Neural Lattice', preview: '🧠', description: 'Interconnected neural networks' },
    { id: 'AngelWingsVisualizer', name: 'Angel Wings', preview: '🪶', description: 'Ethereal wing formations' },
    { id: 'CubicCloudsVisualizer', name: 'Cubic Clouds', preview: '☁️', description: 'Geometric cloud patterns' },
    { id: 'DancingGnomeCapsVisualizer', name: 'Dancing Gnome Caps', preview: '🍄', description: 'Rhythmic mushroom dance' },
    { id: 'PsychedelicMandalaVisualizer', name: 'Psychedelic Mandala', preview: '🌀', description: 'Kaleidoscopic patterns' },
    { id: 'HypercubePortalVisualizer', name: 'Hypercube Portal', preview: '🔮', description: 'Dimensional gateway' },
    { id: 'SacredGeometryPulseVisualizer', name: 'Sacred Geometry', preview: '⚡', description: 'Ancient geometric forms' },
    { id: 'NeonSkylineVisualizer', name: 'Neon Skyline', preview: '🏙️', description: 'Cyberpunk cityscape' },
    { id: 'ElectricFieldVisualizer', name: 'Electric Field', preview: '🧲', description: 'Electric field patterns' },
  ];

  const base = { isCustom: false as boolean, customId: null as string | null, isPreset: false as boolean, presetId: null as string | null };

  // Saved generator presets (client-side, persisted in localStorage)
  const presetVisualizers = savedPresets.map(p => ({
    id: p.id,
    name: p.name,
    preview: p.emoji,
    description: p.item.kind === 'procedural' ? '3D · MODEL'
      : p.item.kind === 'cartoon' ? '2D · CARTOON'
      : p.item.kind === 'sand' ? 'PARTICLE · SAND'
      : p.item.kind === 'sand3d' ? 'PARTICLE · 3D SAND'
      : p.item.kind === 'daw' ? 'DAW · WAVEFORM'
      : (p.item.fractal.family === '3d' ? '3D · FRACTAL' : '2D · FRACTAL'),
    ...base,
    isPreset: true,
    presetId: p.id,
  }));

  // Combine fractals (template base) + saved presets + standard visualizers + custom visualizers
  const allVisualizers = [
    ...fractalVisualizers.map(viz => ({ ...viz, ...base })),
    ...presetVisualizers,
    ...standardVisualizers.map(viz => ({ ...viz, ...base })),
    ...customVisualizers.map(cv => ({
      id: `custom_${cv.id}`,
      name: cv.name.replace(/([A-Z])/g, ' $1').trim(),
      preview: cv.preview_emoji,
      description: cv.description || 'Custom visualizer',
      ...base,
      isCustom: true,
      customId: cv.id,
    })),
  ];

  return (
    <>
      <div className="space-y-6">
        {/* Generate New Visualizer Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-eyebrow">create</p>
              <div className="flex items-center gap-2">
                <h3 className="text-text-primary text-sm font-semibold">New Visualizer</h3>
                {userRole === 'admin' && (
                  <span className="chip !text-amber !border-amber/40">
                    <Crown className="w-3 h-3" />
                    Admin
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {userRole !== 'admin' && (
                <span className="text-xs text-text-tertiary font-mono-num whitespace-nowrap">
                  {quotaRemaining}/5 LEFT
                </span>
              )}
              <button
                onClick={refetch}
                className="btn btn-glass h-7 w-7 !p-0"
                title="Refresh"
              >
                <RefreshCcw className="w-3 h-3" />
              </button>
            </div>
          </div>

          <button
            onClick={() => setShowGenerator(true)}
            className="btn btn-primary w-full h-10 text-sm"
          >
            <Wand2 className="w-4 h-4" />
            Generate New Visualizer
          </button>
        </div>

        {/* All Visualizers Section (Standard + User's Saved) */}
        <div className="space-y-4">
          <div>
            <p className="text-eyebrow">library</p>
            <div className="flex items-center gap-2">
              <h3 className="text-text-primary text-sm font-semibold">Visualizers</h3>
              {customVisualizers.length > 0 && (
                <span className="chip">{customVisualizers.length} saved</span>
              )}
            </div>
          </div>
        
          <div className="grid grid-cols-3 gap-2">
            {allVisualizers.map((viz, index) => (
              <motion.div
                key={viz.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="group relative"
              >
                <motion.button
                  onClick={() => {
                    if (viz.id === 'FractalRandom' && selected === 'FractalRandom') {
                      window.dispatchEvent(new CustomEvent('fractal:reroll'));
                    } else {
                      setSelected(viz.id as VisualizerKey);
                      if (viz.isPreset) {
                        const p = savedPresets.find((x) => x.id === viz.id);
                        if (p?.item.standalone) setBackgroundTransparent();
                      }
                    }
                  }}
                  className={`w-full aspect-square rounded-xl border transition-all overflow-hidden ${
                    selected === viz.id
                      ? 'bg-ai-red/[0.10] border-ai-red shadow-glow'
                      : 'bg-surface-2/40 border-hairline/50 hover:border-ai-red/40 hover:bg-ai-red/[0.06]'
                  }`}
                >
                  {/* Default content */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-2 group-hover:opacity-0 transition-opacity duration-200">
                    <div className="text-lg mb-1">{viz.preview}</div>
                    <div className="text-[10px] text-text-tertiary text-center leading-tight">
                      {viz.name}
                    </div>
                  </div>

                  {/* Hover content - larger emoji only */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <div className="text-2xl transform group-hover:scale-125 transition-transform duration-200">{viz.preview}</div>
                  </div>

                  {/* Active indicator */}
                  {selected === viz.id && (
                    <div className="absolute top-2 right-2 w-2 h-2 bg-ai-red rounded-full shadow-glow"></div>
                  )}

                  {/* Saved/Custom indicator */}
                  {(viz.isCustom || viz.isPreset) && (
                    <div className="absolute top-1.5 left-1.5">
                      <Bookmark className="w-3 h-3 text-ai-red fill-ai-red" />
                    </div>
                  )}
                </motion.button>

                {/* Delete button for saved presets */}
                {viz.isPreset && viz.presetId && (
                  <div className="absolute -top-1 -right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (selected === viz.presetId) setSelected('FractalRandom' as VisualizerKey);
                        removePreset(viz.presetId!);
                      }}
                      className="w-5 h-5 bg-ai-red hover:bg-ai-red/80 rounded-full flex items-center justify-center text-white"
                      title="Delete preset"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {/* Action buttons for custom visualizers only */}
                {viz.isCustom && viz.customId && (
                  <div className="absolute -top-1 -right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {userRole === 'admin' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          promoteToStandard(viz.customId!);
                        }}
                        className="w-5 h-5 bg-yellow-600 hover:bg-yellow-700 rounded-full flex items-center justify-center text-white"
                        title="Promote to standard visualizer"
                      >
                        <Star className="w-3 h-3" />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteVisualizer(viz.customId!);
                      }}
                      className="w-5 h-5 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center text-white"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <GeneratorModal
        isOpen={showGenerator}
        onClose={() => setShowGenerator(false)}
      />
    </>
  );
}
