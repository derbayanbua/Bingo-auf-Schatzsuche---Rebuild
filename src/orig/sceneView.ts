// Scene view with the ORIGINAL graphics: background + all score sprites of an AS/GS movie at their
// original positions, driven by the generic scene engine (engine.ts / generic.ts) and by optional
// per-scene ports registered with registerOrigScene().
//
// Generic behaviours handled here:
//   Two-State Handling  -> member pFirstMember/pLastMember per state, animates Base-N forward/backward
//   Inventar im Adventurescreen -> item sprite visible while the engine object is visible
//   Character Visibility -> Bingo/Puck parts only when chars[CHx].screen === scene
//   Random Two-State Animation, Animation Random Visible, Animation Random-Delay Factor-Play,
//   Two-State Animation (loop/pendulum) -> idle animations (blinking, arms, shoes, pendulum …)
//   Hotspot-AS/SP/GS, Box, Inventar Game Preference … -> click areas of the engine objects
// Engine objects without a score sprite (hand-written additions, GS "Zurück") are drawn as SVG on top.

import { isVisible, objState, type SceneCtx, type SceneDef, type SceneObject } from '../scenes/engine';
import { RAW_SCENES } from '../scenes/generic';
import { loadMovie, Stage, type Behavior, type MemberRef, type Movie, type Sprite, type SpriteEvent, type SpriteHandler } from './stage';

export interface OrigSceneHost {
  def: SceneDef;
  ctx: SceneCtx;
  /** the app's default click / drop handling for an engine object (re-syncs the view afterwards) */
  activate(o: SceneObject): void;
  /** true while the app blocks input (animations, NPC turns) */
  isBusy(): boolean;
  persist(): void;
}

export interface OrigScene {
  readonly id: string;
  readonly movie: Movie;
  readonly stage: Stage;
  readonly el: HTMLElement;
  readonly ctx: SceneCtx;
  /** sprite(ch) */
  sprite(ch: number): Sprite;
  /** member("Name") through the castLib order */
  member(name: string): MemberRef | null;
  /** add a pointer handler for a channel (marks it hot). Returns an unsubscribe function. */
  on(ch: number, ev: SpriteEvent, fn: SpriteHandler): () => void;
  /** remove all handlers of a channel (e.g. to replace the generic behaviour) */
  off(ch: number): void;
  /** play Base-a..Base-b (names or refs) on a channel at fps; resolves at the end */
  playSequence(ch: number, first: string | MemberRef, last: string | MemberRef, fps?: number, opts?: { loop?: boolean; pendulum?: boolean }): Promise<void>;
  /** prepareFrame-style callback; auto-removed on destroy */
  onTick(fn: (now: number, dt: number) => void): () => void;
  wait(ms: number): Promise<void>;
  /** readData/writeData on the scene field (game sceneState); set() persists */
  state: { get(key: string, screen?: string): string | undefined; set(key: string, value: string, screen?: string): void };
  /** item in the hand (sprite 110) */
  readonly hand: string | null;
  consumeHand(): void;
  /** go to another AS/GS movie */
  goto(movie: string): void;
  gotoBoard(board: string, pos: number, dir: number): void;
  say(text: string): void;
  /** engine object by state key (OH1, OS16, HS2 …) */
  object(key: string): SceneObject | undefined;
  /** score channel of an engine object */
  channelOf(key: string): number | undefined;
  /** re-apply engine state to the sprites (called by the app after every interaction) */
  sync(): void;
  destroy(): void;
  readonly alive: boolean;
}

export type OrigSceneSetup = (scene: OrigScene) => void | (() => void);
const SETUPS = new Map<string, OrigSceneSetup[]>();

/** Register per-scene Lingo ports that run on top of the generic original view. */
export function registerOrigScene(id: string, setup: OrigSceneSetup) {
  const l = SETUPS.get(id) ?? [];
  l.push(setup);
  SETUPS.set(id, l);
}

/** true if the scene has an original score (sync check against the loaded index is done in mount) */
export async function hasOrigScene(id: string): Promise<boolean> {
  return !!(await loadMovie(id));
}

