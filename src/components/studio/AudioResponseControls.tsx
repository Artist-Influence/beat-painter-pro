import React from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useStudioStore } from "@/stores/studioStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

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
    audioSensitivity, 
    setAudioSensitivity, 
    setAudioPreset,
    backgroundColor,
    setBackground,
    filters,
    setFilters,
    zoomLevel,
    setZoom,
    transparentExport,
    setTransparentExport
  } = useStudioStore();
  
  const presets = [
    { key: 'calm' as const, label: 'Calm', description: 'Minimal movements' },
    { key: 'flow' as const, label: 'Flow', description: 'Rhythmic animations' },
    { key: 'energy' as const, label: 'Energy', description: 'Dynamic responses' }
  ];

  return (
    <div className="space-y-6">
      <h3 className="text-white/80 text-sm font-medium">Audio Response</h3>
      <div className="space-y-4">
        {/* Preset Buttons */}
        <div className="grid grid-cols-1 gap-2">
          {presets.map((preset) => (
            <button
              key={preset.key}
              onClick={() => setAudioPreset(preset.key)}
              className={`h-auto py-3 px-3 text-left rounded-xl border transition-all ${
                audioSensitivity.preset === preset.key
                  ? 'bg-purple-600/20 border-purple-500/50 shadow-lg shadow-purple-600/20'
                  : 'bg-white/5 border-white/10 hover:border-purple-500/30 hover:bg-white/10'
              }`}
            >
              <div className="flex flex-col items-start w-full">
                <span className="font-medium text-sm text-white">{preset.label}</span>
                <span className="text-xs text-white/60 mt-0.5">{preset.description}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Individual Controls - Show when custom or allow override */}
        <div className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-white/80 text-sm">Bass Response</span>
              <span className="text-xs text-white/60">
                {audioSensitivity.bassMultiplier.toFixed(1)}x
              </span>
            </div>
            <ResettableSlider
              value={[audioSensitivity.bassMultiplier]}
              min={0.1}
              max={8.0}
              step={0.2}
              defaultValue={1.0}
              onValueChange={([v]) => setAudioSensitivity({ bassMultiplier: v })}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-white/80 text-sm">Mids Response</span>
              <span className="text-xs text-white/60">
                {audioSensitivity.midsMultiplier.toFixed(1)}x
              </span>
            </div>
            <ResettableSlider
              value={[audioSensitivity.midsMultiplier]}
              min={0.1}
              max={8.0}
              step={0.2}
              defaultValue={0.7}
              onValueChange={([v]) => setAudioSensitivity({ midsMultiplier: v })}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-white/80 text-sm">Highs Response</span>
              <span className="text-xs text-white/60">
                {audioSensitivity.highsMultiplier.toFixed(1)}x
              </span>
            </div>
            <ResettableSlider
              value={[audioSensitivity.highsMultiplier]}
              min={0.1}
              max={8.0}
              step={0.2}
              defaultValue={0.4}
              onValueChange={([v]) => setAudioSensitivity({ highsMultiplier: v })}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-white/80 text-sm">Animation Speed</span>
              <span className="text-xs text-white/60">
                {audioSensitivity.animationSpeed.toFixed(1)}x
              </span>
            </div>
            <ResettableSlider
              value={[audioSensitivity.animationSpeed]}
              min={0.1}
              max={4.0}
              step={0.2}
              defaultValue={1.0}
              onValueChange={([v]) => setAudioSensitivity({ animationSpeed: v })}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-white/80 text-sm">Spin Speed</span>
              <span className="text-xs text-white/60">
                {(audioSensitivity.spinSpeed ?? 0).toFixed(1)}x
              </span>
            </div>
            <ResettableSlider
              value={[audioSensitivity.spinSpeed ?? 0]}
              min={0}
              max={8.0}
              step={0.1}
              defaultValue={0}
              onValueChange={([v]) => setAudioSensitivity({ spinSpeed: v })}
              className="w-full"
            />
          </div>
        </div>

        {audioSensitivity.preset === 'custom' && (
          <p className="text-xs text-white/60">
            Custom settings active
          </p>
        )}

        <div className="border-t border-white/10 my-4"></div>

        {/* Background Colors */}
        <div className="space-y-3">
          <span className="text-white/80 text-sm">Background</span>
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={() => { setTransparentExport(false); setBackground("#00FF00"); }}
              className={`h-12 flex flex-col gap-1 items-center justify-center rounded-xl border transition-all ${
                !transparentExport && backgroundColor === "#00FF00"
                  ? 'bg-purple-600/20 border-purple-500/50 shadow-lg shadow-purple-600/20'
                  : 'bg-white/5 border-white/10 hover:border-purple-500/30 hover:bg-white/10'
              }`}
            >
              <div className="w-4 h-4 bg-green-500 rounded border" />
              <span className="text-xs text-white">Green</span>
            </button>
            <button
              onClick={() => { setTransparentExport(false); setBackground("#FFFFFF"); }}
              className={`h-12 flex flex-col gap-1 items-center justify-center rounded-xl border transition-all ${
                !transparentExport && backgroundColor === "#FFFFFF"
                  ? 'bg-purple-600/20 border-purple-500/50 shadow-lg shadow-purple-600/20'
                  : 'bg-white/5 border-white/10 hover:border-purple-500/30 hover:bg-white/10'
              }`}
            >
              <div className="w-4 h-4 bg-white rounded border" />
              <span className="text-xs text-white">White</span>
            </button>
            <button
              onClick={() => { setTransparentExport(false); setBackground("#000000"); }}
              className={`h-12 flex flex-col gap-1 items-center justify-center rounded-xl border transition-all ${
                !transparentExport && backgroundColor === "#000000"
                  ? 'bg-purple-600/20 border-purple-500/50 shadow-lg shadow-purple-600/20'
                  : 'bg-white/5 border-white/10 hover:border-purple-500/30 hover:bg-white/10'
              }`}
            >
              <div className="w-4 h-4 bg-black rounded border" />
              <span className="text-xs text-white">Black</span>
            </button>
            <button
              onClick={() => setTransparentExport(true)}
              className={`h-12 flex flex-col gap-1 items-center justify-center rounded-xl border transition-all ${
                transparentExport
                  ? 'bg-purple-600/20 border-purple-500/50 shadow-lg shadow-purple-600/20'
                  : 'bg-white/5 border-white/10 hover:border-purple-500/30 hover:bg-white/10'
              }`}
            >
              <div 
                className="w-4 h-4 rounded border border-white/30"
                style={{ 
                  backgroundImage: 'linear-gradient(45deg, #666 25%, transparent 25%), linear-gradient(-45deg, #666 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #666 75%), linear-gradient(-45deg, transparent 75%, #666 75%)', 
                  backgroundSize: '6px 6px', 
                  backgroundPosition: '0 0, 0 3px, 3px -3px, -3px 0px' 
                }} 
              />
              <span className="text-xs text-white">None</span>
            </button>
          </div>
        </div>

        <div className="border-t border-white/10 my-4"></div>

        {/* Visual Filters */}
        <div className="space-y-3">
          <span className="text-white/80 text-sm">Visual Effects</span>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-white/80 text-sm">Brightness</span>
              <span className="text-xs text-white/60">{filters.brightness}%</span>
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
              <span className="text-white/80 text-sm">Saturation</span>
              <span className="text-xs text-white/60">{filters.saturation}%</span>
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
              <span className="text-white/80 text-sm">Contrast</span>
              <span className="text-xs text-white/60">{filters.contrast}%</span>
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
              <span className="text-white/80 text-sm">Zoom</span>
              <span className="text-xs text-white/60">{(zoomLevel * 100).toFixed(0)}%</span>
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
    </div>
  );
};

export default AudioResponseControls;