import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { VisualizerProps } from '../visualizer';
import { createBandProcessor } from '@/lib/audioBands';
import { useStudioStore } from '@/stores/studioStore';
import {
  analyzeDawAudio, SPECTRO_PALETTES, type DawConfig, type DawAudioData,
} from '@/lib/daw/dawEngine';

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// In scroll mode the playhead is pinned this far across the panel; played audio
// rolls left into history and upcoming audio streams in from the right. Shared by
// the waveform window, the spectrogram window and the playhead line so they align.
const SCROLL_HEAD = 0.66;

/** 256-entry RGB lookup table from palette stops. */
function buildLut(stops: string[]): Uint8ClampedArray {
  const lut = new Uint8ClampedArray(256 * 3);
  const cols = stops.map((s) => {
    const h = s.replace('#', '');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  });
  for (let i = 0; i < 256; i++) {
    const t = i / 255 * (cols.length - 1);
    const a = Math.floor(t), b = Math.min(cols.length - 1, a + 1), f = t - a;
    lut[i * 3] = lerp(cols[a][0], cols[b][0], f);
    lut[i * 3 + 1] = lerp(cols[a][1], cols[b][1], f);
    lut[i * 3 + 2] = lerp(cols[a][2], cols[b][2], f);
  }
  return lut;
}

interface Rect { x: number; y: number; w: number; h: number; }

function regions(cfg: DawConfig, W: number, H: number): { wave: Rect; spectro: Rect | null; bgSpectro: boolean } {
  const m = Math.round(Math.min(W, H) * 0.055); // safe margin for socials UI
  const inner: Rect = { x: m, y: m, w: W - 2 * m, h: H - 2 * m };
  const spectroOn = cfg.spectro;
  const bgSpectro = spectroOn && cfg.spectroPlacement === 'background';
  if (cfg.layout === 'minimal' || (!spectroOn && cfg.layout === 'full')) {
    return { wave: inner, spectro: null, bgSpectro: false };
  }
  if (cfg.layout === 'split') {
    const leftW = Math.round(inner.w * 0.40);
    const gap = Math.round(m * 0.6);
    const left: Rect = { x: inner.x, y: inner.y, w: leftW, h: inner.h };
    const right: Rect = { x: inner.x + leftW + gap, y: inner.y, w: inner.w - leftW - gap, h: inner.h };
    const spLeft = cfg.spectroPlacement !== 'right';
    return { wave: spLeft ? right : left, spectro: spectroOn ? (spLeft ? left : right) : null, bgSpectro: false };
  }
  if (cfg.layout === 'stacked') {
    const topH = Math.round(inner.h * (spectroOn ? 0.42 : 0));
    const gap = Math.round(m * 0.6);
    const spectro: Rect = { x: inner.x, y: inner.y, w: inner.w, h: topH };
    const wave: Rect = { x: inner.x, y: inner.y + topH + gap, w: inner.w, h: inner.h - topH - gap };
    return { wave, spectro: spectroOn ? spectro : null, bgSpectro: false };
  }
  // full + spectro: carve a band by placement (or background)
  if (bgSpectro) return { wave: inner, spectro: { ...inner }, bgSpectro: true };
  if (cfg.spectroPlacement === 'bottom') {
    const sh = Math.round(inner.h * 0.28);
    return { wave: { ...inner, h: inner.h - sh - 8 }, spectro: { x: inner.x, y: inner.y + inner.h - sh, w: inner.w, h: sh }, bgSpectro: false };
  }
  if (cfg.spectroPlacement === 'top') {
    const sh = Math.round(inner.h * 0.28);
    return { wave: { x: inner.x, y: inner.y + sh + 8, w: inner.w, h: inner.h - sh - 8 }, spectro: { x: inner.x, y: inner.y, w: inner.w, h: sh }, bgSpectro: false };
  }
  // left/right strip
  const sw = Math.round(inner.w * 0.34);
  const right = cfg.spectroPlacement === 'right';
  return {
    wave: right ? { ...inner, w: inner.w - sw - 8 } : { x: inner.x + sw + 8, y: inner.y, w: inner.w - sw - 8, h: inner.h },
    spectro: right ? { x: inner.x + inner.w - sw, y: inner.y, w: sw, h: inner.h } : { x: inner.x, y: inner.y, w: sw, h: inner.h },
    bgSpectro: false,
  };
}

