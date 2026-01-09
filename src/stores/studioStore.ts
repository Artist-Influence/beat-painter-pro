import { create } from "zustand";
import type { VisualizerKey } from "@/components/visualizers";
import type { BackgroundEffect } from "@/lib/randomVisualizerGenerator";

interface Filters {
  brightness: number;
  saturation: number;
  contrast: number;
}

type BackgroundType = 'color' | 'image' | 'video';
type BackgroundMediaType = 'image' | 'gif' | 'video' | null;

interface BackgroundState {
  type: BackgroundType;
  color: "#00FF00" | "#FFFFFF" | "#000000";
  mediaUrl: string | null;
  mediaType: BackgroundMediaType;
  positionY: number; // 0-100, 50 = centered
}

interface CustomStyleTexture {
  url: string | null;
  name: string | null;
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
export type ExportMode = 'video' | 'png-sequence';

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
  background: BackgroundState;
  filters: Filters;
  zoomLevel: number;
  audioElement: HTMLAudioElement | null;
  audioFileName: string | null;
  audioSensitivity: AudioSensitivity;
  logo: LogoState;
  exportMode: ExportMode;
  customStyleTexture: CustomStyleTexture;
  backgroundEffect: BackgroundEffect;
  setSelected: (v: VisualizerKey | `custom_${string}`) => void;
  setBackgroundColor: (c: BackgroundState["color"]) => void;
  setBackgroundMedia: (url: string, type: BackgroundMediaType) => void;
  setBackgroundPositionY: (y: number) => void;
  clearBackgroundMedia: () => void;
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
  setExportMode: (mode: ExportMode) => void;
  setCustomStyleTexture: (url: string | null, name?: string | null) => void;
  clearCustomStyleTexture: () => void;
  setBackgroundEffect: (effect: BackgroundEffect) => void;
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

const DEFAULT_BACKGROUND: BackgroundState = {
  type: 'color',
  color: '#FFFFFF',
  mediaUrl: null,
  mediaType: null,
  positionY: 50,
};

const DEFAULT_CUSTOM_STYLE: CustomStyleTexture = {
  url: null,
  name: null,
};

export const useStudioStore = create<StudioState>((set) => ({
  selected: "PsychedelicMandalaVisualizer",
  background: DEFAULT_BACKGROUND,
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
  exportMode: 'video',
  customStyleTexture: DEFAULT_CUSTOM_STYLE,
  backgroundEffect: 'none',
  setSelected: (v) => set({ selected: v }),
  setBackgroundColor: (c) => set((state) => ({ 
    background: { ...state.background, type: 'color', color: c }
    // Keep mediaUrl and mediaType intact so user can switch back to custom
  })),
  setBackgroundMedia: (url, type) => set((state) => ({ 
    background: { ...state.background, type: type === 'video' ? 'video' : 'image', mediaUrl: url, mediaType: type } 
  })),
  setBackgroundPositionY: (y) => set((state) => ({
    background: { ...state.background, positionY: y }
  })),
  clearBackgroundMedia: () => set((state) => ({ 
    background: { ...state.background, type: 'color', mediaUrl: null, mediaType: null } 
  })),
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
  setExportMode: (mode) => set({ exportMode: mode }),
  setCustomStyleTexture: (url, name = null) => {
    set({ customStyleTexture: { url, name } });
    if (url) {
      (window as any).appliedTexture = url;
      window.dispatchEvent(new CustomEvent('style:applied', { detail: { texture: url } }));
    }
  },
  clearCustomStyleTexture: () => {
    set({ customStyleTexture: DEFAULT_CUSTOM_STYLE });
    (window as any).appliedTexture = null;
    window.dispatchEvent(new CustomEvent('texture:cleared'));
  },
  setBackgroundEffect: (effect) => set({ backgroundEffect: effect }),
}));
