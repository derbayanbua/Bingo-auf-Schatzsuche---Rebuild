// Full-stage (800x600) original screens outside the adventure engine: Chapter cards, the Intro movie
// and the voice of the main menu (Interface\Main). Plus the chapter-change hook for scene ports.
// All functions degrade to "nothing happened" (false / immediate resolve) without public/orig.

import { hasOriginalGfx } from './gfx';
import { applyMovieAudio } from './movieAudio';
import { ScorePlayer } from './score';
import { isAudioRunning, isVoiceBusy, playEffect, playVoice, stopVoice } from './sound';
import { loadMovie, Stage, type Sprite } from './stage';
import { stopTalk, talk } from './voice';

// ------------------------------------------------------------------ chapter hook

type ChapterHandler = (n: 1 | 2 | 3) => Promise<void>;
let chapterHandler: ChapterHandler | null = null;

/** The app registers how a chapter starts (card, state changes, first scene). */
export function setChapterHandler(fn: ChapterHandler): void {
  chapterHandler = fn;
}

/**
 * Start a chapter from scene code (e.g. AS017-02 after the "Reparatur" video: startChapter(2)).
 * Chapter 2 (original Chapter-2 Next.mouseUp): CH1 + CH2 -> AS020-01, both inventories cleared
 * (coins/jokes stay), then the chapter card and AS020-01.
 */
export function startChapter(n: 1 | 2 | 3): Promise<void> {
  return chapterHandler ? chapterHandler(n) : Promise.resolve();
}

// ------------------------------------------------------------------ helpers

function fullStage(className: string): Stage {
  const st = new Stage({ width: 800, height: 600, originY: 0, className: `ostage-full ${className}` });
  return st;
}

/** Rollover Fader (pFadeLow..pFadeHigh) */
function rolloverFader(stage: Stage, sp: Sprite): void {
  const f = sp.behavior('Rollover Fader')?.params;
  if (!f) return;
  sp.blend = +f.pFadeLow || 50;
  stage.on(sp.ch, 'mouseEnter', () => (sp.blend = +f.pFadeHigh || 100));
  stage.on(sp.ch, 'mouseLeave', () => (sp.blend = +f.pFadeLow || 50));
}

// ------------------------------------------------------------------ Chapter card

/**
 * Chapter-n card with the original graphics/music (Chapter\Chapter-n). Shown inside `host`
 * (replacing nothing; the caller clears it afterwards). Resolves after the "Next" button
 * (sprite 95; mouseDown "Splash", mouseUp waits for the voice channel, then shows "Filmstop"
 * sprite 96) and `onNext` (e.g. playSmacker('Intro')) have finished. Returns false (without
 * showing anything) when the originals are missing.
 */
export async function chapterScreen(host: HTMLElement, n: 1 | 2 | 3, onNext?: () => Promise<void>): Promise<boolean> {
  if (!hasOriginalGfx()) return false;
  const movie = await loadMovie(`Chapter-${n}`);
  if (!movie?.frame(1)) return false;
  const stage = fullStage('chapter-orig');
  const player = new ScorePlayer(stage, movie, { filter: (s) => s.ch < 110 });
  await player.gotoFrame(1);
  const wrap = document.createElement('div');
  wrap.className = 'orig-screen';
  wrap.append(stage.el);
  host.append(wrap);
  void applyMovieAudio(`Chapter-${n}`);
  const next = stage.sprite(95);
  const stop = stage.has(96) ? stage.sprite(96) : null;
  if (stop) stop.visible = false;
  next.cursor = 'make';
  rolloverFader(stage, next);
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'ostage-btn orig-next';
  btn.setAttribute('aria-label', 'Weiter');
  btn.style.cssText = `left:${(next.left / 8).toFixed(2)}%;top:${(next.top / 6).toFixed(2)}%;width:${(next.w / 8).toFixed(2)}%;height:${(next.h / 6).toFixed(2)}%`;
  stage.el.append(btn);
  await new Promise<void>((resolve) => {
    let done = false;
    const go = async () => {
      if (done) return;
      done = true;
      document.removeEventListener('keydown', onKey);
      stage.cursorOverride = 'wait';
      stage.updateCursor();
      while (isVoiceBusy()) await stage.wait(100);
      next.visible = false;
      if (stop) stop.visible = true;
      try {
        await onNext?.();
      } finally {
        resolve();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        void playEffect(movie.dir, 'Splash', 100);
        void go();
      }
    };
    document.addEventListener('keydown', onKey);
    stage.on(95, 'mouseDown', () => void playVoice(movie.dir, 'Splash'));
    stage.on(95, 'mouseUp', () => void go());
    btn.addEventListener('click', (e) => {
      if (e.detail === 0) void go();
    });
    btn.focus();
  });
  player.destroy();
  stage.destroy();
  wrap.remove();
  return true;
}

