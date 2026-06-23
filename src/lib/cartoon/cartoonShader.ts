/**
 * 2D cartoon fragment shader (WebGL1 / GLSL ES 1.0). Full-screen SDF shapes
 * with a bold outline, flat fills, audio-reactive bounce/spin/colour, output
 * as a transparent cutout (alpha 0 outside the shape).
 */
export const CARTOON_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;

uniform vec2  iResolution;
uniform float uTime;
uniform int   uShape;
uniform vec3  uColA, uColB, uColC;
uniform vec3  uOutline;
uniform float uOutlineW;
uniform float uSpin;
uniform float uSatellites;
uniform float uBass, uMid, uTreble, uLevel, uBeat;
uniform float uZoomFx;

// composed-scene (uShape == 20) params
uniform int   uSceneBgMode, uSceneParticle, uSceneParticleShape, uSceneSubject;
uniform float uSceneDensity;
uniform vec3  uSceneBgTop, uSceneBgBot, uSceneGround, uSceneParticleCol, uSceneSubjectCol;

mat2 rot(float a){ float c=cos(a), s=sin(a); return mat2(c,-s,s,c); }
float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
float sdCircle(vec2 p,float r){ return length(p)-r; }
float sdBox(vec2 p,vec2 b){ vec2 d=abs(p)-b; return length(max(d,0.0))+min(max(d.x,d.y),0.0); }
float sdStar5(vec2 p,float r,float rf){
  const vec2 k1=vec2(0.809016994,-0.587785252);
  const vec2 k2=vec2(-0.809016994,-0.587785252);
  p.x=abs(p.x);
  p-=2.0*max(dot(k1,p),0.0)*k1;
  p-=2.0*max(dot(k2,p),0.0)*k2;
  p.x=abs(p.x); p.y-=r;
  vec2 ba=rf*vec2(-k1.y,k1.x)-vec2(0.0,1.0);
  float h=clamp(dot(p,ba)/dot(ba,ba),0.0,r);
  return length(p-ba*h)*sign(p.y*ba.x-p.x*ba.y);
}
float sdHeart(vec2 p){
  p.y += 0.6; p.x = abs(p.x);
  if (p.y + p.x > 1.0)
    return sqrt(dot(p-vec2(0.25,0.75),p-vec2(0.25,0.75))) - sqrt(2.0)/4.0;
  return sqrt(min(dot(p-vec2(0.0,1.0),p-vec2(0.0,1.0)),
                  dot(p-0.5*max(p.x+p.y,0.0),p-0.5*max(p.x+p.y,0.0)))) * sign(p.x-p.y);
}
// ---- extra SDF helpers for the new single shapes ----
float sdEquiTriangle(vec2 p, float r){
  const float k = 1.7320508;          // sqrt(3)
  p.x = abs(p.x) - r;
  p.y = p.y + r/k;
  if (p.x + k*p.y > 0.0) p = vec2(p.x - k*p.y, -k*p.x - p.y)/2.0;
  p.x -= clamp(p.x, -2.0*r, 0.0);
  return -length(p)*sign(p.y);
}
float sdRhombus(vec2 p, vec2 b){
  p = abs(p);
  float h = clamp((-2.0*(p.x*b.x - p.y*b.y) + b.x*b.x - b.y*b.y)/dot(b,b), -1.0, 1.0);
  float d = length(p - 0.5*vec2(b.x*(1.0-h), b.y*(1.0+h)));
  return d * sign(p.x*b.y + p.y*b.x - b.x*b.y);
}
// regular n-gon, radius r
float sdNGon(vec2 p, float n, float r){
  float an = 3.14159265/n;
  float a = atan(p.x, p.y);
  a = mod(a + an, 2.0*an) - an;
  return length(p)*cos(a) - r*cos(an);
}
float sdMoon(vec2 p, float d, float ra, float rb){
  p.y = abs(p.y);
  float a = (ra*ra - rb*rb + d*d)/(2.0*d);
  float b = sqrt(max(ra*ra - a*a, 0.0));
  if (d*(p.x*b - p.y*a) > d*d*max(b - p.y, 0.0))
    return length(p - vec2(a,b));
  return max(length(p) - ra, -(length(p - vec2(d,0.0)) - rb));
}
float sdSegment(vec2 p, vec2 a, vec2 b){
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa,ba)/dot(ba,ba), 0.0, 1.0);
  return length(pa - ba*h);
}
float sdTeardrop(vec2 p){
  // round bottom, pointed top: circle unioned with a tapering segment
  float d = sdCircle(p - vec2(0.0,-0.12), 0.34);
  float tip = sdSegment(p, vec2(0.0,0.46), vec2(0.0,-0.12))
              - mix(0.32, 0.0, clamp((p.y + 0.12)/0.58, 0.0, 1.0));
  return min(d, tip);
}
float sdVesica(vec2 p, float r, float d){
  p = abs(p);
  float b = sqrt(max(r*r - d*d, 0.0));
  return ((p.y - b)*d > p.x*b) ? length(p - vec2(0.0,b)) : length(p - vec2(-d,0.0)) - r;
}
float sdEgg(vec2 p){
  // smooth circle stretched, fatter bottom
  p.y *= 0.86;
  float r = 0.42 + 0.07*clamp(-p.y/0.4, 0.0, 1.0);
  return length(p) - r;
}
float sdLeaf(vec2 p){
  p = p.yx;                              // vertical leaf
  return sdVesica(p, 0.62, 0.4);
}
float sdShield(vec2 p){
  // flat-topped crest tapering to a rounded point at the bottom
  float box = sdBox(p - vec2(0.0,0.14), vec2(0.4,0.34));
  float point = length((p - vec2(0.0,0.5)) * vec2(1.0,0.85)) - 0.66;
  return max(box, point);
}
float sdGear(vec2 p, float t){
  float base = length(p);
  float a = atan(p.y, p.x);
  float teeth = 0.06 * smoothstep(0.3, 0.9, cos(a*10.0 - t*0.6));
  float d = base - (0.38 + teeth);
  float hole = -(base - 0.15);
  return max(d, hole);
}
float sdArrow(vec2 p){
  // right-pointing arrow: shaft + head
  float shaft = sdBox(p - vec2(-0.08,0.0), vec2(0.3,0.12));
  float head = sdEquiTriangle((p - vec2(0.34,0.0)).yx, 0.32);
  return min(shaft, head);
}
float sdRing(vec2 p, float r, float w){
  return abs(length(p) - r) - w;
}
float sdPlusShape(vec2 p, float b, float a){
  float h1 = sdBox(p, vec2(a, b));
  float h2 = sdBox(p, vec2(b, a));
  return min(h1, h2);
}
float sdGem(vec2 p){
  // faceted crystal: hexagon top tapering to a point
  float top = sdNGon(p - vec2(0.0,0.08), 6.0, 0.4);
  float pt = sdEquiTriangle(vec2(p.x, -p.y - 0.34), 0.46);
  return min(top, pt);
}
float sdLightning(vec2 p){
  float d = 1e3;
  d = min(d, sdSegment(p, vec2(0.05,0.5),  vec2(-0.18,0.05)));
  d = min(d, sdSegment(p, vec2(-0.18,0.05),vec2(0.08,0.02)));
  d = min(d, sdSegment(p, vec2(0.08,0.02), vec2(-0.05,-0.5)));
  return d - 0.07;
}
float sdSpiral(vec2 p){
  // Archimedean spiral band. radius grows linearly with wrapped angle.
  float r = length(p);
  float a = atan(p.y, p.x);                 // -pi..pi
  float b = 0.07;                            // spacing per radian
  // nearest turn count k so that band radius ~ r
  float k = floor((r - a*b) / (6.2831853*b) + 0.5);
  float target = (a + 6.2831853*k) * b;
  return abs(r - target) - 0.045;
}
float sdMusicNote(vec2 p){
  float head = length((p - vec2(-0.18,-0.24)) * vec2(1.0,1.25)) - 0.18;
  float stem = sdBox(p - vec2(0.0,0.12), vec2(0.045,0.42));
  float flag = sdBox((p - vec2(0.12,0.42)) * rot(-0.5), vec2(0.05,0.13));
  return min(min(head, stem), flag);
}
float sdSpeechBubble(vec2 p){
  // rounded rectangle body with a small tail at lower-left
  float round_ = length(max(abs(p - vec2(0.0,0.08)) - vec2(0.34,0.22), 0.0)) - 0.08;
  float tail = sdEquiTriangle(p - vec2(-0.16,-0.32), 0.2);
  return min(round_, tail);
}
float sdCloud(vec2 p){
  float d = sdCircle(p - vec2(-0.24,-0.02), 0.22);
  d = min(d, sdCircle(p - vec2(0.0,0.08), 0.28));
  d = min(d, sdCircle(p - vec2(0.24,-0.02), 0.22));
  d = min(d, sdBox(p - vec2(0.0,-0.14), vec2(0.46,0.1)));
  return d;
}
float sdFlame(vec2 p){
  // rounded bottom rising to a point at top (teardrop, tip up)
  float d = sdCircle(p - vec2(0.0,-0.14), 0.34);
  float tip = sdSegment(p, vec2(0.0,0.5), vec2(0.0,-0.14))
              - mix(0.32, 0.0, clamp((p.y + 0.14)/0.64, 0.0, 1.0));
  return min(d, tip);
}
float sdCatFace(vec2 p){
  float face = sdCircle(p, 0.42);
  float earL = sdEquiTriangle((p - vec2(-0.3,0.34)) * rot(0.3), 0.26);
  float earR = sdEquiTriangle((p - vec2(0.3,0.34)) * rot(-0.3), 0.26);
  return min(min(face, earL), earR);
}
float sdSunRays(vec2 p, float t){
  float a = atan(p.y, p.x);
  float core = length(p) - (0.3 + 0.05*sin(t*2.0));
  float ray = length(p) - (0.42 + 0.08*abs(sin(a*6.0 + t)));
  return min(core, ray);
}
float sdSnowflake(vec2 p){
  // 6-fold symmetric crossing bars
  float d = 1e3;
  for (int i=0;i<3;i++){
    float ang = float(i)*1.0471975;   // 60deg steps (3 bars => 6 arms)
    vec2 q = rot(ang) * p;
    d = min(d, sdBox(q, vec2(0.46,0.035)));
    d = min(d, sdBox(q - vec2(0.28,0.0), vec2(0.02,0.12)));
    d = min(d, sdBox(q + vec2(0.28,0.0), vec2(0.02,0.12)));
  }
  return d;
}
float subjSDF(vec2 p, int k){
  if (k==0){ float a=atan(p.y,p.x); return length(p)-0.5*(1.0+0.13*sin(a*6.0)); }
  if (k==1) return sdStar5(p,0.5,0.42);
  if (k==2) return sdHeart(p*1.5)*0.66;
  if (k==3) return sdCircle(p,0.5);
  if (k==4) return sdBox(p,vec2(0.42));
  if (k==5){ float a=atan(p.y,p.x); return length(p)-(0.34+0.18*abs(sin(a*2.5))); }
  return sdCircle(p,0.45);
}

