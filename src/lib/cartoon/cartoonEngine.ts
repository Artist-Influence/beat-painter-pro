/**
 * 2D cartoon shape engine. Flat, bold, sticker-style audio-reactive shapes
 * rendered by a full-screen SDF shader (see cartoonShader.ts). Output is a
 * transparent cutout, so these double as standalone overlays to layer into
 * a video, or full-frame on a chosen background.
 */
export const CARTOON_SHAPES = ['blob', 'star', 'heart', 'circle', 'square', 'flower'] as const;
export type CartoonShape = typeof CARTOON_SHAPES[number];

// Single-shape metadata keyed by shader shape id. ids 0-5 are the originals;
// 6-9 and 100+ are the new SDF shapes added to cartoonShader.ts. Kept as an id
// map (not a dense array) because the shader's single-shape ids are sparse
// (10-99 are reserved for scenes / the composed-scene engine).
export const SHAPE_META: { id: number; name: string; emoji: string }[] = [
  { id: 0, name: 'Blob', emoji: '🫠' },
  { id: 1, name: 'Star', emoji: '⭐' },
  { id: 2, name: 'Heart', emoji: '❤️' },
  { id: 3, name: 'Circle', emoji: '🔵' },
  { id: 4, name: 'Square', emoji: '🟧' },
  { id: 5, name: 'Flower', emoji: '🌸' },
  { id: 6, name: 'Triangle', emoji: '🔺' },
  { id: 7, name: 'Diamond', emoji: '💎' },
  { id: 8, name: 'Hexagon', emoji: '⬡' },
  { id: 9, name: 'Pentagon', emoji: '⬠' },
  { id: 100, name: 'Octagon', emoji: '🛑' },
  { id: 101, name: 'Crescent Moon', emoji: '🌙' },
  { id: 102, name: 'Lightning Bolt', emoji: '⚡' },
  { id: 103, name: 'Teardrop', emoji: '💧' },
  { id: 104, name: 'Gear', emoji: '⚙️' },
  { id: 105, name: 'Cross', emoji: '➕' },
  { id: 106, name: 'Arrow', emoji: '➡️' },
  { id: 107, name: 'Spiral', emoji: '🌀' },
  { id: 108, name: 'Ring', emoji: '⭕' },
  { id: 109, name: 'Egg', emoji: '🥚' },
  { id: 110, name: 'Shield', emoji: '🛡️' },
  { id: 111, name: 'Leaf', emoji: '🍃' },
  { id: 112, name: 'Cloud', emoji: '☁️' },
  { id: 113, name: 'Flame', emoji: '🔥' },
  { id: 114, name: 'Music Note', emoji: '🎵' },
  { id: 115, name: 'Speech Bubble', emoji: '💬' },
  { id: 116, name: 'Gem', emoji: '💠' },
  { id: 117, name: 'Sun', emoji: '☀️' },
  { id: 118, name: 'Snowflake', emoji: '❄️' },
  { id: 119, name: 'Cat Face', emoji: '🐱' },
  { id: 120, name: 'Sparkle', emoji: '✨' },
  { id: 121, name: '6-Point Star', emoji: '🔯' },
  { id: 122, name: '8-Point Star', emoji: '🎇' },
  { id: 123, name: 'Hexagram', emoji: '✡️' },
  { id: 124, name: 'Crown', emoji: '👑' },
  { id: 125, name: 'Butterfly', emoji: '🦋' },
  { id: 126, name: 'Flower 6', emoji: '🌼' },
  { id: 127, name: 'Flower 8', emoji: '🌻' },
  { id: 128, name: 'Apple', emoji: '🍎' },
  { id: 129, name: 'Ghost', emoji: '👻' },
  { id: 130, name: 'Balloon', emoji: '🎈' },
  { id: 131, name: 'Ringed Planet', emoji: '🪐' },
  { id: 132, name: 'Comet', emoji: '☄️' },
  { id: 133, name: 'Mushroom', emoji: '🍄' },
  { id: 134, name: 'Bell', emoji: '🔔' },
  { id: 135, name: 'Paw Print', emoji: '🐾' },
  { id: 136, name: 'Clover', emoji: '🍀' },
  { id: 137, name: 'Spade', emoji: '♠️' },
  { id: 138, name: 'Club', emoji: '♣️' },
  { id: 139, name: 'Infinity', emoji: '♾️' },
  { id: 140, name: 'Eye', emoji: '👁️' },
  { id: 141, name: 'Starburst', emoji: '💥' },
  { id: 142, name: 'Kite', emoji: '🪁' },
  { id: 143, name: 'House', emoji: '🏠' },
  { id: 144, name: 'Tree', emoji: '🌲' },
  { id: 145, name: 'Mountains', emoji: '⛰️' },
  { id: 146, name: 'Lightbulb', emoji: '💡' },
  { id: 147, name: 'Rocket', emoji: '🚀' },
  { id: 148, name: 'Ice Cream', emoji: '🍦' },
  { id: 149, name: 'Pizza', emoji: '🍕' },
  { id: 150, name: 'Umbrella', emoji: '☂️' },
  { id: 151, name: 'Snowman', emoji: '⛄' },
  { id: 152, name: 'Crescent Star', emoji: '🌙' },
  { id: 153, name: 'Diamond Ring', emoji: '💍' },
  { id: 154, name: 'Anchor', emoji: '⚓' },
  { id: 155, name: 'Bone', emoji: '🦴' },
  { id: 156, name: 'Tooth', emoji: '🦷' },
  { id: 157, name: 'Fish', emoji: '🐟' },
  { id: 158, name: 'Bird', emoji: '🐦' },
  { id: 159, name: 'Trophy', emoji: '🏆' },
  { id: 160, name: 'Cross', emoji: '✝️' },
  { id: 161, name: 'Lollipop', emoji: '🍭' },
  { id: 162, name: 'Cactus', emoji: '🌵' },
  { id: 163, name: 'Mug', emoji: '☕' },
  { id: 164, name: 'Bowtie', emoji: '🎀' },
  { id: 165, name: 'Gift Box', emoji: '🎁' },
  { id: 166, name: 'Pennant', emoji: '🚩' },
  { id: 167, name: 'Hourglass', emoji: '⏳' },
  { id: 168, name: 'Bookmark', emoji: '🔖' },
  { id: 169, name: 'Pinwheel', emoji: '🌬️' },
];
// pool of single-shape ids eligible for random rolls
export const CARTOON_SHAPE_IDS: number[] = SHAPE_META.map((s) => s.id);

