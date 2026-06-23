/**
 * GradientOverlay - layers the active Visual Style gradient over the whole scene,
 * inside the r3f Canvas so it applies uniformly to EVERY visualizer type (3D
 * models, fractals, cartoon, sand, DAW) and is captured by the WebM export.
 *
 * Renders a clip-space full-screen quad on top (renderOrder high, no depth) that
 * samples `window.appliedTexture` (a data-URL gradient produced by the style
 * picker) at a moderate opacity. Shows only while a style is applied; clears with
 * `style:applied` / `style:cleared` events.
 */
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

const VERT = `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;
const FRAG = `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uTex;
  uniform float uOpacity;
  void main() {
    vec3 c = texture2D(uTex, vUv).rgb;
    gl_FragColor = vec4(c, uOpacity);
  }
`;

export function GradientOverlay() {
  const [hasTex, setHasTex] = useState(false);
  const uniforms = useRef({ uTex: { value: null as THREE.Texture | null }, uOpacity: { value: 0.33 } });

  useEffect(() => {
    let alive = true;
    const loader = new THREE.TextureLoader();
    const load = () => {
      const url = (window as unknown as { appliedTexture?: string | null }).appliedTexture ?? null;
      const op = (window as unknown as { styleOverlayOpacity?: number }).styleOverlayOpacity;
      if (!url) { if (alive) { uniforms.current.uTex.value = null; setHasTex(false); } return; }
      loader.load(url, (t) => {
        if (!alive) return;
        t.colorSpace = THREE.SRGBColorSpace;
        uniforms.current.uTex.value = t;
        uniforms.current.uOpacity.value = typeof op === 'number' ? op : 0.33;
        setHasTex(true);
      });
    };
    load();
    window.addEventListener('style:applied', load);
    window.addEventListener('style:cleared', load);
    return () => { alive = false; window.removeEventListener('style:applied', load); window.removeEventListener('style:cleared', load); };
  }, []);

  if (!hasTex) return null;
  return (
    <mesh renderOrder={9999} frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={uniforms.current}
        transparent
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  );
}

export default GradientOverlay;