export function DawWaveformVisualizer({ config: baked, audioData }: VisualizerProps & { config: DawConfig }) {
  const { gl } = useThree();
  const override = useStudioStore((s) => s.dawOverride);
  const audioElement = useStudioStore((s) => s.audioElement);
  const cfg = useMemo<DawConfig>(() => ({ ...baked, ...(override || {}) }), [baked, override]);

  const proc = useMemo(() => createBandProcessor(), []);
  const dataRef = useRef<DawAudioData | null>(null);
  const [, setReady] = useState(0);
  const timeRef = useRef(0);
  const peakHoldRef = useRef<Float32Array>(new Float32Array(256));

  // build the 2D draw surface + a quad that shows it inside the R3F canvas
  const res = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1280; canvas.height = 720;
    const ctx = canvas.getContext('2d', { alpha: true })!;
    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter; tex.generateMipmaps = false;
    const mat = new THREE.ShaderMaterial({
      uniforms: { uTex: { value: tex } },
      transparent: true, depthTest: false, depthWrite: false,
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: 'uniform sampler2D uTex; varying vec2 vUv; void main(){ gl_FragColor = texture2D(uTex, vUv); }',
    });
    const specCanvas = document.createElement('canvas');
    const noiseCanvas = document.createElement('canvas');
    return { canvas, ctx, tex, mat, specCanvas, noiseCanvas, specKey: '', lut: buildLut(SPECTRO_PALETTES[0].stops), lastDataUrl: '' };
  }, []);

  // (re)analyse when the track changes
  useEffect(() => {
    const url = audioElement?.src;
    if (!url) { dataRef.current = null; return; }
    if (res.lastDataUrl === url && dataRef.current) return;
    res.lastDataUrl = url;
    analyzeDawAudio(url).then((d) => { dataRef.current = d; setReady((v) => v + 1); });
  }, [audioElement, res]);

  // a cached grain tile
  useEffect(() => {
    const n = res.noiseCanvas; n.width = 256; n.height = 256;
    const c = n.getContext('2d')!; const img = c.createImageData(256, 256);
    for (let i = 0; i < img.data.length; i += 4) { const v = Math.random() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
    c.putImageData(img, 0, 0);
  }, [res]);

  useEffect(() => () => { res.tex.dispose(); res.mat.dispose(); }, [res]);

  const buildSpectroCanvas = (data: DawAudioData) => {
    const key = `${cfg.spectroPalette}|${cfg.spectroIntensity.toFixed(2)}|${cfg.spectroContrast.toFixed(2)}`;
    if (res.specKey === key && res.specCanvas.width) return;
    res.specKey = key;
    res.lut = buildLut(SPECTRO_PALETTES[cfg.spectroPalette % SPECTRO_PALETTES.length].stops);
    const { sCols, bands, spectro } = data;
    res.specCanvas.width = sCols; res.specCanvas.height = bands;
    const sctx = res.specCanvas.getContext('2d')!;
    const img = sctx.createImageData(sCols, bands);
    for (let c = 0; c < sCols; c++) {
      for (let b = 0; b < bands; b++) {
        let v = spectro[c * bands + b] / 255;
        v = Math.pow(v, 1 / Math.max(0.2, cfg.spectroContrast)) * cfg.spectroIntensity;
        const idx = clamp(Math.round(v * 255), 0, 255);
        // flip vertically so low freq sits at the bottom
        const px = (((bands - 1 - b) * sCols) + c) * 4;
        img.data[px] = res.lut[idx * 3]; img.data[px + 1] = res.lut[idx * 3 + 1]; img.data[px + 2] = res.lut[idx * 3 + 2]; img.data[px + 3] = 255;
      }
    }
    sctx.putImageData(img, 0, 0);
  };

  useFrame((_, delta) => {
    const dt = Math.min(0.05, delta); timeRef.current += dt;
    const t = timeRef.current;
    const { ctx, canvas } = res;

    // size the surface to the drawing buffer (crisp at export res), capped for perf
    const dbs = gl.getDrawingBufferSize(new THREE.Vector2());
    const W = clamp(Math.round(dbs.x), 16, 2200), H = clamp(Math.round(dbs.y), 16, 2200);
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }

    const b = proc(audioData?.frequencyRaw ?? audioData?.frequency ?? [], audioData?.amplitude || 0, audioData?.beatStrength || 0);
    const bass = b.bass * cfg.bassResponse, mid = b.mid * cfg.midResponse, treb = b.treble * cfg.highResponse;
    const beat = b.beat, punch = b.punch * cfg.transientSensitivity;

    const data = dataRef.current;
    const dur = data?.duration || audioElement?.duration || 0;
    const playFrac = dur ? clamp((audioElement?.currentTime || 0) / dur, 0, 1) : 0;

    // ---- background / motion-blur trails ----
    ctx.globalCompositeOperation = 'source-over';
    if (cfg.glowTrails > 0) {
      // fade the previous frame instead of clearing → real motion-blur trails
      const fade = clamp(1 - cfg.glowTrails, 0.05, 1);
      if (cfg.background === 'transparent') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = `rgba(0,0,0,${fade})`; ctx.fillRect(0, 0, W, H);
        ctx.globalCompositeOperation = 'source-over';
      } else {
        ctx.globalAlpha = fade; ctx.fillStyle = cfg.background; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
      }
    } else if (cfg.background === 'transparent') {
      ctx.clearRect(0, 0, W, H);
    } else {
      ctx.fillStyle = cfg.background; ctx.fillRect(0, 0, W, H);
    }

    const reg = regions(cfg, W, H);

    // ---- spectrogram ----
    if (cfg.spectro && data) {
      buildSpectroCanvas(data);
      const r = reg.spectro!;
      ctx.save();
      ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.clip();
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      if (reg.bgSpectro) ctx.globalAlpha = 0.55 * cfg.spectroIntensity;
      // scroll mode: show a moving window; static: whole track
      const sCols = data.sCols;
      const winCols = cfg.playMode === 'scroll' ? Math.max(24, Math.round(sCols * (cfg.scrollSpeed / Math.max(1, dur)))) : sCols;
      const sx = cfg.playMode === 'scroll' ? clamp(playFrac * sCols - winCols * SCROLL_HEAD, 0, Math.max(0, sCols - winCols)) : 0;
      ctx.drawImage(res.specCanvas, sx, 0, winCols, data.bands, r.x, r.y, r.w, r.h);
      ctx.globalAlpha = 1;
      // live high-freq flicker
      if (treb > 0.05) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(255,40,200,${clamp(treb * 0.12 * (cfg.spectroGlitch + 0.4), 0, 0.3)})`; ctx.fillRect(r.x, r.y, r.w, r.h); ctx.globalCompositeOperation = 'source-over'; }
      // spectro scanlines + noise + glitch
      if (cfg.spectroScanlines > 0) { ctx.fillStyle = `rgba(0,0,0,${cfg.spectroScanlines * 0.5})`; for (let y = r.y; y < r.y + r.h; y += 3) ctx.fillRect(r.x, y, r.w, 1); }
      if (cfg.spectroNoise > 0) { ctx.globalAlpha = cfg.spectroNoise * 0.5; ctx.drawImage(res.noiseCanvas, (t * 60) % 128, (t * 37) % 128, r.w, r.h, r.x, r.y, r.w, r.h); ctx.globalAlpha = 1; }
      if (cfg.spectroGlitch > 0 && punch > 0.5) {
        const slices = 3 + Math.floor(cfg.spectroGlitch * 5);
        for (let i = 0; i < slices; i++) { const yy = r.y + Math.random() * r.h, hh = 2 + Math.random() * 8 * cfg.spectroGlitch, off = (Math.random() - 0.5) * r.w * 0.2 * cfg.spectroGlitch; ctx.drawImage(canvas, r.x, yy, r.w, hh, r.x + off, yy, r.w, hh); }
      }
      ctx.restore();
    }

    // ---- waveform ----
    drawWave(ctx, reg.wave, cfg, data, { bass, mid, treb, beat, punch }, playFrac, dur, t, peakHoldRef.current);

    // ---- playhead + progress ----
    if (cfg.playhead && dur) {
      // scroll mode: pinned line the waveform rolls under; static: sweeps across.
      const px = cfg.playMode === 'scroll' ? reg.wave.x + SCROLL_HEAD * reg.wave.w : reg.wave.x + playFrac * reg.wave.w;
      ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = Math.max(1, W / 900); ctx.beginPath(); ctx.moveTo(px, reg.wave.y); ctx.lineTo(px, reg.wave.y + reg.wave.h); ctx.stroke();
    }
    if (cfg.progressBar && dur) {
      const by = H - Math.round(Math.min(W, H) * 0.045), bx = Math.round(W * 0.055), bw = W - 2 * bx;
      ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(bx, by, bw, 3);
      ctx.fillStyle = cfg.waveColor; ctx.fillRect(bx, by, bw * playFrac, 3);
    }

    // ---- global overlays ----
    if (cfg.scanlines > 0) { ctx.fillStyle = `rgba(0,0,0,${cfg.scanlines * 0.35})`; for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1); }
    if (cfg.grain > 0) { ctx.globalAlpha = cfg.grain * 0.6; ctx.globalCompositeOperation = 'overlay'; ctx.drawImage(res.noiseCanvas, (t * 90) % 200, (t * 53) % 200, W, H, 0, 0, W, H); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
    if (cfg.glitch > 0 && punch > 0.55) { const slices = 2 + Math.floor(cfg.glitch * 4); for (let i = 0; i < slices; i++) { const yy = Math.random() * H, hh = 4 + Math.random() * 16 * cfg.glitch, off = (Math.random() - 0.5) * W * 0.12 * cfg.glitch; ctx.drawImage(canvas, 0, yy, W, hh, off, yy, W, hh); } }

    if (!data && audioElement) { // analysing
      ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = `${Math.round(H * 0.03)}px monospace`; ctx.textAlign = 'center'; ctx.fillText('analysing track…', W / 2, H / 2);
    }

    res.tex.needsUpdate = true;
  });

  return <mesh frustumCulled={false} renderOrder={5} material={res.mat}><planeGeometry args={[2, 2]} /></mesh>;
}

/* ---- waveform drawing (modes) ---- */
function drawWave(
  ctx: CanvasRenderingContext2D, r: Rect, cfg: DawConfig, data: DawAudioData | null,
  bands: { bass: number; mid: number; treb: number; beat: number; punch: number }, playFrac: number, dur: number, t: number,
  peakHold: Float32Array,
) {
  const W = ctx.canvas.width;
  const cy = cfg.waveAlign === 'top' ? r.y + r.h * 0.18 : cfg.waveAlign === 'bottom' ? r.y + r.h * 0.82 : r.y + r.h / 2;
  const pulse = 1 + bands.beat * cfg.beatPulse + bands.bass * 0.12;
  const halfH = r.h * 0.5 * clamp(cfg.waveHeight * pulse, 0.05, 1.6) * cfg.peakSensitivity;
  const cols = data?.env ?? new Float32Array(0);
  const N = cols.length;

  // Scroll mode: the panel shows a moving WINDOW of the track (scrollSpeed seconds
  // wide) with the playhead pinned at SCROLL_HEAD, so the waveform rolls live past
  // it instead of showing the whole static track. Static mode maps 1:1 as before.
  const scroll = cfg.playMode === 'scroll' && dur > 0 && N > 0;
  const winFrac = scroll ? clamp(cfg.scrollSpeed / dur, 0.02, 1) : 1;
  const startFrac = scroll ? playFrac - winFrac * SCROLL_HEAD : 0;
  const toTrack = (u01: number) => (scroll ? startFrac + u01 * winFrac : u01);

  // sample the envelope at panel-local u (with optional smoothing + clipping + roughness)
  const seed = cfg.seed * 2654435761;
  const sampleEnv = (env: Float32Array, u01: number) => {
    if (!env.length) return 0.04 + 0.03 * Math.sin(t * 2 + u01 * 20); // idle baseline
    const x01 = toTrack(u01);
    if (x01 < 0 || x01 > 1) return 0; // outside the track window → flat silence rolling in/out
    const fi = x01 * (env.length - 1);
    let v = env[Math.round(fi)] || 0;
    if (cfg.smoothing > 0) { const k = Math.max(1, Math.round(cfg.smoothing * 12)); let s = 0, n = 0; for (let i = -k; i <= k; i++) { const j = Math.round(fi) + i; if (j >= 0 && j < env.length) { s += env[j]; n++; } } v = s / n; }
    if (cfg.clipping > 0) { const th = 1 - cfg.clipping * 0.7; v = v > th ? th : v; v /= th; }
    if (cfg.edgeRoughness > 0) { const j = Math.sin((fi * 12.9 + seed) * 43758.5) ; v += (j - Math.floor(j) - 0.5) * cfg.edgeRoughness * 0.5 * (0.4 + bands.treb); }
    return clamp(v, 0, 1.5);
  };

  const grad = ctx.createLinearGradient(0, cy - halfH, 0, cy + halfH);
  grad.addColorStop(0, cfg.waveColor); grad.addColorStop(0.5, cfg.waveColor2); grad.addColorStop(1, cfg.waveColor);
  ctx.save();
  ctx.beginPath(); ctx.rect(r.x, r.y - r.h, r.w, r.h * 3); ctx.clip();
  ctx.shadowColor = cfg.waveColor; ctx.shadowBlur = cfg.glow;

  const step = Math.max(1, Math.round(2 / Math.max(0.2, cfg.waveDensity)));
  const mode = cfg.waveMode;

  if (mode === 'bars' || mode === 'pixel') {
    const bw = Math.max(2, Math.round((r.w / 220) / Math.max(0.25, cfg.waveDensity)));
    const gap = mode === 'pixel' ? Math.max(1, Math.round(bw * 0.4)) : Math.max(1, Math.round(bw * 0.25));
    ctx.fillStyle = grad;
    for (let x = r.x; x < r.x + r.w; x += bw + gap) {
      let v = sampleEnv(cols, (x - r.x) / r.w);
      if (mode === 'pixel') v = Math.round(v * 10) / 10;
      const h = v * halfH; if (cfg.symmetry) ctx.fillRect(x, cy - h, bw, h * 2); else ctx.fillRect(x, cy - h, bw, h);
    }
  } else if (mode === 'stereo' && data) {
    drawEnvFill(ctx, r, data.envL, sampleEnv, cy - r.h * 0.24, halfH * 0.7, cfg, grad, true, false);
    drawEnvFill(ctx, r, data.envR, sampleEnv, cy + r.h * 0.24, halfH * 0.7, cfg, grad, false, true);
  } else if (mode === 'freqsep') {
    const layer = (env: Float32Array, scale: number, col: string, alpha: number) => {
      ctx.globalAlpha = alpha; ctx.fillStyle = col; ctx.shadowColor = col;
      ctx.beginPath(); let started = false;
      for (let x = r.x; x <= r.x + r.w; x += step) { const v = sampleEnv(env, (x - r.x) / r.w) * scale; const y = cy - v * halfH; if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y); }
      for (let x = r.x + r.w; x >= r.x; x -= step) { const v = sampleEnv(env, (x - r.x) / r.w) * scale; ctx.lineTo(x, cy + v * halfH); }
      ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
    };
    layer(cols, 1 + bands.bass * 0.5, cfg.waveColor2, 0.55);                 // lows behind
    layer(cols, 0.7 + bands.mid * 0.5, '#ffffff', 0.18);                     // mids
    layer(cols, 0.45 + bands.treb * 0.6, cfg.waveColor, 0.7);               // highs front
  } else if (mode === 'line' || mode === 'smoothed') {
    ctx.strokeStyle = grad; ctx.lineWidth = cfg.waveThickness; ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let x = r.x; x <= r.x + r.w; x += step) { const v = sampleEnv(cols, (x - r.x) / r.w); const y = cy - v * halfH; if (x === r.x) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
    ctx.stroke();
    if (cfg.symmetry) { ctx.beginPath(); for (let x = r.x; x <= r.x + r.w; x += step) { const v = sampleEnv(cols, (x - r.x) / r.w); const y = cy + v * halfH; if (x === r.x) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.stroke(); }
  } else if (mode === 'granular') {
    // chopped grains pulled from audio-locked (slightly displaced) source columns
    ctx.fillStyle = grad;
    const gw = Math.max(4, Math.round((r.w / 90) / Math.max(0.3, cfg.waveDensity)));
    const gap = Math.round(gw * 0.45);
    for (let x = r.x; x < r.x + r.w; x += gw + gap) {
      const frac = (x - r.x) / r.w;
      const jr = Math.sin((x * 0.13 + seed) * 1.7); const ch = jr - Math.floor(jr);
      const src = clamp(frac + (ch - 0.5) * 0.12 * (0.5 + bands.punch), 0, 1);
      const v = sampleEnv(cols, src);
      const yoff = Math.sin((x * 0.21 + seed) * 3.1) * r.h * 0.06 * (0.4 + bands.treb);
      const h = v * halfH;
      ctx.fillRect(x, cy - h + yoff, gw, cfg.symmetry ? h * 2 : h);
    }
  } else if (mode === 'peakhold') {
    // live filled wave + a slowly-decaying peak-hold outline (meter style)
    drawEnvFill(ctx, r, cols, sampleEnv, cy, halfH, cfg, grad, true, cfg.symmetry);
    const M = peakHold.length;
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(1.5, W / 1100);
    ctx.beginPath();
    for (let i = 0; i < M; i++) { const x01 = i / (M - 1); const v = sampleEnv(cols, x01); peakHold[i] = Math.max(peakHold[i] * 0.97, v); const x = r.x + x01 * r.w, y = cy - peakHold[i] * halfH; if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
    ctx.stroke();
    if (cfg.symmetry) { ctx.beginPath(); for (let i = 0; i < M; i++) { const x01 = i / (M - 1); const x = r.x + x01 * r.w, y = cy + peakHold[i] * halfH; if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.stroke(); }
  } else {
    // filled / mirrored / clipped / glitch — a filled envelope shape
    drawEnvFill(ctx, r, cols, sampleEnv, cy, halfH, cfg, grad, true, cfg.symmetry);
    if (mode === 'glitch' && bands.punch > 0.4) {
      const slices = 2 + Math.floor((cfg.glitch + 0.3) * 4);
      for (let i = 0; i < slices; i++) { const yy = r.y + Math.random() * r.h, hh = 3 + Math.random() * 14, off = (Math.random() - 0.5) * r.w * 0.15; ctx.drawImage(ctx.canvas, r.x, yy, r.w, hh, r.x + off, yy, r.w, hh); }
    }
  }

  // live transient spike at the playhead (kicks/snares punch through)
  if (data && bands.punch > 0.25) {
    const px = cfg.playMode === 'scroll' ? r.x + r.w * SCROLL_HEAD : r.x + playFrac * r.w;
    const sh = halfH * (0.4 + bands.punch * 0.9);
    ctx.fillStyle = '#ffffff'; ctx.globalAlpha = clamp(bands.punch * 0.5, 0, 0.6);
    ctx.fillRect(px - Math.max(1, W / 1400), cy - sh, Math.max(2, W / 700), sh * 2); ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function drawEnvFill(
  ctx: CanvasRenderingContext2D, r: Rect, env: Float32Array,
  sampleEnv: (e: Float32Array, x: number) => number, cy: number, halfH: number,
  cfg: DawConfig, grad: CanvasGradient, fillTop: boolean, mirror: boolean,
) {
  const step = Math.max(1, Math.round(2 / Math.max(0.2, cfg.waveDensity)));
  ctx.globalAlpha = cfg.fillOpacity; ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(r.x, cy);
  for (let x = r.x; x <= r.x + r.w; x += step) { const v = sampleEnv(env, (x - r.x) / r.w); ctx.lineTo(x, cy - v * halfH); }
  if (mirror) { for (let x = r.x + r.w; x >= r.x; x -= step) { const v = sampleEnv(env, (x - r.x) / r.w); ctx.lineTo(x, cy + v * halfH); } }
  else { ctx.lineTo(r.x + r.w, cy); }
  ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
}

export function makeDawVisualizer(config: DawConfig) {
  const Comp: React.FC<VisualizerProps> = (props) => <DawWaveformVisualizer {...props} config={config} />;
  Comp.displayName = `DAW(${config.name})`;
  return Comp;
}
