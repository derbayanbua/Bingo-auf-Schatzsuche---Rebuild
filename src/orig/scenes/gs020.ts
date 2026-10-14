// Chapter 2 mini games: GS020-01 Ruderrennen, GS020-02 Pfannkuchen, GS020-04 Segeln (-> Ankunft ->
// Chapter 3), GS020-05 Kisten-Puzzle, GS020-06 Lappen schneiden. Ports of dec/Game/GS020-0x
// (Local Lingo) + the shared Taster Start/Stop and Inventar Game Preference behaviours.
//
// Interface bar: sprites in the status bar of the original (y >= 493: Taster 109, Race button, jam
// jars, clock …) are not part of the scene view; they are drawn as puppet sprites moved up by
// STATUS_DY (107 px) so they sit at the bottom edge of the scene (channel + 100, except 109).
// Keys: the original reads the arrow keys (baKeyIsDown 37/39); the remake also shows on-screen
// buttons (mouse + touch) that act as these keys.

import { registerOrigScene, type OrigScene } from '../sceneView';
import { startChapter } from '../screens';
import { playEffectLoop } from '../sound';
import type { Sprite } from '../stage';
import { markPorted } from './ch1util';

const sym = (v: string | undefined) => (v ?? '').toLowerCase();
/** Lingo random(n) = 1..n */
const random = (n: number) => 1 + Math.floor(Math.random() * n);
const rnd = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));
const STATUS_DY = -107;

function every(scene: OrigScene, ms: number, fn: (now: number) => void) {
  let acc = 0;
  return scene.onTick((now, dt) => {
    acc += dt;
    if (acc > ms * 5) acc = ms;
    while (acc >= ms) {
      acc -= ms;
      fn(now);
      if (!scene.alive) return;
    }
  });
}
function memberNum(sp: Sprite): [string, number] {
  const n = sp.member?.name ?? '';
  const i = n.lastIndexOf('-');
  return [n.slice(0, i), parseInt(n.slice(i + 1), 10) || 1];
}
type R = { left: number; top: number; right: number; bottom: number };
const rectsMeet = (r: R, s: R) => r.left < s.right && s.left < r.right && r.top < s.bottom && s.top < r.bottom;
/** sprite(a) intersects sprite(b) with bounding rects (at least one sprite not matte) */
const intersects = (a: Sprite, b: Sprite) => rectsMeet(a.rect(), b.rect());
const inside = (x: number, y: number, r: R) => x >= r.left && x < r.right && y >= r.top && y < r.bottom;

// ---- matte/matte intersects: the opaque pixels of both sprites (alpha masks of the webp members)
type Mask = { w: number; h: number; a: Uint8Array };
const MASKS = new Map<string, Mask | null | 'loading'>();
function maskOf(url: string): Mask | null {
  const m = MASKS.get(url);
  if (m !== undefined) return m === 'loading' ? null : m;
  MASKS.set(url, 'loading');
  const img = new Image();
  img.onload = () => {
    try {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const g = c.getContext('2d', { willReadFrequently: true })!;
      g.drawImage(img, 0, 0);
      const d = g.getImageData(0, 0, c.width, c.height).data;
      const a = new Uint8Array(c.width * c.height);
      for (let i = 0; i < a.length; i++) a[i] = d[i * 4 + 3];
      MASKS.set(url, { w: c.width, h: c.height, a });
    } catch {
      MASKS.set(url, null);
    }
  };
  img.onerror = () => MASKS.set(url, null);
  img.src = url;
  return null;
}
function preloadMasks(scene: OrigScene, names: string[]) {
  for (const n of names) {
    const u = scene.member(n)?.url;
    if (u) maskOf(u);
  }
}
/** both sprites matte: true if an opaque pixel of a lies on an opaque pixel of b (masks not loaded yet: false) */
function matteIntersects(a: Sprite, b: Sprite): boolean {
  const ra = a.rect(), rb = b.rect();
  if (!rectsMeet(ra, rb)) return false;
  const ua = a.member?.url, ub = b.member?.url;
  const ma = ua ? maskOf(ua) : null, mb = ub ? maskOf(ub) : null;
  if (!ma || !mb || !a.w || !a.h || !b.w || !b.h) return false;
  const l = Math.max(ra.left, rb.left), r = Math.min(ra.right, rb.right);
  const t = Math.max(ra.top, rb.top), bt = Math.min(ra.bottom, rb.bottom);
  for (let y = t; y < bt; y++) {
    const ya = Math.floor(((y - ra.top) * ma.h) / a.h) * ma.w;
    const yb = Math.floor(((y - rb.top) * mb.h) / b.h) * mb.w;
    for (let x = l; x < r; x++) {
      if (ma.a[ya + Math.floor(((x - ra.left) * ma.w) / a.w)] > 24 && mb.a[yb + Math.floor(((x - rb.left) * mb.w) / b.w)] > 24) return true;
    }
  }
  return false;
}

/** a status-bar sprite of the original (stage top >= 493) as a puppet sprite at the scene bottom */
function statusSprite(scene: OrigScene, origCh: number, member: string, left: number, top: number): Sprite {
  const ch = origCh + 100;
  scene.puppet(ch, true);
  const sp = scene.sprite(ch);
  sp.setMember(member);
  sp.setRect(left, top + STATUS_DY);
  sp.blend = 100;
  sp.visible = true;
  return sp;
}
/** Rollover Fader 50 -> 100 */
function rollover(scene: OrigScene, ch: number) {
  const sp = scene.sprite(ch);
  sp.blend = 50;
  scene.on(ch, 'mouseEnter', () => (sp.blend = 100));
  scene.on(ch, 'mouseLeave', () => (sp.blend = 50));
}

/** stage coordinates of the mouse (the mouseLoc) */
function mouseTracker(scene: OrigScene) {
  const m = { x: 400, y: 300, down: false };
  const move = (e: PointerEvent) => {
    const p = scene.stage.toStage(e);
    m.x = p.x;
    m.y = p.y;
  };
  const down = (e: PointerEvent) => (move(e), (m.down = true));
  const up = () => (m.down = false);
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerdown', down);
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
  return {
    m,
    off: () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerdown', down);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    },
  };
}

/**
 * baKeyIsDown(37 / 39): arrow keys + two on-screen buttons (press and hold; mouse and touch,
 * multi-touch works). Positions in scene space (800x448).
 */