// Curated full-frame SCENES (shader indices 10+). These render recognizable
// animated 2D scenes so a prompt like "waves on the beach" actually looks like
// a beach. Expandable; unknown prompts fall back to the abstract shapes above.
export const SCENES: { id: number; name: string; emoji: string; k: RegExp }[] = [
  { id: 10, name: 'Beach Waves', emoji: '🌊', k: /beach|\bwaves?\b|\bsea\b|ocean|surf|seaside|coast|tide/ },
  { id: 11, name: 'Night Highway', emoji: '🚗', k: /highway|freeway|\broad\b|traffic|driving|\bcars?\b/ },
  { id: 15, name: 'City Skyline Night', emoji: '🌃', k: /night city|city night|skyline at night|night skyline|cityscape night|city at night/ },
  { id: 12, name: 'Rainy City', emoji: '🌆', k: /rainy city|\bcity\b|downtown|urban|skyline|skyscraper|metropolis|cityscape/ },
  { id: 13, name: 'Runners', emoji: '🏃', k: /runner|jogg?|marathon|sprint|people running|crowd running|\brunning\b/ },
  { id: 14, name: 'Starfield', emoji: '🌌', k: /\bspace\b|galaxy|cosmos|universe|starfield|star field|\bstars\b|night sky|nebula|\bcosmic\b|outer space/ },
  { id: 16, name: 'Mountains', emoji: '🏔️', k: /mountains?|\balps\b|peaks?|\bsummit\b|\branges?\b|himalaya/ },
  { id: 17, name: 'Sunset Over Water', emoji: '🌅', k: /sunset|sundown|dusk|golden hour|sunrise|sun over (the )?(water|sea|ocean)/ },
  { id: 18, name: 'Forest', emoji: '🌲', k: /forest|\bwoods\b|jungle|\btrees?\b|woodland|rainforest/ },
  { id: 19, name: 'Fireworks', emoji: '🎆', k: /firework|fireworks|pyrotechnic|\bnew year\b|celebration sky/ },
  { id: 21, name: 'Snowfall', emoji: '🌨️', k: /snowfall|snowing|snowstorm|\bsnow\b|blizzard|flurr/ },
  { id: 22, name: 'Desert Dunes', emoji: '🏜️', k: /desert|\bdunes?\b|\bsahara\b|sandstorm|\bsands\b/ },
  { id: 23, name: 'Aurora', emoji: '🌠', k: /aurora|northern lights|borealis/ },
  { id: 24, name: 'Underwater Reef', emoji: '🐠', k: /underwater|under the sea|deep sea|coral|\breef\b|aquarium|submarine/ },
  { id: 25, name: 'Equalizer Bars', emoji: '🎚️', k: /equali[sz]er|\beq\b|spectrum|\bbars\b|audio bars|sound bars|visuali[sz]er bars/ },
  { id: 26, name: 'Ferris Wheel', emoji: '🎡', k: /ferris wheel|carnival|fairground|amusement park|funfair|\bfair\b/ },
];

