import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, SkipBack, SkipForward, Volume2, Volume1, VolumeX, ChevronDown, ChevronUp } from 'lucide-react';
import { useStudioStore } from '@/stores/studioStore';

interface BottomBarProps {
  isVisible: boolean;
  onToggle: (visible: boolean) => void;
}

export function BottomBar({ isVisible, onToggle }: BottomBarProps) {
  const { audioElement } = useStudioStore();
  const [volume, setVolume] = useState(0.75);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const previousVolumeRef = React.useRef(0.75);

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

  useEffect(() => {
    if (audioElement) {
      setVolume(audioElement.volume);
      setCurrentTime(audioElement.currentTime || 0);
      setDuration(audioElement.duration || 0);
      setIsPlaying(!audioElement.paused);

      const updateTime = () => setCurrentTime(audioElement.currentTime || 0);
      const updateDuration = () => setDuration(audioElement.duration || 0);
      const updatePlayState = () => setIsPlaying(!audioElement.paused);

      audioElement.addEventListener('timeupdate', updateTime);
      audioElement.addEventListener('loadedmetadata', updateDuration);
      audioElement.addEventListener('play', updatePlayState);
      audioElement.addEventListener('pause', updatePlayState);

      return () => {
        audioElement.removeEventListener('timeupdate', updateTime);
        audioElement.removeEventListener('loadedmetadata', updateDuration);
        audioElement.removeEventListener('play', updatePlayState);
        audioElement.removeEventListener('pause', updatePlayState);
      };
    }
  }, [audioElement]);

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    if (audioElement) {
      audioElement.volume = newVolume;
    }
    if (newVolume > 0) {
      setIsMuted(false);
    }
  };

  const handleToggleMute = () => {
    if (!audioElement) return;
    
    if (isMuted || volume === 0) {
      const restoreVolume = previousVolumeRef.current > 0 ? previousVolumeRef.current : 0.75;
      handleVolumeChange(restoreVolume);
      setIsMuted(false);
    } else {
      previousVolumeRef.current = volume;
      handleVolumeChange(0);
      setIsMuted(true);
    }
  };

  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

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
                      {!isPlaying ? (
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
                      {formatTime(currentTime)}
                    </span>
                    <div className="flex-1 h-1 bg-white/20 rounded-full relative">
                      <div 
                        className="absolute left-0 top-0 h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-100"
                        style={{
                          width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%'
                        }}
                      />
                      <input
                        type="range"
                        min="0"
                        max={duration}
                        value={currentTime}
                        onChange={(e) => {
                          if (audioElement) {
                            const newTime = parseFloat(e.target.value);
                            audioElement.currentTime = newTime;
                            setCurrentTime(newTime);
                          }
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    </div>
                    <span className="text-xs text-white/60 font-mono">
                      {formatTime(duration)}
                    </span>
                  </div>

                  {/* Volume */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleToggleMute}
                      className="p-1 hover:bg-white/10 rounded transition-colors cursor-pointer"
                      title={isMuted ? "Unmute" : "Mute"}
                    >
                      <VolumeIcon className="w-4 h-4 text-white/60" />
                    </button>
                     <div className="relative w-20">
                       <div className="h-1 bg-white/20 rounded-full">
                         <div 
                           className="h-full bg-white/60 rounded-full transition-all duration-100"
                           style={{ width: `${volume * 100}%` }}
                         />
                       </div>
                       <input
                         type="range"
                         min="0"
                         max="1"
                         step="0.01"
                         value={volume}
                         onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                         className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                       />
                     </div>
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