// ---- extra single-shape SDFs (ids 120+) ----
float sdStarN(vec2 p, float r, float n, float m){
  float an = 3.141593/n;
  float en = 3.141593/m;
  vec2 acs = vec2(cos(an), sin(an));
  vec2 ecs = vec2(cos(en), sin(en));
  float bn = mod(atan(p.x, p.y), 2.0*an) - an;
  p = length(p) * vec2(cos(bn), abs(sin(bn)));
  p -= r * acs;
  p += ecs * clamp(-dot(p, ecs), 0.0, r*acs.y/ecs.y);
  return length(p) * sign(p.x);
}
float sdHexagram2(vec2 p){
  return min(sdEquiTriangle(p, 0.52), sdEquiTriangle(rot(3.141593)*p, 0.52));
}
float sdCrown(vec2 p){
  float base = sdBox(p - vec2(0.0,-0.18), vec2(0.42,0.14));
  float c0 = sdEquiTriangle((p - vec2(0.0,0.12))*1.1, 0.34);
  float c1 = sdEquiTriangle((p - vec2(-0.32,0.04))*1.3, 0.26);
  float c2 = sdEquiTriangle((p - vec2(0.32,0.04))*1.3, 0.26);
  return min(base, min(c0, min(c1, c2)));
}
float sdButterfly(vec2 p){
  vec2 q = vec2(abs(p.x), p.y);
  float w = sdCircle(q - vec2(0.26,0.12), 0.24);
  w = min(w, sdCircle(q - vec2(0.22,-0.16), 0.19));
  return min(w, sdBox(p, vec2(0.035,0.34)));
}
float sdFlowerN(vec2 p, float n){
  float a = atan(p.y, p.x);
  return length(p) - (0.32 + 0.16*cos(a*n));
}
float sdApple(vec2 p){
  float d = max(sdCircle(p - vec2(0.0,-0.04), 0.42), -sdCircle(p - vec2(0.0,0.42), 0.16));
  return min(d, sdBox(p - vec2(0.05,0.4), vec2(0.03,0.12)));
}
float sdGhost(vec2 p){
  float d = min(sdCircle(p - vec2(0.0,0.14), 0.36), sdBox(p - vec2(0.0,-0.18), vec2(0.36,0.32)));
  for (int i=0;i<5;i++){ float fi=float(i)-2.0;
    d = max(d, -sdCircle(p - vec2(fi*0.18,-0.48), 0.1));
  }
  return d;
}
float sdBalloon(vec2 p){
  return min(sdCircle(p - vec2(0.0,0.1), 0.34), sdEquiTriangle((p - vec2(0.0,-0.26))*rot(3.141593)*2.4, 0.16));
}
float sdPlanet(vec2 p){
  vec2 rp = rot(0.42)*p;
  return min(sdCircle(p, 0.3), abs(length(rp*vec2(1.0,2.7)) - 0.5) - 0.035);
}
float sdComet(vec2 p){
  float head = sdCircle(p - vec2(0.22,0.18), 0.2);
  float t = sdSegment(p, vec2(0.22,0.18), vec2(-0.34,-0.3)) - mix(0.16,0.01, clamp((p.x+0.34)/0.6,0.0,1.0));
  return min(head, t);
}
float sdMushroom(vec2 p){
  float cap = max(sdCircle(p - vec2(0.0,0.06), 0.4), -(p.y-0.06));
  return min(cap, sdBox(p - vec2(0.0,-0.26), vec2(0.15,0.26)));
}
float sdBell(vec2 p){
  float body = max(sdCircle(p - vec2(0.0,0.08), 0.36), -(p.y+0.28));
  return min(body, min(sdBox(p - vec2(0.0,-0.26), vec2(0.4,0.07)), sdCircle(p - vec2(0.0,-0.38), 0.07)));
}
float sdPaw(vec2 p){
  float t = sdCircle(p - vec2(-0.26,0.1), 0.12);
  t = min(t, sdCircle(p - vec2(-0.09,0.24), 0.12));
  t = min(t, sdCircle(p - vec2(0.09,0.24), 0.12));
  t = min(t, sdCircle(p - vec2(0.26,0.1), 0.12));
  return min(sdCircle(p - vec2(0.0,-0.12), 0.25), t);
}
float sdClover(vec2 p){
  float d = sdCircle(p - vec2(0.0,0.22), 0.2);
  d = min(d, sdCircle(p - vec2(0.0,-0.22), 0.2));
  d = min(d, sdCircle(p - vec2(0.22,0.0), 0.2));
  return min(d, sdCircle(p - vec2(-0.22,0.0), 0.2));
}
float sdSpade(vec2 p){
  return min(sdHeart(vec2(p.x,-p.y)*1.5)*0.66, sdEquiTriangle((p - vec2(0.0,-0.32))*rot(3.141593)*1.9, 0.2));
}
float sdClub(vec2 p){
  float d = sdCircle(p - vec2(0.0,0.18), 0.19);
  d = min(d, sdCircle(p - vec2(-0.2,-0.04), 0.19));
  d = min(d, sdCircle(p - vec2(0.2,-0.04), 0.19));
  return min(d, sdEquiTriangle((p - vec2(0.0,-0.32))*rot(3.141593)*1.9, 0.2));
}
float sdInfinity(vec2 p){
  float a = abs(length(p - vec2(-0.22,0.0)) - 0.2) - 0.055;
  float b = abs(length(p - vec2(0.22,0.0)) - 0.2) - 0.055;
  return min(a, b);
}
float sdEyeShape(vec2 p){
  return min(sdVesica(p.yx, 0.62, 0.34), sdCircle(p, 0.15));
}

