/**
 * UR-6 "Unicorn Reactive" - 3D Sand.
 *
 * A 1:1 port of the UR-6 particle-synth visualizer (curl-noise GPU particle
 * flow with a continuously morphing shape attractor and feedback trails),
 * adapted from the original raw-WebGL2 transform-feedback engine to a
 * THREE-native texture-GPGPU pipeline so it lives inside the studio's
 * react-three-fiber canvas (and therefore exports, backgrounds, zoom and the
 * universal colour override all work).
 *
 * The simulation runs as a ping-ponged MRT pass (position + velocity textures),
 * particles are drawn as additive points into a persistent trail buffer that
 * fades each frame, and the trail is tone-mapped and composited over the stage.
 *
 * The GLSL below (simplex/curl noise, the orb→ring→wave shapeTarget, the point
 * colouring) is carried over verbatim from UR-6 so the look matches exactly.
 */

/* ---- shared GLSL: simplex + curl noise + hashes (verbatim from UR-6) ---- */
const NOISE = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
vec3 curlNoise(vec3 p){
  const float e=0.18;
  float n1,n2;
  n1=snoise(p+vec3(0.0,e,0.0)); n2=snoise(p-vec3(0.0,e,0.0)); float dzdy=(n1-n2);
  n1=snoise(p+vec3(0.0,0.0,e)+31.4); n2=snoise(p-vec3(0.0,0.0,e)+31.4); float dydz=(n1-n2);
  n1=snoise(p+vec3(0.0,0.0,e)); n2=snoise(p-vec3(0.0,0.0,e)); float dxdz=(n1-n2);
  n1=snoise(p+vec3(e,0.0,0.0)+31.4); n2=snoise(p-vec3(e,0.0,0.0)+31.4); float dzdx_b=(n1-n2);
  n1=snoise(p+vec3(e,0.0,0.0)-17.7); n2=snoise(p-vec3(e,0.0,0.0)-17.7); float dydx=(n1-n2);
  n1=snoise(p+vec3(0.0,e,0.0)-17.7); n2=snoise(p-vec3(0.0,e,0.0)-17.7); float dxdy=(n1-n2);
  return normalize(vec3(dzdy-dydz, dxdz-dzdx_b, dydx-dxdy)+0.0001);
}
vec3 hash3(float s){
  return fract(sin(vec3(s*12.9898, s*78.233, s*37.719))*43758.5453)*2.0-1.0;
}`;

/* ---- continuous shape morph: m in [0,2] sweeps orb -> ring -> wave ---- */
const SHAPE = /* glsl */ `
vec3 shapeTarget(float seed, float m, float t){
  float u = fract(seed*61.731);
  float v = fract(seed*123.457);
  float r = fract(seed*7.777);
  float th = u*6.28318, ph = acos(2.0*v-1.0);
  vec3 orb = vec3(sin(ph)*cos(th), cos(ph), sin(ph)*sin(th)) * (1.15 + r*0.12);
  float a = u*6.28318, b = v*6.28318;
  float R = 1.35, rr = 0.30 + r*0.10;
  vec3 ring = vec3((R+rr*cos(b))*cos(a), rr*sin(b), (R+rr*cos(b))*sin(a));
  float x = (u-0.5)*3.8, z = (v-0.5)*3.8;
  vec3 wave = vec3(x, sin(x*2.0 + t*0.9)*0.32 + cos(z*1.7 - t*0.7)*0.32, z);
  vec3 tgt = mix(orb, ring, smoothstep(0.0, 1.0, m));
  return mix(tgt, wave, smoothstep(1.0, 2.0, m));
}`;

/* fullscreen-pass vertex shader (positions already in clip space) */
export const FULLSCREEN_VS = /* glsl */ `
precision highp float;
in vec3 position;
in vec2 uv;
out vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

/* one-time init: scatter particles on a sphere (UR-6 spawn) */
export const INIT_FS = /* glsl */ `
precision highp float;
uniform sampler2D uSeed;
in vec2 vUv;
layout(location=0) out vec4 oPos;
layout(location=1) out vec4 oVel;
void main(){
  vec3 sd = texture(uSeed, vUv).xyz;
  float th = sd.y * 6.28318;
  float ph = acos(clamp(2.0*sd.z - 1.0, -1.0, 1.0));
  float rr = 1.2;
  vec3 p = vec3(sin(ph)*cos(th), cos(ph), sin(ph)*sin(th)) * rr;
  oPos = vec4(p, 1.0);
  oVel = vec4(0.0);
}`;

