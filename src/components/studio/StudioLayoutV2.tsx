import React, { useEffect, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import VisualizerCanvas from '@/components/visualizer/VisualizerCanvas';
import { TopBar } from './v2/TopBar';
import { LeftPanel } from './v2/LeftPanel';
import { RightPanel } from './v2/RightPanel';
import { BottomBar } from './v2/BottomBar';
import { FloatingActions } from './v2/FloatingActions';
import { LogoOverlay } from './v2/LogoOverlay';
import { ReactionReelWizard } from './v2/ReactionReelWizard';
import { CompositeFrame } from './v2/CompositeFrame';
import { TimelineEditor } from './v2/TimelineEditor';
import { toast } from 'sonner';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useAutoPilot } from '@/hooks/useAutoPilot';
import { useTimeline } from '@/hooks/useTimeline';
import { useUserRole } from '@/hooks/useUserRole';
import { useReactionAutoSync } from '@/hooks/useReactionAutoSync';
import { useStudioStore, selectActiveComposite, AspectRatio, type CompositeState } from '@/stores/studioStore';
import { vizBox } from '@/lib/compositeLayout';

type LeftPanelType = 'visualizers' | 'styles' | null;
type RightPanelType = 'controls' | 'upload' | 'composite' | null;

const RATIO: Record<AspectRatio, number> = { horizontal: 16 / 9, vertical: 9 / 16, square: 1 };
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

// Fit a centered aspect-ratio stage inside the viewport, leaving dark margins
// for the floating chrome (header, transport, rails).
function useStageSize(aspect: AspectRatio, preview = false) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const compute = () => {
      // Preview = true fullscreen: the stage fills the ENTIRE viewport edge-to-edge
      // (no aspect-ratio letterbox / blank margins). The visualizer covers the screen.
      if (preview) {
        setSize({ w: window.innerWidth, h: window.innerHeight });
        return;
      }
      const phone = window.innerWidth < 640;
      const marginX = phone ? 10 : 32;
      const marginTop = phone ? 68 : 84;     // header
      const marginBottom = phone ? 112 : 96; // transport (taller chrome on mobile)
      const availW = Math.max(120, window.innerWidth - marginX * 2);
      const availH = Math.max(120, window.innerHeight - marginTop - marginBottom);
      const ratio = RATIO[aspect];
      let w = availW;
      let h = w / ratio;
      if (h > availH) { h = availH; w = h * ratio; }
      setSize({ w: Math.round(w), h: Math.round(h) });
    };
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, [aspect, preview]);
  return size;
}

