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
  }
}

createRoot(document.getElementById("root")!).render(<App />);