// ---- single-shape SDFs (ids 142+) ----
float sdKite(vec2 p){
  float u = sdEquiTriangle(vec2(p.x, p.y - 0.06) * 1.5, 0.4);
  float d = sdEquiTriangle(vec2(p.x, -(p.y + 0.12)) * 1.0, 0.5);
  return min(u, d);
}
float sdHouse(vec2 p){
  return min(sdBox(p - vec2(0.0,-0.16), vec2(0.36,0.26)), sdEquiTriangle((p - vec2(0.0,0.26)) * 1.5, 0.4));
}
float sdTree(vec2 p){
  float trunk = sdBox(p - vec2(0.0,-0.36), vec2(0.07,0.16));
  return min(trunk, min(sdEquiTriangle((p - vec2(0.0,0.12)) * 1.3, 0.42), sdEquiTriangle((p - vec2(0.0,-0.06)) * 1.1, 0.42)));
}
float sdMountain(vec2 p){
  return min(sdEquiTriangle((p - vec2(-0.18,-0.1)) * 1.3, 0.42), sdEquiTriangle((p - vec2(0.2,-0.16)) * 1.0, 0.5));
}
float sdLightbulb(vec2 p){
  return min(sdCircle(p - vec2(0.0,0.1), 0.32), sdBox(p - vec2(0.0,-0.28), vec2(0.12,0.14)));
}
float sdRocket(vec2 p){
  float body = sdVesica(p, 0.66, 0.32);
  float nose = sdEquiTriangle((p - vec2(0.0,0.3)) * 1.6, 0.3);
  vec2 q = vec2(abs(p.x), p.y);
  float fin = sdEquiTriangle(vec2(q.x - 0.22, -(q.y + 0.34)) * 1.4, 0.3);
  return min(min(body, nose), fin);
}
float sdIceCream(vec2 p){
  return min(sdEquiTriangle(vec2(p.x, -(p.y + 0.1)) * 1.1, 0.46), sdCircle(p - vec2(0.0,0.2), 0.26));
}
float sdPizza(vec2 p){
  return sdEquiTriangle(vec2(p.x, -(p.y + 0.05)) * 0.95, 0.5);
}
float sdUmbrella(vec2 p){
  float dome = max(sdCircle(p - vec2(0.0,0.05), 0.42), -(p.y - 0.05));
  float handle = sdBox(p - vec2(0.0,-0.24), vec2(0.04,0.3));
  float hook = abs(length(p - vec2(-0.1,-0.5)) - 0.09) - 0.04;
  hook = max(hook, -(p.y + 0.5));
  return min(dome, min(handle, hook));
}
float sdSnowman(vec2 p){
  float d = sdCircle(p - vec2(0.0,0.32), 0.18);
  d = min(d, sdCircle(p - vec2(0.0,0.02), 0.26));
  return min(d, sdCircle(p - vec2(0.0,-0.32), 0.32));
}
float sdCrescentStar(vec2 p){
  float moon = sdMoon(rot(-0.4) * (p - vec2(-0.05,0.0)), 0.34, 0.42, 0.34);
  float star = sdStarN(p - vec2(0.24,0.18), 0.15, 5.0, 2.4);
  return min(moon, star);
}
float sdDiamondRing(vec2 p){
  float band = abs(length(p - vec2(0.0,-0.14)) - 0.3) - 0.05;
  return min(band, sdRhombus(p - vec2(0.0,0.32), vec2(0.22,0.28)));
}
float sdAnchor(vec2 p){
  float ring = abs(length(p - vec2(0.0,0.4)) - 0.11) - 0.04;
  float shaft = sdBox(p, vec2(0.045,0.42));
  float cross = sdBox(p - vec2(0.0,0.2), vec2(0.22,0.045));
  float arc = max(abs(length(p - vec2(0.0,-0.06)) - 0.34) - 0.05, p.y + 0.06);
  return min(min(ring, shaft), min(cross, arc));
}
float sdBone(vec2 p){
  vec2 q = vec2(abs(p.x), abs(p.y));
  return min(sdBox(p, vec2(0.32,0.07)), sdCircle(q - vec2(0.32,0.1), 0.12));
}
float sdTooth(vec2 p){
  float top = min(sdBox(p - vec2(0.0,0.12), vec2(0.28,0.18)), sdCircle(p - vec2(0.0,0.18), 0.28));
  vec2 q = vec2(abs(p.x), p.y);
  float root = sdEquiTriangle(vec2(q.x - 0.15, -(q.y + 0.18)) * 1.2, 0.3);
  return min(top, root);
}
float sdFish(vec2 p){
  float body = sdVesica(p.yx, 0.58, 0.28);
  float tail = sdEquiTriangle(rot(1.5708) * (p - vec2(-0.5,0.0)) * 1.4, 0.28);
  return min(body, tail);
}
float sdBird(vec2 p){
  float body = sdCircle(p - vec2(-0.04,-0.04), 0.3);
  float head = sdCircle(p - vec2(0.22,0.2), 0.16);
  float beak = sdEquiTriangle(rot(-1.5708) * (p - vec2(0.44,0.18)) * 1.8, 0.2);
  float wing = sdEquiTriangle((p - vec2(-0.08,0.02)) * 1.5, 0.28);
  return min(min(body, head), min(beak, wing));
}
float sdTrophy(vec2 p){
  float bowl = min(sdBox(p - vec2(0.0,0.24), vec2(0.27,0.16)), sdCircle(p - vec2(0.0,0.14), 0.27));
  float stem = sdBox(p - vec2(0.0,-0.16), vec2(0.06,0.16));
  float base = sdBox(p - vec2(0.0,-0.34), vec2(0.2,0.07));
  return min(min(bowl, stem), base);
}
float sdLatinCross(vec2 p){
  return min(sdBox(p - vec2(0.0,-0.05), vec2(0.1,0.45)), sdBox(p - vec2(0.0,0.18), vec2(0.3,0.1)));
}
float sdLollipop(vec2 p){
  return min(sdCircle(p - vec2(0.0,0.18), 0.3), sdBox(p - vec2(0.0,-0.3), vec2(0.04,0.26)));
}
float sdCactus(vec2 p){
  float trunk = min(sdBox(p - vec2(0.0,-0.05), vec2(0.13,0.4)), sdCircle(p - vec2(0.0,0.35), 0.13));
  float la = min(sdBox(p - vec2(-0.24,0.0), vec2(0.12,0.08)), sdBox(p - vec2(-0.32,0.12), vec2(0.08,0.18)));
  float ra = min(sdBox(p - vec2(0.24,-0.08), vec2(0.12,0.08)), sdBox(p - vec2(0.32,0.04), vec2(0.08,0.18)));
  return min(trunk, min(la, ra));
}
float sdMug(vec2 p){
  float body = sdBox(p - vec2(-0.06,0.0), vec2(0.28,0.34));
  float handle = max(abs(length(p - vec2(0.28,0.0)) - 0.18) - 0.05, -(p.x - 0.2));
  return min(body, handle);
}
float sdBowtie(vec2 p){
  float l = sdEquiTriangle(rot(1.5708) * (p - vec2(-0.22,0.0)) * 1.2, 0.4);
  float r = sdEquiTriangle(rot(-1.5708) * (p - vec2(0.22,0.0)) * 1.2, 0.4);
  return min(min(l, r), sdBox(p, vec2(0.06,0.11)));
}
float sdGiftBox(vec2 p){
  float box = sdBox(p - vec2(0.0,-0.06), vec2(0.36,0.3));
  float bow = min(sdCircle(p - vec2(-0.12,0.3), 0.1), sdCircle(p - vec2(0.12,0.3), 0.1));
  return min(box, bow);
}
float sdPennant(vec2 p){
  float flag = sdEquiTriangle(rot(-1.5708) * (p - vec2(-0.04,0.18)) * 0.9, 0.5);
  return min(flag, sdBox(p - vec2(-0.34,0.0), vec2(0.03,0.46)));
}
float sdHourglass(vec2 p){
  float t = sdEquiTriangle(vec2(p.x, -p.y + 0.28) * 1.0, 0.42);
  float b = sdEquiTriangle(vec2(p.x, p.y + 0.28) * 1.0, 0.42);
  return min(t, b);
}
float sdBookmark(vec2 p){
  return max(sdBox(p - vec2(0.0,0.06), vec2(0.22,0.42)), -sdEquiTriangle(vec2(p.x, p.y + 0.36) * 1.4, 0.26));
}
float sdPinwheel(vec2 p){
  float d = 1e3;
  for (int i = 0; i < 4; i++){
    vec2 q = rot(float(i) * 1.5708) * p;
    d = min(d, sdEquiTriangle((q - vec2(0.2,0.1)) * 1.3 * rot(0.6), 0.3));
  }
  return min(d, sdCircle(p, 0.08));
}

