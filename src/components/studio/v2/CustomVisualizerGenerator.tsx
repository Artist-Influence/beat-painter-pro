import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Save, RefreshCw, Sparkles, Link2, Shuffle, Minimize2, Maximize2 } from 'lucide-react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { 
  generateRandomSeed, 
  generateRandomParams, 
  paramsToName,
  paramsToEmoji,
  BASE_SHAPES,
  BACKGROUND_EFFECTS,
  ANIMATION_STYLES,
  type BaseShape,
  type AnimationStyle,
  type RandomVisualizerParams
} from '@/lib/randomVisualizerGenerator';
import { RandomVisualizerTemplate } from '@/components/visualizers/RandomVisualizerTemplate';
import { useCustomVisualizers } from '@/hooks/useCustomVisualizers';

interface CustomVisualizerGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (visualizer: any) => void;
}

// Animation style labels
const ANIMATION_LABELS: Record<AnimationStyle, string> = {
  pulsing: 'Pulsing',
  rotating: 'Rotating',
  flowing: 'Flowing',
  chaotic: 'Chaotic',
  smooth: 'Smooth',
  breathing: 'Breathing',
  explosive: 'Explosive',
};

// Hook for simulated 128 BPM audio preview
function useSimulatedAudio() {
  const [beatPhase, setBeatPhase] = useState(0);
  
  useEffect(() => {
    // 128 BPM = 2.133 beats per second = ~468.75ms per beat
    const beatInterval = 60000 / 128;
    const updateInterval = 16; // ~60fps
    
    let phase = 0;
    const interval = setInterval(() => {
      phase += updateInterval / beatInterval;
      if (phase >= 1) phase -= 1;
      setBeatPhase(phase);
    }, updateInterval);
    
    return () => clearInterval(interval);
  }, []);
  
  // Generate audio-like data based on beat phase
  const audioData = useMemo(() => {
    const arr = new Array(128).fill(0);
    // Bass hits on the beat (phase 0-0.2)
    const bassIntensity = Math.max(0, 1 - beatPhase * 5) * 200;
    arr[0] = bassIntensity;
    arr[1] = bassIntensity * 0.8;
    arr[2] = bassIntensity * 0.6;
    arr[3] = bassIntensity * 0.4;
    // Mids fill in with some variation
    for (let i = 10; i < 50; i++) {
      arr[i] = 60 + Math.sin(beatPhase * Math.PI * 2 + i * 0.1) * 40;
    }
    // Highs sparkle
    for (let i = 60; i < 128; i++) {
      arr[i] = 30 + Math.random() * 50;
    }
    
    return {
      frequency: arr,
      amplitude: 0.5 + Math.sin(beatPhase * Math.PI * 2) * 0.4,
      beatStrength: beatPhase < 0.15 ? (1 - beatPhase / 0.15) : 0,
    };
  }, [beatPhase]);
  
  return audioData;
}

// Helper to get random background effect
function getRandomBackgroundEffect() {
  return BACKGROUND_EFFECTS[Math.floor(Math.random() * BACKGROUND_EFFECTS.length)];
}

