import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useStudioStore } from '@/stores/studioStore';
import { visualizerRegistry, FRACTAL_META, type VisualizerKey } from '@/components/visualizers';
import { useCustomVisualizers } from '@/hooks/useCustomVisualizers';
import { GeneratorModal } from './GeneratorModal';
import { usePresetStore } from '@/stores/presetStore';
import { Wand2, Trash2, Crown, Star, RefreshCcw, Bookmark } from 'lucide-react';

// Deterministic gradient from any id - gives saved/custom/FX tiles a unique-ish
// colour even without a real palette, so tiles never repeat (and no icons).
const gradFromString = (s: string): [string, string] => {
  let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  const hue = Math.abs(h) % 360;
  const hsl = (hh: number, sat: number, l: number) => `hsl(${((hh % 360) + 360) % 360} ${sat}% ${l}%)`;
  return [hsl(hue, 55, 48), hsl(hue + 42, 50, 30)];
};

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
  const [category, setCategory] = useState<string>('all');
  const [query, setQuery] = useState('');

  const fractalVisualizers = [
    { id: 'FractalRandom', name: 'Random Fractal', preview: '🎲', description: 'Re-rolls a unique fractal every click', swatch: ['#ff4db8', '#4dd2ff'] as [string, string] },
    ...FRACTAL_META.map((f) => ({ id: f.id, name: f.name, preview: f.emoji, description: f.kind, swatch: f.swatch })),
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

  // ---- categorize + filter the library ----
  type Viz = (typeof allVisualizers)[number];
  const catOf = (v: Viz): string => {
    const d = v.description || '';
    if (/CARTOON/.test(d)) return 'shapes';
    if (/ESCAPE|RAYMARCH|FRACTAL/.test(d) || v.id === 'FractalRandom') return /3D|RAYMARCH/.test(d) ? 'fractal3d' : 'fractal2d';
    if (/SAND|PARTICLE/.test(d)) return 'sand';
    if (/DAW|WAVEFORM/.test(d)) return 'daw';
    return 'models'; // 3D models + FX collapsed into one category
  };
  const isSaved = (v: Viz) => !!(v.isPreset || v.isCustom);
  const CHIPS = [
    { key: 'all', label: 'All' }, { key: 'saved', label: '★ Saved' },
    { key: 'models', label: '3D Models' }, { key: 'shapes', label: '2D Shapes' },
    { key: 'fractal2d', label: 'Fractal 2D' }, { key: 'fractal3d', label: 'Fractal 3D' },
    { key: 'sand', label: 'Sand' }, { key: 'daw', label: 'DAW' },
  ];
  const counts: Record<string, number> = { all: allVisualizers.length, saved: allVisualizers.filter(isSaved).length };
  for (const c of CHIPS) if (c.key !== 'all' && c.key !== 'saved') counts[c.key] = allVisualizers.filter((v) => catOf(v) === c.key).length;
  const q = query.trim().toLowerCase();
  const filtered = allVisualizers.filter((v) => {
    if (category === 'saved') { if (!isSaved(v)) return false; }
    else if (category !== 'all') { if (catOf(v) !== category) return false; }
    if (q && !`${v.name} ${v.description}`.toLowerCase().includes(q)) return false;
    return true;
  });
  const CAP = 120;
  const shown = filtered.slice(0, CAP);

  // Each tile is its own gradient card - from the preset's real palette, or a
  // deterministic colour derived from its id. No icons, and no two tiles repeat.
  const swatchOf = (v: Viz): [string, string] => {
    const sw = (v as { swatch?: [string, string] }).swatch;
    return sw && sw[0] && sw[1] ? sw : gradFromString(v.id);
  };

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
              <span className="chip">{allVisualizers.length}</span>
            </div>
          </div>

          {/* search */}
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${allVisualizers.length} templates...`}
            className="w-full h-8 px-2.5 rounded-md bg-surface-2/40 border border-hairline/50 text-xs text-text-primary placeholder:text-text-tertiary focus:border-ai-red/50 outline-none"
          />

          {/* category chips */}
          <div className="flex flex-wrap gap-1.5">
            {CHIPS.map((c) => (
              <button
                key={c.key}
                onClick={() => setCategory(c.key)}
                className={`pill text-xs ${category === c.key ? 'pill-active' : ''}`}
              >
                {c.label}
                <span className="ml-1 opacity-50 font-mono-num">{counts[c.key] ?? 0}</span>
              </button>
            ))}
          </div>

          {shown.length === 0 && (
            <p className="text-caption py-6 text-center">No templates match. Try another category or clear the search.</p>
          )}

          <div className="grid grid-cols-3 gap-2">
            {shown.map((viz, index) => (
              <motion.div
                key={viz.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index, 10) * 0.015 }}
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
                  style={{ backgroundImage: `linear-gradient(135deg, ${swatchOf(viz)[0]}, ${swatchOf(viz)[1]})` }}
                  className={`w-full aspect-square rounded-xl border transition-all overflow-hidden relative ${
                    targetSelected === viz.id
                      ? 'border-ai-red ring-1 ring-ai-red shadow-glow'
                      : 'border-hairline/40 hover:border-white/50'
                  }`}
                >
                  {/* dark scrim for legibility; lifts on hover so the colour pops */}
                  <div className="absolute inset-0 bg-black/45 group-hover:bg-black/20 transition-colors duration-200" />

                  {/* name on the gradient */}
                  <div className="absolute inset-x-0 bottom-0 p-1.5">
                    <div className="text-[10px] font-medium text-white text-center leading-tight line-clamp-2 drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]">
                      {viz.name}
                    </div>
                  </div>

                  {/* Active indicator */}
                  {targetSelected === viz.id && (
                    <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-white rounded-full shadow-glow"></div>
                  )}

                  {/* Saved/Custom indicator */}
                  {(viz.isCustom || viz.isPreset) && (
                    <div className="absolute top-1.5 left-1.5">
                      <Bookmark className="w-3 h-3 text-white fill-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" />
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

          {filtered.length > CAP && (
            <p className="text-caption text-center pt-1">
              Showing {CAP} of {filtered.length} - search or pick a category to narrow.
            </p>
          )}
        </div>
      </div>

      <GeneratorModal
        isOpen={showGenerator}
        onClose={() => setShowGenerator(false)}
      />
    </>
  );
}
