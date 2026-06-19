import React from 'react';
import { useStudioStore, type CompositeMask, type CompositeBlend, type CompositeState, type AspectRatio } from '@/stores/studioStore';
import { useSliderReset } from '@/hooks/useSliderReset';
import { Switch } from '@/components/ui/switch';

function Slider({ label, value, min, max, step, fmt, onChange, defaultValue }: {
  label: string; value: number; min: number; max: number; step: number; fmt: (v: number) => string; onChange: (v: number) => void; defaultValue?: number;
}) {
  const reset = useSliderReset(value, onChange, defaultValue);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-text-secondary">{label}</span>
        <span className="text-xs text-text-tertiary font-mono-num">{fmt(value)}</span>
      </div>
      <input type="range" className="ai-range" min={min} max={max} step={step} value={value}
        title="Double-click to reset"
        onChange={(e) => onChange(parseFloat(e.target.value))}
        onDoubleClick={reset} />
    </div>
  );
}

const MASKS: { key: CompositeMask; label: string }[] = [
  { key: 'none', label: 'Full' },
  { key: 'rounded', label: 'Rounded' },
  { key: 'circle', label: 'Circle' },
];
const DIMS: { key: AspectRatio; label: string }[] = [
  { key: 'horizontal', label: '16:9' },
  { key: 'vertical', label: '9:16' },
  { key: 'square', label: '1:1' },
];
const BLENDS: { key: CompositeBlend; label: string }[] = [
  { key: 'screen', label: 'Glow' },
  { key: 'lighten', label: 'Lighten' },
  { key: 'normal', label: 'Solid' },
];
const VIZ_ASPECTS: { key: 'match' | AspectRatio; label: string }[] = [
  { key: 'match', label: 'Match' },
  { key: 'horizontal', label: '16:9' },
  { key: 'square', label: '1:1' },
  { key: 'vertical', label: '9:16' },
];
// One-tap layouts - set position + size + shape in a single click (no slider fiddling).
const LAYOUTS: { key: string; label: string; apply: Partial<CompositeState> }[] = [
  { key: 'full', label: 'Fullscreen', apply: { vizAspect: 'match', scale: 1, x: 0.5, y: 0.5, crop: false, mask: 'none', rotate: 0 } },
  { key: 'center', label: 'Centered', apply: { vizAspect: 'square', scale: 0.92, x: 0.5, y: 0.5, crop: false, mask: 'none', rotate: 0 } },
  { key: 'badge', label: 'Corner badge', apply: { vizAspect: 'square', scale: 0.34, x: 0.78, y: 0.16, crop: false, mask: 'rounded', rotate: 0 } },
  { key: 'lower', label: 'Lower third', apply: { vizAspect: 'horizontal', scale: 0.95, x: 0.5, y: 0.8, crop: false, mask: 'none', rotate: 0 } },
];