function arrowKeys(scene: OrigScene, pos: { left: [number, number]; right: [number, number] }) {
  const k = { left: false, right: false };
  const els: HTMLElement[] = [];
  for (const dir of ['left', 'right'] as const) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'gs020-key';
    b.textContent = dir === 'left' ? '◀' : '▶';
    b.setAttribute('aria-label', dir === 'left' ? 'Pfeiltaste links' : 'Pfeiltaste rechts');
    const [x, y] = pos[dir];
    b.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:76px;height:64px;z-index:400;border-radius:14px;border:3px solid rgba(255,255,255,.85);background:rgba(20,40,80,.45);color:#fff;font-size:30px;line-height:1;touch-action:none;cursor:pointer;user-select:none;-webkit-user-select:none`;
    const on = (e: PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      k[dir] = true;
      b.style.background = 'rgba(255,210,63,.7)';
      try {
        b.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    };
    const off = (e: Event) => {
      e.stopPropagation();
      k[dir] = false;
      b.style.background = 'rgba(20,40,80,.45)';
    };
    b.addEventListener('pointerdown', on);
    b.addEventListener('pointerup', off);
    b.addEventListener('pointercancel', off);
    b.addEventListener('lostpointercapture', off);
    b.addEventListener('contextmenu', (e) => e.preventDefault());
    b.addEventListener('click', (e) => e.stopPropagation());
    scene.stage.inner.append(b);
    els.push(b);
  }
  const kd = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') k.left = true;
    else if (e.key === 'ArrowRight') k.right = true;
    else return;
    e.preventDefault();
  };
  const ku = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') k.left = false;
    else if (e.key === 'ArrowRight') k.right = false;
  };
  const blur = () => (k.left = k.right = false);
  window.addEventListener('keydown', kd);
  window.addEventListener('keyup', ku);
  window.addEventListener('blur', blur);
  return {
    k,
    off: () => {
      els.forEach((e) => e.remove());
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
      window.removeEventListener('blur', blur);
    },
  };
}

// ------------------------------------------------------------------ Game screen frame

type Btn = 'Game-Back' | 'Game-Start' | 'Game-Stop' | 'Game-Ready';
interface GameCtl {
  /** sprite(109).member */
  setButton(name: Btn): void;
  readonly button: string | undefined;
  /** replaces the default button action (Taster Stop) while set, e.g. GS020-04 "Neustart" */
  onButton: ((member: string) => void) | null;
}

/**
 * Intro frame (1) with Taster Start + Inventar Game Preference slots, the game frame (`start`) with
 * Taster Stop. Taster Stop/Back = setCharacterScreen(cur, gGameBackMovie) + jumpToCurrentCharacter;
 * `exit(member)` replaces that (GS020-05 framescript). `game()` runs on the game frame.
 */
function gameScreen(
  scene: OrigScene,
  o: { back: string; start: string; exit?: (member: string) => void },
  game: (ctl: GameCtl) => void | (() => void),
) {
  markPorted(scene);
  const exitObj = scene.object('_exit');
  const prevVis = exitObj?.visible;
  if (exitObj) exitObj.visible = () => false;
  scene.sync();
  const BTN = 109;
  scene.puppet(BTN, true);
  const btn = scene.sprite(BTN);
  const place = (name: Btn) => {
    if (btn.member?.name === name) return;
    btn.setMember(name);
    btn.setRect(710, 493 - (btn.h || 95));
  };
  rollover(scene, BTN);
  btn.cursor = 'make';
  let onGame = false;
  let cleanup: void | (() => void);
  const ctl: GameCtl = {
    setButton: place,
    get button() {
      return btn.member?.name;
    },
    onButton: null,
  };
  place(scene.checkPrefs() ? 'Game-Start' : 'Game-Back');
  scene.onTick(() => {
    if (!onGame) place(scene.checkPrefs() ? 'Game-Start' : 'Game-Back');
  });
  scene.on(BTN, 'mouseDown', () => {
    if (!scene.busy && !scene.hand) void scene.sound('Splash', 100);
  });
  scene.on(BTN, 'mouseUp', () => {
    if (scene.busy || scene.hand) return;
    const m = btn.member?.name ?? '';
    if (!onGame) {
      if (m === 'Game-Start') {
        // Taster Start: go(#next)
        onGame = true;
        void scene.gotoFrame(o.start).then(() => {
          if (!scene.alive) return;
          place('Game-Stop');
          cleanup = game(ctl);
        });
        return;
      }
      scene.goto(o.back);
      return;
    }
    if (ctl.onButton) return ctl.onButton(m);
    if (o.exit) o.exit(m);
    else scene.goto(o.back);
  });
  return () => {
    if (exitObj) exitObj.visible = prevVis;
    if (typeof cleanup === 'function') cleanup();
  };
}

// ============================================================================ GS020-01 Ruderrennen

