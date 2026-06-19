import { create } from "zustand";
import type { VisualizerKey } from "@/components/visualizers";
import type { AudioReactivity } from "@/lib/fractal/engine";
import type { GradientConfig } from "@/lib/gradientEngine";
import { type ReactivityConfig, DEFAULT_REACTIVITY, REACTIVITY_PRESETS } from "@/lib/reactiveEngine";
import type { DawConfig } from "@/lib/daw/dawEngine";

// Live, user-tunable reactivity for fractal visualizers (the audio-mapping panel)
export interface FractalReactivity extends AudioReactivity {
  enabled: boolean;
  sensitivity: number; // master gain on all audio bands, 0-2
}

export type FractalQuickMode = 'bassTunnel' | 'beatBloom' | 'trebleSpark' | 'midrange' | 'ambient' | 'psychedelic';

export const FRACTAL_QUICK_MODES: Record<FractalQuickMode, { label: string; react: AudioReactivity }> = {
  bassTunnel:  { label: 'Bass Tunnel',  react: { zoom: 1.0, hue: 0.3, glow: 0.6, morph: 0.3, rotation: 0.2, iterations: 0.2, warp: 0.5, kaleido: 0.2 } },
  beatBloom:   { label: 'Beat Bloom',   react: { zoom: 0.5, hue: 0.4, glow: 1.0, morph: 0.4, rotation: 0.4, iterations: 0.3, warp: 0.2, kaleido: 0.1 } },
  trebleSpark: { label: 'Treble Spark', react: { zoom: 0.3, hue: 1.0, glow: 0.5, morph: 0.3, rotation: 0.3, iterations: 0.8, warp: 0.3, kaleido: 0.2 } },
  midrange:    { label: 'Midrange',     react: { zoom: 0.3, hue: 0.4, glow: 0.5, morph: 1.0, rotation: 0.3, iterations: 0.3, warp: 0.7, kaleido: 0.2 } },
  ambient:     { label: 'Ambient',      react: { zoom: 0.25, hue: 0.3, glow: 0.35, morph: 0.25, rotation: 0.2, iterations: 0.15, warp: 0.2, kaleido: 0.0 } },
  psychedelic: { label: 'Psychedelic',  react: { zoom: 0.9, hue: 1.0, glow: 1.0, morph: 0.9, rotation: 0.7, iterations: 0.7, warp: 0.8, kaleido: 0.6 } },
};

interface Filters {
  brightness: number;
  saturation: number;
  contrast: number;
}

export type AspectRatio = 'horizontal' | 'vertical' | 'square';
export type CompositeMask = 'none' | 'circle' | 'rounded';
// How the visualizer composites over the background. Full-screen shader visualizers
// (fractals, sand, DAW…) paint an opaque black background; 'screen'/'lighten' drop
// that black so a reaction clip shows through and only the bright structure overlays.
export type CompositeBlend = 'normal' | 'screen' | 'lighten';
export interface CompositeState {
  enabled: boolean;
  x: number;      // 0-1 center position
  y: number;      // 0-1 center position
  scale: number;  // 0.2-2 relative size
  mask: CompositeMask;
  crop: boolean;  // clip the visualizer to a rectangular window so the background shows around it
  cropW: number;  // 0.1-1 fraction of the stage width the window spans
  cropH: number;  // 0.1-1 fraction of the stage height the window spans
  blend?: CompositeBlend; // undefined = auto (screen over a video/image clip, normal otherwise)
  rotate?: number;  // degrees -180..180, rotates the visualizer in its frame
  opacity?: number; // 0..1 visualizer layer opacity (cover fully at 1, semi-transparent below)
  feather?: number; // 0..1 soft edge so transparent visualizers (sand, particles) fade instead of hard-cutting
  vizAspect?: 'match' | AspectRatio; // visualizer's own shape, independent of the export frame (e.g. a 1:1 viz inside a 9:16 video). 'match'/undefined = follow the export aspect
  bgOpacity?: number; // 0..1 - when a blend drops the visualizer's dark background, how much of it to bring back over the clip (0 = fully transparent, 1 = solid)
}
type BackgroundType = 'color' | 'gradient' | 'image' | 'video' | 'transparent';
type BackgroundMediaType = 'image' | 'gif' | 'video' | null;

