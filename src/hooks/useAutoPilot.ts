import { useEffect, useRef } from 'react';
import { useStudioStore } from '@/stores/studioStore';
import { usePresetStore } from '@/stores/presetStore';
import { randomFractal } from '@/lib/fractal/engine';
import { generateModelConfig } from '@/lib/modelGenerator';

// A spread of built-in library visualizers to mix into the rotation.
const LIBRARY_KEYS = [
  'DiamondOrbVisualizer', 'AlienMembraneVisualizer', 'NeuralLatticeVisualizer',
  'PsychedelicMandalaVisualizer', 'HypercubePortalVisualizer', 'SacredGeometryPulseVisualizer',
  'NeonSkylineVisualizer', 'ElectricFieldVisualizer', 'CubicCloudsVisualizer',
];

/**
 * Auto-pilot / party mode: while a mix plays, switch to a fresh visualizer
 * every 15 seconds - random fractals, procedural 3D models, and library
 * pieces - so it works as an ambient background to screencast.
 */
const SWITCH_MS = 15000;
export function useAutoPilot() {
  const autoPilot = useStudioStore((s) => s.autoPilot);
  const setSelected = useStudioStore((s) => s.setSelected);
  const setPreview = usePresetStore((s) => s.setPreview);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!autoPilot) return;
    let cancelled = false;

    const next = () => {
      if (cancelled) return;
      const seed = Math.floor(Math.random() * 1e9);
      const roll = Math.random();
      if (roll < 0.45) {
        setPreview({ kind: 'fractal', fractal: randomFractal(seed) });
        setSelected('__preview__');
      } else if (roll < 0.75) {
        setPreview({ kind: 'procedural', procedural: generateModelConfig(seed, { complex: true }) });
        setSelected('__preview__');
      } else {
        setSelected(LIBRARY_KEYS[seed % LIBRARY_KEYS.length] as any);
      }
      timer.current = setTimeout(next, SWITCH_MS); // fixed 15s cadence
    };

    next(); // switch immediately when turned on
    return () => { cancelled = true; if (timer.current) clearTimeout(timer.current); };
  }, [autoPilot, setSelected, setPreview]);
}
