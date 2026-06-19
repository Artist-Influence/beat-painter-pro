import React, { useRef } from 'react';
import { RotateCw } from 'lucide-react';
import { useStudioStore, selectActiveComposite } from '@/stores/studioStore';
import { vizBox } from '@/lib/compositeLayout';

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/**
 * Direct-manipulation overlay for positioning the visualizer over the stage:
 * drag the body to move it anywhere, drag a corner to resize (in crop mode the
 * corners size the crop window; otherwise they scale the whole visualizer), and
 * drag the top knob to rotate. The dashed frame rotates with the visualizer so
 * the handles always track what you see.
 */
export function CompositeFrame({ stageRef, onDeselect }: { stageRef: React.RefObject<HTMLDivElement>; onDeselect?: () => void }) {
  // Edit the active framing target (selected timeline clip > active layer > primary)
  // so the on-stage handles frame whatever is currently selected.
  const composite = useStudioStore(selectActiveComposite);
  const setComposite = useStudioStore((s) => s.setActiveComposite);
  const exportAspect = useStudioStore((s) => s.exportAspectRatio);
  const outerRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ mode: string; sx: number; sy: number; cx: number; cy: number } | null>(null);

  const crop = composite.crop;
  // The frame matches the visualizer's box: the crop window in crop mode, otherwise
  // the aspect-ratio box (vizAspect may differ from the export frame).
  const box = crop
    ? { w: composite.cropW, h: composite.cropH, left: composite.x - composite.cropW / 2, top: composite.y - composite.cropH / 2, fw: composite.cropW, fh: composite.cropH }
    : vizBox(composite, exportAspect);
  const { w, h, left, top } = box;
  const rot = composite.rotate ?? 0;

  const norm = (e: React.PointerEvent) => {
    const r = stageRef.current?.getBoundingClientRect();
    if (!r) return { x: 0.5, y: 0.5 };
    return { x: clamp((e.clientX - r.left) / r.width, 0, 1), y: clamp((e.clientY - r.top) / r.height, 0, 1) };
  };

  const onDown = (mode: string) => (e: React.PointerEvent) => {
    e.stopPropagation();
    try { outerRef.current?.setPointerCapture(e.pointerId); } catch {}
    const p = norm(e);
    drag.current = { mode, sx: p.x, sy: p.y, cx: composite.x, cy: composite.y };
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const d = drag.current;
    if (d.mode === 'rotate') {
      // angle in real pixels (stage is non-square) so rotation tracks the cursor 1:1
      const r = stageRef.current?.getBoundingClientRect();
      if (!r) return;
      const cx = composite.x * r.width, cy = composite.y * r.height;
      const ang = Math.atan2((e.clientY - r.top) - cy, (e.clientX - r.left) - cx) * 180 / Math.PI + 90;
      let deg = ang;
      while (deg > 180) deg -= 360;
      while (deg < -180) deg += 360;
      // snap to 0/±90/180 within 4° so upright/quarter-turns are easy to hit
      for (const s of [0, 90, -90, 180, -180]) if (Math.abs(deg - s) < 4) deg = s;
      setComposite({ rotate: Math.round(deg) });
      return;
    }
    const p = norm(e);
    if (d.mode === 'move') {
      setComposite({ x: clamp(d.cx + (p.x - d.sx), 0, 1), y: clamp(d.cy + (p.y - d.sy), 0, 1) });
    } else {
      const hw = Math.abs(p.x - composite.x), hh = Math.abs(p.y - composite.y);
      if (crop) setComposite({ cropW: clamp(hw * 2, 0.1, 1), cropH: clamp(hh * 2, 0.1, 1) });
      // derive scale from the dragged half-extent relative to the fit box, so resize
      // tracks the corner for any visualizer aspect (fw/fh = the box at scale 1).
      else setComposite({ scale: clamp(Math.max((hw * 2) / box.fw, (hh * 2) / box.fh), 0.05, 4) });
    }
  };
  const onUp = (e: React.PointerEvent) => { drag.current = null; try { outerRef.current?.releasePointerCapture(e.pointerId); } catch {} };

  const Handle = ({ pos, cursor, mode }: { pos: React.CSSProperties; cursor: string; mode: string }) => (
    <div onPointerDown={onDown(mode)}
      className="absolute w-5 h-5 rounded-full bg-ai-red border-2 border-white shadow-glow hover:scale-125 transition-transform"
      style={{ ...pos, transform: 'translate(-50%, -50%)', cursor, touchAction: 'none' }} />
  );

  return (
    <div ref={outerRef} className="absolute inset-0 z-[15]" onPointerMove={onMove} onPointerUp={onUp}
      onPointerDown={(e) => { if (e.target === outerRef.current) onDeselect?.(); }}
      style={{ touchAction: 'none' }}>
      <div
        className="absolute border-2 border-dashed border-ai-red/90 rounded-sm cursor-move"
        style={{ left: `${left * 100}%`, top: `${top * 100}%`, width: `${w * 100}%`, height: `${h * 100}%`, transform: `rotate(${rot}deg)`, transformOrigin: 'center', touchAction: 'none' }}
        onPointerDown={onDown('move')}
      >
        <div className="absolute -top-6 left-0 text-[10px] font-mono-num text-ai-red bg-[hsl(225_18%_6%/0.72)] px-1.5 py-0.5 rounded whitespace-nowrap pointer-events-none">
          {crop ? `crop ${Math.round(w * 100)}×${Math.round(h * 100)}` : `${composite.scale.toFixed(2)}×`}{rot ? ` · ${rot}°` : ''} · drag to move
        </div>
        <Handle pos={{ left: 0, top: 0 }} cursor="nwse-resize" mode="tl" />
        <Handle pos={{ left: '100%', top: 0 }} cursor="nesw-resize" mode="tr" />
        <Handle pos={{ left: 0, top: '100%' }} cursor="nesw-resize" mode="bl" />
        <Handle pos={{ left: '100%', top: '100%' }} cursor="nwse-resize" mode="br" />

        {/* Rotate handle: a knob on a stalk above the top edge, rotates with the frame. */}
        <div className="absolute left-1/2 -translate-x-1/2 bottom-full w-px h-7 bg-ai-red/70 pointer-events-none" />
        <div onPointerDown={onDown('rotate')}
          className="absolute left-1/2 w-6 h-6 rounded-full bg-ai-red border-2 border-white shadow-glow hover:scale-125 transition-transform flex items-center justify-center"
          style={{ top: 0, transform: 'translate(-50%, calc(-100% - 1.75rem))', cursor: 'grab', touchAction: 'none' }}
          title="Drag to rotate">
          <RotateCw className="w-3 h-3 text-white" />
        </div>
      </div>
    </div>
  );
}
