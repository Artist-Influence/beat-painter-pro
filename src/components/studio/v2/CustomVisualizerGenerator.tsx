import React, { useState, useCallback, useEffect, Suspense } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Save, RefreshCw, Sparkles, Link2, Shuffle, Zap, Cloud, Minimize2, Maximize2, Star } from 'lucide-react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { 
  generateRandomSeed, 
  generateRandomParams, 
  paramsToName,
  paramsToEmoji,
  BASE_SHAPES,
  BACKGROUND_EFFECTS,
  COLOR_SCHEMES,
  ANIMATION_STYLES,
  type BaseShape,
  type BackgroundEffect,
  type ColorScheme,
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

// STATIC preview - no audio for a still visualizer
const PREVIEW_AUDIO = {
  frequency: Array(128).fill(0),
  amplitude: 0,
  beatStrength: 0,
};

// Background effect labels
const EFFECT_LABELS: Record<BackgroundEffect, string> = {
  none: 'None',
  stars: 'Stars',
  movingLines: 'Moving Lines',
  energyField: 'Energy Field',
  particles: 'Particles',
  lightRays: 'Light Rays',
  aurora: 'Aurora',
};

// Color scheme labels and emojis
const COLOR_LABELS: Record<ColorScheme, { label: string; emoji: string }> = {
  mono: { label: 'Mono', emoji: '⚪' },
  neon: { label: 'Neon', emoji: '💜' },
  pastel: { label: 'Pastel', emoji: '🌸' },
  fire: { label: 'Fire', emoji: '🔥' },
  ice: { label: 'Ice', emoji: '❄️' },
  rainbow: { label: 'Rainbow', emoji: '🌈' },
  sunset: { label: 'Sunset', emoji: '🌅' },
  ocean: { label: 'Ocean', emoji: '🌊' },
};

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

// Mood presets with their parameter combinations
type MoodPreset = {
  name: string;
  emoji: string;
  settings: Partial<{
    layoutMode: 'standalone' | 'multiple';
    elementCount: number;
    backgroundEffect: BackgroundEffect;
    colorScheme: ColorScheme;
    animationStyle: AnimationStyle;
    glowIntensity: number;
    connectionLines: boolean;
  }>;
};

