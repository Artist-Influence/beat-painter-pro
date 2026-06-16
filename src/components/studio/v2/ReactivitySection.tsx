import React from 'react';
import { useStudioStore, FRACTAL_QUICK_MODES, type FractalQuickMode, type FractalReactivity } from '@/stores/studioStore';
import { usePresetStore } from '@/stores/presetStore';
import { Switch } from '@/components/ui/switch';
import { REACTIVITY_PRESETS, type ReactivityConfig } from '@/lib/reactiveEngine';

// Compact control for the global transient engine (raw numeric values, custom format).
function Ctl({ label, hint, value, min, max, step, fmt, onChange }: {
  label: string; hint?: string; value: number; min: number; max: number; step: number;
  fmt: (v: number) => string; onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1" title={hint}>
      <div className="flex items-center justify-between">
        <span className="text-sm text-text-secondary">{label}</span>
        <span className="text-xs text-text-tertiary font-mono-num">{fmt(value)}</span>
      </div>
      <input type="range" className="ai-range" min={min} max={max} step={step}
        value={value} onChange={(e) => onChange(parseFloat(e.target.value))} />
    </div>
  );
}

const PRESET_LABELS: { key: keyof typeof REACTIVITY_PRESETS; label: string }[] = [
  { key: 'hard', label: 'Hard' },
  { key: 'punchy', label: 'Punchy' },
  { key: 'balanced', label: 'Balanced' },
  { key: 'smooth', label: 'Smooth' },
];

const MAPPINGS: { key: keyof FractalReactivity; target: string; source: string; desc: string }[] = [
  { key: 'glow', target: 'Glow', source: 'Beat', desc: 'Brightness bloom on each hit' },
  { key: 'zoom', target: 'Zoom', source: 'Bass', desc: 'Bass punches the zoom in and out' },
  { key: 'hue', target: 'Color', source: 'Treble', desc: 'Treble shifts the colour palette' },
  { key: 'morph', target: 'Morph', source: 'Mid', desc: 'Bends and reshapes the form' },
  { key: 'rotation', target: 'Spin', source: 'Beat', desc: 'Beat kicks the rotation' },
  { key: 'iterations', target: 'Detail', source: 'Treble', desc: 'Treble adds fine detail (2D)' },
  { key: 'warp', target: 'Warp', source: 'Mid', desc: 'Mids ripple the space (2D)' },
  { key: 'kaleido', target: 'Kaleido', source: 'Beat', desc: 'Spins the mirror fold (needs kaleido on)' },
];
const QUICK_ORDER: FractalQuickMode[] = ['bassTunnel', 'beatBloom', 'trebleSpark', 'midrange', 'ambient', 'psychedelic'];

function Slider({ label, source, desc, value, onChange, suffix = '%' }: {
  label: string; source?: string; desc?: string; value: number; onChange: (v: number) => void; suffix?: '%' | 'x';
}) {
  const pct = suffix === '%';
  const display = pct ? `${Math.round(value * 100)}%` : `${value.toFixed(1)}x`;
  return (
    <div className="space-y-1" title={desc}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-secondary">{label}</span>
          {source && <span className="chip !py-0 !text-[0.6rem]">{source}</span>}
        </div>
        <span className="text-xs text-text-tertiary font-mono-num">{display}</span>
      </div>
      {desc && <p className="text-[0.7rem] text-text-tertiary leading-tight">{desc}</p>}
      <input type="range" className="ai-range" min={0} max={pct ? 1 : 8} step={pct ? 0.01 : 0.1} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} />
    </div>
  );
}