export function cartoonShapeName(shape: number): string {
  if (shape === 20) return 'Scene';
  const scene = SCENES.find((s) => s.id === shape);
  if (scene) return scene.name;
  return SHAPE_META.find((s) => s.id === shape)?.name ?? 'shape';
}
export function cartoonEmoji(shape: number): string {
  const scene = SCENES.find((s) => s.id === shape);
  if (scene) return scene.emoji;
  return SHAPE_META.find((s) => s.id === shape)?.emoji ?? '✨';
}

// Composed-scene parameters (shader uShape === 20). Lets ANY prompt build a
// themed scene from a background + particle system + optional centred subject.
export interface SceneParams {
  bgMode: number;        // 0 gradient, 1 sky+ground, 2 space, 3 underwater
  bgTop: string; bgBot: string; ground: string;
  particle: number;      // 0 none,1 fall,2 rise,3 drift,4 burst,5 twinkle,6 swirl
  particleShape: number; // 0 dot,1 star,2 square,3 streak
  particleCol: string;
  density: number;       // 0.2-1
  subject: number;       // -1 none, 0-5 icon (CARTOON_SHAPES), 6 sun
  subjectCol: string;
}

export interface Cartoon2DConfig {
  id: string;
  name: string;
  emoji: string;
  shape: number;        // index into CARTOON_SHAPES, scene id (10-13), or 20 = composed
  palette: [string, string, string]; // fill colors (hex)
  outline: string;      // outline color (hex)
  outlineWidth: number; // ~0.02-0.06
  spin: number;         // base spin speed
  satellites: number;   // 0-8 orbiting dots
  scene?: SceneParams;  // present when shape === 20
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
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const hslHex = (h: number, s: number, l: number) => {
  h = ((h % 360) + 360) % 360 / 360; s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h * 12) % 12;
    const c = l - a * Math.max(-1, Math.min(Math.min(k - 3, 9 - k), 1));
    return Math.round(255 * c).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
};

