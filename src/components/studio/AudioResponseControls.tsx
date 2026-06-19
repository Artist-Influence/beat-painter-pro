import React from "react";
import { Slider } from "@/components/ui/slider";
import { useStudioStore } from "@/stores/studioStore";
import { BackgroundControls } from "./v2/BackgroundControls";
import { ReactivitySection } from "./v2/ReactivitySection";
import { Switch } from "@/components/ui/switch";

// Custom slider component with double-click reset
const ResettableSlider = ({ 
  value, 
  onValueChange, 
  defaultValue, 
  ...props 
}: {
  value: number[];
  onValueChange: (value: number[]) => void;
  defaultValue: number;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}) => {
  return (
    <div 
      onDoubleClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onValueChange([defaultValue]);
      }}
      className="w-full"
      title="Double-click to reset to default"
    >
      <Slider
        value={value}
        onValueChange={onValueChange}
        {...props}
      />
    </div>
  );
};

export const AudioResponseControls: React.FC = () => {
  const {
    filters,
    setFilters,
    zoomLevel,
    setZoom,
    exportMode,
    setExportMode,
    colorOverride,
    colorHue,
    setColorOverride,
    setColorHue,
    audioElement,
    exportSegment,
    setExportSegment,
  } = useStudioStore();

  const duration = (audioElement && !isNaN(audioElement.duration) ? audioElement.duration : 0) || 0;
  const fmtTime = (t: number) => `${Math.floor(t / 60)}:${Math.floor(t % 60).toString().padStart(2, '0')}`;
  const videoFormat = typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('video/mp4;codecs=avc1.42E01E,mp4a.40.2')
    ? 'MP4 with audio' : 'WebM with audio';

  return (
    <div className="space-y-6">
      {/* Unified reactivity (universal + per-type augmentation) */}
      <ReactivitySection />

      <div className="hairline my-4"></div>

      {/* Universal colour — recolours any visualizer type */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-eyebrow">color</p>
            <p className="text-caption">Recolours any visualizer</p>
          </div>
          <Switch checked={colorOverride} onCheckedChange={setColorOverride} />
        </div>
        {colorOverride && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">Hue</span>
              <span className="text-xs text-text-tertiary font-mono-num">{Math.round(colorHue)}°</span>
            </div>
            <input
              type="range" min={0} max={360} step={1} value={colorHue}
              onChange={(e) => setColorHue(parseInt(e.target.value))}
              onDoubleClick={() => setColorHue(200)}
              title="Double-click to reset"
              className="ai-range w-full"
              style={{ background: 'linear-gradient(90deg, hsl(0 80% 55%), hsl(60 80% 55%), hsl(120 80% 55%), hsl(180 80% 55%), hsl(240 80% 55%), hsl(300 80% 55%), hsl(360 80% 55%))' }}
            />
          </div>
        )}
      </div>

      <div className="hairline my-4"></div>

      {/* Background */}
      <BackgroundControls />

        <div className="hairline my-4"></div>

        {/* Export Mode */}
        <div className="space-y-3">
          <p className="text-eyebrow">export</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setExportMode('video')}
              className={`h-auto py-3 px-3 text-left rounded-xl border transition-all ${
                exportMode === 'video'
                  ? 'bg-ai-red/[0.10] border-ai-red shadow-glow'
                  : 'bg-surface-2/40 border-hairline/50 hover:border-ai-red/40 hover:bg-ai-red/[0.06]'
              }`}
            >
              <div className="flex flex-col items-start w-full">
                <span className="font-medium text-sm text-white">Video</span>
                <span className="text-xs text-text-tertiary font-mono-num mt-0.5">{videoFormat}</span>
              </div>
            </button>
            <button
              onClick={() => setExportMode('png-sequence')}
              className={`h-auto py-3 px-3 text-left rounded-xl border transition-all ${
                exportMode === 'png-sequence'
                  ? 'bg-ai-red/[0.10] border-ai-red shadow-glow'
                  : 'bg-surface-2/40 border-hairline/50 hover:border-ai-red/40 hover:bg-ai-red/[0.06]'
              }`}
            >
              <div className="flex flex-col items-start w-full">
                <span className="font-medium text-sm text-white">PNG Sequence</span>
                <span className="text-xs text-text-tertiary font-mono-num mt-0.5">True transparency</span>
              </div>
            </button>
          </div>
          {exportMode === 'png-sequence' && (
            <p className="text-xs text-text-tertiary">Exports transparent PNGs at 60fps - import into video editor and add audio</p>
          )}

          {/* Segment: export a specific section of the track, lined up to the visualizer */}
          <div className="rounded-md p-3 border border-hairline/50 bg-surface-2/40 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-text-secondary">Segment</span>
                <p className="text-caption">Export just one part of the track</p>
              </div>
              <Switch checked={exportSegment.enabled} onCheckedChange={(v) => setExportSegment({ enabled: v })} disabled={duration === 0} />
            </div>
            {exportSegment.enabled && duration > 0 && (
              <div className="space-y-2 pt-1">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-tertiary">Start</span>
                    <span className="text-xs text-text-tertiary font-mono-num">{fmtTime(exportSegment.start)}</span>
                  </div>
                  <input type="range" className="ai-range" min={0} max={duration} step={0.5}
                    value={Math.min(exportSegment.start, exportSegment.end)}
                    onChange={(e) => setExportSegment({ start: Math.min(parseFloat(e.target.value), exportSegment.end - 1) })} />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-tertiary">End</span>
                    <span className="text-xs text-text-tertiary font-mono-num">{fmtTime(exportSegment.end)}</span>
                  </div>
                  <input type="range" className="ai-range" min={0} max={duration} step={0.5}
                    value={Math.max(exportSegment.end, exportSegment.start)}
                    onChange={(e) => setExportSegment({ end: Math.max(parseFloat(e.target.value), exportSegment.start + 1) })} />
                </div>
                <p className="text-caption font-mono-num">Length {fmtTime(Math.max(0, exportSegment.end - exportSegment.start))} · auto-stops at end</p>
              </div>
            )}
            {duration === 0 && <p className="text-caption">Load a track to pick a segment.</p>}
          </div>
        </div>

        <div className="hairline my-4"></div>

        {/* Visual Filters */}
        <div className="space-y-3">
          <p className="text-eyebrow">effects</p>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-text-secondary text-sm">Brightness</span>
              <span className="text-xs text-text-tertiary font-mono-num">{filters.brightness}%</span>
            </div>
            <ResettableSlider
              value={[filters.brightness]}
              min={0}
              max={200}
              step={5}
              defaultValue={100}
              onValueChange={([v]) => setFilters({ brightness: v })}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-text-secondary text-sm">Saturation</span>
              <span className="text-xs text-text-tertiary font-mono-num">{filters.saturation}%</span>
            </div>
            <ResettableSlider
              value={[filters.saturation]}
              min={0}
              max={200}
              step={5}
              defaultValue={100}
              onValueChange={([v]) => setFilters({ saturation: v })}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-text-secondary text-sm">Contrast</span>
              <span className="text-xs text-text-tertiary font-mono-num">{filters.contrast}%</span>
            </div>
            <ResettableSlider
              value={[filters.contrast]}
              min={0}
              max={200}
              step={5}
              defaultValue={100}
              onValueChange={([v]) => setFilters({ contrast: v })}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-text-secondary text-sm">Zoom</span>
              <span className="text-xs text-text-tertiary font-mono-num">{(zoomLevel * 100).toFixed(0)}%</span>
            </div>
            <ResettableSlider
              value={[zoomLevel]}
              min={0.5}
              max={3}
              step={0.1}
              defaultValue={1.0}
              onValueChange={([v]) => setZoom(v)}
            />
          </div>
        </div>
    </div>
  );
};

export default AudioResponseControls;
