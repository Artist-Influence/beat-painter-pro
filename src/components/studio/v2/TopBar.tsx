import { useEffect, useRef } from 'react';
import { Square, RectangleVertical, RectangleHorizontal, Clapperboard } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useStudioStore, AspectRatio, ExportQuality } from '@/stores/studioStore';
import { useWebMRecorder } from '@/hooks/useWebMRecorder';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/hooks/useAuth';
import { getExportQuota, recordExport, formatResetIn, EXPORT_LIMIT } from '@/lib/exportLimiter';

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
  const { audioElement, background, logo, exportMode, selected, audioFileName, exportAspectRatio, setExportAspectRatio, setReactionWizardOpen, exportQuality, setExportQuality } = studioState;
  const recorder = useWebMRecorder({ canvasRef, audioElement });
  const { isRecording, startRecording, stopRecording, frameCount, progress } = recorder;
  const { isAdmin } = useUserRole();
  const { user } = useAuth();

  const handleRecord = () => {
    if (isRecording) {
      stopRecording();
      return;
    }
    // Throttle: at most EXPORT_LIMIT exports per rolling 12h (client-side soft limit).
    const quota = getExportQuota();
    if (!quota.allowed) {
      toast.error(`Export limit reached (${EXPORT_LIMIT} per 12h). Try again in ${formatResetIn(quota.resetMs)}.`);
      return;
    }
    recordExport();
    const currentTime = audioElement?.currentTime || 0;
    const songName = getSongName(audioFileName);
    const vizName = formatVisualizerName(selected);
    startRecording(currentTime, background, songName, vizName, exportQuality, logo, exportMode, exportAspectRatio);
  };

  // The Reaction Reel wizard's "Export reel" button drives the same record path.
  const recordRef = useRef(handleRecord);
  recordRef.current = handleRecord;
  useEffect(() => {
    const h = () => recordRef.current();
    window.addEventListener('reaction-reel:export', h);
    return () => window.removeEventListener('reaction-reel:export', h);
  }, []);

  return (
    <div className="absolute top-0 left-0 right-0 z-50 pointer-events-none">
      <div className="flex items-center justify-between gap-2 p-2 sm:p-4">
        {/* Logo + Reaction Reel launcher - Left */}
        <div className="pointer-events-auto flex items-center gap-2">
          <div className="flex items-center gap-3 px-3 sm:px-4 py-2 glass-panel !rounded-full">
            <img src="/ai-logo.png" alt="Artist Influence" className="w-6 h-6 object-contain shrink-0" />
            <div className="hidden sm:flex flex-col leading-none">
              <span className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-ai-red">artist influence</span>
              <span className="text-sm font-semibold text-text-primary">Visualizer Studio</span>
            </div>
          </div>
          <button
            onClick={() => setReactionWizardOpen(true)}
            title="Make a reaction reel - guided"
            className="flex items-center gap-2 px-4 h-11 glass-panel glass-panel-interactive !rounded-full text-sm font-semibold text-text-primary hover:text-ai-red transition-colors"
          >
            <Clapperboard className="w-4 h-4 text-ai-red" />
            <span className="hidden md:inline">Reaction Reel</span>
          </button>
        </div>

        {/* Record Controls - Center */}
        <div className="pointer-events-auto flex items-center gap-2">
          {/* Aspect ratio selector */}
          <div className="flex items-center gap-1 px-1.5 py-1 glass-panel !rounded-full">
            {(['horizontal', 'vertical', 'square'] as AspectRatio[]).map((ratio) => (
              <button
                key={ratio}
                onClick={() => !isRecording && setExportAspectRatio(ratio)}
                disabled={isRecording}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full transition-colors ${
                  exportAspectRatio === ratio
                    ? 'bg-ai-red/[0.12] text-ai-red'
                    : 'text-text-tertiary hover:text-text-primary'
                } ${isRecording ? 'opacity-50 cursor-not-allowed' : ''}`}
                title={ASPECT_RATIO_LABELS[ratio]}
              >
                {ASPECT_RATIO_ICONS[ratio]}
                <span className="font-mono-num text-[0.7rem] hidden sm:inline">{ASPECT_RATIO_LABELS[ratio]}</span>
              </button>
            ))}
          </div>

          {/* Quality selector */}
          <select
            value={exportQuality}
            onChange={(e) => setExportQuality(e.target.value as ExportQuality)}
            className="hidden sm:block px-3 py-2.5 glass-panel !rounded-full text-text-tertiary text-xs font-mono-num appearance-none cursor-pointer hover:text-text-primary transition-colors"
            disabled={isRecording}
          >
            <option value="1080p">1080P</option>
            <option value="4k">4K</option>
            <option value="8k">8K</option>
          </select>

          {/* Record button - disabled until audio is loaded so you set up and TEST the
              composition first; export only becomes available once there's a song.
              While exporting it shows live progress and a fill bar. */}
          <button
            onClick={handleRecord}
            disabled={!isRecording && !audioElement}
            title={!audioElement ? 'Upload audio first - set up and preview your visualizer, then export' : (isRecording ? 'Stop & save the export' : `Export your video - ${getExportQuota().remaining}/${EXPORT_LIMIT} exports left (per 12h)`)}
            className={`btn relative overflow-hidden !rounded-full px-4 sm:px-7 h-11 font-semibold tracking-wide ${
              isRecording
                ? 'bg-ai-red text-white shadow-glow-hover'
                : 'btn-primary'
            } ${!isRecording && !audioElement ? 'opacity-40 cursor-not-allowed' : ''}`}
          >
            {/* progress fill (video export) */}
            {isRecording && exportMode === 'video' && (
              <span className="absolute inset-y-0 left-0 bg-white/25 transition-[width] duration-200" style={{ width: `${Math.round(progress * 100)}%` }} />
            )}
            <span className="relative flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full bg-white ${isRecording ? 'animate-pulse' : ''}`} />
              {isRecording
                ? (exportMode === 'png-sequence' ? `STOP · ${frameCount}` : `EXPORTING · ${Math.round(progress * 100)}%`)
                : (exportMode === 'png-sequence' ? 'REC FRAMES' : 'EXPORT')
              }
            </span>
          </button>
        </div>

        {/* User Menu - Right - Admin entry for admins; a discreet Log in for
            everyone else so the admin can actually sign in to reach the dashboard. */}
        <div className="hidden sm:block pointer-events-auto">
          {isAdmin ? (
            <Link to="/admin">
              <button className="btn btn-ghost !rounded-full h-10 px-4 text-text-tertiary">
                Admin
              </button>
            </Link>
          ) : !user ? (
            <Link to="/auth">
              <button className="btn btn-ghost !rounded-full h-10 px-4 text-text-tertiary">
                Log in
              </button>
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
