import React, { useState } from 'react';
import { Mic2, Film, Image } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStudioStore } from '@/stores/studioStore';
import { useWebMRecorder, ExportQuality } from '@/hooks/useWebMRecorder';

interface TopBarProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
}

export function TopBar({ canvasRef }: TopBarProps) {
  const { audioElement, background, logo, exportMode } = useStudioStore();
  const { isRecording, startRecording, stopRecording, frameCount } = useWebMRecorder({ canvasRef, audioElement });
  const [exportQuality, setExportQuality] = useState<ExportQuality>('4k');

  const handleRecord = () => {
    if (isRecording) {
      stopRecording();
    } else {
      const currentTime = audioElement?.currentTime || 0;
      startRecording(currentTime, background, 'visualizer', exportQuality, logo, exportMode);
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
          {/* Quality selector */}
          <select
            value={exportQuality}
            onChange={(e) => setExportQuality(e.target.value as ExportQuality)}
            className="px-3 py-2 bg-black/40 backdrop-blur-xl rounded-full border border-white/10 text-white/70 text-xs appearance-none cursor-pointer"
            disabled={isRecording}
          >
            <option value="1080p">1080p</option>
            <option value="4k">4K</option>
            <option value="8k">8K</option>
          </select>
          
          {/* Mode indicator */}
          <div className="flex items-center gap-1.5 px-3 py-2 bg-black/40 backdrop-blur-xl rounded-full border border-white/10">
            {exportMode === 'video' ? (
              <Film className="w-4 h-4 text-white/70" />
            ) : (
              <Image className="w-4 h-4 text-white/70" />
            )}
            <span className="text-white/70 text-xs">
              {exportMode === 'video' ? 'WebM' : 'PNG'}
            </span>
          </div>
          
          {/* Record button */}
          <button 
            onClick={handleRecord}
            className={`px-8 py-3 backdrop-blur-xl rounded-full text-white font-bold transition-all transform hover:scale-105 shadow-lg ${
              isRecording 
                ? 'bg-red-600/90 hover:bg-red-500 shadow-red-600/50 animate-pulse' 
                : 'bg-red-600/70 hover:bg-red-600/90 shadow-red-600/30'
            }`}
          >
            {isRecording 
              ? (exportMode === 'png-sequence' ? `STOP (${frameCount})` : 'STOP')
              : (exportMode === 'png-sequence' ? 'REC FRAMES' : 'REC')
            }
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
