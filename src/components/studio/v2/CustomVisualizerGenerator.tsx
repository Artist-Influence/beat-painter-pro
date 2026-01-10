import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Save, RefreshCw, Sparkles } from 'lucide-react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { 
  generateRandomSeed, 
  generateRandomParams, 
  type RandomVisualizerParams
} from '@/lib/randomVisualizerGenerator';
import { 
  generateAbstractFormParams,
  abstractFormToName,
  abstractFormToEmoji,
} from '@/lib/abstractFormGenerator';
import { RandomVisualizerTemplate } from '@/components/visualizers/RandomVisualizerTemplate';
import { useCustomVisualizers } from '@/hooks/useCustomVisualizers';

interface CustomVisualizerGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (visualizer: any) => void;
}

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
  
  // Generate audio-like data based on beat phase - 256 elements to match analyzeAudio expectations
  const audioData = useMemo(() => {
    const arr = new Array(256).fill(0);
    
    // Bass hits on the beat (phase 0-0.2) - indices 0-15
    const bassIntensity = Math.max(0, 1 - beatPhase * 5) * 220;
    for (let i = 0; i < 15; i++) {
      arr[i] = bassIntensity * (1 - i * 0.05);
    }
    
    // Mids fill in with variation - indices 15-100
    const snareHit = beatPhase > 0.45 && beatPhase < 0.55 ? 180 : 0;
    for (let i = 15; i < 100; i++) {
      const wave = Math.sin(beatPhase * Math.PI * 2 + i * 0.1) * 60;
      arr[i] = 80 + wave + (i < 35 ? snareHit * (1 - (i - 15) / 20) : 0);
    }
    
    // Highs sparkle - indices 100-256
    const hihatIntensity = (beatPhase < 0.1 || (beatPhase > 0.25 && beatPhase < 0.35) || 
                           (beatPhase > 0.5 && beatPhase < 0.6) || (beatPhase > 0.75 && beatPhase < 0.85)) ? 120 : 40;
    for (let i = 100; i < 256; i++) {
      arr[i] = hihatIntensity + Math.random() * 60;
    }
    
    return {
      frequency: arr,
      amplitude: 0.5 + Math.sin(beatPhase * Math.PI * 2) * 0.4,
      beatStrength: beatPhase < 0.15 ? (1 - beatPhase / 0.15) : 0,
    };
  }, [beatPhase]);
  
  return audioData;
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
  const [currentParams, setCurrentParams] = useState<RandomVisualizerParams>(() => {
    const seed = generateRandomSeed();
    const abstractForm = generateAbstractFormParams(seed);
    return generateRandomParams(seed, { 
      backgroundEffect: 'none',
      elementCount: 1,
      abstractForm,
    });
  });
  
  // Custom name for the visualizer
  const [customName, setCustomName] = useState<string>('');
  
  // Simplified controls - just complexity
  const [complexity, setComplexity] = useState<number>(5);

  // Generate new random visualizer
  const handleGenerate = useCallback(() => {
    setCustomName('');
    const newSeed = generateRandomSeed();
    
    // Generate abstract form with complexity preference
    const abstractForm = generateAbstractFormParams(newSeed, {
      chaosLevel: complexity / 10,
      nodeCount: Math.floor(30 + complexity * 15),
    });
    
    const newParams = generateRandomParams(newSeed, {
      backgroundEffect: 'none',
      elementCount: 1,
      abstractForm,
    });
    setCurrentParams(newParams);
  }, [complexity]);

  // Surprise Me - fully random everything including complexity
  const handleSurpriseMe = useCallback(() => {
    setCustomName('');
    const newSeed = generateRandomSeed();
    
    // Randomize complexity
    const randomComplexity = Math.floor(1 + Math.random() * 10);
    setComplexity(randomComplexity);
    
    // Generate completely random abstract form
    const abstractForm = generateAbstractFormParams(newSeed);
    
    const newParams = generateRandomParams(newSeed, {
      backgroundEffect: 'none',
      elementCount: 1,
      abstractForm,
    });
    setCurrentParams(newParams);
  }, []);

  // Update preview when complexity changes
  useEffect(() => {
    setCurrentParams(prev => {
      const abstractForm = generateAbstractFormParams(prev.seed, {
        chaosLevel: complexity / 10,
        nodeCount: Math.floor(30 + complexity * 15),
      });
      
      return generateRandomParams(prev.seed, {
        backgroundEffect: 'none',
        elementCount: 1,
        abstractForm,
      });
    });
  }, [complexity]);

  // Save current visualizer
  const handleSave = async () => {
    const result = await saveRandomVisualizer(currentParams, customName.trim() || undefined);
    if (result) {
      onSuccess?.(result);
      onClose();
    }
  };

  // Get name and emoji from abstract form
  const currentName = currentParams.abstractForm 
    ? abstractFormToName(currentParams.abstractForm)
    : `Visualizer #${currentParams.seed % 10000}`;
  const currentEmoji = currentParams.abstractForm
    ? abstractFormToEmoji(currentParams.abstractForm)
    : '✨';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-black/95 border border-white/20">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              Generate Visualizer
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
            
            {/* Form family badge */}
            <div className="absolute top-3 right-3">
              <Badge variant="secondary" className="bg-black/60 text-white/80 text-xs">
                {currentParams.abstractForm?.formFamily || 'Abstract'} • 128 BPM
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

          {/* Simplified Controls - Just Complexity */}
          <div className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-white/70">Complexity</label>
                <span className="text-xs text-white/90 font-medium">{complexity}/10</span>
              </div>
              <Slider
                value={[complexity]}
                onValueChange={(value) => setComplexity(value[0])}
                min={1}
                max={10}
                step={1}
                className="w-full"
              />
              <p className="text-xs text-white/50">
                Higher complexity = more nodes, connections, and chaos
              </p>
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
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700"
            >
              <Sparkles className="w-4 h-4 mr-2" />
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
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save This One'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
