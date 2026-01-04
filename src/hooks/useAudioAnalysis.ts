import { useEffect, useRef } from 'react';

export interface AudioData {
  frequency: number[];
  amplitude: number;
  beatStrength: number;
}

export const useAudioAnalysis = (
  analyser: AnalyserNode | null,
  isPlaying: boolean,
  onDataUpdate: (data: AudioData) => void
) => {
  const animationFrameRef = useRef<number>();
  const dataArrayRef = useRef<Uint8Array<ArrayBuffer>>();
  const smoothedDataRef = useRef<AudioData>({
    frequency: Array(256).fill(0),
    amplitude: 0,
    beatStrength: 0,
  });
  
  // Beat detection refs
  const energyHistoryRef = useRef<number[]>([]);
  const lastBeatTimeRef = useRef<number>(0);
  const beatPeakRef = useRef<number>(0);

  useEffect(() => {
    if (!analyser) return;

    // Optimize analyser for smoother visuals with less smoothing for better transient response
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.6; // Reduced from 0.8 for faster response
    dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);

    const updateAudioData = () => {
      if (!analyser || !dataArrayRef.current || !isPlaying) {
        animationFrameRef.current = requestAnimationFrame(updateAudioData);
        return;
      }

      analyser.getByteFrequencyData(dataArrayRef.current);
      const frequency = Array.from(dataArrayRef.current);

      const prevData = smoothedDataRef.current;

      const amplitude =
        frequency.reduce((sum, val) => sum + val, 0) / frequency.length / 255;
      
      // Focus on sub-bass/kick range (roughly 20-150Hz) for beat detection
      const kickEnd = Math.floor(frequency.length * 0.08);
      const kickRange = frequency.slice(0, kickEnd);
      const instantEnergy = kickRange.reduce((sum, val) => sum + val, 0) / kickEnd / 255;
      
      // Update energy history (keep last 20 samples ~330ms at 60fps)
      energyHistoryRef.current.push(instantEnergy);
      if (energyHistoryRef.current.length > 20) {
        energyHistoryRef.current.shift();
      }
      
      // Calculate average energy and detect onset
      const avgEnergy = energyHistoryRef.current.length > 0 
        ? energyHistoryRef.current.reduce((a, b) => a + b, 0) / energyHistoryRef.current.length 
        : 0;
      const energyRatio = instantEnergy / (avgEnergy + 0.001);
      const now = performance.now();
      
      // Trigger beat if energy spike detected (>1.5x average) and cooldown passed (>80ms)
      const isBeatOnset = energyRatio > 1.5 && (now - lastBeatTimeRef.current) > 80;
      if (isBeatOnset) {
        beatPeakRef.current = 1.0;
        lastBeatTimeRef.current = now;
      }
      
      // Decay beat peak quickly (asymmetric: instant attack, fast decay)
      beatPeakRef.current *= 0.88; // Decay by 12% per frame
      
      // beatStrength combines peak detection with instant energy for responsiveness
      const newBeatStrength = Math.max(beatPeakRef.current, instantEnergy * 0.6);
      
      // Asymmetric smoothing: fast attack (0.4), slower decay (0.15)
      const attackFactor = 0.4;
      const decayFactor = 0.15;
      
      const lerpValue = (current: number, target: number) => {
        const factor = target > current ? attackFactor : decayFactor;
        return current + (target - current) * factor;
      };

      // Apply asymmetric smoothing to frequency data
      smoothedDataRef.current = {
        frequency: frequency.map((val, i) => {
          const prev = prevData.frequency[i] ?? 0;
          const factor = val > prev ? attackFactor : decayFactor;
          return prev + (val - prev) * factor;
        }),
        amplitude: lerpValue(prevData.amplitude, amplitude),
        beatStrength: lerpValue(prevData.beatStrength, newBeatStrength),
      };

      onDataUpdate(smoothedDataRef.current);
      animationFrameRef.current = requestAnimationFrame(updateAudioData);
    };

    updateAudioData();

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [analyser, isPlaying, onDataUpdate]);
};