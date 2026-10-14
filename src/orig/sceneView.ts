// Scene view with the ORIGINAL graphics: background + all score sprites of an AS/GS movie at their
// original positions, driven by the generic scene engine (engine.ts / generic.ts) and by optional
// per-scene ports registered with registerOrigScene(). API documentation: src/orig/README.md.
//
// Generic behaviours handled here:
//   Two-State Handling  -> member pFirstMember/pLastMember per state, animates Base-N forward/backward
//   Two-State / One-State / Mouse / Visible / Random Audio -> the original sounds of these objects
//   Inventar im Adventurescreen -> item sprite visible while the engine object is visible; passiv =
//     blend 0 but still hit (the held item with the same pId can be put back)
//   Character Visibility -> an item dropped on Bingo/Puck is given to that figure
//   Box + Inventar in Containerbox -> box animation, frame "Box" as overlay stage with BOX1..8
//   Inventar Game Preference -> prefSlot() for every GS slot sprite
//   Character Visibility -> Bingo/Puck parts only when chars[CHx].screen === scene
//   Random Two-State Animation, Animation Random Visible, Animation Random-Delay Factor-Play,
//   Two-State Animation (loop/pendulum), One-State Handling -> idle / click animations
//   Hotspot-AS/SP/GS, Box, Inventar Game Preference … -> click areas of the engine objects
//   Music Controller / Ambient Controller -> applyMovieAudio() on mount
// Engine objects without a score sprite (hand-written additions, GS "Zurück") are drawn as SVG on top.

import type { CharId } from '../game/types';
import { isDropSpot, isVisible, objState, type HandSource, type SceneCtx, type SceneDef, type SceneObject } from '../scenes/engine';
import { RAW_SCENES } from '../scenes/generic';
import { playSmacker as playSmk, type SmackerOptions } from './media';
import { applyMovieAudio } from './movieAudio';
import { ScorePlayer } from './score';
import { isVoiceBusy, playEffect, playEffectLoop } from './sound';
import { loadMovie, Stage, type Behavior, type MemberRef, type Movie, type ScoreSprite, type Sprite, type SpriteEvent, type SpriteHandler } from './stage';
import { stopTalk, talk as voiceTalk } from './voice';

export interface OrigSceneHost {
  def: SceneDef;
  ctx: SceneCtx;
  /** the app's default click / drop handling for an engine object (re-syncs the view afterwards) */
  activate(o: SceneObject): void;
  /** true while the app blocks input (animations, NPC turns) */
  isBusy(): boolean;
  persist(): void;
}

export interface TalkOpts {
  /** mouth sprite channel (Mouth behaviour); 0/undefined = no mouth animation */
  mouthCh?: number;
  /** number of mouth members <Base>-1..n (default 3) */
  mouthFrames?: number;
  /** name in front of the subtitle; default derived from "<Name>Talk-n" members */
  speaker?: string;
  /** percent (default 100; Voice Controller dialogs use 80) */
  mixing?: number;
  /** block input with the Wait cursor while talking (default true, like most original talk calls) */
  block?: boolean;
}

export interface OrigScene {
  readonly id: string;
  readonly movie: Movie;
  readonly stage: Stage;
  readonly el: HTMLElement;
  readonly ctx: SceneCtx;
  /** score playback (frames, labels, hooks) */
  readonly player: ScorePlayer;
  /** current score frame */
  readonly frame: number;
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
  /** #stayHere: the held item is used up / stays at the target (inventarSound, HUD refresh) */
  consumeHand(): void;
  /**
   * sprite(110).member = item; mySourceSprite = source (#inHand). `source` decides where
   * #returnToSource puts it back: a state key `{ key: 'OS27', value?: 'activ' }`, a function, 'pocket'
   * (default) or 'lost'. See HandSource in scenes/engine.ts.
   */
  putInHand(item: string, source?: HandSource): void;
  /** #aboutToReturn: the held item flies back to its source */
  returnHand(): void;
  /** showInventar(): HUD (coins, jokes, pocket, hand) + sync + save */
  refresh(): void;
  /**
   * Inventar Game Preference (Shared 82) on a channel, key OS<ch> (missing = activ): passiv = blend 50,
   * dropping pId -> activ (#stayHere), clicking an active slot puts pId into the hand. Replaces the
   * channel's other handlers. `enabled()` false = ignore clicks (e.g. after the game started).
   */
  prefSlot(ch: number, pId: string, opts?: { enabled?: () => boolean; onChange?: () => void }): () => void;
  /** state of all prefSlot()s != passiv (Taster Start.checkPrefs) */
  checkPrefs(): boolean;
  /** the box view (frame "Box") is open */
  readonly boxOpen: boolean;
  /** go to another AS/GS movie */
  goto(movie: string): void;
  gotoBoard(board: string, pos: number, dir: number): void;
  /** save and return to the app's main menu */
  toMainMenu(): void;
  say(text: string): void;
  /** engine object by state key (OH1, OS16, HS2 …) */
  object(key: string): SceneObject | undefined;
  /** score channel of an engine object */
  channelOf(key: string): number | undefined;
  /** re-apply engine state to the sprites (called by the app after every interaction) */
  sync(): void;

