export async function generateStyleTexture(styles: string[]): Promise<{ textureUrl: string; colors: string[] }>
{
  // Simple client-side generator: produce a gradient texture and a set of HSL colors
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { textureUrl: "", colors: [] };

  // Map styles to hues for a consistent aesthetic
  const styleHues = styles.map((s, i) => (Math.abs(hashCode(s)) + i * 47) % 360);
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  styleHues.forEach((h, i) => {
    const stop = i / Math.max(1, styleHues.length - 1);
    gradient.addColorStop(stop, `hsl(${h} 70% 55%)`);
  });

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  // Add subtle noise for texture
  const imgData = ctx.getImageData(0, 0, size, size);
  for (let i = 0; i < imgData.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 10; // +- noise
    imgData.data[i] = clamp(imgData.data[i] + n, 0, 255);
    imgData.data[i + 1] = clamp(imgData.data[i + 1] + n, 0, 255);
    imgData.data[i + 2] = clamp(imgData.data[i + 2] + n, 0, 255);
  }
  ctx.putImageData(imgData, 0, 0);

  const textureUrl = canvas.toDataURL("image/png");
  const colors = styleHues.slice(0, 3).map((h, idx) => `hsl(${h} 70% ${idx === 0 ? 60 : idx === 1 ? 50 : 70}%)`);
  return { textureUrl, colors };
}

function hashCode(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}
