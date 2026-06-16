import React, { useEffect, useState } from 'react';
import { useStudioStore } from '@/stores/studioStore';
import { useWaveformAnalysis } from '@/hooks/useWaveformAnalysis';

export function WaveformVisualizer() {
  const { audioElement } = useStudioStore();
  const { waveformData, isAnalyzing } = useWaveformAnalysis(audioElement);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    if (!audioElement) return;

    const updateTime = () => setCurrentTime(audioElement.currentTime || 0);
    audioElement.addEventListener('timeupdate', updateTime);
    return () => audioElement.removeEventListener('timeupdate', updateTime);
  }, [audioElement]);

  const handleWaveformClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!audioElement || !waveformData) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * waveformData.duration;

    audioElement.currentTime = Math.max(0, Math.min(waveformData.duration, newTime));
  };

  if (isAnalyzing) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-text-tertiary text-sm">Analyzing audio...</div>
      </div>
    );
  }

  if (!waveformData) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-text-tertiary text-sm">No audio loaded</div>
      </div>
    );
  }

  const progressPercentage = waveformData.duration > 0 
    ? (currentTime / waveformData.duration) * 100 
    : 0;

  return (
    <div 
      className="w-full h-full cursor-pointer relative overflow-hidden"
      onClick={handleWaveformClick}
    >
      {/* Progress overlay */}
      <div 
        className="absolute inset-0 bg-gradient-to-r from-ai-red/40 to-ai-red/20 transition-all duration-100"
        style={{ width: `${progressPercentage}%` }}
      />
      
      {/* Waveform bars */}
      <div className="flex items-center justify-center h-full gap-[1px]">
        {waveformData.peaks.map((peak, index) => {
          const height = Math.max(2, peak * 100); // Minimum 2px height, max based on peak
          const isPassed = index < (progressPercentage / 100) * waveformData.peaks.length;
          
          return (
            <div
              key={index}
              className={`transition-colors duration-100 rounded-sm ${
                isPassed 
                  ? 'bg-white' 
                  : 'bg-hairline'
              }`}
              style={{
                height: `${height}%`,
                width: '2px',
                minHeight: '2px',
              }}
            />
          );
        })}
      </div>
    </div>
  );
}