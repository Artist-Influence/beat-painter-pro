import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wand2, RefreshCw, Save, X } from 'lucide-react';
import { randomFractal, parsePrompt, type FractalFamily } from '@/lib/fractal/engine';
import { generateModelConfig } from '@/lib/modelGenerator';
import { modelEmoji, modelName } from '@/components/visualizers/ProceduralPreset';
import { randomCartoon, composeScene, cartoonShapeFromPrompt, cartoonShapeName } from '@/lib/cartoon/cartoonEngine';
import { sandFromPrompt } from '@/lib/sand/sandEngine';
import { randomSand3D, SAND3D_PALETTES } from '@/lib/sand3d/unicornEngine';
import { randomDaw } from '@/lib/daw/dawEngine';
import { useStudioStore } from '@/stores/studioStore';
import { usePresetStore, type PresetItem } from '@/stores/presetStore';
import { Switch } from '@/components/ui/switch';

type Kind = 'surprise' | 'merge' | '2d' | '3d' | 'model' | 'cartoon' | 'sand' | 'sand3d' | 'daw';

const KINDS: { key: Kind; label: string }[] = [
  { key: 'surprise', label: 'Surprise' },
  { key: 'merge', label: 'Merge ×2' },
  { key: '2d', label: 'Fractal 2D' },
  { key: '3d', label: 'Fractal 3D' },
  { key: 'model', label: '3D Model' },
  { key: 'cartoon', label: '2D Shape' },
  { key: 'sand', label: 'Sand' },
  { key: 'sand3d', label: '3D Sand' },
  { key: 'daw', label: 'DAW Waveform' },
];

const familyFor = (k: Kind): FractalFamily | undefined => (k === '2d' ? '2d' : k === '3d' ? '3d' : undefined);
const isModelKind = (k: Kind) => k === 'model';

// Build a merge of two same-type bases (models, cartoons, or fractals) so N bases
// yield N^2 combinations. Models compose cleanest, so they're weighted heaviest.
function rollMergeItem(seed: number, sa: boolean): { item: PresetItem; name: string } {
  const seed2 = (seed * 2654435761 + 1013904223) >>> 0;
  const t = ['model', 'model', 'model', 'cartoon', 'fractal'][seed % 5];
  let a: PresetItem, b: PresetItem;
  if (t === 'cartoon') {
    a = { kind: 'cartoon', cartoon: randomCartoon(seed) };
    b = { kind: 'cartoon', cartoon: randomCartoon(seed2) };
  } else if (t === 'fractal') {
    const fam = seed % 2 === 0 ? '2d' : '3d';
    a = { kind: 'fractal', fractal: randomFractal(seed, fam) };
    b = { kind: 'fractal', fractal: randomFractal(seed2, fam) };
  } else {
    a = { kind: 'procedural', procedural: generateModelConfig(seed, { complex: true }) };
    b = { kind: 'procedural', procedural: generateModelConfig(seed2, { complex: true }) };
  }
  return { item: { kind: 'merge', a, b, standalone: sa }, name: 'Merge' };
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (key: string) => void;
}

