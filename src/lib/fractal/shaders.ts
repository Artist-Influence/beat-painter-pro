/**
 * GLSL for the fractal engine (WebGL1 / GLSL ES 1.0, the version three's
 * ShaderMaterial uses by default). Two fragment programs share one vertex
 * shader that draws a full-screen clip-space quad - it ignores the camera and
 * any parent transform, so the fractal always fills the frame regardless of the
 * studio's zoom group or OrbitControls.
 */

export const FRACTAL_VERT = /* glsl */ `
precision highp float;
varying vec2 vUv;
void main() {
  vUv = uv;
  // position is a [-1,1] plane; emit it straight to clip space.
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

// Shared header: uniforms + palette + small helpers
const SHARED = /* glsl */ `
precision highp float;
varying vec2 vUv;

uniform vec2  iResolution;
uniform float uTime;
uniform int   uType;

uniform vec3  pa, pb, pc, pd;   // IQ cosine palette
uniform float uPaletteShift;
uniform float uColorScale;
uniform float uGlow;

uniform float uBass, uMid, uTreble, uLevel, uBeat;

// Audio reactivity weights
uniform float uRZoom, uRHue, uRGlow, uRMorph, uRRot, uRIter, uRWarp, uRKaleido;

vec3 pal(float t) {
  return pa + pb * cos(6.28318530718 * (pc * t + pd));
}
mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

// Hyperbolic helpers - not guaranteed built-in in GLSL ES 1.0.
float sinh_(float x) { return 0.5 * (exp(x) - exp(-x)); }
float cosh_(float x) { return 0.5 * (exp(x) + exp(-x)); }
`;

export const FRACTAL_FRAG_2D = SHARED + /* glsl */ `
uniform vec2  uCenter;
uniform float uZoom;
uniform vec2  uJuliaC;
uniform float uIter;
uniform float uKaleido;
uniform float uRotation;
uniform float uWarp;

vec2 cmul(vec2 a, vec2 b) { return vec2(a.x*b.x - a.y*b.y, a.x*b.y + a.y*b.x); }
// complex z^n via polar form (n real, integer-ish powers used here)
vec2 cpow(vec2 z, float n) {
  float r = length(z);
  if (r < 1e-12) return vec2(0.0);
  float a = atan(z.y, z.x);
  float rn = pow(r, n);
  return rn * vec2(cos(a * n), sin(a * n));
}

