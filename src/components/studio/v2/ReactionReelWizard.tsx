import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wand2, Music, Film, Play, Pause, Crop, Move, Download, X,
  ChevronLeft, ChevronRight, Check, RotateCcw, Clapperboard, Square, RectangleVertical, RectangleHorizontal,
} from 'lucide-react';
import { useStudioStore, type AspectRatio, type ExportQuality } from '@/stores/studioStore';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';

const openPanel = (side: 'left' | 'right', panel: string) =>
  window.dispatchEvent(new CustomEvent('studio:open-panel', { detail: { side, panel } }));

const STEPS = [
  { key: 'visualizer', title: 'Visualizer & song', eyebrow: 'step 1', icon: Wand2 },
  { key: 'video', title: 'Reaction video', eyebrow: 'step 2', icon: Film },
  { key: 'sync', title: 'Sync it up', eyebrow: 'step 3', icon: Clapperboard },
  { key: 'frame', title: 'Position & crop', eyebrow: 'step 4', icon: Crop },
  { key: 'export', title: 'Export for socials', eyebrow: 'step 5', icon: Download },
] as const;

const FMT: { key: AspectRatio; label: string; icon: React.ReactNode; hint: string }[] = [
  { key: 'vertical', label: '9:16', icon: <RectangleVertical className="w-4 h-4" />, hint: 'Reels · TikTok · Shorts' },
  { key: 'square', label: '1:1', icon: <Square className="w-4 h-4" />, hint: 'Feed posts' },
  { key: 'horizontal', label: '16:9', icon: <RectangleHorizontal className="w-4 h-4" />, hint: 'YouTube · landscape' },
];

function StepDot({ active, done, onClick }: { active: boolean; done: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`h-1.5 rounded-full transition-all ${active ? 'w-6 bg-ai-red' : done ? 'w-1.5 bg-ai-red/60' : 'w-1.5 bg-hairline'}`} />
  );
}

