// Small sound engine modelled on the original Director "Sound Engine" (Shared/Lingo):
//   channel 1 = music, 2/3 = ambient, 4 = voice, 5..8 = effects (freeFXChannel).
// Volumes are Director volumes 0..255 (gVoiceVolume/gEffectVolume/gMusicVolume); per-call
// "mixing" is a percentage like in quickSound/soundEffect/characterTalk.
// Voice + effects are decoded into AudioBuffers (WebAudio); music streams via HTMLAudioElement.

import { musicUrl, soundUrl } from './assets';

type Ctx = AudioContext;
const W = window as unknown as { webkitAudioContext?: typeof AudioContext };

let ctx: Ctx | null = null;
let voiceGain: GainNode | null = null;
let effectGain: GainNode | null = null;
let analyser: AnalyserNode | null = null;
const vol = { voice: 150, effect: 150, music: 150 };
const buffers = new Map<string, Promise<AudioBuffer | null>>();

function ac(): Ctx | null {
  if (ctx) return ctx;
  const C = window.AudioContext ?? W.webkitAudioContext;
  if (!C) return null;
  try {
    ctx = new C();
  } catch {
    return null;
  }
  voiceGain = ctx.createGain();
  effectGain = ctx.createGain();
  analyser = ctx.createAnalyser();
  analyser.fftSize = 512;
  voiceGain.connect(analyser);
  analyser.connect(ctx.destination);
  effectGain.connect(ctx.destination);
  applyVolumes();
  return ctx;
}

function applyVolumes(): void {
  if (voiceGain) voiceGain.gain.value = vol.voice / 255;
  if (effectGain) effectGain.gain.value = vol.effect / 255;
  if (music && !musicFading) music.el.volume = musicLevel();
}

/** Call from a user gesture (click/touchend) once; required on iOS Safari. */
export function unlock(): void {
  const c = ac();
  if (!c) return;
  if (c.state === 'suspended') void c.resume().catch(() => undefined);
  // play a 1-sample silent buffer (iOS unlock idiom)
  try {
    const b = c.createBuffer(1, 1, 22050);
    const s = c.createBufferSource();
    s.buffer = b;
    s.connect(c.destination);
    s.start(0);
  } catch {
    /* ignore */
  }
  if (music && music.el.paused && music.wantPlay) void music.el.play().catch(() => undefined);
}

export function setVolumes(v: Partial<{ voice: number; effect: number; music: number }>): void {
  for (const k of ['voice', 'effect', 'music'] as const) {
    const x = v[k];
    if (typeof x === 'number' && isFinite(x)) vol[k] = Math.max(0, Math.min(255, x));
  }
  applyVolumes();
}

function load(url: string): Promise<AudioBuffer | null> {
  let p = buffers.get(url);
  if (!p) {
    const c = ac();
    p = !c
      ? Promise.resolve(null)
      : fetch(url)
          .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
          .then(
            (ab) =>
              new Promise<AudioBuffer | null>((res) => {
                // callback form for older Safari
                c.decodeAudioData(ab, (b) => res(b), () => res(null));
              }),
          )
          .catch(() => null);
    buffers.set(url, p);
  }
  return p;
}

/** Preload members so the first play has no latency. */
export function preload(movie: string, names: string[]): Promise<void> {
  return Promise.all(names.map((n) => soundUrl(movie, n)).filter((u): u is string => !!u).map(load)).then(() => undefined);
}

// ------------------------------------------------------------------ voice (sound channel 4)
interface Playing {
  src: AudioBufferSourceNode;
  gain: GainNode;
  done: () => void;
}
let voice: Playing | null = null;
let voiceToken = 0;
const levelCbs = new Set<(level: number) => void>();
let levelRaf = 0;

function startLevelLoop(): void {
  if (levelRaf || !analyser || levelCbs.size === 0) return;
  const data = new Uint8Array(analyser.fftSize);
  const tick = (): void => {
    levelRaf = 0;
    if (!analyser) return;
    let level = 0;
    if (voice) {
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const d = (data[i] - 128) / 128;
        sum += d * d;
      }
      level = Math.min(1, Math.sqrt(sum / data.length) * 4);
    }
    levelCbs.forEach((cb) => cb(level));
    if (voice) levelRaf = requestAnimationFrame(tick);
  };
  levelRaf = requestAnimationFrame(tick);
}

/**
 * Play a voice line on the single voice channel (like puppetSound(4, member)); replaces a running one.
 * Resolves when finished or stopped; resolves immediately if the member/originals are missing.
 * opts.mixing = percent (default 100, characterTalk in dialogs uses 80).
 */