// prompt keyword → cartoon shape index
// Single-shape prompts (specific, whole-word). Anything broader composes a scene.
const SHAPE_MAP: { k: RegExp; i: number }[] = [
  { k: /\bheart\b|valentine/, i: 2 },
  // more specific star-ish first
  { k: /\bsnowflake\b|\bsnow flake\b/, i: 118 },
  { k: /\bstar\b|starfish|asterisk/, i: 1 },
  { k: /\bflower\b|\brose\b|daisy|tulip/, i: 5 },
  { k: /\bblob\b|slime|\bgoo\b|amoeba/, i: 0 },
  { k: /\btriangle\b|\bpyramid\b/, i: 6 },
  { k: /\bdiamond\b|\brhombus\b|\bjewel\b/, i: 7 },
  { k: /\bhexagon\b|\bhex\b|honeycomb/, i: 8 },
  { k: /\bpentagon\b/, i: 9 },
  { k: /\boctagon\b|stop sign/, i: 100 },
  { k: /\bcrescent\b|\bmoon\b|\blunar\b/, i: 101 },
  { k: /\blightning\b|\bbolt\b|thunderbolt|\bthunder\b/, i: 102 },
  { k: /\bteardrop\b|\btear\b|\bdroplet\b|\bdrop\b/, i: 103 },
  { k: /\bgear\b|\bcog\b|cogwheel|\bsprocket\b/, i: 104 },
  { k: /\bcross\b|\bplus\b|\bpluss?ign\b/, i: 105 },
  { k: /\barrow\b|\bpointer\b/, i: 106 },
  { k: /\bspiral\b|\bswirl\b|\bhelix\b/, i: 107 },
  { k: /\bring\b|\bdonut\b|doughnut|\btorus\b/, i: 108 },
  { k: /\begg\b|\boval\b|\bovoid\b/, i: 109 },
  { k: /\bshield\b|\bcrest\b|\bbadge\b/, i: 110 },
  { k: /\bleaf\b|\bleaves\b/, i: 111 },
  { k: /\bcloud\b|\bcloudy\b/, i: 112 },
  { k: /\bflame\b|\bfire\b|\bcampfire\b/, i: 113 },
  { k: /music note|\bnote\b|\bquaver\b|eighth note/, i: 114 },
  { k: /speech bubble|\bspeech\b|chat bubble|\bbubble\b/, i: 115 },
  { k: /\bgem\b|\bcrystal\b|\bgemstone\b/, i: 116 },
  { k: /\bsun\b|\bsunshine\b|\bsunny\b/, i: 117 },
  { k: /\bcat\b|kitten|\bkitty\b|cat face/, i: 119 },
  { k: /\bsquare\b|\bcube\b|\bbox\b/, i: 4 },
  { k: /\bcircle\b|\bball\b|\bdot\b|\bcoin\b/, i: 3 },
];
export function cartoonShapeFromPrompt(prompt: string): number | undefined {
  const p = prompt.toLowerCase();
  for (const s of SCENES) if (s.k.test(p)) return s.id;   // scenes win
  for (const r of SHAPE_MAP) if (r.k.test(p)) return r.i;
  return undefined;
}

export function randomCartoon(seed: number, opts: { shape?: number; hueBase?: number; label?: string } = {}): Cartoon2DConfig {
  const r = rng(seed * 3 + 7);
  const shape = opts.shape ?? CARTOON_SHAPE_IDS[Math.floor(r() * CARTOON_SHAPE_IDS.length)];
  const baseHue = opts.hueBase ?? r() * 360;
  const sat = lerp(72, 95, r());
  const palette: [string, string, string] = [
    hslHex(baseHue, sat, 58),
    hslHex(baseHue + lerp(20, 50, r()), sat, 62),
    hslHex(baseHue + lerp(140, 200, r()), sat, 60),
  ];
  return {
    id: `c_${seed}`,
    name: opts.label ?? cartoonShapeName(shape),
    emoji: cartoonEmoji(shape),
    shape,
    palette,
    outline: '#0c0c12',
    outlineWidth: lerp(0.025, 0.05, r()),
    spin: lerp(-0.5, 0.5, r()),
    satellites: r() < 0.6 ? Math.floor(lerp(3, 8, r())) : 0,
  };
}

/* ---- compositional scene generation: turn ANY prompt into a themed scene ---- */
const COLOR_HUES: { k: RegExp; h: number }[] = [
  { k: /red|blood|ruby|crimson/, h: 0 }, { k: /orange|amber|sunset|autumn|fire|lava/, h: 28 },
  { k: /yellow|gold|sun|sand|desert/, h: 50 }, { k: /lime|grass|forest|jungle|green|emerald|leaf|nature/, h: 120 },
  { k: /teal|mint|aqua/, h: 168 }, { k: /blue|ocean|sea|water|sky|ice|frost|winter/, h: 210 },
  { k: /purple|violet|cosmic|galaxy|space|magic|amethyst/, h: 270 }, { k: /pink|rose|love|valentine|candy/, h: 325 },
  { k: /neon|cyber|electric|rave/, h: 300 },
];
const promptHueLocal = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) { h = (h << 5) - h + s.charCodeAt(i); h |= 0; } return Math.abs(h) % 360; };

function detectHue(p: string): number {
  for (const c of COLOR_HUES) if (c.k.test(p)) return c.h;
  return promptHueLocal(p);
}