float shapeSDF(vec2 p, float t){
  if (uShape==0){ float a=atan(p.y,p.x); return length(p) - 0.5*(1.0+0.13*sin(a*6.0+t*1.5)); }
  if (uShape==1) return sdStar5(p, 0.5, 0.42);
  if (uShape==2) return sdHeart(p*1.5)*0.66;
  if (uShape==3) return sdCircle(p, 0.5);
  if (uShape==4) return sdBox(p, vec2(0.42));
  if (uShape==5){ float a=atan(p.y,p.x); return length(p) - (0.34+0.18*abs(sin(a*2.5))); } // flower
  // ---- new single shapes ----
  if (uShape==6) return sdEquiTriangle(p, 0.5);
  if (uShape==7) return sdRhombus(p, vec2(0.46,0.6));            // diamond
  if (uShape==8) return sdNGon(p, 6.0, 0.46);                    // hexagon
  if (uShape==9) return sdNGon(p, 5.0, 0.48);                    // pentagon
  if (uShape==100) return sdNGon(p, 8.0, 0.46);                  // octagon
  if (uShape==101) return sdMoon(rot(-0.5)*p, 0.42, 0.5, 0.42);  // crescent moon
  if (uShape==102) return sdLightning(p);                        // lightning bolt
  if (uShape==103) return sdTeardrop(p);                         // teardrop
  if (uShape==104) return sdGear(p, t);                          // gear
  if (uShape==105) return sdPlusShape(p, 0.13, 0.46);            // cross / plus
  if (uShape==106) return sdArrow(p);                            // arrow
  if (uShape==107) return sdSpiral(p);                           // spiral
  if (uShape==108) return sdRing(p, 0.4, 0.1);                   // ring / donut
  if (uShape==109) return sdEgg(p);                              // egg
  if (uShape==110) return sdShield(p);                           // shield
  if (uShape==111) return sdLeaf(p);                             // leaf
  if (uShape==112) return sdCloud(p);                            // cloud
  if (uShape==113) return sdFlame(p);                            // flame
  if (uShape==114) return sdMusicNote(p);                        // music note
  if (uShape==115) return sdSpeechBubble(p);                     // speech bubble
  if (uShape==116) return sdGem(p);                              // gem / crystal
  if (uShape==117) return sdSunRays(p, t);                       // sun with rays
  if (uShape==118) return sdSnowflake(p);                        // snowflake
  if (uShape==119) return sdCatFace(p);                          // cat face
  if (uShape==120) return sdStarN(p, 0.5, 4.0, 2.3);          // 4-point sparkle
  if (uShape==121) return sdStarN(p, 0.5, 6.0, 3.0);          // 6-point star
  if (uShape==122) return sdStarN(p, 0.5, 8.0, 3.2);          // 8-point star
  if (uShape==123) return sdHexagram2(p);                     // hexagram
  if (uShape==124) return sdCrown(p);                         // crown
  if (uShape==125) return sdButterfly(p);                     // butterfly
  if (uShape==126) return sdFlowerN(p, 6.0);                  // 6-petal flower
  if (uShape==127) return sdFlowerN(p, 8.0);                  // 8-petal flower
  if (uShape==128) return sdApple(p);                         // apple
  if (uShape==129) return sdGhost(p);                         // ghost
  if (uShape==130) return sdBalloon(p);                       // balloon
  if (uShape==131) return sdPlanet(p);                        // ringed planet
  if (uShape==132) return sdComet(p);                         // comet
  if (uShape==133) return sdMushroom(p);                      // mushroom
  if (uShape==134) return sdBell(p);                          // bell
  if (uShape==135) return sdPaw(p);                           // paw print
  if (uShape==136) return sdClover(p);                        // clover
  if (uShape==137) return sdSpade(p);                         // spade
  if (uShape==138) return sdClub(p);                          // club
  if (uShape==139) return sdInfinity(p);                      // infinity
  if (uShape==140) return sdEyeShape(p);                      // eye
  if (uShape==141) return sdStarN(p, 0.5, 12.0, 2.6);         // starburst
  if (uShape==142) return sdKite(p);                          // kite
  if (uShape==143) return sdHouse(p);                         // house
  if (uShape==144) return sdTree(p);                          // tree
  if (uShape==145) return sdMountain(p);                      // mountains
  if (uShape==146) return sdLightbulb(p);                     // lightbulb
  if (uShape==147) return sdRocket(p);                        // rocket
  if (uShape==148) return sdIceCream(p);                      // ice cream
  if (uShape==149) return sdPizza(p);                         // pizza slice
  if (uShape==150) return sdUmbrella(p);                      // umbrella
  if (uShape==151) return sdSnowman(p);                       // snowman
  if (uShape==152) return sdCrescentStar(p);                  // crescent + star
  if (uShape==153) return sdDiamondRing(p);                   // diamond ring
  if (uShape==154) return sdAnchor(p);                        // anchor
  if (uShape==155) return sdBone(p);                          // bone
  if (uShape==156) return sdTooth(p);                         // tooth
  if (uShape==157) return sdFish(p);                          // fish
  if (uShape==158) return sdBird(p);                          // bird
  if (uShape==159) return sdTrophy(p);                        // trophy
  if (uShape==160) return sdLatinCross(p);                    // cross
  if (uShape==161) return sdLollipop(p);                      // lollipop
  if (uShape==162) return sdCactus(p);                        // cactus
  if (uShape==163) return sdMug(p);                           // mug
  if (uShape==164) return sdBowtie(p);                        // bowtie
  if (uShape==165) return sdGiftBox(p);                       // gift box
  if (uShape==166) return sdPennant(p);                       // pennant
  if (uShape==167) return sdHourglass(p);                     // hourglass
  if (uShape==168) return sdBookmark(p);                      // bookmark
  if (uShape==169) return sdPinwheel(p);                      // pinwheel
  return sdCircle(p, 0.5);
}