export function ReactivitySection() {
  const {
    selected, fractalReactivity, setFractalReactivity, applyFractalQuickMode,
    audioSensitivity, setAudioSensitivity,
    reactivity, setReactivity, applyReactivityPreset,
  } = useStudioStore();
  const setR = (p: Partial<ReactivityConfig>) => setReactivity(p);
  const presets = usePresetStore((s) => s.presets);
  const preview = usePresetStore((s) => s.preview);
  const isFractal = (() => {
    if (typeof selected !== 'string') return false;
    if (selected.startsWith('Fractal')) return true;
    if (selected === '__preview__' || selected.startsWith('preset_')) {
      // procedural models use the EQ; fractals use the mappings
      const item = usePresetStore.getState().resolve(selected);
      return item?.kind === 'fractal';
    }
    return false;
  })();
  void presets; void preview; // re-evaluate when preset store changes

  return (
    <div className="space-y-4">
      <div>
        <p className="text-eyebrow">reactivity</p>
        <h3 className="text-text-primary text-sm font-semibold">Audio Reactivity</h3>
      </div>

      {/* Universal: applies to every visualizer */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-text-secondary">Audio reactive</span>
        <Switch checked={fractalReactivity.enabled} onCheckedChange={(v) => setFractalReactivity({ enabled: v })} />
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-secondary">Sensitivity</span>
          <span className="text-xs text-text-tertiary font-mono-num">{fractalReactivity.sensitivity.toFixed(2)}x</span>
        </div>
        <input type="range" className="ai-range" min={0} max={2} step={0.05}
          value={fractalReactivity.sensitivity}
          onChange={(e) => setFractalReactivity({ sensitivity: parseFloat(e.target.value) })} />
      </div>
      {/* Universal spin — works for fractals and 3D models alike */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-secondary">Spin</span>
          <span className="text-xs text-text-tertiary font-mono-num">{audioSensitivity.spinSpeed.toFixed(1)}x</span>
        </div>
        <input type="range" className="ai-range" min={0} max={5} step={0.1}
          value={audioSensitivity.spinSpeed}
          onChange={(e) => setAudioSensitivity({ spinSpeed: parseFloat(e.target.value) })} />
      </div>

      <div className="hairline" />

      {/* ===== Global transient engine — applies to EVERY visualizer ===== */}
      <div>
        <p className="text-eyebrow">transient engine</p>
        <p className="text-caption -mt-0.5">Locks motion to drums &amp; transients. Sharp attack, punchy decay, per-band.</p>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {PRESET_LABELS.map((p) => (
          <button key={p.key} onClick={() => applyReactivityPreset(p.key)} className="pill justify-center !px-1 !text-[0.7rem]">
            {p.label}
          </button>
        ))}
      </div>
      <Ctl label="Motion intensity" hint="Overall amount of movement" value={reactivity.motionIntensity}
        min={0} max={2} step={0.05} fmt={(v) => `${v.toFixed(2)}x`} onChange={(v) => setR({ motionIntensity: v })} />
      <Ctl label="Transient sensitivity" hint="How easily drum onsets fire" value={reactivity.transientSensitivity}
        min={0} max={2} step={0.05} fmt={(v) => `${v.toFixed(2)}x`} onChange={(v) => setR({ transientSensitivity: v })} />
      <Ctl label="Peak boost" hint="How much transients dominate over sustained energy" value={reactivity.peakBoost}
        min={0} max={2} step={0.05} fmt={(v) => `${v.toFixed(2)}x`} onChange={(v) => setR({ peakBoost: v })} />
      <div className="grid grid-cols-2 gap-3">
        <Ctl label="Attack" hint="Envelope rise time (near-instant)" value={reactivity.attackMs}
          min={0} max={40} step={1} fmt={(v) => `${Math.round(v)}ms`} onChange={(v) => setR({ attackMs: v })} />
        <Ctl label="Decay" hint="Transient fall time (punchy reset)" value={reactivity.decayMs}
          min={60} max={400} step={5} fmt={(v) => `${Math.round(v)}ms`} onChange={(v) => setR({ decayMs: v })} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Ctl label="Bass" hint="Sub/bass: scale, pulse, shockwaves" value={reactivity.bassResponse}
          min={0} max={2} step={0.05} fmt={(v) => `${v.toFixed(1)}x`} onChange={(v) => setR({ bassResponse: v })} />
        <Ctl label="Mid" hint="Body, snare/clap, camera push" value={reactivity.midResponse}
          min={0} max={2} step={0.05} fmt={(v) => `${v.toFixed(1)}x`} onChange={(v) => setR({ midResponse: v })} />
        <Ctl label="High" hint="Hats, sparks, flicker, detail" value={reactivity.highResponse}
          min={0} max={2} step={0.05} fmt={(v) => `${v.toFixed(1)}x`} onChange={(v) => setR({ highResponse: v })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Ctl label="Smoothing" hint="Lower = sharper, higher = softer motion" value={reactivity.smoothing}
          min={0} max={1} step={0.02} fmt={(v) => `${Math.round(v * 100)}%`} onChange={(v) => setR({ smoothing: v })} />
        <Ctl label="Dynamics" hint="Adaptive level: quiet still moves, loud doesn't peg" value={reactivity.dynamics}
          min={0} max={1} step={0.02} fmt={(v) => `${Math.round(v * 100)}%`} onChange={(v) => setR({ dynamics: v })} />
      </div>

      <div className="hairline" />

      {isFractal ? (
        <>
          {/* Fractal-specific augmentation */}
          <p className="text-eyebrow">mappings</p>
          <p className="text-caption -mt-1">Each control links a sound (the chip) to what it changes. Higher = stronger.</p>
          {MAPPINGS.map((m) => (
            <Slider key={m.key} label={m.target} source={m.source} desc={m.desc}
              value={(fractalReactivity[m.key] as number) ?? 0}
              onChange={(v) => setFractalReactivity({ [m.key]: v } as Partial<FractalReactivity>)} />
          ))}
          <div className="space-y-2 pt-1">
            <p className="text-eyebrow">quick modes</p>
            <div className="grid grid-cols-2 gap-2">
              {QUICK_ORDER.map((mode) => (
                <button key={mode} onClick={() => applyFractalQuickMode(mode)} className="pill justify-center">
                  {FRACTAL_QUICK_MODES[mode].label}
                </button>
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Mesh / 3D-element augmentation: frequency response */}
          <p className="text-eyebrow">frequency response</p>
          <Slider label="Bass" source="0-250 Hz" suffix="x" value={audioSensitivity.bassMultiplier}
            onChange={(v) => setAudioSensitivity({ bassMultiplier: v })} />
          <Slider label="Mids" source="250-4k Hz" suffix="x" value={audioSensitivity.midsMultiplier}
            onChange={(v) => setAudioSensitivity({ midsMultiplier: v })} />
          <Slider label="Highs" source="4k+ Hz" suffix="x" value={audioSensitivity.highsMultiplier}
            onChange={(v) => setAudioSensitivity({ highsMultiplier: v })} />
        </>
      )}
    </div>
  );
}
