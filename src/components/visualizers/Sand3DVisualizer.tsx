import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { VisualizerProps } from '../visualizer';
import { createBandProcessor } from '@/lib/audioBands';
import { useStudioStore } from '@/stores/studioStore';
import {
  type Sand3DConfig,
  SAND3D_PALETTES,
  FULLSCREEN_VS,
  INIT_FS,
  SIM_FS,
  POINTS_VS,
  POINTS_FS,
  FADE_FS,
  COMPOSITE_FS,
} from '@/lib/sand3d/unicornEngine';

/* deterministic per-particle seed RNG (mirrors the engine's rng) */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Resources {
  texSize: number;
  count: number;
  seedTex: THREE.DataTexture;
  simRT: THREE.WebGLRenderTarget[];
  trailRT: THREE.WebGLRenderTarget;
  trailW: number;
  trailH: number;
  quadGeo: THREE.BufferGeometry;
  quadMesh: THREE.Mesh;
  quadScene: THREE.Scene;
  pointsScene: THREE.Scene;
  pointsObj: THREE.Points;
  initMat: THREE.RawShaderMaterial;
  simMat: THREE.RawShaderMaterial;
  fadeMat: THREE.RawShaderMaterial;
  pointsMat: THREE.RawShaderMaterial;
  compositeMat: THREE.RawShaderMaterial;
  planeGeo: THREE.PlaneGeometry;
  cam: THREE.PerspectiveCamera;
  dummyCam: THREE.Camera;
  cur: number;
  inited: boolean;
  dispose: () => void;
}

function makeMRT(w: number, h: number): THREE.WebGLRenderTarget {
  const rt = new THREE.WebGLRenderTarget(w, h, {
    count: 2,
    type: THREE.HalfFloatType,
    format: THREE.RGBAFormat,
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    wrapS: THREE.ClampToEdgeWrapping,
    wrapT: THREE.ClampToEdgeWrapping,
    depthBuffer: false,
    stencilBuffer: false,
  } as THREE.RenderTargetOptions);
  return rt;
}

function makeTrail(w: number, h: number): THREE.WebGLRenderTarget {
  return new THREE.WebGLRenderTarget(w, h, {
    type: THREE.HalfFloatType,
    format: THREE.RGBAFormat,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    wrapS: THREE.ClampToEdgeWrapping,
    wrapT: THREE.ClampToEdgeWrapping,
    depthBuffer: false,
    stencilBuffer: false,
  });
}

