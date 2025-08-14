import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Grid3X3, Palette, Sparkles } from 'lucide-react';
import { TabButton } from './TabButton';
import { VisualizerGrid } from './VisualizerGrid';
import { StyleSelector } from '@/components/styles/StyleSelector';

type LeftPanelType = 'visualizers' | 'styles' | 'custom' | null;

interface LeftPanelProps {
  activePanel: LeftPanelType;
  setActivePanel: (panel: LeftPanelType) => void;
}

export function LeftPanel({ activePanel, setActivePanel }: LeftPanelProps) {
  return (
    <>
      {/* Tab Buttons - Always Visible */}
      <div className="absolute left-4 top-24 z-30 flex flex-col gap-2">
        <TabButton
          icon={<Grid3X3 />}
          label="Visualizers"
          isActive={activePanel === 'visualizers'}
          onClick={() => setActivePanel(activePanel === 'visualizers' ? null : 'visualizers')}
        />
        <TabButton
          icon={<Palette />}
          label="Styles"
          isActive={activePanel === 'styles'}
          onClick={() => setActivePanel(activePanel === 'styles' ? null : 'styles')}
        />
        <TabButton
          icon={<Sparkles />}
          label="Custom"
          isActive={activePanel === 'custom'}
          onClick={() => setActivePanel(activePanel === 'custom' ? null : 'custom')}
        />
      </div>

      {/* Panel Content */}
      <AnimatePresence>
        {activePanel && (
          <motion.div
            initial={{ x: -400 }}
            animate={{ x: 0 }}
            exit={{ x: -400 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="absolute left-16 top-24 bottom-24 w-80 z-20"
          >
            <div className="h-full bg-black/60 backdrop-blur-2xl rounded-r-2xl border border-white/10 border-l-0 p-4 overflow-y-auto">
              
              {/* Visualizer Grid */}
              {activePanel === 'visualizers' && (
                <VisualizerGrid />
              )}

              {/* Style Selector */}
              {activePanel === 'styles' && (
                <div className="space-y-3">
                  <h3 className="text-white/80 text-sm font-medium mb-3">Visual Styles</h3>
                  <StyleSelector />
                </div>
              )}

              {/* Custom Visualizers */}
              {activePanel === 'custom' && (
                <div className="space-y-3">
                  <h3 className="text-white/80 text-sm font-medium mb-3">Custom Visualizers</h3>
                  <div className="text-center py-8">
                    <Sparkles className="w-8 h-8 text-white/40 mx-auto mb-2" />
                    <p className="text-white/60 text-sm">Coming Soon</p>
                    <p className="text-white/40 text-xs mt-1">Upload your own visualizer code</p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}