import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Maximize2, Camera, RotateCcw, Keyboard } from 'lucide-react';
import { useStudioStore } from '@/stores/studioStore';

export function FloatingActions() {
  const [showQuickSettings, setShowQuickSettings] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const { setFilters, setZoom, setBackground } = useStudioStore();

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
    setBackground("#FFFFFF");
  };

  const quickActions = [
    { icon: <Camera />, label: 'Screenshot', action: takeScreenshot },
    { icon: <RotateCcw />, label: 'Reset View', action: resetView },
    { icon: <Keyboard />, label: 'Shortcuts', action: () => setShowShortcuts(true) },
  ];

  return (
    <>
      {/* Quick Settings Fab */}
      <div className="absolute bottom-24 right-4 z-50">
        <div className="relative">
          {/* Settings Menu */}
          <AnimatePresence>
            {showQuickSettings && (
              <motion.div
                initial={{ scale: 0, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0, opacity: 0, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 400 }}
                className="absolute bottom-16 right-0 bg-black/80 backdrop-blur-xl rounded-2xl border border-white/10 p-3 min-w-[200px] shadow-lg shadow-black/20"
              >
                <div className="space-y-2">
                  {quickActions.map((action, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        action.action();
                        setShowQuickSettings(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-white/80 hover:bg-white/10 rounded-lg transition-colors flex items-center gap-3"
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
            className="w-14 h-14 bg-purple-600/90 backdrop-blur-xl rounded-full flex items-center justify-center shadow-lg shadow-purple-600/30 hover:bg-purple-500 transition-all transform hover:scale-110"
          >
            <Settings className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>

      {/* Fullscreen Toggle */}
      <div className="absolute top-24 right-4 z-50">
        <button 
          onClick={() => {
            if (document.fullscreenElement) {
              document.exitFullscreen();
            } else {
              document.documentElement.requestFullscreen();
            }
          }}
          className="p-3 backdrop-blur-xl rounded-full border border-white/10 hover:bg-white/10 transition-colors shadow-lg shadow-black/20"
        >
          <Maximize2 className="w-5 h-5 text-white/80" />
        </button>
      </div>

      {/* Keyboard Shortcuts Modal */}
      <AnimatePresence>
        {showShortcuts && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
            onClick={() => setShowShortcuts(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-black/80 backdrop-blur-xl rounded-2xl border border-white/10 p-6 max-w-md mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-white text-lg font-semibold mb-4">Keyboard Shortcuts</h3>
              <div className="space-y-2 text-sm text-white/80">
                <div className="flex justify-between">
                  <span>Play/Pause</span>
                  <kbd className="bg-white/10 px-2 py-1 rounded text-xs">Space</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Seek Backward</span>
                  <kbd className="bg-white/10 px-2 py-1 rounded text-xs">←</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Seek Forward</span>
                  <kbd className="bg-white/10 px-2 py-1 rounded text-xs">→</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Zoom In</span>
                  <kbd className="bg-white/10 px-2 py-1 rounded text-xs">Cmd/Ctrl + =</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Zoom Out</span>
                  <kbd className="bg-white/10 px-2 py-1 rounded text-xs">Cmd/Ctrl + -</kbd>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}