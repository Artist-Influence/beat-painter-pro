import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { VisualizerProps } from '../visualizer';
import type { SandConfig, ShapeDesc } from '@/lib/sand/sandEngine';
import { createBandProcessor } from '@/lib/audioBands';
import { useStudioStore } from '@/stores/studioStore';

/* A point on the outline of the (limitless) shape for parameter t in [0,1).
 * Hot path: called tens of thousands of times per frame — no allocations,
 * just trig/math written into `out`. Outputs are kept near a unit radius
 * (SHAPE_SCALE is applied by the caller). */
function shapePoint(shape: ShapeDesc, t: number, out: { x: number; y: number }) {
  const a = t * Math.PI * 2;
  const mode = shape.mode;

  if (mode === 'heart') {
    const sa = Math.sin(a);
    out.x = (16 * sa * sa * sa) / 17;
    out.y = (13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) / 17;
    return;
  }

  // ---- radial-form modes: compute r, then project on (cos a, sin a) ----
  if (mode === 'super' || mode === 'harmonic' || mode === 'rose' || mode === 'star' ||
      mode === 'polygon' || mode === 'gear' || mode === 'wave_ring' ||
      mode === 'flower_layered' || mode === 'cardioid' || mode === 'crescent') {
    let r = 1.0;
    if (mode === 'super') {
      const t1 = Math.pow(Math.abs(Math.cos(shape.m * a / 4)), shape.n2);
      const t2 = Math.pow(Math.abs(Math.sin(shape.m * a / 4)), shape.n3);
      r = Math.pow(t1 + t2, -1 / shape.n1);
      if (!isFinite(r)) r = 1;
      r = Math.min(2.2, Math.max(0.12, r));
    } else if (mode === 'harmonic') {
      const h = shape.harmonics;
      for (let i = 0; i + 2 < h.length; i += 3) r += h[i + 1] * Math.cos(h[i] * a + h[i + 2]);
      r = Math.max(0.18, r);
    } else if (mode === 'rose') {
      // rhodonea: r = |cos(k a)| (+ small bias so petals don't pinch to 0)
      const k = shape.k ?? 4;
      const kk = (shape.p ? k / 2 : k);
      r = 0.12 + 0.88 * Math.abs(Math.cos(kk * a));
    } else if (mode === 'star') {
      // n-point star: snap between outer(1) and inner(a) per point sector
      const k = shape.k ?? 6;
      const inner = shape.a ?? 0.5;
      const f = Math.cos(k * a);            // -1..1 over each spoke
      r = inner + (1 - inner) * (0.5 + 0.5 * f);
    } else if (mode === 'polygon') {
      // regular k-gon via apothem/cos of angle-to-nearest-edge
      const k = shape.k ?? 5;
      const ph = shape.p ?? 0;
      const seg = Math.PI / k;
      const ang = ((a + ph) % (2 * seg)) - seg;
      r = Math.cos(seg) / Math.cos(ang);
      r = Math.min(1.6, r);
    } else if (mode === 'gear') {
      const k = shape.k ?? 12;
      const depth = shape.a ?? 0.15;
      const duty = shape.q ?? 0.6;
      // square-ish teeth: tanh-shaped sine threshold
      const s = Math.cos(k * a);
      r = 0.8 + depth * (s > (1 - 2 * duty) ? 1 : -1);
    } else if (mode === 'wave_ring') {
      const k = shape.k ?? 10;
      const amp = shape.a ?? 0.15;
      r = 0.85 + amp * Math.sin(k * a);
    } else if (mode === 'flower_layered') {
      const k = shape.k ?? 5;
      const k2 = shape.q ?? 12;
      const amp = shape.a ?? 0.2;
      const amp2 = shape.b ?? 0.08;
      r = 0.7 + amp * Math.cos(k * a) + amp2 * Math.cos(k2 * a);
      r = Math.max(0.2, r);
    } else if (mode === 'cardioid') {
      r = 0.5 * (1 - Math.cos(a)); // heart-ish dimple, scaled to ~unit
      r = Math.max(0.04, r);
    } else if (mode === 'crescent') {
      // outer circle minus inset disk -> sickle via radius modulation
      const inset = shape.a ?? 0.45;
      r = 1 - inset * (0.5 + 0.5 * Math.cos(a));
      r = Math.max(0.1, r);
    }
    out.x = Math.cos(a) * r;
    out.y = Math.sin(a) * r;
    return;
  }

  // ---- explicit parametric (x,y) modes ----
  if (mode === 'lissajous') {
    const kx = shape.k ?? 3, ky = shape.q ?? 4, ph = shape.p ?? 0;
    out.x = Math.sin(kx * a + ph);
    out.y = Math.sin(ky * a);
    return;
  }
  if (mode === 'spiral') {
    // archimedean (p=0) or logarithmic (p=1) over `k` turns
    const turns = shape.k ?? 4;
    const ang = a * turns;
    let rad: number;
    if (shape.p) rad = 0.08 * Math.exp((shape.a ?? 0.4) * (ang / (Math.PI * 2)));
    else rad = (shape.a ?? 0.4) * t + 0.05;
    rad = Math.min(1.2, rad);
    out.x = Math.cos(ang) * rad;
    out.y = Math.sin(ang) * rad;
    return;
  }
  if (mode === 'epicycloid') {
    // unit-circle epicycloid with k cusps (small circle radius 1/k)
    const k = shape.k ?? 5;
    out.x = ((k + 1) * Math.cos(a) - Math.cos((k + 1) * a)) / (k + 2);
    out.y = ((k + 1) * Math.sin(a) - Math.sin((k + 1) * a)) / (k + 2);
    return;
  }
  if (mode === 'hypocycloid') {
    const k = shape.k ?? 4;
    out.x = (k - 1) * Math.cos(a) + Math.cos((k - 1) * a);
    out.y = (k - 1) * Math.sin(a) - Math.sin((k - 1) * a);
    out.x /= k; out.y /= k;
    return;
  }
  if (mode === 'astroid') {
    const c = Math.cos(a), s = Math.sin(a);
    out.x = c * c * c;
    out.y = s * s * s;
    return;
  }
  if (mode === 'lemniscate') {
    // Bernoulli figure-8: r^2 = cos(2a)
    const c = Math.cos(2 * a);
    const r = (shape.a ?? 1) * Math.sqrt(Math.abs(c));
    const sign = c < 0 ? -1 : 1; // mirror the empty lobe so both loops fill
    out.x = r * Math.cos(a);
    out.y = r * Math.sin(a) * sign;
    return;
  }
  if (mode === 'butterfly') {
    // Fay's butterfly curve, normalized to ~unit
    const e = Math.exp(Math.cos(a));
    const f = e - 2 * Math.cos(4 * a) - Math.pow(Math.sin(a / 12), 5);
    out.x = Math.sin(a) * f * 0.28;
    out.y = Math.cos(a) * f * 0.28;
    return;
  }
  if (mode === 'superellipse') {
    // squircle: |x|^n + |y|^n = 1
    const n = shape.q ?? 4;
    const aspect = shape.b ?? 1;
    const c = Math.cos(a), s = Math.sin(a);
    out.x = Math.sign(c) * Math.pow(Math.abs(c), 2 / n);
    out.y = Math.sign(s) * Math.pow(Math.abs(s), 2 / n) * aspect;
    return;
  }
  if (mode === 'cross') {
    // plus/cross: clamp a square's arm width
    const w = shape.a ?? 0.4;
    let x = Math.cos(a), y = Math.sin(a);
    // normalize to unit square then carve the notches
    const m = Math.max(Math.abs(x), Math.abs(y)) || 1;
    x /= m; y /= m;
    if (Math.abs(x) > w && Math.abs(y) > w) {
      // outside the cross arms -> pull to the inner corner
      x = Math.sign(x) * w;
      y = Math.sign(y) * w;
    }
    out.x = x; out.y = y;
    return;
  }
  if (mode === 'infinity') {
    // lemniscate of Gerono: clean figure-8
    out.x = Math.cos(a);
    out.y = Math.sin(a) * Math.cos(a);
    return;
  }
  if (mode === 'teardrop') {
    // teardrop curve: pointed at one end, round at the other
    const dir = shape.p ?? 1;
    out.x = dir * Math.cos(a);
    out.y = Math.sin(a) * Math.sin(a / 2) * 1.3;
    return;
  }
  if (mode === 'spirograph') {
    // hypotrochoid: k = ratio, q = inner turns, a = pen offset
    const R = shape.k ?? 5, rr = shape.q ?? 3, d = shape.a ?? 0.5;
    const diff = (R - rr) / rr;
    out.x = (R - rr) * Math.cos(a) + d * rr * Math.cos(diff * a);
    out.y = (R - rr) * Math.sin(a) - d * rr * Math.sin(diff * a);
    const norm = (R - rr) + d * rr || 1;
    out.x /= norm; out.y /= norm;
    return;
  }

  // fallback: unit circle
  out.x = Math.cos(a);
  out.y = Math.sin(a);
}

