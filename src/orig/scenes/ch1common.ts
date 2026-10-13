// Shared helpers for the chapter-1 ports in this folder (home/villa/beach/puzzle).
// No scene is registered here. Everything is local to src/orig/scenes on purpose (shared runtime
// files are owned by other ports) – see the notes at the individual helpers.

import type { OrigScene } from '../sceneView';
import { soundUrl } from '../assets';
import { playEffectLoop } from '../sound';
import type { Sprite } from '../stage';

/** Lingo random(a, b) (inclusive) */
export function rnd(a: number, b: number): number {
  return a + Math.floor(Math.random() * (b - a + 1));
}

/**
 * Re-render the HUD (pocket) after the hand/pocket was changed outside the engine's default
 * handling. The scene context has no direct HUD refresh; gotoScene(<same scene>) only re-syncs the
 * mounted original view and redraws the HUD.
 */
export function refreshHud(scene: OrigScene): void {
  scene.ctx.gotoScene(scene.id);
}

/** sprite(110).myMode = #aboutToReturn: the held item goes back to where it came from. */
export function returnHand(scene: OrigScene): void {
  const it = scene.hand;
  if (!it) return;
  if (it === 'OI007') scene.ctx.addCoins(1);
  else if (it === 'OI006') scene.ctx.addJokes(1);
  else scene.ctx.give(it); // the source slot was emptied when the item was lifted
  scene.consumeHand();
  refreshHud(scene);
}

/** sprite(110).myMode = #stayHere: item used up, inventarSound(OIxxx). */
export function consumeHandItem(scene: OrigScene): void {
  const it = scene.hand;
  if (!it) return;
  scene.consumeHand();
  void scene.sound(`Shared_Inventar/${it}-Sound`, 100);
  refreshHud(scene);
}

/** Effect with a stop() and an end signal (soundEffect + soundBusy(ch) / sound stop ch). */
export interface OneShot {
  stop(): void;
  readonly busy: boolean;
  readonly done: Promise<void>;
}

export function oneShot(scene: OrigScene, name: string, vol = 100): OneShot {
  const url = soundUrl(scene.movie.dir, name);
  let busy = !!url;
  let res: () => void = () => undefined;
  const done = new Promise<void>((r) => (res = r));
  if (!url) {
    res();
    return { stop: () => undefined, busy: false, done };
  }
  const stopLoop = playEffectLoop(scene.movie.dir, name, vol);
  let timer = 0;
  const stop = () => {
    if (!busy) return;
    busy = false;
    clearTimeout(timer);
    stopLoop();
    res();
  };
  // the effect API has no "ended" for a stoppable sound: loop it and cut it after its duration
  const a = new Audio();
  a.preload = 'metadata';
  a.onloadedmetadata = () => {
    if (busy) timer = window.setTimeout(stop, Math.max(50, (a.duration || 1) * 1000));
  };
  a.onerror = () => {
    if (busy) timer = window.setTimeout(stop, 1500);
  };
  a.src = url;
  return {
    stop,
    get busy() {
      return busy;
    },
    done,
  };
}

/**
 * the mouseLoc / the mouseDown for per-frame Lingo logic, incl. baRestrictCursor (clamp).
 * Pointer events (mouse, touch, pen); only the pointer that is pressed is followed.
 */
export class MouseTracker {
  x = -1000;
  y = -1000;
  down = false;
  restrict: { l: number; t: number; r: number; b: number } | null = null;
  private pid: number | null = null;
  private ups = new Set<() => void>();
  private off: () => void;

  constructor(private scene: OrigScene) {
    const move = (e: PointerEvent) => {
      if (this.pid !== null && e.pointerId !== this.pid) return;
      this.set(e);
    };
    const downH = (e: PointerEvent) => {
      if (this.pid !== null) return;
      if ((e.target as Element | null)?.closest?.('button')) return; // on-screen key substitutes
      this.pid = e.pointerId;
      this.down = true;
      this.set(e);
    };
    const up = (e: PointerEvent) => {
      if (this.pid !== null && e.pointerId !== this.pid) return;
      this.set(e);
      this.pid = null;
      this.down = false;
      for (const f of [...this.ups]) f();
    };
    const el = scene.stage.el;
    el.addEventListener('pointerdown', downH, true);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    this.off = () => {
      el.removeEventListener('pointerdown', downH, true);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }

  private set(e: PointerEvent) {
    const p = this.scene.stage.toStage(e);
    this.x = p.x;
    this.y = p.y;
    this.clamp();
  }

  clamp() {
    const r = this.restrict;
    if (!r) return;
    this.x = Math.min(r.r, Math.max(r.l, this.x));
    this.y = Math.min(r.b, Math.max(r.t, this.y));
  }

  /** mouseUp / mouseUpOutside of the pressed pointer (once) */
  onceUp(fn: () => void) {
    const f = () => {
      this.ups.delete(f);
      fn();
    };
    this.ups.add(f);
  }

  destroy() {
    this.off();
    this.ups.clear();
  }
}

/** Director intersect() of two sprite rects */
export function rectsIntersect(a: { left: number; top: number; right: number; bottom: number }, b: { left: number; top: number; right: number; bottom: number }) {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
}

export function insideRect(x: number, y: number, r: { left: number; top: number; right: number; bottom: number }) {
  return x >= r.left && x < r.right && y >= r.top && y < r.bottom;
}

/** sprite.width / sprite.height (stretched) keeping the loc */
export function setSize(sp: Sprite, w: number, h: number) {
  sp.width = Math.round(w);
  sp.height = Math.round(h);
  sp.setLoc(sp.locH, sp.locV);
}

/** member number suffix ("Glas-8" -> 8) */
export function memberIndex(sp: Sprite): number {
  return +(/-(\d+)$/.exec(sp.member?.name ?? '')?.[1] ?? 0);
}

// ---------------------------------------------------------------------------------- game screens

/**
 * Taster Start / Taster Stop (sprite 109) + Inventar Game Preference (sprites 101–107) of a GS
 * movie. Sprite 109 lies in the interface bar below the scene (y 503) which the original view does
 * not show, so it is drawn as a puppet sprite at the bottom right corner of the scene instead; the
 * generic "Zurück" button of the engine is hidden while the port runs.
 */
export class GameButtons {
  readonly sp: Sprite;
  private game = false;
  private ready = false;
  private offs: (() => void)[] = [];

