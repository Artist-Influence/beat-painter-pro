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
  spinSpeed: number;
  preset: 'calm' | 'flow' | 'energy' | 'custom';
}

type LogoLayer = 'front' | 'behind';
type LogoColorMode = 'original' | 'invert';

interface LogoState {
  url: string | null;
  position: { x: number; y: number };
  size: number;
  opacity: number;
  layer: LogoLayer;
  colorMode: LogoColorMode;
}

interface StudioState {
  selected: VisualizerKey | `custom_${string}`;
  backgroundColor: "#00FF00" | "#FFFFFF" | "#000000";
  filters: Filters;
  zoomLevel: number;
  audioElement: HTMLAudioElement | null;
  audioFileName: string | null;
  audioSensitivity: AudioSensitivity;
  logo: LogoState;
  transparentExport: boolean;
  setSelected: (v: VisualizerKey | `custom_${string}`) => void;
  setBackground: (c: StudioState["backgroundColor"]) => void;
  setFilters: (f: Partial<Filters>) => void;
  setZoom: (z: number) => void;
  setAudioElement: (el: HTMLAudioElement | null, fileName?: string | null) => void;
  setAudioSensitivity: (s: Partial<AudioSensitivity>) => void;
  setAudioPreset: (preset: AudioSensitivity['preset']) => void;
  setLogo: (url: string | null) => void;
  setLogoPosition: (pos: { x: number; y: number }) => void;
  setLogoSize: (size: number) => void;
  setLogoOpacity: (opacity: number) => void;
  setLogoLayer: (layer: LogoLayer) => void;
  setLogoColorMode: (mode: LogoColorMode) => void;
  clearLogo: () => void;
  setTransparentExport: (value: boolean) => void;
}

const AUDIO_PRESETS: Record<'calm' | 'flow' | 'energy', Omit<AudioSensitivity, 'preset'>> = {
  calm: { bassMultiplier: 1.2, midsMultiplier: 0.8, highsMultiplier: 0.5, animationSpeed: 0.7, spinSpeed: 0 },
  flow: { bassMultiplier: 2.5, midsMultiplier: 1.5, highsMultiplier: 1.0, animationSpeed: 1.0, spinSpeed: 0 },
  energy: { bassMultiplier: 4.0, midsMultiplier: 3.0, highsMultiplier: 2.0, animationSpeed: 1.5, spinSpeed: 0 },
};

const DEFAULT_LOGO: LogoState = {
  url: null,
  position: { x: 50, y: 50 },
  size: 100,
  opacity: 100,
  layer: 'front',
  colorMode: 'original',
};

export const useStudioStore = create<StudioState>((set) => ({
  selected: "PsychedelicMandalaVisualizer",
  backgroundColor: "#FFFFFF",
  filters: { brightness: 100, saturation: 100, contrast: 100 },
  zoomLevel: 1,
  audioElement: null,
  audioFileName: null,
  audioSensitivity: {
    bassMultiplier: 2.5,
    midsMultiplier: 1.5,
    highsMultiplier: 1.0,
    animationSpeed: 1.0,
    spinSpeed: 0,
    preset: 'flow',
  },
  logo: DEFAULT_LOGO,
  transparentExport: false,
  setSelected: (v) => set({ selected: v }),
  setBackground: (c) => set({ backgroundColor: c }),
  setFilters: (f) => set((s) => ({ filters: { ...s.filters, ...f } })),
  setZoom: (z) => set({ zoomLevel: z }),
  setAudioElement: (el, fileName = null) => set({ audioElement: el, audioFileName: fileName }),
  setAudioSensitivity: (s) => set((state) => ({ 
    audioSensitivity: { ...state.audioSensitivity, ...s, preset: 'custom' } 
  })),
  setAudioPreset: (preset) => set((state) => ({
    audioSensitivity: { ...AUDIO_PRESETS[preset], preset }
  })),
  setLogo: (url) => set((state) => ({ logo: { ...state.logo, url } })),
  setLogoPosition: (position) => set((state) => ({ logo: { ...state.logo, position } })),
  setLogoSize: (size) => set((state) => ({ logo: { ...state.logo, size } })),
  setLogoOpacity: (opacity) => set((state) => ({ logo: { ...state.logo, opacity } })),
  setLogoLayer: (layer) => set((state) => ({ logo: { ...state.logo, layer } })),
  setLogoColorMode: (colorMode) => set((state) => ({ logo: { ...state.logo, colorMode } })),
  clearLogo: () => set({ logo: DEFAULT_LOGO }),
  setTransparentExport: (value) => set({ transparentExport: value }),
}));
