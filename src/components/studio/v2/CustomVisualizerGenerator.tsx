import React, { useState, useCallback, useEffect, Suspense } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Save, RefreshCw, Sparkles, Link2 } from 'lucide-react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { 
  generateRandomSeed, 
  generateRandomParams, 
  paramsToName,
  paramsToEmoji,
  BASE_SHAPES,
  ANIMATION_STYLES,
  BACKGROUND_EFFECTS,
  type BaseShape,
  type AnimationStyle,
  type BackgroundEffect,
  type RandomVisualizerParams
} from '@/lib/randomVisualizerGenerator';
import { RandomVisualizerTemplate } from '@/components/visualizers/RandomVisualizerTemplate';
import { useCustomVisualizers } from '@/hooks/useCustomVisualizers';

interface CustomVisualizerGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (visualizer: any) => void;
}

// Mock audio data for preview
const PREVIEW_AUDIO = {
  frequency: Array(128).fill(0).map((_, i) => Math.sin(i * 0.1) * 127 + 128),
  amplitude: 0.5,
  beatStrength: 0.3,
};


// Background effect labels
const EFFECT_LABELS: Record<BackgroundEffect, string> = {
  none: 'None',
  stars: 'Stars',
  movingLines: 'Moving Lines',
  grid: 'Grid',
  particles: 'Particles',
  lightRays: 'Light Rays',
  aurora: 'Aurora',
};

export function CustomVisualizerGenerator({ 
  isOpen, 
  onClose, 
  onSuccess 
}: CustomVisualizerGeneratorProps) {
  const { saveRandomVisualizer, isSaving, userRole, quotaRemaining } = useCustomVisualizers();
  
  // Current random params
  const [currentParams, setCurrentParams] = useState<RandomVisualizerParams>(() => 
    generateRandomParams(generateRandomSeed())
  );
  
  // User preferences - no random options, always explicit selection
  const [shapeFilter, setShapeFilter] = useState<BaseShape>('orb');
  const [animationFilter, setAnimationFilter] = useState<AnimationStyle>('pulsing');
  const [elementCount, setElementCount] = useState<number>(20);
  const [backgroundEffectFilter, setBackgroundEffectFilter] = useState<BackgroundEffect>('none');
  const [threadingEnabled, setThreadingEnabled] = useState(false);

  // Generate new random visualizer with more variation
  const handleGenerate = useCallback(() => {
    const newSeed = generateRandomSeed();
    const newParams = generateRandomParams(newSeed, {
      baseShape: shapeFilter,
      animationStyle: animationFilter,
      backgroundEffect: backgroundEffectFilter,
      elementCount,
      connectionLines: threadingEnabled,
    });
    setCurrentParams(newParams);
  }, [shapeFilter, animationFilter, elementCount, backgroundEffectFilter, threadingEnabled]);

  // Update preview in real-time when filters change
  useEffect(() => {
    setCurrentParams(prev => {
      const updated = generateRandomParams(prev.seed, {
        baseShape: shapeFilter,
        animationStyle: animationFilter,
        backgroundEffect: backgroundEffectFilter,
        elementCount,
        connectionLines: threadingEnabled,
      });
      return updated;
    });
  }, [shapeFilter, animationFilter, elementCount, backgroundEffectFilter, threadingEnabled]);

  // Save current visualizer
  const handleSave = async () => {
    const result = await saveRandomVisualizer(currentParams);
    if (result) {
      onSuccess?.(result);
      onClose();
    }
  };

  const currentName = paramsToName(currentParams);
  const currentEmoji = paramsToEmoji(currentParams);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-black/95 border border-white/20">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              Generate Random Visualizer
            </div>
            {userRole !== 'admin' && (
              <Badge variant="secondary" className="bg-purple-600/30 text-purple-200">
                {quotaRemaining} remaining
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Preview Area */}
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden border border-white/10">
            <Canvas camera={{ position: [0, 0, 8], fov: 60 }}>
              <Suspense fallback={null}>
                <RandomVisualizerTemplate 
                  params={currentParams} 
                  audioData={PREVIEW_AUDIO}
                />
              </Suspense>
              <OrbitControls enablePan={false} enableZoom={true} minDistance={4} maxDistance={15} />
            </Canvas>
            
            {/* Current visualizer name overlay */}
            <div className="absolute bottom-3 left-3 flex items-center gap-2">
              <span className="text-2xl">{currentEmoji}</span>
              <span className="text-white font-medium text-sm bg-black/60 px-2 py-1 rounded">
                {currentName}
              </span>
            </div>
          </div>

          {/* Controls Grid */}
          <div className="space-y-3">
            <p className="text-xs text-white/50">Customize your visualizer</p>
            
            {/* Row 1: Shape and Animation */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-white/70">Shape</label>
                <select 
                  value={shapeFilter}
                  onChange={(e) => setShapeFilter(e.target.value as BaseShape)}
                  className="w-full bg-white/10 border border-white/20 rounded px-2 py-1.5 text-white text-sm"
                >
                  {BASE_SHAPES.map(shape => (
                    <option key={shape} value={shape}>
                      {shape.charAt(0).toUpperCase() + shape.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="space-y-1">
                <label className="text-xs text-white/70">Animation</label>
                <select 
                  value={animationFilter}
                  onChange={(e) => setAnimationFilter(e.target.value as AnimationStyle)}
                  className="w-full bg-white/10 border border-white/20 rounded px-2 py-1.5 text-white text-sm"
                >
                  {ANIMATION_STYLES.map(style => (
                    <option key={style} value={style}>
                      {style.charAt(0).toUpperCase() + style.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 2: Element Count Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-white/70">Elements</label>
                <span className="text-xs text-white/90 font-medium">{elementCount}</span>
              </div>
              <Slider
                value={[elementCount]}
                onValueChange={(value) => setElementCount(value[0])}
                min={1}
                max={100}
                step={1}
                className="w-full"
              />
            </div>

            {/* Row 3: Background Effect & Connection Lines */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-white/70">Background Effect</label>
                <select 
                  value={backgroundEffectFilter}
                  onChange={(e) => setBackgroundEffectFilter(e.target.value as BackgroundEffect)}
                  className="w-full bg-white/10 border border-white/20 rounded px-2 py-1.5 text-white text-sm"
                >
                  {BACKGROUND_EFFECTS.map(effect => (
                    <option key={effect} value={effect}>
                      {EFFECT_LABELS[effect]}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Threading toggle */}
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={threadingEnabled}
                    onChange={(e) => setThreadingEnabled(e.target.checked)}
                    className="w-4 h-4 rounded bg-white/10 border-white/20 text-purple-500 focus:ring-purple-500"
                  />
                  <span className="text-xs text-white/70 flex items-center gap-1">
                    <Link2 className="w-3 h-3" />
                    Connection Lines
                  </span>
                </label>
              </div>
            </div>

          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-4 border-t border-white/20">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isSaving}
            className="bg-white/10 border border-white/20 text-white hover:bg-white/20"
          >
            Cancel
          </Button>
          
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={handleGenerate}
              disabled={isSaving}
              className="bg-white/10 border border-white/20 text-white hover:bg-white/20"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Another
            </Button>
            
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save This One
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
