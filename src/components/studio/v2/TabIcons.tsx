import React from 'react';

/**
 * Music/visualizer-themed tab icons (replace the generic lucide glyphs). Each
 * animates subtly via CSS - the rules in index.css trigger on `.group:hover` and
 * on the active tab (`.tab-on`), so the live panel's icon feels alive.
 */

// Visualizers - a pulsing audio orb (the visual output).
export const VizOrbIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="w-full h-full overflow-visible">
    <circle cx="12" cy="12" r="3" fill="currentColor" />
    <circle className="viz-ring viz-ring-1" cx="12" cy="12" r="6.5" stroke="currentColor" strokeWidth="1.7" opacity="0.7" />
    <circle className="viz-ring viz-ring-2" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.4" opacity="0.4" />
  </svg>
);

// Styles - a paint blob with a twinkling sparkle.
export const StyleBlobIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="w-full h-full overflow-visible">
    <path d="M5 14c0-4 3-8 7-8s6 3 6 6-2 5-5 5c-1.2 0-1.8-.6-1.8-1.4 0-1 1-1.2 1-2.2 0-.8-.7-1.4-1.6-1.4H8c-1.7 0-3-1.2-3-3z" fill="currentColor" opacity="0.85" />
    <g className="style-twinkle"><path d="M18 3.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" fill="currentColor" /></g>
  </svg>
);

// Mix / reactivity - classic equalizer bars that bounce.
export const EqBarsIcon = () => (
  <svg viewBox="0 0 24 24" className="w-full h-full">
    <rect className="eqbar eqbar-1" x="3" y="4" width="3.4" height="16" rx="1.6" fill="currentColor" />
    <rect className="eqbar eqbar-2" x="10.3" y="4" width="3.4" height="16" rx="1.6" fill="currentColor" />
    <rect className="eqbar eqbar-3" x="17.6" y="4" width="3.4" height="16" rx="1.6" fill="currentColor" />
  </svg>
);

// Composite - overlapping frames (picture-in-picture overlay).
export const CompositeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="w-full h-full overflow-visible">
    <rect x="3" y="5" width="13" height="11" rx="2.2" stroke="currentColor" strokeWidth="1.8" opacity="0.55" />
    <rect className="pip-frame" x="10" y="10" width="11" height="9" rx="2.2" fill="currentColor" />
  </svg>
);

// Upload - a music note lifted by an up-arrow.
export const UploadAudioIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="w-full h-full overflow-visible">
    <path d="M10 17.5a2.4 2.4 0 1 1-2.4-2.4c.55 0 1.05.18 1.4.48V7l7-1.8v6.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <g className="upload-bob">
      <path d="M18 13.5v6M15.6 15.9 18 13.5l2.4 2.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  </svg>
);
