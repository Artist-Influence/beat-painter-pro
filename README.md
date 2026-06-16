# Beat Painter Pro — Artist Influence Visualizer Studio

A browser-based, audio-reactive visualizer studio. Load a track, pick or tune a 3D/particle
visualizer, and render it out (9:16, 1:1, 16:9) for Reels, TikTok and Shorts.

The app chrome follows the **Artist Influence design system** (dark glass-morphism, one electric
red `#ED1C24`, Clash Display / Inter / JetBrains Mono). The visualizer canvas output is the
artist's creative content and is exempt from the red discipline — scenes can use any palette.

## Tech

- Vite + React + TypeScript
- React Three Fiber / Three.js (visualizer engine)
- Tailwind CSS + shadcn-ui (chrome)
- Zustand (studio state)
- Supabase (auth, saved custom visualizers, edge functions)
- Sucrase (runtime compile of AI-generated visualizers)

## Local development

Requires [Bun](https://bun.sh).

```sh
bun install
bun run dev        # serves on http://localhost:8099
```

Other scripts: `bun run build`, `bun run build:dev`, `bun run preview`, `bun run lint`.

## Git

This repo is the working copy, decoupled from Lovable. It tracks
`https://github.com/Artist-Influence/beat-painter-pro` (`main`). Push directly to GitHub.

## Environment

Supabase config lives in `.env` (`VITE_SUPABASE_*`). The studio runs without auth; auth gates the
admin dashboard and persistence of custom visualizers.

## Layout

- `src/pages/Studio.tsx` — the studio (default route `/`)
- `src/components/studio/v2/` — studio chrome (top bar, rails, transport, panels)
- `src/components/visualizers/` — built-in visualizers + reusable shape families (`shapes/`)
- `src/components/visualizer/` — canvas, dynamic loader, export compositor
- `src/lib/visualizerFactory/` — procedural / randomized visualizer generation
- `src/hooks/useWebMRecorder.ts` — WebM / PNG-sequence export
- `src/index.css` — the Artist Influence design system (tokens, glass, eyebrow, buttons, sliders)
