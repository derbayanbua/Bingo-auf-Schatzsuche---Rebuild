// Voice lines with mouth animation and subtitles (characterTalk / playerTalk of the original).
//
//   characterTalk(member, mix, mouthSprite):  sendAllSprites(#stopTalking); puppetSound(4, member);
//   Mouth behaviour (BS30): every 40 ms member "<Base>-random(3)" while soundBusy(4), then "<Base>-1".
//
// Web: talk() plays the member on the voice channel (sound.ts), animates an optional mouth sprite
// (random <Base>-1..n while the voice level is above a threshold, else <Base>-1) and shows a subtitle
// bubble with the text from public/orig/audio/transcripts.json (machine transcription, loaded lazily,
// may be incomplete: missing keys simply show no subtitle). Subtitles can be switched off globally.

import { displayName } from '../game/names';
import { soundKey, transcriptsUrl } from './assets';
import { onVoiceLevel, playVoice, stopVoice } from './sound';
import type { Stage } from './stage';

// ------------------------------------------------------------------ transcripts
let transcripts: Record<string, string> | null = null;
let transcriptsLoading: Promise<Record<string, string>> | null = null;

export function loadTranscripts(): Promise<Record<string, string>> {
  if (transcripts) return Promise.resolve(transcripts);
  if (!transcriptsLoading) {
    transcriptsLoading = (typeof fetch === 'function' ? fetch(transcriptsUrl(), { cache: 'no-cache' }) : Promise.reject(new Error('no fetch')))
      .then((r) => (r.ok && !(r.headers.get('content-type') ?? '').includes('text/html') ? r.json() : {}))
      .then((j: unknown) => (transcripts = j && typeof j === 'object' ? (j as Record<string, string>) : {}))
      .catch(() => (transcripts = {}))
      .finally(() => {
        // the transcription may still be running: allow a reload a minute later
        setTimeout(() => {
          transcriptsLoading = null;
          transcripts = null;
        }, 60_000);
      });
  }
  return transcriptsLoading;
}

/** Subtitle text for a voice member (null if unknown / not transcribed yet). */
export async function subtitleFor(movie: string, member: string): Promise<string | null> {
  const k = soundKey(movie, member);
  if (!k) return null;
  const t = await loadTranscripts();
  const s = t[k.key] ?? t[`${k.cast}/${member}`];
  return typeof s === 'string' && s.trim() ? s.trim() : null;
}

// ------------------------------------------------------------------ subtitle setting
let subtitles = true;
export function setSubtitles(on: boolean): void {
  subtitles = on;
  if (!on) document.querySelectorAll('.subtitle').forEach((e) => e.remove());
}
export function subtitlesOn(): boolean {
  return subtitles;
}

let bubble: HTMLElement | null = null;

function showSubtitle(text: string, speaker: string | undefined, host: HTMLElement | null): void {
  hideSubtitle();
  if (!subtitles || typeof document === 'undefined') return;
  const el = document.createElement('div');
  el.className = `subtitle${host ? '' : ' subtitle-fixed'}`;
  el.setAttribute('aria-live', 'polite');
  if (speaker) {
    const b = document.createElement('b');
    b.textContent = `${displayName(speaker)}: `;
    el.append(b);
  }
  el.append(document.createTextNode(text));
  (host ?? document.body).append(el);
  bubble = el;
}

function hideSubtitle(): void {
  bubble?.remove();
  bubble = null;
}

// ------------------------------------------------------------------ mouth
export interface MouthTarget {
  stage: Stage;
  ch: number;
  /** number of mouth members <Base>-1..n (default 3 like BS30; Interface Main uses 5) */
  frames?: number;
  /** voice level 0..1 above which the mouth moves (default 0.04) */
  threshold?: number;
  /** make the sprite visible while talking (Main: sprite 31 blend 100) and hide it afterwards */
  show?: boolean;
}

const stopTalkers = new Set<() => void>();

/** sendAllSprites(#stopTalking): stop all mouth animations (does not stop the sound). */
export function stopTalking(): void {
  for (const f of [...stopTalkers]) f();
}

function animateMouth(m: MouthTarget): () => void {
  const sp = m.stage.sprite(m.ch);
  const movie = m.stage.movie;
  const cur = sp.member?.name ?? '';
  const base = /^(.*)-\d+$/.exec(cur)?.[1] ?? cur;
  const n = m.frames ?? 3;
  const members = movie ? Array.from({ length: n }, (_, i) => movie.member(`${base}-${i + 1}`)).filter((x) => !!x) : [];
  const rest = members[0] ?? sp.member;
  const blend0 = sp.blend;
  if (m.show) sp.blend = 100;
  let last = 0;
  const off = onVoiceLevel((level) => {
    if (!members.length) return;
    const now = performance.now();
    if (now - last < 40) return;
    last = now;
    if (level > (m.threshold ?? 0.04)) sp.setMember(members[Math.floor(Math.random() * members.length)]!);
    else if (rest) sp.setMember(rest);
  });
  const stop = () => {
    off();
    stopTalkers.delete(stop);
    if (rest && m.stage.alive) sp.setMember(rest);
    if (m.show) sp.blend = blend0;
  };
  stopTalkers.add(stop);
  return stop;
}

// ------------------------------------------------------------------ talk
export interface TalkOptions {
  /** cast search context: movie dir like 'Adventure_AS004-02' (see movieDir()) */
  movie: string;
  /** percent, default 100 (Voice Controller dialogs use 80) */
  mixing?: number;
  mouth?: MouthTarget | null;
  /** name shown in front of the subtitle (e.g. 'Arnold') */
  speaker?: string;
  /** element the subtitle bubble is placed in (position: relative); default = fixed at the bottom */
  host?: HTMLElement | null;
}

let talkToken = 0;

/**
 * characterTalk: play `member` on the voice channel (replaces a running line), animate the mouth,
 * show the subtitle. Resolves when the line ends or is replaced/stopped; immediately when missing.
 */
export async function talk(member: string, o: TalkOptions): Promise<void> {
  const token = ++talkToken;
  stopTalking();
  hideSubtitle();
  let stopMouth: (() => void) | null = null;
  const text = subtitleFor(o.movie, member);
  try {
    await playVoice(o.movie, member, {
      mixing: o.mixing,
      onStart: () => {
        if (token !== talkToken) return;
        if (o.mouth) stopMouth = animateMouth(o.mouth);
        void text.then((t) => {
          if (t && token === talkToken) showSubtitle(t, o.speaker, o.host ?? null);
        });
      },
    });
  } finally {
    (stopMouth as (() => void) | null)?.();
    if (token === talkToken) hideSubtitle();
  }
}

/** stop the voice channel, mouths and subtitle */
export function stopTalk(): void {
  talkToken++;
  stopTalking();
  stopVoice();
  hideSubtitle();
}
