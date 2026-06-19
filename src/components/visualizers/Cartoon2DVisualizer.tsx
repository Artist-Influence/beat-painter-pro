import React, { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { VisualizerProps } from '../visualizer';
import type { Cartoon2DConfig } from '@/lib/cartoon/cartoonEngine';
import { CARTOON_FRAG } from '@/lib/cartoon/cartoonShader';
import { FRACTAL_VERT } from '@/lib/fractal/shaders';
import { createBandProcessor } from '@/lib/audioBands';
import { useStudioStore } from '@/stores/studioStore';
import { lerpHueDeg } from '@/lib/hueSmooth';

export function Cartoon2DVisualizer({ config, audioData }: VisualizerProps & { config: Cartoon2DConfig }) {
  const { gl } = useThree();
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const proc = useMemo(() => createBandProcessor(), []);
  const timeRef = useRef(0);
  const hueRef = useRef(useStudioStore.getState().colorHue); // smoothed recolour hue

  const uniforms = useMemo(() => ({
    iResolution: { value: new THREE.Vector2(1, 1) },
    uTime: { value: 0 },
    uShape: { value: config.shape },
    uColA: { value: new THREE.Color(config.palette[0]) },
    uColB: { value: new THREE.Color(config.palette[1]) },
    uColC: { value: new THREE.Color(config.palette[2]) },
    uOutline: { value: new THREE.Color(config.outline) },
    uOutlineW: { value: config.outlineWidth },
    uSpin: { value: config.spin },
    uSatellites: { value: config.satellites },
    uBass: { value: 0 }, uMid: { value: 0 }, uTreble: { value: 0 }, uLevel: { value: 0 }, uBeat: { value: 0 },
    uZoomFx: { value: 1 },
    // composed-scene params (uShape === 20)
    uSceneBgMode: { value: config.scene?.bgMode ?? 0 },
    uSceneParticle: { value: config.scene?.particle ?? 0 },
    uSceneParticleShape: { value: config.scene?.particleShape ?? 0 },
    uSceneSubject: { value: config.scene?.subject ?? -1 },
    uSceneDensity: { value: config.scene?.density ?? 0.6 },
    uSceneBgTop: { value: new THREE.Color(config.scene?.bgTop ?? '#222233') },
    uSceneBgBot: { value: new THREE.Color(config.scene?.bgBot ?? '#0c0c14') },
    uSceneGround: { value: new THREE.Color(config.scene?.ground ?? '#1a1a22') },
    uSceneParticleCol: { value: new THREE.Color(config.scene?.particleCol ?? '#ffffff') },
    uSceneSubjectCol: { value: new THREE.Color(config.scene?.subjectCol ?? '#ffcc44') },
  }), [config]);

  useFrame((_, delta) => {
    const u = matRef.current?.uniforms;
    if (!u) return;
    timeRef.current += Math.min(delta, 0.05);
    const s = proc(audioData?.frequencyRaw ?? audioData?.frequency ?? [], audioData?.amplitude || 0, audioData?.beatStrength || 0);
    u.uTime.value = timeRef.current;
    u.uBass.value = s.bass; u.uMid.value = s.mid; u.uTreble.value = s.treble;
    u.uLevel.value = s.level; u.uBeat.value = s.beat;
    const st = useStudioStore.getState();
    u.uZoomFx.value = st.zoomLevel || 1;
    hueRef.current = lerpHueDeg(hueRef.current, st.colorHue, 0.12); // ease recolour, no jump
    if (st.colorOverride) {
      const h = hueRef.current / 360;
      (u.uColA.value as THREE.Color).setHSL(h, 0.82, 0.58);
      (u.uColB.value as THREE.Color).setHSL((h + 0.08) % 1, 0.85, 0.62);
      (u.uColC.value as THREE.Color).setHSL((h + 0.5) % 1, 0.8, 0.6);
      (u.uSceneParticleCol.value as THREE.Color).setHSL((h + 0.05) % 1, 0.9, 0.72);
      (u.uSceneSubjectCol.value as THREE.Color).setHSL((h + 0.05) % 1, 0.8, 0.6);
      (u.uSceneBgTop.value as THREE.Color).setHSL(h, 0.5, 0.62);
      (u.uSceneBgBot.value as THREE.Color).setHSL(h, 0.62, 0.28);
    }
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
        fragmentShader={CARTOON_FRAG}
        transparent
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  );
}

export function makeCartoonVisualizer(config: Cartoon2DConfig) {
  const Comp: React.FC<VisualizerProps> = (props) => <Cartoon2DVisualizer {...props} config={config} />;
  Comp.displayName = `Cartoon(${config.name})`;
  return Comp;
}
