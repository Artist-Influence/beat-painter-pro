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
import { analyzeFrequencyBands, createAudioSmoother, transientBlend, getIdleAnimation } from '@/lib/visualizerFactory/audioProcessing';
import { updateMotionState, createMotionState } from '@/lib/visualizerFactory/motionGenerator';
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
  const bandsRef = useRef({ bass: 0, mids: 0, highs: 0, rawBass: 0, rawMids: 0, rawHighs: 0 });
  const audioSensitivity = useStudioStore((s) => s.audioSensitivity);
  
  // Audio smoother with attack/release from audio profile
  const audioConfig = getAudioConfig(config.audioProfile);
  const smoother = useMemo(() => createAudioSmoother({
    bassAttack: audioConfig.bass.attack,
    bassRelease: audioConfig.bass.release,
    midsAttack: audioConfig.mids.attack,
    midsRelease: audioConfig.mids.release,
    highsAttack: audioConfig.highs.attack,
    highsRelease: audioConfig.highs.release,
  }), [config.audioProfile]);
  
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
    const MOODS = [
      { s: 0.82, l: 0.55, e: 0.28 }, // vibrant
      { s: 0.95, l: 0.60, e: 0.95 }, // neon
      { s: 0.42, l: 0.74, e: 0.12 }, // pastel
      { s: 0.20, l: 0.62, e: 0.12 }, // metallic-tint
      { s: 0.72, l: 0.42, e: 0.34 }, // deep
    ];
    const MATS = [
      { metal: 0.92, rough: 0.24, glass: false }, // chrome
      { metal: 0.45, rough: 0.14, glass: false }, // gloss
      { metal: 0.0, rough: 0.85, glass: false },  // matte
      { metal: 0.25, rough: 0.5, glass: false },  // emissive/neon
      { metal: 0.0, rough: 0.06, glass: true },   // glass
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
            if (mat.glass && 'transparent' in m) { m.transparent = true; m.opacity = 0.64; m.depthWrite = false; }
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
    
    // Analyze audio
    const rawBands = analyzeFrequencyBands(audio.frequency);
    const bands = smoother.update(rawBands);
    
    // Apply idle animation if no audio
    let effectiveBass = bands.bass;
    let effectiveMids = bands.mids;
    let effectiveHighs = bands.highs;
    
    if (bands.isIdle) {
      const idle = getIdleAnimation(time);
      effectiveBass = idle.bass;
      effectiveMids = idle.mids;
      effectiveHighs = idle.highs;
    }
    
    // Blend raw and smoothed for punch
    const punchyBass = transientBlend(bands.rawBass, effectiveBass, 0.55);
    
    // Store for shape components
    bandsRef.current = {
      bass: punchyBass,
      mids: effectiveMids,
      highs: effectiveHighs,
      rawBass: bands.rawBass,
      rawMids: bands.rawMids,
      rawHighs: bands.rawHighs,
    };
    
    // Update motion state
    updateMotionState(motionState, config.motion, config.motionParams, delta, effectiveMids);
    
    // Apply audio profile effects
    const sensitivity = audioSensitivity.animationSpeed * config.audioParams.globalSensitivity;
    const bassEffect = punchyBass * config.audioParams.bassMultiplier * sensitivity;
    
    // Apply to group based on audio profile target
    const baseScale = shapeConfig.defaultScale * config.shapeParams.scale;
    
    switch (audioConfig.bass.target) {
      case 'scale':
        groupRef.current.scale.setScalar(baseScale * (1 + bassEffect * 0.9));
        break;
      case 'expand':
        groupRef.current.scale.setScalar(baseScale * (1 + bassEffect * 1.3));
        break;
      default:
        groupRef.current.scale.setScalar(baseScale * (1 + bassEffect * 0.6));
    }
    
    // Apply motion
    groupRef.current.rotation.x = motionState.groupRotation.x;
    groupRef.current.rotation.y = motionState.groupRotation.y + audioSensitivity.spinSpeed * time * 0.5;
    groupRef.current.rotation.z = motionState.groupRotation.z;
    groupRef.current.position.copy(motionState.groupPosition);
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
