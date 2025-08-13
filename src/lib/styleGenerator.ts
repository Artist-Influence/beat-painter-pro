export async function generateStyleTexture(styles: string[], seed: number = 0): Promise<{ textureUrl: string; colors: string[] }>
{
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { textureUrl: "", colors: [] };

  // Deterministic hues and gradient based on styles + seed
  const styleHues = styles.map((s, i) => (Math.abs(hashCode(s)) + i * 47 + seed * 29) % 360);
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  styleHues.forEach((h, i) => {
    const stop = i / Math.max(1, styleHues.length - 1);
    gradient.addColorStop(stop, `hsl(${h} 70% 55%)`);
  });

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  // Seeded noise for texture variation
  const rng = mulberry32(hashArray([...styles, String(seed)]));
  const imgData = ctx.getImageData(0, 0, size, size);
  for (let i = 0; i < imgData.data.length; i += 4) {
    const n = (rng() - 0.5) * 10;
    imgData.data[i] = clamp(imgData.data[i] + n, 0, 255);
    imgData.data[i + 1] = clamp(imgData.data[i + 1] + n, 0, 255);
    imgData.data[i + 2] = clamp(imgData.data[i + 2] + n, 0, 255);
  }
  ctx.putImageData(imgData, 0, 0);

  // Procedural result as default
  let textureUrl = canvas.toDataURL("image/png");
  const colors = getStyleColors(styles);

  // Optional: try Supabase Edge Function for Hugging Face image generation (if deployed)
  const complex = ["Organic Flow", "Marble Veins", "Aurora Borealis"]; 
  if (styles.some((s) => complex.includes(s))) {
    const prompt = `abstract ${styles.join(' ')} texture, seamless pattern, no objects, pure abstract art, variation ${seed}`;
    const negativePrompt = "photo, realistic, person, face, landscape, object, text, figurative";
    try {
      const res = await fetch("/functions/v1/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, negativePrompt, seed }),
      });
      if (res.ok) {
        const data = await res.json();
        if (typeof data.image === "string" && data.image.startsWith("data:image")) {
          textureUrl = data.image;
        }
      }
    } catch (e) {
      console.warn("HF generation unavailable, using procedural texture.", e);
    }
  }

  return { textureUrl, colors };
}

export function getStyleColors(styles: string[]): string[] {
  const styleHues = styles.map((s, i) => (Math.abs(hashCode(s)) + i * 47) % 360);
  return styleHues.slice(0, 3).map((h, idx) => `hsl(${h} 70% ${idx === 0 ? 60 : idx === 1 ? 50 : 70}%)`);
}

function hashCode(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function hashArray(arr: string[]) {
  return arr.reduce((acc, s) => acc + '-' + s, '');
}

function mulberry32(aStr: string) {
  let a = 0;
  for (let i = 0; i < aStr.length; i++) a = (a + aStr.charCodeAt(i)) | 0;
  return function() {
    let t = (a += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}
