import React from 'react';
import { useStudioStore } from '@/stores/studioStore';
import { usePresetStore } from '@/stores/presetStore';
import { Switch } from '@/components/ui/switch';
import { useSliderReset } from '@/hooks/useSliderReset';
import {
  DAW_PRESETS, SPECTRO_PALETTES, DAW_BASE,
  type DawConfig, type DawLayout, type WaveMode, type SpectroPlacement, type PlayMode,
} from '@/lib/daw/dawEngine';

function Slider({ label, value, min, max, step, fmt, onChange, defaultValue }: {
  label: string; value: number; min: number; max: number; step: number; fmt?: (v: number) => string; onChange: (v: number) => void; defaultValue?: number;
}) {
  const reset = useSliderReset(value, onChange, defaultValue);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-sm text-text-secondary">{label}</span>
        <span className="text-xs text-text-tertiary font-mono-num">{fmt ? fmt(value) : value.toFixed(2)}</span>
      </div>
      <input type="range" className="ai-range" min={min} max={max} step={step} value={value} title="Double-click to reset"
        onChange={(e) => onChange(parseFloat(e.target.value))} onDoubleClick={reset} />
    </div>
  );
}
function Pills<T extends string>({ value, options, onChange }: { value: T; options: { v: T; l: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button key={o.v} onClick={() => onChange(o.v)} className={`pill !px-2.5 !py-1 !text-[0.7rem] ${value === o.v ? 'pill-active' : ''}`}>{o.l}</button>
      ))}
    </div>
  );
}
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-text-secondary">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-text-secondary">{label}</span>
      <input type="color" value={value === 'transparent' ? '#000000' : value} onChange={(e) => onChange(e.target.value)}
        className="w-8 h-8 rounded-md bg-transparent border border-hairline/60 cursor-pointer" />
    </div>
  );
}

const LAYOUTS: { v: DawLayout; l: string }[] = [{ v: 'split', l: 'Split' }, { v: 'full', l: 'Full' }, { v: 'stacked', l: 'Stacked' }, { v: 'minimal', l: 'Minimal' }];
const MODES: { v: WaveMode; l: string }[] = [
  { v: 'filled', l: 'Filled' }, { v: 'mirrored', l: 'Mirror' }, { v: 'line', l: 'Line' }, { v: 'bars', l: 'Bars' },
  { v: 'pixel', l: 'Pixel' }, { v: 'smoothed', l: 'Smooth' }, { v: 'clipped', l: 'Clip' }, { v: 'glitch', l: 'Glitch' },
  { v: 'stereo', l: 'Stereo' }, { v: 'freqsep', l: 'Freq Split' }, { v: 'granular', l: 'Granular' }, { v: 'peakhold', l: 'Peak Hold' },
];
const PLACE: { v: SpectroPlacement; l: string }[] = [{ v: 'left', l: 'Left' }, { v: 'right', l: 'Right' }, { v: 'top', l: 'Top' }, { v: 'bottom', l: 'Bottom' }, { v: 'background', l: 'BG' }];

