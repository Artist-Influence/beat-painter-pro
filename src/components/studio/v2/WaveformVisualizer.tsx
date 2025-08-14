import React, { useEffect, useRef } from 'react';
import { useStudioStore } from '@/stores/studioStore';

export function WaveformVisualizer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { audioElement } = useStudioStore();
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);

      // Generate sample waveform data (in real app, this would come from audio analysis)
      const barCount = 50;
      const barWidth = rect.width / barCount;
      
      for (let i = 0; i < barCount; i++) {
        // Simulate audio levels (replace with real audio data)
        const height = Math.random() * rect.height * 0.8;
        const x = i * barWidth;
        const y = (rect.height - height) / 2;
        
        // Create gradient
        const gradient = ctx.createLinearGradient(0, y, 0, y + height);
        gradient.addColorStop(0, '#8b5cf6');
        gradient.addColorStop(1, '#ec4899');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, barWidth - 1, height);
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    if (audioElement && !audioElement.paused) {
      draw();
    } else {
      // Draw static waveform when paused
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const rect = canvas.getBoundingClientRect();
      const barCount = 50;
      const barWidth = rect.width / barCount;
      
      for (let i = 0; i < barCount; i++) {
        const height = Math.sin(i * 0.2) * 20 + 10;
        const x = i * barWidth;
        const y = (rect.height - height) / 2;
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(x, y, barWidth - 1, height);
      }
    }

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [audioElement]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ width: '100%', height: '100%' }}
    />
  );
}