registerOrigScene('GS020-01', (scene) =>
  gameScreen(scene, { back: 'AS020-02', start: 'Game' }, (ctl) => {
    const isBingo = scene.ctx.s.playerCharacter !== 'Puck';
    const B = isBingo ? 21 : 22;
    const ROCCO = 25, HAT = 11;
    // prepareMovie: only the player's boat is visible
    for (const ch of [21, 22, 25]) scene.puppet(ch, true);
    scene.sprite(21).visible = isBingo;
    scene.sprite(22).visible = !isBingo;
    preloadMasks(scene, ['Bingo-1', 'Puck-1', 'Rocco-1']);
    for (let i = 1; i <= 21; i++) preloadMasks(scene, [`Bingo-${i}`, `Puck-${i}`, `Rocco-${i}`]);

    // Race (status bar sprite 95): Canon, the race starts
    statusSprite(scene, 95, 'Race', 518, 505);
    rollover(scene, 195);
    scene.sprite(195).cursor = 'make';
    let racing = false;
    scene.on(195, 'mouseUp', () => {
      if (scene.busy) return;
      void scene.sound('Canon', 100);
      racing = true;
    });
    const keys = arrowKeys(scene, { left: [12, 372], right: [100, 372] });

    interface Boat { sp: Sprite; locH: number; locV: number; speedH: number; speedV: number; mode: string }
    const mk = (ch: number): Boat => {
      const sp = scene.sprite(ch);
      return { sp, locH: sp.locH, locV: sp.locV, speedH: 0, speedV: 0, mode: 'waitForPushing' };
    };
    const boat = mk(B);
    const rocco = mk(ROCCO);
    let leftT = 0, rightT = 0, talkCounter = 1;
    let label: 'Game' | 'Screen-2' | 'Screen-3' | 'end' = 'Game';
    const anim = (b: Boat, after: string) => {
      const [base, f0] = memberNum(b.sp);
      let f = f0;
      if (f < 21) f++;
      else {
        f = 1;
        b.mode = after;
      }
      b.sp.setMember(`${base}-${f}`);
    };
    const damp = (b: Boat) => {
      if (b.speedH > 0) b.speedH -= 0.1;
      if (b.speedV > 0) b.speedV -= 0.1;
      if (b.speedV < 0) b.speedV += 0.1;
      b.locH += b.speedH;
      b.locV += b.speedV;
      b.sp.setLoc(Math.round(b.locH), Math.round(b.locV));
    };
    // Ruderboot Bingo und Puck (40 ms)
    every(scene, 40, (now) => {
      if (!racing || label === 'end' || !boat.sp.visible) return;
      damp(boat);
      if (boat.sp.locV < 45) boat.speedV = 2.0;
      if (boat.sp.locV > 550) boat.speedV = -2.0;
      if (matteIntersects(boat.sp, rocco.sp)) {
        if (Math.abs(boat.sp.locV - rocco.sp.locV) > 50) {
          if (random(30) === 1) void scene.sound(`Holz-${random(4)}`, 100);
        } else {
          boat.speedV = 0;
          rocco.speedV = 0;
          rocco.speedH = boat.speedH;
        }
      }
      if (boat.mode === 'release' && !keys.k.left && !keys.k.right) {
        rightT = 0;
        leftT = 0;
        boat.mode = 'waitForPushing';
      }
      if (boat.mode === 'waitForPushing') {
        if (keys.k.left && leftT === 0) leftT = now;
        if (keys.k.right && rightT === 0) rightT = now;
        if (rightT === 0 || leftT === 0) return;
        if (Math.abs(rightT - leftT) > 1000) {
          if (!keys.k.left && !keys.k.right) {
            rightT = 0;
            leftT = 0;
          }
          return;
        }
        boat.speedV = (rightT - leftT) / 50.0;
        boat.speedH = Math.min(boat.speedH + 3.0, 5.0);
        boat.mode = 'pushing';
        if (!scene.talking) {
          void scene.playerTalk(talkCounter, { block: false });
          talkCounter = talkCounter === 1 ? 2 : 1;
        }
        void scene.sound(`Schlag${random(3)}`, 100);
      }
      if (boat.mode === 'pushing') anim(boat, 'release');
    });
    // Ruderboot Rocco (40 ms)
    every(scene, 40, () => {
      if (!racing || label === 'end') return;
      damp(rocco);
      if (rocco.mode === 'waitForPushing') {
        if (rocco.locH > 1200) {
          rocco.speedH = 0;
          rocco.speedV = 0;
          return;
        }
        if (random(10) === 1) {
          if (label === 'Screen-3') rocco.speedV = rocco.sp.locV < 270 ? 2.0 : -2.0;
          else rocco.speedV = 1 - random(20) / 10.0;
          rocco.speedH = Math.min(rocco.speedH + 3.0, 5.0);
          rocco.mode = 'pushing';
          void scene.sound(`Schlag${random(3)}`, 100);
        }
      }
      if (rocco.mode === 'pushing') anim(rocco, 'waitForPushing');
    });
    let hatAnim = false;
    const startHat = () => {
      if (hatAnim || !scene.stage.has(HAT)) return;
      hatAnim = true;
      const p = scene.sprite(HAT).behavior('Movie-Loop')?.params;
      const a = p?.pFirstMember ? scene.movie.memberAt(p.pFirstMember.castLib || 1, p.pFirstMember.member) : null;
      const b = p?.pLastMember ? scene.movie.memberAt(p.pLastMember.castLib || 1, p.pLastMember.member) : null;
      if (a && b) void scene.playSequence(HAT, a, b, +(p?.pFrameRate ?? 15) || 15, { loop: true });
    };
    let switching = false;
    const toScreen = async (next: 'Screen-2' | 'Screen-3') => {
      switching = true;
      boat.sp.setLoc(0, boat.sp.locV);
      boat.locH = 0;
      rocco.sp.setLoc(rocco.sp.locH - 800, rocco.sp.locV);
      rocco.locH -= 800;
      await scene.gotoFrame(next);
      label = next;
      // [Prüfung erforderlich] the Arrow sprites of the next screen start visible again (new span)
      for (const ch of [13, 14, 15]) if (scene.stage.has(ch)) scene.sprite(ch).blend = 100;
      if (next === 'Screen-3') startHat();
      switching = false;
    };
    const finish = async (frame: string) => {
      label = 'end';
      for (const ch of [21, 22, 25]) scene.puppet(ch, false);
      await scene.gotoFrame(frame);
    };
    scene.onTick(() => {
      if (label === 'end' || switching) return;
      // Arrow (prepareFrame): speed bonus for the boat whose loc is inside
      for (const ch of [13, 14, 15]) {
        if (!scene.stage.has(ch)) continue;
        const ar = scene.sprite(ch);
        if (ar.blend === 0) continue;
        const r = ar.rect();
        if (boat.sp.visible && inside(boat.sp.locH, boat.sp.locV, r)) {
          void scene.sound(B === 21 ? 'SpeedBingo' : 'SpeedPuck', 100);
          boat.speedH += 4.0;
          ar.blend = 0;
        }
        if (inside(rocco.sp.locH, rocco.sp.locV, r)) {
          void scene.sound('SpeedRocco', 100);
          rocco.speedH += 4.0;
          ar.blend = 0;
        }
      }
      // Screen-1 / Screen-2 exitFrame
      if (label === 'Game' || label === 'Screen-2') {
        if (boat.sp.locH > 800) void toScreen(label === 'Game' ? 'Screen-2' : 'Screen-3');
        return;
      }
      // Screen-3 exitFrame
      const hat = scene.stage.has(HAT) ? scene.sprite(HAT) : null;
      if (!hat) return;
      let target: string | null = null;
      if (boat.sp.visible && intersects(hat, boat.sp)) {
        if (sym(scene.state.get('OS15', 'AS020-02')) === 'passiv') {
          scene.state.set('OS15', 'activ', 'AS020-02');
          scene.state.set('CANON', 'unloaded', 'AS020-02');
        }
        void scene.sound('Camera', 100);
        ctl.setButton('Game-Ready');
        target = B === 21 ? 'BingoWins' : 'PuckWins';
      }
      if (intersects(hat, rocco.sp)) {
        void scene.playerTalk(3, { block: false });
        void scene.sound('Camera', 100);
        target = 'RoccoWins';
      }
      if (target) void finish(target);
    });
    return () => keys.off();
  }),
);

