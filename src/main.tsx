import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { useStudioStore } from './stores/studioStore'

// Debug/E2E affordance: expose the studio store ONLY for local automated testing -
// requires both the ?e2e flag and a localhost origin, so the live deploy never
// exposes the store regardless of URL params. No effect for normal users.
if (typeof window !== 'undefined') {
  const isLocal = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname);
  if (isLocal && new URLSearchParams(window.location.search).has('e2e')) {
    (window as unknown as { __studioStore?: unknown }).__studioStore = useStudioStore;
    import('./lib/audioAlign').then((m) => {
      (window as unknown as { __alignVideoToSong?: unknown }).__alignVideoToSong = m.alignVideoToSong;
    });
    // Preview a procedural 3D model / random 3D fractal by seed (for automated
    // framing + reactivity checks). e2e+localhost only, so the live build is clean.
    Promise.all([import('./lib/modelGenerator'), import('./lib/fractal/engine'), import('./stores/presetStore')]).then(([m, f, p]) => {
      const setSel = (id: string) => (useStudioStore.getState() as unknown as { setSelected: (id: string) => void }).setSelected(id);
      const setPrev = (i: unknown) => (p.usePresetStore.getState() as unknown as { setPreview: (i: unknown) => void }).setPreview(i);
      (window as unknown as { __previewModel?: unknown }).__previewModel = (seed: number, shapes?: string[]) => {
        const procedural = m.generateModelConfig(seed, { complex: true, shapes });
        setPrev({ kind: 'procedural', procedural, standalone: false }); setSel('__preview__');
        return procedural.shape;
      };
      (window as unknown as { __previewFractal3D?: unknown }).__previewFractal3D = (seed: number) => {
        const fractal = f.randomFractal(seed, '3d');
        setPrev({ kind: 'fractal', fractal, standalone: false }); setSel('__preview__');
        return { type: fractal.typeName, camDist: fractal.camDist };
      };
    });
  }
}

createRoot(document.getElementById("root")!).render(<App />);
