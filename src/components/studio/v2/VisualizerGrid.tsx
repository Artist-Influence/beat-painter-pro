import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useStudioStore } from '@/stores/studioStore';
import { visualizerRegistry, type VisualizerKey } from '@/components/visualizers';
import { useCustomVisualizers } from '@/hooks/useCustomVisualizers';
import { CustomVisualizerGenerator } from './CustomVisualizerGenerator';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wand2, Trash2, Crown, Star, RefreshCcw } from 'lucide-react';

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

  const visualizers = [
    { id: 'DiamondOrbVisualizer', name: 'Diamond Orb', preview: '💎', description: 'Crystalline energy patterns' },
    { id: 'AlienMembraneVisualizer', name: 'Alien Membrane', preview: '👽', description: 'Organic flowing surfaces' },
    { id: 'NeuralLatticeVisualizer', name: 'Neural Lattice', preview: '🧠', description: 'Interconnected neural networks' },
    { id: 'AngelWingsVisualizer', name: 'Angel Wings', preview: '🪶', description: 'Ethereal wing formations' },
    { id: 'CubicCloudsVisualizer', name: 'Cubic Clouds', preview: '☁️', description: 'Geometric cloud patterns' },
    { id: 'DancingGnomeCapsVisualizer', name: 'Dancing Gnome Caps', preview: '🍄', description: 'Rhythmic mushroom dance' },
    { id: 'PsychedelicMandalaVisualizer', name: 'Psychedelic Mandala', preview: '🌀', description: 'Kaleidoscopic patterns' },
    { id: 'HypercubePortalVisualizer', name: 'Hypercube Portal', preview: '🔮', description: 'Dimensional gateway' },
    { id: 'SacredGeometryPulseVisualizer', name: 'Sacred Geometry', preview: '⚡', description: 'Ancient geometric forms' },
    { id: 'NeonSkylineVisualizer', name: 'Neon Skyline', preview: '🏙️', description: 'Cyberpunk cityscape' },
    { id: 'DanasEyeVisualizer', name: "Dana's Eye", preview: '👁️', description: 'Radial light burst' },
    { id: 'FluidBloomVisualizer', name: 'Fluid Bloom', preview: '🌊', description: 'Organic flowing shapes' },
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
        {/* Custom Visualizers Section */}
        {(customVisualizers.length > 0 || !isLoading) && (
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-white/80 text-sm font-medium">My Custom Visualizers</h3>
                  {userRole === 'admin' && (
                    <Badge variant="secondary" className="bg-yellow-600/30 text-yellow-200 text-xs">
                      <Crown className="w-3 h-3 mr-1" />
                      Admin
                    </Badge>
                  )}
                  {customVisualizers.length > 0 && (
                    <Badge variant="secondary" className="bg-purple-600/30 text-purple-200 text-xs">
                      {customVisualizers.length}
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
            
            {customVisualizers.length === 0 && !isLoading ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8 text-white/50 border border-dashed border-white/20 rounded-lg"
              >
                <Wand2 className="w-8 h-8 mx-auto mb-2 text-purple-400" />
                <p className="text-sm mb-1">No custom visualizers yet</p>
                <p className="text-xs">Generate your first AI visualizer to get started</p>
              </motion.div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {customVisualizers.map((customViz, index) => (
                  <motion.div
                    key={customViz.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="group relative"
                  >
                    <motion.button
                      onClick={() => setSelected(`custom_${customViz.id}` as VisualizerKey)}
                      className={`w-full aspect-square rounded-xl border transition-all overflow-hidden ${
                        selected === `custom_${customViz.id}`
                          ? 'bg-purple-600/20 border-purple-500/50 shadow-lg shadow-purple-600/20'
                          : 'bg-white/5 border-white/10 hover:border-purple-500/30 hover:bg-white/10'
                      }`}
                    >
                      {/* Default content */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-2 group-hover:opacity-0 transition-opacity duration-200">
                        <div className="text-lg mb-1">{customViz.preview_emoji}</div>
                        <div className="text-[10px] text-white/60 text-center leading-tight">
                          {customViz.name.replace(/([A-Z])/g, ' $1').trim()}
                        </div>
                      </div>
                      
                      {/* Hover content */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <div className="text-2xl transform group-hover:scale-125 transition-transform duration-200">
                          {customViz.preview_emoji}
                        </div>
                      </div>
                      
                      {/* Active indicator */}
                      {selected === `custom_${customViz.id}` && (
                        <div className="absolute top-2 right-2 w-2 h-2 bg-purple-400 rounded-full"></div>
                      )}
                    </motion.button>
                    
                    {/* Action buttons */}
                    <div className="absolute -top-1 -right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {userRole === 'admin' && !customViz.is_public && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            promoteToStandard(customViz.id);
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
                          deleteVisualizer(customViz.id);
                        }}
                        className="w-5 h-5 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center text-white"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Standard Visualizers Section */}
        <div className="space-y-4">
          <h3 className="text-white/80 text-sm font-medium mb-3">Standard Visualizers</h3>
        
        <div className="grid grid-cols-3 gap-2">
        {visualizers.map((viz, index) => (
          <motion.button
            key={viz.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => setSelected(viz.id as VisualizerKey)}
            className={`group relative aspect-square rounded-xl border transition-all overflow-hidden ${
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
          </motion.button>
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