import React, { useState } from 'react';
import { Mic2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStudioStore } from '@/stores/studioStore';
import { useWebMRecorder } from '@/hooks/useWebMRecorder';

interface TopBarProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
}

export function TopBar({ canvasRef }: TopBarProps) {
  const { audioElement, backgroundColor } = useStudioStore();
  const { isRecording, startRecording, stopRecording } = useWebMRecorder({ canvasRef, audioElement });
  const [transparentExport, setTransparentExport] = useState(false);

  const handleRecord = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording(0, backgroundColor, 'visualizer', transparentExport);
    }
  };

  return (
    <div className="absolute top-0 left-0 right-0 z-50 pointer-events-none">
      <div className="flex items-center justify-between p-4">
        {/* Logo - Left */}
        <div className="pointer-events-auto">
          <div className="flex items-center gap-3 px-4 py-2 bg-black/40 backdrop-blur-xl rounded-full border border-white/10 shadow-lg shadow-black/20">
            <Mic2 className="w-5 h-5 text-white" />
            <span className="text-sm font-medium text-white">Audio Visual Studio</span>
          </div>
        </div>

        {/* Record Controls - Center */}
        <div className="pointer-events-auto flex items-center gap-3">
          {/* Transparent BG toggle */}
          <label className="flex items-center gap-1.5 cursor-pointer px-3 py-2 bg-black/40 backdrop-blur-xl rounded-full border border-white/10">
            <input
              type="checkbox"
              checked={transparentExport}
              onChange={(e) => setTransparentExport(e.target.checked)}
              className="w-3 h-3 rounded"
              disabled={isRecording}
            />
            <span className="text-xs text-white/70">Transparent BG</span>
          </label>
          
          {/* Record button */}
          <button 
            onClick={handleRecord}
            className={`px-8 py-3 backdrop-blur-xl rounded-full text-white font-bold transition-all transform hover:scale-105 shadow-lg ${
              isRecording 
                ? 'bg-red-600/90 hover:bg-red-500 shadow-red-600/50 animate-pulse' 
                : 'bg-red-600/70 hover:bg-red-600/90 shadow-red-600/30'
            }`}
          >
            {isRecording ? 'STOP' : 'REC'}
          </button>
        </div>

        {/* User Menu - Right */}
        <div className="pointer-events-auto">
          <Link to="/admin">
            <button className="px-4 py-2 bg-black/40 backdrop-blur-xl rounded-full border border-white/10 text-white/80 hover:text-white transition-colors shadow-lg shadow-black/20">
              Admin
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}