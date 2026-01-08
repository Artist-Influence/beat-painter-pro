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
    background,
    setBackgroundColor,
    setBackgroundMedia,
    setBackgroundPositionY,
    clearBackgroundMedia,
    filters,
    setFilters,
    zoomLevel,
    setZoom,
    exportMode,
    setExportMode
  } = useStudioStore();
  
  const bgInputRef = React.useRef<HTMLInputElement>(null);
  
  const handleBackgroundFile = (file: File) => {
    const url = URL.createObjectURL(file);
    const isVideo = file.type.startsWith('video/');
    const isGif = file.type === 'image/gif';
    setBackgroundMedia(url, isVideo ? 'video' : isGif ? 'gif' : 'image');
  };
  
  const presets = [
    { key: 'calm' as const, label: 'Calm', description: 'Minimal movements' },
    { key: 'flow' as const, label: 'Flow', description: 'Rhythmic animations' },
    { key: 'energy' as const, label: 'Energy', description: 'Dynamic responses' }
  ];

  return (
    <div className="space-y-6">
      {/* Audio EQ Response */}
      <div className="space-y-3">
        <span className="text-white/80 text-sm">Audio EQ Response</span>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-white/80 text-sm">Bass (0-250 Hz)</span>
            <span className="text-xs text-white/60">{audioSensitivity.bassMultiplier.toFixed(1)}x</span>
          </div>
          <ResettableSlider
            value={[audioSensitivity.bassMultiplier]}
            min={0}
            max={8}
            step={0.1}
            defaultValue={2.5}
            onValueChange={([v]) => setAudioSensitivity({ bassMultiplier: v })}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-white/80 text-sm">Mids (250-4000 Hz)</span>
            <span className="text-xs text-white/60">{audioSensitivity.midsMultiplier.toFixed(1)}x</span>
          </div>
          <ResettableSlider
            value={[audioSensitivity.midsMultiplier]}
            min={0}
            max={8}
            step={0.1}
            defaultValue={1.5}
            onValueChange={([v]) => setAudioSensitivity({ midsMultiplier: v })}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-white/80 text-sm">Highs (4000+ Hz)</span>
            <span className="text-xs text-white/60">{audioSensitivity.highsMultiplier.toFixed(1)}x</span>
          </div>
          <ResettableSlider
            value={[audioSensitivity.highsMultiplier]}
            min={0}
            max={8}
            step={0.1}
            defaultValue={1.0}
            onValueChange={([v]) => setAudioSensitivity({ highsMultiplier: v })}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-white/80 text-sm">Spin Modulation</span>
            <span className="text-xs text-white/60">{audioSensitivity.spinSpeed.toFixed(1)}x</span>
          </div>
          <ResettableSlider
            value={[audioSensitivity.spinSpeed]}
            min={0}
            max={5}
            step={0.1}
            defaultValue={0}
            onValueChange={([v]) => setAudioSensitivity({ spinSpeed: v })}
          />
        </div>
      </div>

      <div className="border-t border-white/10 my-4"></div>

      {/* Background */}
      <div className="space-y-3">
          <span className="text-white/80 text-sm">Background</span>
          
          {/* Hidden file input for custom background */}
          <input
            ref={bgInputRef}
            type="file"
            accept="image/*,video/mp4,video/webm"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleBackgroundFile(file);
            }}
          />
          
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={() => setBackgroundColor("#00FF00")}
              className={`h-12 flex flex-col gap-1 items-center justify-center rounded-xl border transition-all ${
                background.type === 'color' && background.color === "#00FF00"
                  ? 'bg-purple-600/20 border-purple-500/50 shadow-lg shadow-purple-600/20'
                  : 'bg-white/5 border-white/10 hover:border-purple-500/30 hover:bg-white/10'
              }`}
            >
              <div className="w-4 h-4 bg-green-500 rounded border" />
              <span className="text-xs text-white">Green</span>
            </button>
            <button
              onClick={() => setBackgroundColor("#FFFFFF")}
              className={`h-12 flex flex-col gap-1 items-center justify-center rounded-xl border transition-all ${
                background.type === 'color' && background.color === "#FFFFFF"
                  ? 'bg-purple-600/20 border-purple-500/50 shadow-lg shadow-purple-600/20'
                  : 'bg-white/5 border-white/10 hover:border-purple-500/30 hover:bg-white/10'
              }`}
            >
              <div className="w-4 h-4 bg-white rounded border" />
              <span className="text-xs text-white">White</span>
            </button>
            <button
              onClick={() => setBackgroundColor("#000000")}
              className={`h-12 flex flex-col gap-1 items-center justify-center rounded-xl border transition-all ${
                background.type === 'color' && background.color === "#000000"
                  ? 'bg-purple-600/20 border-purple-500/50 shadow-lg shadow-purple-600/20'
                  : 'bg-white/5 border-white/10 hover:border-purple-500/30 hover:bg-white/10'
              }`}
            >
              <div className="w-4 h-4 bg-black rounded border border-white/30" />
              <span className="text-xs text-white">Black</span>
            </button>
            <button
              onClick={() => {
                // If we already have an uploaded background, switch to it; otherwise open file picker
                if (background.mediaUrl && background.mediaType) {
                  setBackgroundMedia(background.mediaUrl, background.mediaType);
                } else {
                  bgInputRef.current?.click();
                }
              }}
              className={`h-12 flex flex-col gap-1 items-center justify-center rounded-xl border transition-all ${
                background.type !== 'color'
                  ? 'bg-purple-600/20 border-purple-500/50 shadow-lg shadow-purple-600/20'
                  : background.mediaUrl 
                    ? 'bg-white/5 border-purple-500/30 hover:border-purple-500/50 hover:bg-white/10'
                    : 'bg-white/5 border-white/10 hover:border-purple-500/30 hover:bg-white/10'
              }`}
            >
              {background.mediaUrl && background.type === 'color' ? (
                <img src={background.mediaUrl} alt="" className="w-4 h-4 object-cover rounded" />
              ) : (
                <div className="w-4 h-4 rounded border border-dashed border-white/40 flex items-center justify-center">
                  <span className="text-[8px] text-white/60">+</span>
                </div>
              )}
              <span className="text-xs text-white">Custom</span>
            </button>
          </div>
          
          {/* File type info - shown when no custom background */}
          {!background.mediaUrl && (
            <div className="text-xs text-white/50 space-y-0.5">
              <p>Accepted: PNG, JPG, GIF, MP4, WebM</p>
              <p>Max recommended: 50MB</p>
            </div>
          )}
          
          {/* Custom background preview */}
          {background.type !== 'color' && background.mediaUrl && (
            <div className="space-y-3">
              <div className="bg-white/5 rounded-lg p-2 border border-white/10 flex items-center gap-2">
                {background.mediaType === 'video' ? (
                  <video 
                    src={background.mediaUrl} 
                    className="w-10 h-10 object-cover rounded"
                    muted
                  />
                ) : (
                  <img 
                    src={background.mediaUrl} 
                    alt="Background preview" 
                    className="w-10 h-10 object-cover rounded"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-white/80 text-xs truncate">
                    {background.mediaType === 'video' ? 'Video' : background.mediaType === 'gif' ? 'GIF' : 'Image'}
                  </p>
                </div>
                <button
                  onClick={clearBackgroundMedia}
                  className="p-1 hover:bg-white/10 rounded"
                >
                  <span className="text-white/60 text-xs">✕</span>
                </button>
              </div>
              
              {/* Vertical position slider */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-white/80 text-xs">Vertical Position</span>
                  <span className="text-xs text-white/60">{background.positionY}%</span>
                </div>
                <ResettableSlider
                  value={[background.positionY]}
                  min={0}
                  max={100}
                  step={1}
                  defaultValue={50}
                  onValueChange={([v]) => setBackgroundPositionY(v)}
                />
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-white/10 my-4"></div>

        {/* Export Mode */}
        <div className="space-y-3">
          <span className="text-white/80 text-sm">Export Mode</span>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setExportMode('video')}
              className={`h-auto py-3 px-3 text-left rounded-xl border transition-all ${
                exportMode === 'video'
                  ? 'bg-purple-600/20 border-purple-500/50 shadow-lg shadow-purple-600/20'
                  : 'bg-white/5 border-white/10 hover:border-purple-500/30 hover:bg-white/10'
              }`}
            >
              <div className="flex flex-col items-start w-full">
                <span className="font-medium text-sm text-white">Video</span>
                <span className="text-xs text-white/60 mt-0.5">WebM with audio</span>
              </div>
            </button>
            <button
              onClick={() => setExportMode('png-sequence')}
              className={`h-auto py-3 px-3 text-left rounded-xl border transition-all ${
                exportMode === 'png-sequence'
                  ? 'bg-purple-600/20 border-purple-500/50 shadow-lg shadow-purple-600/20'
                  : 'bg-white/5 border-white/10 hover:border-purple-500/30 hover:bg-white/10'
              }`}
            >
              <div className="flex flex-col items-start w-full">
                <span className="font-medium text-sm text-white">PNG Sequence</span>
                <span className="text-xs text-white/60 mt-0.5">True transparency</span>
              </div>
            </button>
          </div>
          {exportMode === 'png-sequence' && (
            <p className="text-xs text-white/50">Exports transparent PNGs at 60fps - import into video editor and add audio</p>
          )}
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
  );
};

export default AudioResponseControls;