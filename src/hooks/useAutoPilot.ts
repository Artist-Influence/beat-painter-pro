import { useEffect, useRef } from 'react';
import { useStudioStore, type PartyType } from '@/stores/studioStore';
import { usePresetStore } from '@/stores/presetStore';
import { randomFractal } from '@/lib/fractal/engine';
import { generateModelConfig } from '@/lib/modelGenerator';
import { randomCartoon } from '@/lib/cartoon/cartoonEngine';

// A spread of built-in library visualizers to mix into the rotation.
const LIBRARY_KEYS = [
  'DiamondOrbVisualizer', 'AlienMembraneVisualizer', 'NeuralLatticeVisualizer',
  'PsychedelicMandalaVisualizer', 'HypercubePortalVisualizer', 'SacredGeometryPulseVisualizer',
  'NeonSkylineVisualizer', 'ElectricFieldVisualizer', 'CubicCloudsVisualizer',
];

const ALL_TYPES: PartyType[] = ['fractal3d', 'fractal2d', 'models', 'shapes', 'library'];

/**
 * Auto-pilot / party mode: while a mix plays, swap to a fresh visualizer on a
 * timer so it works as an ambient background to screencast. The user controls
 * WHICH families are in the rotation (partyTypes) and HOW OFTEN it swaps
 * (partyIntervalSec). 3D models always render vividly skinned (see
 * ProceduralVisualizer) so the rotation never shows a colourless shape.
 */
export function useAutoPilot() {
  const autoPilot = useStudioStore((s) => s.autoPilot);
  const partyTypes = useStudioStore((s) => s.partyTypes);
  const partyIntervalSec = useStudioStore((s) => s.partyIntervalSec);
  const setSelected = useStudioStore((s) => s.setSelected);
  const setPreview = usePresetStore((s) => s.setPreview);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!autoPilot) return;
    let cancelled = false;
    // fall back to everything if the user has unchecked all families
    const enabled = partyTypes.length ? partyTypes : ALL_TYPES;
    const intervalMs = Math.max(2, partyIntervalSec) * 1000;

    const show = (type: PartyType, seed: number) => {
      switch (type) {
        case 'fractal2d': setPreview({ kind: 'fractal', fractal: randomFractal(seed, '2d') }); setSelected('__preview__'); break;
        case 'fractal3d': setPreview({ kind: 'fractal', fractal: randomFractal(seed, '3d') }); setSelected('__preview__'); break;
        case 'models': setPreview({ kind: 'procedural', procedural: generateModelConfig(seed, { complex: true }) }); setSelected('__preview__'); break;
        case 'shapes': setPreview({ kind: 'cartoon', cartoon: randomCartoon(seed) }); setSelected('__preview__'); break;
        case 'library': setSelected(LIBRARY_KEYS[seed % LIBRARY_KEYS.length] as never); break;
      }
    };

    let lastType: PartyType | null = null;
    const next = () => {
      if (cancelled) return;
      const seed = Math.floor(Math.random() * 1e9);
      // don't repeat the same family back-to-back when more than one is enabled
      const pool = enabled.length > 1 && lastType ? enabled.filter((t) => t !== lastType) : enabled;
      const type = pool[Math.floor(Math.random() * pool.length)];
      lastType = type;
      show(type, seed);
      timer.current = setTimeout(next, intervalMs);
    };

    next(); // switch immediately when turned on / settings change
    return () => { cancelled = true; if (timer.current) clearTimeout(timer.current); };
  }, [autoPilot, partyTypes, partyIntervalSec, setSelected, setPreview]);
}
