import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useStudioStore } from '@/stores/studioStore';
import { visualizerRegistry, type VisualizerKey } from '@/components/visualizers';
import { useCustomVisualizers } from '@/hooks/useCustomVisualizers';
import { CustomVisualizerGenerator } from './CustomVisualizerGenerator';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wand2, Trash2, Crown, Star, RefreshCcw, Bookmark } from 'lucide-react';

export function VisualizerGrid() {
  const { selected, setSelected } = useStudioStore();
  const { 
    customVisualizers, 
    isLoading, 
    deleteVisualizer,
    promoteToStandard,
    userRole,
    quotaRemaining,
    refetch,
  } = useCustomVisualizers();
  const [showGenerator, setShowGenerator] = useState(false);

  const standardVisualizers = [
    { id: 'DiamondOrbVisualizer', name: 'Diamond Orb', preview: '💎', description: 'Crystalline energy patterns' },
    { id: 'DiamondOrbReactorVisualizer', name: 'Diamond Orb Reactor', preview: '⚛️', description: 'Breathing reactor core with beams' },
    { id: 'AlienMembraneVisualizer', name: 'Alien Membrane', preview: '👽', description: 'Organic flowing surfaces' },
    { id: 'NeuralLatticeVisualizer', name: 'Neural Lattice', preview: '🧠', description: 'Interconnected neural networks' },
    { id: 'AngelWingsVisualizer', name: 'Angel Wings', preview: '🪶', description: 'Ethereal wing formations' },
    { id: 'CubicCloudsVisualizer', name: 'Cubic Clouds', preview: '☁️', description: 'Geometric cloud patterns' },
    { id: 'DancingGnomeCapsVisualizer', name: 'Dancing Gnome Caps', preview: '🍄', description: 'Rhythmic mushroom dance' },
    { id: 'PsychedelicMandalaVisualizer', name: 'Psychedelic Mandala', preview: '🌀', description: 'Kaleidoscopic patterns' },
    { id: 'HypercubePortalVisualizer', name: 'Hypercube Portal', preview: '🔮', description: 'Dimensional gateway' },
    { id: 'SacredGeometryPulseVisualizer', name: 'Sacred Geometry', preview: '⚡', description: 'Ancient geometric forms' },
    { id: 'NeonSkylineVisualizer', name: 'Neon Skyline', preview: '🏙️', description: 'Cyberpunk cityscape' },
    { id: 'ElectricFieldVisualizer', name: 'Electric Field', preview: '🧲', description: 'Electric field patterns' },
  ];

  // Combine standard visualizers with user's saved custom visualizers
  const allVisualizers = [
    ...standardVisualizers.map(viz => ({ ...viz, isCustom: false, customId: null })),
    ...customVisualizers.map(cv => ({
      id: `custom_${cv.id}`,
      name: cv.name.replace(/([A-Z])/g, ' $1').trim(),
      preview: cv.preview_emoji,
      description: cv.description || 'Custom visualizer',
      isCustom: true,
      customId: cv.id,
    })),
  ];

  const handleCustomVisualizerSuccess = (newVisualizer: any) => {
    console.log('✅ VisualizerGrid - Custom visualizer generated:', newVisualizer);
    
    // Immediately select the new visualizer to show it
    const visualizerKey = `custom_${newVisualizer.id}` as VisualizerKey;
    console.log('🎯 VisualizerGrid - Selecting new visualizer:', visualizerKey);
    setSelected(visualizerKey);
    
    // Close the generator
    setShowGenerator(false);
  };

  return (
    <>
      <div className="space-y-6">
        {/* Generate New Visualizer Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-white/80 text-sm font-medium">Create New</h3>
              {userRole === 'admin' && (
                <Badge variant="secondary" className="bg-yellow-600/30 text-yellow-200 text-xs">
                  <Crown className="w-3 h-3 mr-1" />
                  Admin
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {userRole !== 'admin' && (
                <span className="text-xs text-white/50 whitespace-nowrap">
                  {quotaRemaining}/5 left
                </span>
              )}
              <Button
                size="sm"
                variant="secondary"
                onClick={refetch}
                className="h-7 px-2 text-xs bg-white/10 hover:bg-white/20 text-white border-0"
              >
                <RefreshCcw className="w-3 h-3" />
              </Button>
            </div>
          </div>
          
          <div className="flex justify-center">
            <Button
              size="sm"
              onClick={() => setShowGenerator(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white h-8 px-4 text-xs"
            >
              <Wand2 className="w-3 h-3 mr-1" />
              Generate New Visualizer
            </Button>
          </div>
        </div>

        {/* All Visualizers Section (Standard + User's Saved) */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h3 className="text-white/80 text-sm font-medium">Visualizers</h3>
            {customVisualizers.length > 0 && (
              <Badge variant="secondary" className="bg-purple-600/30 text-purple-200 text-xs">
                {customVisualizers.length} saved
              </Badge>
            )}
          </div>
        
          <div className="grid grid-cols-3 gap-2">
            {allVisualizers.map((viz, index) => (
              <motion.div
                key={viz.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="group relative"
              >
                <motion.button
                  onClick={() => setSelected(viz.id as VisualizerKey)}
                  className={`w-full aspect-square rounded-xl border transition-all overflow-hidden ${
                    selected === viz.id
                      ? 'bg-purple-600/20 border-purple-500/50 shadow-lg shadow-purple-600/20'
                      : 'bg-white/5 border-white/10 hover:border-purple-500/30 hover:bg-white/10'
                  }`}
                >
                  {/* Default content */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-2 group-hover:opacity-0 transition-opacity duration-200">
                    <div className="text-lg mb-1">{viz.preview}</div>
                    <div className="text-[10px] text-white/60 text-center leading-tight">
                      {viz.name}
                    </div>
                  </div>
                  
                  {/* Hover content - larger emoji only */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <div className="text-2xl transform group-hover:scale-125 transition-transform duration-200">{viz.preview}</div>
                  </div>
                  
                  {/* Active indicator */}
                  {selected === viz.id && (
                    <div className="absolute top-2 right-2 w-2 h-2 bg-purple-400 rounded-full"></div>
                  )}
                  
                  {/* Saved/Custom indicator */}
                  {viz.isCustom && (
                    <div className="absolute top-1.5 left-1.5">
                      <Bookmark className="w-3 h-3 text-purple-400 fill-purple-400" />
                    </div>
                  )}
                </motion.button>
                
                {/* Action buttons for custom visualizers only */}
                {viz.isCustom && viz.customId && (
                  <div className="absolute -top-1 -right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {userRole === 'admin' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          promoteToStandard(viz.customId!);
                        }}
                        className="w-5 h-5 bg-yellow-600 hover:bg-yellow-700 rounded-full flex items-center justify-center text-white"
                        title="Promote to standard visualizer"
                      >
                        <Star className="w-3 h-3" />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteVisualizer(viz.customId!);
                      }}
                      className="w-5 h-5 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center text-white"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <CustomVisualizerGenerator
        isOpen={showGenerator}
        onClose={() => setShowGenerator(false)}
        onSuccess={handleCustomVisualizerSuccess}
      />
    </>
  );
}
