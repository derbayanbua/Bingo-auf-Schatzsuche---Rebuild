// Helpers for the chapter-3 (part B) + ending ports (files ch3b-*.ts). No scene is registered here.
// Ported shared Lingo behaviours that the scene view does not provide generically:
// Movie-Loop (BS10), Mouth (BS30, driven by myTalkMode), Two-State Animation with myMode set by
// scripts, CuePassed of voice members (cue points read from the original cupt chunks),
// sprite.rotation, baKeyIsDown(37..40) with an on-screen pad for touch.

import type { OrigScene } from '../sceneView';
import type { MemberRef, Sprite } from '../stage';

export { markPorted, random, rnd } from './ch1util';

/** all sprites of the current frame that carry `behavior` */
export function spritesWith(scene: OrigScene, behavior: string): Sprite[] {
  return [...scene.stage.sprites.values()].filter((s) => !!s.behavior(behavior));
}

function ref(scene: OrigScene, sp: Sprite, r: unknown): MemberRef | null {
  if (!r || typeof r !== 'object') return null;
  const o = r as { castLib?: number; member?: number };
  return scene.movie.memberAt(o.castLib || sp.member?.castLib || 1, o.member ?? 0);
}

/** sprite still on stage (a frame change replaces sprites) */
const onStage = (scene: OrigScene, sp: Sprite) => scene.alive && scene.stage.has(sp.ch) && scene.stage.sprite(sp.ch) === sp;

// ------------------------------------------------------------------ Movie-Loop (Shared BS10)
export type LoopMode = 'forward' | 'backward' | 'stopped';
export interface MovieLoop {
  mode: LoopMode;
  readonly sp: Sprite;
}

/** Movie-Loop: member <Base>-first..last every 1000/pFrameRate ms, mode from pStartMode (myMode) */
export function movieLoop(scene: OrigScene, sp: Sprite): MovieLoop | null {
  const p = sp.behavior('Movie-Loop')?.params;
  if (!p) return null;
  const seq = scene.movie.sequence(ref(scene, sp, p.pFirstMember) ?? '', ref(scene, sp, p.pLastMember) ?? '');
  if (seq.length < 2) return null;
  const wait = 1000 / (+p.pFrameRate || 25);
  const loop: MovieLoop = { mode: (String(p.pStartMode ?? '#forward').replace('#', '') as LoopMode) || 'forward', sp };
  let i = loop.mode === 'backward' ? seq.length - 1 : 0;
  let last = performance.now();
  const off = scene.onTick((now) => {
    if (!onStage(scene, sp)) return off();
    if (now < last + wait || loop.mode === 'stopped') return;
    i = loop.mode === 'forward' ? (i + 1) % seq.length : (i - 1 + seq.length) % seq.length;
    sp.setMember(seq[i]);
    last = now;
  });
  return loop;
}

/** start the Movie-Loops of all sprites of the current frame (except `skip`) */
export function movieLoops(scene: OrigScene, skip: number[] = []): Map<number, MovieLoop> {
  const out = new Map<number, MovieLoop>();
  for (const sp of spritesWith(scene, 'Movie-Loop')) {
    if (skip.includes(sp.ch)) continue;
    const l = movieLoop(scene, sp);
    if (l) out.set(sp.ch, l);
  }
  return out;
}

// ------------------------------------------------------------------ Mouth (Shared BS30)
export interface Mouth {
  mode: 'talk' | 'stopped';
}

/**
 * Mouth: every 40 ms; #talk -> member <Base>-random(3), back to #stopped when soundBusy(4) = 0;
 * #stopped -> <Base>-1. `partner` = second sprite that follows (GS050-02 MundRechts, sprite 34).
 */
export function mouth(scene: OrigScene, ch: number, partner?: number, busy: () => boolean = () => scene.talking): Mouth {
  const m: Mouth = { mode: 'stopped' };
  if (!scene.stage.has(ch)) return m;
  const sp = scene.sprite(ch);
  const base = (s: Sprite) => (s.member?.name ?? '').split('-')[0];
  const set = (s: Sprite, n: number) => {
    const r = scene.member(`${base(s)}-${n}`);
    if (r && s.member !== r) s.setMember(r);
  };
  let next = performance.now() + 40;
  const off = scene.onTick((now) => {
    if (!onStage(scene, sp)) return off();
    if (now < next) return;
    next = now + 40;
    const p = partner !== undefined && scene.stage.has(partner) ? scene.sprite(partner) : null;
    if (m.mode === 'talk') {
      const f = 1 + Math.floor(Math.random() * 3);
      set(sp, f);
      if (p) set(p, f);
      if (!busy()) m.mode = 'stopped';
    }
    if (m.mode === 'stopped') {
      set(sp, 1);
      if (p) set(p, 1);
    }
  });
  return m;
}

