import React, { useState, useCallback, useEffect, Suspense } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Save, RefreshCw, Sparkles, Link2 } from 'lucide-react';
import { Canvas } from '@react-three/fiber';
import { 
  generateRandomSeed, 
  generateRandomParams, 
  paramsToName,
  paramsToEmoji,
  BASE_SHAPES,
  ANIMATION_STYLES,
  INTENSITIES,
  DENSITIES,
  VISUAL_EFFECTS,
  COLOR_SCHEMES,
  type BaseShape,
  type AnimationStyle,
  type Intensity,
  type Density,
  type VisualEffect,
  type ColorScheme,
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

// Color scheme preview swatches
const COLOR_PREVIEWS: Record<ColorScheme, string[]> = {
  mono: ['#fff', '#999', '#666'],
  neon: ['#f0f', '#0ff', '#ff0'],
  pastel: ['#ffb5e8', '#b5fffc', '#ffffd1'],
  fire: ['#f00', '#f60', '#fc0'],
  ice: ['#0ff', '#08f', '#fff'],
  rainbow: ['#f00', '#ff0', '#0f0', '#00f'],
  sunset: ['#ff6b6b', '#ffa500', '#ffd93d'],
  ocean: ['#006994', '#40e0d0', '#00ced1'],
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
  
  // User preferences (optional filters)
  const [shapeFilter, setShapeFilter] = useState<BaseShape | 'any'>('any');
  const [animationFilter, setAnimationFilter] = useState<AnimationStyle | 'any'>('any');
  const [intensityFilter, setIntensityFilter] = useState<Intensity | 'any'>('any');
  const [densityFilter, setDensityFilter] = useState<Density | 'any'>('any');
  const [effectFilter, setEffectFilter] = useState<VisualEffect | 'any'>('any');
  const [colorFilter, setColorFilter] = useState<ColorScheme | 'any'>('any');
  const [threadingEnabled, setThreadingEnabled] = useState(false);

  // Generate new random visualizer
  const handleGenerate = useCallback(() => {
    const preferences: Partial<Pick<RandomVisualizerParams, 'baseShape' | 'animationStyle' | 'intensity' | 'density' | 'visualEffect' | 'colorScheme'>> = {};
    if (shapeFilter !== 'any') preferences.baseShape = shapeFilter;
    if (animationFilter !== 'any') preferences.animationStyle = animationFilter;
    if (intensityFilter !== 'any') preferences.intensity = intensityFilter;
    if (densityFilter !== 'any') preferences.density = densityFilter;
    if (effectFilter !== 'any') preferences.visualEffect = effectFilter;
    if (colorFilter !== 'any') preferences.colorScheme = colorFilter;
    
    const newSeed = generateRandomSeed();
    const newParams = generateRandomParams(newSeed, preferences);
    // Override threading if manually set
    if (threadingEnabled) {
      newParams.connectionLines = true;
    }
    setCurrentParams(newParams);
  }, [shapeFilter, animationFilter, intensityFilter, densityFilter, effectFilter, colorFilter, threadingEnabled]);

  // Update preview in real-time when filters change
  useEffect(() => {
    const preferences: Partial<Pick<RandomVisualizerParams, 'baseShape' | 'animationStyle' | 'intensity' | 'density' | 'visualEffect' | 'colorScheme'>> = {};
    if (shapeFilter !== 'any') preferences.baseShape = shapeFilter;
    if (animationFilter !== 'any') preferences.animationStyle = animationFilter;
    if (intensityFilter !== 'any') preferences.intensity = intensityFilter;
    if (densityFilter !== 'any') preferences.density = densityFilter;
    if (effectFilter !== 'any') preferences.visualEffect = effectFilter;
    if (colorFilter !== 'any') preferences.colorScheme = colorFilter;
    
    setCurrentParams(prev => {
      const updated = generateRandomParams(prev.seed, preferences);
      if (threadingEnabled) updated.connectionLines = true;
      return updated;
    });
  }, [shapeFilter, animationFilter, intensityFilter, densityFilter, effectFilter, colorFilter, threadingEnabled]);

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
            
            {/* Row 1: Shape, Animation, Intensity */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-white/70">Shape</label>
                <select 
                  value={shapeFilter}
                  onChange={(e) => setShapeFilter(e.target.value as BaseShape | 'any')}
                  className="w-full bg-white/10 border border-white/20 rounded px-2 py-1.5 text-white text-sm"
                >
                  <option value="any">Random</option>
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
                  onChange={(e) => setAnimationFilter(e.target.value as AnimationStyle | 'any')}
                  className="w-full bg-white/10 border border-white/20 rounded px-2 py-1.5 text-white text-sm"
                >
                  <option value="any">Random</option>
                  {ANIMATION_STYLES.map(style => (
                    <option key={style} value={style}>
                      {style.charAt(0).toUpperCase() + style.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="space-y-1">
                <label className="text-xs text-white/70">Intensity</label>
                <select 
                  value={intensityFilter}
                  onChange={(e) => setIntensityFilter(e.target.value as Intensity | 'any')}
                  className="w-full bg-white/10 border border-white/20 rounded px-2 py-1.5 text-white text-sm"
                >
                  <option value="any">Random</option>
                  {INTENSITIES.map(int => (
                    <option key={int} value={int}>
                      {int.charAt(0).toUpperCase() + int.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 2: Density, Visual Effect, Color Scheme */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-white/70">Density</label>
                <select 
                  value={densityFilter}
                  onChange={(e) => setDensityFilter(e.target.value as Density | 'any')}
                  className="w-full bg-white/10 border border-white/20 rounded px-2 py-1.5 text-white text-sm"
                >
                  <option value="any">Random</option>
                  {DENSITIES.map(d => (
                    <option key={d} value={d}>
                      {d.charAt(0).toUpperCase() + d.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="space-y-1">
                <label className="text-xs text-white/70">Visual Effect</label>
                <select 
                  value={effectFilter}
                  onChange={(e) => setEffectFilter(e.target.value as VisualEffect | 'any')}
                  className="w-full bg-white/10 border border-white/20 rounded px-2 py-1.5 text-white text-sm"
                >
                  <option value="any">Random</option>
                  {VISUAL_EFFECTS.map(effect => (
                    <option key={effect} value={effect}>
                      {effect === 'none' ? 'Solid' : effect.charAt(0).toUpperCase() + effect.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="space-y-1">
                <label className="text-xs text-white/70">Color Scheme</label>
                <select 
                  value={colorFilter}
                  onChange={(e) => setColorFilter(e.target.value as ColorScheme | 'any')}
                  className="w-full bg-white/10 border border-white/20 rounded px-2 py-1.5 text-white text-sm"
                >
                  <option value="any">Random</option>
                  {COLOR_SCHEMES.map(scheme => (
                    <option key={scheme} value={scheme}>
                      {scheme.charAt(0).toUpperCase() + scheme.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 3: Color Preview & Threading Toggle */}
            <div className="flex items-center justify-between gap-4 pt-2">
              {/* Color preview */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/50">Colors:</span>
                <div className="flex gap-1">
                  {(COLOR_PREVIEWS[currentParams.colorScheme] || COLOR_PREVIEWS.mono).map((color, i) => (
                    <div 
                      key={i}
                      className="w-5 h-5 rounded-full border border-white/30"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              
              {/* Threading toggle */}
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