void main() {
  vec2 uv = vUv - 0.5;
  uv.x *= iResolution.x / iResolution.y;

  // spin (audio adds to base rotation)
  uv = rot(uRotation + uBeat * uRRot * 1.0) * uv;

  // kaleidoscope fold (Kaleido mapping spins it with the beat)
  float kal = uKaleido;
  if (kal > 0.5) {
    float ang = atan(uv.y, uv.x) + uBeat * uRKaleido * 0.9;
    float rad = length(uv);
    float seg = 6.28318530718 / kal;
    ang = mod(ang, seg);
    ang = abs(ang - seg * 0.5);
    uv = vec2(cos(ang), sin(ang)) * rad;
  }

  // domain warp (mids ripple the plane)
  float warp = uWarp + uMid * uRWarp * 0.5;
  if (warp > 0.001) {
    uv += warp * vec2(sin(uv.y * 3.0 + uTime), cos(uv.x * 3.0 + uTime * 0.8)) * 0.28;
  }

  // bass pulses the zoom
  float zoom = uZoom * (1.0 - uBass * uRZoom * 0.55);
  vec2 p = uCenter + uv * zoom;

  float iters = uIter * (1.0 + uTreble * uRIter * 1.0);

  // Newton fractal - convergence to roots of z^3 - 1, coloured by basin + speed.
  if (uType == 6) {
    vec2 z6 = p;
    vec2 ra = vec2(1.0, 0.0);
    vec2 rb = vec2(-0.5, 0.8660254);
    vec2 rc = vec2(-0.5, -0.8660254);
    float it = 0.0;
    float found = -1.0;
    for (int i = 0; i < 48; i++) {
      vec2 z2 = cmul(z6, z6);
      vec2 f = cmul(z2, z6) - vec2(1.0, 0.0);   // z^3 - 1
      vec2 fp = 3.0 * z2;                        // 3 z^2
      float dn = dot(fp, fp) + 1e-9;
      z6 -= cmul(f, vec2(fp.x, -fp.y)) / dn;     // z - f/f'
      it = float(i);
      if (distance(z6, ra) < 0.002) { found = 0.0; break; }
      if (distance(z6, rb) < 0.002) { found = 1.0; break; }
      if (distance(z6, rc) < 0.002) { found = 2.0; break; }
    }
    float shade = 1.0 - it / 48.0;
    float hue6 = uPaletteShift + max(found, 0.0) / 3.0 + uTreble * uRHue * 0.55 + uTime * 0.02;
    vec3 col6 = pal(hue6) * (0.3 + 0.7 * shade);
    col6 += pal(hue6 + 0.5) * shade * uBeat * uRGlow * 0.6;
    col6 *= 0.6 + uLevel * 1.0;
    col6 = pow(clamp(col6, 0.0, 1.0), vec3(0.85));
    gl_FragColor = vec4(col6, 1.0);
    return;
  }

  // ---- standalone escape-time fractals with bespoke z/c evolution ----------
  // Lambda fractal: z -> lambda * z * (1 - z), lambda = juliaC (julia-style).
  if (uType == 16) {
    vec2 lam = uJuliaC + uBeat * uRMorph * 0.18 * vec2(cos(uTime), sin(uTime));
    vec2 z16 = p;
    float n16 = 0.0; float trap16 = 1e9; float esc16 = 0.0;
    for (int i = 0; i < 256; i++) {
      if (float(i) >= iters) break;
      vec2 omz = vec2(1.0, 0.0) - z16;
      z16 = cmul(lam, cmul(z16, omz));
      trap16 = min(trap16, length(z16));
      n16 = float(i);
      if (dot(z16, z16) > 256.0) { esc16 = 1.0; break; }
    }
    float sn16 = n16 - log2(max(log2(dot(z16, z16) + 1.0), 1e-6)) + 4.0;
    float t16 = (sn16 / iters) * uColorScale;
    float hs16 = uPaletteShift + uTreble * uRHue * 0.85 + uTime * 0.02;
    vec3 c16 = pal(t16 + hs16);
    c16 += exp(-trap16 * 2.2) * (uGlow + uBeat * uRGlow * 1.8) * pal(hs16 + 0.5);
    c16 *= mix(0.1, 1.0, esc16);
    c16 *= smoothstep(0.0, 6.0, sn16);
    c16 *= 0.6 + uLevel * 1.0;
    c16 = pow(clamp(c16, 0.0, 1.0), vec3(0.85));
    gl_FragColor = vec4(c16, 1.0);
    return;
  }

  // Magnet type 1: z -> ((z^2 + c - 1)/(2z + c - 2))^2 , c = p (Mandelbrot-style).
  if (uType == 17) {
    vec2 c17 = p;
    vec2 z17 = vec2(0.0);
    float n17 = 0.0; float trap17 = 1e9; float esc17 = 0.0;
    for (int i = 0; i < 256; i++) {
      if (float(i) >= iters) break;
      vec2 z2 = cmul(z17, z17);
      vec2 num = z2 + c17 - vec2(1.0, 0.0);
      vec2 den = 2.0 * z17 + c17 - vec2(2.0, 0.0);
      float dn = dot(den, den) + 1e-9;
      vec2 q = cmul(num, vec2(den.x, -den.y)) / dn;
      z17 = cmul(q, q);
      trap17 = min(trap17, length(z17 - vec2(1.0, 0.0)));
      n17 = float(i);
      vec2 conv = z17 - vec2(1.0, 0.0);
      if (dot(conv, conv) < 1e-6) break;        // converges to fixed point 1
      if (dot(z17, z17) > 4096.0) { esc17 = 1.0; break; }
    }
    float sn17 = n17;
    float t17 = (sn17 / iters) * uColorScale;
    float hs17 = uPaletteShift + uTreble * uRHue * 0.85 + uTime * 0.02;
    vec3 col17 = pal(t17 + hs17);
    col17 += exp(-trap17 * 2.2) * (uGlow + uBeat * uRGlow * 1.8) * pal(hs17 + 0.5);
    col17 *= smoothstep(0.0, 4.0, sn17);
    col17 *= 0.6 + uLevel * 1.0;
    col17 = pow(clamp(col17, 0.0, 1.0), vec3(0.85));
    gl_FragColor = vec4(col17, 1.0);
    return;
  }

  // Magnet type 2: z -> ((z^3 + 3(c-1)z + (c-1)(c-2)) / (3z^2 + 3(c-2)z + (c-1)(c-2)+1))^2
  if (uType == 18) {
    vec2 c18 = p;
    vec2 one = vec2(1.0, 0.0); vec2 two = vec2(2.0, 0.0); vec2 three = vec2(3.0, 0.0);
    vec2 cm1 = c18 - one; vec2 cm2 = c18 - two;
    vec2 z18 = vec2(0.0);
    float n18 = 0.0; float trap18 = 1e9; float esc18 = 0.0;
    for (int i = 0; i < 256; i++) {
      if (float(i) >= iters) break;
      vec2 z2 = cmul(z18, z18);
      vec2 z3 = cmul(z2, z18);
      vec2 num = z3 + cmul(three, cmul(cm1, z18)) + cmul(cm1, cm2);
      vec2 den = cmul(three, z2) + cmul(three, cmul(cm2, z18)) + cmul(cm1, cm2) + one;
      float dn = dot(den, den) + 1e-9;
      vec2 q = cmul(num, vec2(den.x, -den.y)) / dn;
      z18 = cmul(q, q);
      trap18 = min(trap18, length(z18 - one));
      n18 = float(i);
      vec2 conv = z18 - one;
      if (dot(conv, conv) < 1e-6) break;
      if (dot(z18, z18) > 4096.0) { esc18 = 1.0; break; }
    }
    float t18 = (n18 / iters) * uColorScale;
    float hs18 = uPaletteShift + uTreble * uRHue * 0.85 + uTime * 0.02;
    vec3 col18 = pal(t18 + hs18);
    col18 += exp(-trap18 * 2.2) * (uGlow + uBeat * uRGlow * 1.8) * pal(hs18 + 0.5);
    col18 *= smoothstep(0.0, 4.0, n18);
    col18 *= 0.6 + uLevel * 1.0;
    col18 = pow(clamp(col18, 0.0, 1.0), vec3(0.85));
    gl_FragColor = vec4(col18, 1.0);
    return;
  }

  // Spider: z -> z^2 + c ; c -> c/2 + z  (c evolves each step).
  if (uType == 19) {
    vec2 z19 = p;
    vec2 c19 = p;
    float n19 = 0.0; float trap19 = 1e9; float esc19 = 0.0;
    for (int i = 0; i < 256; i++) {
      if (float(i) >= iters) break;
      z19 = cmul(z19, z19) + c19;
      c19 = c19 * 0.5 + z19;
      trap19 = min(trap19, length(z19));
      n19 = float(i);
      if (dot(z19, z19) > 256.0) { esc19 = 1.0; break; }
    }
    float sn19 = n19 - log2(max(log2(dot(z19, z19) + 1.0), 1e-6)) + 4.0;
    float t19 = (sn19 / iters) * uColorScale;
    float hs19 = uPaletteShift + uTreble * uRHue * 0.85 + uTime * 0.02;
    vec3 col19 = pal(t19 + hs19);
    col19 += exp(-trap19 * 2.2) * (uGlow + uBeat * uRGlow * 1.8) * pal(hs19 + 0.5);
    col19 *= mix(0.1, 1.0, esc19);
    col19 *= smoothstep(0.0, 6.0, sn19);
    col19 *= 0.6 + uLevel * 1.0;
    col19 = pow(clamp(col19, 0.0, 1.0), vec3(0.85));
    gl_FragColor = vec4(col19, 1.0);
    return;
  }

  // Manowar: z -> z^2 + z_init + c (adds the seed each iteration).
  if (uType == 20) {
    vec2 z20 = p;
    vec2 seed = p;
    vec2 c20 = uJuliaC;
    float n20 = 0.0; float trap20 = 1e9; float esc20 = 0.0;
    for (int i = 0; i < 256; i++) {
      if (float(i) >= iters) break;
      z20 = cmul(z20, z20) + seed + c20;
      trap20 = min(trap20, length(z20));
      n20 = float(i);
      if (dot(z20, z20) > 256.0) { esc20 = 1.0; break; }
    }
    float sn20 = n20 - log2(max(log2(dot(z20, z20) + 1.0), 1e-6)) + 4.0;
    float t20 = (sn20 / iters) * uColorScale;
    float hs20 = uPaletteShift + uTreble * uRHue * 0.85 + uTime * 0.02;
    vec3 col20 = pal(t20 + hs20);
    col20 += exp(-trap20 * 2.2) * (uGlow + uBeat * uRGlow * 1.8) * pal(hs20 + 0.5);
    col20 *= mix(0.1, 1.0, esc20);
    col20 *= smoothstep(0.0, 6.0, sn20);
    col20 *= 0.6 + uLevel * 1.0;
    col20 = pow(clamp(col20, 0.0, 1.0), vec3(0.85));
    gl_FragColor = vec4(col20, 1.0);
    return;
  }

  // Nova: Newton-style relaxation on z^3 - 1 plus c offset, coloured by speed.
  if (uType == 21) {
    vec2 z21 = vec2(1.0, 0.0);
    vec2 c21 = p;
    float n21 = 0.0; float trap21 = 1e9; float conv21 = 0.0;
    for (int i = 0; i < 256; i++) {
      if (float(i) >= iters) break;
      vec2 z2 = cmul(z21, z21);
      vec2 f = cmul(z2, z21) - vec2(1.0, 0.0);   // z^3 - 1
      vec2 fp = 3.0 * z2;                          // 3 z^2
      float dn = dot(fp, fp) + 1e-9;
      vec2 step = cmul(f, vec2(fp.x, -fp.y)) / dn; // f/f'
      vec2 zp = z21 - step + c21;
      vec2 dz = zp - z21;
      z21 = zp;
      trap21 = min(trap21, length(z21));
      n21 = float(i);
      if (dot(dz, dz) < 1e-7) { conv21 = 1.0; break; }
    }
    float sn21 = n21;
    float t21 = (sn21 / iters) * uColorScale;
    float hs21 = uPaletteShift + uTreble * uRHue * 0.85 + uTime * 0.02;
    vec3 col21 = pal(t21 + hs21);
    col21 += exp(-trap21 * 2.2) * (uGlow + uBeat * uRGlow * 1.2) * pal(hs21 + 0.5);
    col21 *= 0.4 + 0.6 * conv21;
    col21 *= 0.6 + uLevel * 1.0;
    col21 = pow(clamp(col21, 0.0, 1.0), vec3(0.85));
    gl_FragColor = vec4(col21, 1.0);
    return;
  }

  // sin(z) fractal: z -> c * sin(z), escapes when |Im z| grows large.
  if (uType == 22) {
    vec2 z22 = p;
    vec2 c22 = uJuliaC;
    if (uJuliaC.x == 0.0 && uJuliaC.y == 0.0) c22 = vec2(1.0, 0.3);
    float n22 = 0.0; float trap22 = 1e9; float esc22 = 0.0;
    for (int i = 0; i < 256; i++) {
      if (float(i) >= iters) break;
      // sin(x+iy) = (sin x cosh y, cos x sinh y)
      vec2 sz = vec2(sin(z22.x) * cosh_(z22.y), cos(z22.x) * sinh_(z22.y));
      z22 = cmul(c22, sz);
      trap22 = min(trap22, length(z22));
      n22 = float(i);
      if (abs(z22.y) > 50.0) { esc22 = 1.0; break; }
    }
    float t22 = (n22 / iters) * uColorScale;
    float hs22 = uPaletteShift + uTreble * uRHue * 0.85 + uTime * 0.02;
    vec3 col22 = pal(t22 + hs22);
    col22 += exp(-trap22 * 0.6) * (uGlow + uBeat * uRGlow * 1.4) * pal(hs22 + 0.5);
    col22 *= mix(0.1, 1.0, esc22);
    col22 *= smoothstep(0.0, 4.0, n22);
    col22 *= 0.6 + uLevel * 1.0;
    col22 = pow(clamp(col22, 0.0, 1.0), vec3(0.85));
    gl_FragColor = vec4(col22, 1.0);
    return;
  }

  // cos(z) fractal: z -> c * cos(z).
  if (uType == 23) {
    vec2 z23 = p;
    vec2 c23 = uJuliaC;
    if (uJuliaC.x == 0.0 && uJuliaC.y == 0.0) c23 = vec2(1.0, 0.2);
    float n23 = 0.0; float trap23 = 1e9; float esc23 = 0.0;
    for (int i = 0; i < 256; i++) {
      if (float(i) >= iters) break;
      // cos(x+iy) = (cos x cosh y, -sin x sinh y)
      vec2 cz = vec2(cos(z23.x) * cosh_(z23.y), -sin(z23.x) * sinh_(z23.y));
      z23 = cmul(c23, cz);
      trap23 = min(trap23, length(z23));
      n23 = float(i);
      if (abs(z23.y) > 50.0) { esc23 = 1.0; break; }
    }
    float t23 = (n23 / iters) * uColorScale;
    float hs23 = uPaletteShift + uTreble * uRHue * 0.85 + uTime * 0.02;
    vec3 col23 = pal(t23 + hs23);
    col23 += exp(-trap23 * 0.6) * (uGlow + uBeat * uRGlow * 1.4) * pal(hs23 + 0.5);
    col23 *= mix(0.1, 1.0, esc23);
    col23 *= smoothstep(0.0, 4.0, n23);
    col23 *= 0.6 + uLevel * 1.0;
    col23 = pow(clamp(col23, 0.0, 1.0), vec3(0.85));
    gl_FragColor = vec4(col23, 1.0);
    return;
  }

  vec2 z, c;
  vec2 prevZ = vec2(0.0);
  if (uType == 1 || uType == 4) {        // julia / phoenix
    z = p;
    c = uJuliaC + (uType == 4 ? vec2(0.0) : uBeat * uRMorph * 0.22 * vec2(cos(uTime), sin(uTime)));
  } else {                                // mandelbrot family
    z = vec2(0.0);
    c = p;
  }

  float n = 0.0;
  float trap = 1e9;
  float escaped = 0.0;
  for (int i = 0; i < 256; i++) {
    if (float(i) >= iters) break;
    if (uType == 2) {                      // burning ship
      z = abs(z);
      z = cmul(z, z) + c;
    } else if (uType == 3) {               // celtic
      vec2 z2 = cmul(z, z);
      z = vec2(abs(z2.x), z2.y) + c;
    } else if (uType == 4) {               // phoenix
      vec2 nz = cmul(z, z) + c + uJuliaC.y * prevZ;
      prevZ = z;
      z = nz;
    } else if (uType == 5) {               // tricorn / mandelbar
      vec2 zc = vec2(z.x, -z.y);
      z = cmul(zc, zc) + c;
    } else if (uType == 7) {               // perpendicular mandelbrot
      // z -> (|Re z| - i Im z)^2 + c  (real part abs, imag negated)
      vec2 zp = vec2(abs(z.x), -z.y);
      z = cmul(zp, zp) + c;
    } else if (uType == 8) {               // perpendicular burning ship
      vec2 zp = vec2(z.x, -abs(z.y));
      z = cmul(zp, zp) + c;
    } else if (uType == 9) {               // buffalo
      // |x|,|y| folded then squared, both components abs'd
      vec2 za = abs(z);
      vec2 z2 = cmul(za, za);
      z = vec2(abs(z2.x), abs(z2.y)) + c;
    } else if (uType == 10) {              // heart mandelbrot (|Im| fold)
      vec2 zh = vec2(z.x, abs(z.y));
      z = cmul(zh, zh) + c;
    } else if (uType == 11) {              // celtic mandelbar
      vec2 zc = vec2(z.x, -z.y);
      vec2 z2 = cmul(zc, zc);
      z = vec2(abs(z2.x), z2.y) + c;
    } else if (uType == 12) {              // mandelbar power 3
      vec2 zc = vec2(z.x, -z.y);
      z = cpow(zc, 3.0) + c;
    } else if (uType == 13) {              // multibrot power 3
      z = cpow(z, 3.0) + c;
    } else if (uType == 14) {              // multibrot power 4
      z = cpow(z, 4.0) + c;
    } else if (uType == 15) {              // multibrot power 5
      z = cpow(z, 5.0) + c;
    } else if (uType == 24) {              // simonbrot: z^2 * |z|... abs(z)*z^2
      vec2 z2 = cmul(z, z);
      z = cmul(abs(z), z2) + c;
    } else if (uType == 25) {              // celtic mandelbrot
      vec2 z2 = cmul(z, z);
      z = vec2(abs(z2.x), z2.y) + c;
    } else if (uType == 26) {              // burning ship power 3
      vec2 za = abs(z);
      z = cpow(za, 3.0) + c;
    } else {                               // mandelbrot / julia
      z = cmul(z, z) + c;
    }
    trap = min(trap, length(z));
    n = float(i);
    if (dot(z, z) > 256.0) { escaped = 1.0; break; }
  }

  // smooth iteration count
  float sn = n - log2(max(log2(dot(z, z) + 1.0), 1e-6)) + 4.0;
  float t = (sn / iters) * uColorScale;

  float hueShift = uPaletteShift + uTreble * uRHue * 0.85 + uTime * 0.02;
  vec3 col = pal(t + hueShift);

  // orbit-trap glow, kicked by the beat
  float g = exp(-trap * 2.2) * (uGlow + uBeat * uRGlow * 1.8);
  col += g * pal(hueShift + 0.5);

  // darken the interior, and fade the flat far-field to black so the fractal
  // reads as a glowing form on dark rather than a flat color wash.
  col *= mix(0.1, 1.0, escaped);
  col *= smoothstep(0.0, 6.0, sn);

  // overall level lift
  col *= 0.6 + uLevel * 1.0;

  col = pow(clamp(col, 0.0, 1.0), vec3(0.85)); // gentle gamma for punch
  gl_FragColor = vec4(col, 1.0);
}
`;

export const FRACTAL_FRAG_3D = SHARED + /* glsl */ `
uniform float uPower;
uniform float uCamDist;
uniform float uCamSpeed;
uniform vec2  uJuliaC;
uniform vec3  uJuliaC3;     // julia offset (infinite variants)
uniform float uJuliaMode;   // 0 = mandelbrot (use p), 1 = julia (use offset)
uniform mat3  uRotMat;      // rotation applied per iteration

