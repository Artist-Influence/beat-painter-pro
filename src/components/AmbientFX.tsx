import { useEffect } from 'react';

/**
 * Global chrome ambience for the Artist Influence design system:
 *  - drifting oxblood glow layer behind the UI
 *  - a 6px red cursor dot on fine pointers
 * Both fully disabled under prefers-reduced-motion / coarse pointers.
 * The visualizer canvas is the artist's content and is unaffected.
 */
export function AmbientFX() {
  useEffect(() => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ambient glow layer
    let ambient: HTMLDivElement | null = null;
    if (!document.querySelector('.ambient')) {
      ambient = document.createElement('div');
      ambient.className = 'ambient';
      ambient.setAttribute('aria-hidden', 'true');
      ambient.innerHTML = '<i class="g1"></i><i class="g2"></i><i class="g3"></i>';
      document.body.prepend(ambient);
    }

    // cursor dot (fine pointer only, motion allowed)
    let dot: HTMLDivElement | null = null;
    const onMove = (e: MouseEvent) => {
      if (!dot) return;
      dot.style.left = e.clientX + 'px';
      dot.style.top = e.clientY + 'px';
      dot.style.opacity = '1';
    };
    const onOut = () => { if (dot) dot.style.opacity = '0'; };
    if (matchMedia('(pointer: fine)').matches && !reduced) {
      dot = document.createElement('div');
      dot.className = 'cursor-dot';
      document.body.appendChild(dot);
      addEventListener('mousemove', onMove);
      addEventListener('mouseout', onOut);
    }

    return () => {
      removeEventListener('mousemove', onMove);
      removeEventListener('mouseout', onOut);
      ambient?.remove();
      dot?.remove();
    };
  }, []);

  return null;
}