export function StudioLayoutV2() {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const bgRef = React.useRef<HTMLDivElement>(null);
  const stageElRef = React.useRef<HTMLDivElement>(null);
  const [showTimeline, setShowTimeline] = React.useState(false);
  const vizFadeRef = React.useRef<HTMLDivElement>(null);
  const { logo, background, exportAspectRatio, backgroundReactive, composite, setComposite, filters, zoomLevel, audioElement, reactionSync, reactionWizardOpen, previewMode, setPreviewMode, setReactionWizardOpen, layers, activeLayerId, setActiveComposite, setActiveLayerId, timeline, selected } = useStudioStore();
  // Fade the visualizer in when it switches (timeline or manual) - hides the brief
  // mount-flash without remounting the canvas (so the recorder + WebGL context stay).
  React.useEffect(() => {
    vizFadeRef.current?.animate?.([{ opacity: 0 }, { opacity: 1 }], { duration: 280, easing: 'ease-out' });
  }, [selected]);
  const stage = useStageSize(exportAspectRatio, previewMode);
  const { isAdmin } = useUserRole();

  // Offer to auto-line-up a freshly-added reaction video to the song (once per clip).
  const { runAutoSync } = useReactionAutoSync();
  const autoSyncOfferedRef = React.useRef<string | null>(null);
  useEffect(() => {
    const url = background.type === 'video' ? background.mediaUrl : null;
    if (!url || !audioElement || autoSyncOfferedRef.current === url) return;
    autoSyncOfferedRef.current = url;
    toast('Line up your video to the song automatically?', {
      description: 'We’ll match the audio in your clip to the track so reactions sync up.',
      action: { label: 'Auto-sync', onClick: () => runAutoSync() },
      duration: 12000,
    });
  }, [background.type, background.mediaUrl, audioElement, runAutoSync]);

  // "Get started" card: show once per browser session, and never for the admin.
  const [gsDismissed, setGsDismissed] = useState(() => {
    try { return sessionStorage.getItem('bp_getstarted_seen') === '1'; } catch { return false; }
  });
  const dismissGetStarted = React.useCallback(() => {
    try { sessionStorage.setItem('bp_getstarted_seen', '1'); } catch { /* private mode */ }
    setGsDismissed(true);
  }, []);
  // Loading a song counts as "session started" - don't pop it back up afterwards.
  useEffect(() => { if (audioElement) dismissGetStarted(); }, [audioElement, dismissGetStarted]);

  // Enter preview = go true OS fullscreen (the click is the required user gesture)
  // AND fill the viewport, so the visualizer is edge-to-edge with no blank margins.
  const enterPreview = React.useCallback(() => {
    setPreviewMode(true);
    document.documentElement.requestFullscreen?.().catch(() => {});
  }, [setPreviewMode]);

  // Exiting preview also drops out of true fullscreen (TV mode), so a single
  // tap / Esc fully returns to the editor instead of leaving a half-exited state.
  const exitPreview = React.useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    setPreviewMode(false);
  }, [setPreviewMode]);

  // If the user leaves browser fullscreen (Esc / F11), drop out of preview too.
  useEffect(() => {
    const onFs = () => { if (!document.fullscreenElement && previewMode) setPreviewMode(false); };
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, [previewMode, setPreviewMode]);

  // Esc exits preview-framing mode.
  useEffect(() => {
    if (!previewMode) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPreviewMode(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [previewMode, setPreviewMode]);

  // Effects + zoom applied as CSS on the visualizer wrapper so they work for
  // EVERY visualizer type (fractal shader, mesh, procedural model, 2D).
  const effectFilter = `brightness(${filters.brightness}%) saturate(${filters.saturation}%) contrast(${filters.contrast}%)`;
  // Framing (size/crop/position) always applies - default scale 1 / centered / no
  // mask = fullscreen. Computed per composite so it works for the primary visualizer
  // AND each extra layer (Phase 2). Returns the CSS box for the visualizer plus an
  // optional black backing behind it (for the blend-drops-background case).
  const computeVizStyle = (comp: CompositeState): { vizStyle: React.CSSProperties; backingStyle: React.CSSProperties | null } => {
    const maskRound = comp.mask === 'circle' ? '50%' : comp.mask === 'rounded' ? '8%' : '0';
    const blendSel = comp.blend ?? 'normal';
    const vizBlend = blendSel === 'normal' ? undefined : blendSel;
    const rot = comp.rotate ?? 0;
    const op = comp.opacity ?? 1;
    const feather = comp.feather ?? 0;
    const featherMask = feather > 0
      ? `radial-gradient(ellipse 100% 100% at 50% 50%, #000 ${Math.round((1 - feather) * 100)}%, transparent 100%)`
      : undefined;
    const rotStr = rot ? ` rotate(${rot}deg)` : '';
    const box = vizBox(comp, exportAspectRatio);
    let clip: string | undefined;
    if (comp.crop) {
      const winL = comp.x - comp.cropW / 2, winR = comp.x + comp.cropW / 2;
      const winT = comp.y - comp.cropH / 2, winB = comp.y + comp.cropH / 2;
      const lL = clamp01((winL - box.left) / box.w), lR = clamp01((winR - box.left) / box.w);
      const lT = clamp01((winT - box.top) / box.h), lB = clamp01((winB - box.top) / box.h);
      const ins = (v: number) => (v * 100).toFixed(2);
      clip = `inset(${ins(lT)}% ${ins(1 - lR)}% ${ins(1 - lB)}% ${ins(lL)}% round ${maskRound})`;
    } else {
      clip = comp.mask === 'circle' ? 'circle(50% at 50% 50%)'
        : comp.mask === 'rounded' ? 'inset(0 round 8%)' : undefined;
    }
    const boxGeom: React.CSSProperties = {
      position: 'absolute',
      left: `${(box.left * 100).toFixed(3)}%`,
      top: `${(box.top * 100).toFixed(3)}%`,
      width: `${(box.w * 100).toFixed(3)}%`,
      height: `${(box.h * 100).toFixed(3)}%`,
      right: 'auto',
      bottom: 'auto',
      transform: rotStr.trim() || undefined,
      transformOrigin: 'center',
      clipPath: clip,
      WebkitClipPath: clip,
      maskImage: featherMask,
      WebkitMaskImage: featherMask,
    };
    const vizStyle = { ...boxGeom, filter: effectFilter, mixBlendMode: vizBlend, opacity: op } as React.CSSProperties;
    const bgOpacity = comp.bgOpacity ?? 0;
    const backingStyle = (vizBlend && bgOpacity > 0)
      ? ({ ...boxGeom, backgroundColor: '#000', opacity: bgOpacity } as React.CSSProperties)
      : null;
    return { vizStyle, backingStyle };
  };

  const { vizStyle, backingStyle } = computeVizStyle(composite);
  // Each extra layer's style + its own canvas, stacked above the primary.
  const layerStyles = layers.map((l) => ({ layer: l, ...computeVizStyle(l.composite) }));
  // The composite the Frame/controls currently edit: timeline clip > layer > primary.
  const activeComposite = selectActiveComposite(useStudioStore.getState());

  // Reactive background: pulse brightness + shift hue with the music.
  useEffect(() => {
    if (!backgroundReactive) {
      if (bgRef.current) bgRef.current.style.filter = '';
      return;
    }
    let raf = 0;
    const tick = () => {
      const a = (window as any).__AUDIO_LEVEL__ || { level: 0, beat: 0 };
      if (bgRef.current) {
        bgRef.current.style.filter = `brightness(${(1 + a.beat * 0.6).toFixed(3)}) saturate(${(1 + a.level * 0.8).toFixed(3)}) hue-rotate(${Math.round(a.level * 60)}deg)`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [backgroundReactive]);

  // Reaction Reel sync: the song (audioElement) is the master clock - drive the
  // background reaction video's playhead from it (+ a nudgeable offset) so the
  // person's movements line up with the audio-reactive visualizer. Drift-corrected
  // so the video plays smoothly and only re-seeks when it diverges.
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !reactionSync.enabled || background.type !== 'video' || !audioElement) return;
    let raf = 0;
    const loop = () => {
      const a = audioElement;
      if (a && v) {
        const off = useStudioStore.getState().reactionSync.offset;
        const target = a.currentTime + off;
        const dur = v.duration;
        if (dur && isFinite(dur)) {
          const last = dur - 0.05;
          if (target >= last) {
            // The clip is shorter than the song - hold on the last frame instead of
            // jittering between the final frames (re-seeking near the end looped badly).
            if (!v.paused) v.pause();
            if (Math.abs(v.currentTime - last) > 0.06) { try { v.currentTime = last; } catch {} }
          } else {
            const clamped = Math.max(0, target);
            if (Math.abs(v.currentTime - clamped) > 0.08) { try { v.currentTime = clamped; } catch {} }
            if (!a.paused && v.paused) { v.play().catch(() => {}); }
            else if (a.paused && !v.paused) { v.pause(); }
          }
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [reactionSync.enabled, background.type, background.mediaUrl, audioElement]);
  const [activePanels, setActivePanels] = useState({
    left: 'visualizers' as LeftPanelType,
    right: 'controls' as RightPanelType,
    bottom: true,
  });

  useKeyboardShortcuts();
  useAutoPilot();
  useTimeline();

  // Let the Reaction Reel wizard open the relevant side panel for each step.
  useEffect(() => {
    const handler = (e: Event) => {
      const d = (e as CustomEvent).detail as { side: 'left' | 'right'; panel: LeftPanelType | RightPanelType };
      if (!d) return;
      setActivePanels((p) => ({ ...p, [d.side]: d.panel as any }));
    };
    window.addEventListener('studio:open-panel', handler as EventListener);
    return () => window.removeEventListener('studio:open-panel', handler as EventListener);
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden">
      {/* Centered preview stage - the canvas lives in its chosen aspect frame,
          floating on the dark void with generous margin. */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          ref={stageElRef}
          className={`relative overflow-hidden ${previewMode ? '' : 'rounded-xl'}`}
          style={{
            width: stage.w || undefined,
            height: stage.h || undefined,
            boxShadow: previewMode ? 'none' : '0 24px 80px hsl(225 18% 2% / 0.6)',
          }}
          onDoubleClick={() => { if (!previewMode) setActiveComposite({ enabled: true }); }}
        >
          {/* hairline frame */}
          <div className="absolute inset-0 rounded-xl border border-hairline/60 pointer-events-none z-[20]" />

          {/* Background Layer - Color, Gradient, Transparent, Image, or Video */}
          <div ref={bgRef} className="absolute inset-0 z-[0]" style={{ willChange: 'filter' }}>
          {background.type === 'video' && background.mediaUrl ? (
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover z-[0]"
              style={{ objectPosition: `center ${background.positionY}%` }}
              src={background.mediaUrl}
              autoPlay
              loop={!reactionSync.enabled}
              muted
              playsInline
            />
          ) : background.type === 'image' && background.mediaUrl ? (
            <img
              className="absolute inset-0 w-full h-full object-cover z-[0]"
              style={{ objectPosition: `center ${background.positionY}%` }}
              src={background.mediaUrl}
              alt="Background"
            />
          ) : background.type === 'gradient' && background.gradientUrl ? (
            <img
              className="absolute inset-0 w-full h-full object-cover z-[0]"
              src={background.gradientUrl}
              alt="Background gradient"
            />
          ) : background.type === 'transparent' ? (
            // checkerboard so the user can see what is transparent (exports with alpha)
            <div
              className="absolute inset-0 z-[0]"
              style={{
                backgroundImage:
                  'linear-gradient(45deg, hsl(225 10% 16%) 25%, transparent 25%), linear-gradient(-45deg, hsl(225 10% 16%) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, hsl(225 10% 16%) 75%), linear-gradient(-45deg, transparent 75%, hsl(225 10% 16%) 75%)',
                backgroundSize: '24px 24px',
                backgroundPosition: '0 0, 0 12px, 12px -12px, -12px 0',
                backgroundColor: 'hsl(225 12% 10%)',
              }}
            />
          ) : (
            <div className="absolute inset-0 z-[0]" style={{ backgroundColor: background.color }} />
          )}
          </div>

          {/* Logo behind visualizer */}
          {logo.layer === 'behind' && (
            <div className="absolute inset-0 z-[1]">
              <LogoOverlay />
            </div>
          )}

          {/* Black backing behind the visualizer - brings back its dark background
              over the clip (bgOpacity) when a blend would otherwise drop it. */}
          {backingStyle && <div className="z-[2] pointer-events-none" style={backingStyle} />}

          {/* Visualizer Canvas (occupies its composite box; blends over the backing/clip).
              A switch fades the wrapper in (Web Animations) so the new visualizer's
              mount-flash is hidden - WITHOUT remounting the canvas (which would break
              the recorder's canvas reference + drop the WebGL context each cut). */}
          <div className="z-[2]" style={vizStyle}>
            <div ref={vizFadeRef} className="w-full h-full">
              <VisualizerCanvas canvasRef={canvasRef} logoBehind={logo.layer === 'behind'} />
            </div>
          </div>

          {/* Extra visualizer layers (Phase 2): each its own canvas + framing, stacked
              above the primary over the shared background. */}
          {layerStyles.map(({ layer, vizStyle: lStyle, backingStyle: lBacking }) => (
            <React.Fragment key={layer.id}>
              {lBacking && <div className="z-[3] pointer-events-none" style={lBacking} />}
              <div className="z-[3]" style={lStyle}>
                <VisualizerCanvas overrideSelected={layer.selected} layerId={layer.id} />
              </div>
            </React.Fragment>
          ))}

          {/* Direct manipulation: double-click the visualizer to select it (show the
              move/resize/rotate handles); click empty space to deselect. The frame
              targets the ACTIVE layer (primary or an extra layer). */}
          {activeComposite.enabled && !previewMode && (
            <CompositeFrame stageRef={stageElRef} onDeselect={() => setActiveComposite({ enabled: false })} />
          )}

          {/* First-run empty state - shown once per session, and never to the admin.
              No song yet → guide into the Reaction Reel flow. */}
          {!audioElement && !reactionWizardOpen && !previewMode && !isAdmin && !gsDismissed && (
            <div className="absolute inset-0 z-[16] flex items-center justify-center p-5">
              <div className="relative max-w-xs w-full text-center glass-panel rounded-2xl p-6 space-y-3 backdrop-blur-xl bg-[hsl(225_18%_6%/0.82)]">
                <button
                  onClick={dismissGetStarted}
                  title="Dismiss"
                  className="absolute top-2 right-2 w-7 h-7 grid place-items-center rounded-full text-text-tertiary hover:text-text-primary hover:bg-white/5 transition-colors"
                >
                  <span className="text-lg leading-none">×</span>
                </button>
                <p className="text-eyebrow">get started</p>
                <h2 className="text-text-primary text-lg font-semibold leading-tight">Make a reactive music video</h2>
                <p className="text-caption">Add your song, drop a visualizer over your clip, and export for socials - in a few taps.</p>
                <button
                  onClick={() => { dismissGetStarted(); setReactionWizardOpen(true); }}
                  className="btn btn-primary !rounded-full w-full h-11 font-semibold"
                >
                  Start - guided setup
                </button>
                <p className="text-caption opacity-70">or use the panels to set it up yourself</p>
              </div>
            </div>
          )}

          {/* Logo in front of visualizer */}
          {logo.layer === 'front' && (
            <div className="absolute inset-0 z-[10] pointer-events-none">
              <LogoOverlay />
            </div>
          )}
        </div>
      </div>

      {/* Floating chrome over the void (all hidden in preview-framing mode) */}
      {!previewMode && <TopBar canvasRef={canvasRef} />}

      {!previewMode && (
        <LeftPanel
          activePanel={activePanels.left}
          setActivePanel={(panel) => setActivePanels({ ...activePanels, left: panel })}
        />
      )}

      {!previewMode && (
        <RightPanel
          activePanel={activePanels.right}
          setActivePanel={(panel) => setActivePanels({ ...activePanels, right: panel })}
        />
      )}

      {!previewMode && (
        <BottomBar
          isVisible={activePanels.bottom}
          onToggle={(visible) => setActivePanels({ ...activePanels, bottom: visible })}
        />
      )}

      {!previewMode && <FloatingActions />}

      {reactionWizardOpen && !previewMode && <ReactionReelWizard />}

      {/* Preview framing: a one-tap clean look at the export frame */}
      {!previewMode && !reactionWizardOpen && (
        <button
          onClick={enterPreview}
          title="Fullscreen preview - hide all controls (Esc to exit)"
          className="absolute bottom-32 sm:bottom-24 left-4 z-50 p-3 glass-panel glass-panel-interactive !rounded-full transition-colors"
        >
          <Eye className="w-5 h-5 text-text-tertiary" />
        </button>
      )}

      {/* Timeline toggle - sequence visualizers/backgrounds over the song (Phase 3) */}
      {!previewMode && !reactionWizardOpen && (
        <button
          onClick={() => setShowTimeline((v) => !v)}
          title="Timeline - sequence visualizers & backgrounds over the song"
          className={`absolute bottom-32 sm:bottom-24 left-[4.5rem] z-50 h-11 px-4 glass-panel glass-panel-interactive !rounded-full transition-colors text-sm font-semibold ${showTimeline || timeline.enabled ? 'text-ai-red' : 'text-text-tertiary'}`}
        >
          Timeline{timeline.enabled ? ' · on' : ''}
        </button>
      )}

      {/* Timeline panel above the transport */}
      {!previewMode && !reactionWizardOpen && showTimeline && (
        <div className="absolute bottom-24 sm:bottom-[5.5rem] left-2 right-2 sm:left-4 sm:right-4 z-40 glass-panel !rounded-xl p-3 max-w-5xl mx-auto">
          <TimelineEditor />
        </div>
      )}

      {previewMode && (
        <>
          {/* tap anywhere to exit */}
          <div className="fixed inset-0 z-[54]" onPointerDown={exitPreview} />
          <button
            onClick={exitPreview}
            className="fixed left-1/2 -translate-x-1/2 z-[56] flex items-center gap-2 px-4 h-10 glass-panel !rounded-full text-sm text-text-secondary"
            style={{ top: 'max(0.75rem, env(safe-area-inset-top))' }}
          >
            <EyeOff className="w-4 h-4 text-ai-red" /> Tap anywhere to exit preview
          </button>
        </>
      )}
    </div>
  );
}
