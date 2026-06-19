import React, { useRef } from 'react';
import { Shuffle, Upload, X } from 'lucide-react';
import { useStudioStore } from '@/stores/studioStore';
import { generateRandomGradient } from '@/lib/gradientEngine';
import { Switch } from '@/components/ui/switch';

type Mode = 'color' | 'gradient' | 'transparent' | 'custom';

const SWATCHES = ['#000000', '#FFFFFF', '#00FF00', '#0E0E10', '#ED1C24', '#1b2a4a'];

export function BackgroundControls() {
  const {
    background,
    setBackgroundColor,
    setBackgroundGradient,
    setBackgroundTransparent,
    setBackgroundMedia,
    setBackgroundPositionY,
    clearBackgroundMedia,
    backgroundReactive,
    setBackgroundReactive,
  } = useStudioStore();
  const fileRef = useRef<HTMLInputElement>(null);

  const mode: Mode =
    background.type === 'gradient' ? 'gradient'
    : background.type === 'transparent' ? 'transparent'
    : background.type === 'image' || background.type === 'video' ? 'custom'
    : 'color';

  const shuffleGradient = () => {
    const { config, url } = generateRandomGradient(Math.floor(Math.random() * 1e9));
    setBackgroundGradient(config, url);
  };

  const handleFile = (file: File) => {
    const url = URL.createObjectURL(file);
    const isVideo = file.type.startsWith('video/');
    const isGif = file.type === 'image/gif';
    setBackgroundMedia(url, isVideo ? 'video' : isGif ? 'gif' : 'image');
  };

  const setMode = (m: Mode) => {
    if (m === 'color') setBackgroundColor(background.color || '#000000');
    else if (m === 'transparent') setBackgroundTransparent();
    else if (m === 'gradient') {
      if (background.gradientUrl && background.gradientConfig) {
        setBackgroundGradient(background.gradientConfig, background.gradientUrl);
      } else shuffleGradient();
    } else {
      if (background.mediaUrl && background.mediaType) setBackgroundMedia(background.mediaUrl, background.mediaType);
      else fileRef.current?.click();
    }
  };

  const MODES: { key: Mode; label: string }[] = [
    { key: 'color', label: 'Solid' },
    { key: 'gradient', label: 'Gradient' },
    { key: 'transparent', label: 'None' },
    { key: 'custom', label: 'Media' },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-eyebrow">background</p>
        <label className="flex items-center gap-2 cursor-pointer">
          <span className="text-xs text-text-tertiary">React</span>
          <Switch checked={backgroundReactive} onCheckedChange={setBackgroundReactive} />
        </label>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*,video/mp4,video/webm"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />

      {/* Mode pills */}
      <div className="grid grid-cols-4 gap-2">
        {MODES.map((m) => (
          <button
            key={m.key}
            onClick={() => setMode(m.key)}
            className={`pill justify-center !px-2 ${mode === m.key ? 'pill-active' : ''}`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <p className="text-caption">
        A full-frame visualizer (fractals, scenes) covers the background. To place it over a
        background, open <span className="text-text-secondary">Frame</span> and turn on
        <span className="text-text-secondary"> Crop window</span>.
      </p>

      {/* Solid */}
      {mode === 'color' && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {SWATCHES.map((c) => (
              <button
                key={c}
                onClick={() => setBackgroundColor(c)}
                className={`w-8 h-8 rounded-md border transition-all ${
                  background.color?.toLowerCase() === c.toLowerCase()
                    ? 'border-ai-red shadow-glow' : 'border-hairline/60 hover:border-ai-red/50'
                }`}
                style={{ backgroundColor: c }}
                title={c}
              />
            ))}
            <label className="w-8 h-8 rounded-md border border-hairline/60 hover:border-ai-red/50 cursor-pointer overflow-hidden relative" title="Custom color">
              <span
                className="absolute inset-0"
                style={{ background: 'conic-gradient(from 0deg, red, yellow, lime, cyan, blue, magenta, red)' }}
              />
              <input
                type="color"
                value={/^#[0-9a-fA-F]{6}$/.test(background.color) ? background.color : '#000000'}
                onChange={(e) => setBackgroundColor(e.target.value)}
                className="opacity-0 w-full h-full cursor-pointer"
              />
            </label>
          </div>
        </div>
      )}

      {/* Gradient */}
      {mode === 'gradient' && (
        <div className="space-y-2">
          <div
            className="w-full h-24 rounded-md border border-hairline/50 bg-cover bg-center"
            style={{ backgroundImage: background.gradientUrl ? `url(${background.gradientUrl})` : undefined }}
          />
          <button onClick={shuffleGradient} className="btn btn-primary w-full h-10">
            <Shuffle className="w-4 h-4" /> Shuffle gradient
          </button>
          {background.gradientConfig && (
            <p className="text-caption font-mono-num uppercase">{background.gradientConfig.type} · {background.gradientConfig.colors.length} stops</p>
          )}
        </div>
      )}

      {/* Transparent */}
      {mode === 'transparent' && (
        <p className="text-caption">
          No background. The visualizer renders on alpha so you can layer it over your own footage. Use
          <span className="text-text-secondary"> PNG Sequence</span> export for true transparency.
        </p>
      )}

      {/* Custom media */}
      {mode === 'custom' && (
        <div className="space-y-2">
          {background.mediaUrl ? (
            <div className="bg-surface-2/40 rounded-md p-2 border border-hairline/50 flex items-center gap-2">
              {background.mediaType === 'video' ? (
                <video src={background.mediaUrl} className="w-10 h-10 object-cover rounded" muted />
              ) : (
                <img src={background.mediaUrl} alt="" className="w-10 h-10 object-cover rounded" />
              )}
              <span className="flex-1 text-text-secondary text-xs capitalize">{background.mediaType}</span>
              <button onClick={clearBackgroundMedia} className="p-1 hover:bg-ai-red/[0.08] rounded">
                <X className="w-4 h-4 text-text-tertiary" />
              </button>
            </div>
          ) : (
            <button onClick={() => fileRef.current?.click()} className="btn btn-ghost w-full h-10">
              <Upload className="w-4 h-4" /> Upload image or video
            </button>
          )}
          <p className="text-caption">PNG, JPG, GIF, MP4, WebM. Max ~50MB.</p>
          {background.mediaUrl && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-text-secondary text-xs">Vertical position</span>
                <span className="text-xs text-text-tertiary font-mono-num">{background.positionY}%</span>
              </div>
              <input
                type="range" className="ai-range" min={0} max={100} step={1}
                value={background.positionY}
                onChange={(e) => setBackgroundPositionY(parseInt(e.target.value))}
                onDoubleClick={() => setBackgroundPositionY(50)}
                title="Double-click to reset"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
