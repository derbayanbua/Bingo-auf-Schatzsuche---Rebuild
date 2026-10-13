// Shared helpers for the chapter-1 ports (pub, Witzomat, café, fishing).
// No registerOrigScene() here – this module is only imported by the ports.
//
// Some original effects (showInventar after a coin/joke/item change, jumpToCurrentCharacter without
// the Hotspot-SP "field occupied" check) need the app controller; it is reachable as window.bingo.
// [Prüfung erforderlich] A public App hook (e.g. ctx.refreshHud()/ctx.jumpToCurrent()) would be cleaner.

import type { CharId, GameState } from '../../game/types';
import { BOARDS, pointId } from '../../game/data';
import { checkPointFree, checkPointTyp } from '../../game/logic';
import { getScene } from '../../scenes/engine';
import type { OrigScene } from '../sceneView';
import { playInventarSound } from '../sound';

/** the App instance (main.ts: window.bingo) */
function app(): any {
  return (globalThis as any).bingo ?? null;
}

/** showInventar(): redraw the HUD (coins, jokes, pocket) */
export function showInventar(): void {
  try {
    app()?.renderHud?.();
    app()?.persist?.(); // stopMovie: save(castLib("Active"))
  } catch {
    /* ignore */
  }
}

/** sprite(110).myMode = #aboutToReturn: the held item goes back to its source */
export function returnHand(): void {
  app()?.returnHand?.();
}

/** inventarSound(OIxxx) */
export function inventarSound(id: string): void {
  void playInventarSound(id);
}

/** the scene's Lingo is ported: drop the generic "[Prüfung erforderlich] not reconstructed" note */
export function markPorted(scene: OrigScene): void {
  const def = getScene(scene.id);
  if (def) def.reconstructed = true;
  setTimeout(() => scene.el.parentElement?.querySelector(':scope > .scene-note')?.remove(), 0);
}

