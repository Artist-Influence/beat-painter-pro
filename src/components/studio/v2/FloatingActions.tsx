import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Maximize2, Camera, RotateCcw, Keyboard } from 'lucide-react';
import { useStudioStore } from '@/stores/studioStore';

export function FloatingActions() {
  const [showQuickSettings, setShowQuickSettings] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const { setFilters, setZoom, setBackgroundColor } = useStudioStore();

  const takeScreenshot = () => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      const link = document.createElement('a');
      link.download = `visualizer-${Date.now()}.png`;
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  const resetView = () => {
    setFilters({ brightness: 100, saturation: 100, contrast: 100 });
    setZoom(1);
    setBackgroundColor("#000000");
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen?.();
  };

  const quickActions = [
    { icon: <Maximize2 />, label: 'Fullscreen', action: toggleFullscreen },
    { icon: <Camera />, label: 'Screenshot', action: takeScreenshot },
    { icon: <RotateCcw />, label: 'Reset View', action: resetView },
    { icon: <Keyboard />, label: 'Shortcuts', action: () => setShowShortcuts(true) },
  ];

  return (
    <>
      {/* Quick Settings Fab - lifted above the transport on mobile */}
      <div className="absolute bottom-32 sm:bottom-24 right-4 z-50">
        <div className="relative">
          {/* Settings Menu */}
          <AnimatePresence>
            {showQuickSettings && (
              <motion.div
                initial={{ scale: 0, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0, opacity: 0, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 400 }}
                className="absolute bottom-16 right-0 glass-panel p-3 min-w-[200px]"
              >
                <div className="space-y-1">
                  {quickActions.map((action, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        action.action();
                        setShowQuickSettings(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-text-tertiary hover:text-text-primary hover:bg-ai-red/[0.08] rounded-md transition-colors flex items-center gap-3"
                    >
                      <span className="w-4 h-4">{action.icon}</span>
                      {action.label}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* FAB Button */}
          <button
            onClick={() => setShowQuickSettings(!showQuickSettings)}
            className="w-14 h-14 bg-ai-red rounded-full flex items-center justify-center shadow-button hover:shadow-glow-hover transition-all transform hover:scale-110"
          >
            <Settings className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>

      {/* Keyboard Shortcuts Modal */}
      <AnimatePresence>
        {showShortcuts && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[hsl(225_18%_4%/0.7)] backdrop-blur-md z-50 flex items-center justify-center"
            onClick={() => setShowShortcuts(false)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0, filter: 'blur(14px)' }}
              animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.46, ease: [0.22, 1, 0.36, 1] }}
              className="glass-panel p-6 max-w-md mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-eyebrow mb-1">studio</p>
              <h3 className="text-text-primary text-lg font-semibold mb-4">Keyboard Shortcuts</h3>
              <div className="space-y-2 text-sm text-text-secondary">
                <div className="flex justify-between">
                  <span>Play/Pause</span>
                  <kbd className="font-mono-num bg-surface-2 border border-hairline/60 px-2 py-1 rounded text-xs text-text-primary">Space</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Seek Backward</span>
                  <kbd className="font-mono-num bg-surface-2 border border-hairline/60 px-2 py-1 rounded text-xs text-text-primary">←</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Seek Forward</span>
                  <kbd className="font-mono-num bg-surface-2 border border-hairline/60 px-2 py-1 rounded text-xs text-text-primary">→</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Zoom In</span>
                  <kbd className="font-mono-num bg-surface-2 border border-hairline/60 px-2 py-1 rounded text-xs text-text-primary">Cmd/Ctrl + =</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Zoom Out</span>
                  <kbd className="font-mono-num bg-surface-2 border border-hairline/60 px-2 py-1 rounded text-xs text-text-primary">Cmd/Ctrl + -</kbd>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}