// ============================================================================ GS020-02 Pfannkuchen

registerOrigScene('GS020-02', (scene) =>
  gameScreen(scene, { back: 'AS020-07', start: 'Game' }, (ctl) => {
    const SPOON = 61, JAM = 60;
    // status bar: jam jars (95-97), jam left (98-100), cake display (101) + field cakesLeft (102)
    const jars = [statusSprite(scene, 95, 'Erdbeer-0', 430, 525), statusSprite(scene, 96, 'Blaubeer-0', 500, 525), statusSprite(scene, 97, 'Himbeer-0', 570, 525)];
    const left = [statusSprite(scene, 98, 'E-5', 485, 535), statusSprite(scene, 99, 'B-5', 555, 535), statusSprite(scene, 100, 'H-5', 625, 535)];
    statusSprite(scene, 101, 'Cake-Display', 640, 520);
    const field = document.createElement('div');
    field.style.cssText = `position:absolute;left:658px;top:${551 + STATUS_DY - 45}px;width:42px;height:37px;z-index:300;display:flex;align-items:center;justify-content:center;font:700 20px Arial,sans-serif;color:#000;pointer-events:none`;
    scene.stage.inner.append(field);

    const spoon = scene.sprite(SPOON);
    const jam = scene.sprite(JAM);
    const { m, off: offMouse } = mouseTracker(scene);

    // Erdbeer / Blaubeer / Himbeer (mouseDown): choose the jam
    const names = ['Erdbeer', 'Blaubeer', 'Himbeer'];
    let jamMode: 'loaded' | 'reset' | 'start' | 'flying' = 'loaded';
    jars.forEach((sp, i) => {
      sp.cursor = 'make';
      scene.on(sp.ch, 'mouseDown', () => {
        if (scene.busy) return;
        void scene.sound(`Glas-${random(2)}`, 100);
        if (jamMode === 'loaded') {
          jam.setMember(String(i + 1));
          jamMode = 'reset';
        }
        jars.forEach((j, k) => j.setMember(`${names[k]}-${k === i ? 1 : 0}`));
      });
    });

    // Pfannkuchen 1-3 (40 ms) + Luke 1-3 (25 fps)
    interface Cake { sp: Sprite; mode: 'waiting' | 'start' | 'flying'; vel: number; launch: number; left: number; luke: number }
    const now0 = performance.now();
    const cakes: Cake[] = [21, 22, 23].map((ch, i) => ({ sp: scene.sprite(ch), mode: 'waiting', vel: 0, launch: now0 + (i + 1) * 10000, left: 10, luke: 31 + i }));
    const lukes = new Map<number, { mode: 'stopped' | 'forward' | 'backward'; frame: number; base: string }>();
    for (const ch of [31, 32, 33]) {
      const [base] = memberNum(scene.sprite(ch));
      lukes.set(ch, { mode: 'stopped', frame: 1, base });
    }
    every(scene, 40, (now) => {
      for (const c of cakes) {
        if (c.mode === 'waiting' && now > c.launch) {
          c.sp.setMember('Kuchen0-1');
          if (c.left > 0) {
            c.mode = 'start';
            c.left--;
          }
        }
        if (c.mode === 'start') {
          c.vel = -25;
          c.mode = 'flying';
          lukes.get(c.luke)!.mode = 'forward';
          void scene.sound('Door-1', 50);
        }
        if (c.mode === 'flying') {
          c.sp.setLoc(c.sp.locH, c.sp.locV + c.vel);
          c.vel++;
          const [base, f] = memberNum(c.sp);
          c.sp.setMember(`${base}-${f < 10 ? f + 1 : 1}`);
          if (c.sp.locV > 450) {
            c.mode = 'waiting';
            c.sp.setLoc(c.sp.locH, 450);
            c.launch = now + rnd(5000, 10000);
            lukes.get(c.luke)!.mode = 'backward';
            void scene.sound('Door-2', 50);
          }
        }
      }
      for (const [ch, l] of lukes) {
        if (l.mode === 'stopped') continue;
        if (l.mode === 'forward' && l.frame !== 6) l.frame++;
        if (l.mode === 'backward' && l.frame !== 1) l.frame--;
        scene.sprite(ch).setMember(`${l.base}-${l.frame}`);
        if (l.frame === 1 || l.frame === 6) l.mode = 'stopped';
      }
    });

    // Spoon: follows the mouse; mouseDown (anywhere the spoon is, i.e. not on the jars/button) throws
    let spoonMode: 'stopped' | 'forward' | 'backward' = 'stopped';
    const down = (e: PointerEvent) => {
      if (scene.busy || !scene.alive) return;
      const p = scene.stage.toStage(e);
      const s = scene.stage.hitTest(p.x, p.y);
      if (s && (s.ch === 109 || s.ch > 110)) return;
      m.x = p.x;
      m.y = p.y;
      spoonMode = 'forward';
      void scene.sound('Wurf', 100);
    };
    scene.el.addEventListener('pointerdown', down);
    every(scene, 20, () => {
      if (spoonMode === 'forward') {
        const [base, f] = memberNum(spoon);
        if (f < 6) spoon.setMember(`${base}-${f + 1}`);
        else {
          if (jamMode === 'loaded' && spoon.member?.name !== 'Spoon0-6') jamMode = 'start';
          spoon.setMember('Spoon0-6');
          spoonMode = 'backward';
          return;
        }
      }
      if (spoonMode === 'backward') {
        const [base, f] = memberNum(spoon);
        if (f > 1) spoon.setMember(`${base}-${f - 1}`);
        else spoonMode = 'stopped';
      }
      spoon.setLoc(Math.round(m.x), Math.round(m.y));
    });

    // Klecks 11-15
    const klecks = [11, 12, 13, 14, 15].map((ch) => ({ sp: scene.sprite(ch), mode: 'ready' as 'ready' | 'forward' | 'wait' | 'fadeOut', timer: 0 }));
    klecks.forEach((k) => (k.sp.blend = 0));
    every(scene, 20, (now) => {
      for (const k of klecks) {
        if (k.mode === 'forward') {
          const [base, f] = memberNum(k.sp);
          if (f < 4) k.sp.setMember(`${base}-${f + 1}`);
          else {
            k.timer = now + 1000;
            k.mode = 'wait';
            continue;
          }
        }
        if (k.mode === 'wait' && now > k.timer) k.mode = 'fadeOut';
        if (k.mode === 'fadeOut') {
          if (k.sp.blend > 0) k.sp.blend = k.sp.blend - 2;
          else k.mode = 'ready';
        }
      }
    });

    // Jam (15 ms)
    let z = 100, speedV = 0, locV = 0;
    let done = false;
    const subCake = () => {
      const i = parseInt(jam.member?.name ?? '1', 10) - 1;
      const sp = left[i];
      const [base, n] = memberNum(sp);
      if (n > 1) sp.setMember(`${base}-${n - 1}`);
      else sp.blend = 0;
      if (left.some((s) => s.blend > 0) || done) return;
      done = true;
      ctl.setButton('Game-Ready');
      scene.state.set('OH1', 'state1', 'AS020-10');
      scene.state.set('ALFRED', 'gameOK', 'AS020-07');
    };
    every(scene, 15, () => {
      if (jamMode === 'reset') {
        jam.blend = 0;
        z = 100;
        jam.el.style.zIndex = String(JAM);
        jam.width = null;
        jam.height = null;
        jam.layout();
        spoon.setMember(`Spoon${jam.member?.name ?? '1'}-1`);
        jamMode = 'loaded';
      }
      if (jamMode === 'start') {
        locV = spoon.locV - 20;
        jam.setLoc(spoon.locH, locV);
        speedV = -20;
        jam.blend = 100;
        if (random(3) === 1 && !scene.talking) void scene.playerTalk(parseInt(jam.member?.name ?? '1', 10), { block: false });
        jamMode = 'flying';
      }
      if (jamMode === 'flying') {
        locV += speedV;
        z -= 1;
        speedV += 0.75;
        const mw = jam.member?.w ?? 0, mh = jam.member?.h ?? 0;
        jam.width = Math.round((mw * z) / 100);
        jam.height = Math.round((mh * z) / 100);
        jam.setLoc(jam.locH, Math.round(locV));
        if (z < 80 && z > 60) {
          for (const c of cakes) {
            if (jamMode !== 'flying') break;
            if (intersects(jam, c.sp)) {
              const [, f] = memberNum(c.sp);
              c.sp.setMember(`Kuchen${jam.member?.name}-${f}`);
              void scene.sound('Smash', 100);
              subCake();
              if (random(2) === 1 && !scene.talking) void scene.playerTalk(rnd(4, 7), { block: false });
              jamMode = 'reset';
            }
          }
        }
        if (jamMode === 'flying') {
          if (z < 60) jam.el.style.zIndex = '16';
          if (z < 50) {
            // intersects(jam, sprite 9 "Collision"): jam is copy ink -> bounding rects (the collision
            // sprite covers the whole scene) -> always a splash
            const k = klecks.find((x) => x.mode === 'ready');
            if (k) {
              void scene.sound('Smash', 100);
              k.sp.setMember(`Klecks${jam.member?.name}-1`);
              k.sp.setLoc(jam.locH, jam.locV);
              k.sp.blend = 100;
              k.mode = 'forward';
            }
            jamMode = 'reset';
          }
        }
      }
    });
    // enterFrame: field "cakesLeft"
    scene.onTick(() => {
      field.textContent = String(cakes.reduce((s, c) => s + c.left, 0));
    });
    return () => {
      offMouse();
      scene.el.removeEventListener('pointerdown', down);
      field.remove();
    };
  }),
);