// ------------------------------------------------------------------ Two-State Animation (Shared BS7) driven by myMode
export interface TwoStateAnim {
  readonly state: 'state1' | 'state2';
  forward(): void;
  backward(): void;
  /** resolves when the running animation has stopped */
  done(): Promise<void>;
}

/**
 * Two-State Animation with pStartMode #stopped (no loop): `myMode = #forward` plays pFirstMember ->
 * pLastMember with pFrameRate and ends in #state2, `#backward` back to #state1.
 */
export function twoStateAnim(scene: OrigScene, ch: number): TwoStateAnim {
  const sp = scene.stage.has(ch) ? scene.sprite(ch) : null;
  const p = sp?.behavior('Two-State Animation')?.params;
  const seq = sp && p ? scene.movie.sequence(ref(scene, sp, p.pFirstMember) ?? '', ref(scene, sp, p.pLastMember) ?? '') : [];
  const wait = 1000 / (+(p?.pFrameRate ?? 25) || 25);
  let i = 0;
  let mode: LoopMode = 'stopped';
  let state: 'state1' | 'state2' = 'state1';
  let waiters: (() => void)[] = [];
  let last = 0;
  const stop = () => {
    mode = 'stopped';
    const w = waiters;
    waiters = [];
    w.forEach((f) => f());
  };
  if (sp && seq.length > 1) {
    const off = scene.onTick((now) => {
      if (!onStage(scene, sp)) {
        off();
        return stop();
      }
      if (mode === 'stopped' || now < last + wait) return;
      last = now;
      if (mode === 'forward') {
        if (i < seq.length - 1) i++;
        sp.setMember(seq[i]);
        if (i === seq.length - 1) {
          state = 'state2';
          stop();
        }
      } else {
        if (i > 0) i--;
        sp.setMember(seq[i]);
        if (i === 0) {
          state = 'state1';
          stop();
        }
      }
    });
  }
  return {
    get state() {
      return state;
    },
    forward() {
      if (seq.length > 1) mode = 'forward';
    },
    backward() {
      if (seq.length > 1) mode = 'backward';
    },
    done: () => (mode === 'stopped' ? Promise.resolve() : new Promise<void>((r) => waiters.push(r))),
  };
}

// ------------------------------------------------------------------ CuePassed
/**
 * Cue points of the voice members used by these movies (cupt chunks of the original casts, times in
 * ms from the start of the sound). Extracted from analysis/chunks/<Movie>/…/cupt-*.bin.
 */
