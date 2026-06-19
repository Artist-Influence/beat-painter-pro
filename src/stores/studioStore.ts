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

// Phase 2 - multiple visualizers on one background. The PRIMARY visualizer is the
// existing `selected` + `composite`; these are the EXTRA layers stacked on top, each
// its own visualizer with its own framing (reuses CompositeState). The active layer
// (activeLayerId; null = primary) is the one the Composite controls + Frame edit.
export interface VizLayer {
  id: string;
  selected: string;             // a registry key / preset_xxx / custom_xxx
  composite: CompositeState;
}

// Phase 3 - CapCut-style 2-track timeline. Each clip occupies a time range on one
// track. While the timeline is enabled, the playhead engine writes the active viz
// clip's visualizer+framing and the active bg clip's background into the live store,
// so all existing rendering AND the export follow the timeline automatically.
export interface TimelineClip {
  id: string;
  track: 'viz' | 'bg';
  start: number;                 // seconds
  end: number;                   // seconds
  selected?: string;             // viz track: which visualizer
  composite?: CompositeState;    // viz track: its framing
  bg?: BackgroundState;          // bg track: the background for this span
  label?: string;
}
export interface TimelineState {
  enabled: boolean;
  clips: TimelineClip[];
  selectedClipId: string | null; // the clip currently open for editing
}
type BackgroundType = 'color' | 'gradient' | 'image' | 'video' | 'transparent';
type BackgroundMediaType = 'image' | 'gif' | 'video' | null;

export interface BackgroundState {
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

// Party mode (auto-pilot) visualizer families. The checklist in the UI toggles
// which of these the rotation can pick from.
export type PartyType = 'fractal2d' | 'fractal3d' | 'models' | 'shapes' | 'library';
export const PARTY_TYPE_LABELS: { key: PartyType; label: string }[] = [
  { key: 'fractal3d', label: '3D Fractals' },
  { key: 'fractal2d', label: '2D Fractals' },
  { key: 'models', label: '3D Models' },
  { key: 'shapes', label: '2D Shapes' },
  { key: 'library', label: 'Library' },
];

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
  // Phase 2 - extra visualizer layers + which layer the composite controls target.
  layers: VizLayer[];
  activeLayerId: string | null;     // null = primary (the existing `selected`/`composite`)
  addLayer: (selected: string) => void;
  removeLayer: (id: string) => void;
  setActiveLayerId: (id: string | null) => void;
  setLayerSelected: (id: string, selected: string) => void;
  setActiveComposite: (patch: Partial<CompositeState>) => void; // edits primary or active layer
  // Phase 3 - 2-track timeline.
  timeline: TimelineState;
  setTimelineEnabled: (v: boolean) => void;
  addClip: (clip: Omit<TimelineClip, 'id'>) => string;
  updateClip: (id: string, patch: Partial<TimelineClip>) => void;
  removeClip: (id: string) => void;
  setSelectedClip: (id: string | null) => void;
  partyTypes: PartyType[];          // which visualizer families Party mode rotates through
  setPartyTypes: (t: PartyType[]) => void;
  partyIntervalSec: number;         // how often Party mode swaps (seconds)
  setPartyIntervalSec: (n: number) => void;
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
  setBackground: (bg: BackgroundState) => void;   // generic - used to save/restore around viz-only export
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

/** The composite the framing controls + on-stage handles currently edit, by priority:
 *  selected timeline viz clip > active extra layer > primary. Pairs with
 *  setActiveComposite, which writes back to the same target. */
export const selectActiveComposite = (s: StudioState): CompositeState => {
  if (s.timeline.enabled && s.timeline.selectedClipId) {
    const clip = s.timeline.clips.find((c) => c.id === s.timeline.selectedClipId && c.track === 'viz');
    if (clip?.composite) return clip.composite;
  }
  if (s.activeLayerId != null) return s.layers.find((l) => l.id === s.activeLayerId)?.composite ?? s.composite;
  return s.composite;
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
  layers: [],
  activeLayerId: null,
  addLayer: (selected) => set((s) => {
    if (s.layers.length >= 3) return {}; // cap extra layers for performance (4 viz total)
    const id = `layer_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`;
    // new layers start as a centred, half-size, framed box so they don't hide the
    // primary; the user repositions them with the same Frame/controls.
    const composite: CompositeState = { enabled: true, x: 0.5, y: 0.5, scale: 0.5, mask: 'none', crop: false, cropW: 0.6, cropH: 0.6, blend: 'normal', opacity: 1, vizAspect: 'match' };
    return { layers: [...s.layers, { id, selected, composite }], activeLayerId: id };
  }),
  removeLayer: (id) => set((s) => ({
    layers: s.layers.filter((l) => l.id !== id),
    activeLayerId: s.activeLayerId === id ? null : s.activeLayerId,
  })),
  setActiveLayerId: (id) => set({ activeLayerId: id }),
  setLayerSelected: (id, selected) => set((s) => ({
    layers: s.layers.map((l) => (l.id === id ? { ...l, selected } : l)),
  })),
  setActiveComposite: (patch) => set((s) => {
    // Framing target priority: selected timeline viz clip > active extra layer > primary.
    if (s.timeline.enabled && s.timeline.selectedClipId) {
      const clip = s.timeline.clips.find((c) => c.id === s.timeline.selectedClipId && c.track === 'viz');
      if (clip) return {
        timeline: { ...s.timeline, clips: s.timeline.clips.map((c) => (c.id === clip.id ? { ...c, composite: { ...(c.composite ?? s.composite), ...patch } } : c)) },
        composite: { ...s.composite, ...patch }, // live: the engine mirrors a clip's composite onto the primary while it plays
      };
    }
    if (s.activeLayerId == null) return { composite: { ...s.composite, ...patch } };
    return { layers: s.layers.map((l) => (l.id === s.activeLayerId ? { ...l, composite: { ...l.composite, ...patch } } : l)) };
  }),
  timeline: { enabled: false, clips: [], selectedClipId: null },
  setTimelineEnabled: (v) => set((s) => ({ timeline: { ...s.timeline, enabled: v } })),
  addClip: (clip) => {
    const id = `clip_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`;
    set((s) => ({ timeline: { ...s.timeline, clips: [...s.timeline.clips, { ...clip, id }], selectedClipId: id } }));
    return id;
  },
  updateClip: (id, patch) => set((s) => ({
    timeline: { ...s.timeline, clips: s.timeline.clips.map((c) => (c.id === id ? { ...c, ...patch } : c)) },
  })),
  removeClip: (id) => set((s) => ({
    timeline: { ...s.timeline, clips: s.timeline.clips.filter((c) => c.id !== id), selectedClipId: s.timeline.selectedClipId === id ? null : s.timeline.selectedClipId },
  })),
  setSelectedClip: (id) => set((s) => ({ timeline: { ...s.timeline, selectedClipId: id } })),
  partyTypes: ['fractal3d', 'fractal2d', 'models', 'shapes', 'library'],
  setPartyTypes: (t) => set({ partyTypes: t }),
  partyIntervalSec: 15,
  setPartyIntervalSec: (n) => set({ partyIntervalSec: Math.max(2, Math.min(120, n)) }),
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
  setBackground: (bg) => set({ background: bg }),
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
  // Central zoom clamp so every entry point (slider, keyboard, buttons) gets the
  // same range: 0.15x (zoom way out, ~6.7x further) .. 6x (zoom in).
  setZoom: (z) => set({ zoomLevel: Math.max(0.15, Math.min(6, z)) }),
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
