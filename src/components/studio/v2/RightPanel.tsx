import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TabButton } from './TabButton';
import { EqBarsIcon, CompositeIcon, UploadAudioIcon } from './TabIcons';
import { SheetHeader } from './SheetHeader';
import { AudioResponseControls } from '../AudioResponseControls';
import { UploadSection } from './UploadSection';
import { CompositeControls } from './CompositeControls';
import { DawControls } from './DawControls';
import { useIsMobile } from '@/hooks/use-mobile';
import { useStudioStore } from '@/stores/studioStore';
import { usePresetStore } from '@/stores/presetStore';

type RightPanelType = 'controls' | 'upload' | 'composite' | null;

interface RightPanelProps {
  activePanel: RightPanelType;
  setActivePanel: (panel: RightPanelType) => void;
}

const TITLES: Record<string, string> = { controls: 'Mix & reactivity', composite: 'Composite', upload: 'Upload' };

export function RightPanel({ activePanel, setActivePanel }: RightPanelProps) {
  const isMobile = useIsMobile();
  const selected = useStudioStore((s) => s.selected);
  const preview = usePresetStore((s) => s.preview);
  const isDaw =
    (typeof selected === 'string' && selected.startsWith('Daw')) ||
    (selected === '__preview__' && preview?.kind === 'daw') ||
    (typeof selected === 'string' && selected.startsWith('preset_') && usePresetStore.getState().resolve(selected)?.kind === 'daw');
  return (
    <>
      {/* Tab Buttons (right edge) */}
      <div className="fixed right-2 sm:right-4 top-24 z-[100] flex flex-col gap-2 pointer-events-auto">
        <TabButton
          icon={<EqBarsIcon />}
          label="Mix"
          isActive={activePanel === 'controls'}
          onClick={() => setActivePanel(activePanel === 'controls' ? null : 'controls')}
          side="right"
        />
        <TabButton
          icon={<CompositeIcon />}
          label="Composite"
          isActive={activePanel === 'composite'}
          onClick={() => setActivePanel(activePanel === 'composite' ? null : 'composite')}
          side="right"
        />
        <TabButton
          icon={<UploadAudioIcon />}
          label="Upload"
          isActive={activePanel === 'upload'}
          onClick={() => setActivePanel(activePanel === 'upload' ? null : 'upload')}
          side="right"
        />
      </div>

      {/* Panel Content - side dock on desktop, bottom sheet on mobile */}
      <AnimatePresence>
        {activePanel && (
          <motion.div
            initial={isMobile ? { y: '100%' } : { x: 400 }}
            animate={isMobile ? { y: 0 } : { x: 0 }}
            exit={isMobile ? { y: '100%' } : { x: 400 }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
            className={isMobile ? 'fixed inset-x-0 bottom-0 z-[70] pointer-events-auto' : 'fixed right-16 top-24 bottom-24 w-80 z-40 pointer-events-auto'}
          >
            <div className={isMobile
              ? 'glass-panel rounded-t-2xl !rounded-b-none w-full flex flex-col max-h-[82vh]'
              : 'h-full glass-panel !rounded-r-none flex flex-col'}>
              {isMobile && <SheetHeader title={TITLES[activePanel] ?? ''} onClose={() => setActivePanel(null)} />}
              <div className="flex-1 overflow-y-auto p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
                {activePanel === 'controls' && (isDaw ? <DawControls /> : <AudioResponseControls />)}
                {activePanel === 'composite' && <CompositeControls />}
                {activePanel === 'upload' && <UploadSection />}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