export const CUES: Record<string, [number, string][]> = {
  'GS044-01/BossTalk-1': [[0, 'UO'], [193, 'PB'], [348, 'A'], [722, 'UO'], [1335, 'UO']],
  'GS044-01/BossTalk-2': [[148, 'UO'], [394, 'A'], [541, 'PB'], [618, 'A'], [790, 'A'], [902, 'PB'], [1062, 'I']],
  'GS044-01/BossTalk-3': [[79, 'I'], [216, 'UO'], [1026, 'A'], [1248, 'PB'], [1399, 'I'], [1536, 'A'], [1644, 'PB'], [1793, 'I']],
  'GS044-01/BossTalk-4': [[0, 'I'], [174, 'A'], [380, 'PB'], [446, 'I'], [794, 'UO'], [1267, 'UO'], [1479, 'A'], [1720, 'PB'], [1881, 'A'], [2010, 'A']],
  'GS044-01/BossTalk-5': [[59, 'UO'], [271, 'I'], [441, 'UO'], [655, 'PB'], [745, 'A'], [1049, 'I'], [1213, 'A'], [1403, 'PB'], [1538, 'A'], [1681, 'A']],
  'GS044-01/BossTalk-6': [[0, 'UO'], [722, 'A'], [1079, 'A'], [1234, 'PB'], [1325, 'I']],
  'GS044-01/BossTalk-7': [[227, 'UO'], [634, 'UO'], [1356, 'A'], [1713, 'A'], [1919, 'PB'], [1985, 'I']],
  'GS044-01/BossTalk-8': [[83, 'UO'], [268, 'I']],
  'GS044-01/BossTalk-9': [[0, 'I'], [323, 'UO'], [797, 'UO'], [1203, 'UO'], [1911, 'A']],
  'GS044-01/BossTalk-10': [
    [107, 'UO'], [435, 'I'], [1274, 'UO'], [1491, 'I'], [1660, 'A'], [1796, 'PB'], [2002, 'UI'], [3500, 'I'], [4408, 'A'],
    [5552, 'UO'], [6019, 'A'], [6312, 'UO'], [6916, 'UO'], [7082, 'A'], [7607, 'A'], [8547, 'I'], [8748, 'A'], [9049, 'UO'],
    [10071, 'UO'], [11241, 'PB'], [11488, 'I'], [11615, 'A'], [11821, 'UO'], [11964, 'I'], [12265, 'PB'], [12977, 'I'],
    [13904, 'UO'], [15174, 'UO'], [15621, 'I'], [15865, 'UO'], [16538, 'A'], [17319, 'UO'], [17687, 'I'],
  ],
  'AS050-02/Story': [[14535, 'Bingo']],
  'AS050-07/Story': [
    [23, 'Bingo'], [673, 'Bingo Stop'], [1857, 'Bingo'], [4226, 'Bingo Stop'], [4760, 'Gold'], [7215, 'Gold Stop'], [8359, 'Bingo'],
    [11099, 'Puck'], [14489, 'Bingo'], [16718, 'Bingo Stop'], [18250, 'Arnold'], [26505, 'Arnold'], [26505, 'Arnold Stop'], [30243, 'Bingo'],
  ],
  'AS050-12/Story': [[4969, 'Bingo'], [7569, 'Puck'], [9891, 'Bingo'], [11284, 'Bingo Stop'], [11935, 'Bingo'], [14442, 'Bingo Stop'], [21757, 'Both']],
};

/**
 * characterTalk(member, 100, 0) (not blocking, like the original: no Wait cursor) + the movie's
 * `on CuePassed` handler. The cue clock starts when the voice channel actually starts playing.
 */
export function cueTalk(scene: OrigScene, member: string, onCue: (name: string) => void, opts: { speaker?: string; mixing?: number } = {}): Promise<void> {
  const cues = CUES[`${scene.id}/${member}`] ?? [];
  let t0 = -1;
  let i = 0;
  const off = scene.onTick((now) => {
    if (t0 < 0) {
      if (!scene.talking) return;
      t0 = now;
    }
    while (i < cues.length && now - t0 >= cues[i][0]) onCue(cues[i++][1]);
  });
  return scene.talk(member, { speaker: opts.speaker ?? '', mixing: opts.mixing, block: false }).finally(off);
}

/**
 * soundBusy(4) for script logic: the web voice starts asynchronously (loading), so a line counts as
 * busy from the call until its promise settles (end, replaced or missing).
 */
export function voiceTracker(scene: OrigScene) {
  let pending = 0;
  return {
    track(p: Promise<void>): Promise<void> {
      pending++;
      return p.finally(() => pending--);
    },
    busy: () => pending > 0 || scene.talking,
  };
}

// ------------------------------------------------------------------ rotation
/** sprite.rotation (degrees, around the registration point) */
export function setRotation(sp: Sprite, deg: number): void {
  sp.el.style.transformOrigin = `${sp.locH - sp.left}px ${sp.locV - sp.top}px`;
  sp.el.style.transform = deg % 360 ? `rotate(${deg}deg)` : '';
}

/** sprite.rect of a rotated sprite (bounding box of the rotated rectangle) */
export function rotatedRect(sp: Sprite, deg: number) {
  const r = sp.rect();
  const a = (deg * Math.PI) / 180;
  const c = Math.cos(a), s = Math.sin(a);
  const xs: number[] = [], ys: number[] = [];
  for (const [x, y] of [[r.left, r.top], [r.right, r.top], [r.left, r.bottom], [r.right, r.bottom]]) {
    const dx = x - sp.locH, dy = y - sp.locV;
    xs.push(Math.round(sp.locH + dx * c - dy * s));
    ys.push(Math.round(sp.locV + dx * s + dy * c));
  }
  return { left: Math.min(...xs), top: Math.min(...ys), right: Math.max(...xs), bottom: Math.max(...ys) };
}