function buildResources(gl: THREE.WebGLRenderer, config: Sand3DConfig): Resources {
  // Enable float-buffer rendering (needed for the HalfFloat sim/trail targets).
  const ctx = gl.getContext() as WebGL2RenderingContext;
  ctx.getExtension('EXT_color_buffer_float');

  // Particle budget scales with viewport area (like UR-6), packed into a square texture.
  const isMobile = typeof navigator !== 'undefined' &&
    (/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && window.innerWidth < 900));
  const area = (typeof window !== 'undefined' ? window.innerWidth * window.innerHeight : 1920 * 1080);
  // Budget trimmed for production smoothness (was 95k/40k) - still dense, far cheaper.
  const target = Math.min(isMobile ? 26000 : 62000, Math.max(16000, area / 18));
  const texSize = Math.max(128, Math.ceil(Math.sqrt(target)));
  const count = texSize * texSize;

  // Per-particle seed texture: r = hash seed, g/b = spawn angles.
  const sdata = new Float32Array(count * 4);
  const r = rng(0x9e37 ^ (config.paletteIndex + 1) * 2654435761);
  for (let i = 0; i < count; i++) {
    sdata[i * 4] = r() * 100;
    sdata[i * 4 + 1] = r();
    sdata[i * 4 + 2] = r();
    sdata[i * 4 + 3] = 1;
  }
  const seedTex = new THREE.DataTexture(sdata, texSize, texSize, THREE.RGBAFormat, THREE.FloatType);
  seedTex.minFilter = THREE.NearestFilter;
  seedTex.magFilter = THREE.NearestFilter;
  seedTex.needsUpdate = true;

  const simRT = [makeMRT(texSize, texSize), makeMRT(texSize, texSize)];

  const dbs = gl.getDrawingBufferSize(new THREE.Vector2());
  const trailW = Math.max(2, Math.floor(dbs.x));
  const trailH = Math.max(2, Math.floor(dbs.y));
  const trailRT = makeTrail(trailW, trailH);

  // Fullscreen triangle for the GPGPU + fade passes.
  const quadGeo = new THREE.BufferGeometry();
  quadGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
  quadGeo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0, 0, 2, 0, 0, 2]), 2));

  const baseRaw = { glslVersion: THREE.GLSL3, depthTest: false, depthWrite: false };

  const initMat = new THREE.RawShaderMaterial({
    ...baseRaw,
    vertexShader: FULLSCREEN_VS,
    fragmentShader: INIT_FS,
    blending: THREE.NoBlending,
    uniforms: { uSeed: { value: seedTex } },
  });

  const simMat = new THREE.RawShaderMaterial({
    ...baseRaw,
    vertexShader: FULLSCREEN_VS,
    fragmentShader: SIM_FS,
    blending: THREE.NoBlending,
    uniforms: {
      uPos: { value: null }, uVel: { value: null }, uSeed: { value: seedTex },
      uDt: { value: 0 }, uTime: { value: 0 }, uSpeed: { value: 0 }, uSwirl: { value: 0 },
      uScatter: { value: 0 }, uShape: { value: 0 }, uPump: { value: 0 }, uPull: { value: 0 },
      uWander: { value: 0 }, uWT: { value: 0 },
    },
  });

  const fadeMat = new THREE.RawShaderMaterial({
    ...baseRaw,
    vertexShader: FULLSCREEN_VS,
    fragmentShader: FADE_FS,
    transparent: true,
    blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.ZeroFactor,
    blendDst: THREE.OneMinusSrcColorFactor,
    blendEquationAlpha: THREE.AddEquation,
    blendSrcAlpha: THREE.ZeroFactor,
    blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
    uniforms: { uFade: { value: 0 } },
  });

  const quadMesh = new THREE.Mesh(quadGeo, initMat);
  quadMesh.frustumCulled = false;
  const quadScene = new THREE.Scene();
  quadScene.add(quadMesh);

  // Points: a dummy position attribute sets the particle count; gl_VertexID does the rest.
  const pgeo = new THREE.BufferGeometry();
  pgeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  const pointsMat = new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: POINTS_VS,
    fragmentShader: POINTS_FS,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uPos: { value: null }, uVel: { value: null }, uSeed: { value: seedTex },
      uTexSize: { value: new THREE.Vector2(texSize, texSize) },
      uVP: { value: new THREE.Matrix4() },
      uSize: { value: 1 }, uHue: { value: 0 }, uGlowB: { value: 1 }, uPx: { value: 1 },
      uSparkle: { value: 0 }, uTime: { value: 0 },
      uBaseHue: { value: SAND3D_PALETTES[config.paletteIndex].hue },
      uBaseSat: { value: SAND3D_PALETTES[config.paletteIndex].sat },
      uPassSize: { value: 1 }, uPassAlpha: { value: 1 }, uFocus: { value: 6 },
    },
  });
  const pointsObj = new THREE.Points(pgeo, pointsMat);
  pointsObj.frustumCulled = false;
  const pointsScene = new THREE.Scene();
  pointsScene.add(pointsObj);

  // Composite (rendered by R3F into the studio canvas, over the stage background).
  const planeGeo = new THREE.PlaneGeometry(2, 2);
  const compositeMat = new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: FULLSCREEN_VS,
    fragmentShader: COMPOSITE_FS,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.NormalBlending,
    uniforms: { uTrail: { value: trailRT.texture }, uExposure: { value: 1.35 } },
  });

  const cam = new THREE.PerspectiveCamera(48.7, trailW / trailH, 0.1, 100);
  const dummyCam = new THREE.Camera();

  const res: Resources = {
    texSize, count, seedTex, simRT, trailRT, trailW, trailH,
    quadGeo, quadMesh, quadScene, pointsScene, pointsObj,
    initMat, simMat, fadeMat, pointsMat, compositeMat, planeGeo, cam, dummyCam,
    cur: 0, inited: false,
    dispose: () => {
      seedTex.dispose();
      simRT[0].dispose(); simRT[1].dispose(); trailRT.dispose();
      quadGeo.dispose(); pgeo.dispose(); planeGeo.dispose();
      initMat.dispose(); simMat.dispose(); fadeMat.dispose(); pointsMat.dispose(); compositeMat.dispose();
    },
  };
  return res;
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export function Sand3DVisualizer({ config, audioData, zoomLevel }: VisualizerProps & { config: Sand3DConfig }) {
  const { gl } = useThree();
  const res = useMemo(() => buildResources(gl, config), [gl, config]);
  useEffect(() => () => res.dispose(), [res]);

  const proc = useMemo(() => createBandProcessor(), []);
  const timeRef = useRef(0);
  const wanderRef = useRef(0);
  const camThetaRef = useRef(0.5);
  const grooveRef = useRef(0);
  const onsetTimes = useRef<number[]>([]);
  const lastBeat = useRef(0);

  useFrame((_, delta) => {
    const dt = Math.min(0.05, delta);
    timeRef.current += dt;
    const t = timeRef.current;

    // ---- resize the screen-space buffers if the canvas changed ----
    const dbs = gl.getDrawingBufferSize(new THREE.Vector2());
    const W = Math.max(2, Math.floor(dbs.x)), H = Math.max(2, Math.floor(dbs.y));
    if (W !== res.trailW || H !== res.trailH) {
      res.trailRT.dispose();
      res.trailRT = makeTrail(W, H);
      res.trailW = W; res.trailH = H;
      res.compositeMat.uniforms.uTrail.value = res.trailRT.texture;
      res.cam.aspect = W / H; res.cam.updateProjectionMatrix();
      res.inited = false; // re-clear the fresh trail buffer
    }

    // ---- audio -> drives (low/mid/high level+transient + groove) ----
    const b = proc(audioData?.frequencyRaw ?? audioData?.frequency ?? [], audioData?.amplitude || 0, audioData?.beatStrength || 0);
    // Hotter mapping so the music clearly drives the cloud: kicks burst/pump,
    // snares scatter, hats sparkle. (Was clamped ~1.25 with gentle coefficients.)
    const lowL = clamp(b.bass, 0, 1.5), lowT = clamp(b.beat * 1.2, 0, 1.7);
    const midL = clamp(b.mid, 0, 1.5), midT = clamp(b.mid * 0.6 + b.punch * 0.75, 0, 1.7);
    const highL = clamp(b.treble, 0, 1.5), highT = clamp(b.treble + b.punch * 0.35, 0, 1.7);

    // groove: rolling onset density (UR-6's BPM proxy), 0 = flowy, 1 = punchy
    if (lowT > 0.6 && lastBeat.current <= 0.6) onsetTimes.current.push(t);
    lastBeat.current = lowT;
    while (onsetTimes.current.length && t - onsetTimes.current[0] > 6) onsetTimes.current.shift();
    const grooveT = Math.min(1, (onsetTimes.current.length / 6) / 2.2);
    grooveRef.current += (grooveT - grooveRef.current) * (1 - Math.exp(-dt * 0.7));
    const groove = grooveRef.current;

    // visual character (no console knobs in the studio - autonomous defaults that
    // gently sweep the orb→ring shape and key off the music)
    const vScatter = Math.pow(0.30, 1.45);
    const vSpeed = 0.50, vGlow = 0.55;
    const vShape = clamp(0.16 + 0.20 * (0.5 + 0.5 * Math.sin(t * 0.045)) + midL * 0.28, 0, 1);

    const st = useStudioStore.getState();
    const zoom = (zoomLevel || st.zoomLevel || 1);
    const camDist = clamp(6.2 / zoom, 2.6, 11);

    // ---- simulation uniforms (UR-6 mapping) ----
    const sm = res.simMat.uniforms;
    sm.uPos.value = res.simRT[res.cur].textures[0];
    sm.uVel.value = res.simRT[res.cur].textures[1];
    sm.uDt.value = dt; sm.uTime.value = t;
    sm.uSpeed.value = (0.1 + vSpeed * 1.3 + lowL * 1.2 + lowT * 0.7) * (0.8 + groove * 0.5);
    sm.uSwirl.value = (0.45 + vSpeed * 0.5 + midL * 2.7 + midT * 1.0) * (0.34 + vScatter * 0.59);
    // kicks AND snares fling particles outward - the big visible "hit" response
    sm.uScatter.value = Math.pow(lowT, 1.05) * 2.9 * (0.7 + groove * 0.7) * (0.12 + vScatter * 1.4) + midT * 0.85 + Math.pow(vScatter, 1.6) * 0.6;
    sm.uPump.value = lowL * 1.2 + lowT * 0.75;
    sm.uPull.value = (0.9 + groove * 1.0) * (2.9 - vScatter * 2.27);
    wanderRef.current += dt * (0.04 + (1 - groove) * 0.14);
    sm.uWander.value = 0.15 + 1.05 * Math.pow(1 - groove, 1.5);
    sm.uWT.value = wanderRef.current;
    sm.uShape.value = vShape * 2;

    // ---- orbit camera -> view-projection ----
    camThetaRef.current += dt * 0.04;
    const camPhi = 0.18;
    const cx = camDist * Math.cos(camPhi) * Math.sin(camThetaRef.current);
    const cy = camDist * Math.sin(camPhi);
    const cz = camDist * Math.cos(camPhi) * Math.cos(camThetaRef.current);
    res.cam.position.set(cx, cy, cz);
    res.cam.up.set(0, 1, 0);
    res.cam.lookAt(0, 0, 0);
    res.cam.updateMatrixWorld();
    (res.pointsMat.uniforms.uVP.value as THREE.Matrix4).multiplyMatrices(res.cam.projectionMatrix, res.cam.matrixWorldInverse);

    // ---- render uniforms (UR-6 mapping) ----
    const pm = res.pointsMat.uniforms;
    pm.uSize.value = 0.55 + midT * 2.0 + lowT * 1.3;          // kicks fatten the grains
    pm.uHue.value = highL * 0.35 + lowT * 0.1;
    pm.uGlowB.value = 0.42 + vGlow * 1.2 + highL * 0.35 + lowT * 0.5; // brighten on hits
    pm.uSparkle.value = highT * 1.35 + lowT * 0.45 + Math.max(0, vGlow - 0.6) * 1.2;
    pm.uTime.value = t;
    pm.uPx.value = Math.min(typeof devicePixelRatio !== 'undefined' ? devicePixelRatio : 1, 1.75);
    pm.uFocus.value = camDist;
    if (st.colorOverride) {
      pm.uBaseHue.value = st.colorHue / 360;
      pm.uBaseSat.value = 0.5;
    } else {
      pm.uBaseHue.value = SAND3D_PALETTES[config.paletteIndex].hue;
      pm.uBaseSat.value = SAND3D_PALETTES[config.paletteIndex].sat;
    }

    // ============ manual render passes ============
    const prevTarget = gl.getRenderTarget();
    const prevAutoClear = gl.autoClear;
    gl.autoClear = false;

    const next = 1 - res.cur;

    if (!res.inited) {
      // seed positions into the current sim target, and zero the trail buffer
      res.quadMesh.material = res.initMat;
      gl.setRenderTarget(res.simRT[res.cur]);
      gl.render(res.quadScene, res.dummyCam);
      res.fadeMat.uniforms.uFade.value = 1; // (1 - 1) = wipe to zero
      res.quadMesh.material = res.fadeMat;
      gl.setRenderTarget(res.trailRT);
      gl.render(res.quadScene, res.dummyCam);
      res.inited = true;
    }

    // 1) simulation step into the "next" target
    res.quadMesh.material = res.simMat;
    gl.setRenderTarget(res.simRT[next]);
    gl.render(res.quadScene, res.dummyCam);
    res.cur = next;

    // 2) trail buffer: fade, then accumulate particles additively
    gl.setRenderTarget(res.trailRT);
    res.fadeMat.uniforms.uFade.value = 1 - Math.exp(-dt * (13 - vGlow * 10.5) * (0.7 + groove * 0.6));
    res.quadMesh.material = res.fadeMat;
    gl.render(res.quadScene, res.dummyCam);

    pm.uPos.value = res.simRT[res.cur].textures[0];
    pm.uVel.value = res.simRT[res.cur].textures[1];
    // main pass
    pm.uPassSize.value = 1.0; pm.uPassAlpha.value = 1.0;
    res.pointsObj.geometry.setDrawRange(0, res.count);
    gl.render(res.pointsScene, res.dummyCam);
    // fake-bloom subset (sparse, big and dim) - UR-6's soft halos
    pm.uPassSize.value = 3.0; pm.uPassAlpha.value = 0.16;
    res.pointsObj.geometry.setDrawRange(0, Math.floor(res.count / 3));
    gl.render(res.pointsScene, res.dummyCam);
    res.pointsObj.geometry.setDrawRange(0, res.count);

    gl.setRenderTarget(prevTarget);
    gl.autoClear = prevAutoClear;
  });

  return (
    <mesh geometry={res.planeGeo} material={res.compositeMat} renderOrder={10} frustumCulled={false} />
  );
}

export function makeSand3DVisualizer(config: Sand3DConfig) {
  const Comp: React.FC<VisualizerProps> = (props) => <Sand3DVisualizer {...props} config={config} />;
  Comp.displayName = `Sand3D(${config.name})`;
  return Comp;
}
