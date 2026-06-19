// Auto-line-up a reaction video's audio with the song it was recorded against.
//
// Both clips contain the same music (the reaction video has the song playing in the
// background). We decode each at a low sample rate, build a coarse loudness envelope,
// and cross-correlate the two to find the time offset where they best match. That
// offset feeds reactionSync so the person's reactions line up with the audio-reactive
// visualizer. It's an estimate - the user can nudge the offset slider to fine-tune.

const DECODE_HZ = 8000; // resample on decode → low memory, plenty for an envelope
const ENV_HZ = 24;      // envelope bins per second

export interface AlignResult {
  offsetSeconds: number; // → reactionSync.offset  (video.currentTime = song.currentTime + offset)
  confidence: number;    // 0..1 (peak correlation strength); low ⇒ suggest manual nudge
}

async function decodeEnvelope(url: string, ctx: OfflineAudioContext): Promise<Float32Array> {
  const arr = await fetch(url).then((r) => r.arrayBuffer());
  const audio = await ctx.decodeAudioData(arr);
  const n = audio.length;
  const chA = audio.getChannelData(0);
  const chB = audio.numberOfChannels > 1 ? audio.getChannelData(1) : null;
  const per = Math.max(1, Math.floor(audio.sampleRate / ENV_HZ));
  const bins = Math.floor(n / per);
  const env = new Float32Array(bins);
  for (let b = 0; b < bins; b++) {
    let s = 0;
    const base = b * per;
    for (let i = 0; i < per; i++) {
      const idx = base + i;
      const v = chB ? (chA[idx] + chB[idx]) * 0.5 : chA[idx];
      s += v * v;
    }
    env[b] = Math.sqrt(s / per);
  }
  return env;
}

// Zero-mean, unit-variance so correlation ignores loudness differences.
function normalize(env: Float32Array): Float32Array {
  const len = env.length || 1;
  let mean = 0;
  for (let i = 0; i < env.length; i++) mean += env[i];
  mean /= len;
  let varr = 0;
  for (let i = 0; i < env.length; i++) varr += (env[i] - mean) ** 2;
  const std = Math.sqrt(varr / len) || 1;
  const out = new Float32Array(env.length);
  for (let i = 0; i < env.length; i++) out[i] = (env[i] - mean) / std;
  return out;
}

export async function alignVideoToSong(songUrl: string, videoUrl: string): Promise<AlignResult> {
  const Ctx = (window as unknown as { OfflineAudioContext: typeof OfflineAudioContext }).OfflineAudioContext;
  const ctx = new Ctx(1, 1, DECODE_HZ);
  const [songEnv, videoEnv] = await Promise.all([
    decodeEnvelope(songUrl, ctx).then(normalize),
    decodeEnvelope(videoUrl, ctx).then(normalize),
  ]);
  if (songEnv.length < 4 || videoEnv.length < 4) {
    throw new Error('Not enough audio to analyse');
  }

  // Slide the SHORTER envelope across the LONGER one; best dot product = best alignment.
  const videoIsShort = videoEnv.length <= songEnv.length;
  const longEnv = videoIsShort ? songEnv : videoEnv;
  const shortEnv = videoIsShort ? videoEnv : songEnv;
  const maxLag = longEnv.length - shortEnv.length;

  let bestD = 0, bestScore = -Infinity;
  for (let d = 0; d <= maxLag; d++) {
    let s = 0;
    for (let i = 0; i < shortEnv.length; i++) s += longEnv[d + i] * shortEnv[i];
    if (s > bestScore) { bestScore = s; bestD = d; }
  }

  const dSeconds = bestD / ENV_HZ;
  // video.currentTime = song.currentTime + offset:
  //  - video shorter (recording is a slice of the song): it begins dSeconds into the
  //    song ⇒ offset = -dSeconds.
  //  - video longer: the song begins dSeconds into the video ⇒ offset = +dSeconds.
  const offsetSeconds = videoIsShort ? -dSeconds : dSeconds;
  const confidence = Math.max(0, Math.min(1, bestScore / shortEnv.length));
  return { offsetSeconds: Math.round(offsetSeconds * 1000) / 1000, confidence };
}
