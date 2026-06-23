/**
 * ProceduralVisualizer
 * Unified renderer for procedurally generated visualizers
 * Uses neutral white/gray materials suitable for texture overlays
 */

import React, { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { VisualizerConfig, AudioData } from '@/lib/visualizerFactory/config';
import { getShapeConfig, getAudioConfig } from '@/lib/visualizerFactory/modules';
import { generateLayoutPositions } from '@/lib/visualizerFactory/layoutGenerator';
import { getIdleAnimation } from '@/lib/visualizerFactory/audioProcessing';
import { updateMotionState, createMotionState } from '@/lib/visualizerFactory/motionGenerator';
import { createBandProcessor } from '@/lib/audioBands';
import { useStudioStore } from '@/stores/studioStore';
import { renderGate } from '@/lib/renderReadyGate';
import { SHAPE_COMPONENTS } from './shapes';

interface ProceduralVisualizerProps {
  config: VisualizerConfig;
  audioData: AudioData;
  isPlaying?: boolean;
}

export function ProceduralVisualizer({ config, audioData, isPlaying = true }: ProceduralVisualizerProps) {
  const groupRef = useRef<THREE.Group>(null);
  const audioDataRef = useRef(audioData);
  const timeRef = useRef(0);
  const pulseRef = useRef(1);       // smoothed scale-pulse envelope (fast attack, slow release)
  const bandsRef = useRef({ bass: 0, mids: 0, highs: 0, rawBass: 0, rawMids: 0, rawHighs: 0 });
  const audioSensitivity = useStudioStore((s) => s.audioSensitivity);
  
  // Audio profile (still used to pick how bass drives the group: scale vs expand).
  const audioConfig = getAudioConfig(config.audioProfile);
  // Punchy, onset-driven bands - the SAME transient engine every other visualizer
  // family uses. Replaces the old band-average smoother so models actually SNAP to
  // drums (instant attack + short decay) instead of drifting on loudness averages.
  const band = useMemo(() => createBandProcessor(), []);
  
  // Motion state
  const motionState = useMemo(() => createMotionState(config.shapeParams.elementCount), [config]);
  
  // Generate layout positions
  const layoutPoints = useMemo(() => generateLayoutPositions(
    config.layout,
    config.shapeParams.elementCount,
    config.layoutParams,
    config.seed
  ), [config]);
  
  // Shape config for scaling
  const shapeConfig = getShapeConfig(config.shape);
  
  // Signal geometry ready after layout generation
  useEffect(() => {
    // Mark geometry ready after a short delay to ensure mount is complete
    const timer = setTimeout(() => {
      renderGate.markGeometryReady();
    }, 50);
    return () => clearTimeout(timer);
  }, [config.seed]);

  // Skinning: shapes ship neutral white/gray (built for texture overlays). When
  // a Visual Style texture is applied we map it onto every mesh (normalized like
  // the library visualizers); otherwise we tint from a seed-derived palette.
  const [styleVersion, setStyleVersion] = useState(0);
  useEffect(() => {
    const h = () => setStyleVersion((v) => v + 1);
    window.addEventListener('style:applied', h);
    window.addEventListener('texture:applied', h);
    window.addEventListener('texture:cleared', h);
    window.addEventListener('color:override', h);
    return () => {
      window.removeEventListener('style:applied', h);
      window.removeEventListener('texture:applied', h);
      window.removeEventListener('texture:cleared', h);
      window.removeEventListener('color:override', h);
    };
  }, []);

  useEffect(() => {
    const st = useStudioStore.getState();
    const override = st.colorOverride;
    const baseHue = override ? st.colorHue / 360 : (((config.seed % 360) + 360) % 360) / 360;
    // colour override wins over a style texture for recolouring
    const appliedTexture = override ? null : ((window as any).appliedTexture as string | null);
    let tex: THREE.Texture | null = null;
    if (appliedTexture) {
      tex = new THREE.TextureLoader().load(appliedTexture);
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.needsUpdate = true;
    }

    // Seed-derived look: every roll gets a colour SCHEME (how hues spread across
    // parts) + MOOD (sat/lightness/glow) + MATERIAL family (metal/gloss/matte/
    // neon/glass). 5×5×5 looks layered on top of the shape variety so rolls feel
    // genuinely different instead of all one flat hue.
    const sr = (n: number) => { const x = Math.sin((config.seed * 0.0001 + n * 1.7) * 12.9898) * 43758.5453; return x - Math.floor(x); };
    const SCHEMES = ['mono', 'analogous', 'complementary', 'triad', 'spread'] as const;
    // Every mood is saturated with an emissive floor so a procedural 3D shape is
    // never "colourless" - the old grey metallic-tint / pale-pastel moods read as
    // boring grey shapes (esp. in Party mode), so they're gone.
    const MOODS = [
      { s: 0.85, l: 0.55, e: 0.40 }, // vibrant
      { s: 0.98, l: 0.60, e: 0.95 }, // neon
      { s: 0.70, l: 0.66, e: 0.34 }, // bright
      { s: 0.82, l: 0.50, e: 0.50 }, // jewel
      { s: 0.74, l: 0.44, e: 0.42 }, // deep
    ];
    const MATS = [
      { metal: 0.55, rough: 0.28, glass: false }, // satin metal - keeps its colour (not grey chrome)
      { metal: 0.45, rough: 0.14, glass: false }, // gloss
      { metal: 0.0, rough: 0.7, glass: false },   // matte
      { metal: 0.2, rough: 0.45, glass: false },  // emissive/neon
      { metal: 0.0, rough: 0.1, glass: true },    // glass
    ];
    const scheme = override ? 'mono' : SCHEMES[Math.floor(sr(1) * SCHEMES.length) % SCHEMES.length];
    const mood = override ? MOODS[0] : MOODS[Math.floor(sr(2) * MOODS.length) % MOODS.length];
    const mat = override ? MATS[1] : MATS[Math.floor(sr(3) * MATS.length) % MATS.length];
    const hueOff = (i: number) =>
      scheme === 'mono' ? 0
      : scheme === 'analogous' ? i * 0.035
      : scheme === 'complementary' ? (i % 2) * 0.5
      : scheme === 'triad' ? (i % 3) / 3
      : i * 0.13;

    const timer = setTimeout(() => {
      const g = groupRef.current;
      if (!g) return;
      let i = 0;
      g.traverse((o: any) => {
        if (!(o.isMesh || o.isPoints || o.isLine)) return;
        const apply = (m: any) => {
          if (!m || !m.color) return;
          if (tex) {
            m.color.set('#ffffff');
            m.map = tex;
            if ('emissive' in m) { m.emissive.set('#ffffff'); m.emissiveMap = tex; m.emissiveIntensity = 0.5; }
          } else {
            const hh = (baseHue + hueOff(i)) % 1;
            m.map = null;
            if ('emissiveMap' in m) m.emissiveMap = null;
            m.color.setHSL(hh, mood.s, mood.l);
            if ('metalness' in m) { m.metalness = mat.metal; m.roughness = mat.rough; }
            if (mat.glass && 'transparent' in m) { m.transparent = true; m.opacity = 0.82; m.depthWrite = false; }
            if (m.emissive) {
              const eh = scheme === 'complementary' ? (hh + 0.5) % 1 : hh;
              m.emissive.setHSL(eh, mood.s * 0.9, Math.min(0.6, mood.l * 0.9));
              m.emissiveIntensity = mood.e;
            }
          }
          m.needsUpdate = true;
        };
        Array.isArray(o.material) ? o.material.forEach(apply) : apply(o.material);
        i++;
      });
    }, 90);
    return () => clearTimeout(timer);
  }, [config.seed, styleVersion]);
  
  // Keep audioData ref updated
  audioDataRef.current = audioData;
  
  useFrame((state, delta) => {
    if (!groupRef.current) return;
    
    const time = state.clock.elapsedTime;
    timeRef.current = time;
    const audio = audioDataRef.current;

    // Punchy onset-driven bands (instant attack, short decay, peak-normalised).
    const f = band(audio.frequency || [], audio.amplitude || 0, audio.beatStrength || 0);
    let bass = f.bass, mids = f.mid, highs = f.treble, beat = f.beat;

    // Idle breathing only when there's effectively no signal at all.
    const isIdle = (f.level + f.bass + f.mid + f.treble) < 0.025;
    if (isIdle) {
      const idle = getIdleAnimation(time);
      bass = idle.bass; mids = idle.mids; highs = idle.highs; beat = 0;
    } else {
      // Models want a stronger response than the (calmer) global default so they
      // clearly PULSE with the beat instead of just spinning. Boost + clamp here.
      const MR = 1.6;
      bass = Math.min(2.4, bass * MR); mids = Math.min(2.4, mids * MR);
      highs = Math.min(2.4, highs * MR); beat = Math.min(2.4, beat * MR);
    }

    // Hand the shapes the punchy bands so each shape's own per-element reactivity
    // (scale pulses, orbit speed, displacement) snaps on the beat. rawBass carries
    // the pure transient hit for shapes that want the sharpest spike.
    bandsRef.current = {
      bass, mids, highs,
      rawBass: isIdle ? bass : Math.max(bass, f.bassHit),
      rawMids: isIdle ? mids : Math.max(mids, f.lowMidHit, f.highMidHit),
      rawHighs: isIdle ? highs : Math.max(highs, f.highHit),
    };

    // Update motion state
    updateMotionState(motionState, config.motion, config.motionParams, delta, mids);

    // Group-level drive: bass swells the whole model, the master beat adds a sharp
    // pop on top. Clamped so a hard drop can't balloon it past ~2.4x.
    const sensitivity = audioSensitivity.animationSpeed * config.audioParams.globalSensitivity;
    const bassEffect = bass * config.audioParams.bassMultiplier * sensitivity;
    const beatPop = beat * sensitivity;
    // The resting footprint is normalised in generateModelConfig so a roll never
    // loads oversized; the Zoom slider (0.15..6, 1 = 100%) then scales it live so
    // the user can zoom an object out/in. ProceduralVisualizer previously ignored
    // zoom entirely, which is why models stayed huge even at 15% zoom.
    const zoomFx = useStudioStore.getState().zoomLevel || 1;
    const baseScale = shapeConfig.defaultScale * config.shapeParams.scale;
    // Pump primarily on the BEAT (the kick/snare you hear) with a little continuous
    // bass swell underneath, so it visibly hits in time with the uploaded track.
    const gain = audioConfig.bass.target === 'expand' ? 0.7 : audioConfig.bass.target === 'scale' ? 0.55 : 0.45;

    // Pulse envelope: SNAP up on a beat, fall back FAST so consecutive kicks/hats
    // read as distinct snaps (quick attack + quick decay) rather than a smeared
    // pulse. Centred, so a fast decay reads as crisp pumping, not random jumping.
    const targetPulse = Math.min(2.7, 1 + beatPop * 1.05 + bassEffect * gain);
    const pr = pulseRef.current;
    pulseRef.current = pr + (targetPulse - pr) * (targetPulse > pr ? 0.65 : 0.32);
    groupRef.current.scale.setScalar(baseScale * pulseRef.current * zoomFx);

    // Intentional motion, NOT random wander: a slow steady spin + a sharp kick on
    // each beat, and the model stays CENTRED. The old code drove rotation AND
    // position from the time-based motionState, so models drifted/jumped around
    // with no relation to the audio. motionState still feeds per-shape internals.
    const spin = audioSensitivity.spinSpeed;
    groupRef.current.rotation.y = time * (0.16 + spin * 0.5) + beat * 0.22;
    groupRef.current.rotation.x = Math.sin(time * 0.22) * 0.12 + beat * 0.12;
    groupRef.current.rotation.z = 0;
    groupRef.current.position.set(0, beat * 0.06, 0); // tiny upward bob on the beat only
  });
  
  // Get the shape component for this family
  const ShapeComponent = SHAPE_COMPONENTS[config.shape];
  
  return (
    <group ref={groupRef}>
      <ShapeComponent
        config={config}
        layoutPoints={layoutPoints}
        audioData={bandsRef.current}
        time={timeRef.current}
        motionState={motionState}
        audioSensitivity={audioSensitivity.animationSpeed}
      />
      <ambientLight intensity={0.5} />
      <pointLight position={[5, 5, 5]} intensity={1} />
      <pointLight position={[-3, -3, 3]} intensity={0.5} />
    </group>
  );
}

export default ProceduralVisualizer;
