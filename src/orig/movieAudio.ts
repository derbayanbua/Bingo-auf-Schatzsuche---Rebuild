// Music Controller (BS22) / Ambient Controller (BS21) of a movie: read from the runtime score
// (frame 1, usually sprite 81 "Headline") and applied on movie enter.
//
//   Music:   pTitle '' -> fade out; pPosition #extern -> orig/music/<pTitle>.mp3, #intern -> cast member;
//            same title already playing -> keep it (volume to pMixing); pLoop; pFadeTime in ticks (60 = 1 s).
//   Ambient: pAmbient '' -> fade out; member of the movie's casts, looped, volume = effect volume * pMixing.
// Movies without a controller leave channel 1 / 2-3 untouched (like the original).

import { loadMovie, type Behavior } from './stage';
import { playMusic, setAmbient, stopMusic } from './sound';

export interface MovieAudio {
  music: { title: string; mixing: number; loop: boolean; intern: boolean; fadeMs: number } | null;
  ambient: { name: string; mixing: number; fadeMs: number }[] | null;
}

const ticks = (t: unknown) => Math.max(0, Math.round(((+(t as number) || 60) * 1000) / 60));

/** Music/ambient parameters of a movie ('AS001-01', 'SP004', 'Chapter-1', 'Main', 'Intro' …); null without originals. */
export async function movieAudio(id: string): Promise<MovieAudio | null> {
  const movie = await loadMovie(id);
  const f = movie?.frame(1);
  if (!movie || !f) return null;
  const res: MovieAudio = { music: null, ambient: null };
  for (const s of f.sprites) {
    for (const b of s.behaviors as Behavior[]) {
      const p = b.params ?? {};
      if (b.name === 'Music Controller') {
        res.music = { title: String(p.pTitle ?? ''), mixing: +p.pMixing || 0, loop: p.pLoop !== 0, intern: p.pPosition === '#intern', fadeMs: ticks(p.pFadeTime) };
      } else if (b.name === 'Ambient Controller') {
        (res.ambient ??= []).push({ name: String(p.pAmbient ?? ''), mixing: +p.pMixing || 0, fadeMs: ticks(p.pFadeTime) });
      }
    }
  }
  return res;
}

let applyToken = 0;

/** Start the movie's music + ambience (call on movie enter and after a video). Never throws. */
export async function applyMovieAudio(id: string): Promise<void> {
  const token = ++applyToken;
  let a: MovieAudio | null = null;
  try {
    a = await movieAudio(id);
  } catch {
    a = null;
  }
  if (!a || token !== applyToken) return;
  const movie = (await loadMovie(id))!;
  if (a.music) {
    const m = a.music;
    if (!m.title) stopMusic(m.fadeMs);
    else playMusic(m.title, m.loop, { mixing: m.mixing, movie: movie.dir, fadeMs: m.fadeMs, intern: m.intern });
  }
  if (a.ambient) {
    const list = a.ambient.filter((x) => x.name);
    setAmbient(list.map((x) => ({ movie: movie.dir, name: x.name, mixing: x.mixing })), a.ambient[0]?.fadeMs ?? 1000);
  }
}