interface BackgroundState {
  type: BackgroundType;
  color: string;            // any hex
  gradientConfig: GradientConfig | null;
  gradientUrl: string | null;
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
export type ExportQuality = '1080p' | '4k' | '8k';

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
  exportQuality: ExportQuality;
  exportAspectRatio: AspectRatio;
  customStyleTexture: CustomStyleTexture;
  backgroundReactive: boolean;
  setBackgroundReactive: (v: boolean) => void;
  autoPilot: boolean;
  setAutoPilot: (v: boolean) => void;
  colorOverride: boolean;   // universal colour override across every visualizer
  colorHue: number;         // 0-360
  setColorOverride: (v: boolean) => void;
  setColorHue: (h: number) => void;
  exportSegment: { enabled: boolean; start: number; end: number };
  setExportSegment: (p: Partial<{ enabled: boolean; start: number; end: number }>) => void;
  composite: CompositeState;
  setComposite: (p: Partial<CompositeState>) => void;
  // Reaction Reel: lock an uploaded reaction video to the song's playhead so the
  // visualizer's beats and the person's movements line up, with a nudgeable offset.
  reactionSync: { enabled: boolean; offset: number };
  setReactionSync: (p: Partial<{ enabled: boolean; offset: number }>) => void;
  reactionWizardOpen: boolean;
  setReactionWizardOpen: (v: boolean) => void;
  // Preview framing: momentarily hide all studio chrome to see the clean export frame.
  previewMode: boolean;
  setPreviewMode: (v: boolean) => void;
  // DAW waveform live-edit overrides (merged over the selected preset's baked config).
  dawOverride: Partial<DawConfig>;
  setDawOverride: (p: Partial<DawConfig>) => void;
  resetDawOverride: () => void;
  fractalReactivity: FractalReactivity;
  setFractalReactivity: (p: Partial<FractalReactivity>) => void;
  initFractalReactivity: (r: AudioReactivity) => void;
  applyFractalQuickMode: (mode: FractalQuickMode) => void;
  // Global transient engine - shapes the shared audio signal for EVERY visualizer
  reactivity: ReactivityConfig;
  setReactivity: (p: Partial<ReactivityConfig>) => void;
  applyReactivityPreset: (name: keyof typeof REACTIVITY_PRESETS) => void;
  setSelected: (v: VisualizerKey | `custom_${string}`) => void;
  setBackgroundColor: (c: string) => void;
  setBackgroundGradient: (config: GradientConfig, url: string) => void;
  setBackgroundTransparent: () => void;
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
  setExportQuality: (q: ExportQuality) => void;
  setExportAspectRatio: (ratio: AspectRatio) => void;
  setCustomStyleTexture: (url: string | null, name?: string | null) => void;
  clearCustomStyleTexture: () => void;
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
  color: '#000000',
  gradientConfig: null,
  gradientUrl: null,
  mediaUrl: null,
  mediaType: null,
  positionY: 50,
};

const DEFAULT_CUSTOM_STYLE: CustomStyleTexture = {
  url: null,
  name: null,
};

