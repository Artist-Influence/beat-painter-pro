import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FractalConfig } from '@/lib/fractal/engine';
import type { VisualizerConfig } from '@/lib/visualizerFactory/config';
import type { Cartoon2DConfig } from '@/lib/cartoon/cartoonEngine';
import type { SandConfig } from '@/lib/sand/sandEngine';
import type { Sand3DConfig } from '@/lib/sand3d/unicornEngine';
import type { DawConfig } from '@/lib/daw/dawEngine';

/** A renderable generated item: a shader fractal, procedural 3D model, 2D cartoon shape, sand flow, 3D sand (UR-6), or DAW waveform. */
export type PresetItem =
  | { kind: 'fractal'; fractal: FractalConfig; standalone?: boolean }
  | { kind: 'procedural'; procedural: VisualizerConfig; standalone?: boolean }
  | { kind: 'cartoon'; cartoon: Cartoon2DConfig; standalone?: boolean }
  | { kind: 'sand'; sand: SandConfig; standalone?: boolean }
  | { kind: 'sand3d'; sand3d: Sand3DConfig; standalone?: boolean }
  | { kind: 'daw'; daw: DawConfig; standalone?: boolean };

export interface SavedPreset {
  id: string;          // registry key, e.g. "preset_1718000000_0"
  name: string;
  emoji: string;
  item: PresetItem;
  createdAt: number;
}

interface PresetState {
  presets: SavedPreset[];
  preview: PresetItem | null;   // transient candidate on the stage while generating
  setPreview: (p: PresetItem | null) => void;
  addPreset: (name: string, emoji: string, item: PresetItem) => string;
  removePreset: (id: string) => void;
  resolve: (key: string) => PresetItem | null;
}

// Back-compat: older persisted presets stored `config: FractalConfig` directly.
function migrate(p: any): SavedPreset {
  if (p.item) return p as SavedPreset;
  return {
    id: p.id,
    name: p.name,
    emoji: p.emoji,
    item: { kind: 'fractal', fractal: p.config as FractalConfig },
    createdAt: p.createdAt ?? 0,
  };
}

export const usePresetStore = create<PresetState>()(
  persist(
    (set, get) => ({
      presets: [],
      preview: null,
      setPreview: (p) => set({ preview: p }),
      addPreset: (name, emoji, item) => {
        const id = `preset_${Date.now()}_${get().presets.length}`;
        const entry: SavedPreset = {
          id,
          name: name.trim() || 'Saved',
          emoji,
          item,
          createdAt: Date.now(),
        };
        set((s) => ({ presets: [entry, ...s.presets] }));
        return id;
      },
      removePreset: (id) => set((s) => ({ presets: s.presets.filter((p) => p.id !== id) })),
      resolve: (key) => {
        if (key === '__preview__') return get().preview;
        const found = get().presets.find((p) => p.id === key);
        return found ? found.item : null;
      },
    }),
    {
      name: 'bpp-fractal-presets',
      partialize: (s) => ({ presets: s.presets }),
      merge: (persisted: any, current) => ({
        ...current,
        presets: Array.isArray(persisted?.presets) ? persisted.presets.map(migrate) : [],
      }),
    },
  ),
);
