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

  useEffect(() => {
    if (!analyser) return;

    dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);

    const updateAudioData = () => {
      if (!analyser || !dataArrayRef.current || !isPlaying) {
        animationFrameRef.current = requestAnimationFrame(updateAudioData);
        return;
      }

      analyser.getByteFrequencyData(dataArrayRef.current);
      
      const frequency = Array.from(dataArrayRef.current);
      
      const amplitude = frequency.reduce((sum, val) => sum + val, 0) / frequency.length / 255;
      
      const bassEnd = Math.floor(frequency.length * 0.15);
      const bassSum = frequency.slice(0, bassEnd).reduce((sum, val) => sum + val, 0);
      const beatStrength = bassSum / bassEnd / 255;

      onDataUpdate({
        frequency,
        amplitude,
        beatStrength
      });

      animationFrameRef.current = requestAnimationFrame(updateAudioData);
    };

    updateAudioData();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [analyser, isPlaying, onDataUpdate]);
};
