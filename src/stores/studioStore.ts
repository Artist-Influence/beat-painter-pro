import { create } from "zustand";
import type { VisualizerKey } from "@/components/visualizers";

interface Filters {
  brightness: number;
  saturation: number;
  contrast: number;
}

interface AudioSensitivity {
  bassMultiplier: number;
  midsMultiplier: number;
  highsMultiplier: number;
  animationSpeed: number;
  preset: 'calm' | 'flow' | 'energy' | 'custom';
}

interface StudioState {
  selected: VisualizerKey | `custom_${string}`;
  backgroundColor: "#00FF00" | "#FFFFFF" | "#000000";
  filters: Filters;
  zoomLevel: number;
  audioElement: HTMLAudioElement | null;
  audioSensitivity: AudioSensitivity;
  setSelected: (v: VisualizerKey | `custom_${string}`) => void;
  setBackground: (c: StudioState["backgroundColor"]) => void;
  setFilters: (f: Partial<Filters>) => void;
  setZoom: (z: number) => void;
  setAudioElement: (el: HTMLAudioElement | null) => void;
  setAudioSensitivity: (s: Partial<AudioSensitivity>) => void;
  setAudioPreset: (preset: AudioSensitivity['preset']) => void;
}

const AUDIO_PRESETS: Record<'calm' | 'flow' | 'energy', Omit<AudioSensitivity, 'preset'>> = {
  calm: { bassMultiplier: 0.6, midsMultiplier: 0.4, highsMultiplier: 0.3, animationSpeed: 0.7 },
  flow: { bassMultiplier: 1.8, midsMultiplier: 1.2, highsMultiplier: 0.8, animationSpeed: 1.0 },
  energy: { bassMultiplier: 3.5, midsMultiplier: 2.8, highsMultiplier: 2.0, animationSpeed: 1.5 },
};

export const useStudioStore = create<StudioState>((set) => ({
  selected: "PsychedelicMandalaVisualizer",
  backgroundColor: "#FFFFFF",
  filters: { brightness: 100, saturation: 100, contrast: 100 },
  zoomLevel: 1,
  audioElement: null,
  audioSensitivity: {
    bassMultiplier: 1.0,
    midsMultiplier: 0.7,
    highsMultiplier: 0.4,
    animationSpeed: 1.0,
    preset: 'flow',
  },
  setSelected: (v) => set({ selected: v }),
  setBackground: (c) => set({ backgroundColor: c }),
  setFilters: (f) => set((s) => ({ filters: { ...s.filters, ...f } })),
  setZoom: (z) => set({ zoomLevel: z }),
  setAudioElement: (el) => set({ audioElement: el }),
  setAudioSensitivity: (s) => set((state) => ({ 
    audioSensitivity: { ...state.audioSensitivity, ...s, preset: 'custom' } 
  })),
  setAudioPreset: (preset) => set((state) => ({
    audioSensitivity: { ...AUDIO_PRESETS[preset], preset }
  })),
}));