// ---- distance estimators -------------------------------------------------
float deMandelbulb(vec3 p, float power) {
  vec3 z = p;
  vec3 c = mix(p, uJuliaC3, uJuliaMode);
  float dr = 1.0;
  float r = 0.0;
  for (int i = 0; i < 8; i++) {
    z = uRotMat * z;
    r = length(z);
    if (r > 2.0) break;
    float theta = acos(clamp(z.z / r, -1.0, 1.0));
    float phi = atan(z.y, z.x);
    dr = pow(r, power - 1.0) * power * dr + 1.0;
    float zr = pow(r, power);
    theta *= power;
    phi *= power;
    z = zr * vec3(sin(theta) * cos(phi), sin(theta) * sin(phi), cos(theta)) + c;
  }
  return 0.5 * log(r) * r / dr;
}

float deMandelbox(vec3 p, float scale) {
  vec3 offset = mix(p, uJuliaC3, uJuliaMode);
  float dr = 1.0;
  for (int i = 0; i < 10; i++) {
    p = uRotMat * p;
    p = clamp(p, -1.0, 1.0) * 2.0 - p;       // box fold
    float r2 = dot(p, p);
    float m = max(1.0 / r2, 1.0);
    if (r2 < 0.25) m = 4.0;                   // sphere fold
    p = p * m + offset;
    dr = dr * abs(scale) * m + 1.0;
    p = p * scale;
  }
  return length(p) / abs(dr);
}