export function intersects(a: { left: number; top: number; right: number; bottom: number }, b: { left: number; top: number; right: number; bottom: number }) {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
}

export function inside(x: number, y: number, r: { left: number; top: number; right: number; bottom: number }) {
  return x >= r.left && x < r.right && y >= r.top && y < r.bottom;
}

// ------------------------------------------------------------------ DOM overlay inside the stage
export function overlay(scene: OrigScene, x: number, y: number, w: number, h: number, css = ''): HTMLDivElement {
  const el = document.createElement('div');
  el.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;z-index:300;${css}`;
  for (const ev of ['pointerdown', 'pointerup', 'pointermove', 'click']) el.addEventListener(ev, (e) => e.stopPropagation());
  scene.stage.inner.append(el);
  return el;
}

// ------------------------------------------------------------------ baKeyIsDown(37..40)
export interface ArrowKeys {
  /** baKeyIsDown(code) for 37 left, 38 up, 39 right, 40 down */
  isDown(code: number): boolean;
  destroy(): void;
}

/**
 * Arrow keys (keyboard) + an on-screen pad (mouse / touch: press and hold = key held) placed at
 * x/y in scene coordinates (800x448 view).
 */
export function arrowKeys(scene: OrigScene, x: number, y: number): ArrowKeys {
  const down = new Set<number>();
  const pad = new Set<number>();
  const map: Record<string, number> = { ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40 };
  const onKey = (e: KeyboardEvent) => {
    const c = map[e.key];
    if (!c || !scene.alive) return;
    if ((e.target as HTMLElement | null)?.closest?.('input,textarea,select,dialog')) return;
    e.preventDefault();
    if (e.type === 'keydown') down.add(c);
    else down.delete(c);
  };
  const blur = () => {
    down.clear();
    pad.clear();
  };
  window.addEventListener('keydown', onKey);
  window.addEventListener('keyup', onKey);
  window.addEventListener('blur', blur);
  const box = overlay(scene, x, y, 186, 124, 'display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(2,1fr);gap:6px;touch-action:none;user-select:none;-webkit-user-select:none');
  const btn = (code: number, txt: string, label: string, col: number, row: number) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = txt;
    b.setAttribute('aria-label', label);
    b.style.cssText = `grid-column:${col};grid-row:${row};font-size:30px;line-height:1;border-radius:14px;border:2px solid rgba(255,255,255,.75);background:rgba(0,30,60,.35);color:#fff;touch-action:none;padding:0`;
    const on = (e: PointerEvent) => {
      e.preventDefault();
      b.setPointerCapture?.(e.pointerId);
      pad.add(code);
    };
    const off = () => pad.delete(code);
    b.addEventListener('pointerdown', on);
    b.addEventListener('pointerup', off);
    b.addEventListener('pointercancel', off);
    b.addEventListener('lostpointercapture', off);
    b.addEventListener('contextmenu', (e) => e.preventDefault());
    // keyboard activation of the focused button = one short key press
    b.addEventListener('click', (e) => {
      if ((e as MouseEvent).detail !== 0) return;
      pad.add(code);
      setTimeout(() => pad.delete(code), 120);
    });
    box.append(b);
  };
  btn(38, '▲', 'Pfeiltaste hoch', 2, 1);
  btn(37, '◀', 'Pfeiltaste links', 1, 2);
  btn(40, '▼', 'Pfeiltaste runter', 2, 2);
  btn(39, '▶', 'Pfeiltaste rechts', 3, 2);
  return {
    isDown: (c) => down.has(c) || pad.has(c),
    destroy() {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
      window.removeEventListener('blur', blur);
      box.remove();
    },
  };
}

/** Rollover Fader (pFadeLow -> pFadeHigh on mouseEnter / back on mouseLeave) for a sprite */
export function rolloverFader(scene: OrigScene, ch: number): void {
  if (!scene.stage.has(ch)) return;
  const sp = scene.sprite(ch);
  const p = sp.behavior('Rollover Fader')?.params ?? { pFadeLow: 50, pFadeHigh: 100 };
  const lo = +p.pFadeLow || 0, hi = +p.pFadeHigh || 100;
  sp.blend = lo;
  sp.hitHidden = true; // blend 0 buttons stay clickable (Lingo)
  scene.on(ch, 'mouseEnter', () => (sp.blend = hi));
  scene.on(ch, 'mouseLeave', () => (sp.blend = lo));
}