// ============================================================================ GS020-04 Segeln

registerOrigScene('GS020-04', (scene) =>
  gameScreen(scene, { back: 'AS020-04', start: 'Screen-1' }, (ctl) => {
    const SHIP = 35, WIND = 50, CRASH = 9;
    // top right: the bottom right corner holds the start point + first passage of Screen-3
    // (ship 599,474 / passage 21 596,443), the left side the compass and rocks
    const keys = arrowKeys(scene, { left: [632, 8], right: [714, 8] });
    const shipNames: string[] = [];
    for (let i = 0; i < 72; i++) shipNames.push(`Schiff-${i}`);
    preloadMasks(scene, [...shipNames, 'Crash-1', 'Crash-2', 'Crash-3']);
    const PASSAGES: Record<string, number> = { 'Screen-1': 4, 'Screen-2': 6, 'Screen-3': 10 };
    let label = 'Screen-1';
    let jumpBack = 'Screen-1';
    let running = false;
    // ship (Schiff) + wind (WindB) + clouds (Wolke) state
    let sail = 0, sLocH = 0, sLocV = 0, sdH = 0, sdV = 1;
    let windMode: 'stopped' | 'newWind' | 'turnRight' | 'turnLeft' = 'newWind';
    let windDir = 0, windTarget = 0, newWindTime = 0, wdH = 0, wdV = 0;
    const clouds = new Map<number, { h: number; v: number; speed: number }>();
    let pfeilNext = 0;
    const dirOf = (sp: Sprite) => parseInt((sp.member?.name ?? '-0').split('-')[1], 10) || 0;
    const shipBegin = () => {
      const sp = scene.sprite(SHIP);
      sail = 0;
      sLocH = sp.locH;
      sLocV = sp.locV;
      const a = (dirOf(sp) * 5 * Math.PI) / 180;
      sdH = Math.sin(-a);
      sdV = Math.cos(-a);
    };
    const windBegin = () => {
      windMode = 'newWind';
      windDir = 0;
      wdH = 0;
      wdV = 0;
    };
    const cloudsBegin = () => {
      for (let ch = 41; ch <= 46; ch++) {
        if (!scene.stage.has(ch)) continue;
        const sp = scene.sprite(ch);
        sp.setLoc(random(800), random(600));
        clouds.set(ch, { h: sp.locH, v: sp.locV, speed: random(2) / 10.0 });
      }
    };
    const freshSprites = [SHIP, WIND, 41, 42, 43, 44, 45, 46];
    /** go(label) from the Intro / Crash / Course frames: all sprites begin again */
    const startScreen = async (l: string) => {
      running = false;
      for (const ch of freshSprites) scene.puppet(ch, false);
      await scene.gotoFrame(l);
      if (!scene.alive) return;
      label = l;
      jumpBack = l; // enterFrame: gJumpBackFrame = the frameLabel
      const f = scene.movie.frame(l);
      const ss = f?.sprites.find((s) => s.ch === SHIP);
      const ship = scene.sprite(SHIP);
      ship.setMember('Schiff-0');
      if (ss) ship.setRect(ss.left, ss.top);
      scene.sprite(WIND).setMember('Wind-0');
      for (let ch = 21; ch <= 30; ch++) if (scene.stage.has(ch)) scene.sprite(ch).blend = 50;
      for (const ch of freshSprites) scene.puppet(ch, true);
      shipBegin();
      windBegin();
      cloudsBegin();
      ctl.setButton('Game-Stop');
      ctl.onButton = null;
      running = true;
    };
    /** locV < 45 with all passages: next screen; ship, wind and clouds go on (sprite spans continue) */
    const nextScreen = async (l: string) => {
      running = false;
      const ship = scene.sprite(SHIP);
      ship.setLoc(ship.locH, 550);
      sLocV = 550;
      await scene.gotoFrame(l);
      if (!scene.alive) return;
      label = l;
      jumpBack = l;
      // [Prüfung erforderlich] the passages of the next screen start unpassed (blend 50 = score value)
      for (let ch = 21; ch <= 30; ch++) if (scene.stage.has(ch)) scene.sprite(ch).blend = 50;
      running = true;
    };
    /** go("Crash") / go("Course"): message frame, the button (Neustart) restarts gJumpBackFrame */
    const fail = async (frame: 'Crash' | 'Course') => {
      running = false;
      void scene.sound('Crash', 100);
      for (const ch of freshSprites) scene.puppet(ch, false);
      await scene.gotoFrame(frame);
      label = frame;
      ctl.setButton('Game-Start');
      ctl.onButton = () => {
        if (scene.busy) return;
        void scene.sound('Splash', 100);
        void startScreen(jumpBack);
      };
    };
    const checkCourse = (n: number) => {
      let i = 1;
      for (; i <= n; i++) if (scene.stage.has(20 + i) && scene.sprite(20 + i).blend === 50) break;
      for (; i <= n; i++) if (scene.stage.has(20 + i) && scene.sprite(20 + i).blend === 0) break;
      return i === n + 1;
    };
    const courseClear = (n: number) => {
      for (let i = 1; i <= n; i++) if (scene.stage.has(20 + i) && scene.sprite(20 + i).blend === 50) return false;
      return true;
    };
    let ended = false;
    const arrive = async () => {
      if (ended) return;
      ended = true;
      running = false;
      await scene.playSmacker('Ankunft');
      // Chapter-3 card; Taster (Chapter-3): CH1 + CH2 -> AS030-01, inventories cleared (app.startChapter)
      await startChapter(3);
    };

    every(scene, 40, (now) => {
      if (!running) return;
      // WindB (prepareFrame)
      const wind = scene.sprite(WIND);
      const curWind = dirOf(wind);
      if (windMode === 'stopped' && now > newWindTime) {
        windMode = 'newWind';
        void scene.sound('Wind', 30);
      }
      if (windMode === 'newWind') {
        windMode = random(2) === 1 ? 'turnRight' : 'turnLeft';
        windTarget = (random(36) - 1) * 10;
      }
      if (windMode === 'turnRight' || windMode === 'turnLeft') {
        windDir += windMode === 'turnRight' ? 10 : -10;
        if (windDir >= 360) windDir -= 360;
        if (windDir < 0) windDir += 360;
        wind.setMember(`Wind-${Math.trunc(windDir / 10)}`);
        if (windDir === windTarget) {
          windMode = 'stopped';
          newWindTime = now + rnd(5000, 10000);
        }
        // the deltas use the direction of the member shown before this step (original)
        const a = (curWind * 10 * Math.PI) / 180;
        wdH = Math.sin(-a);
        wdV = Math.cos(-a);
      }
      // Wolke
      for (const [ch, c] of clouds) {
        if (!scene.stage.has(ch)) continue;
        c.h -= wdH * c.speed;
        c.v -= wdV * c.speed;
        scene.sprite(ch).setLoc(Math.round(c.h), Math.round(c.v));
        if (c.h > 1000) c.h = -200;
        if (c.h < -200) c.h = 1000;
        if (c.v > 800) c.v = -200;
        if (c.v < -200) c.v = 800;
      }
      // Pfeil.checkContact (every 1000 ms)
      if (now >= pfeilNext) {
        pfeilNext = now + 1000;
        const ship = scene.sprite(SHIP);
        for (let ch = 21; ch <= 30; ch++) {
          if (!scene.stage.has(ch)) continue;
          const p = scene.sprite(ch);
          if (intersects(p, ship) && p.blend === 50) {
            p.blend = 0;
            void scene.sound('Glocke', 75);
          }
        }
      }
      // Schiff (exitFrame)
      const ship = scene.sprite(SHIP);
      const cur = dirOf(ship);
      if (keys.k.right || keys.k.left) {
        if (keys.k.right) {
          sail += 5;
          if (sail >= 360) sail -= 360;
        }
        if (keys.k.left) {
          sail -= 5;
          if (sail < 0) sail += 360;
        }
        ship.setMember(`Schiff-${Math.trunc(sail / 5)}`);
        const a = (cur * 5 * Math.PI) / 180;
        sdH = Math.sin(-a);
        sdV = Math.cos(-a);
      }
      sLocH = sLocH - sdH - wdH / 2;
      sLocV = sLocV - sdV - wdV / 2;
      ship.setLoc(Math.round(sLocH), Math.round(sLocV));

      // Screen-n exitFrame
      const n = PASSAGES[label] ?? 0;
      if (!n) return;
      if (!checkCourse(n)) return void fail('Course');
      if (scene.stage.has(CRASH) && matteIntersects(ship, scene.sprite(CRASH))) return void fail('Crash');
      const r = ship.rect();
      if (r.left > 800 || r.right < 0 || r.top > 600) return void fail('Course');
      if (label === 'Screen-3') {
        if (scene.stage.has(30) && scene.sprite(30).blend === 0) {
          if (courseClear(10)) return void arrive();
          return void fail('Course');
        }
        if (ship.locV < 45) return void fail('Course');
        return;
      }
      if (ship.locV < 45) {
        if (courseClear(n)) void nextScreen(label === 'Screen-1' ? 'Screen-2' : 'Screen-3');
        else void fail('Course');
      }
    });
    void startScreen('Screen-1');
    return () => keys.off();
  }),
);