float deMenger(vec3 p) {
  float d = max(abs(p.x), max(abs(p.y), abs(p.z))) - 1.2;
  float s = 1.0;
  for (int i = 0; i < 5; i++) {
    p = uRotMat * p;
    vec3 a = mod(p * s, 2.0) - 1.0;
    s *= 3.0;
    vec3 r = abs(1.0 - 3.0 * abs(a));
    float da = max(r.x, r.y);
    float db = max(r.y, r.z);
    float dc = max(r.z, r.x);
    float c = (min(da, min(db, dc)) - 1.0) / s;
    d = max(d, c);
  }
  return d;
}

float deSierpinski(vec3 z) {
  float scale = 2.0;
  float r;
  for (int i = 0; i < 12; i++) {
    z = uRotMat * z;
    if (z.x + z.y < 0.0) z.xy = -z.yx;
    if (z.x + z.z < 0.0) z.xz = -z.zx;
    if (z.y + z.z < 0.0) z.zy = -z.yz;
    z = z * scale - vec3(1.0) * (scale - 1.0);
  }
  return length(z) * pow(scale, -float(12));
}

float deQuaternion(vec3 pos, vec2 jc) {
  vec4 z = vec4(pos, 0.0);
  vec4 c = vec4(uJuliaC3, 0.0);
  float md2 = 1.0;
  float mz2 = dot(z, z);
  for (int i = 0; i < 8; i++) {
    md2 *= 4.0 * mz2;
    z = vec4(z.x*z.x - dot(z.yzw, z.yzw), 2.0*z.x*z.yzw) + c;
    mz2 = dot(z, z);
    if (mz2 > 4.0) break;
  }
  return 0.25 * sqrt(mz2 / md2) * log(mz2);
}

