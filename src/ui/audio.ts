// Self-made sound effects synthesised with WebAudio (no original audio is shipped).
// Volumes use the original 0..255 scale (default 150).

let ctx: AudioContext | null = null;
let effectVolume = 150;

export function setEffectVolume(v: number) {
  effectVolume = v;
}

function ac(): AudioContext | null {
  if (!ctx) {
    const C = window.AudioContext || (window as any).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

/** Must be called from a user gesture once (iOS). */
export function unlockAudio() {
  ac();
}

function gainNode(c: AudioContext, v: number): GainNode {
  const g = c.createGain();
  g.gain.value = (effectVolume / 255) * v;
  g.connect(c.destination);
  return g;
}

function tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.25, slideTo?: number, delay = 0) {
  const c = ac();
  if (!c || effectVolume === 0) return;
  const t = c.currentTime + delay;
  const o = c.createOscillator();
  const g = gainNode(c, vol);
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(g.gain.value, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(dur: number, vol = 0.2, delay = 0, filter = 1800) {
  const c = ac();
  if (!c || effectVolume === 0) return;
  const t = c.currentTime + delay;
  const buf = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = filter;
  const g = gainNode(c, vol);
  src.connect(f).connect(g);
  src.start(t);
}

export const sfx = {
  click: () => tone(660, 0.07, 'triangle', 0.15),
  /** "Becher": shaking the dice cup */
  shake: () => {
    for (let i = 0; i < 6; i++) noise(0.05, 0.25, i * 0.06, 2500 + i * 200);
  },
  /** "Wurf": dice landing */
  roll: () => {
    noise(0.08, 0.3, 0, 1200);
    noise(0.06, 0.25, 0.12, 1600);
  },
  /** landing sound depends on the ground type of the point (Stone/Sand/Dirt/Grass) */
  step: (ground: number) => {
    const f = [500, 900, 420, 300, 600][ground] ?? 500;
    noise(0.07, 0.18, 0, f * 2);
    tone(f, 0.08, 'sine', 0.08, f * 0.7);
  },
  joke: () => {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.15, 'triangle', 0.18, undefined, i * 0.08));
  },
  steal: () => tone(300, 0.4, 'sawtooth', 0.12, 90),
  give: () => [784, 988].forEach((f, i) => tone(f, 0.12, 'triangle', 0.16, undefined, i * 0.09)),
  coin: () => [1319, 1760].forEach((f, i) => tone(f, 0.1, 'square', 0.07, undefined, i * 0.07)),
  deny: () => tone(220, 0.22, 'square', 0.08, 160),
  enter: () => [392, 523, 659].forEach((f, i) => tone(f, 0.18, 'sine', 0.18, undefined, i * 0.1)),
  blocker: () => noise(0.25, 0.3, 0, 700),
  success: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.22, 'triangle', 0.18, undefined, i * 0.1)),
};