const SCENE_TOP = 45;
const SCENE_BOTTOM = 493;

function isSceneSprite(dir: string | null, s: { ch: number; top: number; height: number; behaviors: Behavior[] }): boolean {
  if (dir === 'Shared_Interface' || s.ch >= 110) return false;
  if (s.behaviors.some((b) => /^(Inventar im Inventar|Inventar in der Hand|Cursor)$/.test(b.name))) return false;
  if (s.top + s.height <= SCENE_TOP || s.top >= SCENE_BOTTOM) return false;
  return true;
}

function rnd(a: number, b: number) {
  const lo = Math.min(a, b), hi = Math.max(a, b);
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

/**
 * Mount the original-graphics view into `host`. Resolves to null when no originals exist for the
 * scene (caller falls back to the vector renderer).
 */
export async function mountOrigScene(host: HTMLElement, h: OrigSceneHost): Promise<OrigScene | null> {
  const { def, ctx } = h;
  const loaded = await loadMovie(def.id);
  if (!loaded || !loaded.frame(1)) return null;
  const movie: Movie = loaded;
  const stage = new Stage({ originY: SCENE_TOP, className: 'scene-orig' });
  stage.cursorCh = ctx.ch === 'CH2' ? 'CH2' : 'CH1';
  const frame = movie.frame(1)!;
  const sprites = await stage.loadFrame(movie, 1, (s) => isSceneSprite(movie.libs[s.castLib - 1], s));
  if (!sprites.length) {
    stage.destroy();
    return null;
  }
  const raw = RAW_SCENES[def.id];
  const keyToCh = new Map<string, number>();
  for (const o of raw?.objects ?? []) keyToCh.set(o.key, o.ch);
  const chToObj = new Map<number, SceneObject>();
  for (const o of def.objects) {
    const ch = keyToCh.get(o.key);
    if (ch !== undefined && stage.has(ch)) chToObj.set(ch, o);
  }
  void frame;

  const cleanups: (() => void)[] = [];
  const shownState = new Map<number, string>(); // twoState channel -> state shown
  let alive = true;

  // ------------------------------------------------------------ SVG layer for sprite-less objects
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 800 448');
  svg.setAttribute('class', 'ostage-svg');
  stage.inner.append(svg);
  svg.addEventListener('pointerdown', (e) => e.stopPropagation());
  svg.addEventListener('pointerup', (e) => e.stopPropagation());
  svg.addEventListener('click', (e) => {
    const g = (e.target as Element).closest('[data-key]') as SVGGElement | null;
    const o = g && def.objects.find((x) => x.key === g.dataset.key);
    if (o && !h.isBusy()) h.activate(o);
  });

  // accessible buttons (keyboard / screen reader); pointer goes through to the stage
  const a11y = document.createElement('div');
  a11y.className = 'ostage-a11y';
  stage.el.append(a11y);

  // ------------------------------------------------------------ generic behaviours
  const twoState = new Map<number, { first: MemberRef | null; last: MemberRef | null; fps: number; key: string }>();
  for (const sp of sprites) {
    const ths = sp.behavior('Two-State Handling');
    if (ths) {
      const p = ths.params;
      twoState.set(sp.ch, {
        first: p.pFirstMember ? movie.memberAt(p.pFirstMember.castLib || 1, p.pFirstMember.member) : null,
        last: p.pLastMember ? movie.memberAt(p.pLastMember.castLib || 1, p.pLastMember.member) : null,
        fps: +p.pFrameRate || 25,
        key: `OH${p.pId}`,
      });
    }
    // engine objects -> clicks
    const o = chToObj.get(sp.ch);
    if (o) {
      stage.on(sp.ch, 'mouseUp', () => {
        if (!h.isBusy()) h.activate(o);
      });
      sp.cursor = o.kind === 'item' ? 'take' : o.kind === 'exit' || o.kind === 'boardExit' || o.kind === 'game' ? 'walk' : 'make';
    }
    attachIdle(sp);
  }

  function attachIdle(sp: Sprite) {
    for (const b of sp.behaviors) {
      const p = b.params ?? {};
      const fps = +p.pFrameRate || 25;
      const ref = (r: any) => (r && typeof r === 'object' ? movie.memberAt(r.castLib || sp.member?.castLib || 1, r.member) : null);
      if (b.name === 'Random Two-State Animation') {
        const seq = movie.sequence(ref(p.pFirstMember) ?? '', ref(p.pLastMember) ?? '');
        if (seq.length < 2) continue;
        let atEnd = false;
        let busy = false;
        let next = performance.now() + rnd(p.pState1WaitMin ?? 0, p.pState1WaitMax ?? 5000);
        cleanups.push(stage.onTick((now) => {
          if (busy || now < next || !sp.visible) return;
          busy = true;
          void stage.playMembers(sp.ch, atEnd ? [...seq].reverse() : seq, fps).then(() => {
            atEnd = !atEnd;
            busy = false;
            next = performance.now() + (atEnd ? rnd(p.pState2WaitMin ?? 0, p.pState2WaitMax ?? 5000) : rnd(p.pState1WaitMin ?? 0, p.pState1WaitMax ?? 5000));
          });
        }));
      } else if (b.name === 'Animation Random-Delay Factor-Play') {
        const seq = movie.sequence(ref(p.pFirstMember) ?? '', ref(p.pLastMember) ?? '');
        if (seq.length < 2) continue;
        let busy = false;
        let next = performance.now() + rnd(p.pWaitMin ?? 0, p.pWaitMax ?? 5000);
        const there = [...seq, ...[...seq].reverse().slice(1)];
        cleanups.push(stage.onTick((now) => {
          if (busy || now < next || !sp.visible) return;
          busy = true;
          const n = rnd(p.pFactorMin ?? 1, p.pFactorMax ?? 3);
          const all: MemberRef[] = [];
          for (let i = 0; i < n; i++) all.push(...(i ? there.slice(1) : there));
          void stage.playMembers(sp.ch, all, fps).then(() => {
            busy = false;
            next = performance.now() + rnd(p.pWaitMin ?? 0, p.pWaitMax ?? 5000);
          });
        }));
      } else if (b.name === 'Animation Random Visible') {
        let on = p.pStartMode === '#visible';
        sp.blend = on ? 100 : 0;
        let next = performance.now() + (on ? rnd(p.pMinVisible ?? 100, p.pMaxVisible ?? 500) : rnd(p.pMinInvisible ?? 2000, p.pMaxInvisible ?? 5000));
        cleanups.push(stage.onTick((now) => {
          if (now < next) return;
          on = !on;
          sp.blend = on ? 100 : 0;
          next = now + (on ? rnd(p.pMinVisible ?? 100, p.pMaxVisible ?? 500) : rnd(p.pMinInvisible ?? 2000, p.pMaxInvisible ?? 5000));
        }));
      } else if (b.name === 'Two-State Animation') {
        if (p.pStartMode === '#forward' || p.pStartMode === '#backward' || p.pLoop) {
          const seq = movie.sequence(ref(p.pFirstMember) ?? '', ref(p.pLastMember) ?? '');
          if (seq.length > 1) void stage.playMembers(sp.ch, p.pStartMode === '#backward' ? seq.reverse() : seq, fps, { loop: !!p.pLoop, pendulum: !!p.pPendulum });
        }
      }
    }
  }

  // ------------------------------------------------------------ state -> sprites
  function sync() {
    if (!alive) return;
    stage.cursorCh = ctx.ch === 'CH2' ? 'CH2' : 'CH1';
    stage.cursorOverride = ctx.hand ? 'grabbing' : null;
    for (const sp of sprites) {
      const cv = sp.behavior('Character Visibility');
      if (cv) {
        const id = String(cv.params.pCharacterID ?? '') as keyof typeof ctx.s.chars;
        sp.visible = ctx.s.chars[id]?.screen === def.id;
      }
      const o = chToObj.get(sp.ch);
      if (o) {
        const vis = isVisible(ctx, def, o);
        const interactive = o.kind !== 'deco' || !!o.onClick;
        if (o.kind === 'item') sp.visible = vis;
        sp.hot = vis && interactive;
      }
      const ts = twoState.get(sp.ch);
      if (ts) {
        const st = ctx.get(ts.key) ?? 'state1';
        const prev = shownState.get(sp.ch);
        const target = st === 'state2' ? ts.last : ts.first;
        if (prev === undefined || !ts.first || !ts.last) {
          if (target) sp.setMember(target);
        } else if ((prev === 'state2') !== (st === 'state2')) {
          void stage.playSequence(sp.ch, st === 'state2' ? ts.first : ts.last, st === 'state2' ? ts.last : ts.first, ts.fps);
        }
        shownState.set(sp.ch, st);
      }
    }
    // sprite-less engine objects -> SVG
    let markup = '';
    a11y.replaceChildren();
    for (const o of def.objects) {
      if (!isVisible(ctx, def, o)) continue;
      const interactive = o.kind !== 'deco' || !!o.onClick;
      const ch = keyToCh.get(o.key);
      const onStage = ch !== undefined && stage.has(ch);
      if (!onStage) {
        const art = o.draw ? o.draw(ctx, objState(ctx, o)) : '';
        markup += `<g class="obj${interactive ? ' hot' : ''}" data-key="${esc(o.key)}">${art}${interactive ? `<rect x="${o.x}" y="${o.y}" width="${o.w}" height="${o.h}" rx="10" class="hit"/>` : ''}<title>${esc(o.label)}</title></g>`;
      }
      if (interactive) {
        const sp = onStage ? stage.sprite(ch!) : null;
        const r = sp && sp.w ? { x: sp.left, y: sp.top - SCENE_TOP, w: sp.w, h: sp.h } : { x: o.x, y: o.y, w: o.w, h: o.h };
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'ostage-btn';
        b.setAttribute('aria-label', o.label);
        b.title = o.label;
        b.style.cssText = `left:${(r.x / 8).toFixed(2)}%;top:${((r.y / 448) * 100).toFixed(2)}%;width:${(r.w / 8).toFixed(2)}%;height:${((r.h / 448) * 100).toFixed(2)}%`;
        b.addEventListener('click', (e) => {
          if (e.detail !== 0) return; // pointer clicks are handled by the stage hit test
          if (!h.isBusy()) h.activate(o);
        });
        a11y.append(b);
      }
    }
    svg.innerHTML = markup;
    stage.updateCursor();
  }

  const scene: OrigScene = {
    id: def.id,
    movie,
    stage,
    el: stage.el,
    ctx,
    sprite: (ch) => stage.sprite(ch),
    member: (name) => movie.member(name),
    on: (ch, ev, fn) => stage.on(ch, ev, fn),
    off: (ch) => stage.off(ch),
    playSequence: (ch, a, b, fps, opts) => stage.playSequence(ch, a, b, fps, opts),
    onTick: (fn) => {
      const off = stage.onTick(fn);
      cleanups.push(off);
      return off;
    },
    wait: (ms) => stage.wait(ms),
    state: {
      get: (k, screen) => ctx.get(k, screen),
      set: (k, v, screen) => {
        ctx.set(k, v, screen);
        h.persist();
      },
    },
    get hand() {
      return ctx.hand;
    },
    consumeHand: () => ctx.consumeHand(),
    goto: (m) => ctx.gotoScene(m.replace(/^[A-Za-z]+_/, '')),
    gotoBoard: (b, p, d) => ctx.gotoBoard(b, p, d),
    say: (t) => ctx.say(t),
    object: (key) => def.objects.find((o) => o.key === key),
    channelOf: (key) => keyToCh.get(key),
    sync,
    destroy() {
      if (!alive) return;
      alive = false;
      for (const c of cleanups) c();
      stage.destroy();
    },
    get alive() {
      return alive && stage.alive;
    },
  };

  sync();
  for (const setup of SETUPS.get(def.id) ?? []) {
    const c = setup(scene);
    if (typeof c === 'function') cleanups.push(c);
  }
  host.append(stage.el);
  return scene;
}

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}
