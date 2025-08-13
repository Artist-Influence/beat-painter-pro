import { create } from "zustand";
import type { VisualizerKey } from "@/components/visualizers";

interface Filters {
  brightness: number;
  saturation: number;
  contrast: number;
}

interface StudioState {
  selected: VisualizerKey;
  backgroundColor: "#00FF00" | "#FFFFFF" | "#000000";
  filters: Filters;
  zoomLevel: number;
  audioElement: HTMLAudioElement | null;
  setSelected: (v: VisualizerKey) => void;
  setBackground: (c: StudioState["backgroundColor"]) => void;
  setFilters: (f: Partial<Filters>) => void;
  setZoom: (z: number) => void;
  setAudioElement: (el: HTMLAudioElement | null) => void;
}

export const useStudioStore = create<StudioState>((set) => ({
  selected: "PsychedelicMandalaVisualizer",
  backgroundColor: "#FFFFFF",
  filters: { brightness: 100, saturation: 100, contrast: 100 },
  zoomLevel: 1,
  audioElement: null,
  setSelected: (v) => set({ selected: v }),
  setBackground: (c) => set({ backgroundColor: c }),
  setFilters: (f) => set((s) => ({ filters: { ...s.filters, ...f } })),
  setZoom: (z) => set({ zoomLevel: z }),
  setAudioElement: (el) => set({ audioElement: el }),
}));