export function rnd(a: number, b: number): number {
  const lo = Math.min(a, b), hi = Math.max(a, b);
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

/** Lingo random(n) = 1..n */
export const random = (n: number) => rnd(1, n);

export function currentChar(s: GameState): CharId {
  return s.currentCharacter;
}

/**
 * placeCharacter(characterID, targetSP) (Shared Lingo): first free standard point of the board,
 * random direction, mode #random.
 */
export function placeCharacter(s: GameState, ch: CharId, board: string): void {
  const pts = BOARDS[board] ?? [];
  for (let t = 1; t <= pts.length; t++) {
    const id = pointId(board, t);
    if (checkPointFree(s, id) && checkPointTyp(id) === 'standard') {
      const c = s.chars[ch];
      c.screen = board;
      c.position = t;
      c.direction = random(4);
      c.mode = 'random';
      return;
    }
  }
}

/**
 * Taster Start/Stop of GS008-01 / GS016-01: setCharacterScreen/Position/Direction of the current
 * character, then jumpToCurrentCharacter() (no occupancy check, unlike Hotspot-SP).
 */
export function backToBoard(scene: OrigScene, board: string, pos: number, dir: number): void {
  const s = scene.ctx.s;
  const a = app();
  if (a?.showCurrent) {
    const c = s.chars[s.currentCharacter];
    c.screen = board;
    c.position = pos;
    c.direction = dir;
    a.persist?.();
    a.showCurrent();
  } else scene.gotoBoard(board, pos, dir);
}

/** show another AS movie without setCharacterScreen (Hotspot Witzomat: gTargetMovie only) */
export function showMovie(scene: OrigScene, id: string): void {
  const a = app();
  if (a?.renderScene) {
    a.renderScene(id);
  } else scene.goto(id);
}

/**
 * Game screen interface (shared GS behaviours that live in the interface bar of the original):
 * sprite 101 "Inventar Game Preference" and sprite 109 "Taster Start" / "Taster Stop".
 * The interface bar is not part of the scene view, so the button is drawn as a puppet sprite in the
 * bottom-right corner of the scene (same member Game-Back/Game-Start/Game-Stop/Game-Ready).
 */
export interface GameUi {
  /** sprite 109 member: 'Game-Back' | 'Game-Start' | 'Game-Stop' | 'Game-Ready' */
  setButton(name: string): void;
  destroy(): void;
}

export function gameInterface(scene: OrigScene, opts: { prefId: string; onStart: () => void; onBack: () => void }): GameUi {
  const BTN = 109;
  // the generic "Zurück" placeholder exit is replaced by the original buttons
  const ex = scene.object('_exit');
  if (ex) ex.visible = () => false;
  let mode: 'intro' | 'game' = 'intro';
  const sp = scene.sprite(BTN);
  scene.puppet(BTN, true);
  const setButton = (name: string) => {
    const m = scene.member(name);
    sp.setMember(m);
    // Interface bar position L710 T504 does not exist in the scene view -> bottom-right corner
    sp.setRect(718, 493 - 82, 72, 82);
    sp.cursor = 'make';
  };
  sp.blend = 50;
  const offs: (() => void)[] = [];
  // Rollover Fader 50 -> 100
  offs.push(scene.on(BTN, 'mouseEnter', () => (sp.blend = 100)));
  offs.push(scene.on(BTN, 'mouseLeave', () => (sp.blend = 50)));
  offs.push(scene.on(BTN, 'mouseDown', () => {
    if (scene.busy || scene.hand) return;
    void scene.sound('Splash', 100);
  }));
  offs.push(scene.on(BTN, 'mouseUp', () => {
    if (scene.busy || scene.hand) return;
    const n = sp.member?.name ?? '';
    if (mode === 'intro' && n === 'Game-Start') {
      mode = 'game';
      opts.onStart();
    } else opts.onBack();
  }));

  // ---- Inventar Game Preference (sprite 101, key OS101)
  const PREF = 101;
  const prefState = () => scene.state.get(`OS${PREF}`) ?? 'passiv';
  const checkPrefs = () => !scene.sprite(PREF).member || prefState() !== 'passiv';
  const syncPref = () => {
    if (mode !== 'intro') return;
    if (scene.stage.has(PREF)) scene.sprite(PREF).blend = prefState() === 'passiv' ? 50 : 100;
    setButton(checkPrefs() ? 'Game-Start' : 'Game-Back');
  };
  if (scene.stage.has(PREF)) {
    scene.sprite(PREF).cursor = 'take';
    // the slot is a 70x70 field: transparent pixels of thin items (hook) must hit too
    const r = scene.sprite(PREF).rect();
    scene.stage.onBackground = (_e, pt) => {
      if (mode === 'intro' && pt.x >= r.left && pt.x < r.right && pt.y >= r.top && pt.y < r.bottom) prefClick();
    };
    offs.push(() => (scene.stage.onBackground = null));
    offs.push(scene.on(PREF, 'mouseUp', () => prefClick()));
  }
  function prefClick() {
    {
      if (scene.busy || mode !== 'intro') return;
      const hand = scene.hand;
      if (hand) {
        if (hand === opts.prefId && prefState() === 'passiv') {
          // item dropped into the slot: consumed, stays there
          scene.consumeHand();
          scene.state.set(`OS${PREF}`, 'activ');
          inventarSound(hand);
        } else returnHand();
      } else if (prefState() === 'activ') {
        // take it out again (original: into the hand; here straight back into the pocket)
        if (scene.ctx.give(opts.prefId)) {
          scene.state.set(`OS${PREF}`, 'passiv');
          inventarSound(opts.prefId);
        }
      }
      showInventar();
      syncPref();
    }
  }
  syncPref();
  scene.sync();
  return {
    setButton: (n) => {
      mode = 'game';
      setButton(n);
    },
    destroy: () => offs.forEach((o) => o()),
  };
}
