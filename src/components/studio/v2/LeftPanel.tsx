import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TabButton } from './TabButton';
import { VizOrbIcon, StyleBlobIcon } from './TabIcons';
import { SheetHeader } from './SheetHeader';
import { VisualizerGrid } from './VisualizerGrid';
import { StyleSelector } from '@/components/styles/StyleSelector';
import { useIsMobile } from '@/hooks/use-mobile';

type LeftPanelType = 'visualizers' | 'styles' | null;

interface LeftPanelProps {
  activePanel: LeftPanelType;
  setActivePanel: (panel: LeftPanelType) => void;
}

export function LeftPanel({ activePanel, setActivePanel }: LeftPanelProps) {
  const isMobile = useIsMobile();
  const title = activePanel === 'visualizers' ? 'Visualizers' : 'Styles';
  return (
    <>
      {/* Tab Buttons - Always Visible (left edge) */}
      <div className="absolute left-2 sm:left-6 top-24 z-40 flex flex-col gap-2">
        <TabButton
          icon={<VizOrbIcon />}
          label="Visualizers"
          isActive={activePanel === 'visualizers'}
          onClick={() => setActivePanel(activePanel === 'visualizers' ? null : 'visualizers')}
        />
        <TabButton
          icon={<StyleBlobIcon />}
          label="Styles"
          isActive={activePanel === 'styles'}
          onClick={() => setActivePanel(activePanel === 'styles' ? null : 'styles')}
        />
      </div>

      {/* Panel Content — side dock on desktop, bottom sheet on mobile */}
      <AnimatePresence>
        {activePanel && (
          <motion.div
            initial={isMobile ? { y: '100%' } : { x: -400 }}
            animate={isMobile ? { y: 0 } : { x: 0 }}
            exit={isMobile ? { y: '100%' } : { x: -400 }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
            className={isMobile ? 'fixed inset-x-0 bottom-0 z-[70]' : 'absolute left-0 top-24 bottom-24 z-30'}
          >
            <div className={isMobile
              ? 'glass-panel rounded-t-2xl !rounded-b-none w-full flex flex-col max-h-[82vh]'
              : 'ml-20 w-80 h-full glass-panel !rounded-l-none flex flex-col'}>
              {isMobile && <SheetHeader title={title} onClose={() => setActivePanel(null)} />}
              <div className="flex-1 overflow-y-auto p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
                {activePanel === 'visualizers' && <VisualizerGrid />}
                {activePanel === 'styles' && (
                  <div className="h-full flex flex-col">
                    <p className="text-eyebrow mb-1">scene</p>
                    <h3 className="text-text-primary text-sm font-semibold mb-3">Visual Styles</h3>
                    <div className="flex-1 overflow-y-auto pr-2">
                      <StyleSelector />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}