export function CustomVisualizerGenerator({ 
  isOpen, 
  onClose, 
  onSuccess 
}: CustomVisualizerGeneratorProps) {
  const { saveRandomVisualizer, isSaving, userRole, quotaRemaining } = useCustomVisualizers();
  
  // Simulated audio for preview
  const previewAudio = useSimulatedAudio();
  
  // Current random params
  const [currentParams, setCurrentParams] = useState<RandomVisualizerParams>(() => 
    generateRandomParams(generateRandomSeed(), { backgroundEffect: getRandomBackgroundEffect() })
  );
  
  // Custom name for the visualizer
  const [customName, setCustomName] = useState<string>('');
  
  // User preferences
  const [shapeFilter, setShapeFilter] = useState<BaseShape>('orb');
  const [layoutMode, setLayoutMode] = useState<'standalone' | 'multiple'>('multiple');
  const [elementCount, setElementCount] = useState<number>(20);
  const [threadingEnabled, setThreadingEnabled] = useState(false);
  const [animationStyle, setAnimationStyle] = useState<AnimationStyle>('pulsing');
  
  // Track previous layout mode to detect switches
  const prevLayoutModeRef = useRef(layoutMode);

  // Generate new random visualizer
  const handleGenerate = useCallback(() => {
    setCustomName('');
    const newSeed = generateRandomSeed();
    const newParams = generateRandomParams(newSeed, {
      ...(layoutMode === 'multiple' ? { baseShape: shapeFilter } : {}),
      backgroundEffect: getRandomBackgroundEffect(), // Always random
      elementCount: layoutMode === 'standalone' ? 1 : elementCount,
      connectionLines: threadingEnabled,
      animationStyle,
    });
    setCurrentParams(newParams);
  }, [shapeFilter, elementCount, threadingEnabled, layoutMode, animationStyle]);

  // Surprise Me - fully random everything
  const handleSurpriseMe = useCallback(() => {
    setCustomName('');
    const newSeed = generateRandomSeed();
    
    // Randomize all UI controls
    const randomLayout = Math.random() > 0.5 ? 'standalone' : 'multiple';
    const randomElementCount = randomLayout === 'standalone' ? 1 : Math.floor(8 + Math.random() * 72);
    const randomShape = BASE_SHAPES[Math.floor(Math.random() * BASE_SHAPES.length)];
    const randomAnim = ANIMATION_STYLES[Math.floor(Math.random() * ANIMATION_STYLES.length)];
    const randomThreading = Math.random() > 0.6;
    
    // Update UI state
    setLayoutMode(randomLayout);
    setElementCount(randomElementCount);
    setShapeFilter(randomShape);
    setAnimationStyle(randomAnim);
    setThreadingEnabled(randomThreading);
    
    // Generate params with random background
    const newParams = generateRandomParams(newSeed, {
      ...(randomLayout === 'multiple' ? { baseShape: randomShape } : {}),
      backgroundEffect: getRandomBackgroundEffect(),
      elementCount: randomElementCount,
      connectionLines: randomThreading,
      animationStyle: randomAnim,
    });
    setCurrentParams(newParams);
  }, []);

  // Update preview in real-time when filters change
  useEffect(() => {
    const layoutChanged = prevLayoutModeRef.current !== layoutMode;
    prevLayoutModeRef.current = layoutMode;
    
    // When switching layout modes, generate fresh seed to properly reset
    if (layoutChanged) {
      const newSeed = generateRandomSeed();
      const newParams = generateRandomParams(newSeed, {
        ...(layoutMode === 'multiple' ? { baseShape: shapeFilter } : {}),
        backgroundEffect: getRandomBackgroundEffect(),
        elementCount: layoutMode === 'standalone' ? 1 : elementCount,
        connectionLines: threadingEnabled,
        animationStyle,
      });
      setCurrentParams(newParams);
    } else {
      // Normal update - keep same seed and background
      setCurrentParams(prev => {
        const updated = generateRandomParams(prev.seed, {
          ...(layoutMode === 'multiple' ? { baseShape: shapeFilter } : {}),
          backgroundEffect: prev.backgroundEffect, // Keep current background
          elementCount: layoutMode === 'standalone' ? 1 : elementCount,
          connectionLines: threadingEnabled,
          animationStyle,
        });
        return updated;
      });
    }
  }, [shapeFilter, elementCount, threadingEnabled, layoutMode, animationStyle]);

  // Save current visualizer
  const handleSave = async () => {
    const result = await saveRandomVisualizer(currentParams, customName.trim() || undefined);
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
          {/* Preview Area with animated 128 BPM */}
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden border border-white/10">
            <Canvas camera={{ position: [0, 0, 8], fov: 60 }}>
              <React.Suspense fallback={null}>
                <RandomVisualizerTemplate 
                  params={currentParams} 
                  audioData={previewAudio}
                />
              </React.Suspense>
              <OrbitControls enablePan={false} enableZoom={true} minDistance={4} maxDistance={15} />
            </Canvas>
            
            {/* Current visualizer name overlay */}
            <div className="absolute bottom-3 left-3 flex items-center gap-2">
              <span className="text-2xl">{currentEmoji}</span>
              <span className="text-white font-medium text-sm bg-black/60 px-2 py-1 rounded">
                {customName || currentName}
              </span>
            </div>
            
            {/* Animation style badge */}
            <div className="absolute top-3 right-3">
              <Badge variant="secondary" className="bg-black/60 text-white/80 text-xs">
                {ANIMATION_LABELS[currentParams.animationStyle]} • 128 BPM
              </Badge>
            </div>
          </div>

          {/* Custom Name Input */}
          <div className="space-y-1">
            <label className="text-xs text-white/70">Visualizer Name</label>
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder={currentName}
              className="w-full bg-white/10 border border-white/20 rounded px-3 py-2 text-white text-sm placeholder:text-white/40 focus:outline-none focus:border-purple-500"
              maxLength={50}
            />
          </div>

          {/* Controls */}
          <div className="space-y-3">
            {/* Layout Mode Toggle */}
            <div className="space-y-1">
              <label className="text-xs text-white/70">Layout</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setLayoutMode('standalone')}
                  className={`flex-1 px-3 py-1.5 text-xs rounded border transition-colors flex items-center justify-center gap-1 ${
                    layoutMode === 'standalone' 
                      ? 'bg-purple-600 border-purple-500 text-white' 
                      : 'bg-white/10 border-white/20 text-white/70 hover:bg-white/15'
                  }`}
                >
                  <Minimize2 className="w-3 h-3" />
                  Standalone
                </button>
                <button
                  onClick={() => setLayoutMode('multiple')}
                  className={`flex-1 px-3 py-1.5 text-xs rounded border transition-colors flex items-center justify-center gap-1 ${
                    layoutMode === 'multiple' 
                      ? 'bg-purple-600 border-purple-500 text-white' 
                      : 'bg-white/10 border-white/20 text-white/70 hover:bg-white/15'
                  }`}
                >
                  <Maximize2 className="w-3 h-3" />
                  Multiple
                </button>
              </div>
            </div>

            {/* Shape selector - only for multiple mode */}
            {layoutMode === 'multiple' && (
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
            )}

            {/* Element Count Slider - only for multiple mode */}
            {layoutMode === 'multiple' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-white/70">Elements</label>
                  <span className="text-xs text-white/90 font-medium">{elementCount}</span>
                </div>
                <Slider
                  value={[elementCount]}
                  onValueChange={(value) => setElementCount(value[0])}
                  min={2}
                  max={100}
                  step={1}
                  className="w-full"
                />
              </div>
            )}

            {/* Animation Style */}
            <div className="space-y-1">
              <label className="text-xs text-white/70">Animation Style</label>
              <select 
                value={animationStyle}
                onChange={(e) => setAnimationStyle(e.target.value as AnimationStyle)}
                className="w-full bg-white/10 border border-white/20 rounded px-2 py-1.5 text-white text-sm"
              >
                {ANIMATION_STYLES.map(style => (
                  <option key={style} value={style}>
                    {ANIMATION_LABELS[style]}
                  </option>
                ))}
              </select>
            </div>

            {/* Connection Lines toggle */}
            <div className="flex items-center">
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
              onClick={handleSurpriseMe}
              disabled={isSaving}
              className="bg-purple-600/20 border border-purple-500/50 text-purple-300 hover:bg-purple-600/40"
            >
              <Shuffle className="w-4 h-4 mr-2" />
              Surprise Me!
            </Button>
            
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