export function composeScene(promptRaw: string, seed: number, label?: string): Cartoon2DConfig {
  const r = rng(seed * 5 + 11);
  const p = promptRaw.toLowerCase();
  const hue = detectHue(p);
  const dark = /night|space|dark|deep|cave|shadow|void|cosmos|galaxy/.test(p);

  // background mode
  let bgMode = 0;
  if (/space|galaxy|cosmos|universe|stars?|nebula|night sky/.test(p)) bgMode = 2;
  else if (/underwater|under the sea|deep sea|submarine|reef|fish|aquarium/.test(p)) bgMode = 3;
  else if (/field|forest|desert|mountain|grass|hill|meadow|park|landscape|road|farm|valley|garden/.test(p)) bgMode = 1;

  // particle behaviour
  let particle = 5, particleShape = 0;
  if (/rain|drizzle|downpour|shower/.test(p)) { particle = 1; particleShape = 3; }
  else if (/snow|blizzard|flurr/.test(p)) { particle = 1; particleShape = 0; }
  else if (/confetti|party|celebrat/.test(p)) { particle = 1; particleShape = 2; }
  else if (/leaf|leaves|petal|pollen|feather|ash|dust|float/.test(p)) { particle = 3; particleShape = 2; }
  else if (/bubble|balloon|rise|rising|smoke|ember|lantern/.test(p)) { particle = 2; particleShape = 0; }
  else if (/firework|explos|burst|blast|pop|spark/.test(p)) { particle = 4; particleShape = 1; }
  else if (/fish|bird|swarm|flock|school|tornado|swirl|vortex|storm|flies|fly/.test(p)) { particle = 6; particleShape = 0; }
  else if (/star|glitter|sparkle|firefl|magic|glow/.test(p)) { particle = 5; particleShape = 1; }
  else if (/rain forest|wind|leaves/.test(p)) { particle = 3; particleShape = 2; }
  else if (bgMode === 2) { particle = 5; particleShape = 1; }
  else { particle = r() < 0.5 ? 3 : 2; particleShape = Math.floor(r() * 3); } // generic drift/rise

  // optional centred subject
  let subject = -1;
  if (/sun|sunny|sunshine/.test(p)) subject = 6;
  else if (/heart|love/.test(p)) subject = 2;
  else if (/flower|bloom|rose|daisy/.test(p)) subject = 5;
  else if (/moon|planet|ball|orb|circle|bubble/.test(p)) subject = 3;
  else if (/diamond|gem|crystal/.test(p)) subject = 4;
  else if (/star/.test(p)) subject = 1;

  const sat = 62 + Math.floor(r() * 32);                 // 62-94, varied vibrancy
  const accent = (hue + (r() < 0.5 ? lerp(20, 60, r()) : -lerp(20, 60, r())) + 360) % 360;
  const bgTop = dark ? hslHex(hue, 50 + r() * 25, 12 + r() * 10) : hslHex(hue, 50 + r() * 20, 66 + r() * 12);
  const bgBot = dark ? hslHex(hue, 58 + r() * 20, 5 + r() * 6) : hslHex(hue, 65 + r() * 18, 36 + r() * 12);
  const ground = hslHex(hue, 40 + r() * 20, dark ? 9 + r() * 6 : 22 + r() * 8);
  const particleCol = hslHex(accent, 85 + r() * 12, dark ? 70 + r() * 12 : 56 + r() * 12);
  const subjectCol = hslHex((hue + lerp(10, 40, r())) % 360, sat, 56 + r() * 12);

  return {
    id: `c_${seed}`,
    name: label ?? 'Scene',
    emoji: '🎬',
    shape: 20,
    palette: [hslHex(hue, sat, 58), particleCol, subjectCol],
    outline: '#0c0c12',
    outlineWidth: 0.03,
    spin: 0,
    satellites: 0,
    scene: {
      bgMode, bgTop, bgBot, ground,
      particle, particleShape, particleCol,
      density: 0.4 + r() * 0.5,
      subject, subjectCol,
    },
  };
}

export const CARTOON_PRESETS: Cartoon2DConfig[] = [
  randomCartoon(101, { shape: 1, hueBase: 48, label: 'Star Pop' }),
  randomCartoon(202, { shape: 2, hueBase: 340, label: 'Heart Bounce' }),
  randomCartoon(303, { shape: 0, hueBase: 150, label: 'Slime Blob' }),
  randomCartoon(404, { shape: 5, hueBase: 290, label: 'Flower Spin' }),
].map((c, i) => ({ ...c, id: `FractalCartoon${i}` }));
