/**
 * DebugOverlay
 * Shows render state info in development mode
 */

import React, { useEffect, useState } from 'react';
import { renderGate } from '@/lib/renderReadyGate';

interface DebugInfo {
  ready: boolean;
  geometryLoaded: boolean;
  textureLoaded: boolean;
  framesRendered: number;
  canvasWidth: number;
  canvasHeight: number;
  seed?: number;
}

interface DebugOverlayProps {
  canvasRef?: React.RefObject<HTMLCanvasElement>;
  seed?: number;
  enabled?: boolean;
}

export function DebugOverlay({ canvasRef, seed, enabled = false }: DebugOverlayProps) {
  const [info, setInfo] = useState<DebugInfo>({
    ready: false,
    geometryLoaded: false,
    textureLoaded: false,
    framesRendered: 0,
    canvasWidth: 0,
    canvasHeight: 0,
    seed,
  });
  
  useEffect(() => {
    if (!enabled) return;
    
    const updateInfo = () => {
      const state = renderGate.getState();
      setInfo({
        ready: state.isReady,
        geometryLoaded: state.geometryLoaded,
        textureLoaded: state.textureLoaded,
        framesRendered: state.framesRendered,
        canvasWidth: canvasRef?.current?.width || 0,
        canvasHeight: canvasRef?.current?.height || 0,
        seed,
      });
    };
    
    // Update every 100ms
    const interval = setInterval(updateInfo, 100);
    updateInfo();
    
    return () => clearInterval(interval);
  }, [canvasRef, seed, enabled]);
  
  // Only show in development
  if (!enabled || process.env.NODE_ENV === 'production') {
    return null;
  }
  
  return (
    <div className="absolute bottom-2 left-2 z-50 pointer-events-none">
      <div className="text-[10px] text-white/50 font-mono bg-black/40 px-1.5 py-0.5 rounded">
        {info.ready ? '✓' : '○'} {info.canvasWidth}×{info.canvasHeight}
        {seed !== undefined && ` • ${seed.toString().slice(0, 6)}`}
      </div>
    </div>
  );
}

export default DebugOverlay;