  // ---- sound / voice / video
  /** characterTalk(member, mixing, mouthSprite): voice + mouth + subtitle; resolves when done */
  talk(member: string, opts?: TalkOpts): Promise<void>;
  /** playerTalk(n): "<Bingo|Puck>Talk-n", mouth 54 (Bingo) / 65 (Puck) */
  playerTalk(n: number | string, opts?: Omit<TalkOpts, 'mouthCh' | 'speaker'>): Promise<void>;
  /** stop voice + mouth + subtitle */
  stopTalk(): void;
  /** soundBusy(4) */
  readonly talking: boolean;
  /** quickSound(member, vol) on a free effect channel */
  sound(member: string, vol?: number): Promise<void>;
  /** playSmacker(name) (blocks input, restarts the scene's music/ambience afterwards) */
  playSmacker(name: string, opts?: SmackerOptions): Promise<void>;
  /** restart the movie's Music/Ambient controllers (sendSprite(81, #beginSprite)) */
  restartAudio(): void;

  // ---- input blocking (cursor #Wait)
  /** true while the app or this scene blocks input (generic clicks are ignored) */
  readonly busy: boolean;
  /** run `p` with the Wait cursor and input blocked */
  block<T>(p: Promise<T> | (() => Promise<T>)): Promise<T>;

  // ---- frames
  /** go to frame (number or label, e.g. 'Box', 'Screen'); false if unknown */
  gotoFrame(f: number | string): Promise<boolean>;
  /** run the playhead (frame-based movies); resolves at `to` */
  play(opts?: { from?: number | string; to?: number | string; fps?: number; loop?: boolean }): Promise<void>;
  /** frame-enter / exitFrame hooks (auto-removed on destroy) */
  onEnterFrame(fn: (frame: number) => void | Promise<unknown>): () => void;
  onExitFrame(fn: (frame: number) => void | Promise<unknown>): () => void;
  /** puppetSprite(ch, on): score changes no longer touch this channel */
  puppet(ch: number, on?: boolean): void;

  // ---- app glue (drag & drop of the hand item)
  /** a pointer release from a drag (client coords): deliver it as mouseUp; false = outside the scene */
  releaseAt(e: PointerEvent): boolean;
  /** the press at this client point would put something into the hand (drag start) */
  pickableAt(clientX: number, clientY: number): boolean;
  /** emit mouseUp at the client point of `e` (a press that turned into a drag picks the item up) */
  clickAt(e: PointerEvent): void;
  /** client rectangle of the sprite that holds a state key (fly-back target), null if not shown */
  sourceRect(key: string): DOMRect | null;

  destroy(): void;
  readonly alive: boolean;
}