// ============================================================================ GS020-05 Kisten-Puzzle

registerOrigScene('GS020-05', (scene) => {
  let clock: Sprite | null = null;
  let ready = false;
  return gameScreen(
    scene,
    {
      back: 'AS020-10',
      start: 'Game',
      // Taster Stop -> gExitFlag; framescript: solved in time -> the store room AS020-09
      exit: () => {
        if (clock && clock.member?.name !== 'Clock-61' && ready) scene.goto('AS020-09');
        else scene.goto('AS020-10');
      },
    },
    (ctl) => {
      const BOXES = [31, 32, 33, 34, 35, 36, 37, 38];
      // mixSprites(31, 38, rect(100,100,700,450)); mixSprites(11, 18, rect(100,120,700,440))
      const mix = (first: number, last: number, b: R) => {
        let tries = 0;
        for (let i = first; i <= last; i++) {
          for (;;) {
            tries++;
            if (tries > 1000) {
              i = first;
              tries = 0;
            }
            const sp = scene.sprite(i);
            sp.setLoc(rnd(b.left, b.right), rnd(b.top, b.bottom));
            const r1 = sp.rect();
            let touching = false;
            for (let j = first; j < i; j++) {
              const r2 = scene.sprite(j).rect();
              if (rectsMeet({ left: r1.left - 1, top: r1.top - 1, right: r1.right + 1, bottom: r1.bottom + 1 }, { left: r2.left - 1, top: r2.top - 1, right: r2.right + 1, bottom: r2.bottom + 1 })) {
                touching = true;
                break;
              }
            }
            if (!touching) break;
          }
        }
      };
      mix(31, 38, { left: 100, top: 100, right: 700, bottom: 450 });
      mix(11, 18, { left: 100, top: 120, right: 700, bottom: 440 });

      // Timer (status bar sprite 95 + frame 96)
      statusSprite(scene, 96, 'Clock Drop', 420, 503);
      clock = statusSprite(scene, 95, 'Clock-1', 431, 530);
      clock.el.style.zIndex = String(197); // [Prüfung erforderlich] score: 96 above 95; the clock face is shown on top
      let clockMode: 'running' | 'stopped' = 'running';
      let stopTick: (() => void) | null = null;
      let timer = 0;
      scene.onTick((now) => {
        if (now < timer) return;
        timer = now + 1000;
        if (clockMode === 'running') {
          if (!stopTick) stopTick = playEffectLoop(scene.movie.dir, 'Clock', 100);
          const [base, f0] = memberNum(clock!);
          let f = f0;
          if (f < 61) f++;
          else {
            clockMode = 'stopped';
            stopTick?.();
            stopTick = null;
          }
          if (f > 50) void scene.sound('Sinus', 100);
          clock!.setMember(`${base}-${f}`);
        }
        if (clockMode === 'stopped' && stopTick) {
          stopTick();
          stopTick = null;
        }
      });

      // Kiste: drag along one axis between the other boxes
      const { m, off: offMouse } = mouseTracker(scene);
      type Mode = 'checkDirection' | 'moveH' | 'moveV';
      let drag: { sp: Sprite; mode: Mode; offH: number; offV: number; startH: number; startV: number; L: number; Rb: number; T: number; Bb: number } | null = null;
      const borders = (me: Sprite) => {
        const r = me.rect();
        let L = 0, Rb = 800, T = 45, Bb = 495;
        for (const b of BOXES) {
          if (b === me.ch) continue;
          const o = scene.sprite(b).rect();
          // checkLeftBorder
          if (!(o.bottom < r.top) && !(o.top > r.bottom) && !(o.left > r.right) && o.right > L) L = o.right;
          // checkRightBorder
          if (!(o.bottom < r.top) && !(o.top > r.bottom) && !(o.right < r.left) && o.left < Rb) Rb = o.left;
          // checkTopBorder
          if (!(o.left > r.right) && !(o.right < r.left) && !(o.top > r.bottom) && o.bottom > T) T = o.bottom;
          // checkBottomBorder
          if (!(o.left > r.right) && !(o.right < r.left) && !(o.bottom < r.top) && o.top < Bb) Bb = o.top;
        }
        return { L, Rb, T, Bb };
      };
      const release = () => {
        drag = null;
        void scene.sound(`Hit-${random(2)}`, 100);
      };
      for (const ch of BOXES) {
        const sp = scene.sprite(ch);
        sp.cursor = 'take';
        scene.on(ch, 'mouseDown', (_s, _e, pt) => {
          if (scene.busy) return;
          m.x = pt.x;
          m.y = pt.y;
          const b = borders(sp);
          drag = { sp, mode: 'checkDirection', offH: pt.x - sp.locH, offV: pt.y - sp.locV, startH: sp.locH, startV: sp.locV, L: b.L, Rb: b.Rb, T: b.T, Bb: b.Bb };
          scene.stage.cursorOverride = 'grab';
          scene.stage.updateCursor();
        });
      }
      const up = () => {
        if (!drag) return;
        drag = null; // mouseUp / mouseUpOutSide: #stopped
        scene.stage.cursorOverride = null;
        scene.stage.updateCursor();
      };
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);
      scene.onTick(() => {
        const d = drag;
        if (d) {
          const sp = d.sp;
          if (d.mode === 'checkDirection') {
            const dh = Math.abs(m.x - d.offH - d.startH), dv = Math.abs(m.y - d.offV - d.startV);
            if (dh >= 5 || dv >= 5) d.mode = dh >= dv ? 'moveH' : 'moveV';
          }
          const w = sp.w, h = sp.h;
          if (d.mode === 'moveH') {
            sp.setLoc(Math.round(m.x - d.offH), sp.locV);
            if (sp.left + w > d.Rb - 1) {
              sp.setRect(d.Rb - 1 - w, sp.top);
              release();
            } else if (sp.left < d.L + 1) {
              sp.setRect(d.L + 1, sp.top);
              release();
            }
          } else if (d.mode === 'moveV') {
            sp.setLoc(sp.locH, Math.round(m.y - d.offV));
            if (sp.top < d.T + 1) {
              sp.setRect(sp.left, d.T + 1);
              release();
            } else if (sp.top + h > d.Bb - 1) {
              sp.setRect(sp.left, d.Bb - 1 - h);
              release();
            }
          }
          if (!drag) {
            scene.stage.cursorOverride = null;
            scene.stage.updateCursor();
          }
        }
        // shadows follow their boxes (every box's prepareFrame)
        for (const ch of BOXES) {
          const b = scene.sprite(ch);
          scene.sprite(ch - 10).setLoc(b.locH + Math.trunc((b.locH - 400) / 20), b.locV - 10);
        }
        // enterFrame: checkBoxesReady (box n entirely within target n-20)
        const all = BOXES.every((ch) => {
          const r = scene.sprite(ch).rect(), t = scene.sprite(ch - 20).rect();
          return r.left >= t.left && r.top >= t.top && r.right <= t.right && r.bottom <= t.bottom;
        });
        if (all) {
          if (clockMode === 'running' && clock!.member?.name !== 'Clock-61') {
            if (!scene.talking) void scene.playerTalk(1, { block: false });
            clockMode = 'stopped';
            ready = true;
            ctl.setButton('Game-Ready');
          }
        } else {
          clockMode = 'running';
          ready = false;
          ctl.setButton('Game-Stop');
        }
      });
      return () => {
        stopTick?.();
        offMouse();
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', up);
      };
    },
  );
});