  constructor(
    private scene: OrigScene,
    private back: string,
    private prefs: { ch: number; item: string }[],
    private onStart: () => void,
  ) {
    const ex = scene.object('_exit');
    if (ex) {
      const prev = ex.visible;
      ex.visible = () => false;
      this.offs.push(() => (ex.visible = prev));
      scene.sync();
    }
    scene.puppet(109);
    this.sp = scene.sprite(109);
    this.sp.setMember(this.checkPrefs() ? 'Game-Start' : 'Game-Back');
    // original rect L710 T504 (interface bar) -> moved into the scene, same size [Prüfung erforderlich]
    this.sp.setRect(710, 493 - this.sp.h);
    this.sp.cursor = 'make';
    scene.on(109, 'mouseDown', () => {
      if (scene.busy || scene.hand) return; // getCursor() <> #make
      void scene.sound('Splash', 100);
    });
    scene.on(109, 'mouseUp', () => {
      if (scene.busy || scene.hand) return;
      const n = this.sp.member?.name;
      if (n === 'Game-Start') {
        this.game = true;
        this.sp.setMember('Game-Stop');
        this.onStart();
      } else if (n === 'Game-Back' || n === 'Game-Stop' || n === 'Game-Ready') {
        // setCharacterScreen(currentCharacter, gGameBackMovie); jumpToCurrentCharacter()
        scene.goto(back);
      }
    });
    // Taster Start.prepareFrame
    this.offs.push(
      scene.onTick(() => {
        if (this.game) return;
        this.sp.setMember(this.checkPrefs() ? 'Game-Start' : 'Game-Back');
      }),
    );
    for (const p of prefs) this.prefSlot(p.ch, p.item);
  }

  private checkPrefs(): boolean {
    for (const p of this.prefs) if ((this.scene.state.get(`OS${p.ch}`) ?? 'activ').toLowerCase() === 'passiv') return false;
    return true;
  }

  /** Inventar Game Preference */
  private prefSlot(ch: number, item: string) {
    const scene = this.scene;
    if (!scene.stage.has(ch)) return;
    const key = `OS${ch}`;
    const st = () => (scene.state.get(key) ?? 'activ').toLowerCase();
    const sp = scene.sprite(ch);
    const show = () => {
      if (!scene.stage.has(ch)) return;
      sp.blend = st() === 'activ' ? 100 : 50;
      sp.cursor = st() === 'activ' ? 'take' : 'make';
    };
    show();
    scene.on(ch, 'mouseDown', () => {
      if (scene.busy || scene.hand || st() === 'passiv') return;
      // original: the item goes into the hand (sprite 110); here it goes back into the pocket
      // (the scene API cannot put an item into the hand) [Prüfung erforderlich]
      if (!scene.ctx.give(item)) return;
      scene.state.set(key, 'passiv');
      void scene.sound(`Shared_Inventar/${item}-Sound`, 100);
      show();
      refreshHud(scene);
    });
    scene.on(ch, 'mouseUp', () => {
      if (!scene.hand) return;
      if (st() === 'passiv' && scene.hand === item) {
        scene.state.set(key, 'activ');
        show();
        consumeHandItem(scene);
        return;
      }
      returnHand(scene);
    });
  }

  /** sprite(109).member = member("Game-Ready") */
  setReady() {
    this.ready = true;
    this.sp.setMember('Game-Ready');
  }

  get isReady() {
    return this.ready;
  }

  destroy() {
    for (const f of this.offs) f();
  }
}

/** keep the hand of puppet sprites in front of the scene's SVG/a11y layers is not needed; z = channel */
export function setZ(sp: Sprite, z: number) {
  sp.el.style.zIndex = String(z);
}
