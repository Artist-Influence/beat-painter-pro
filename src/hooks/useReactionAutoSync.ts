import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { useStudioStore } from '@/stores/studioStore';
import { alignVideoToSong } from '@/lib/audioAlign';

/**
 * One-tap "line up my reaction video to the song". Available whenever both a song
 * (audioElement) and a video background are loaded. Runs the cross-correlation,
 * sets reactionSync.offset, and reports the result — the user can still nudge.
 */
export function useReactionAutoSync() {
  const audioElement = useStudioStore((s) => s.audioElement);
  const background = useStudioStore((s) => s.background);
  const setReactionSync = useStudioStore((s) => s.setReactionSync);
  const [running, setRunning] = useState(false);

  const songUrl = audioElement?.currentSrc || audioElement?.src || null;
  const videoUrl = background.type === 'video' ? background.mediaUrl : null;
  const canAutoSync = !!songUrl && !!videoUrl;

  const runAutoSync = useCallback(async () => {
    if (!songUrl || !videoUrl || running) return;
    setRunning(true);
    const id = toast.loading('Lining up your video to the track…');
    try {
      const { offsetSeconds, confidence } = await alignVideoToSong(songUrl, videoUrl);
      setReactionSync({ enabled: true, offset: offsetSeconds });
      const sign = offsetSeconds >= 0 ? '+' : '';
      toast.success(
        `Lined up (${sign}${offsetSeconds.toFixed(2)}s).` +
          (confidence < 0.12 ? ' Low confidence — nudge the offset to fine-tune.' : ' Nudge the offset if it’s slightly off.'),
        { id, duration: 6000 },
      );
    } catch (e) {
      console.error('auto-sync failed', e);
      toast.error('Couldn’t auto-line-up — line it up with the offset slider instead.', { id });
    } finally {
      setRunning(false);
    }
  }, [songUrl, videoUrl, running, setReactionSync]);

  return { canAutoSync, running, runAutoSync };
}
