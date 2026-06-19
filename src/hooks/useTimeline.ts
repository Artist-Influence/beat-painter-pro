import { useEffect, useRef } from 'react';
import { useStudioStore } from '@/stores/studioStore';
import type { VisualizerKey } from '@/components/visualizers';

/**
 * Phase 3 - timeline playhead engine. While the timeline is enabled, watch the song
 * playhead and, when it crosses into a new clip, write that clip's visualizer +
 * framing (viz track) and background (bg track) into the live store. Because every
 * renderer AND the recorder read the live store, the preview and the exported MP4
 * both follow the timeline with no extra wiring.
 *
 * It applies on clip TRANSITIONS (by clip id), not every frame, so it never fights
 * per-frame audio writes or the user editing the currently-open clip. Selecting a
 * clip seeks the playhead into it (see the timeline UI), which triggers the apply.
 */
export function useTimeline() {
  const enabled = useStudioStore((s) => s.timeline.enabled);
  const audioElement = useStudioStore((s) => s.audioElement);
  const lastViz = useRef<string | null>(null);
  const lastBg = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !audioElement) { lastViz.current = null; lastBg.current = null; return; }
    let raf = 0;
    const tick = () => {
      const st = useStudioStore.getState();
      const t = audioElement.currentTime;
      const clips = st.timeline.clips;

      const vizClip = clips.find((c) => c.track === 'viz' && t >= c.start && t < c.end) || null;
      const bgClip = clips.find((c) => c.track === 'bg' && t >= c.start && t < c.end) || null;

      // Apply the active viz clip when it changes (id OR its stored selection/framing,
      // so editing the open clip is reflected live too).
      const vizKey = vizClip ? `${vizClip.id}:${vizClip.selected ?? ''}` : null;
      if (vizKey !== lastViz.current) {
        lastViz.current = vizKey;
        if (vizClip?.selected) {
          if (st.selected !== vizClip.selected) st.setSelected(vizClip.selected as VisualizerKey);
          if (vizClip.composite) st.setComposite(vizClip.composite);
        }
      }

      const bgKey = bgClip?.bg
        ? `${bgClip.id}:${bgClip.bg.type}:${bgClip.bg.color}:${bgClip.bg.mediaUrl ?? ''}:${bgClip.bg.gradientUrl ?? ''}`
        : null;
      if (bgKey !== lastBg.current) {
        lastBg.current = bgKey;
        if (bgClip?.bg) st.setBackground(bgClip.bg);
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [enabled, audioElement]);
}