export function ReactionReelWizard() {
  const {
    selected, audioElement, audioFileName, background, composite, reactionSync, exportAspectRatio, exportQuality,
    setAudioElement, setBackgroundMedia, setComposite, setReactionSync, setExportAspectRatio, setExportQuality, setReactionWizardOpen,
    setSelected, resetDawOverride,
  } = useStudioStore();
  const isMobile = useIsMobile();

  const [step, setStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const songInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const hasSong = !!audioElement;
  const hasVideo = background.type === 'video' && !!background.mediaUrl;
  const stepDone = [hasSong, hasVideo, hasVideo, hasVideo, hasVideo];

  // On desktop, auto-open the most useful side panel for each step. On mobile the
  // panels are bottom sheets that would cover the wizard, so we skip auto-open —
  // the wizard's own inline controls (and explicit "Browse" buttons) drive the flow.
  useEffect(() => {
    if (isMobile) return;
    if (step === 0) openPanel('left', 'visualizers');
    if (step === 1) openPanel('right', 'upload');
    if (step === 3) openPanel('right', 'composite');
  }, [step, isMobile]);

  // track play state for the sync step
  useEffect(() => {
    if (!audioElement) { setIsPlaying(false); return; }
    const on = () => setIsPlaying(true), off = () => setIsPlaying(false);
    audioElement.addEventListener('play', on);
    audioElement.addEventListener('pause', off);
    setIsPlaying(!audioElement.paused);
    return () => { audioElement.removeEventListener('play', on); audioElement.removeEventListener('pause', off); };
  }, [audioElement]);

  const loadSong = (file: File) => {
    if (!file.type.startsWith('audio/')) {
      toast.error('That doesn’t look like an audio file. Try an MP3, WAV, or M4A.');
      return;
    }
    const audio = new Audio(URL.createObjectURL(file));
    audio.crossOrigin = 'anonymous';
    setAudioElement(audio, file.name);
    toast.success('Song loaded — it drives the visualizer and your reel audio.');
  };
  const loadVideo = (file: File) => {
    if (!file.type.startsWith('video/')) {
      toast.error('Please choose a video file (MP4, WebM, or MOV).');
      return;
    }
    setBackgroundMedia(URL.createObjectURL(file), 'video');
    setReactionSync({ enabled: true, offset: 0 });
    toast.success('Reaction video added. Now line it up in the next step.');
  };

  const togglePlay = () => { if (audioElement) (audioElement.paused ? audioElement.play() : audioElement.pause()); };
  const nudge = (d: number) => setReactionSync({ offset: Math.max(-15, Math.min(15, +(reactionSync.offset + d).toFixed(3))) });

  const layout = (p: Partial<typeof composite>) => setComposite(p as any);

  const exportReel = () => {
    if (!hasSong) { toast.error('Load a song first (step 1).'); return; }
    if (!hasVideo) { toast.error('Add your reaction video first (step 2).'); return; }
    // Close the wizard before exporting so it doesn't float over the STOP button.
    setReactionWizardOpen(false);
    window.dispatchEvent(new CustomEvent('reaction-reel:export'));
  };

  const close = () => setReactionWizardOpen(false);
  const StepIcon = STEPS[step].icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={isMobile ? { opacity: 0, y: 60 } : { opacity: 0, y: -16, scale: 0.97 }}
        animate={isMobile ? { opacity: 1, y: 0 } : { opacity: 1, y: 0, scale: 1 }}
        exit={isMobile ? { opacity: 0, y: 60 } : { opacity: 0, y: -16, scale: 0.97 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className={isMobile
          ? 'fixed inset-x-0 bottom-0 z-[60] w-full glass-panel !rounded-b-none rounded-t-2xl p-4 pb-[max(1rem,env(safe-area-inset-bottom))] max-h-[62vh] overflow-y-auto pointer-events-auto'
          : 'fixed top-20 left-1/2 -translate-x-1/2 z-[60] w-[560px] max-w-[calc(100vw-2rem)] glass-panel p-5 pointer-events-auto'}
      >
        {/* header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-eyebrow">reaction reel · {STEPS[step].eyebrow}</p>
            <h3 className="text-text-primary text-base font-semibold flex items-center gap-2">
              <StepIcon className="w-4 h-4 text-ai-red" /> {STEPS[step].title}
            </h3>
          </div>
          <button onClick={close} className="p-1.5 hover:bg-ai-red/[0.08] rounded-md transition-colors">
            <X className="w-4 h-4 text-text-tertiary" />
          </button>
        </div>

        {/* progress dots */}
        <div className="flex items-center gap-1.5 mb-4">
          {STEPS.map((s, i) => (
            <StepDot key={s.key} active={i === step} done={i < step || stepDone[i]} onClick={() => setStep(i)} />
          ))}
        </div>

        {/* hidden inputs */}
        <input ref={songInputRef} type="file" accept="audio/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) loadSong(f); }} />
        <input ref={videoInputRef} type="file" accept="video/mp4,video/webm,video/quicktime" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) loadVideo(f); }} />

        {/* ---- step body ---- */}
        <div className="min-h-[150px]">
          {step === 0 && (
            <div className="space-y-3">
              <p className="text-caption">Pick a visualizer from the library on the left (or hit <span className="text-text-secondary">Generate</span>), then load the song it reacts to. The song is your reel's audio.</p>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => openPanel('left', 'visualizers')} className="btn btn-glass h-10 text-sm">
                  <Wand2 className="w-4 h-4" /> Browse visualizers
                </button>
                <button onClick={() => songInputRef.current?.click()} className="btn btn-primary h-10 text-sm">
                  <Music className="w-4 h-4" /> {hasSong ? 'Change song' : 'Load song'}
                </button>
              </div>
              <div className="space-y-1">
                <p className="text-eyebrow">quick picks</p>
                <div className="grid grid-cols-3 gap-1.5">
                  <button onClick={() => { resetDawOverride(); setSelected('DawPurpleSpectral' as any); }} className="pill justify-center !px-1 !text-[0.7rem]">🎛️ DAW</button>
                  <button onClick={() => setSelected('Sand3D0' as any)} className="pill justify-center !px-1 !text-[0.7rem]">🦄 3D Sand</button>
                  <button onClick={() => setSelected('FractalRandom' as any)} className="pill justify-center !px-1 !text-[0.7rem]">🎲 Fractal</button>
                </div>
              </div>
              <div className="space-y-1.5 pt-1">
                <Status ok label="Visualizer" value={selected.replace(/Visualizer$/, '').replace(/([A-Z])/g, ' $1').trim() || '—'} />
                <Status ok={hasSong} label="Song" value={hasSong ? (audioFileName ?? 'Loaded') : 'Not loaded'} />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              <p className="text-caption">Upload the clip of you reacting to the song. It becomes the background; the visualizer sits on top.</p>
              <button onClick={() => videoInputRef.current?.click()} className="btn btn-primary w-full h-11 text-sm">
                <Film className="w-4 h-4" /> {hasVideo ? 'Replace reaction video' : 'Upload reaction video'}
              </button>
              {hasVideo && (
                <div className="flex items-center gap-3 p-2.5 rounded-md bg-surface-2/40 border border-hairline/50">
                  <video src={background.mediaUrl!} className="w-16 h-10 object-cover rounded" muted />
                  <span className="text-sm text-text-secondary">Reaction video ready</span>
                  <Check className="w-4 h-4 text-ai-red ml-auto" />
                </div>
              )}
              <p className="text-caption">MP4, WebM or MOV. Filmed yourself to the same song? Perfect — the next step lines it up.</p>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <p className="text-caption">Press play and nudge the offset until your movements land on the beat. The song is the clock; your video slides to match.</p>
              <div className="flex items-center gap-3">
                <button onClick={togglePlay} disabled={!hasSong}
                  className="btn btn-primary h-11 w-11 !p-0 shrink-0 disabled:opacity-40">
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </button>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-text-secondary">Video offset</span>
                    <span className="text-xs text-text-tertiary font-mono-num">{reactionSync.offset >= 0 ? '+' : ''}{reactionSync.offset.toFixed(2)}s</span>
                  </div>
                  <input type="range" className="ai-range" min={-15} max={15} step={0.01}
                    value={reactionSync.offset} onChange={(e) => setReactionSync({ offset: parseFloat(e.target.value) })} />
                </div>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                <button onClick={() => nudge(-0.1)} className="pill justify-center !px-1 !text-xs">−0.1s</button>
                <button onClick={() => nudge(-0.033)} className="pill justify-center !px-1 !text-xs">−1f</button>
                <button onClick={() => setReactionSync({ offset: 0 })} className="pill justify-center !px-1 !text-xs"><RotateCcw className="w-3 h-3" /></button>
                <button onClick={() => nudge(0.033)} className="pill justify-center !px-1 !text-xs">+1f</button>
                <button onClick={() => nudge(0.1)} className="pill justify-center !px-1 !text-xs">+0.1s</button>
              </div>
              {!hasVideo && <p className="text-caption text-ai-red/80">Upload a reaction video in step 2 first.</p>}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <p className="text-caption">Place the visualizer in your frame. Drag it on the stage, or use a quick layout. Fine-tune in the Composite panel on the right.</p>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => layout({ enabled: true, crop: false, scale: 0.38, x: 0.78, y: 0.8, mask: 'rounded' })} className="btn btn-glass h-10 text-sm"><Move className="w-4 h-4" /> Corner</button>
                <button onClick={() => layout({ enabled: true, crop: false, scale: 0.6, x: 0.5, y: 0.78, mask: 'rounded' })} className="btn btn-glass h-10 text-sm"><Move className="w-4 h-4" /> Lower band</button>
                <button onClick={() => layout({ enabled: true, crop: true, cropW: 0.5, cropH: 0.5, scale: 1, x: 0.5, y: 0.5, mask: 'circle' })} className="btn btn-glass h-10 text-sm"><Crop className="w-4 h-4" /> Circle window</button>
                <button onClick={() => layout({ enabled: false, crop: false, scale: 1, x: 0.5, y: 0.5, mask: 'none' })} className="btn btn-glass h-10 text-sm"><RotateCcw className="w-4 h-4" /> Fullscreen</button>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">Size</span>
                  <span className="text-xs text-text-tertiary font-mono-num">{composite.scale.toFixed(2)}x</span>
                </div>
                <input type="range" className="ai-range" min={0.2} max={2} step={0.01}
                  value={composite.scale} onChange={(e) => setComposite({ scale: parseFloat(e.target.value) })} />
              </div>
              <p className="text-caption">Tip: turn on <span className="text-text-secondary">Move on stage</span> and drag the visualizer anywhere over your clip.</p>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-3">
              <p className="text-caption">Choose a format and export. Audio is your loaded song; the reaction video and visualizer are baked in, aligned.</p>
              <div className="grid grid-cols-3 gap-2">
                {FMT.map((f) => (
                  <button key={f.key} onClick={() => setExportAspectRatio(f.key)}
                    className={`rounded-lg border p-2.5 flex flex-col items-center gap-1 transition-all ${exportAspectRatio === f.key ? 'border-ai-red bg-ai-red/[0.08] text-ai-red' : 'border-hairline/50 bg-surface-2/40 text-text-tertiary hover:border-ai-red/40'}`}>
                    {f.icon}
                    <span className="text-xs font-mono-num">{f.label}</span>
                    <span className="text-[0.6rem] leading-tight text-center opacity-80">{f.hint}</span>
                  </button>
                ))}
              </div>
              <div>
                <p className="text-eyebrow mb-1.5">quality</p>
                <div className="grid grid-cols-3 gap-2">
                  {(['1080p', '4k', '8k'] as ExportQuality[]).map((q) => (
                    <button key={q} onClick={() => setExportQuality(q)}
                      className={`pill justify-center ${exportQuality === q ? 'pill-active' : ''}`}>
                      {q === '1080p' ? '1080p' : q.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={exportReel} className="btn btn-primary w-full h-12 text-sm">
                <Download className="w-4 h-4" /> Export reel
              </button>
              <p className="text-caption">Tip: 1080p exports fastest (best on phones). Set an <span className="text-text-secondary">export segment</span> for a short clip, and press <span className="text-text-secondary">STOP</span> (top bar) when done.</p>
            </div>
          )}
        </div>

        {/* footer nav */}
        <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-hairline/40">
          <button onClick={() => (step === 0 ? close() : setStep(step - 1))} className="btn btn-ghost h-9 px-4 text-sm">
            <ChevronLeft className="w-4 h-4" /> {step === 0 ? 'Close' : 'Back'}
          </button>
          {step < STEPS.length - 1 ? (
            <button onClick={() => stepDone[step] && setStep(step + 1)} disabled={!stepDone[step]}
              title={!stepDone[step] ? (step === 0 ? 'Load a song to continue' : 'Add your reaction video to continue') : 'Next step'}
              className="btn btn-primary h-9 px-5 text-sm disabled:opacity-40 disabled:cursor-not-allowed">
              Next <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={close} className="btn btn-ghost h-9 px-5 text-sm">
              <Check className="w-4 h-4" /> Done
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function Status({ ok, label, value }: { ok: boolean; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={`w-4 h-4 rounded-full flex items-center justify-center ${ok ? 'bg-ai-red/20 text-ai-red' : 'bg-surface-3 text-text-tertiary'}`}>
        {ok ? <Check className="w-3 h-3" /> : <span className="w-1.5 h-1.5 rounded-full bg-current" />}
      </span>
      <span className="text-text-tertiary">{label}:</span>
      <span className="text-text-secondary truncate">{value}</span>
    </div>
  );
}