export function DawControls() {
  const selected = useStudioStore((s) => s.selected);
  const override = useStudioStore((s) => s.dawOverride);
  const setOverride = useStudioStore((s) => s.setDawOverride);
  const resetOverride = useStudioStore((s) => s.resetDawOverride);
  const setSelected = useStudioStore((s) => s.setSelected);
  const setBackgroundTransparent = useStudioStore((s) => s.setBackgroundTransparent);
  const preview = usePresetStore((s) => s.preview);

  // resolve the active DAW config: a library preset, or a generated/saved preview/preset item
  const baked: DawConfig = (() => {
    const reg = DAW_PRESETS.find((p) => p.id === selected);
    if (reg) return reg;
    if (selected === '__preview__' || (typeof selected === 'string' && selected.startsWith('preset_'))) {
      const item = usePresetStore.getState().resolve(selected as string);
      if (item?.kind === 'daw') return item.daw;
    }
    return DAW_BASE;
  })();
  void preview; // re-resolve when the rolled preview changes
  const cfg: DawConfig = { ...baked, ...override };
  const set = (p: Partial<DawConfig>) => setOverride(p);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-eyebrow">daw / waveform</p>
        <h3 className="text-text-primary text-sm font-semibold">Waveform Studio</h3>
        <p className="text-caption mt-1">Pick a preset, upload a track — or tweak everything below.</p>
      </div>

      {/* Presets first */}
      <div className="space-y-2">
        <p className="text-eyebrow">presets</p>
        <div className="grid grid-cols-2 gap-2">
          {DAW_PRESETS.map((p) => (
            <button key={p.id} onClick={() => { resetOverride(); setSelected(p.id as any); }}
              className={`rounded-lg border p-2 text-left transition-all ${selected === p.id ? 'border-ai-red bg-ai-red/[0.08]' : 'border-hairline/50 bg-surface-2/40 hover:border-ai-red/40'}`}>
              <span className="text-base mr-1">{p.emoji}</span>
              <span className="text-xs text-text-secondary">{p.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="hairline" />

      {/* Layout & mode */}
      <div className="space-y-2"><p className="text-eyebrow">layout</p><Pills value={cfg.layout} options={LAYOUTS} onChange={(v) => set({ layout: v })} /></div>
      <div className="space-y-2"><p className="text-eyebrow">waveform mode</p><Pills value={cfg.waveMode} options={MODES} onChange={(v) => set({ waveMode: v })} /></div>
      <div className="space-y-2"><p className="text-eyebrow">playback</p>
        <Pills<PlayMode> value={cfg.playMode} options={[{ v: 'static', l: 'Static full-track' }, { v: 'scroll', l: 'Scrolling playhead' }]} onChange={(v) => set({ playMode: v })} />
      </div>

      {/* Colors */}
      <div className="space-y-2">
        <p className="text-eyebrow">colors</p>
        <ColorRow label="Waveform" value={cfg.waveColor} onChange={(v) => set({ waveColor: v })} />
        <ColorRow label="Gradient" value={cfg.waveColor2} onChange={(v) => set({ waveColor2: v })} />
        <ColorRow label="Background" value={cfg.background} onChange={(v) => set({ background: v })} />
        <Toggle label="Transparent BG (over clip)" checked={cfg.background === 'transparent'} onChange={(v) => { set({ background: v ? 'transparent' : '#000000' }); if (v) setBackgroundTransparent(); }} />
      </div>

      {/* Shape */}
      <div className="space-y-2">
        <p className="text-eyebrow">shape</p>
        <Slider label="Height" value={cfg.waveHeight} min={0.1} max={1.2} step={0.01} fmt={(v) => `${Math.round(v * 100)}%`} onChange={(v) => set({ waveHeight: v })} />
        <Slider label="Thickness" value={cfg.waveThickness} min={1} max={8} step={0.5} fmt={(v) => `${v}px`} onChange={(v) => set({ waveThickness: v })} />
        <Slider label="Density" value={cfg.waveDensity} min={0.25} max={1.5} step={0.05} fmt={(v) => `${v.toFixed(2)}x`} onChange={(v) => set({ waveDensity: v })} />
        <Slider label="Fill opacity" value={cfg.fillOpacity} min={0} max={1} step={0.02} fmt={(v) => `${Math.round(v * 100)}%`} onChange={(v) => set({ fillOpacity: v })} />
        <Slider label="Glow" value={cfg.glow} min={0} max={40} step={1} fmt={(v) => `${v}`} onChange={(v) => set({ glow: v })} />
        <Slider label="Edge roughness" value={cfg.edgeRoughness} min={0} max={1} step={0.02} fmt={(v) => `${Math.round(v * 100)}%`} onChange={(v) => set({ edgeRoughness: v })} />
        <Slider label="Clipping" value={cfg.clipping} min={0} max={1} step={0.02} fmt={(v) => `${Math.round(v * 100)}%`} onChange={(v) => set({ clipping: v })} />
        <Slider label="Smoothing" value={cfg.smoothing} min={0} max={1} step={0.02} fmt={(v) => `${Math.round(v * 100)}%`} onChange={(v) => set({ smoothing: v })} />
        <Slider label="Scanlines" value={cfg.scanlines} min={0} max={1} step={0.02} fmt={(v) => `${Math.round(v * 100)}%`} onChange={(v) => set({ scanlines: v })} />
        <Slider label="Glow trails" value={cfg.glowTrails} min={0} max={0.95} step={0.02} fmt={(v) => `${Math.round(v * 100)}%`} onChange={(v) => set({ glowTrails: v })} />
        <Toggle label="Symmetry" checked={cfg.symmetry} onChange={(v) => set({ symmetry: v })} />
      </div>

      {/* Reactivity */}
      <div className="space-y-2">
        <p className="text-eyebrow">audio response</p>
        <Slider label="Peak sensitivity" value={cfg.peakSensitivity} min={0} max={2} step={0.05} fmt={(v) => `${v.toFixed(2)}x`} onChange={(v) => set({ peakSensitivity: v })} />
        <Slider label="Transient sensitivity" value={cfg.transientSensitivity} min={0} max={2} step={0.05} fmt={(v) => `${v.toFixed(2)}x`} onChange={(v) => set({ transientSensitivity: v })} />
        <Slider label="Beat pulse" value={cfg.beatPulse} min={0} max={0.5} step={0.01} fmt={(v) => `${Math.round(v * 100)}%`} onChange={(v) => set({ beatPulse: v })} />
        <div className="grid grid-cols-3 gap-2">
          <Slider label="Bass" value={cfg.bassResponse} min={0} max={2} step={0.05} fmt={(v) => `${v.toFixed(1)}`} onChange={(v) => set({ bassResponse: v })} />
          <Slider label="Mid" value={cfg.midResponse} min={0} max={2} step={0.05} fmt={(v) => `${v.toFixed(1)}`} onChange={(v) => set({ midResponse: v })} />
          <Slider label="High" value={cfg.highResponse} min={0} max={2} step={0.05} fmt={(v) => `${v.toFixed(1)}`} onChange={(v) => set({ highResponse: v })} />
        </div>
        {cfg.playMode === 'scroll' && <Slider label="Scroll window" value={cfg.scrollSpeed} min={2} max={16} step={0.5} fmt={(v) => `${v}s`} onChange={(v) => set({ scrollSpeed: v })} />}
        <Toggle label="Playhead" checked={cfg.playhead} onChange={(v) => set({ playhead: v })} />
        <Toggle label="Progress bar" checked={cfg.progressBar} onChange={(v) => set({ progressBar: v })} />
      </div>

      {/* Spectrogram */}
      <div className="space-y-2">
        <p className="text-eyebrow">spectrogram</p>
        <Toggle label="Spectrogram on" checked={cfg.spectro} onChange={(v) => set({ spectro: v })} />
        {cfg.spectro && (
          <>
            <Pills value={cfg.spectroPlacement} options={PLACE} onChange={(v) => set({ spectroPlacement: v })} />
            <Pills value={String(cfg.spectroPalette)} options={SPECTRO_PALETTES.map((p, i) => ({ v: String(i), l: p.name }))} onChange={(v) => set({ spectroPalette: parseInt(v) })} />
            <Slider label="Intensity" value={cfg.spectroIntensity} min={0} max={2} step={0.05} fmt={(v) => `${v.toFixed(2)}x`} onChange={(v) => set({ spectroIntensity: v })} />
            <Slider label="Contrast" value={cfg.spectroContrast} min={0.3} max={2} step={0.05} fmt={(v) => `${v.toFixed(2)}x`} onChange={(v) => set({ spectroContrast: v })} />
            <Slider label="Noise" value={cfg.spectroNoise} min={0} max={1} step={0.02} fmt={(v) => `${Math.round(v * 100)}%`} onChange={(v) => set({ spectroNoise: v })} />
            <Slider label="Scanlines" value={cfg.spectroScanlines} min={0} max={1} step={0.02} fmt={(v) => `${Math.round(v * 100)}%`} onChange={(v) => set({ spectroScanlines: v })} />
            <Slider label="Glitch" value={cfg.spectroGlitch} min={0} max={1} step={0.02} fmt={(v) => `${Math.round(v * 100)}%`} onChange={(v) => set({ spectroGlitch: v })} />
          </>
        )}
      </div>

      {/* Overlays + seed */}
      <div className="space-y-2">
        <p className="text-eyebrow">finish</p>
        <Slider label="Grain" value={cfg.grain} min={0} max={1} step={0.02} fmt={(v) => `${Math.round(v * 100)}%`} onChange={(v) => set({ grain: v })} />
        <Slider label="Glitch / tearing" value={cfg.glitch} min={0} max={1} step={0.02} fmt={(v) => `${Math.round(v * 100)}%`} onChange={(v) => set({ glitch: v })} />
        <Slider label="Seed" value={cfg.seed} min={1} max={999} step={1} fmt={(v) => `${Math.round(v)}`} onChange={(v) => set({ seed: Math.round(v) })} />
      </div>

      <button onClick={resetOverride} className="btn btn-ghost w-full h-9 text-sm">Reset to preset</button>
    </div>
  );
}