// ------------------------------------------------------------------ Intro movie

/**
 * The original intro (Intro\Intro, 250 frames): credits, banner, Bingo/Puck, monkey sounds,
 * music "Intro". A click anywhere (or Esc/Space/Enter) ends it ("Platsch-1"). Resolves when done;
 * false without originals.
 */
export async function introScreen(host: HTMLElement, fps = 15): Promise<boolean> {
  if (!hasOriginalGfx()) return false;
  const movie = await loadMovie('Intro');
  if (!movie?.frame(1)) return false;
  const stage = fullStage('intro-orig');
  stage.el.style.background = '#000';
  const player = new ScorePlayer(stage, movie, { filter: (s) => s.ch < 110 });
  const wrap = document.createElement('div');
  wrap.className = 'orig-screen';
  wrap.append(stage.el);
  host.append(wrap);
  // frame scripts (Intro.dxr): voice channel 4
  const waitVoice = async () => {
    while (isVoiceBusy() && stage.alive) await stage.wait(80);
  };
  const say = (m: string) => void playVoice(movie.dir, m);
  player.onEnterFrame((f) => {
    if (f === 20) say('Rascheln2');
    if (f === 70) say('Affe1');
    if (f === 130) say('Affe2');
    if (f === 172) say('Urwald1');
  });
  player.onExitFrame((f) => (f === 69 || f === 80 || f === 140 ? waitVoice() : undefined));
  await player.gotoFrame(1);
  void applyMovieAudio('Intro');
  await new Promise<void>((resolve) => {
    let done = false;
    const end = () => {
      if (done) return;
      done = true;
      document.removeEventListener('keydown', onKey, true);
      void playEffect(movie.dir, 'Platsch-1', 100);
      resolve();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        end();
      }
    };
    document.addEventListener('keydown', onKey, true);
    stage.el.addEventListener('click', end);
    stage.el.style.cursor = 'pointer';
    // play to the end, then stay on the last frame until a click (F250: go(the frame))
    void player.play({ from: 1, to: movie.frameCount, fps });
  });
  stopVoice();
  player.destroy();
  stage.destroy();
  wrap.remove();
  return true;
}

// ------------------------------------------------------------------ main menu voice (Interface\Main)

let greeted = false;
let greeting = false;

/**
 * Bingo's greeting in the main menu: "B1-1/2/3" by time of day (0–11, 12–18, 19–23), then "B2".
 * Once per session (gGreeting). Needs unlocked audio: call again from a user gesture if it returns false.
 */
export async function menuGreeting(): Promise<boolean> {
  if (greeted || greeting) return true;
  if (!isAudioRunning()) return false;
  greeting = true;
  const hr = new Date().getHours();
  const b1 = hr < 12 ? 'B1-1' : hr < 19 ? 'B1-2' : 'B1-3';
  try {
    await talk(b1, { movie: 'Interface_Main', speaker: 'Bingo' });
    if (greeting) await talk('B2', { movie: 'Interface_Main', speaker: 'Bingo' });
  } finally {
    greeting = false;
    greeted = true;
  }
  return true;
}

let buttonTalkToken = 0;

/**
 * Hover line of a main-menu button (sprite(30).myButtonTalk): 1 Spielen, 2 Lernen, 3 Krimskrams,
 * 4 Einstellungen, 5 Ende -> "T<n>-1" then "T<n>-2". Interrupting a running line plays "R" first.
 */
export async function menuButtonTalk(n: 1 | 2 | 3 | 4 | 5): Promise<void> {
  if (!greeted || !isAudioRunning()) return;
  const token = ++buttonTalkToken;
  if (isVoiceBusy()) {
    await talk('R', { movie: 'Interface_Main', speaker: 'Bingo' });
    if (token !== buttonTalkToken) return;
  }
  await talk(`T${n}-1`, { movie: 'Interface_Main', speaker: 'Bingo' });
  if (token !== buttonTalkToken) return;
  await talk(`T${n}-2`, { movie: 'Interface_Main', speaker: 'Bingo' });
}

/** leave the menu: stop greeting / hover lines */
export function stopMenuVoice(): void {
  greeting = false;
  buttonTalkToken++;
  stopTalk();
}