const SHAPE_SCALE = 1.35;

const DEPTH = 1.6; // 3D extrusion thickness of the emitter shape

export function SandFlowVisualizer({ config, audioData }: VisualizerProps & { config: SandConfig }) {
  const N = config.count;
  const groupRef = useRef<THREE.Group>(null);
  const proc = useMemo(() => createBandProcessor(), []);
  const timeRef = useRef(0);

  const { positions, bright, geo } = useMemo(() => {
    const positions = new Float32Array(N * 3);
    const bright = new Float32Array(N);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aBright', new THREE.BufferAttribute(bright, 1));
    return { positions, bright, geo };
  }, [N]);

  // per-particle 3D state (positions advect through a 3D flow field)
  const state = useMemo(() => {
    const age = new Float32Array(N);
    const life = new Float32Array(N);
    const phase = new Float32Array(N);
    const p = { x: 0, y: 0 };
    for (let i = 0; i < N; i++) {
      life[i] = 0.9 + Math.random() * 1.4;
      age[i] = Math.random() * life[i];     // pre-fill the field
      phase[i] = Math.random() * Math.PI * 2;
      shapePoint(config.shape, Math.random(), p);
      // emitter is the shape outline extruded through z (a 3D ribbon/tube)
      positions[i * 3] = p.x * SHAPE_SCALE + (Math.random() - 0.5) * 0.1;
      positions[i * 3 + 1] = p.y * SHAPE_SCALE + (Math.random() - 0.5) * 0.1;
      positions[i * 3 + 2] = (Math.random() - 0.5) * DEPTH;
      bright[i] = 1 - age[i] / life[i];
    }
    return { age, life, phase };
  }, [N, config.shape, positions, bright]);

  const uniforms = useMemo(() => ({
    uSize: { value: config.pointSize ?? 2.6 },
    uColCool: { value: new THREE.Color(config.palette[0]) },
    uColHot: { value: new THREE.Color(config.palette[1]) },
    uBeat: { value: 0 },
  }), [config.palette]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    timeRef.current += dt;
    const time = timeRef.current;
    const b = proc(audioData?.frequencyRaw ?? audioData?.frequency ?? [], audioData?.amplitude || 0, audioData?.beatStrength || 0);

    const speed = config.speed * (0.4 + b.bass * 1.5 + b.beat * 0.9);
    const swirl = config.swirl * (0.8 + b.mid * 1.4);
    const burst = b.beat * 1.1;
    const { age, life, phase } = state;
    const sp = { x: 0, y: 0 };

    for (let i = 0; i < N; i++) {
      age[i] += dt;
      const ix = i * 3;
      if (age[i] >= life[i]) {
        // respawn on the 3D emitter shape (outline extruded through z)
        age[i] = 0;
        shapePoint(config.shape, Math.random(), sp);
        positions[ix] = sp.x * SHAPE_SCALE + (Math.random() - 0.5) * 0.1;
        positions[ix + 1] = sp.y * SHAPE_SCALE + (Math.random() - 0.5) * 0.1;
        positions[ix + 2] = (Math.random() - 0.5) * DEPTH;
        bright[i] = 1;
        continue;
      }
      const x = positions[ix], y = positions[ix + 1], z = positions[ix + 2];
      const ph = phase[i];
      // radial-outward in the shape plane so particles emanate from the form
      const len = Math.hypot(x, y) || 1;
      const ox = x / len, oy = y / len;
      // 3D curl-ish flow field — this is what gives the volumetric hair streaks
      const fx = Math.sin(y * 0.7 + time * 0.5 + ph) + Math.cos(z * 0.6 - time * 0.3);
      const fy = Math.sin(z * 0.7 + time * 0.45) + Math.cos(x * 0.65 + time * 0.35 + ph);
      const fz = Math.sin(x * 0.7 + time * 0.4) + Math.cos(y * 0.62 - time * 0.4 + ph);
      // flow style: 0 = tight radial burst, 1 = swirly turbulent streams
      const flow = config.flow ?? 0.5;
      const out = (speed + burst) * dt * (1.2 - flow * 0.7);
      const sw = swirl * dt * (0.4 + flow * 1.4);
      positions[ix] = x + ox * out + fx * sw;
      positions[ix + 1] = y + oy * out + fy * sw;
      positions[ix + 2] = z + fz * sw * 1.3;       // flow spreads into depth
      bright[i] = Math.min(1.5, (1 - age[i] / life[i]) * (0.85 + b.treble * 0.7) + b.beat * 0.3);
    }

    // slow auto-rotation + beat kick so the 3D volume reads with depth
    if (groupRef.current) {
      groupRef.current.rotation.y += (0.12 + b.beat * 0.4) * dt;
      groupRef.current.rotation.x = 0.32 + Math.sin(time * 0.2) * 0.12;
    }

    geo.attributes.position.needsUpdate = true;
    geo.attributes.aBright.needsUpdate = true;
    (uniforms.uBeat as { value: number }).value = b.beat;
    const st = useStudioStore.getState();
    if (st.colorOverride) {
      const h = st.colorHue / 360;
      (uniforms.uColCool.value as THREE.Color).setHSL(h, 0.4, 0.42);
      (uniforms.uColHot.value as THREE.Color).setHSL((h + 0.07) % 1, 0.85, 0.86);
    }
  });

  return (
    <group ref={groupRef}>
    <points geometry={geo} frustumCulled={false}>
      <shaderMaterial
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        vertexShader={`
          attribute float aBright;
          varying float vB;
          uniform float uSize;
          void main(){
            vB = aBright;
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = uSize * (0.4 + aBright * 1.3) * (12.0 / -mv.z);
            gl_Position = projectionMatrix * mv;
          }`}
        fragmentShader={`
          precision highp float;
          varying float vB;
          uniform vec3 uColCool, uColHot;
          void main(){
            float d = length(gl_PointCoord - 0.5);
            if (d > 0.5) discard;
            float a = smoothstep(0.5, 0.0, d);
            vec3 c = mix(uColCool, uColHot, clamp(vB, 0.0, 1.0));
            gl_FragColor = vec4(c * a * (0.25 + vB * 0.9), 1.0);
          }`}
      />
    </points>
    </group>
  );
}

export function makeSandVisualizer(config: SandConfig) {
  const Comp: React.FC<VisualizerProps> = (props) => <SandFlowVisualizer {...props} config={config} />;
  Comp.displayName = `Sand(${config.name})`;
  return Comp;
}
