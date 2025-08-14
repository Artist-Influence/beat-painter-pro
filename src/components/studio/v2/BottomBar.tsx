import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, SkipBack, SkipForward, Volume2, ChevronDown, ChevronUp } from 'lucide-react';
import { useStudioStore } from '@/stores/studioStore';
import { WaveformVisualizer } from './WaveformVisualizer';

interface BottomBarProps {
  isVisible: boolean;
  onToggle: (visible: boolean) => void;
}

export function BottomBar({ isVisible, onToggle }: BottomBarProps) {
  const { audioElement } = useStudioStore();

  const handlePlayPause = () => {
    if (!audioElement) return;
    if (audioElement.paused) {
      audioElement.play();
    } else {
      audioElement.pause();
    }
  };

  const handleSeek = (seconds: number) => {
    if (!audioElement) return;
    audioElement.currentTime = Math.max(0, Math.min(audioElement.duration || 0, audioElement.currentTime + seconds));
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <>
      {/* Toggle Button */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40">
        <button
          onClick={() => onToggle(!isVisible)}
          className="p-2 backdrop-blur-xl rounded-full border border-white/10 hover:bg-white/10 transition-colors shadow-lg shadow-black/20"
        >
          {isVisible ? (
            <ChevronDown className="w-4 h-4 text-white/80" />
          ) : (
            <ChevronUp className="w-4 h-4 text-white/80" />
          )}
        </button>
      </div>

      {/* Audio Controls */}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="absolute bottom-16 left-0 right-0 z-30"
          >
            <div className="mx-auto max-w-2xl p-4">
              <div className="bg-black/60 backdrop-blur-2xl rounded-2xl border border-white/10 p-4">
                
                {/* Waveform Visualization */}
                <div className="h-12 mb-3 bg-white/5 rounded-lg overflow-hidden">
                  <WaveformVisualizer />
                </div>

                {/* Playback Controls */}
                <div className="flex items-center gap-4">
                  {/* Play Controls */}
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleSeek(-10)}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <SkipBack className="w-4 h-4 text-white/80" />
                    </button>
                    <button 
                      onClick={handlePlayPause}
                      className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                      disabled={!audioElement}
                    >
                      {audioElement?.paused !== false ? (
                        <Play className="w-5 h-5 text-white" />
                      ) : (
                        <Pause className="w-5 h-5 text-white" />
                      )}
                    </button>
                    <button 
                      onClick={() => handleSeek(10)}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <SkipForward className="w-4 h-4 text-white/80" />
                    </button>
                  </div>

                  {/* Timeline */}
                  <div className="flex-1 flex items-center gap-3">
                    <span className="text-xs text-white/60 font-mono">
                      {audioElement ? formatTime(audioElement.currentTime || 0) : '0:00'}
                    </span>
                    <div className="flex-1 h-1 bg-white/20 rounded-full relative">
                      <div 
                        className="absolute left-0 top-0 h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-100"
                        style={{
                          width: audioElement && audioElement.duration 
                            ? `${(audioElement.currentTime / audioElement.duration) * 100}%` 
                            : '0%'
                        }}
                      />
                      <input
                        type="range"
                        min="0"
                        max={audioElement?.duration || 100}
                        value={audioElement?.currentTime || 0}
                        onChange={(e) => {
                          if (audioElement) {
                            audioElement.currentTime = parseFloat(e.target.value);
                          }
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    </div>
                    <span className="text-xs text-white/60 font-mono">
                      {audioElement ? formatTime(audioElement.duration || 0) : '0:00'}
                    </span>
                  </div>

                  {/* Volume */}
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-white/60" />
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={audioElement?.volume || 0.75}
                      onChange={(e) => {
                        if (audioElement) {
                          audioElement.volume = parseFloat(e.target.value);
                        }
                      }}
                      className="w-20 h-1 bg-white/20 rounded-full appearance-none cursor-pointer
                               [&::-webkit-slider-thumb]:appearance-none 
                               [&::-webkit-slider-thumb]:w-3 
                               [&::-webkit-slider-thumb]:h-3 
                               [&::-webkit-slider-thumb]:bg-white 
                               [&::-webkit-slider-thumb]:rounded-full 
                               [&::-webkit-slider-thumb]:cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}