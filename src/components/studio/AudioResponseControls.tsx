import React from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useStudioStore } from "@/stores/studioStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

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
    setZoom
  } = useStudioStore();
  
  const presets = [
    { key: 'calm' as const, label: 'Calm', description: 'Minimal movements' },
    { key: 'flow' as const, label: 'Flow', description: 'Rhythmic animations' },
    { key: 'energy' as const, label: 'Energy', description: 'Dynamic responses' }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Audio Response</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Preset Buttons */}
        <div className="grid grid-cols-3 gap-2">
          {presets.map((preset) => (
            <Button
              key={preset.key}
              variant={audioSensitivity.preset === preset.key ? "default" : "outline"}
              size="sm"
              onClick={() => setAudioPreset(preset.key)}
              className="flex flex-col h-auto py-2"
            >
              <span className="font-medium">{preset.label}</span>
              <span className="text-xs opacity-75">{preset.description}</span>
            </Button>
          ))}
        </div>

        {/* Individual Controls - Show when custom or allow override */}
        <div className="space-y-3">
          <div className="space-y-2">
            <Label className="flex items-center justify-between">
              <span>Bass Response</span>
              <span className="text-xs text-muted-foreground">
                {audioSensitivity.bassMultiplier.toFixed(1)}x
              </span>
            </Label>
            <Slider
              value={[audioSensitivity.bassMultiplier]}
              min={0.1}
              max={3.0}
              step={0.1}
              onValueChange={([v]) => setAudioSensitivity({ bassMultiplier: v })}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center justify-between">
              <span>Mids Response</span>
              <span className="text-xs text-muted-foreground">
                {audioSensitivity.midsMultiplier.toFixed(1)}x
              </span>
            </Label>
            <Slider
              value={[audioSensitivity.midsMultiplier]}
              min={0.1}
              max={3.0}
              step={0.1}
              onValueChange={([v]) => setAudioSensitivity({ midsMultiplier: v })}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center justify-between">
              <span>Highs Response</span>
              <span className="text-xs text-muted-foreground">
                {audioSensitivity.highsMultiplier.toFixed(1)}x
              </span>
            </Label>
            <Slider
              value={[audioSensitivity.highsMultiplier]}
              min={0.1}
              max={3.0}
              step={0.1}
              onValueChange={([v]) => setAudioSensitivity({ highsMultiplier: v })}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center justify-between">
              <span>Animation Speed</span>
              <span className="text-xs text-muted-foreground">
                {audioSensitivity.animationSpeed.toFixed(1)}x
              </span>
            </Label>
            <Slider
              value={[audioSensitivity.animationSpeed]}
              min={0.5}
              max={2.0}
              step={0.1}
              onValueChange={([v]) => setAudioSensitivity({ animationSpeed: v })}
              className="w-full"
            />
          </div>
        </div>

        {audioSensitivity.preset === 'custom' && (
          <p className="text-xs text-muted-foreground">
            Custom settings active
          </p>
        )}

        <Separator className="my-4" />

        {/* Background Colors */}
        <div className="space-y-3">
          <Label>Background</Label>
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant={backgroundColor === "#00FF00" ? "default" : "outline"}
              size="sm"
              onClick={() => setBackground("#00FF00")}
              className="h-12 flex flex-col gap-1"
            >
              <div className="w-4 h-4 bg-green-500 rounded border" />
              <span className="text-xs">Green</span>
            </Button>
            <Button
              variant={backgroundColor === "#FFFFFF" ? "default" : "outline"}
              size="sm"
              onClick={() => setBackground("#FFFFFF")}
              className="h-12 flex flex-col gap-1"
            >
              <div className="w-4 h-4 bg-white rounded border" />
              <span className="text-xs">White</span>
            </Button>
            <Button
              variant={backgroundColor === "#000000" ? "default" : "outline"}
              size="sm"
              onClick={() => setBackground("#000000")}
              className="h-12 flex flex-col gap-1"
            >
              <div className="w-4 h-4 bg-black rounded border" />
              <span className="text-xs">Black</span>
            </Button>
          </div>
        </div>

        <Separator className="my-4" />

        {/* Visual Filters */}
        <div className="space-y-3">
          <Label>Visual Effects</Label>
          
          <div className="space-y-2">
            <Label className="flex items-center justify-between">
              <span>Brightness</span>
              <span className="text-xs text-muted-foreground">{filters.brightness}%</span>
            </Label>
            <Slider
              value={[filters.brightness]}
              min={0}
              max={200}
              step={5}
              onValueChange={([v]) => setFilters({ brightness: v })}
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center justify-between">
              <span>Saturation</span>
              <span className="text-xs text-muted-foreground">{filters.saturation}%</span>
            </Label>
            <Slider
              value={[filters.saturation]}
              min={0}
              max={200}
              step={5}
              onValueChange={([v]) => setFilters({ saturation: v })}
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center justify-between">
              <span>Contrast</span>
              <span className="text-xs text-muted-foreground">{filters.contrast}%</span>
            </Label>
            <Slider
              value={[filters.contrast]}
              min={0}
              max={200}
              step={5}
              onValueChange={([v]) => setFilters({ contrast: v })}
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center justify-between">
              <span>Zoom</span>
              <span className="text-xs text-muted-foreground">{(zoomLevel * 100).toFixed(0)}%</span>
            </Label>
            <Slider
              value={[zoomLevel]}
              min={0.5}
              max={3}
              step={0.1}
              onValueChange={([v]) => setZoom(v)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AudioResponseControls;