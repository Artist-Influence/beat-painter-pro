import { useEffect, useState, useRef } from 'react';

export interface WaveformData {
  peaks: number[];
  duration: number;
}

export function useWaveformAnalysis(audioElement: HTMLAudioElement | null) {
  const [waveformData, setWaveformData] = useState<WaveformData | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!audioElement || !audioElement.src) {
      setWaveformData(null);
      return;
    }

    const analyzeAudio = async () => {
      setIsAnalyzing(true);
      
      try {
        // Create audio context if it doesn't exist
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        
        const audioContext = audioContextRef.current;
        
        // Fetch audio file and decode it
        const response = await fetch(audioElement.src);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        // Get channel data (use first channel for mono/stereo)
        const channelData = audioBuffer.getChannelData(0);
        const sampleRate = audioBuffer.sampleRate;
        const duration = audioBuffer.duration;
        
        // Calculate peaks for visualization (downsample to ~1000 points for performance)
        const peakCount = 1000;
        const samplesPerPeak = Math.floor(channelData.length / peakCount);
        const peaks: number[] = [];
        
        for (let i = 0; i < peakCount; i++) {
          const start = i * samplesPerPeak;
          const end = Math.min(start + samplesPerPeak, channelData.length);
          
          let peak = 0;
          for (let j = start; j < end; j++) {
            peak = Math.max(peak, Math.abs(channelData[j]));
          }
          
          peaks.push(peak);
        }
        
        setWaveformData({ peaks, duration });
      } catch (error) {
        console.error('Failed to analyze audio waveform:', error);
        setWaveformData(null);
      } finally {
        setIsAnalyzing(false);
      }
    };

    // Only analyze when audio metadata is loaded
    if (audioElement.readyState >= 1) {
      analyzeAudio();
    } else {
      const handleLoadedMetadata = () => analyzeAudio();
      audioElement.addEventListener('loadedmetadata', handleLoadedMetadata);
      return () => audioElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
    }
  }, [audioElement?.src]);

  // Cleanup audio context on unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  return { waveformData, isAnalyzing };
}