float deApollonian(vec3 p) {
  float s = 1.0;
  float scale = 1.2 + uMid * uRMorph * 0.2;
  for (int i = 0; i < 8; i++) {
    p = uRotMat * p;
    p = -1.0 + 2.0 * fract(0.5 * p + 0.5);
    float r2 = dot(p, p);
    float k = scale / r2;
    p *= k;
    s *= k;
  }
  return 0.25 * abs(p.y) / s;
}

// ---- appended new distance estimators ------------------------------------

// Julia-bulb: mandelbulb iteration but with a fixed julia constant (juliaMode
// forced on via uJuliaC3), giving a free-floating bulb instead of the seed-tied
// Mandelbulb. Uses the same per-iteration rotation as the others.
float deJuliaBulb(vec3 p, float power) {
  vec3 z = p;
  vec3 c = uJuliaC3;                  // always julia: detached constant
  float dr = 1.0;
  float r = 0.0;
  for (int i = 0; i < 8; i++) {
    z = uRotMat * z;
    r = length(z);
    if (r > 2.0) break;
    float theta = acos(clamp(z.z / r, -1.0, 1.0));
    float phi = atan(z.y, z.x);
    dr = pow(r, power - 1.0) * power * dr + 1.0;
    float zr = pow(r, power);
    theta *= power;
    phi *= power;
    z = zr * vec3(sin(theta) * cos(phi), sin(theta) * sin(phi), cos(theta)) + c;
  }
  return 0.5 * log(r) * r / dr;
}

