import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sliders, Upload } from 'lucide-react';
import { TabButton } from './TabButton';
import { AudioResponseControls } from '../AudioResponseControls';
import { UploadSection } from './UploadSection';

type RightPanelType = 'controls' | 'upload' | null;

interface RightPanelProps {
  activePanel: RightPanelType;
  setActivePanel: (panel: RightPanelType) => void;
}

export function RightPanel({ activePanel, setActivePanel }: RightPanelProps) {
  return (
    <>
      {/* Tab Buttons */}
      <div className="fixed right-4 top-24 z-[100] flex flex-col gap-2 pointer-events-auto">
        <TabButton
          icon={<Sliders />}
          label="Controls"
          isActive={activePanel === 'controls'}
          onClick={() => setActivePanel(activePanel === 'controls' ? null : 'controls')}
          side="right"
        />
        <TabButton
          icon={<Upload />}
          label="Upload"
          isActive={activePanel === 'upload'}
          onClick={() => setActivePanel(activePanel === 'upload' ? null : 'upload')}
          side="right"
        />
      </div>

      {/* Panel Content */}
      <AnimatePresence>
        {activePanel && (
          <motion.div
            initial={{ x: 400 }}
            animate={{ x: 0 }}
            exit={{ x: 400 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-16 top-24 bottom-24 w-80 z-40 pointer-events-auto"
          >
            <div className="h-full bg-black/60 backdrop-blur-2xl rounded-l-2xl border border-white/10 border-r-0 p-4 overflow-y-auto">
              
              {/* Audio Response Controls */}
              {activePanel === 'controls' && (
                <AudioResponseControls />
              )}

              {/* Upload Section */}
              {activePanel === 'upload' && (
                <UploadSection />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}