import { useState } from 'react';
import { Mic2, Film, Image, Square, RectangleVertical, RectangleHorizontal } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStudioStore, AspectRatio } from '@/stores/studioStore';
import { useWebMRecorder, ExportQuality } from '@/hooks/useWebMRecorder';

interface TopBarProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
}

// Helper to format visualizer name
const formatVisualizerName = (key: string): string => {
  if (key.startsWith('custom_')) {
    return key.replace('custom_', '').replace(/([A-Z])/g, ' $1').trim();
  }
  return key.replace(/Visualizer$/, '').replace(/([A-Z])/g, ' $1').trim();
};

// Helper to extract song name from filename
const getSongName = (fileName: string | null): string => {
  if (!fileName) return 'Untitled';
  return fileName.replace(/\.[^/.]+$/, '');
};

const ASPECT_RATIO_ICONS: Record<AspectRatio, React.ReactNode> = {
  horizontal: <RectangleHorizontal className="w-4 h-4" />,
  vertical: <RectangleVertical className="w-4 h-4" />,
  square: <Square className="w-4 h-4" />,
};

const ASPECT_RATIO_LABELS: Record<AspectRatio, string> = {
  horizontal: '16:9',
  vertical: '9:16',
  square: '1:1',
};

export function TopBar({ canvasRef }: TopBarProps) {
  const studioState = useStudioStore();
  const { audioElement, background, logo, exportMode, selected, audioFileName, exportAspectRatio, setExportAspectRatio } = studioState;
  const recorder = useWebMRecorder({ canvasRef, audioElement });
  const { isRecording, startRecording, stopRecording, frameCount } = recorder;
  const [exportQuality, setExportQuality] = useState<ExportQuality>('4k');

  const handleRecord = () => {
    if (isRecording) {
      stopRecording();
    } else {
      const currentTime = audioElement?.currentTime || 0;
      const songName = getSongName(audioFileName);
      const vizName = formatVisualizerName(selected);
      startRecording(currentTime, background, songName, vizName, exportQuality, logo, exportMode, exportAspectRatio);
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
          {/* Aspect ratio selector */}
          <div className="flex items-center gap-1 px-2 py-1.5 bg-black/40 backdrop-blur-xl rounded-full border border-white/10">
            {(['horizontal', 'vertical', 'square'] as AspectRatio[]).map((ratio) => (
              <button
                key={ratio}
                onClick={() => !isRecording && setExportAspectRatio(ratio)}
                disabled={isRecording}
                className={`p-1.5 rounded-full transition-colors ${
                  exportAspectRatio === ratio
                    ? 'bg-white/20 text-white'
                    : 'text-white/50 hover:text-white/80'
                } ${isRecording ? 'opacity-50 cursor-not-allowed' : ''}`}
                title={ASPECT_RATIO_LABELS[ratio]}
              >
                {ASPECT_RATIO_ICONS[ratio]}
              </button>
            ))}
          </div>
          
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