// Pseudo-Kleinian (Knighty) - box fold + inversion against a sphere, IFS-like.
float dePseudoKleinian(vec3 p) {
  vec3 off = mix(p, uJuliaC3, uJuliaMode);
  vec3 z = off;
  float dr = 1.0;
  for (int i = 0; i < 9; i++) {
    z = uRotMat * z;
    z = clamp(z, -1.0, 1.0) * 2.0 - z;        // box fold
    float r2 = dot(z, z);
    float k = max(1.6 / max(r2, 1e-6), 1.0);  // sphere inversion
    z *= k; dr *= k;
    z = z + off;
  }
  return abs(0.5 * abs(z.z) / dr);
}

// Sierpinski octahedron IFS.
float deSierpinskiOcta(vec3 z) {
  float scale = 2.0;
  for (int i = 0; i < 12; i++) {
    z = uRotMat * z;
    z = abs(z);
    if (z.x < z.y) z.xy = z.yx;
    if (z.x < z.z) z.xz = z.zx;
    if (z.y < z.z) z.yz = z.zy;
    z = z * scale - vec3(1.0) * (scale - 1.0);
  }
  return length(z) * pow(scale, -float(12));
}

// Menger cross - Menger sponge variant with a cross-section twist.
float deMengerCross(vec3 p) {
  p = mix(p, uJuliaC3, uJuliaMode);
  float d = max(abs(p.x), max(abs(p.y), abs(p.z))) - 1.3;
  float s = 1.0;
  for (int i = 0; i < 4; i++) {
    p = uRotMat * p;
    vec3 a = mod(p * s, 2.0) - 1.0;
    s *= 3.0;
    vec3 r = 1.0 - 3.0 * abs(a);
    float da = max(r.x, r.y);
    float db = max(r.y, r.z);
    float dc = max(r.z, r.x);
    float c = (min(da, min(db, dc)) - 1.0) / s;
    d = max(d, c);
  }
  return d;
}

// Jerusalem cube - recursive cross-shaped subtraction.
float sdBox(vec3 p, vec3 b) {
  vec3 q = abs(p) - b;
  return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}
float deJerusalem(vec3 p) {
  p = mix(p, uJuliaC3, uJuliaMode);
  float d = sdBox(p, vec3(1.3));
  float s = 1.0;
  for (int i = 0; i < 4; i++) {
    p = uRotMat * p;
    vec3 a = mod(p * s, 2.0) - 1.0;
    s *= 3.2;
    vec3 r = abs(a) * 3.0;
    // subtract a plus/cross shaped channel
    float cr = min(max(r.x, r.y), min(max(r.y, r.z), max(r.z, r.x))) - 1.0;
    d = max(d, -cr / s);
  }
  return d;
}

// Amazing Box (classic Mandelbox with fixed folds, distinct scale handling).
float deAmazingBox(vec3 p, float scale) {
  vec3 offset = mix(p, uJuliaC3, uJuliaMode);
  vec3 z = p;
  float dr = 1.0;
  for (int i = 0; i < 11; i++) {
    z = uRotMat * z;
    z = clamp(z, -1.0, 1.0) * 2.0 - z;        // box fold
    float r2 = dot(z, z);
    if (r2 < 0.5) { z *= 2.0; dr *= 2.0; }
    else if (r2 < 1.0) { float t = 1.0 / r2; z *= t; dr *= t; }
    z = z * scale + offset;
    dr = dr * abs(scale) + 1.0;
  }
  return length(z) / abs(dr);
}

// Abox-mod - Mandelbox with a min-radius clamp and asymmetric fold.
float deAboxMod(vec3 p, float scale) {
  vec3 offset = mix(p, uJuliaC3, uJuliaMode);
  vec3 z = p;
  float dr = 1.0;
  float minR = 0.45;
  for (int i = 0; i < 11; i++) {
    z = uRotMat * z;
    z = clamp(z, -1.0, 1.0) * 2.0 - z;
    float r2 = dot(z, z);
    float m = max(minR / max(r2, 1e-6), min(1.0 / r2, 1.0));
    z = z * m + offset;
    dr = dr * abs(scale) * m + 1.0;
    z = z * scale;
  }
  return length(z) / abs(dr);
}

// Tglad formula (the original Mandelbox folding by Tom Lowe).
float deTglad(vec3 p, float scale) {
  vec3 offset = mix(p, uJuliaC3, uJuliaMode);
  vec3 z = p;
  float dr = 1.0;
  for (int i = 0; i < 10; i++) {
    z = uRotMat * z;
    z = clamp(z, -1.0, 1.0) * 2.0 - z;        // conditional box fold
    float r2 = dot(z, z);
    if (r2 < 0.25) { z *= 4.0; dr *= 4.0; }
    else if (r2 < 1.0) { z /= r2; dr /= r2; }
    z = z * scale + offset;
    dr = dr * abs(scale) + 1.0;
  }
  return (length(z) - 2.0) / abs(dr);
}