const MOOD_PRESETS: MoodPreset[] = [
  {
    name: 'Calm',
    emoji: '🧘',
    settings: {
      layoutMode: 'standalone',
      backgroundEffect: 'stars',
      colorScheme: 'pastel',
      animationStyle: 'smooth',
      glowIntensity: 0.5,
      connectionLines: false,
    }
  },
  {
    name: 'Energetic',
    emoji: '⚡',
    settings: {
      layoutMode: 'multiple',
      elementCount: 50,
      backgroundEffect: 'energyField',
      colorScheme: 'neon',
      animationStyle: 'explosive',
      glowIntensity: 1.8,
      connectionLines: true,
    }
  },
  {
    name: 'Minimal',
    emoji: '◽',
    settings: {
      layoutMode: 'standalone',
      backgroundEffect: 'none',
      colorScheme: 'mono',
      animationStyle: 'breathing',
      glowIntensity: 0.4,
      connectionLines: false,
    }
  },
  {
    name: 'Complex',
    emoji: '🔮',
    settings: {
      layoutMode: 'multiple',
      elementCount: 80,
      backgroundEffect: 'particles',
      colorScheme: 'rainbow',
      animationStyle: 'chaotic',
      glowIntensity: 1.2,
      connectionLines: true,
    }
  },
  {
    name: 'Trippy',
    emoji: '🌀',
    settings: {
      layoutMode: 'standalone',
      backgroundEffect: 'aurora',
      colorScheme: 'fire',
      animationStyle: 'chaotic',
      glowIntensity: 2.0,
      connectionLines: false,
    }
  },
];

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
  
  // Custom name for the visualizer
  const [customName, setCustomName] = useState<string>('');
  
  // User preferences - no random options, always explicit selection
  const [shapeFilter, setShapeFilter] = useState<BaseShape>('orb');
  const [layoutMode, setLayoutMode] = useState<'standalone' | 'multiple'>('multiple');
  const [elementCount, setElementCount] = useState<number>(20);
  const [backgroundEffectFilter, setBackgroundEffectFilter] = useState<BackgroundEffect>('none');
  const [threadingEnabled, setThreadingEnabled] = useState(false);
  const [colorScheme, setColorScheme] = useState<ColorScheme>('neon');
  const [animationStyle, setAnimationStyle] = useState<AnimationStyle>('pulsing');
  const [glowIntensity, setGlowIntensity] = useState(1.0);

  // Generate new random visualizer with more variation
  const handleGenerate = useCallback(() => {
    setCustomName(''); // Reset custom name when generating new
    const newSeed = generateRandomSeed();
    const newParams = generateRandomParams(newSeed, {
      // Only pass shape preference when in multiple mode
      ...(layoutMode === 'multiple' ? { baseShape: shapeFilter } : {}),
      backgroundEffect: backgroundEffectFilter,
      elementCount: layoutMode === 'standalone' ? 1 : elementCount,
      connectionLines: threadingEnabled,
      colorScheme,
      animationStyle,
      glowIntensity,
    });
    setCurrentParams(newParams);
  }, [shapeFilter, elementCount, backgroundEffectFilter, threadingEnabled, layoutMode, colorScheme, animationStyle, glowIntensity]);

  // Surprise Me - fully random everything
  const handleSurpriseMe = useCallback(() => {
    setCustomName('');
    const newSeed = generateRandomSeed();
    
    // Randomize all UI controls too
    const randomLayout = Math.random() > 0.5 ? 'standalone' : 'multiple';
    const randomElementCount = randomLayout === 'standalone' ? 1 : Math.floor(8 + Math.random() * 72);
    const randomShape = BASE_SHAPES[Math.floor(Math.random() * BASE_SHAPES.length)];
    const randomBg = BACKGROUND_EFFECTS[Math.floor(Math.random() * BACKGROUND_EFFECTS.length)];
    const randomColor = COLOR_SCHEMES[Math.floor(Math.random() * COLOR_SCHEMES.length)];
    const randomAnim = ANIMATION_STYLES[Math.floor(Math.random() * ANIMATION_STYLES.length)];
    const randomGlow = 0.3 + Math.random() * 1.7;
    const randomThreading = Math.random() > 0.6;
    
    // Update UI state
    setLayoutMode(randomLayout);
    setElementCount(randomElementCount);
    setShapeFilter(randomShape);
    setBackgroundEffectFilter(randomBg);
    setColorScheme(randomColor);
    setAnimationStyle(randomAnim);
    setGlowIntensity(randomGlow);
    setThreadingEnabled(randomThreading);
    
    // Generate params
    const newParams = generateRandomParams(newSeed, {
      ...(randomLayout === 'multiple' ? { baseShape: randomShape } : {}),
      backgroundEffect: randomBg,
      elementCount: randomElementCount,
      connectionLines: randomThreading,
      colorScheme: randomColor,
      animationStyle: randomAnim,
      glowIntensity: randomGlow,
    });
    setCurrentParams(newParams);
  }, []);

  // Apply mood preset
  const handleMoodPreset = useCallback((preset: MoodPreset) => {
    setCustomName('');
    const newSeed = generateRandomSeed();
    const s = preset.settings;
    
    // Update UI state from preset
    if (s.layoutMode) setLayoutMode(s.layoutMode);
    if (s.elementCount !== undefined) setElementCount(s.elementCount);
    if (s.backgroundEffect) setBackgroundEffectFilter(s.backgroundEffect);
    if (s.colorScheme) setColorScheme(s.colorScheme);
    if (s.animationStyle) setAnimationStyle(s.animationStyle);
    if (s.glowIntensity !== undefined) setGlowIntensity(s.glowIntensity);
    if (s.connectionLines !== undefined) setThreadingEnabled(s.connectionLines);
    
    // Generate params with preset values
    const newParams = generateRandomParams(newSeed, {
      backgroundEffect: s.backgroundEffect,
      elementCount: s.layoutMode === 'standalone' ? 1 : (s.elementCount ?? elementCount),
      connectionLines: s.connectionLines ?? false,
      colorScheme: s.colorScheme,
      animationStyle: s.animationStyle,
      glowIntensity: s.glowIntensity,
    });
    setCurrentParams(newParams);
  }, [elementCount]);

  // Update preview in real-time when filters change
  useEffect(() => {
    setCurrentParams(prev => {
      const updated = generateRandomParams(prev.seed, {
        // Only apply shape filter in multiple mode
        ...(layoutMode === 'multiple' ? { baseShape: shapeFilter } : {}),
        backgroundEffect: backgroundEffectFilter,
        elementCount: layoutMode === 'standalone' ? 1 : elementCount,
        connectionLines: threadingEnabled,
        colorScheme,
        animationStyle,
        glowIntensity,
      });
      return updated;
    });
  }, [shapeFilter, elementCount, backgroundEffectFilter, threadingEnabled, layoutMode, colorScheme, animationStyle, glowIntensity]);

  // When switching to standalone, generate a fresh random visualizer with random shape
  useEffect(() => {
    if (layoutMode === 'standalone') {
      const newSeed = generateRandomSeed();
      const newParams = generateRandomParams(newSeed, {
        backgroundEffect: backgroundEffectFilter,
        elementCount: 1,
        connectionLines: threadingEnabled,
        colorScheme,
        animationStyle,
        glowIntensity,
      });
      setCurrentParams(newParams);
    }
  }, [layoutMode]);

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
          {/* Mood Presets - Quick Start */}
          <div className="space-y-2">
            <label className="text-xs text-white/70">Quick Mood</label>
            <div className="flex gap-2 flex-wrap">
              {MOOD_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => handleMoodPreset(preset)}
                  className="px-3 py-1.5 text-xs rounded-full border border-white/20 bg-white/5 text-white/80 hover:bg-white/15 hover:border-white/40 transition-colors flex items-center gap-1.5"
                >
                  <span>{preset.emoji}</span>
                  <span>{preset.name}</span>
                </button>
              ))}
              <button
                onClick={handleSurpriseMe}
                className="px-3 py-1.5 text-xs rounded-full border border-purple-500/50 bg-purple-600/20 text-purple-300 hover:bg-purple-600/40 transition-colors flex items-center gap-1.5"
              >
                <Shuffle className="w-3 h-3" />
                <span>Surprise Me!</span>
              </button>
            </div>
          </div>

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
                {customName || currentName}
              </span>
            </div>
            
            {/* Animation style badge */}
            <div className="absolute top-3 right-3">
              <Badge variant="secondary" className="bg-black/60 text-white/80 text-xs">
                {ANIMATION_LABELS[currentParams.animationStyle]}
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

          {/* Controls Grid */}
          <div className="space-y-3">
            <p className="text-xs text-white/50">Customize your visualizer</p>
            
            {/* Row 1: Color Scheme */}
            <div className="space-y-1">
              <label className="text-xs text-white/70">Color Scheme</label>
              <div className="grid grid-cols-4 gap-2">
                {COLOR_SCHEMES.map((scheme) => (
                  <button
                    key={scheme}
                    onClick={() => setColorScheme(scheme)}
                    className={`px-2 py-1.5 text-xs rounded border transition-colors flex items-center justify-center gap-1 ${
                      colorScheme === scheme
                        ? 'bg-purple-600 border-purple-500 text-white'
                        : 'bg-white/10 border-white/20 text-white/70 hover:bg-white/15'
                    }`}
                  >
                    <span>{COLOR_LABELS[scheme].emoji}</span>
                    <span>{COLOR_LABELS[scheme].label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Row 2: Animation Style */}
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

            {/* Row 3: Glow Intensity */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-white/70 flex items-center gap-1">
                  <Star className="w-3 h-3" /> Glow Intensity
                </label>
                <span className="text-xs text-white/90 font-medium">{glowIntensity.toFixed(1)}</span>
              </div>
              <Slider
                value={[glowIntensity]}
                onValueChange={(value) => setGlowIntensity(value[0])}
                min={0.1}
                max={2.0}
                step={0.1}
                className="w-full"
              />
            </div>
            
            {/* Row 4: Shape (only for multiple mode) */}
            <div className="space-y-1">
              {layoutMode === 'multiple' ? (
                <>
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
                </>
              ) : (
                <>
                  <label className="text-xs text-white/70">Shape</label>
                  <div className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-white/50 text-sm italic">
                    Auto-generated
                  </div>
                </>
              )}
            </div>

            {/* Row 5: Layout Mode Toggle */}
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

            {/* Row 6: Element Count Slider (only for multiple mode) */}
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

            {/* Row 7: Background Effect & Connection Lines */}
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