/* simulation step: curl-noise advection + shape attractor + scatter (UR-6) */
export const SIM_FS = /* glsl */ `
precision highp float;
uniform sampler2D uPos;
uniform sampler2D uVel;
uniform sampler2D uSeed;
uniform float uDt, uTime, uSpeed, uSwirl, uScatter, uShape, uPump, uPull, uWander, uWT;
in vec2 vUv;
layout(location=0) out vec4 oPos;
layout(location=1) out vec4 oVel;
${NOISE}
${SHAPE}
void main(){
  vec3 aPos = texture(uPos, vUv).xyz;
  vec3 aVel = texture(uVel, vUv).xyz;
  float aSeed = texture(uSeed, vUv).x;

  vec3 tgt = shapeTarget(aSeed, uShape, uTime) * (1.0 + uPump * 0.5);
  vec3 wander = vec3(
    snoise(tgt * 0.22 + vec3(uWT, 0.0, 0.0)),
    snoise(tgt * 0.22 + vec3(7.3, uWT, 0.0)),
    snoise(tgt * 0.22 + vec3(0.0, 13.1, uWT)));
  tgt += wander * uWander;
  vec3 toT = tgt - aPos;
  float weather = 0.55 + 0.45 * snoise(aPos * 0.18 + vec3(uWT * 0.7, -uWT * 0.5, 3.7));
  vec3 curl = curlNoise(aPos * 0.75 + vec3(uWT * 0.4, uTime * 0.10, uTime * 0.06));
  vec3 v = aVel;
  v += (curl * uSwirl * 2.6 * weather + toT * uPull) * uDt;
  vec3 rdir = normalize(aPos + hash3(aSeed) * 0.5 + 0.0001);
  v += rdir * uScatter * 3.4 * uDt;
  v *= exp(-uDt * 2.7);
  vec3 p = aPos + v * uDt * (0.25 + uSpeed * 2.2);
  if (length(p) > 5.6 || fract(aSeed * 977.7 + uTime * 0.013) > 0.999) {
    p = tgt + hash3(aSeed * 5.1) * 0.05; v = vec3(0.0);
  }
  oPos = vec4(p, 1.0);
  oVel = vec4(v, 0.0);
}`;

/* point render: samples sim textures, colours per UR-6 (twinkle + DoF + glow) */
export const POINTS_VS = /* glsl */ `
precision highp float;
in vec3 position; // dummy attribute - sets the vertex (particle) count
uniform sampler2D uPos;
uniform sampler2D uVel;
uniform sampler2D uSeed;
uniform vec2 uTexSize;
uniform mat4 uVP;
uniform float uSize, uHue, uGlowB, uPx, uSparkle, uTime, uBaseHue, uBaseSat, uPassSize, uPassAlpha, uFocus;
out vec3 vColor;
vec3 hsv(float h, float s, float v){
  vec3 k = mod(vec3(5.0,3.0,1.0) + h*6.0, 6.0);
  return v - v*s*clamp(min(k,4.0-k),0.0,1.0);
}
void main(){
  int id = gl_VertexID;
  int W = int(uTexSize.x);
  int yy = id / W;
  int xx = id - yy * W;
  vec2 uv = (vec2(float(xx), float(yy)) + 0.5) / uTexSize;
  vec3 aPos = texture(uPos, uv).xyz;
  vec3 aVel = texture(uVel, uv).xyz;
  float aSeed = texture(uSeed, uv).x;

  float sp = clamp(length(aVel) * 0.9, 0.0, 1.0);
  float tw = step(0.78, fract(aSeed*7.13 + uTime*2.6));
  float h = fract(uBaseHue + uHue + sp*0.02 + fract(aSeed*17.3)*0.02);
  float s = clamp(uBaseSat + 0.12 - sp*0.10 - uSparkle*tw*0.18, 0.0, 1.0);
  float v = (0.40 + sp*0.6) * uGlowB + uSparkle*tw*0.9;
  vec4 mv = uVP * vec4(aPos, 1.0);
  gl_Position = mv;
  float defocus = abs(mv.w - uFocus) / max(uFocus, 0.5);
  float dof = 1.0 / (1.0 + defocus * defocus * 2.5);
  vColor = hsv(h, max(s, 0.0), v) * uPassAlpha * mix(0.5, 1.0, dof);
  float jitter = 0.6 + fract(aSeed*91.7)*0.8;
  float ps = (0.9 + sp*1.6 + uSparkle*tw*1.4) * uSize * jitter * uPx * (3.0/max(mv.w,0.4)) * (1.0 + defocus*1.3);
  gl_PointSize = clamp(ps, 0.75, 10.0) * uPassSize;
}`;