// ============================================================================ GS020-06 Lappen schneiden

registerOrigScene('GS020-06', (scene) =>
  gameScreen(scene, { back: 'AS020-11', start: 'Game' }, () => {
    const REELING = 11, KNIFE = 30, MOUTH = 11;
    const LAPPEN = [21, 22, 23, 24, 25];
    // frame script beginSprite: knife visible, all five places locked
    const knife = scene.sprite(KNIFE);
    knife.visible = true;
    for (const ch of LAPPEN) scene.state.set(`OS${ch}`, 'locked');
    const reeling = scene.sprite(REELING);
    const nonePosition = rnd(21, 25); // Reeling.beginSprite: the place where nobody stands behind
    const { m, off: offMouse } = mouseTracker(scene);
    // Two-State Animation (15 fps, no loop) driven by the Lappen script
    const anim = new Map<number, { mode: 'stopped' | 'forward' | 'backward'; frame: number; base: string }>();
    for (const ch of LAPPEN) anim.set(ch, { mode: 'stopped', frame: 1, base: `Lappen${ch - 20}` });
    every(scene, 1000 / 15, () => {
      for (const [ch, a] of anim) {
        if (a.mode === 'stopped') continue;
        if (a.mode === 'forward' && a.frame !== 11) a.frame++;
        if (a.mode === 'backward' && a.frame !== 1) a.frame--;
        scene.sprite(ch).setMember(`${a.base}-${a.frame}`);
        if (a.frame === 1 || a.frame === 11) a.mode = 'stopped';
      }
    });
    const st = (ch: number) => sym(scene.state.get(`OS${ch}`));
    const show = (ch: number) => {
      const sp = scene.sprite(ch);
      const s = st(ch);
      sp.blend = s === 'passiv' ? 0 : 100;
      sp.hitHidden = true;
      sp.hitRect = true; // copy ink: Director hits the bounding rect (the cut piece is mostly transparent)
      sp.props.pickup = s === 'activ';
      sp.props.sourceKey = `OS${ch}`;
      sp.cursor = s === 'activ' ? 'take' : 'make';
    };
    scene.onTick(() => {
      // Messer: follows the mouse; enterFrame: visible only while every piece is uncut
      knife.setLoc(Math.round(m.x + 5), Math.round(m.y - 5));
      knife.visible = LAPPEN.every((ch) => scene.sprite(ch).member?.name === `Lappen${ch - 20}-1`);
      // Lappen.prepareFrame: wrong pieces grow back when the voice is over
      if (!scene.talking) for (const ch of LAPPEN) if (ch !== nonePosition) anim.get(ch)!.mode = 'backward';
      for (const ch of LAPPEN) show(ch);
    });
    for (const ch of LAPPEN) {
      const sp = scene.sprite(ch);
      // the port's mouseUp replaces the generic item click of OS<ch> on the game frame (sceneView)
      scene.on(ch, 'mouseDown', () => {
        if (scene.busy || scene.hand || !knife.visible) return;
        void scene.sound('Stoff-1', 100);
      });
      scene.on(ch, 'mouseUp', () => {
        if (scene.busy) return;
        const hand = scene.hand;
        // Inventar im Adventurescreen: put the rag back onto its (passiv) place / take it
        if (hand) {
          if (st(ch) === 'passiv' && hand === 'OI035') {
            scene.state.set(`OS${ch}`, 'activ');
            scene.consumeHand();
          } else scene.returnHand();
          return;
        }
        if (knife.visible) {
          void scene.sound('Stoff-2', 100);
          knife.visible = false;
          anim.get(ch)!.mode = 'forward';
          if (nonePosition === ch) {
            reeling.blend = 0;
            scene.state.set(`OS${ch}`, 'activ');
          } else {
            reeling.blend = 100;
            reeling.setLoc(sp.locH + 15, sp.locV - 10);
            void scene.talk(`ReelingTalk-${random(2)}`, { mouthCh: MOUTH, block: false });
          }
          return;
        }
        if (st(ch) === 'activ') {
          scene.state.set(`OS${ch}`, 'passiv');
          scene.putInHand('OI035', { key: `OS${ch}`, screen: 'GS020-06' });
          show(ch);
        }
      });
    }
    return () => offMouse();
  }),
);