export function CompositeControls() {
  const { exportAspectRatio, setExportAspectRatio, background, activeLayerId, layers, composite: primaryComposite, setActiveComposite } = useStudioStore();
  // Frame the ACTIVE layer (primary or an extra layer) so this panel edits whatever
  // is selected in the Layers bar.
  const composite = activeLayerId ? (layers.find((l) => l.id === activeLayerId)?.composite ?? primaryComposite) : primaryComposite;
  const setComposite = setActiveComposite;
  const hasBgMedia = background.type === 'video' || background.type === 'image';

  return (
    <div className="space-y-4">
      <div>
        <p className="text-eyebrow">frame</p>
        <h3 className="text-text-primary text-sm font-semibold">Size, crop & dimension</h3>
      </div>

      {/* One-tap layouts - the easy path. Sets position/size/shape in a single click. */}
      <div className="space-y-2">
        <p className="text-eyebrow">quick layout</p>
        <div className="grid grid-cols-2 gap-2">
          {LAYOUTS.map((l) => (
            <button key={l.key} onClick={() => setComposite(l.apply)}
              className="pill justify-center">
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* Export frame / video dimension */}
      <div className="space-y-2">
        <p className="text-eyebrow">video frame (export)</p>
        <div className="grid grid-cols-3 gap-2">
          {DIMS.map((d) => (
            <button key={d.key} onClick={() => setExportAspectRatio(d.key)}
              className={`pill justify-center ${exportAspectRatio === d.key ? 'pill-active' : ''}`}>
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Visualizer shape - independent of the export frame above (e.g. a 1:1 or
          16:9 visualizer placed inside a 9:16 short-form video). */}
      <div className="space-y-2">
        <p className="text-eyebrow">visualizer shape</p>
        <div className="grid grid-cols-4 gap-2">
          {VIZ_ASPECTS.map((a) => (
            <button key={a.key} onClick={() => setComposite({ vizAspect: a.key })}
              className={`pill justify-center ${(composite.vizAspect ?? 'match') === a.key ? 'pill-active' : ''}`}>
              {a.label}
            </button>
          ))}
        </div>
        <p className="text-caption">
          The visualizer's own shape - independent of the video frame. Applies in both Crop and Size modes.
        </p>
      </div>

      {/* Blend over clip - when a video/image is the background, drop the
          visualizer's opaque black so the footage shows through. Defaults to Glow
          automatically; shown only when there is actually a clip behind. */}
      {hasBgMedia && (
        <div className="rounded-md p-3 border border-ai-red/30 bg-ai-red/5 space-y-2">
          <div>
            <span className="text-sm text-text-secondary">Blend over your clip</span>
            <p className="text-caption">Drops the visualizer's black background so your video shows through</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {BLENDS.map((b) => (
              <button key={b.key} onClick={() => setComposite({ blend: b.key })}
                className={`pill justify-center ${(composite.blend ?? 'screen') === b.key ? 'pill-active' : ''}`}>
                {b.label}
              </button>
            ))}
          </div>
          {/* Background fill - only meaningful when the blend is dropping the black. */}
          {(composite.blend ?? 'screen') !== 'normal' && (
            <div className="pt-1">
              <Slider label="Background" value={composite.bgOpacity ?? 0} min={0} max={1} step={0.01}
                fmt={(v) => v === 0 ? 'clear' : `${Math.round(v * 100)}%`} onChange={(v) => setComposite({ bgOpacity: v })} defaultValue={0} />
              <p className="text-caption">Bring back the visualizer's dark background over your clip - clear (just the glow) → solid.</p>
            </div>
          )}
        </div>
      )}

      {/* Crop window - clip the visualizer to a rectangle so the background shows
          around it. This is the publish-to-socials overlay workflow. */}
      <div className="rounded-md p-3 border border-hairline/50 bg-surface-2/40 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm text-text-secondary">Crop window</span>
            <p className="text-caption">Show a rectangle of the visualizer over your clip</p>
          </div>
          <Switch checked={composite.crop} onCheckedChange={(v) => setComposite({ crop: v })} />
        </div>
        {composite.crop && (
          <div className="space-y-2 pt-1">
            <Slider label="Width" value={composite.cropW} min={0.1} max={1} step={0.01}
              fmt={(v) => `${Math.round(v * 100)}%`} onChange={(v) => setComposite({ cropW: v })} defaultValue={0.6} />
            <Slider label="Height" value={composite.cropH} min={0.1} max={1} step={0.01}
              fmt={(v) => `${Math.round(v * 100)}%`} onChange={(v) => setComposite({ cropH: v })} defaultValue={0.6} />
            <p className="text-caption">Use Position X/Y below to move the window. Zoom the content with Size.</p>
          </div>
        )}
      </div>

      {/* Move mode */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm text-text-secondary">Move on stage</span>
          <p className="text-caption">Drag the {composite.crop ? 'crop window' : 'visualizer'} to reposition</p>
        </div>
        <Switch checked={composite.enabled} onCheckedChange={(v) => setComposite({ enabled: v })} />
      </div>

      <Slider label={composite.crop ? 'Size (zoom content)' : 'Size'} value={composite.scale} min={0.05} max={4} step={0.01}
        fmt={(v) => `${v.toFixed(2)}x`} onChange={(v) => setComposite({ scale: v })} defaultValue={1} />
      <Slider label="Position X" value={composite.x} min={0} max={1} step={0.01}
        fmt={(v) => `${Math.round(v * 100)}%`} onChange={(v) => setComposite({ x: v })} defaultValue={0.5} />
      <Slider label="Position Y" value={composite.y} min={0} max={1} step={0.01}
        fmt={(v) => `${Math.round(v * 100)}%`} onChange={(v) => setComposite({ y: v })} defaultValue={0.5} />

      {/* Rotate / Opacity / Feather - frame the visualizer however the clip needs. */}
      <Slider label="Rotate" value={composite.rotate ?? 0} min={-180} max={180} step={1}
        fmt={(v) => `${Math.round(v)}°`} onChange={(v) => setComposite({ rotate: v })} defaultValue={0} />
      <Slider label="Opacity" value={composite.opacity ?? 1} min={0.1} max={1} step={0.01}
        fmt={(v) => `${Math.round(v * 100)}%`} onChange={(v) => setComposite({ opacity: v })} defaultValue={1} />
      <div className="space-y-1.5">
        <Slider label="Soft edges" value={composite.feather ?? 0} min={0} max={1} step={0.01}
          fmt={(v) => v === 0 ? 'off' : `${Math.round(v * 100)}%`} onChange={(v) => setComposite({ feather: v })} defaultValue={0} />
        <p className="text-caption">Fades the edges so transparent visualizers (sand, particles) don't cut off in a hard rectangle.</p>
      </div>

      <div className="space-y-2">
        <p className="text-eyebrow">{composite.crop ? 'corners' : 'crop shape'}</p>
        <div className="grid grid-cols-3 gap-2">
          {MASKS.map((m) => (
            <button key={m.key} onClick={() => setComposite({ mask: m.key })}
              className={`pill justify-center ${composite.mask === m.key ? 'pill-active' : ''}`}>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <button onClick={() => setComposite({ x: 0.5, y: 0.5, scale: 1, mask: 'none', crop: false, rotate: 0, opacity: 1, feather: 0, vizAspect: 'match', bgOpacity: 0 })}
        className="btn btn-ghost w-full h-9 text-sm">
        Reset to fullscreen
      </button>

      {hasBgMedia ? (
        <p className="text-caption">
          Your clip is the background and the visualizer is already blending over it. Turn on{' '}
          <span className="text-text-secondary">Crop window</span> (or drag the corners on stage) to size and
          place it where you want, then hit export - the video shows through automatically.
        </p>
      ) : (
        <p className="text-caption">
          Tip: to publish over your own footage, set <span className="text-text-secondary">Media</span> background
          to your video (Background section), then turn on <span className="text-text-secondary">Crop window</span>.
          For true alpha instead, use a Standalone visualizer + PNG Sequence.
        </p>
      )}
    </div>
  );
}