export const useStudioStore = create<StudioState>((set) => ({
  selected: "FractalMandelbrot",
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
  exportQuality: '4k',
  exportAspectRatio: 'horizontal',
  customStyleTexture: DEFAULT_CUSTOM_STYLE,
  backgroundReactive: false,
  setBackgroundReactive: (v) => set({ backgroundReactive: v }),
  autoPilot: false,
  setAutoPilot: (v) => set({ autoPilot: v }),
  colorOverride: false,
  colorHue: 200,
  setColorOverride: (v) => { set({ colorOverride: v }); window.dispatchEvent(new CustomEvent('color:override')); },
  setColorHue: (h) => { set({ colorHue: h }); window.dispatchEvent(new CustomEvent('color:override')); },
  exportSegment: { enabled: false, start: 0, end: 30 },
  setExportSegment: (p) => set((s) => ({ exportSegment: { ...s.exportSegment, ...p } })),
  composite: { enabled: false, x: 0.5, y: 0.5, scale: 1, mask: 'none' as CompositeMask, crop: false, cropW: 0.6, cropH: 0.6 },
  setComposite: (p) => set((s) => ({ composite: { ...s.composite, ...p } })),
  reactionSync: { enabled: false, offset: 0 },
  setReactionSync: (p) => set((s) => ({ reactionSync: { ...s.reactionSync, ...p } })),
  reactionWizardOpen: false,
  setReactionWizardOpen: (v) => set({ reactionWizardOpen: v }),
  previewMode: false,
  setPreviewMode: (v) => set({ previewMode: v }),
  dawOverride: {},
  setDawOverride: (p) => set((s) => ({ dawOverride: { ...s.dawOverride, ...p } })),
  resetDawOverride: () => set({ dawOverride: {} }),
  fractalReactivity: {
    enabled: true,
    sensitivity: 1.2,
    zoom: 0.8, hue: 0.7, glow: 1.0, morph: 0.7, rotation: 0.6, iterations: 0.6, warp: 0.5, kaleido: 0.0,
  },
  setFractalReactivity: (p) => set((s) => ({ fractalReactivity: { ...s.fractalReactivity, ...p } })),
  initFractalReactivity: (r) => set((s) => ({ fractalReactivity: { ...s.fractalReactivity, ...r } })),
  applyFractalQuickMode: (mode) => set((s) => ({
    fractalReactivity: { ...s.fractalReactivity, ...FRACTAL_QUICK_MODES[mode].react },
  })),
  reactivity: { ...DEFAULT_REACTIVITY },
  setReactivity: (p) => set((s) => ({ reactivity: { ...s.reactivity, ...p } })),
  applyReactivityPreset: (name) => set((s) => ({ reactivity: { ...s.reactivity, ...REACTIVITY_PRESETS[name] } })),
  setSelected: (v) => set({ selected: v }),
  setBackgroundColor: (c) => set((state) => ({
    background: { ...state.background, type: 'color', color: c }
    // Keep mediaUrl and mediaType intact so user can switch back to custom
  })),
  setBackgroundGradient: (config, url) => set((state) => ({
    background: { ...state.background, type: 'gradient', gradientConfig: config, gradientUrl: url },
  })),
  setBackgroundTransparent: () => set((state) => ({
    background: { ...state.background, type: 'transparent' },
  })),
  setBackgroundMedia: (url, type) => set((state) => {
    // Release the previous clip's blob URL when replacing it (large video files leaked).
    const prev = state.background.mediaUrl;
    if (prev && prev !== url && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
    return { background: { ...state.background, type: type === 'video' ? 'video' : 'image', mediaUrl: url, mediaType: type } };
  }),
  setBackgroundPositionY: (y) => set((state) => ({
    background: { ...state.background, positionY: y }
  })),
  clearBackgroundMedia: () => set((state) => {
    const prev = state.background.mediaUrl;
    if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
    return { background: { ...state.background, type: 'color', mediaUrl: null, mediaType: null } };
  }),
  setFilters: (f) => set((s) => ({ filters: { ...s.filters, ...f } })),
  setZoom: (z) => set({ zoomLevel: z }),
  setAudioElement: (el, fileName = null) => set((state) => {
    // Re-uploading mid-playback: stop and release the previous element before
    // swapping. Without this the old <audio> keeps decoding/playing in the
    // background and its blob URL leaks, which manifested as the new song
    // "dropping out" while the old one kept going.
    const prev = state.audioElement;
    if (prev && prev !== el) {
      try {
        prev.pause();
        const oldSrc = prev.currentSrc || prev.src;
        prev.removeAttribute('src');
        prev.load();
        if (oldSrc && oldSrc.startsWith('blob:')) URL.revokeObjectURL(oldSrc);
      } catch { /* element already detached */ }
    }
    return { audioElement: el, audioFileName: fileName };
  }),
  setAudioSensitivity: (s) => set((state) => ({ 
    audioSensitivity: { ...state.audioSensitivity, ...s, preset: 'custom' } 
  })),
  setAudioPreset: (preset) => set((state) => ({
    audioSensitivity: { ...AUDIO_PRESETS[preset], preset }
  })),
  setLogo: (url) => set((state) => {
    const prev = state.logo.url;
    if (prev && prev !== url && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
    return { logo: { ...state.logo, url } };
  }),
  setLogoPosition: (position) => set((state) => ({ logo: { ...state.logo, position } })),
  setLogoSize: (size) => set((state) => ({ logo: { ...state.logo, size } })),
  setLogoOpacity: (opacity) => set((state) => ({ logo: { ...state.logo, opacity } })),
  setLogoLayer: (layer) => set((state) => ({ logo: { ...state.logo, layer } })),
  setLogoColorMode: (colorMode) => set((state) => ({ logo: { ...state.logo, colorMode } })),
  clearLogo: () => set((state) => {
    const prev = state.logo.url;
    if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
    return { logo: DEFAULT_LOGO };
  }),
  setExportMode: (mode) => set({ exportMode: mode }),
  setExportQuality: (q) => set({ exportQuality: q }),
  setExportAspectRatio: (ratio) => set({ exportAspectRatio: ratio }),
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
}));
