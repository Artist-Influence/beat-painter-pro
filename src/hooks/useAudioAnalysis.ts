import { useEffect, useRef } from 'react';

export interface AudioData {
  frequency: number[];
  amplitude: number;
  beatStrength: number;
  sampleRate: number;
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
    sampleRate: 44100,
  });
  
  // Beat detection refs
  const energyHistoryRef = useRef<number[]>([]);
  const lastBeatTimeRef = useRef<number>(0);
  const beatPeakRef = useRef<number>(0);

  useEffect(() => {
    if (!analyser) return;

    // Optimize analyser for maximum audio reactivity - near-zero smoothing for instant response
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.05; // Near-zero for instant transient response (was 0.1)
    dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);

    const updateAudioData = () => {
      if (!analyser || !dataArrayRef.current || !isPlaying) {
        // CRITICAL: Zero out audio data when paused so visualizers freeze
        onDataUpdate({
          frequency: Array(256).fill(0),
          amplitude: 0,
          beatStrength: 0,
          sampleRate: analyser?.context?.sampleRate || 44100,
        });
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
      
      // Trigger beat if energy spike detected (>1.15x average) and cooldown passed (>50ms)
      const isBeatOnset = energyRatio > 1.15 && (now - lastBeatTimeRef.current) > 50;
      if (isBeatOnset) {
        beatPeakRef.current = 1.0;
        lastBeatTimeRef.current = now;
      }
      
      // Decay beat peak quickly (asymmetric: instant attack, fast decay)
      beatPeakRef.current *= 0.65; // Decay by 35% per frame for sharper pulses (was 0.75)
      
      // beatStrength combines peak detection with instant energy for responsiveness
      const newBeatStrength = Math.max(beatPeakRef.current, instantEnergy * 0.7);
      
      // Asymmetric smoothing: near-instant attack (0.85), fast decay (0.55) for 170+ BPM support
      const attackFactor = 0.85; // Was 0.75 - now near-instant
      const decayFactor = 0.55;  // Was 0.45 - faster decay for fast tempos
      
      const lerpValue = (current: number, target: number) => {
        const factor = target > current ? attackFactor : decayFactor;
        return current + (target - current) * factor;
      };

      // Apply asymmetric smoothing to frequency data
      const sampleRate = analyser.context.sampleRate;
      smoothedDataRef.current = {
        frequency: frequency.map((val, i) => {
          const prev = prevData.frequency[i] ?? 0;
          const factor = val > prev ? attackFactor : decayFactor;
          return prev + (val - prev) * factor;
        }),
        amplitude: lerpValue(prevData.amplitude, amplitude),
        beatStrength: lerpValue(prevData.beatStrength, newBeatStrength),
        sampleRate,
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