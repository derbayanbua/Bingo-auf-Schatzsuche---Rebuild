// Small sound engine modelled on the original Director "Sound Engine" (Shared/Lingo):
//   channel 1 = music, 2/3 = ambient, 4 = voice, 5..8 = effects (freeFXChannel).
// Volumes are Director volumes 0..255 (gVoiceVolume/gEffectVolume/gMusicVolume); per-call
// "mixing" is a percentage like in quickSound/soundEffect/characterTalk.
// Voice + effects + ambient are decoded into AudioBuffers (WebAudio); music streams via HTMLAudioElement.
// Everything is a silent no-op when public/orig is missing or WebAudio is unavailable.

import { musicUrl, soundUrl } from './assets';

type Ctx = AudioContext;
const W = (typeof window !== 'undefined' ? window : {}) as unknown as { webkitAudioContext?: typeof AudioContext; AudioContext?: typeof AudioContext };

let ctx: Ctx | null = null;
let voiceGain: GainNode | null = null;
let effectGain: GainNode | null = null;
let analyser: AnalyserNode | null = null;
const vol = { voice: 150, effect: 150, music: 150 };
const buffers = new Map<string, Promise<AudioBuffer | null>>();

function ac(): Ctx | null {
  if (ctx) return ctx;
  const C = W.AudioContext ?? W.webkitAudioContext;
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

/** true when the AudioContext runs (i.e. has been unlocked by a user gesture) */
async function running(c: Ctx): Promise<boolean> {
  if (c.state === 'running') return true;
  try {
    await Promise.race([c.resume(), new Promise((r) => setTimeout(r, 250))]);
  } catch {
    /* ignore */
  }
  return (c.state as string) === 'running';
}

export function isAudioRunning(): boolean {
  return !!ctx && ctx.state === 'running';
}

function applyVolumes(): void {
  if (voiceGain) voiceGain.gain.value = vol.voice / 255;
  if (effectGain) effectGain.gain.value = vol.effect / 255;
  if (music && !musicFading) music.el.volume = musicLevel();
}

/** Call from a user gesture (click/touchend); required on iOS Safari. Cheap to call repeatedly. */
export function unlock(): void {
  const c = ac();
  if (!c) return;
  if (c.state === 'suspended') void c.resume().catch(() => undefined);
  if (!unlocked) {
    unlocked = true;
    try {
      const b = c.createBuffer(1, 1, 22050);
      const s = c.createBufferSource();
      s.buffer = b;
      s.connect(c.destination);
      s.start(0);
    } catch {
      /* ignore */
    }
  }
  if (music && music.el.paused && music.wantPlay && vol.music > 0) void music.el.play().catch(() => undefined);
}
let unlocked = false;

export function setVolumes(v: Partial<{ voice: number; effect: number; music: number }>): void {
  for (const k of ['voice', 'effect', 'music'] as const) {
    const x = v[k];
    if (typeof x === 'number' && isFinite(x)) vol[k] = Math.max(0, Math.min(255, x));
  }
  applyVolumes();
  if (music) {
    if (vol.music === 0) music.el.pause();
    else if (music.wantPlay && music.el.paused) void music.el.play().catch(() => undefined);
  }
}

export function getVolumes(): { voice: number; effect: number; music: number } {
  return { ...vol };
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

/** true if the member exists in the originals (searching the movie's casts) */
export function hasSound(movie: string, name: string): boolean {
  return !!soundUrl(movie, name);
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
let levelTimer: ReturnType<typeof setInterval> | 0 = 0;

// 40 ms like the original Mouth behaviour (a timer, not rAF: keeps working in background tabs)
function startLevelLoop(): void {
  if (levelTimer || !analyser || levelCbs.size === 0) return;
  const data = new Uint8Array(analyser.fftSize);
  const tick = (): void => {
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
    if (!voice && levelTimer) {
      clearInterval(levelTimer);
      levelTimer = 0;
    }
  };
  levelTimer = setInterval(tick, 40);
}

/**
 * Play a voice line on the single voice channel (like puppetSound(4, member)); replaces a running one.
 * Resolves when finished or stopped; resolves immediately if the member/originals are missing
 * or audio is still locked (no user gesture yet).
 * opts.mixing = percent (default 100, characterTalk in dialogs uses 80).
 */
export async function playVoice(movie: string, name: string, opts?: { mixing?: number; onStart?: () => void }): Promise<void> {
  const url = soundUrl(movie, name);
  const token = ++voiceToken;
  stopVoice();
  if (!url) return;
  const c = ac();
  if (!c) return;
  const buf = await load(url);
  if (!buf || token !== voiceToken || !voiceGain) return;
  if (!(await running(c)) || token !== voiceToken) return;
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
    opts?.onStart?.();
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
const FX_CHANNELS = 4;
const fxPlaying = new Set<{ src: AudioBufferSourceNode; gain: GainNode; end: () => void }>();

/**
 * quickSound/soundEffect: plays on a free effect channel (max 4 at once, else dropped like
 * freeFXChannel()=0). `movie` = cast search context ('AS001-01' style ids are accepted only as
 * 'Adventure_AS001-01'; use movieDir()); `name` may be "Cast/Member" to force a cast.
 */
export function playEffect(movie: string, name: string, volume = 100, opts?: { loop?: boolean }): Promise<void> {
  const url = soundUrl(movie, name);
  const c = ac();
  if (!url || !c || fxPlaying.size >= FX_CHANNELS || vol.effect === 0) return Promise.resolve();
  const slot = { src: null as unknown as AudioBufferSourceNode, gain: null as unknown as GainNode, end: () => undefined as void };
  fxPlaying.add(slot); // reserve the channel while loading
  return load(url).then(async (buf) => {
    if (!buf || !effectGain || !(await running(c)) || !fxPlaying.has(slot)) {
      fxPlaying.delete(slot);
      return;
    }
    return new Promise<void>((resolve) => {
      const src = c.createBufferSource();
      const g = c.createGain();
      g.gain.value = volume / 100;
      src.buffer = buf;
      src.loop = !!opts?.loop;
      src.connect(g).connect(effectGain!);
      slot.src = src;
      slot.gain = g;
      slot.end = () => {
        fxPlaying.delete(slot);
        resolve();
      };
      src.onended = () => slot.end();
      try {
        src.start();
      } catch {
        slot.end();
      }
    });
  });
}

/** Looping effect (Visible Audio pLoop=1). Returns a stop function. */
export function playEffectLoop(movie: string, name: string, volume = 100): () => void {
  const before = new Set(fxPlaying);
  void playEffect(movie, name, volume, { loop: true });
  const mine = [...fxPlaying].find((s) => !before.has(s));
  return () => {
    if (!mine) return;
    if (mine.src) {
      try {
        mine.src.stop();
      } catch {
        /* ignore */
      }
    }
    fxPlaying.delete(mine);
    mine.end();
  };
}

export function stopEffects(): void {
  for (const s of [...fxPlaying]) {
    if (s.src) {
      try {
        s.src.onended = null;
        s.src.stop();
      } catch {
        /* ignore */
      }
    }
    s.end();
    fxPlaying.delete(s);
  }
}

/** inventarSound(OIxxx): member "OIxxx-Sound" of castLib "Inventar". */
export function playInventarSound(objectId: string): Promise<void> {
  return playEffect('', `Shared_Inventar/${objectId}-Sound`, 100);
}

// ------------------------------------------------------------------ ambient (channels 2/3)
interface Amb {
  key: string;
  src: AudioBufferSourceNode | null;
  gain: GainNode | null;
  mixing: number;
  stopped: boolean;
}
const ambients = new Map<string, Amb>();

function fadeGain(g: GainNode | null, to: number, ms: number): void {
  if (!g || !ctx) return;
  const t = ctx.currentTime;
  try {
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(g.gain.value, t);
    g.gain.linearRampToValueAtTime(to, t + Math.max(0.01, ms / 1000));
  } catch {
    g.gain.value = to;
  }
}

function stopAmb(a: Amb, fadeMs: number): void {
  a.stopped = true;
  ambients.delete(a.key);
  if (!a.src) return;
  fadeGain(a.gain, 0, fadeMs);
  const src = a.src;
  setTimeout(() => {
    try {
      src.stop();
    } catch {
      /* ignore */
    }
  }, fadeMs + 50);
}

/**
 * Ambient Controller: set the looping ambience (max. 2 like channels 2/3). Entries already playing
 * keep running (volume is faded to the new mixing), others fade out / in. Empty list = silence.
 * Ambient volume follows the EFFECT volume like in the original.
 */
export function setAmbient(list: { movie: string; name: string; mixing?: number }[], fadeMs = 1000): void {
  const want = new Map<string, { movie: string; name: string; mixing: number }>();
  for (const e of list.slice(0, 2)) {
    if (!e.name) continue;
    const url = soundUrl(e.movie, e.name);
    if (url) want.set(url, { ...e, mixing: e.mixing ?? 100 });
  }
  for (const [k, a] of [...ambients]) if (!want.has(k)) stopAmb(a, fadeMs);
  const c = ac();
  if (!c) return;
  for (const [url, e] of want) {
    const cur = ambients.get(url);
    if (cur) {
      cur.mixing = e.mixing;
      fadeGain(cur.gain, e.mixing / 100, fadeMs);
      continue;
    }
    const a: Amb = { key: url, src: null, gain: null, mixing: e.mixing, stopped: false };
    ambients.set(url, a);
    void load(url).then(async (buf) => {
      if (!buf || a.stopped || !effectGain) return;
      // wait for the first user gesture without blocking the caller
      while (c.state !== 'running') {
        await new Promise((r) => setTimeout(r, 400));
        if (a.stopped) return;
        if (c.state === 'closed') return;
      }
      const src = c.createBufferSource();
      const g = c.createGain();
      g.gain.value = 0;
      src.buffer = buf;
      src.loop = true;
      src.connect(g).connect(effectGain);
      a.src = src;
      a.gain = g;
      try {
        src.start();
      } catch {
        return;
      }
      fadeGain(g, a.mixing / 100, fadeMs);
    });
  }
}

export function currentAmbient(): string[] {
  return [...ambients.keys()];
}

// ------------------------------------------------------------------ music (channel 1)
let music: { name: string; el: HTMLAudioElement; wantPlay: boolean; mixing: number } | null = null;
let musicFading = false;

function musicLevel(): number {
  return Math.min(1, (vol.music / 255) * ((music?.mixing ?? 100) / 100));
}

/**
 * Music Controller: plays Soundtrack\<name> (pPosition #extern); same title already playing → keep it
 * (volume follows the new mixing). `movie` lets #intern titles (members of Local/Global Audio) resolve too.
 */
export function playMusic(name: string, loop = true, opts?: { mixing?: number; movie?: string; fadeMs?: number; intern?: boolean }): void {
  if (music && music.name === name && music.wantPlay) {
    music.mixing = opts?.mixing ?? music.mixing;
    music.el.loop = loop;
    applyVolumes();
    return;
  }
  const url = (opts?.intern ? null : musicUrl(name)) ?? (opts?.movie !== undefined ? soundUrl(opts.movie, name) : null);
  stopMusic(opts?.fadeMs ?? 0);
  if (!url) return;
  const el = new Audio(url);
  el.loop = loop;
  el.preload = 'auto';
  el.setAttribute('playsinline', '');
  music = { name, el, wantPlay: true, mixing: opts?.mixing ?? 100 };
  musicFading = false;
  el.volume = musicLevel();
  el.addEventListener('ended', () => {
    if (music?.el === el && !el.loop) music.wantPlay = false;
  });
  if (vol.music > 0) void el.play().catch(() => undefined); // blocked until unlock()
}

export function currentMusic(): string | null {
  return music?.wantPlay ? music.name : null;
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
    m.el.removeAttribute('src');
    return;
  }
  const start = performance.now();
  const v0 = m.el.volume;
  const step = (): void => {
    const t = (performance.now() - start) / fadeMs;
    if (t >= 1) {
      m.el.pause();
      m.el.removeAttribute('src');
      return;
    }
    m.el.volume = Math.max(0, v0 * (1 - t));
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/**
 * playSmacker preparation: fade out music, ambience, voice (channels 1–4) and stop the effects.
 * Resolves after `ms`.
 */
export function fadeOutAll(ms = 800): Promise<void> {
  const busy = !!music || ambients.size > 0 || !!voice;
  stopMusic(ms);
  for (const a of [...ambients.values()]) stopAmb(a, ms);
  if (voice) {
    fadeGain(voice.gain, 0, ms);
    setTimeout(stopVoice, ms);
  }
  stopEffects();
  return busy ? new Promise((r) => setTimeout(r, ms)) : Promise.resolve();
}
