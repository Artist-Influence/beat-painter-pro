import React from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useStudioStore } from "@/stores/studioStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const AudioResponseControls: React.FC = () => {
  const { audioSensitivity, setAudioSensitivity, setAudioPreset } = useStudioStore();
  
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
      </CardContent>
    </Card>
  );
};

export default AudioResponseControls;