export function GeneratorModal({ isOpen, onClose, onSaved }: Props) {
  const setSelected = useStudioStore((s) => s.setSelected);
  const setBackgroundTransparent = useStudioStore((s) => s.setBackgroundTransparent);
  const setBackgroundColor = useStudioStore((s) => s.setBackgroundColor);
  const setPreview = usePresetStore((s) => s.setPreview);
  const addPreset = usePresetStore((s) => s.addPreset);
  const colorOverride = useStudioStore((s) => s.colorOverride);
  const colorHue = useStudioStore((s) => s.colorHue);
  const setColorOverride = useStudioStore((s) => s.setColorOverride);
  const setColorHue = useStudioStore((s) => s.setColorHue);

  const [kind, setKind] = useState<Kind>('surprise');
  const [item, setItem] = useState<PresetItem | null>(null);
  const [name, setName] = useState('');
  const [prompt, setPrompt] = useState('');
  const [standalone, setStandalone] = useState(false);
  const promptRef = useRef('');
  const standaloneRef = useRef(false);
  const prevSelected = useRef<string | null>(null);

  const applyStandalone = (on: boolean) => {
    if (on) setBackgroundTransparent();
    else setBackgroundColor('#000000');
  };

  const roll = (kind: Kind) => {
    const seed = Math.floor(Math.random() * 1e9);
    const sa = standaloneRef.current;
    let next: PresetItem;
    let nm: string;
    const theme = parsePrompt(promptRef.current);
    // Surprise: pick a wildly different visualizer kind every time (incl. merges)
    const k: Kind = kind === 'surprise'
      ? (['2d', '3d', 'model', 'cartoon', 'sand', 'sand3d', 'daw', 'merge', 'merge'] as Kind[])[Math.floor(Math.random() * 9)]
      : kind;
    if (k === 'merge') {
      const m = rollMergeItem(seed, sa);
      next = m.item;
      nm = theme?.label ?? m.name;
    } else if (k === 'daw') {
      useStudioStore.getState().resetDawOverride();
      const daw = randomDaw(seed, { label: theme?.label });
      next = { kind: 'daw', daw, standalone: sa };
      nm = theme?.label ?? daw.name;
    } else if (k === 'sand3d') {
      const sand3d = randomSand3D(seed, { label: theme?.label });
      next = { kind: 'sand3d', sand3d, standalone: sa };
      nm = theme?.label ?? sand3d.name;
    } else if (k === 'sand') {
      const sand = sandFromPrompt(promptRef.current.trim(), seed, theme?.label);
      next = { kind: 'sand', sand, standalone: sa };
      nm = theme?.label ?? sand.name;
    } else if (k === 'cartoon') {
      const prompt = promptRef.current.trim();
      const matched = cartoonShapeFromPrompt(prompt); // 10-13 scene, 0-5 shape, else undefined
      let cartoon;
      if (matched !== undefined) cartoon = randomCartoon(seed, { shape: matched, label: theme?.label });
      else if (prompt) cartoon = composeScene(prompt, seed, theme?.label); // any prompt → themed scene
      else cartoon = randomCartoon(seed);                                   // no prompt → random shape
      next = { kind: 'cartoon', cartoon, standalone: sa };
      nm = theme?.label ?? cartoon.name;
    } else if (isModelKind(k)) {
      const procedural = generateModelConfig(seed, { complex: true, shapes: theme?.shapes });
      next = { kind: 'procedural', procedural, standalone: sa };
      nm = theme?.label ?? modelName(procedural);
    } else {
      const fractal = randomFractal(seed, familyFor(k), theme);
      next = { kind: 'fractal', fractal, standalone: sa };
      nm = theme?.label ?? '';
    }
    setItem(next);
    setName(nm);
    setPreview(next);
    setSelected('__preview__');
    applyStandalone(sa);
  };

  useEffect(() => {
    if (isOpen) {
      prevSelected.current = useStudioStore.getState().selected as string;
      roll(kind);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleKind = (k: Kind) => { setKind(k); roll(k); };
  const handleStandalone = (v: boolean) => { setStandalone(v); standaloneRef.current = v; applyStandalone(v); };

  const emojiFor = (it: PresetItem): string =>
    it.kind === 'fractal' ? it.fractal.emoji
    : it.kind === 'cartoon' ? it.cartoon.emoji
    : it.kind === 'sand' ? it.sand.emoji
    : it.kind === 'sand3d' ? it.sand3d.emoji
    : it.kind === 'daw' ? it.daw.emoji
    : it.kind === 'merge' ? '🔀'
    : modelEmoji(it.procedural);
  const subShort = (it: PresetItem): string =>
    it.kind === 'procedural' ? it.procedural.shape.replace(/_/g, ' ')
    : it.kind === 'cartoon' ? cartoonShapeName(it.cartoon.shape)
    : it.kind === 'fractal' ? it.fractal.typeName
    : it.kind;
  const labelFor = (it: PresetItem | null) => {
    if (!it) return '';
    if (it.kind === 'fractal') return `${it.fractal.family.toUpperCase()} · ${it.fractal.typeName.replace(/([A-Z])/g, ' $1').toUpperCase()}`;
    if (it.kind === 'cartoon') return `2D · ${cartoonShapeName(it.cartoon.shape).toUpperCase()}`;
    if (it.kind === 'sand') return `SAND · ${it.sand.shape.mode.toUpperCase()}`;
    if (it.kind === 'sand3d') return `3D SAND · ${SAND3D_PALETTES[it.sand3d.paletteIndex].name.toUpperCase()}`;
    if (it.kind === 'daw') return `DAW · ${it.daw.layout.toUpperCase()} · ${it.daw.waveMode.toUpperCase()}`;
    if (it.kind === 'merge') return `MERGE · ${subShort(it.a).toUpperCase()} + ${subShort(it.b).toUpperCase()}`;
    return `3D MODEL · ${it.procedural.shape.replace(/_/g, ' ').toUpperCase()}`;
  };

  const handleSave = () => {
    if (!item) return;
    const id = addPreset(name, emojiFor(item), item);
    setPreview(null);
    setSelected(id);
    onSaved?.(id);
    onClose();
  };

  const handleCancel = () => {
    setPreview(null);
    if (prevSelected.current) setSelected(prevSelected.current as any);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.97 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] w-[460px] max-w-[calc(100vw-2rem)] glass-panel p-5 pointer-events-auto"
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-eyebrow">generate</p>
              <h3 className="text-text-primary text-base font-semibold flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-ai-red" /> New Visualizer
              </h3>
            </div>
            <button onClick={handleCancel} className="p-1.5 hover:bg-ai-red/[0.08] rounded-md transition-colors">
              <X className="w-4 h-4 text-text-tertiary" />
            </button>
          </div>

          {/* Prompt */}
          <p className="text-eyebrow mb-2">prompt <span className="text-text-tertiary normal-case tracking-normal">(optional)</span></p>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={prompt}
              onChange={(e) => { setPrompt(e.target.value); promptRef.current = e.target.value; }}
              onKeyDown={(e) => { if (e.key === 'Enter') roll(kind); }}
              placeholder="mushrooms, cars racing, neon city…"
              maxLength={60}
              className="flex-1 bg-surface-2 border border-hairline/60 rounded-md px-3 py-2 text-text-primary text-sm placeholder:text-text-tertiary focus:outline-none focus:border-ai-red/45"
            />
            <button onClick={() => roll(kind)} className="btn btn-primary h-10 px-4 shrink-0">
              <Wand2 className="w-4 h-4" /> Roll
            </button>
          </div>

          {/* Kind choice */}
          <p className="text-eyebrow mb-2">type</p>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {KINDS.map((k) => (
              <button key={k.key} onClick={() => handleKind(k.key)}
                className={`pill justify-center !px-2 ${kind === k.key ? 'pill-active' : ''}`}>
                {k.label}
              </button>
            ))}
          </div>

          {/* Standalone vs full-frame */}
          <div className="flex items-center justify-between mb-4 p-3 rounded-md bg-surface-2/40 border border-hairline/50">
            <div>
              <p className="text-text-primary text-sm">Standalone</p>
              <p className="text-caption">Transparent background to layer over video</p>
            </div>
            <Switch checked={standalone} onCheckedChange={handleStandalone} />
          </div>

          {/* Recolour - tint the preview to a single colour before saving */}
          <div className="mb-4 p-3 rounded-md bg-surface-2/40 border border-hairline/50 space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-primary text-sm">Recolour</p>
                <p className="text-caption">Tint this visualizer to your own colour</p>
              </div>
              <Switch checked={colorOverride} onCheckedChange={setColorOverride} />
            </div>
            {colorOverride && (
              <input type="range" min={0} max={360} step={1} value={colorHue}
                onChange={(e) => setColorHue(parseInt(e.target.value, 10))}
                className="ai-range w-full"
                style={{ background: 'linear-gradient(90deg,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)', height: '8px' }} />
            )}
          </div>

          {/* Current roll */}
          <div className="flex items-center gap-3 mb-4 p-3 rounded-md bg-surface-2/40 border border-hairline/50">
            <span className="text-2xl">{item ? emojiFor(item) : '🎲'}</span>
            <div className="min-w-0 flex-1">
              <p className="text-text-primary text-sm font-medium truncate">{name || 'Untitled roll'}</p>
              <p className="text-text-tertiary text-[0.7rem] font-mono-num truncate">{labelFor(item)}</p>
            </div>
          </div>

          {/* Name */}
          <label className="text-caption">Preset name <span className="text-text-tertiary">(optional)</span></label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name this visualizer"
            maxLength={50}
            className="w-full mt-1 mb-4 bg-surface-2 border border-hairline/60 rounded-md px-3 py-2 text-text-primary text-sm placeholder:text-text-tertiary focus:outline-none focus:border-ai-red/45"
          />

          {/* Actions */}
          <div className="flex items-center justify-between gap-2">
            <button onClick={() => roll(kind)} className="btn btn-ghost h-10 px-4">
              <RefreshCw className="w-4 h-4" /> Try another
            </button>
            <button onClick={handleSave} className="btn btn-primary h-10 px-5">
              <Save className="w-4 h-4" /> Save preset
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