void main(){
  float ar = iResolution.x / iResolution.y;

  // ---- curated full-frame scenes (prompt-driven) ---- (ids 10..99; single shapes use 0..9 and 100+)
  if (uShape >= 10 && uShape < 100) {
    vec2 s = vUv;
    vec3 col = vec3(0.0);

    if (uShape == 20) {           // COMPOSED SCENE (any prompt)
      // background
      if (uSceneBgMode == 2) {                    // space
        col = mix(uSceneBgBot, uSceneBgTop, s.y);
        vec2 g = floor(s * vec2(120.0*ar, 120.0));
        col += step(0.985, hash(g)) * vec3(0.9) * (0.5 + 0.5*sin(uTime*3.0 + hash(g)*30.0));
      } else if (uSceneBgMode == 3) {             // underwater
        col = mix(uSceneBgBot, uSceneBgTop, s.y);
        col += vec3(0.0,0.14,0.18) * max(0.0, sin(s.x*18.0 + uTime + sin(s.y*14.0+uTime))) * 0.3;
      } else if (uSceneBgMode == 1) {             // sky + ground
        col = mix(uSceneBgBot, uSceneBgTop, s.y);
        if (s.y < 0.26) col = mix(uSceneGround*0.6, uSceneGround, s.y/0.26);
      } else {                                    // gradient
        col = mix(uSceneBgBot, uSceneBgTop, s.y);
      }
      // particle system
      if (uSceneParticle > 0) {
        int N = int(40.0 + uSceneDensity*80.0);
        for (int i=0;i<120;i++){
          if (i >= N) break;
          float fi = float(i);
          float sx = hash(vec2(fi,1.0)), sy = hash(vec2(fi,2.0));
          float tt = uTime*(0.2 + sx*0.5) + uBeat*0.3;
          vec2 pp;
          if (uSceneParticle==1) pp = vec2(sx, fract(sy - tt*(0.4+uBass*0.8)));
          else if (uSceneParticle==2) pp = vec2(sx, fract(sy + tt*(0.3+uBass*0.8)));
          else if (uSceneParticle==3) pp = vec2(fract(sx + sin(tt+fi)*0.12 + tt*0.1), fract(sy - tt*0.2));
          else if (uSceneParticle==4) { float ph=fract(tt*0.5+sx); float a=sy*6.2831; pp=vec2(0.5)+vec2(cos(a),sin(a))*ph*0.62; }
          else if (uSceneParticle==6) { float a=tt*1.2+fi; pp=vec2(0.5)+vec2(cos(a),sin(a))*(0.12+sx*0.32); }
          else pp = vec2(sx, sy);            // twinkle
          float sz = (0.005 + sx*0.007) * (1.0 + uBeat*1.1);
          float a;
          if (uSceneParticleShape==3) a = smoothstep(sz,0.0, abs((s.x-pp.x)*ar)) * smoothstep(0.06,0.0, abs(s.y-pp.y)-0.02);
          else if (uSceneParticleShape==2) { vec2 q=abs((s-pp)*vec2(ar,1.0))-sz; a = 1.0-step(0.0,max(q.x,q.y)); }
          else if (uSceneParticleShape==1) { a = smoothstep(sz*1.6,0.0, subjSDF((s-pp)*vec2(ar,1.0)/(sz*3.0),1)*sz*3.0); }
          else a = smoothstep(sz,0.0, length((s-pp)*vec2(ar,1.0)));
          float tw = (uSceneParticle==5) ? (0.35 + 0.65*sin(uTime*4.0+fi)) : 1.0;
          col = mix(col, uSceneParticleCol, clamp(a,0.0,1.0)*tw);
        }
      }
      // optional centred subject (bounces with bass)
      if (uSceneSubject >= 0) {
        float sc = 0.22 * uZoomFx * (1.0 + uBass*0.75 + 0.05*sin(uTime*2.0));
        vec2 sp = (s - vec2(0.5,0.55)) * vec2(ar,1.0) / sc;
        float d = (uSceneSubject==6) ? (length(sp) - 0.5) : subjSDF(sp, uSceneSubject);
        d *= sc;
        col = mix(col, uSceneSubjectCol, 1.0 - smoothstep(-0.004,0.004,d));
        col = mix(col, uOutline, (1.0-smoothstep(0.012-0.004,0.012+0.004,abs(d))) * step(d, 0.012) * 0.6 * step(0.0,d));
      }

    } else if (uShape == 10) {            // BEACH WAVES
      col = mix(vec3(1.0,0.72,0.42), vec3(0.35,0.55,0.92), s.y);
      float sun = smoothstep(0.135,0.115, length((s-vec2(0.5,0.66))*vec2(ar,1.0)));
      col = mix(col, vec3(1.0,0.92,0.6), sun);
      float horizon = 0.44, w = 0.0;
      for (int i=0;i<4;i++){ float fi=float(i); w += sin(s.x*(7.0+fi*7.0)+uTime*(1.0+fi*0.6)+fi)*(0.008+uBass*0.05)/(fi+1.0); }
      float line = horizon + w;
      if (s.y < line){
        vec3 sea = mix(vec3(0.02,0.16,0.3), vec3(0.06,0.42,0.55), s.y/line);
        sea += vec3(0.1,0.2,0.25)*max(0.0,sin(s.x*44.0-uTime*2.5))*uBeat*0.5;
        col = sea;
      }
      col = mix(col, vec3(1.0), smoothstep(0.006,0.0,abs(s.y-line))*0.7);

    } else if (uShape == 11) {     // NIGHT HIGHWAY
      col = mix(vec3(0.03,0.03,0.09), vec3(0.12,0.06,0.22), s.y);
      col += step(0.996, hash(floor(s*vec2(220.0,160.0))))*step(0.55,s.y)*vec3(0.7);
      float horizon = 0.55;
      if (s.y < horizon){
        float t = (horizon - s.y)/horizon;
        float roadW = mix(0.02, 0.6, t);
        float cx = s.x-0.5;
        if (abs(cx) < roadW){
          col = vec3(0.06);
          float dash = step(0.55, fract(t*7.0 - uTime*3.0))*step(abs(cx), roadW*0.03);
          col = mix(col, vec3(0.95,0.85,0.35), dash);
        }
        for (int i=0;i<6;i++){ float fi=float(i);
          float ph = fract(uTime*(0.13+fi*0.045)+fi*0.17);
          float ly = horizon - ph*horizon;
          float lW = mix(0.02,0.6,ph);
          float lane = (hash(vec2(fi,3.0))-0.5)*lW*1.2;
          float lw = mix(0.003,0.02,ph);
          float d = length((s-vec2(0.5+lane, ly))*vec2(ar,1.0));
          vec3 lc = fi < 3.0 ? vec3(1.0,0.12,0.05) : vec3(1.0,0.95,0.8);
          col += lc*smoothstep(lw,0.0,d)*(0.7+uBeat);
        }
      }

    } else if (uShape == 12) {     // RAINY CITY
      col = mix(vec3(0.05,0.06,0.1), vec3(0.1,0.11,0.17), s.y);
      float bh = 0.18 + 0.34*hash(vec2(floor(s.x*15.0),1.0));
      if (s.y < bh){
        col = vec3(0.02,0.025,0.05);
        float win = step(0.62, fract(s.x*55.0))*step(0.6, fract(s.y*42.0));
        col += win*vec3(0.95,0.8,0.4)*0.45;
      }
      float r = 0.0;
      for (int i=0;i<3;i++){ float fi=float(i);
        float colx = floor(s.x*(45.0+fi*22.0));
        float sx = fract(s.x*(45.0+fi*22.0));
        float drop = fract(s.y*7.0 + uTime*(6.0+uBass*4.0) + hash(vec2(colx,fi))*3.0);
        r += smoothstep(0.0,0.04,drop)*smoothstep(0.12,0.04,drop)*step(0.4,sx)*step(sx,0.55);
      }
      col += vec3(0.6,0.7,0.95)*r*0.6;

    } else if (uShape == 13) {      // RUNNERS (people)
      col = mix(vec3(0.95,0.5,0.3), vec3(0.45,0.62,0.92), s.y);
      float sun = smoothstep(0.12,0.1, length((s-vec2(0.5,0.55))*vec2(ar,1.0)));
      col = mix(col, vec3(1.0,0.85,0.5), sun);
      if (s.y < 0.18) col = vec3(0.13,0.1,0.09);
      float fig = 0.0;
      for (int i=0;i<6;i++){ float fi=float(i);
        float x = fract(fi*0.166 + uTime*(0.12+uBeat*0.12));
        float bob = abs(sin(uTime*7.0 + fi*1.3))*0.025;
        vec2 p = (s - vec2(x, 0.22+bob))*vec2(ar,1.0);
        float body = smoothstep(0.05,0.04, length(p*vec2(1.8,1.0)));
        float head = smoothstep(0.03,0.022, length(p-vec2(0.0,0.07)));
        float legs = smoothstep(0.013,0.0, abs(p.x - sin(uTime*9.0+fi)*0.03))*step(p.y,-0.02)*step(-0.1,p.y);
        fig = max(fig, max(max(body,head), legs));
      }
      col = mix(col, vec3(0.05,0.05,0.08), fig);

    } else if (uShape == 14) {      // STARFIELD / SPACE
      col = mix(vec3(0.02,0.01,0.08), vec3(0.08,0.04,0.18), s.y);
      // nebula glow
      col += vec3(0.18,0.05,0.22) * max(0.0, sin(s.x*4.0+uTime*0.2)*sin(s.y*3.0)) * 0.4;
      vec2 g = floor(s * vec2(160.0*ar, 160.0));
      float st = step(0.978, hash(g));
      col += st * vec3(0.95,0.97,1.0) * (0.4 + 0.6*sin(uTime*3.0 + hash(g)*40.0)) * (1.0 + uBeat);
      // a few bright twinkles react to treble
      vec2 g2 = floor(s * vec2(48.0*ar, 48.0));
      col += step(0.992, hash(g2)) * vec3(0.7,0.85,1.0) * uTreble * 2.0;

    } else if (uShape == 15) {      // CITY SKYLINE NIGHT
      col = mix(vec3(0.04,0.03,0.12), vec3(0.22,0.1,0.28), s.y);
      // moon
      col = mix(col, vec3(1.0,0.95,0.8), smoothstep(0.07,0.06, length((s-vec2(0.78,0.78))*vec2(ar,1.0))));
      for (int i=0;i<7;i++){ float fi=float(i);
        float bx = fi/7.0;
        float bw = 0.5/7.0;
        float bh = 0.2 + 0.4*hash(vec2(fi,7.0));
        if (s.x > bx && s.x < bx+bw && s.y < bh){
          col = vec3(0.03,0.02,0.06);
          float win = step(0.6, fract(s.x*70.0))*step(0.55, fract(s.y*50.0));
          col += win*vec3(1.0,0.85,0.45)*(0.4+0.4*uBeat);
        }
      }

    } else if (uShape == 16) {      // MOUNTAINS
      col = mix(vec3(0.95,0.7,0.5), vec3(0.4,0.6,0.92), s.y);
      col = mix(col, vec3(1.0,0.9,0.6), smoothstep(0.06,0.05, length((s-vec2(0.7,0.78))*vec2(ar,1.0))));
      for (int i=0;i<3;i++){ float fi=float(i);
        float base = 0.5 - fi*0.1;
        float peak = base + 0.22*abs(sin(s.x*(3.0+fi*2.0)+fi*2.0));
        if (s.y < peak){
          vec3 m = mix(vec3(0.25,0.22,0.34), vec3(0.4,0.4,0.5), fi/3.0);
          col = m;
          if (s.y > peak-0.05) col = vec3(0.95);   // snow caps
        }
      }

    } else if (uShape == 17) {      // SUNSET OVER WATER
      col = mix(vec3(1.0,0.4,0.3), vec3(0.95,0.75,0.35), s.y);
      float horizon = 0.45;
      float sund = length((s-vec2(0.5,horizon+0.12))*vec2(ar,1.0));
      col = mix(col, vec3(1.0,0.85,0.4), smoothstep(0.18,0.16, sund));
      if (s.y < horizon){
        vec3 sea = mix(vec3(0.4,0.15,0.3), vec3(1.0,0.6,0.35), s.y/horizon);
        float glint = step(0.5, fract(s.y*30.0 - uTime*1.0)) * step(abs(s.x-0.5), 0.12+0.1*(horizon-s.y));
        sea = mix(sea, vec3(1.0,0.9,0.6), glint*0.6*(0.5+uBeat));
        col = sea;
      }

    } else if (uShape == 18) {      // FOREST
      col = mix(vec3(0.6,0.8,0.7), vec3(0.5,0.75,0.95), s.y);
      if (s.y < 0.2) col = vec3(0.2,0.4,0.18);
      float tree = 0.0;
      for (int i=0;i<8;i++){ float fi=float(i);
        float x = fi/8.0 + 0.06;
        float sway = sin(uTime*1.0+fi)*0.01*(1.0+uBass);
        vec2 p = s - vec2(x+sway, 0.2);
        float trunk = step(abs(p.x), 0.012)*step(0.0,p.y)*step(p.y,0.12);
        float can = smoothstep(0.13,0.11, length((p-vec2(0.0,0.22))*vec2(1.0,1.3)));
        tree = max(tree, max(trunk, can));
      }
      col = mix(col, vec3(0.1,0.32,0.14), tree);

    } else if (uShape == 19) {      // FIREWORKS
      col = mix(vec3(0.02,0.02,0.1), vec3(0.05,0.04,0.16), s.y);
      vec2 g = floor(s * vec2(180.0,180.0));
      col += step(0.992, hash(g)) * vec3(0.6);    // faint stars
      for (int i=0;i<5;i++){ float fi=float(i);
        float ph = fract(uTime*0.4 + fi*0.21);
        vec2 ctr = vec2(hash(vec2(fi,1.0)), 0.45+0.4*hash(vec2(fi,2.0)));
        float rad = ph*(0.25+0.1*hash(vec2(fi,3.0)));
        vec3 fc = 0.5+0.5*cos(vec3(0.0,2.1,4.2)+fi*1.7);
        float spark = 0.0;
        for (int j=0;j<12;j++){ float fj=float(j);
          float a = fj/12.0*6.2831853;
          vec2 pp = ctr + vec2(cos(a),sin(a))*rad*vec2(1.0/ar,1.0);
          spark = max(spark, smoothstep(0.012,0.0, length((s-pp)*vec2(ar,1.0))));
        }
        col += fc * spark * (1.0-ph) * (1.0+uBeat*1.5);
      }

    } else if (uShape == 21) {      // SNOWFALL
      col = mix(vec3(0.4,0.5,0.65), vec3(0.7,0.78,0.9), s.y);
      if (s.y < 0.16) col = vec3(0.85,0.88,0.95);     // snowy ground
      float snow = 0.0;
      for (int i=0;i<60;i++){ float fi=float(i);
        float sx = hash(vec2(fi,1.0));
        float sp = 0.3 + hash(vec2(fi,2.0))*0.5;
        float px = fract(sx + sin(uTime*0.6+fi)*0.04);
        float py = fract(hash(vec2(fi,3.0)) - uTime*sp*(0.12+uBass*0.2));
        float sz = 0.004 + hash(vec2(fi,4.0))*0.006;
        snow = max(snow, smoothstep(sz,0.0, length((s-vec2(px,py))*vec2(ar,1.0))));
      }
      col = mix(col, vec3(1.0), snow);

    } else if (uShape == 22) {      // DESERT DUNES
      col = mix(vec3(1.0,0.8,0.5), vec3(0.55,0.75,0.95), s.y);
      col = mix(col, vec3(1.0,0.95,0.7), smoothstep(0.09,0.08, length((s-vec2(0.3,0.8))*vec2(ar,1.0))));
      for (int i=0;i<4;i++){ float fi=float(i);
        float base = 0.45 - fi*0.11;
        float dune = base + 0.06*sin(s.x*(2.0+fi)+fi*1.7);
        if (s.y < dune){
          col = mix(vec3(0.85,0.62,0.34), vec3(0.7,0.48,0.26), fi/4.0);
          col *= 0.9 + 0.1*sin(s.x*8.0);
        }
      }

    } else if (uShape == 23) {      // AURORA / NORTHERN LIGHTS
      col = mix(vec3(0.02,0.03,0.12), vec3(0.0,0.02,0.06), s.y);
      vec2 g = floor(s * vec2(150.0,150.0));
      col += step(0.985, hash(g)) * vec3(0.8);
      for (int i=0;i<3;i++){ float fi=float(i);
        float band = 0.55 + 0.12*fi + 0.1*sin(s.x*5.0 + uTime*0.8 + fi*2.0);
        float d = abs(s.y - band);
        vec3 ac = mix(vec3(0.1,0.9,0.5), vec3(0.4,0.2,0.95), fi/3.0);
        col += ac * smoothstep(0.14,0.0, d) * (0.4+0.4*uMid) * (0.7+0.3*sin(s.x*8.0+uTime));
      }

    } else if (uShape == 24) {      // UNDERWATER REEF
      col = mix(vec3(0.0,0.18,0.32), vec3(0.0,0.45,0.6), s.y);
      col += vec3(0.0,0.15,0.18)*max(0.0,sin(s.x*16.0+uTime+sin(s.y*12.0+uTime)))*0.3;
      if (s.y < 0.2){ col = vec3(0.1,0.3,0.28); }
      // coral
      for (int i=0;i<6;i++){ float fi=float(i);
        float x = fi/6.0+0.08;
        vec2 p = s - vec2(x,0.18);
        float c = smoothstep(0.06,0.04, length(p*vec2(1.6,0.7)));
        col = mix(col, 0.5+0.5*cos(vec3(0.0,2.0,4.0)+fi), c);
      }
      // bubbles rising
      float bub = 0.0;
      for (int i=0;i<14;i++){ float fi=float(i);
        float bx = hash(vec2(fi,5.0));
        float by = fract(hash(vec2(fi,6.0)) + uTime*(0.15+hash(vec2(fi,7.0))*0.2));
        bub = max(bub, smoothstep(0.008,0.0, length((s-vec2(bx,by))*vec2(ar,1.0))-0.004));
      }
      col = mix(col, vec3(0.7,0.9,1.0), bub*0.5);

    } else if (uShape == 25) {      // EQUALIZER BARS
      col = mix(vec3(0.05,0.04,0.1), vec3(0.12,0.06,0.2), s.y);
      const float NB = 16.0;
      float bi = floor(s.x*NB);
      float bx = fract(s.x*NB);
      float band = (bi < NB/3.0) ? uBass : (bi < 2.0*NB/3.0 ? uMid : uTreble);
      float h = 0.1 + band*0.8 + 0.1*sin(uTime*4.0 + bi);
      if (s.y < h && bx > 0.1 && bx < 0.9){
        vec3 bc = 0.5+0.5*cos(vec3(0.0,2.0,4.0)+bi*0.4);
        col = mix(bc*0.5, bc, s.y/max(h,0.01));
      }

    } else {                        // FERRIS WHEEL / CARNIVAL (id 26)
      col = mix(vec3(0.1,0.05,0.2), vec3(0.3,0.12,0.32), s.y);
      vec2 g = floor(s * vec2(160.0,160.0));
      col += step(0.99, hash(g))*vec3(0.7);
      vec2 c = vec2(0.5,0.55);
      float wheelR = 0.32;
      vec2 pw = (s-c)*vec2(ar,1.0);
      float rim = abs(length(pw)-wheelR)-0.006;
      col = mix(col, vec3(0.9,0.9,1.0), smoothstep(0.006,0.0,rim));
      float rotA = uTime*0.4 + uBeat*0.2;
      for (int i=0;i<10;i++){ float fi=float(i);
        float a = fi/10.0*6.2831853 + rotA;
        vec2 cap = vec2(cos(a),sin(a))*wheelR;
        // spoke
        float spoke = sdSegment(pw, vec2(0.0), cap)-0.004;
        col = mix(col, vec3(0.6,0.6,0.7), smoothstep(0.004,0.0,spoke));
        // cabin
        float cab = length(pw-cap)-0.03;
        vec3 cc = 0.5+0.5*cos(vec3(0.0,2.0,4.0)+fi);
        col = mix(col, cc, smoothstep(0.03,0.025,cab)*(0.7+0.3*uBeat));
      }
      // hub
      col = mix(col, vec3(1.0,0.9,0.4), smoothstep(0.03,0.02,length(pw)));
      if (s.y < 0.12) col = vec3(0.06,0.03,0.1);
    }

    col *= 0.82 + uLevel*0.4;
    gl_FragColor = vec4(col, 1.0);
    return;
  }

  vec2 uv = vUv - 0.5;
  uv.x *= ar;
  float aa = 2.0 / iResolution.y;

  // bouncing + spinning main shape. Lower base scale frames the WHOLE shape with
  // margin by default (0.55 cropped it); the bass/beat pump is gentler so a hit
  // zooms in a touch instead of slamming the shape past the edges.
  float scale = 0.40 * uZoomFx * (1.0 + uBass*0.35 + 0.05*sin(uTime*2.2) + uBeat*0.15);
  vec2 p = rot(uSpin*uTime + uBeat*0.3) * uv / scale;
  float d = shapeSDF(p, uTime) * scale;

  float fill = 1.0 - smoothstep(-aa, aa, d);
  float shapeA = 1.0 - smoothstep(uOutlineW - aa, uOutlineW + aa, d);

  // flat fill colour cycles gently with the music
  vec3 fillCol = mix(uColA, uColB, 0.5 + 0.5*sin(uTime*0.6 + uTreble*3.0));
  fillCol = mix(fillCol, uColC, clamp(uMid*0.7, 0.0, 1.0));
  // soft top sheen for a cartoon look
  fillCol *= 0.85 + 0.25 * smoothstep(0.4, -0.4, p.y);

  vec3 col = mix(uOutline, fillCol, fill);
  float alpha = shapeA;

  // orbiting satellite dots
  int n = int(uSatellites + 0.5);
  for (int i=0;i<8;i++){
    if (i >= n) break;
    float fa = float(i)/max(float(n),1.0)*6.2831853 + uTime*(0.5 + uSpin*0.4);
    vec2 sp = vec2(cos(fa), sin(fa)) * (0.62 + uTreble*0.16);
    float rad = 0.05 + uBeat*0.08;
    float sd = length(uv - sp) - rad;
    float sA = 1.0 - smoothstep(uOutlineW*0.7 - aa, uOutlineW*0.7 + aa, sd);
    float sFill = 1.0 - smoothstep(-aa, aa, sd);
    vec3 satCol = mix(uOutline, uColC, sFill);
    col = mix(col, satCol, sA);
    alpha = max(alpha, sA);
  }

  col *= 0.8 + uLevel*0.4;
  gl_FragColor = vec4(col, alpha);
}
`;
