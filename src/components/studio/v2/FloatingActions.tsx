import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Maximize2, Camera, RotateCcw, Keyboard } from 'lucide-react';

export function FloatingActions() {
  const [showQuickSettings, setShowQuickSettings] = useState(false);

  const quickActions = [
    { icon: <Camera />, label: 'Screenshot', action: () => console.log('Screenshot') },
    { icon: <RotateCcw />, label: 'Reset View', action: () => console.log('Reset') },
    { icon: <Keyboard />, label: 'Shortcuts', action: () => console.log('Shortcuts') },
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
    </>
  );
}