// Hybrid bulb-box: one box-fold step then one bulb step per iteration.
float deHybridBulbBox(vec3 p, float power) {
  vec3 z = p;
  vec3 c = mix(p, uJuliaC3, uJuliaMode);
  float dr = 1.0;
  float r = 0.0;
  for (int i = 0; i < 7; i++) {
    z = uRotMat * z;
    // box fold
    z = clamp(z, -1.0, 1.0) * 2.0 - z;
    // bulb step
    r = length(z);
    if (r > 2.0) break;
    float theta = acos(clamp(z.z / r, -1.0, 1.0)) * power;
    float phi = atan(z.y, z.x) * power;
    dr = pow(r, power - 1.0) * power * dr + 1.0;
    float zr = pow(r, power);
    z = zr * vec3(sin(theta) * cos(phi), sin(theta) * sin(phi), cos(theta)) + c;
  }
  return 0.5 * log(max(r, 1e-6)) * r / dr;
}

// Quaternion cubic Julia (z -> z^3 + c in quaternion algebra, approx).
float deQuaternionCubic(vec3 pos) {
  vec4 z = vec4(pos, 0.0);
  vec4 c = vec4(uJuliaC3, 0.0);
  float md2 = 1.0;
  float mz2 = dot(z, z);
  for (int i = 0; i < 7; i++) {
    // derivative of z^3 magnitude ~ 9|z|^4
    md2 *= 9.0 * mz2 * mz2;
    // z^3 via two squarings: z2 = z*z (quaternion), then z3 = z2 * z
    vec4 z2 = vec4(z.x*z.x - dot(z.yzw, z.yzw), 2.0*z.x*z.yzw);
    vec4 z3 = vec4(z2.x*z.x - dot(z2.yzw, z.yzw),
                   z2.x*z.yzw + z.x*z2.yzw + cross(z2.yzw, z.yzw));
    z = z3 + c;
    mz2 = dot(z, z);
    if (mz2 > 4.0) break;
  }
  return 0.25 * sqrt(mz2 / md2) * log(max(mz2, 1e-6));
}

// Octahedral IFS - fold into octahedral symmetry then scale toward a vertex.
float deOctahedralIFS(vec3 z) {
  float scale = 2.0;
  vec3 v = normalize(vec3(1.0, 1.0, 1.0));
  for (int i = 0; i < 12; i++) {
    z = uRotMat * z;
    z = abs(z);
    // octahedral fold
    if (z.x + z.y < 0.0) z.xy = -z.yx;
    if (z.x + z.z < 0.0) z.xz = -z.zx;
    if (z.y + z.z < 0.0) z.yz = -z.zy;
    z = z * scale - v * (scale - 1.0);
  }
  return length(z) * pow(scale, -float(12));
}

// KaliBox - Mandelbox-style with the "kali" abs fold (Kali's variant).
float deKaliBox(vec3 p, float scale) {
  vec3 offset = mix(p, uJuliaC3, uJuliaMode);
  vec3 z = p;
  float dr = 1.0;
  for (int i = 0; i < 11; i++) {
    z = uRotMat * z;
    z = abs(z);                               // kali absolute fold
    z = clamp(z, -1.0, 1.0) * 2.0 - z;
    float r2 = dot(z, z);
    float m = max(1.0 / max(r2, 1e-6), 1.0);
    z = z * m + offset;
    dr = dr * abs(scale) * m + 1.0;
    z = z * scale;
  }
  return length(z) / abs(dr);
}

// Mandelbrot cylinder - 2D Mandelbrot extruded with a sphere cap (z axis).
float deMandelbrotCylinder(vec3 p) {
  vec2 c = mix(p, uJuliaC3, uJuliaMode).xy;
  vec2 z = vec2(0.0);
  float dr = 1.0;
  float r = 0.0;
  for (int i = 0; i < 20; i++) {
    dr = 2.0 * length(z) * dr + 1.0;
    z = vec2(z.x*z.x - z.y*z.y, 2.0*z.x*z.y) + c;
    r = length(z);
    if (r > 4.0) break;
  }
  float d2d = 0.5 * log(max(r, 1e-6)) * r / max(dr, 1e-6);
  // extrude along z, cap with a slab of half-height 1.0
  float dz = abs(p.z) - 1.0;
  return max(d2d, dz);
}

// Kleinian group limit set (inversive, sphere-fold based).
float deKleinianGroup(vec3 p) {
  vec3 z = mix(p, uJuliaC3, uJuliaMode);
  float dr = 1.0;
  float k = 1.0;
  for (int i = 0; i < 9; i++) {
    z = uRotMat * z;
    z = 2.0 * clamp(z, -1.0, 1.0) - z;        // box fold
    float r2 = dot(z, z);
    float m = 1.3 / max(r2, 0.18);            // bounded sphere inversion
    z *= m; dr *= m;
  }
  return 0.5 * abs(z.y) / dr;
}