/** true if per-scene Lingo ports are registered for the scene */
export function hasOrigPort(id: string): boolean {
  return (SETUPS.get(id)?.length ?? 0) > 0;
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

const none = (s: unknown): s is string => typeof s === 'string' && s !== '' && s !== 'None';

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
  const raw = RAW_SCENES[def.id];
  // several sprites can share one state key (e.g. two exits with the same HS key): pair the raw
  // objects (one per sprite) with the engine objects of that key in order; surplus sprites of a key
  // act as the last engine object of that key
  const keyToChs = new Map<string, number[]>();
  for (const o of raw?.objects ?? []) {
    const l = keyToChs.get(o.key) ?? [];
    if (!l.includes(o.ch)) l.push(o.ch);
    keyToChs.set(o.key, l);
  }
  const keyToCh = new Map<string, number>([...keyToChs].map(([k, l]) => [k, l[0]]));
  const chToObj = new Map<number, SceneObject>();
  const objCh = new Map<SceneObject, number>();
  {
    const used = new Map<string, number>();
    for (const o of def.objects) {
      const chs = keyToChs.get(o.key);
      const i = used.get(o.key) ?? 0;
      used.set(o.key, i + 1);
      if (!chs || i >= chs.length) continue;
      objCh.set(o, chs[i]);
      chToObj.set(chs[i], o);
    }
    for (const [key, chs] of keyToChs) {
      const last = [...def.objects].reverse().find((x) => x.key === key);
      if (last) for (const ch of chs) if (!chToObj.has(ch)) chToObj.set(ch, last);
    }
  }
  const refreshers = new Set<() => void>();
  const prefSlots = new Map<number, () => string>();
  /** number of mouseUp handlers a port registered per channel (scene.on) */
  const portUp = new Map<number, number>();
  /** open box view (frame "Box" overlay), see boxBehavior() */
  let box: { stage: Stage; show(): void; slots: Map<string, Sprite>; close(): void } | null = null;
  let boxAnim = false;

  const cleanups: (() => void)[] = [];
  const shownState = new Map<number, string>(); // twoState channel -> state shown
  let alive = true;
  let waitCount = 0;
  const busy = () => h.isBusy() || waitCount > 0;
  const fx = (name: unknown, vol: unknown = 100) => {
    if (none(name)) void playEffect(movie.dir, name, +(vol as number) || 100);
  };

  // ------------------------------------------------------------ generic behaviours (per sprite span)
  const twoState = new Map<number, { first: MemberRef | null; last: MemberRef | null; fps: number; key: string }>();
  const twoAudio = new Map<number, Record<string, any>>();
  const player = new ScorePlayer(stage, movie, { filter: (s) => isSceneSprite(movie.libs[s.castLib - 1], s) });
  player.onSpriteBegin = (sp, s) => spriteBegin(sp, s);

  function spriteBegin(sp: Sprite, _s: ScoreSprite): () => void {
    const ends: (() => void)[] = [];
    const ref = (r: any) => (r && typeof r === 'object' ? movie.memberAt(r.castLib || sp.member?.castLib || 1, r.member) : null);
    const tsa = sp.behavior('Two-State Audio')?.params;
    if (tsa) twoAudio.set(sp.ch, tsa);
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
    const boxB = sp.behavior('Box');
    if (o && !boxB) {
      ends.push(stage.on(sp.ch, 'mouseUp', () => {
        if (busy()) return;
        // Engine objects belong to frame 1 (sync() only maintains them there). On other frames (game
        // frames of a GS) a port's own mouseUp on the channel replaces the generic click, so the
        // item is not handled twice; without a port handler the generic click still works there
        // (e.g. GS009-01 Haken, GS001-01 map).
        if (player.frame !== 1 && (portUp.get(sp.ch) ?? 0) > 0) return;
        clickObject(o);
      }));
      sp.cursor = o.kind === 'item' ? 'take' : o.kind === 'exit' || o.kind === 'boardExit' || o.kind === 'game' ? 'walk' : 'make';
    }
    if (boxB) ends.push(boxBehavior(sp, String(boxB.params?.pId ?? '')));
    const cv = sp.behavior('Character Visibility');
    if (cv) {
      // Character Visibility.mouseUp: an item dropped on Bingo/Puck is given to that character
      const id = String(cv.params?.pCharacterID ?? '') as CharId;
      ends.push(stage.on(sp.ch, 'mouseUp', () => {
        if (!busy() && ctx.hand && /^CH[1-9]$/.test(id)) ctx.giveHandTo(id);
      }));
    }
    for (const b of sp.behaviors) {
      const p = b.params ?? {};
      const fps = +p.pFrameRate || 25;
      if (b.name === 'Random Two-State Animation') {
        const seq = movie.sequence(ref(p.pFirstMember) ?? '', ref(p.pLastMember) ?? '');
        if (seq.length < 2) continue;
        let atEnd = false;
        let running = false;
        let next = performance.now() + rnd(p.pState1WaitMin ?? 0, p.pState1WaitMax ?? 5000);
        ends.push(stage.onTick((now) => {
          if (running || now < next || !sp.visible) return;
          running = true;
          void stage.playMembers(sp.ch, atEnd ? [...seq].reverse() : seq, fps).then(() => {
            atEnd = !atEnd;
            running = false;
            next = performance.now() + (atEnd ? rnd(p.pState2WaitMin ?? 0, p.pState2WaitMax ?? 5000) : rnd(p.pState1WaitMin ?? 0, p.pState1WaitMax ?? 5000));
          });
        }));
      } else if (b.name === 'Animation Random-Delay Factor-Play') {
        const seq = movie.sequence(ref(p.pFirstMember) ?? '', ref(p.pLastMember) ?? '');
        if (seq.length < 2) continue;
        let running = false;
        let next = performance.now() + rnd(p.pWaitMin ?? 0, p.pWaitMax ?? 5000);
        const there = [...seq, ...[...seq].reverse().slice(1)];
        ends.push(stage.onTick((now) => {
          if (running || now < next || !sp.visible) return;
          running = true;
          const n = rnd(p.pFactorMin ?? 1, p.pFactorMax ?? 3);
          const all: MemberRef[] = [];
          for (let i = 0; i < n; i++) all.push(...(i ? there.slice(1) : there));
          const ta = twoAudio.get(sp.ch);
          if (ta) fx(ta.pSoundForward, ta.pMixing1);
          void stage.playMembers(sp.ch, all, fps).then(() => {
            running = false;
            next = performance.now() + rnd(p.pWaitMin ?? 0, p.pWaitMax ?? 5000);
          });
        }));
      } else if (b.name === 'Animation Random Visible') {
        let on = p.pStartMode === '#visible';
        sp.blend = on ? 100 : 0;
        let next = performance.now() + (on ? rnd(p.pMinVisible ?? 100, p.pMaxVisible ?? 500) : rnd(p.pMinInvisible ?? 2000, p.pMaxInvisible ?? 5000));
        ends.push(stage.onTick((now) => {
          if (now < next) return;
          on = !on;
          sp.blend = on ? 100 : 0;
          next = now + (on ? rnd(p.pMinVisible ?? 100, p.pMaxVisible ?? 500) : rnd(p.pMinInvisible ?? 2000, p.pMaxInvisible ?? 5000));
        }));
      } else if (b.name === 'Two-State Animation') {
        if (p.pStartMode === '#forward' || p.pStartMode === '#backward' || p.pLoop) {
          const seq = movie.sequence(ref(p.pFirstMember) ?? '', ref(p.pLastMember) ?? '');
          if (seq.length > 1) {
            const ta = () => twoAudio.get(sp.ch);
            const back = p.pStartMode === '#backward';
            const a0 = ta();
            if (a0) back ? fx(a0.pSoundBackward, a0.pMixing2) : fx(a0.pSoundForward, a0.pMixing1);
            const list = back ? [...seq].reverse() : seq;
            void stage.playMembers(sp.ch, list, fps, {
              loop: !!p.pLoop,
              pendulum: !!p.pPendulum,
              onEdge: (i) => {
                const a = ta();
                if (!a) return;
                const isFirst = (i === 0) !== back;
                if (isFirst) fx(a.pSoundState1, a.pMixing3);
                else fx(a.pSoundState2, a.pMixing4);
              },
              onTurn: (dir) => {
                const a = ta();
                if (!a) return;
                const forward = (dir === 1) !== back;
                if (forward) fx(a.pSoundForward, a.pMixing1);
                else fx(a.pSoundBackward, a.pMixing2);
              },
            });
            ends.push(() => stage.stopSequence(sp.ch));
          }
        }
      } else if (b.name === 'One-State Handling') {
        const seq = movie.sequence(ref(p.pFirstMember) ?? '', ref(p.pLastMember) ?? '');
        let running = false;
        ends.push(stage.on(sp.ch, 'mouseDown', () => {
          if (running || busy() || ctx.hand || seq.length < 2) return;
          running = true;
          const a = sp.behavior('One-State Audio')?.params;
          if (a) fx(a.pSoundMotion, a.pMixing1);
          void stage.playMembers(sp.ch, seq, fps).then(() => {
            running = false;
            sp.setMember(seq[0]);
            if (a) fx(a.pSoundStop, a.pMixing2);
          });
        }));
      } else if (b.name === 'Mouse Audio') {
        const ok = () => !busy() && !ctx.hand;
        const add = (ev: SpriteEvent, snd: unknown, mix: unknown) => {
          if (none(snd)) ends.push(stage.on(sp.ch, ev, () => ok() && fx(snd, mix)));
        };
        add('mouseEnter', p.pSoundEnter, p.pMixing1);
        add('mouseDown', p.pSoundDown, p.pMixing2);
        add('mouseUp', p.pSoundUp, p.pMixing3);
        add('mouseLeave', p.pSoundLeave, p.pMixing4);
      } else if (b.name === 'Random Audio') {
        const base = String(p.pSoundBaseName ?? '');
        if (!base) continue;
        let next = performance.now() + rnd(p.pMinSilenceTime ?? 2000, p.pMaxSilenceTime ?? 8000);
        let playing = false;
        ends.push(stage.onTick((now) => {
          if (playing || now < next) return;
          playing = true;
          void playEffect(movie.dir, `${base}-${rnd(1, +p.pMaxIndex || 1)}`, +p.pMixing || 100).then(() => {
            playing = false;
            next = performance.now() + rnd(p.pMinSilenceTime ?? 2000, p.pMaxSilenceTime ?? 8000);
          });
        }));
      } else if (b.name === 'Visible Audio') {
        // pSound is a member reference; sound members are not in the gfx index, so only names work
        const name = typeof p.pSound === 'string' ? p.pSound : ref(p.pSound)?.name;
        if (!name) continue;
        let stop: (() => void) | null = null;
        let played = false;
        let last = 0;
        ends.push(stage.onTick((now) => {
          if (now - last < 200) return;
          last = now;
          const vis = sp.visible && sp.blend > 0;
          if (vis && !stop && !(played && !p.pLoop)) {
            played = true;
            stop = p.pLoop ? playEffectLoop(movie.dir, name, +p.pMixing || 100) : (void playEffect(movie.dir, name, +p.pMixing || 100), () => undefined);
          } else if (!vis && stop) {
            stop();
            stop = null;
          }
        }));
        ends.push(() => stop?.());
      }
    }
    return () => {
      for (const e of ends) e();
      twoState.delete(sp.ch);
      twoAudio.delete(sp.ch);
      shownState.delete(sp.ch);
    };
  }

  /** click on an engine object: app default handling + the Two-State/Blocker sounds */
  function clickObject(o: SceneObject) {
    const ch = objCh.get(o) ?? keyToCh.get(o.key);
    const hadHand = !!ctx.hand;
    const before = o.kind === 'twoState' ? objState(ctx, o) : undefined;
    h.activate(o);
    if (o.kind !== 'twoState' || ch === undefined) return;
    const after = objState(ctx, o);
    const a = twoAudio.get(ch);
    if (!hadHand && before === 'blocked' && after === 'blocked' && a) fx(a.pSoundBlocked, a.pMixing5);
    if (hadHand && before !== after && (before === 'blocked' || after === 'blocked')) fx('Global-Unlock', 100);
  }

  await player.gotoFrame(1);
  if (!stage.sprites.size) {
    player.destroy();
    stage.destroy();
    return null;
  }

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
    if (o && !busy()) clickObject(o);
  });

  // accessible buttons (keyboard / screen reader); pointer goes through to the stage
  const a11y = document.createElement('div');
  a11y.className = 'ostage-a11y';
  stage.el.append(a11y);

  // ------------------------------------------------------------ state -> sprites
  function sync() {
    if (!alive) return;
    stage.cursorCh = ctx.ch === 'CH2' ? 'CH2' : 'CH1';
    stage.cursorOverride = waitCount > 0 ? 'wait' : ctx.hand ? 'grab' : null;
    for (const sp of stage.sprites.values()) {
      const cv = sp.behavior('Character Visibility');
      if (cv) {
        const id = String(cv.params.pCharacterID ?? '') as keyof typeof ctx.s.chars;
        sp.visible = ctx.s.chars[id]?.screen === def.id;
      }
      const o = chToObj.get(sp.ch);
      if (o && player.frame === 1 && !prefSlots.has(sp.ch)) {
        const vis = isVisible(ctx, def, o);
        const interactive = o.kind !== 'deco' || !!o.onClick;
        if (o.kind === 'item') {
          // Inventar im Adventurescreen: passiv = blend 0 but still clickable -> drop spot
          const spot = isDropSpot(ctx, def, o);
          sp.visible = vis || spot;
          if (!vis) sp.blend = 0;
          else if (sp.blend === 0) sp.blend = 100;
          sp.hitHidden = spot;
          sp.hot = (vis && interactive) || (spot && !!ctx.hand);
          sp.props.pickup = vis && objState(ctx, o) === 'activ';
          sp.props.sourceKey = o.key;
        } else if (o.kind === 'use' && /^OS1\d\d$/.test(o.key)) {
          // Inventar Game Preference as an engine object (GS032-01)
          const st = (ctx.get(o.key) ?? 'activ').toLowerCase();
          sp.blend = st === 'passiv' ? 50 : 100;
          sp.hitRect = true;
          sp.hot = vis;
          sp.cursor = st === 'activ' ? 'take' : 'make';
          sp.props.pickup = st === 'activ';
          sp.props.sourceKey = o.key;
        } else sp.hot = vis && interactive;
      }
      const ts = twoState.get(sp.ch);
      if (ts) {
        const st = ctx.get(ts.key) ?? 'state1';
        const prev = shownState.get(sp.ch);
        const target = st === 'state2' ? ts.last : ts.first;
        if (prev === undefined || !ts.first || !ts.last) {
          if (target) sp.setMember(target);
        } else if ((prev === 'state2') !== (st === 'state2')) {
          const a = twoAudio.get(sp.ch);
          const fwd = st === 'state2';
          if (a) fwd ? fx(a.pSoundForward, a.pMixing1) : fx(a.pSoundBackward, a.pMixing2);
          void stage.playSequence(sp.ch, fwd ? ts.first : ts.last, fwd ? ts.last : ts.first, ts.fps).then(() => {
            if (a && alive) fwd ? fx(a.pSoundState2, a.pMixing4) : fx(a.pSoundState1, a.pMixing3);
          });
        }
        shownState.set(sp.ch, st);
      }
    }
    // sprite-less engine objects -> SVG (only on the main frame "Screen")
    let markup = '';
    a11y.replaceChildren();
    if (player.frame === 1) {
      for (const o of def.objects) {
        if (!isVisible(ctx, def, o)) continue;
        const interactive = o.kind !== 'deco' || !!o.onClick;
        const ch = objCh.get(o) ?? keyToCh.get(o.key);
        const onStage = ch !== undefined && stage.has(ch);
        // game screens: frame 1 is the instruction card – a two-state object without a sprite there (e.g. the
        // GS009-01 window) belongs to the game frames; do not draw the generic vector stand-in over the card
        if (!onStage && o.kind === 'twoState' && def.id.startsWith('GS')) continue;
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
            if (!busy()) clickObject(o);
          });
          a11y.append(b);
        }
      }
    }
    svg.innerHTML = markup;
    for (const f of [...refreshers]) f();
    if (box) {
      box.stage.cursorOverride = stage.cursorOverride;
      box.show();
      box.stage.updateCursor();
    }
    stage.updateCursor();
  }

  // ------------------------------------------------------------ Box + Inventar in Containerbox
  // Box (Shared 17): BOX0 state1/blocked/state2. Click: blocked -> Box-Blocked; with pId in the hand
  // -> Box-Crack + state1 (the item stays in the hand); else Box-Open, Box-1..6 every 40 ms, state2,
  // go("Box"). beginSprite with state2 (= back from the box): Box-6 -> Box-1 + Box-Close, state1.
  // Frame "Box" (31) is shown as an overlay stage above frame 1 (the scene's sprites and the ports'
  // handlers stay untouched): Inventar in Containerbox (Shared 19) slots BOX1..8, Hotspot-Frame
  // left/right -> "Screen".
  function boxBehavior(sp: Sprite, pId: string): () => void {
    sp.cursor = 'look';
    const st = () => (ctx.get('BOX0') ?? 'state1').toLowerCase();
    const animate = async (from: number, to: number) => {
      boxAnim = true;
      const step = from < to ? 1 : -1;
      for (let f = from; ; f += step) {
        if (!alive || !stage.has(sp.ch)) break;
        sp.setMember(movie.member(`Box-${f}`) ?? sp.member);
        if (f === to) break;
        await stage.wait(40);
      }
      boxAnim = false;
    };
    const close = () => {
      void playEffect(movie.dir, 'Box-Close', 100);
      void animate(6, 1).then(() => {
        ctx.set('BOX0', 'state1');
        h.persist();
      });
    };
    if (st() === 'state2') close();
    const off = stage.on(sp.ch, 'mouseUp', () => {
      if (busy() || boxAnim || box) return;
      if (ctx.hand) {
        // item in the hand: only pId cracks a blocked box; anything else stays in the hand
        if (ctx.hand === pId && st() === 'blocked') {
          void playEffect(movie.dir, 'Box-Crack', 100);
          ctx.set('BOX0', 'state1');
          h.persist();
        }
        return;
      }
      if (st() === 'blocked') {
        void playEffect(movie.dir, 'Box-Blocked', 100);
        return;
      }
      void playEffect(movie.dir, 'Box-Open', 100);
      void animate(1, 6).then(async () => {
        if (!alive) return;
        ctx.set('BOX0', 'state2');
        h.persist();
        await openBox(close);
      });
    });
    return () => off();
  }

  async function openBox(onClose: () => void) {
    if (box || !movie.frame('Box')) return;
    const bs = new Stage({ originY: SCENE_TOP, className: 'scene-orig ostage-box' });
    bs.cursorCh = stage.cursorCh;
    await bs.loadFrame(movie, 'Box', (s) => isSceneSprite(movie.libs[s.castLib - 1], s));
    if (!alive) return bs.destroy();
    const slots = new Map<string, Sprite>();
    const shows: (() => void)[] = [];
    for (const sp of bs.sprites.values()) {
      const cb = sp.behavior('Inventar in Containerbox');
      const hf = sp.behavior('Hotspot-Frame');
      if (cb) {
        const key = `BOX${String(cb.params?.pInventarPosition ?? '').replace(/\D/g, '')}`;
        slots.set(key, sp);
        const empty = sp.member;
        const item = () => ctx.get(key) ?? 'OI000';
        const show = () => {
          const it = item();
          if (it !== 'OI000') {
            sp.setMember(movie.member(it) ?? empty);
            sp.blend = 100;
          } else {
            sp.setMember(empty);
            sp.blend = 0;
          }
          sp.cursor = it !== 'OI000' ? 'take' : 'make';
          sp.props.pickup = it !== 'OI000';
          sp.props.sourceKey = key;
        };
        sp.hitHidden = true;
        sp.hitRect = true;
        shows.push(show);
        show();
        bs.on(sp.ch, 'mouseUp', () => {
          if (busy()) return;
          const it = item();
          const hand = ctx.hand;
          if (hand) {
            if (it !== 'OI000') return ctx.returnHand(); // place taken: #aboutToReturn
            ctx.set(key, hand); // #stayHere
            ctx.consumeHand();
          } else {
            if (it === 'OI000') return;
            ctx.set(key, 'OI000');
            ctx.putInHand(it, { key, screen: def.id, value: it });
          }
          h.persist();
          show();
        });
      } else if (hf) {
        sp.cursor = 'walk';
        bs.on(sp.ch, 'mouseUp', () => {
          if (busy() || ctx.hand) return;
          closeBox();
        });
      }
    }
    const el = bs.el;
    el.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;z-index:500;border-radius:0;box-shadow:none';
    for (const ev of ['pointerdown', 'pointerup', 'pointermove', 'click']) el.addEventListener(ev, (e) => e.stopPropagation());
    const closeBox = () => {
      if (!box) return;
      box = null;
      bs.destroy();
      onClose();
      sync();
    };
    box = { stage: bs, slots, show: () => shows.forEach((f) => f()), close: closeBox };
    stage.el.append(el);
    sync();
  }

  async function block<T>(p: Promise<T> | (() => Promise<T>)): Promise<T> {
    waitCount++;
    sync();
    try {
      return await (typeof p === 'function' ? p() : p);
    } finally {
      waitCount--;
      if (alive) sync();
    }
  }

  const playerName = () => (ctx.s.playerCharacter === 'Puck' ? 'Puck' : 'Bingo');

  const scene: OrigScene = {
    id: def.id,
    movie,
    stage,
    player,
    get frame() {
      return player.frame;
    },
    el: stage.el,
    ctx,
    sprite: (ch) => stage.sprite(ch),
    member: (name) => movie.member(name),
    on: (ch, ev, fn) => {
      const off = stage.on(ch, ev, fn);
      if (ev !== 'mouseUp') return off;
      portUp.set(ch, (portUp.get(ch) ?? 0) + 1);
      let done = false;
      return () => {
        off();
        if (done) return;
        done = true;
        portUp.set(ch, Math.max(0, (portUp.get(ch) ?? 1) - 1));
      };
    },
    off: (ch) => {
      stage.off(ch);
      portUp.delete(ch);
    },
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
    putInHand: (item, source) => ctx.putInHand(item, source),
    returnHand: () => ctx.returnHand(),
    refresh: () => ctx.refresh(),
    prefSlot(ch, pId, opts = {}) {
      const key = `OS${ch}`;
      if (ctx.get(key) === undefined) ctx.set(key, 'activ'); // loadData: missing line -> activ
      const st = () => (ctx.get(key) ?? 'activ').toLowerCase();
      const enabled = () => !opts.enabled || opts.enabled();
      const show = () => {
        if (!stage.has(ch)) return;
        const sp = stage.sprite(ch);
        const on = st() !== 'passiv';
        sp.blend = on ? 100 : 50;
        sp.cursor = on ? 'take' : 'make';
        sp.hitRect = true; // a 70x70 field: thin items (hook) must hit everywhere
        sp.props.pickup = on && enabled();
        sp.props.sourceKey = key;
      };
      prefSlots.set(ch, st);
      refreshers.add(show);
      stage.off(ch);
      show();
      const off = stage.on(ch, 'mouseUp', () => {
        if (busy() || !enabled()) return;
        const hand = ctx.hand;
        if (hand) {
          if (st() === 'passiv' && hand === pId) {
            ctx.set(key, 'activ');
            ctx.consumeHand(); // #stayHere
          } else ctx.returnHand(); // #aboutToReturn
        } else if (st() === 'activ') {
          ctx.set(key, 'passiv');
          ctx.putInHand(pId, { key, screen: def.id });
        } else return;
        h.persist();
        show();
        opts.onChange?.();
      });
      return () => {
        off();
        refreshers.delete(show);
        prefSlots.delete(ch);
      };
    },
    checkPrefs: () => [...prefSlots.values()].every((st) => st() !== 'passiv'),
    get boxOpen() {
      return !!box;
    },
    releaseAt(e) {
      if (!alive) return false;
      if (box) {
        const r = box.stage.el.getBoundingClientRect();
        if (e.clientX >= r.left && e.clientX < r.right && e.clientY >= r.top && e.clientY < r.bottom) {
          box.stage.releaseAt(e);
          return true;
        }
      }
      if (!stage.spriteAtClient(e.clientX, e.clientY)) {
        // sprite-less engine objects (SVG layer)
        const el = document.elementFromPoint(e.clientX, e.clientY)?.closest('.ostage-svg [data-key]') as SVGGElement | null;
        const o = el && def.objects.find((x) => x.key === el.dataset.key);
        if (o) {
          if (!busy()) clickObject(o);
          return true;
        }
      }
      const r = stage.el.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX >= r.right || e.clientY < r.top || e.clientY >= r.bottom) return false;
      stage.releaseAt(e);
      return true;
    },
    pickableAt(x, y) {
      if (!alive || busy()) return false;
      const s = box ? box.stage.spriteAtClient(x, y) : stage.spriteAtClient(x, y);
      return !!s?.props.pickup;
    },
    clickAt(e) {
      if (!alive) return;
      if (box) box.stage.releaseAt(e);
      else stage.releaseAt(e);
    },
    sourceRect(key) {
      if (!alive) return null;
      const find = (st: Stage) => [...st.sprites.values()].find((s) => s.props.sourceKey === key && s.visible);
      const inBox = box ? find(box.stage) : undefined;
      if (inBox && box) return box.stage.clientRect(inBox.rect());
      const sp = find(stage) ?? (keyToCh.has(key) && stage.has(keyToCh.get(key)!) ? stage.sprite(keyToCh.get(key)!) : undefined);
      return sp && sp.w ? stage.clientRect(sp.rect()) : null;
    },
    goto: (m) => ctx.gotoScene(m.replace(/^[A-Za-z]+_/, '')),
    gotoBoard: (b, p, d) => ctx.gotoBoard(b, p, d),
    toMainMenu: () => ctx.toMainMenu(),
    say: (t) => ctx.say(t),
    object: (key) => def.objects.find((o) => o.key === key),
    channelOf: (key) => keyToCh.get(key),
    sync,

    talk(member, o = {}) {
      const speaker = o.speaker ?? /^([A-Z][a-zA-Z]+?)Talk-/.exec(member)?.[1];
      const mouth = o.mouthCh && stage.has(o.mouthCh) ? { stage, ch: o.mouthCh, frames: o.mouthFrames } : null;
      const run = () => voiceTalk(member, { movie: movie.dir, mixing: o.mixing, mouth, speaker, host: stage.el });
      return o.block === false ? run() : block(run);
    },
    playerTalk(n, o = {}) {
      const pc = playerName();
      return scene.talk(`${pc}Talk-${n}`, { ...o, mouthCh: pc === 'Puck' ? 65 : 54, speaker: pc });
    },
    stopTalk: () => stopTalk(),
    get talking() {
      return isVoiceBusy();
    },
    sound: (member, vol = 100) => playEffect(movie.dir, member, vol),
    playSmacker: (name, opts) =>
      block(async () => {
        await playSmk(name, opts);
        if (alive) void applyMovieAudio(def.id);
      }),
    restartAudio: () => void applyMovieAudio(def.id),

    get busy() {
      return busy();
    },
    block,

    gotoFrame: async (f) => {
      const ok = await player.gotoFrame(f);
      if (ok) sync();
      return ok;
    },
    play: (opts) => player.play(opts),
    onEnterFrame: (fn) => {
      const off = player.onEnterFrame(fn);
      cleanups.push(off);
      return off;
    },
    onExitFrame: (fn) => {
      const off = player.onExitFrame(fn);
      cleanups.push(off);
      return off;
    },
    puppet: (ch, on = true) => player.puppet(ch, on),

    destroy() {
      if (!alive) return;
      alive = false;
      box?.stage.destroy();
      box = null;
      stopTalk();
      for (const c of cleanups) c();
      player.destroy();
      stage.destroy();
    },
    get alive() {
      return alive && stage.alive;
    },
  };

  // Inventar Game Preference slots of game screens (ports may re-register them with their own options)
  const gameFrame = movie.labelFrame('Game') ?? 15;
  for (const sp of [...stage.sprites.values()]) {
    const p = sp.behavior('Inventar Game Preference')?.params;
    if (p?.pId) scene.prefSlot(sp.ch, String(p.pId), { enabled: () => player.frame < gameFrame });
  }
  sync();
  for (const setup of SETUPS.get(def.id) ?? []) {
    const c = setup(scene);
    if (typeof c === 'function') cleanups.push(c);
  }
  host.append(stage.el);
  void applyMovieAudio(def.id);
  return scene;
}

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}
