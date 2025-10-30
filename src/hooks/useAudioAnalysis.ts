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
  const dataArrayRef = useRef<Uint8Array>();
  const smoothedDataRef = useRef<AudioData>({
    frequency: Array(256).fill(0),
    amplitude: 0,
    beatStrength: 0,
  });

  useEffect(() => {
    if (!analyser) return;

    // Optimize analyser for smoother visuals
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.8;
    dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);

    const updateAudioData = () => {
      if (!analyser || !dataArrayRef.current || !isPlaying) {
        animationFrameRef.current = requestAnimationFrame(updateAudioData);
        return;
      }

      analyser.getByteFrequencyData(dataArrayRef.current as Uint8Array);
      const frequency = Array.from(dataArrayRef.current);

      const smoothingFactor = 0.3;
      const prevData = smoothedDataRef.current;

      const amplitude =
        frequency.reduce((sum, val) => sum + val, 0) / frequency.length / 255;
      const bassEnd = Math.floor(frequency.length * 0.15);
      const bassSum = frequency
        .slice(0, bassEnd)
        .reduce((sum, val) => sum + val, 0);
      const beatStrength = bassSum / bassEnd / 255;

      // Apply smoothing interpolation
      smoothedDataRef.current = {
        frequency: frequency.map((val, i) =>
          (prevData.frequency[i] ?? 0) + (val - (prevData.frequency[i] ?? 0)) * smoothingFactor
        ),
        amplitude:
          prevData.amplitude + (amplitude - prevData.amplitude) * smoothingFactor,
        beatStrength:
          prevData.beatStrength + (beatStrength - prevData.beatStrength) * smoothingFactor,
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