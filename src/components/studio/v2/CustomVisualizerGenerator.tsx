import React, { useState, useCallback, useEffect, Suspense } from 'react';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shuffle, Save, RefreshCw, Sparkles } from 'lucide-react';
import { Canvas } from '@react-three/fiber';
import { 
  generateRandomSeed, 
  generateRandomParams, 
  paramsToName,
  paramsToEmoji,
  BASE_SHAPES,
  ANIMATION_STYLES,
  INTENSITIES,
  type BaseShape,
  type AnimationStyle,
  type Intensity,
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

  // Generate new random visualizer
  const handleGenerate = useCallback(() => {
    const preferences: Partial<Pick<RandomVisualizerParams, 'baseShape' | 'animationStyle' | 'intensity'>> = {};
    if (shapeFilter !== 'any') preferences.baseShape = shapeFilter as RandomVisualizerParams['baseShape'];
    if (animationFilter !== 'any') preferences.animationStyle = animationFilter as RandomVisualizerParams['animationStyle'];
    if (intensityFilter !== 'any') preferences.intensity = intensityFilter as RandomVisualizerParams['intensity'];
    
    const newSeed = generateRandomSeed();
    setCurrentParams(generateRandomParams(newSeed, preferences));
  }, [shapeFilter, animationFilter, intensityFilter]);

  // Update preview in real-time when filters change
  useEffect(() => {
    const preferences: Partial<Pick<RandomVisualizerParams, 'baseShape' | 'animationStyle' | 'intensity'>> = {};
    if (shapeFilter !== 'any') preferences.baseShape = shapeFilter as RandomVisualizerParams['baseShape'];
    if (animationFilter !== 'any') preferences.animationStyle = animationFilter as RandomVisualizerParams['animationStyle'];
    if (intensityFilter !== 'any') preferences.intensity = intensityFilter as RandomVisualizerParams['intensity'];
    
    setCurrentParams(prev => generateRandomParams(prev.seed, preferences));
  }, [shapeFilter, animationFilter, intensityFilter]);

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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden bg-black/95 border border-white/20">
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

          {/* Optional Preferences */}
          <div className="space-y-3">
            <p className="text-xs text-white/50">Optional: Filter by preferences</p>
            
            <div className="grid grid-cols-3 gap-3">
              {/* Shape Filter */}
              <div className="space-y-1">
                <label className="text-xs text-white/70">Shape</label>
                <select 
                  value={shapeFilter}
                  onChange={(e) => setShapeFilter(e.target.value as BaseShape | 'any')}
                  className="w-full bg-white/10 border border-white/20 rounded px-2 py-1.5 text-white text-sm"
                >
                  <option value="any">Any</option>
                  {BASE_SHAPES.map(shape => (
                    <option key={shape} value={shape}>
                      {shape.charAt(0).toUpperCase() + shape.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Animation Filter */}
              <div className="space-y-1">
                <label className="text-xs text-white/70">Animation</label>
                <select 
                  value={animationFilter}
                  onChange={(e) => setAnimationFilter(e.target.value as AnimationStyle | 'any')}
                  className="w-full bg-white/10 border border-white/20 rounded px-2 py-1.5 text-white text-sm"
                >
                  <option value="any">Any</option>
                  {ANIMATION_STYLES.map(style => (
                    <option key={style} value={style}>
                      {style.charAt(0).toUpperCase() + style.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Intensity Filter */}
              <div className="space-y-1">
                <label className="text-xs text-white/70">Intensity</label>
                <select 
                  value={intensityFilter}
                  onChange={(e) => setIntensityFilter(e.target.value as Intensity | 'any')}
                  className="w-full bg-white/10 border border-white/20 rounded px-2 py-1.5 text-white text-sm"
                >
                  <option value="any">Any</option>
                  {INTENSITIES.map(int => (
                    <option key={int} value={int}>
                      {int.charAt(0).toUpperCase() + int.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-4 border-t border-white/20">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSaving}
            className="border-white/20 text-white hover:bg-white/10"
          >
            Cancel
          </Button>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleGenerate}
              disabled={isSaving}
              className="border-white/20 text-white hover:bg-white/10"
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
