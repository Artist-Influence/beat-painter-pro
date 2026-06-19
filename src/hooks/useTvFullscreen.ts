import { useCallback, useEffect, useState } from 'react';
import { useStudioStore } from '@/stores/studioStore';

/**
 * "TV mode" for party mode / screencasting: true browser fullscreen + the
 * chrome-hidden preview, so a connected screen shows ONLY the visuals.
 *
 * Two separate "fullscreens" exist in the app and both are needed for an ambient
 * TV background: `previewMode` (hides this app's editing panels) and the OS-level
 * Fullscreen API (hides the browser/OS chrome). This keeps them in sync - leaving
 * fullscreen by any means (Esc, system gesture) restores the editing chrome.
 */
export function useTvFullscreen() {
  const setPreviewMode = useStudioStore((s) => s.setPreviewMode);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => {
      const on = !!document.fullscreenElement;
      setIsFullscreen(on);
      if (!on) setPreviewMode(false); // left fullscreen → bring the chrome back
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, [setPreviewMode]);

  const enter = useCallback(async () => {
    setPreviewMode(true); // hide editing chrome for a clean cast
    try {
      await document.documentElement.requestFullscreen?.();
    } catch {
      // Fullscreen denied (e.g. iOS Safari blocks element fullscreen) - preview
      // mode alone still gives a clean, chrome-free view to mirror/AirPlay.
    }
  }, [setPreviewMode]);

  const exit = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
    } catch {
      /* ignore */
    }
    setPreviewMode(false);
  }, [setPreviewMode]);

  const toggle = useCallback(() => {
    if (document.fullscreenElement) exit();
    else enter();
  }, [enter, exit]);

  return { isFullscreen, toggle, enter, exit };
}
