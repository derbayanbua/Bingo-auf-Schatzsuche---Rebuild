// Generic adventure/game screen engine. A scene is a set of interactive objects whose behaviour
// mirrors the original Director behaviours (Two-State Handling, Blocker, Hotspot-AS/SP/GS,
// Inventar im Adventurescreen, Box, Inventar Game Preference). State keys and values are the
// original ones (OHn state1/state2/blocked, HSn activ/passiv, OSn activ/passiv/wait/locked).

import type { CharId, GameState } from '../game/types';

export interface SceneCtx {
  s: GameState;
  /** readData(screen, key) */
  get(key: string, screen?: string): string | undefined;
  /** writeData(screen, key, value) */
  set(key: string, value: string, screen?: string): void;
  /** item currently held in the hand (sprite 110) or null */
  hand: string | null;
  /** consume the held item (#stayHere / #destroy) */
  consumeHand(): void;
  /** put an item into the current character's pocket; false if full */
  give(item: string): boolean;
  /** current character (CH1/CH2) */
  ch: CharId;
  gotoScene(id: string): void;
  gotoBoard(board: string, pos: number, dir: number): void;
  say(text: string): void;
  /** stands in for an original Smacker video: shows a short illustrated story card */
  story(title: string, text: string): Promise<void>;
  rerender(): void;
  addCoins(n: number): void;
  addJokes(n: number): void;
}

export type ObjKind = 'item' | 'twoState' | 'exit' | 'boardExit' | 'game' | 'npc' | 'use' | 'box' | 'deco';

export interface SceneObject {
  /** state key in the scene field, e.g. OS16, OH2, HS1 (or a free id for deco/npc) */
  key: string;
  kind: ObjKind;
  /** rectangle in the 800x448 scene space */
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  /** item id for 'item' objects */
  item?: string;
  /** exit target scene ('exit'/'game') */
  to?: string;
  board?: { board: string; pos: number; dir: number };
  /** key of a twoState object that must be in state2 for this object to be usable (pHandlingObject) */
  handling?: string;
  /** Blocker: item that locks/unlocks a twoState object */
  lockItem?: string;
  /** item hidden behind this object (pHiddenSprite): key of the hidden item object */
  hides?: string;
  /** link a twoState object to the same object in another screen (pLinkToScreen/pLinkToObject) */
  link?: { screen: string; key: string };
  /** visual hint for the generic renderer */
  icon?: string;
  /** custom click handler; return true when handled */
  onClick?(ctx: SceneCtx): boolean | void;
  /** custom drop handler for the held item; return true when accepted */
  onUse?(ctx: SceneCtx, item: string): boolean | void;
  visible?(ctx: SceneCtx): boolean;
  /** custom SVG for the object (drawn in object space x,y,w,h) */
  draw?(ctx: SceneCtx, state: string | undefined): string;
}

export interface SceneDef {
  id: string;
  title: string;
  /** SVG markup for the 800x448 backdrop */
  backdrop(ctx: SceneCtx): string;
  /** SVG drawn above the objects (characters, foreground) */
  overlay?(ctx: SceneCtx): string;
  objects: SceneObject[];
  onEnter?(ctx: SceneCtx): void | Promise<void>;
  /** true if the scene logic is reconstructed from the original (false = placeholder) */
  reconstructed: boolean;
  note?: string;
}

const registry = new Map<string, SceneDef>();
export function registerScene(def: SceneDef) {
  registry.set(def.id, def);
}
export function getScene(id: string): SceneDef | undefined {
  return registry.get(id);
}
export function allScenes(): SceneDef[] {
  return [...registry.values()];
}

/** Current value of an object's state, applying the original defaults. */
export function objState(ctx: SceneCtx, o: SceneObject): string | undefined {
  const v = ctx.get(o.key);
  if (v !== undefined) return v;
  if (o.kind === 'twoState') return 'state1';
  if (o.kind === 'exit' || o.kind === 'game') return 'activ';
  if (o.kind === 'item') return 'activ';
  return undefined;
}

export function isVisible(ctx: SceneCtx, def: SceneDef, o: SceneObject): boolean {
  if (o.visible && !o.visible(ctx)) return false;
  if (o.kind === 'item') {
    const st = objState(ctx, o);
    if (st !== 'activ' && st !== 'locked') return false;
    // hidden behind another item that is still lying there
    const cover = def.objects.find((c) => c.hides === o.key);
    if (cover && objState(ctx, cover) === 'activ') return false;
  }
  if (o.handling) {
    const ho = def.objects.find((x) => x.key === o.handling);
    if (ho && objState(ctx, ho) !== 'state2') return false;
  }
  if ((o.kind === 'exit' || o.kind === 'game') && objState(ctx, o) === 'passiv') return false;
  return true;
}

/** Default interaction of the generic behaviours. Returns a message key or null. */
export function defaultClick(ctx: SceneCtx, def: SceneDef, o: SceneObject): void {
  if (o.onClick && o.onClick(ctx)) return;
  const st = objState(ctx, o);
  switch (o.kind) {
    case 'item':
      if (st === 'locked') {
        ctx.say('Das kann ich nicht mitnehmen.');
        return;
      }
      if (!ctx.give(o.item!)) {
        ctx.say('Meine Hosentasche ist voll!');
        return;
      }
      ctx.set(o.key, 'passiv');
      return;
    case 'twoState': {
      if (st === 'blocked') {
        ctx.say('Verschlossen.');
        return;
      }
      const next = st === 'state2' ? 'state1' : 'state2';
      ctx.set(o.key, next);
      if (o.link) ctx.set(o.link.key, next, o.link.screen);
      return;
    }
    case 'exit':
    case 'game':
      if (o.to) ctx.gotoScene(o.to);
      return;
    case 'boardExit':
      if (o.board) ctx.gotoBoard(o.board.board, o.board.pos, o.board.dir);
      return;
    default:
      return;
  }
}

/** Default handling when the held item is dropped on an object. */
export function defaultUse(ctx: SceneCtx, def: SceneDef, o: SceneObject, item: string): boolean {
  if (o.onUse) {
    const r = o.onUse(ctx, item);
    if (r !== undefined) return !!r;
  }
  if (o.kind === 'twoState' && o.lockItem && o.lockItem === item) {
    // Blocker: toggle blocked <-> state1, the key returns to the pocket
    const st = objState(ctx, o);
    const next = st === 'blocked' ? 'state1' : 'blocked';
    if (st !== 'blocked' && st !== 'state1') return false;
    ctx.set(o.key, next);
    if (o.link) ctx.set(o.link.key, next, o.link.screen);
    ctx.say(next === 'blocked' ? 'Abgeschlossen.' : 'Aufgeschlossen!');
    return false; // key goes back
  }
  return false;
}
