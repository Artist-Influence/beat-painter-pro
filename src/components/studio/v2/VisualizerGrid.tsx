import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useStudioStore } from '@/stores/studioStore';
import { visualizerRegistry, FRACTAL_META, type VisualizerKey } from '@/components/visualizers';
import { useCustomVisualizers } from '@/hooks/useCustomVisualizers';
import { GeneratorModal } from './GeneratorModal';
import { usePresetStore } from '@/stores/presetStore';
import { Wand2, Trash2, Crown, Star, RefreshCcw, Bookmark } from 'lucide-react';

export function VisualizerGrid() {
  const { selected, setSelected, setBackgroundTransparent, activeLayerId, layers, setLayerSelected, addLayer, removeLayer, setActiveLayerId, timeline, updateClip } = useStudioStore();
  // Routing priority for what the library fills:
  //   1. the selected TIMELINE viz clip (when the timeline is on)
  //   2. the active extra LAYER
  //   3. the PRIMARY visualizer
  // The highlight + active dot follow whichever target is selected.
  const selVizClip = timeline.enabled && timeline.selectedClipId
    ? timeline.clips.find((c) => c.id === timeline.selectedClipId && c.track === 'viz')
    : undefined;
  const targetSelected = selVizClip ? (selVizClip.selected ?? selected)
    : activeLayerId ? (layers.find((l) => l.id === activeLayerId)?.selected ?? selected)
    : selected;
  const pickViz = (id: string) => {
    if (selVizClip) { updateClip(selVizClip.id, { selected: id }); setSelected(id as VisualizerKey); } // edit clip + live preview
    else if (activeLayerId) setLayerSelected(activeLayerId, id);
    else setSelected(id as VisualizerKey);
  };
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

          {/* Layers (Phase 2): choose which visualizer you're editing - the Primary or
              an extra layer stacked on top. The library below fills the selected
              target; frame each one in the Composite panel. */}
          <div className="space-y-2 rounded-md p-2.5 border border-hairline/50 bg-surface-2/40">
            <div className="flex items-center justify-between">
              <p className="text-eyebrow">layers</p>
              {layers.length < 3 && (
                <button onClick={() => addLayer(selected as string)} className="pill text-xs" title="Stack another visualizer on top">
                  + Layer
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button onClick={() => setActiveLayerId(null)}
                className={`pill text-xs ${activeLayerId === null ? 'pill-active' : ''}`}>
                Primary
              </button>
              {layers.map((l, i) => (
                <span key={l.id} className="inline-flex items-center">
                  <button onClick={() => setActiveLayerId(l.id)}
                    className={`pill text-xs !rounded-r-none ${activeLayerId === l.id ? 'pill-active' : ''}`}>
                    Layer {i + 1}
                  </button>
                  <button onClick={() => removeLayer(l.id)} title="Remove this layer"
                    className={`pill text-xs !rounded-l-none !px-1.5 ${activeLayerId === l.id ? 'pill-active' : ''} hover:text-ai-red`}>
                    ×
                  </button>
                </span>
              ))}
            </div>
            <p className="text-caption">
              {activeLayerId
                ? 'Editing a layer - pick its visualizer below, then position it in the Composite panel.'
                : 'Editing the main visualizer. Add a layer to stack another on top of the same background.'}
            </p>
          </div>
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
                    if (viz.id === 'FractalRandom' && targetSelected === 'FractalRandom') {
                      window.dispatchEvent(new CustomEvent('fractal:reroll'));
                    } else {
                      pickViz(viz.id);
                      if (!activeLayerId && viz.isPreset) {
                        const p = savedPresets.find((x) => x.id === viz.id);
                        if (p?.item.standalone) setBackgroundTransparent();
                      }
                    }
                  }}
                  className={`w-full aspect-square rounded-xl border transition-all overflow-hidden ${
                    targetSelected === viz.id
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
                  {targetSelected === viz.id && (
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