export const POINTS_FS = /* glsl */ `
precision highp float;
in vec3 vColor;
out vec4 o;
void main(){
  vec2 c = gl_PointCoord - 0.5;
  float a = smoothstep(0.5, 0.08, length(c));
  o = vec4(vColor * a, a);
}`;

/* trail fade: multiplies the accumulation buffer toward transparent each frame.
   paired with custom blend (src=ZERO, dst=ONE_MINUS_SRC_COLOR) so the buffer
   decays by (1 - uFade) without needing to read it back. */
export const FADE_FS = /* glsl */ `
precision highp float;
uniform float uFade;
out vec4 o;
void main(){ o = vec4(vec3(uFade), uFade); }`;

/* composite: filmic tone-map of the HDR trail buffer, blended over the stage */
export const COMPOSITE_FS = /* glsl */ `
precision highp float;
uniform sampler2D uTrail;
uniform float uExposure;
in vec2 vUv;
out vec4 o;
void main(){
  vec4 t = texture(uTrail, vUv);
  vec3 c = max(t.rgb, 0.0);
  // Hue-preserving tone-map: compress the PEAK brightness and keep the colour ratio,
  // so dense areas stay vividly coloured instead of saturating every channel to white.
  float peak = max(max(c.r, c.g), c.b);
  float lt = 1.0 - exp(-peak * uExposure);
  vec3 col = peak > 1e-4 ? (c / peak) * lt : vec3(0.0);
  float a = clamp(max(lt, t.a), 0.0, 1.0);
  o = vec4(col, a);
}`;

/* ---- palettes (base hue/sat for the particles), from UR-6 ---- */
export interface Sand3DPalette { name: string; hue: number; sat: number; hex: string; }
export const SAND3D_PALETTES: Sand3DPalette[] = [
  { name: 'cream',  hue: 0.135, sat: 0.42, hex: '#f5edc6' },
  { name: 'pink',   hue: 0.92,  sat: 0.60, hex: '#ff73b7' },
  { name: 'cyan',   hue: 0.52,  sat: 0.55, hex: '#7fe6ff' },
  { name: 'violet', hue: 0.75,  sat: 0.55, hex: '#bf80ff' },
  { name: 'lime',   hue: 0.30,  sat: 0.55, hex: '#a4f573' },
];

export interface Sand3DConfig {
  id: string;
  name: string;
  emoji: string;
  paletteIndex: number;
  // Per-seed form character. These drive the GPGPU flow uniforms so every roll is
  // a genuinely different sand (tight orb vs loose dispersal, slow drift vs fast
  // churn, orb/ring/wave bias) instead of the same cloud in one of 5 colours.
  scatter: number;    // 0.05..0.65  tight & cohesive -> loose & dispersed
  speed: number;      // 0.34..0.70  base flow speed
  glow: number;       // 0.30..0.46  trail persistence (kept near the tuned 0.38)
  shapeBias: number;  // 0..2        resting form: orb(0) -> ring(1) -> wave(2)
  shapeMorph: number; // 0.06..0.34  how far it sweeps around shapeBias over time
  swirl: number;      // 0.7..1.4    curl-noise strength multiplier
  size: number;       // 0.34..0.46  base grain size (kept tight for brightness)
  hueShift: number;   // -0.08..0.08 optional hue offset on top of the palette
}

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const slerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function randomSand3D(seed: number, opts: { paletteIndex?: number; label?: string } = {}): Sand3DConfig {
  const r = rng(seed * 13 + 7);
  const paletteIndex = opts.paletteIndex ?? Math.floor(r() * SAND3D_PALETTES.length);
  return {
    id: `sand3d_${seed}`,
    name: opts.label ?? `3D Sand · ${SAND3D_PALETTES[paletteIndex].name}`,
    emoji: '🦄',
    paletteIndex,
    scatter: slerp(0.05, 0.65, r()),
    speed: slerp(0.34, 0.70, r()),
    glow: slerp(0.30, 0.46, r()),
    shapeBias: r() * 2,
    shapeMorph: slerp(0.06, 0.34, r()),
    swirl: slerp(0.7, 1.4, r()),
    size: slerp(0.34, 0.46, r()),
    hueShift: r() < 0.6 ? 0 : (r() - 0.5) * 0.16,
  };
}

export const SAND3D_PRESETS: Sand3DConfig[] = SAND3D_PALETTES.map((p, i) =>
  randomSand3D(8100 + i, { paletteIndex: i, label: i === 0 ? '3D Sand' : `3D Sand · ${p.name}` }),
).map((c, i) => ({ ...c, id: `Sand3D${i}` }));
