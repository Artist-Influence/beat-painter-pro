import React, { useEffect, useRef, useState } from 'react';
import { useStudioStore, type TimelineClip } from '@/stores/studioStore';
import { X, Plus } from 'lucide-react';

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const vizName = (key: string) => (key || '')
  .replace(/^custom_/, '').replace(/^preset_/, '').replace(/Visualizer$/, '').replace(/^Fractal/, '')
  .replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').trim() || 'Viz';

const bgLabel = (c: TimelineClip) =>
  c.bg?.type === 'video' ? 'Video' : c.bg?.type === 'image' ? 'Image' : c.bg?.type === 'gradient' ? 'Gradient' : c.bg?.type === 'transparent' ? 'Transparent' : 'Colour';

/**
 * Phase 3 - CapCut-style 2-track timeline. A strip scaled to the song duration with a
 * Visualizer track and a Background track. Clips drag to move, drag at the edges to
 * trim, and click to select (which seeks the playhead into them so the preview shows
 * that clip). The playhead engine (useTimeline) drives what's on stage and the export
 * follows it.
 */
export function TimelineEditor() {
  const audioElement = useStudioStore((s) => s.audioElement);
  const timeline = useStudioStore((s) => s.timeline);
  const { setTimelineEnabled, addClip, updateClip, removeClip, setSelectedClip } = useStudioStore();
  const areaRef = useRef<HTMLDivElement>(null);            // the TIMED area (clips + playhead), excludes labels
  const drag = useRef<{ id: string; mode: 'move' | 'l' | 'r'; x0: number; start: number; end: number; moved: boolean } | null>(null);
  const [now, setNow] = useState(0);
  const [dur, setDur] = useState(0);

  useEffect(() => {
    if (!audioElement) return;
    const onTime = () => setNow(audioElement.currentTime || 0);
    const onDur = () => setDur(audioElement.duration || 0);
    audioElement.addEventListener('timeupdate', onTime);
    audioElement.addEventListener('loadedmetadata', onDur);
    let raf = 0;
    const loop = () => { setNow(audioElement.currentTime || 0); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    onDur();
    return () => { audioElement.removeEventListener('timeupdate', onTime); audioElement.removeEventListener('loadedmetadata', onDur); cancelAnimationFrame(raf); };
  }, [audioElement]);

  const duration = dur || 1;
  const xToTime = (clientX: number) => {
    const r = areaRef.current?.getBoundingClientRect();
    if (!r) return 0;
    return clamp(((clientX - r.left) / r.width) * duration, 0, duration);
  };
  const seek = (t: number) => { if (audioElement) audioElement.currentTime = clamp(t, 0, duration); setNow(t); };

  const onClipDown = (clip: TimelineClip, mode: 'move' | 'l' | 'r') => (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    drag.current = { id: clip.id, mode, x0: e.clientX, start: clip.start, end: clip.end, moved: false };
    setSelectedClip(clip.id);
  };
  // Snap an edge to nearby magnets (clip edges on either track, the playhead, the
  // ends) within ~0.3s so clips line up cleanly like a real editor.
  const snapTime = (t: number, exceptId: string) => {
    const pts = [0, duration, now];
    for (const c of timeline.clips) { if (c.id !== exceptId) { pts.push(c.start, c.end); } }
    let best = t, bestD = 0.3;
    for (const p of pts) { const dd = Math.abs(t - p); if (dd < bestD) { bestD = dd; best = p; } }
    return best;
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const r = areaRef.current?.getBoundingClientRect();
    if (!r) return;
    if (Math.abs(e.clientX - d.x0) > 3) d.moved = true;
    const dt = ((e.clientX - d.x0) / r.width) * duration;
    if (d.mode === 'move') {
      const len = d.end - d.start;
      let start = clamp(d.start + dt, 0, duration - len);
      const sS = snapTime(start, d.id), sE = snapTime(start + len, d.id);
      if (sS !== start) start = clamp(sS, 0, duration - len);            // snap leading edge
      else if (sE !== start + len) start = clamp(sE - len, 0, duration - len); // else trailing edge
      updateClip(d.id, { start, end: start + len });
    } else if (d.mode === 'l') {
      updateClip(d.id, { start: clamp(snapTime(clamp(d.start + dt, 0, d.end - 0.5), d.id), 0, d.end - 0.5) });
    } else {
      updateClip(d.id, { end: clamp(snapTime(clamp(d.end + dt, d.start + 0.5, duration), d.id), d.start + 0.5, duration) });
    }
  };
  const onUp = () => {
    const d = drag.current;
    if (d && !d.moved) {
      const c = timeline.clips.find((x) => x.id === d.id); // click (no drag) → seek into the clip
      if (c) seek(c.start + 0.01);
    }
    drag.current = null;
  };

  // Drop a new clip into the next free gap on its track at the playhead, so clips
  // don't pile up on top of each other.
  const addAt = (track: 'viz' | 'bg') => {
    const st = useStudioStore.getState();
    const onTrack = st.timeline.clips.filter((c) => c.track === track).sort((a, b) => a.start - b.start);
    let start = clamp(now, 0, Math.max(0, duration - 0.5));
    // jump past any clips we're sitting in (iterate so back-to-back clips tile cleanly)
    for (let i = 0; i < onTrack.length; i++) {
      const c = onTrack.find((cl) => start >= cl.start && start < cl.end);
      if (!c) break;
      start = c.end;
    }
    const next = onTrack.find((c) => c.start >= start);
    const end = clamp(Math.min(start + 4, next ? next.start : duration), start + 0.5, duration);
    if (end - start < 0.5) return;                                   // no room here
    if (track === 'viz') addClip({ track, start, end, selected: st.selected as string, composite: st.composite });
    else addClip({ track, start, end, bg: st.background });
  };

  if (!audioElement) return <div className="px-4 py-3 text-caption text-center">Load a song to use the timeline.</div>;

  const ClipRow = ({ track }: { track: 'viz' | 'bg' }) => (
    <div className="relative h-9 rounded-md bg-surface-2/50 border border-hairline/40 overflow-hidden"
      onPointerDown={(e) => { if (e.target === e.currentTarget) seek(xToTime(e.clientX)); }}>
      {timeline.clips.filter((c) => c.track === track).map((c) => {
        const left = (c.start / duration) * 100;
        const width = Math.max(1.5, ((c.end - c.start) / duration) * 100);
        const sel = timeline.selectedClipId === c.id;
        const name = track === 'viz' ? vizName(c.selected || '') : bgLabel(c);
        return (
          <div key={c.id}
            className={`absolute top-0.5 bottom-0.5 rounded-[5px] border text-[10px] overflow-hidden cursor-grab active:cursor-grabbing ${sel ? 'border-ai-red bg-ai-red/25 shadow-glow z-10' : 'border-ai-red/40 bg-ai-red/12'}`}
            style={{ left: `${left}%`, width: `${width}%` }}
            onPointerDown={onClipDown(c, 'move')} onPointerMove={onMove} onPointerUp={onUp}>
            <div className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize bg-ai-red/50 hover:bg-ai-red" onPointerDown={onClipDown(c, 'l')} onPointerMove={onMove} onPointerUp={onUp} />
            <div className="absolute right-0 top-0 bottom-0 w-1.5 cursor-ew-resize bg-ai-red/50 hover:bg-ai-red" onPointerDown={onClipDown(c, 'r')} onPointerMove={onMove} onPointerUp={onUp} />
            <div className="px-2 h-full flex items-center text-text-primary truncate pointer-events-none">{name}</div>
          </div>
        );
      })}
    </div>
  );

  const selClip = timeline.clips.find((c) => c.id === timeline.selectedClipId) || null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-eyebrow">timeline</span>
          <button onClick={() => setTimelineEnabled(!timeline.enabled)}
            className={`pill text-xs ${timeline.enabled ? 'pill-active' : ''}`}
            title="When on, the song plays through your clips and the export follows them">
            {timeline.enabled ? 'On' : 'Off'}
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => addAt('viz')} className="pill text-xs" title="Add a visualizer clip at the playhead"><Plus className="w-3 h-3" /> Viz</button>
          <button onClick={() => addAt('bg')} className="pill text-xs" title="Add a background clip at the playhead"><Plus className="w-3 h-3" /> BG</button>
          {selClip && <button onClick={() => removeClip(selClip.id)} className="pill text-xs hover:text-ai-red" title="Remove the selected clip"><X className="w-3 h-3" /></button>}
        </div>
      </div>

      <div className="flex gap-2">
        <div className="w-9 shrink-0 flex flex-col gap-1.5 pt-0">
          <div className="h-9 flex items-center text-[10px] uppercase tracking-wide text-text-tertiary">Viz</div>
          <div className="h-9 flex items-center text-[10px] uppercase tracking-wide text-text-tertiary">BG</div>
        </div>
        <div ref={areaRef} className="relative flex-1 flex flex-col gap-1.5">
          <ClipRow track="viz" />
          <ClipRow track="bg" />
          {/* playhead spans both tracks */}
          <div className="absolute top-0 bottom-0 w-px bg-white pointer-events-none z-20" style={{ left: `${(now / duration) * 100}%` }} />
        </div>
      </div>

      <div className="flex items-center justify-between text-[10px] text-text-tertiary font-mono-num">
        <span>{fmt(now)}</span>
        <span className="text-text-secondary">{selClip ? `${fmt(selClip.start)} - ${fmt(selClip.end)} · ${selClip.track === 'viz' ? 'pick a visualizer + frame it' : 'set the background'}` : 'add a clip, then click it to edit'}</span>
        <span>{fmt(duration)}</span>
      </div>
    </div>
  );
}