export async function playVoice(movie: string, name: string, opts?: { mixing?: number }): Promise<void> {
  const url = soundUrl(movie, name);
  const token = ++voiceToken;
  stopVoice();
  if (!url) return;
  const c = ac();
  if (!c) return;
  const buf = await load(url);
  if (!buf || token !== voiceToken || !voiceGain) return;
  return new Promise<void>((resolve) => {
    const src = c.createBufferSource();
    const gain = c.createGain();
    gain.gain.value = (opts?.mixing ?? 100) / 100;
    src.buffer = buf;
    src.connect(gain).connect(voiceGain!);
    const p: Playing = {
      src,
      gain,
      done: () => {
        if (voice === p) voice = null;
        resolve();
      },
    };
    src.onended = () => p.done();
    voice = p;
    try {
      src.start();
    } catch {
      p.done();
      return;
    }
    startLevelLoop();
  });
}

/** playerTalk(talkID): member "<Bingo|Puck>Talk-<n>" on the voice channel. */
export function playerTalk(movie: string, player: 'Bingo' | 'Puck', talkId: number | string, mixing = 100): Promise<void> {
  return playVoice(movie, `${player}Talk-${talkId}`, { mixing });
}

/** soundBusy(4) */
export function isVoiceBusy(): boolean {
  return voice !== null;
}

export function stopVoice(): void {
  const v = voice;
  voice = null;
  if (v) {
    try {
      v.src.onended = null;
      v.src.stop();
    } catch {
      /* already stopped */
    }
    v.done();
  }
}

/** Amplitude 0..1 of the voice channel (~60 Hz while talking, then one final 0). Returns unsubscribe. */
export function onVoiceLevel(cb: (level: number) => void): () => void {
  levelCbs.add(cb);
  startLevelLoop();
  return () => levelCbs.delete(cb);
}

// ------------------------------------------------------------------ effects (channels 5..8)
let fxBusy = 0;
const FX_CHANNELS = 4;

/** quickSound/soundEffect: plays on a free effect channel (max 4 at once, else dropped like freeFXChannel()=0). */
export function playEffect(movie: string, name: string, volume = 100): Promise<void> {
  const url = soundUrl(movie, name);
  const c = ac();
  if (!url || !c || fxBusy >= FX_CHANNELS || vol.effect === 0) return Promise.resolve();
  fxBusy++;
  return load(url).then(
    (buf) =>
      new Promise<void>((resolve) => {
        if (!buf || !effectGain) {
          fxBusy--;
          resolve();
          return;
        }
        const src = c.createBufferSource();
        const g = c.createGain();
        g.gain.value = volume / 100;
        src.buffer = buf;
        src.connect(g).connect(effectGain);
        src.onended = () => {
          fxBusy--;
          resolve();
        };
        try {
          src.start();
        } catch {
          fxBusy--;
          resolve();
        }
      }),
  );
}

/** inventarSound(OIxxx): member "OIxxx-Sound" of castLib "Inventar". */
export function playInventarSound(objectId: string): Promise<void> {
  return playEffect('', `Shared_Inventar/${objectId}-Sound`, 100);
}

// ------------------------------------------------------------------ music (channel 1)
let music: { name: string; el: HTMLAudioElement; wantPlay: boolean; mixing: number } | null = null;
let musicFading = false;

function musicLevel(): number {
  return Math.min(1, (vol.music / 255) * ((music?.mixing ?? 100) / 100));
}

/**
 * Music Controller: plays Soundtrack\<name> (pPosition #extern); same title already playing → keep it.
 * `movie` lets #intern titles (members of Local/Global Audio) resolve too.
 */
export function playMusic(name: string, loop = true, opts?: { mixing?: number; movie?: string; fadeMs?: number }): void {
  if (music && music.name === name && !music.el.paused) {
    music.mixing = opts?.mixing ?? music.mixing;
    music.el.loop = loop;
    applyVolumes();
    return;
  }
  const url = musicUrl(name) ?? (opts?.movie !== undefined ? soundUrl(opts.movie, name) : null);
  stopMusic(opts?.fadeMs ?? 0);
  if (!url) return;
  const el = new Audio(url);
  el.loop = loop;
  el.preload = 'auto';
  el.setAttribute('playsinline', '');
  music = { name, el, wantPlay: true, mixing: opts?.mixing ?? 100 };
  musicFading = false;
  el.volume = musicLevel();
  if (vol.music > 0) void el.play().catch(() => undefined); // blocked until unlock()
}

export function currentMusic(): string | null {
  return music?.name ?? null;
}

/** sound fadeOut 1, fadeMs */
export function stopMusic(fadeMs = 0): void {
  const m = music;
  music = null;
  musicFading = false;
  if (!m) return;
  m.wantPlay = false;
  if (fadeMs <= 0 || m.el.paused) {
    m.el.pause();
    m.el.src = '';
    return;
  }
  const start = performance.now();
  const v0 = m.el.volume;
  const step = (): void => {
    const t = (performance.now() - start) / fadeMs;
    if (t >= 1) {
      m.el.pause();
      m.el.src = '';
      return;
    }
    m.el.volume = v0 * (1 - t);
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
