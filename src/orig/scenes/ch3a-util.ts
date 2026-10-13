// Shared helpers of the chapter-3 (part A) ports: ch3a-*.ts. Registers no scene.

import { getScene } from '../../scenes/engine';
import type { OrigScene } from '../sceneView';
import type { MemberRef, Sprite } from '../stage';

/** Lingo random(a, b) inclusive / random(n) = 1..n */
export const rnd = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));
export const random = (n: number) => rnd(1, n);

/** the scene's local Lingo is ported: no "[Prüfung erforderlich] not reconstructed" note */
export function markPorted(scene: OrigScene): void {
  const def = getScene(scene.id);
  if (def) def.reconstructed = true;
  setTimeout(() => scene.el.parentElement?.querySelector(':scope > .scene-note')?.remove(), 0);
}

/**
 * readData with Lingo semantics: field keys compare case-insensitively (AS035-01 has "water,passiv"
 * in Data_Default while GS032-02/AS039-01 use "WATER"). Returns the lower-cased symbol.
 */
export function readCI(scene: OrigScene, key: string, screen = scene.id): string | undefined {
  const f = scene.ctx.s.sceneState[screen];
  if (!f) return undefined;
  const k = Object.keys(f).find((x) => x.toLowerCase() === key.toLowerCase());
  return k === undefined ? undefined : f[k].toLowerCase();
}

/** writeData: replaces an existing line with the same key (any case), else appends `key` */
export function writeCI(scene: OrigScene, key: string, value: string, screen = scene.id): void {
  const f = scene.ctx.s.sceneState[screen] ?? {};
  const k = Object.keys(f).find((x) => x.toLowerCase() === key.toLowerCase()) ?? key;
  scene.state.set(k, value, screen);
}

/** "Base-12" -> ["Base", 12] */
export function memberNum(sp: Sprite): [string, number] {
  const n = sp.member?.name ?? '';
  const i = n.lastIndexOf('-');
  return [n.slice(0, i), parseInt(n.slice(i + 1), 10) || 0];
}

/** sprite.member = member(base & "-" & n) */
export function setFrame(sp: Sprite, base: string, n: number): void {
  sp.setMember(`${base}-${n}`);
}

/** Director sprite intersects (rects) */
export function intersects(a: Sprite, b: Sprite): boolean {
  const r = a.rect(), s = b.rect();
  return r.left < s.right && s.left < r.right && r.top < s.bottom && s.top < r.bottom;
}

/**
 * Movie-Loop (Shared Lingo 10) of the score sprites currently on stage: Base-first..last at
 * pFrameRate, #forward / #backward (wraps), #stopped. Not handled by the generic scene view.
 */
export function movieLoops(scene: OrigScene, only?: number[]): void {
  for (const sp of [...scene.stage.sprites.values()]) {
    if (only && !only.includes(sp.ch)) continue;
    const p = sp.behavior('Movie-Loop')?.params;
    if (!p || p.pStartMode === '#stopped') continue;
    const ref = (r: any): MemberRef | null => (r && typeof r === 'object' ? scene.movie.memberAt(r.castLib || 1, r.member) : null);
    const a = ref(p.pFirstMember), b = ref(p.pLastMember);
    if (!a || !b) continue;
    let seq = scene.movie.sequence(a, b);
    if (p.pStartMode === '#backward') seq = [...seq].reverse();
    if (seq.length < 2) continue;
    // the score shows the first member; prepareFrame advances once per 1000/pFrameRate ms
    void scene.stage.playMembers(sp.ch, seq, +p.pFrameRate || 25, { loop: true });
  }
}

/**
 * prepareFrame with a millisecond gate (`if the milliSeconds < myUpdateTime then exit`): `fn` runs
 * at most once per tick and returns the next delay (ms) or null to keep the gate open (run again
 * next tick, e.g. when the Lingo exits before setting myUpdateTime).
 */
export function gate(scene: OrigScene, fn: (now: number) => number | null | void): () => void {
  let next = 0;
  return scene.onTick((now) => {
    if (now < next) return;
    const d = fn(now);
    next = typeof d === 'number' ? now + d : 0;
  });
}

export type GameButton = 'Game-Back' | 'Game-Start' | 'Game-Stop' | 'Game-Ready';

/**
 * Game screen interface: Inventar Game Preference slots 101..107 (Intro frame), sprite 109 Taster
 * Start (Game-Start when all slots != passiv, else Game-Back) / Taster Stop (Game-Stop/Game-Ready).
 * Sprite 109 lies in the interface bar of the original; the scene view only shows the scene, so it is
 * drawn as a puppet sprite in the bottom-right corner of the scene [Prüfung erforderlich: Position].
 * `onStart` runs after go(#next) reached the "Game" frame; `onLeave(member)` decides what happens on
 * Game-Back/Stop/Ready (default: back to `back`).
 */
export function gameScreen(scene: OrigScene, back: string, onStart: () => void, onLeave?: (m: GameButton) => void) {
  const ex = scene.object('_exit');
  const prevVis = ex?.visible;
  if (ex) ex.visible = () => false;
  const st = document.createElement('style');
  st.textContent = '.ostage-a11y button[aria-label="Spiel verlassen"]{display:none}';
  scene.el.append(st);
  let onGame = false;
  const prefs = [101, 102, 103, 104, 105, 106, 107].filter((ch) => scene.stage.has(ch));
  for (const ch of prefs) {
    const pId = String(scene.sprite(ch).behavior('Inventar Game Preference')?.params.pId ?? '');
    scene.prefSlot(ch, pId, { enabled: () => !onGame });
  }
  const checkPrefs = () => prefs.every((ch) => (scene.state.get(`OS${ch}`) ?? 'activ').toLowerCase() !== 'passiv');
  scene.puppet(109);
  const btn = scene.sprite(109);
  const place = (name: GameButton) => {
    if (btn.member?.name === name) return;
    btn.setMember(name);
    btn.setRect(712, 493 - (btn.h || 96));
  };
  place(checkPrefs() ? 'Game-Start' : 'Game-Back');
  btn.cursor = 'make';
  btn.blend = 50;
  // Rollover Fader
  scene.on(109, 'mouseEnter', () => (btn.blend = 100));
  scene.on(109, 'mouseLeave', () => (btn.blend = 50));
  scene.onTick(() => {
    if (!onGame) place(checkPrefs() ? 'Game-Start' : 'Game-Back');
  });
  scene.on(109, 'mouseDown', () => {
    if (!scene.busy && !scene.hand) void scene.sound('Splash', 100);
  });
  scene.on(109, 'mouseUp', () => {
    if (scene.busy || scene.hand) return;
    const m = (btn.member?.name ?? 'Game-Back') as GameButton;
    if (m === 'Game-Start' && !onGame) {
      onGame = true;
      void scene.gotoFrame('Game').then(() => {
        if (!scene.alive) return;
        place('Game-Stop');
        onStart();
      });
      return;
    }
    // Taster Start (Game-Back) / Taster Stop: setCharacterScreen(cur, gGameBackMovie); jumpToCurrentCharacter()
    if (onLeave) onLeave(m);
    else scene.goto(back);
  });
  scene.sync();
  return {
    ready: () => place('Game-Ready'),
    stop: () => place('Game-Stop'),
    get member() {
      return (btn.member?.name ?? '') as GameButton;
    },
    get onGame() {
      return onGame;
    },
    cleanup: () => {
      if (ex) ex.visible = prevVis;
    },
  };
}
