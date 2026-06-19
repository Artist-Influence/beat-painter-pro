import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { VisualizerProps } from '../visualizer';
import { randomFractal, type FractalConfig } from '@/lib/fractal/engine';
import { FRACTAL_VERT, FRACTAL_FRAG_2D, FRACTAL_FRAG_3D } from '@/lib/fractal/shaders';
import { useStudioStore } from '@/stores/studioStore';
import { createBandProcessor } from '@/lib/audioBands';

const _c1 = new THREE.Color();
const _c2 = new THREE.Color();

interface FractalVisualizerProps extends VisualizerProps {
  config: FractalConfig;
}

export function FractalVisualizer({ config, audioData, isPlaying }: FractalVisualizerProps) {
  const { gl } = useThree();
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const initFractalReactivity = useStudioStore((s) => s.initFractalReactivity);

  // Load this fractal's mapping into the live audio-mapping panel on mount/reroll.
  useEffect(() => {
    initFractalReactivity(config.react);
  }, [config, initFractalReactivity]);

  // punchy, transient-emphasized band processor (reacts to drum hits)
  const proc = useMemo(() => createBandProcessor(), []);
  const timeRef = useRef(0);
  const zoomRef = useRef(config.baseZoom);
  const rotRef = useRef(0);

  const uniforms = useMemo(() => {
    const p = config.palette;
    return {
      iResolution: { value: new THREE.Vector2(1, 1) },
      uTime: { value: 0 },
      uType: { value: config.type },
      pa: { value: new THREE.Vector3(...p.a) },
      pb: { value: new THREE.Vector3(...p.b) },
      pc: { value: new THREE.Vector3(...p.c) },
      pd: { value: new THREE.Vector3(...p.d) },
      uPaletteShift: { value: config.paletteShift },
      uColorScale: { value: config.colorScale },
      uGlow: { value: config.glow },
      uBass: { value: 0 }, uMid: { value: 0 }, uTreble: { value: 0 },
      uLevel: { value: 0 }, uBeat: { value: 0 },
      uRZoom: { value: config.react.zoom }, uRHue: { value: config.react.hue },
      uRGlow: { value: config.react.glow }, uRMorph: { value: config.react.morph },
      uRRot: { value: config.react.rotation }, uRIter: { value: config.react.iterations },
      uRWarp: { value: config.react.warp }, uRKaleido: { value: config.react.kaleido },
      // 2D
      uCenter: { value: new THREE.Vector2(...config.center) },
      uZoom: { value: config.baseZoom },
      uJuliaC: { value: new THREE.Vector2(...config.juliaC) },
      uIter: { value: config.iterations },
      uKaleido: { value: config.kaleido },
      uRotation: { value: 0 },
      uWarp: { value: config.warpAmount },
      // 3D
      uPower: { value: config.power },
      uCamDist: { value: config.camDist },
      uCamSpeed: { value: config.camSpeed },
      uJuliaC3: { value: new THREE.Vector3(...config.juliaC3) },
      uJuliaMode: { value: config.juliaMode },
      uRotMat: {
        value: new THREE.Matrix3().setFromMatrix4(
          new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(config.rotIter[0], config.rotIter[1], config.rotIter[2])),
        ),
      },
    };
  }, [config]);

  const fragmentShader = config.family === '3d' ? FRACTAL_FRAG_3D : FRACTAL_FRAG_2D;

  useFrame((_, delta) => {
    const u = matRef.current?.uniforms;
    if (!u) return;
    const dt = Math.min(delta, 0.05);
    timeRef.current += dt;

    // punchy, drum-following bands
    const s = proc(audioData?.frequencyRaw ?? audioData?.frequency ?? [], audioData?.amplitude || 0, audioData?.beatStrength || 0);

    // per-target mapping weights from the panel (master sensitivity/enabled is
    // already applied upstream in VisualizerCanvas, so audioData is pre-scaled).
    const fr = useStudioStore.getState().fractalReactivity;
    const spin = useStudioStore.getState().audioSensitivity.spinSpeed || 0;

    // auto drift + audio-modulated zoom (2D), clamped to keep float precision sane
    zoomRef.current *= 1 + config.zoomDrift * dt;
    zoomRef.current = THREE.MathUtils.clamp(zoomRef.current, 0.0008, 6);
    rotRef.current += (config.rotationSpeed + s.beat * fr.rotation * 0.9 + spin * 0.3) * dt;
    // 3D fractals: add spin to the orbiting camera speed
    u.uCamSpeed.value = config.camSpeed + spin * 0.18;

    // content zoom (no crop): zoom out widens the view, zoom in moves closer
    const zoomFx = useStudioStore.getState().zoomLevel || 1;
    u.uTime.value = timeRef.current;
    u.uBass.value = s.bass; u.uMid.value = s.mid; u.uTreble.value = s.treble;
    u.uLevel.value = s.level; u.uBeat.value = s.beat;
    u.uZoom.value = zoomRef.current / zoomFx;
    u.uCamDist.value = config.camDist / zoomFx;
    u.uRotation.value = rotRef.current;

    // universal colour override: recolour as a duotone (dark -> bright) of the hue
    const st = useStudioStore.getState();
    if (st.colorOverride) {
      const h = st.colorHue / 360;
      _c1.setHSL(h, 0.6, 0.12);
      _c2.setHSL((h + 0.06) % 1, 0.88, 0.66);
      (u.pa.value as THREE.Vector3).set((_c1.r + _c2.r) / 2, (_c1.g + _c2.g) / 2, (_c1.b + _c2.b) / 2);
      (u.pb.value as THREE.Vector3).set((_c2.r - _c1.r) / 2, (_c2.g - _c1.g) / 2, (_c2.b - _c1.b) / 2);
      (u.pc.value as THREE.Vector3).set(1, 1, 1);
      (u.pd.value as THREE.Vector3).set(0, 0, 0);
    }

    // push live mapping weights into the shader
    u.uRZoom.value = fr.zoom; u.uRHue.value = fr.hue; u.uRGlow.value = fr.glow;
    u.uRMorph.value = fr.morph; u.uRRot.value = fr.rotation; u.uRIter.value = fr.iterations;
    u.uRWarp.value = fr.warp; u.uRKaleido.value = fr.kaleido;

    const size = gl.getDrawingBufferSize(new THREE.Vector2());
    (u.iResolution.value as THREE.Vector2).set(size.x || 1, size.y || 1);
  });

  return (
    <mesh frustumCulled={false} renderOrder={-1}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        vertexShader={FRACTAL_VERT}
        fragmentShader={fragmentShader}
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  );
}

/** Wrap a FractalConfig into a registry-compatible visualizer component. */
export function makeFractalVisualizer(config: FractalConfig) {
  const Comp: React.FC<VisualizerProps> = (props) => <FractalVisualizer {...props} config={config} />;
  Comp.displayName = `Fractal(${config.name})`;
  return Comp;
}

/**
 * Random Fractal - generates a unique config on mount and re-rolls whenever a
 * `fractal:reroll` window event fires (the studio dispatches this when the user
 * re-clicks the Random card). Every roll is a genuinely different scene.
 */
export const RandomFractalVisualizer: React.FC<VisualizerProps> = (props) => {
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e9));
  useEffect(() => {
    const reroll = () => setSeed(Math.floor(Math.random() * 1e9));
    window.addEventListener('fractal:reroll', reroll);
    return () => window.removeEventListener('fractal:reroll', reroll);
  }, []);
  const config = useMemo(() => randomFractal(seed), [seed]);
  // key forces a clean remount (fresh uniforms/shader) on every roll
  return <FractalVisualizer key={seed} {...props} config={config} />;
};

export default FractalVisualizer;