// Mausoleum box - Mandelbox with a "fabric" abs-x fold producing arches.
float deMausoleum(vec3 p, float scale) {
  vec3 offset = mix(p, uJuliaC3, uJuliaMode);
  vec3 z = p;
  float dr = 1.0;
  for (int i = 0; i < 10; i++) {
    z = uRotMat * z;
    z = vec3(abs(z.x + 1.0) - abs(z.x - 1.0) - z.x, z.y, z.z); // mausoleum fold on x
    z = clamp(z, -1.0, 1.0) * 2.0 - z;
    float r2 = dot(z, z);
    float m = max(1.0 / max(r2, 1e-6), 1.0);
    z = z * m + offset;
    dr = dr * abs(scale) * m + 1.0;
    z = z * scale;
  }
  return length(z) / abs(dr);
}

// Coral / Pseudo-Kleinian growth - repeated fold + inversion with offset.
float deCoral(vec3 p) {
  vec3 z = mix(p, uJuliaC3, uJuliaMode);
  vec3 c = vec3(0.9, 0.6, 0.5);
  float dr = 1.0;
  for (int i = 0; i < 10; i++) {
    z = uRotMat * z;
    z = abs(z);
    float r2 = dot(z, z);
    float m = 1.1 / max(r2, 0.25);
    z = z * m - c;
    dr = dr * m + 1.0;
  }
  return 0.4 * length(z) / dr;
}

float map(vec3 p) {
  if (uType == 0) return deMandelbulb(p, uPower + uBeat * uRMorph * 3.2);
  if (uType == 1) return deMandelbox(p, -1.5 - uMid * uRMorph * 1.3);
  if (uType == 2) return deMenger(p);
  if (uType == 3) return deQuaternion(p, uJuliaC + uBeat * uRMorph * 0.18);
  if (uType == 5) return deApollonian(p);
  if (uType == 6) return deJuliaBulb(p, uPower + uBeat * uRMorph * 3.2);
  if (uType == 7) return dePseudoKleinian(p);
  if (uType == 8) return deSierpinskiOcta(p);
  if (uType == 9) return deMengerCross(p);
  if (uType == 10) return deJerusalem(p);
  if (uType == 11) return deAmazingBox(p, 2.0 + uMid * uRMorph * 0.6);
  if (uType == 12) return deAboxMod(p, -1.7 - uMid * uRMorph * 1.0);
  if (uType == 13) return deTglad(p, 2.0 + uMid * uRMorph * 0.5);
  if (uType == 14) return deHybridBulbBox(p, uPower + uBeat * uRMorph * 2.0);
  if (uType == 15) return deQuaternionCubic(p);
  if (uType == 16) return deOctahedralIFS(p);
  if (uType == 17) return deKaliBox(p, -1.6 - uMid * uRMorph * 1.0);
  if (uType == 18) return deMandelbrotCylinder(p);
  if (uType == 19) return deKleinianGroup(p);
  if (uType == 20) return deMausoleum(p, 2.0 + uMid * uRMorph * 0.5);
  if (uType == 21) return deCoral(p);
  return deSierpinski(p);
}

vec3 calcNormal(vec3 p) {
  vec2 e = vec2(0.0015, 0.0);
  return normalize(vec3(
    map(p + e.xyy) - map(p - e.xyy),
    map(p + e.yxy) - map(p - e.yxy),
    map(p + e.yyx) - map(p - e.yyx)
  ));
}

void main() {
  vec2 uv = (vUv - 0.5);
  uv.x *= iResolution.x / iResolution.y;

  // orbiting camera, spun by the music
  float a = uTime * uCamSpeed + uBeat * uRRot * 1.5;
  float dist = uCamDist * (1.0 - uBass * uRZoom * 0.35);
  vec3 ro = vec3(sin(a) * dist, sin(uTime * 0.13) * 0.6, cos(a) * dist);
  vec3 ta = vec3(0.0);
  vec3 ww = normalize(ta - ro);
  vec3 uu = normalize(cross(ww, vec3(0.0, 1.0, 0.0)));
  vec3 vv = cross(uu, ww);
  vec3 rd = normalize(uv.x * uu + uv.y * vv + 1.4 * ww);

  float t = 0.0;
  float glow = 0.0;
  float hit = 0.0;
  for (int i = 0; i < 96; i++) {
    vec3 p = ro + rd * t;
    float d = map(p);
    glow += exp(-d * 7.0);
    if (d < 0.0008) { hit = 1.0; break; }
    if (t > 8.0) break;
    t += d * 0.85;
  }

  vec3 col = vec3(0.0);
  float hueShift = uPaletteShift + uTreble * uRHue * 0.7 + uTime * 0.03;
  if (hit > 0.5) {
    vec3 p = ro + rd * t;
    vec3 nor = calcNormal(p);
    vec3 lig = normalize(vec3(0.6, 0.7, 0.4));
    float dif = clamp(dot(nor, lig), 0.0, 1.0);
    float amb = 0.4 + 0.6 * nor.y;
    float ao = 1.0 / (1.0 + t * 0.12);
    float shade = (amb * 0.5 + dif * 0.8) * ao;
    col = pal(t * 0.18 * uColorScale + hueShift) * shade;
  } else {
    col = pal(hueShift) * 0.05; // faint background tint
  }

  // additive glow from the marched proximity field
  col += pal(hueShift + 0.4) * glow * 0.012 * (uGlow + uBeat * uRGlow * 1.8);
  col *= 0.6 + uLevel * 0.9;

  col = pow(clamp(col, 0.0, 1.0), vec3(0.85));
  gl_FragColor = vec4(col, 1.0);
}
`;
