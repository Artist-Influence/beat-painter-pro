import React from 'react';
import { Mic2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStudioStore } from '@/stores/studioStore';
import { useWebMRecorder } from '@/hooks/useWebMRecorder';

export function TopBar() {
  const { audioElement, backgroundColor } = useStudioStore();
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const { isRecording, startRecording, stopRecording } = useWebMRecorder({ canvasRef, audioElement });

  const handleRecord = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording(0, backgroundColor, 'visualizer');
    }
  };

  return (
    <div className="absolute top-0 left-0 right-0 z-40 pointer-events-none">
      <div className="flex items-center justify-between p-4">
        {/* Logo - Left */}
        <div className="pointer-events-auto">
          <div className="flex items-center gap-3 px-4 py-2 bg-black/40 backdrop-blur-xl rounded-full border border-white/10">
            <Mic2 className="w-5 h-5 text-white" />
            <span className="text-sm font-medium text-white">Audio Visual Studio</span>
          </div>
        </div>

        {/* Record Button - Center */}
        <div className="pointer-events-auto">
          <button 
            onClick={handleRecord}
            className={`px-8 py-3 backdrop-blur rounded-full text-white font-bold transition-all transform hover:scale-105 shadow-lg ${
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
            <button className="px-4 py-2 bg-black/40 backdrop-blur-xl rounded-full border border-white/10 text-white/80 hover:text-white transition-colors">
              Admin
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}