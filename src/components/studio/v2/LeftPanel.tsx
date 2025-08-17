import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Grid3X3, Palette } from 'lucide-react';
import { TabButton } from './TabButton';
import { VisualizerGrid } from './VisualizerGrid';
import { StyleSelector } from '@/components/styles/StyleSelector';

type LeftPanelType = 'visualizers' | 'styles' | null;

interface LeftPanelProps {
  activePanel: LeftPanelType;
  setActivePanel: (panel: LeftPanelType) => void;
}

export function LeftPanel({ activePanel, setActivePanel }: LeftPanelProps) {
  return (
    <>
      {/* Tab Buttons - Always Visible */}
      <div className="absolute left-6 top-24 z-40 flex flex-col gap-2">
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
      </div>

      {/* Panel Content */}
      <AnimatePresence>
        {activePanel && (
          <motion.div
            initial={{ x: -400 }}
            animate={{ x: 0 }}
            exit={{ x: -400 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="absolute left-0 top-24 bottom-24 z-30"
          >
            <div className="ml-20 w-80 h-full bg-black/60 backdrop-blur-2xl rounded-r-2xl border border-white/10 border-l-0 p-4 overflow-y-auto">
              
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}