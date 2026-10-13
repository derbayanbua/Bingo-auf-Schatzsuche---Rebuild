// GS005-06 – Tauchgang (Game\GS005-06). Port of the Local Lingo: Taucher (3), checkBorders (Movie 11),
// frame script (2, air timer + exits), Coin (4), Bubble (5) + Sinus-Animation, Box (6), Random Movement
// and Rotation (7), Progressbar (8, air), Sauerstoffflaschen (10).
//
// Intro frame: slot OS101 (OI040) + Taster Start/Back. Game: labels Screen-1..8 (15..85), Screen-X (95).
// Win: leave Screen-8 at the top -> video Tauchen-1 (Bingo) / Tauchen-2 (Puck) -> AS017-01.
// Fail: air empty, Screen-1 out to the right, or the Stop button -> video Schleuse-2 -> AS005-08.
//
// Controls: original = arrow keys (left/right/up, baKeyIsDown). Additionally on-screen buttons for
// touch/mouse (hold) and A/D/W. Collision masks (sprite 9, matte 1-bit bitmaps Collision-3/4/5/X) are
// tested pixel-exactly against the 5x5 sensors 1-4.

import type { OrigScene } from '../sceneView';
import { registerOrigScene } from '../sceneView';
import type { Sprite } from '../stage';
import { gameButton, hideGenericBack, overlay, prefSlots, rnd } from './gs005Common';

type Mask = { w: number; h: number; a: Uint8Array };
const maskCache = new Map<string, Promise<Mask | null>>();
function loadMask(url: string): Promise<Mask | null> {
  let p = maskCache.get(url);
  if (!p) {
    p = new Promise((res) => {
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
          for (let i = 0; i < a.length; i++) a[i] = d[i * 4 + 3] > 24 ? 1 : 0;
          res({ w: c.width, h: c.height, a });
        } catch {
          res(null);
        }
      };
      img.onerror = () => res(null);
      img.src = url;
    });
    maskCache.set(url, p);
  }
  return p;
}

const rectsMeet = (a: Sprite, b: Sprite) => {
  const r = a.rect(), s = b.rect();
  return r.left < s.right && s.left < r.right && r.top < s.bottom && s.top < r.bottom;
};

const AIR_MAX = 400;

registerOrigScene('GS005-06', (scene: OrigScene) => {
  hideGenericBack(scene);
  const pc = scene.ctx.s.playerCharacter === 'Puck' ? 'Puck' : 'Bingo';
  let alive = true;
  let running = false; // game frames active (not switching / leaving)
  let label = 'Intro';
  let leaving = false;

  // ------------------------------------------------------------ Intro + Taster
  const checkPrefs = prefSlots(scene);
  const btn = gameButton(scene, (m) => {
    if (leaving) return;
    if (m === 'Game-Start') void startGame();
    else if (m === 'Game-Back') scene.goto('AS005-08'); // Framescript GameScreens: no video
    // Taster Stop -> jumpToCurrentCharacter() sets gTargetMovie = AS005-08 + gExitFlag; the local
    // exitFrame then plays Schleuse-2 like a failed dive
    else void exit('AS005-08');
  });
  btn.set(checkPrefs() ? 'Game-Start' : 'Game-Back');

  // ------------------------------------------------------------ HUD: air bar + touch controls
  // Progressbar sprite 95 ("Air", 524..674 x 554) lives in the status bar, outside the scene view:
  // drawn here at the top of the scene with the original members [Abweichung: Position].
  const airBox = overlay(scene, 'div', 325, 6, 150, 9, 'display:none;background:rgba(0,0,0,.45);border:1px solid rgba(255,255,255,.7);border-radius:3px;overflow:hidden;pointer-events:none');
  const airFill = document.createElement('div');
  airFill.style.cssText = 'height:100%;width:100%;background:#4fc3ff;background-size:100% 100%';
  airBox.append(airFill);
  const airRef = scene.member('Air');
  if (airRef?.url) airFill.style.backgroundImage = `url("${airRef.url}")`;
  airBox.setAttribute('role', 'progressbar');
  airBox.setAttribute('aria-label', 'Luft');

  const keys = { left: false, right: false, up: false };
  const pad = overlay(scene, 'div', 8, 360, 220, 80, 'display:none;gap:8px;touch-action:none;user-select:none');
  const mk = (k: keyof typeof keys, txt: string, aria: string) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = txt;
    b.setAttribute('aria-label', aria);
    b.style.cssText = 'flex:1;font-size:34px;line-height:1;border-radius:14px;border:2px solid rgba(255,255,255,.75);background:rgba(0,40,80,.35);color:#fff;touch-action:none';
    const on = (e: Event) => {
      e.preventDefault();
      keys[k] = true;
    };
    const off = () => (keys[k] = false);
    b.addEventListener('pointerdown', (e) => {
      b.setPointerCapture?.((e as PointerEvent).pointerId);
      on(e);
    });
    b.addEventListener('pointerup', off);
    b.addEventListener('pointercancel', off);
    b.addEventListener('lostpointercapture', off);
    b.addEventListener('contextmenu', (e) => e.preventDefault());
    pad.append(b);
  };
  mk('left', '◀', 'Nach links schwimmen');
  mk('up', '▲', 'Nach oben schwimmen');
  mk('right', '▶', 'Nach rechts schwimmen');

  const keyMap: Record<string, keyof typeof keys> = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', a: 'left', d: 'right', w: 'up', A: 'left', D: 'right', W: 'up' };
  const onKey = (e: KeyboardEvent) => {
    const k = keyMap[e.key];
    if (!k || label === 'Intro') return;
    if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
    e.preventDefault();
    keys[k] = e.type === 'keydown';
  };
  const blur = () => (keys.left = keys.right = keys.up = false);
  window.addEventListener('keydown', onKey);
  window.addEventListener('keyup', onKey);
  window.addEventListener('blur', blur);

  // ------------------------------------------------------------ diver state (Taucher behaviour)
  const D = {
    x: 0, y: 0, vH: -5, vV: -5,
    mode: 'dive' as 'dive' | 'turnLeft' | 'turnRight',
    dir: 'diveLeft' as 'diveLeft' | 'diveRight',
    paddle: 50, next: 0,
  };
  let air = AIR_MAX;
  let airTimer = 0;
  let diver: Sprite;
  let mask: { sp: Sprite; m: Mask } | null = null;
  // per-screen sprite behaviours (re-initialised on every screen = new sprite spans)
  let screenTicks: ((now: number) => void)[] = [];

  const memberIdx = (sp: Sprite) => +(/-(\d+)$/.exec(sp.member?.name ?? '')?.[1] ?? 1);
  const baseOf = (sp: Sprite) => (sp.member?.name ?? '').replace(/-\d+$/, '');

  function hitsMask(s: Sprite): boolean {
    if (!mask) return false; // screens without sprite 9
    const r = s.rect(), mr = mask.sp.rect();
    const { m } = mask;
    const sx = m.w / (mr.right - mr.left), sy = m.h / (mr.bottom - mr.top);
    for (let y = Math.floor(r.top); y < r.bottom; y++) {
      for (let x = Math.floor(r.left); x < r.right; x++) {
        if (x < mr.left || y < mr.top || x >= mr.right || y >= mr.bottom) continue;
        const px = Math.floor((x - mr.left) * sx), py = Math.floor((y - mr.top) * sy);
        if (m.a[py * m.w + px]) return true;
      }
    }
    return false;
  }

  function updateDiver() {
    if (keys.left) {
      D.paddle = 20;
      if (D.dir === 'diveRight' && D.mode === 'dive') {
        D.mode = 'turnLeft';
        diver.setMember(`${pc}W-10`);
      } else if (D.vH > -3) D.vH -= 0.3;
    }
    if (keys.right) {
      D.paddle = 20;
      if (D.dir === 'diveLeft' && D.mode === 'dive') {
        diver.setMember(`${pc}W-1`);
        D.mode = 'turnRight';
      } else if (D.vH < 3) D.vH += 0.3;
    }
    if (keys.up) {
      D.paddle = 20;
      if (D.vV > 0) D.vV = 0;
      D.vV -= 0.5;
    }
    if (D.mode === 'turnLeft') {
      let f = memberIdx(diver);
      if (f > 1) {
        f--;
        D.vH -= 0.5;
      } else {
        diver.setMember(`${pc}L-1`);
        D.dir = 'diveLeft';
        D.mode = 'dive';
        return; // original: exit (no physics this update)
      }
      diver.setMember(`${pc}W-${f}`);
    }
    if (D.mode === 'turnRight') {
      let f = memberIdx(diver);
      if (f < 10) {
        f++;
        D.vH += 0.5;
      } else {
        diver.setMember(`${pc}R-1`);
        D.dir = 'diveRight';
        D.mode = 'dive';
        return;
      }
      diver.setMember(`${pc}W-${f}`);
    }
    if (D.mode === 'dive') {
      const f = memberIdx(diver);
      diver.setMember(`${baseOf(diver)}-${f < 10 ? f + 1 : 1}`);
    }
    if (D.vV < 10) D.vV += 0.2;
    if (D.dir === 'diveRight' && D.vH > 0) D.vH -= 0.1;
    if (D.dir === 'diveLeft' && D.vH < 0) D.vH += 0.1;
    const r = diver.rect();
    const cx = r.left + Math.trunc((r.right - r.left) / 2);
    const cy = r.top + Math.trunc((r.bottom - r.top) / 2);
    const s = [1, 2, 3, 4].map((c) => scene.sprite(c));
    s[0].setLoc(cx, r.top - 5);
    s[1].setLoc(cx, r.bottom + 5);
    s[2].setLoc(r.left - 5, cy);
    s[3].setLoc(r.right + 5, cy);
    if (hitsMask(s[0])) {
      if (D.vV < 0) D.vV = 0;
      air--;
    }
    if (hitsMask(s[1])) {
      if (D.vV > 0) D.vV = 0;
      air--;
    }
    if (hitsMask(s[2])) {
      if (D.vH < 0) D.vH = 0;
      air--;
    }
    if (hitsMask(s[3])) {
      if (D.vH > 0) D.vH = 0;
      air--;
    }
    D.x += D.vH;
    D.y += D.vV;
    diver.setLoc(D.x, D.y);
    if (D.paddle < 50) D.paddle++;
  }

  const sens = (c: number) => scene.sprite(c);
  const capTop = () => {
    if (sens(1).locV < 45 && D.vV < 0) D.vV = 0;
  };
  const capBottom = (lim: number) => {
    if (sens(2).locV > lim && D.vV > 0) D.vV = 0;
  };

  /** checkBorders (Movie Script 11), every exitFrame */
  function checkBorders(): string | null {
    switch (label) {
      case 'Screen-1':
        capTop();
        capBottom(450);
        if (D.x < -25) {
          D.x = 825;
          return 'Screen-2';
        }
        if (diver.locH > 800 && D.dir === 'diveRight') void exit('AS005-08');
        break;
      case 'Screen-2':
        capTop();
        capBottom(450);
        if (D.x < -25) {
          D.x = 825;
          D.y = 380;
          return 'Screen-3';
        }
        if (D.x > 825) {
          D.x = -25;
          return 'Screen-1';
        }
        break;
      case 'Screen-3':
        capTop();
        capBottom(600);
        if (D.x < -25) {
          D.x = 825;
          D.y = 280;
          return 'Screen-4';
        }
        if (D.x > 825) {
          D.x = -25;
          return 'Screen-2';
        }
        break;
      case 'Screen-4':
        capTop();
        capBottom(600);
        if (D.x < -25) {
          D.x = 825;
          D.y = 280;
          return 'Screen-5';
        }
        if (D.x > 825) {
          D.x = -25;
          D.y = 380;
          return 'Screen-3';
        }
        break;
      case 'Screen-5':
        capTop();
        if (diver.locV > 500) {
          D.y = 45;
          return 'Screen-X';
        }
        if (D.x < -25) {
          D.x = 825;
          return 'Screen-6';
        }
        if (D.x > 825) {
          D.x = -25;
          D.y = 200;
          return 'Screen-4';
        }
        break;
      case 'Screen-6':
        capTop();
        capBottom(450);
        if (D.x < -25) {
          D.x = 825;
          return 'Screen-7';
        }
        if (D.x > 825) {
          D.x = -25;
          D.y = 200;
          return 'Screen-5';
        }
        break;
      case 'Screen-7':
        capTop();
        capBottom(450);
        if (D.x < -25) {
          D.x = 825;
          return 'Screen-8';
        }
        if (D.x > 825) {
          D.x = -25;
          return 'Screen-6';
        }
        break;
      case 'Screen-8':
        if (D.y < 45) void exit('AS017-01');
        capBottom(450);
        if (sens(3).locH < 0 && D.vH < 0) D.vH = 0;
        if (D.x > 825) {
          D.x = -25;
          return 'Screen-7';
        }
        break;
      case 'Screen-X':
        if (diver.locV < 45) {
          D.y = 500;
          return 'Screen-5';
        }
        capBottom(450);
        if (sens(3).locH < 0 && D.vH < 0) D.vH = 0;
        if (sens(4).locH > 800 && D.vH > 0) D.vH = 0;
        break;
    }
    // barrels 21-25
    for (let i = 21; i <= 25; i++) {
      if (!scene.stage.has(i) || !scene.sprite(i).member) continue;
      if (!rectsMeet(diver, scene.sprite(i))) continue; // [Prüfung erforderlich] matte outlines -> rects
      if (Math.abs(D.vH) > 1) {
        if (rnd(1, 5) === 1) void scene.sound('Tonne', 100);
        D.vH = -D.vH;
      }
      if (Math.abs(D.vV) > 1) {
        if (rnd(1, 5) === 1) void scene.sound('Tonne', 100);
        D.vV = -D.vV;
      }
    }
    return null;
  }

  // ------------------------------------------------------------ per-screen behaviours
  function bindScreen() {
    screenTicks = [];
    for (const c of [1, 2, 3, 4, 9]) if (scene.stage.has(c)) scene.sprite(c).visible = false;
    mask = null;
    if (scene.stage.has(9)) {
      const sp = scene.sprite(9);
      const url = sp.member?.url;
      if (url) void loadMask(url).then((m) => {
        if (m && scene.stage.has(9) && scene.sprite(9) === sp && sp.member?.url === url) mask = { sp, m };
      });
    }
    for (const sp of scene.stage.sprites.values()) {
      const names = sp.behaviors.map((b) => b.name);
      // Coin (40 ms): collect + spin Coin-1..10
      if (names.includes('Coin')) {
        let t = 0;
        screenTicks.push((now) => {
          if (now < t) return;
          if (sp.blend > 0 && rectsMeet(sp, diver)) {
            void scene.sound('Ping', 100);
            sp.blend = 0;
            scene.ctx.addCoins(1);
          }
          const f = memberIdx(sp);
          sp.setMember(`${baseOf(sp)}-${f < 10 ? f + 1 : 1}`);
          t = now + 40;
        });
      }
      // Box (chest): opens once when touched on its first frame: Truhe + OI081 sound + 10 coins
      const box = sp.behavior('Box');
      if (box && names.includes('Box')) {
        const p = box.params;
        const seq = scene.movie.sequence(scene.movie.memberAt(p.pFirstMember.castLib || 1, p.pFirstMember.member)!, scene.movie.memberAt(p.pLastMember.castLib || 1, p.pLastMember.member)!);
        let i = 0;
        let dir: 'stopped' | 'forward' = 'stopped';
        let t = 0;
        const wait = 1000 / (+p.pFrameRate || 25);
        screenTicks.push((now) => {
          if (now < t + wait) return;
          if (rectsMeet(sp, diver) && i === 0) {
            dir = 'forward';
            void scene.sound('Truhe', 100);
            void scene.sound('OI081-Sound', 100);
            scene.ctx.addCoins(10);
          }
          if (dir === 'forward') {
            i++;
            if (seq[i]) sp.setMember(seq[i]);
            if (i >= seq.length - 1) dir = 'stopped'; // pLoop 0
            t = now;
          }
        });
      }
      // Sauerstoffflaschen: refill air
      if (names.includes('Sauerstoffflaschen')) {
        screenTicks.push(() => {
          if (sp.blend === 100 && rectsMeet(sp, diver)) {
            sp.blend = 0;
            void scene.sound('Air-Sound', 100);
            air = AIR_MAX;
          }
        });
      }
      // Bubble + Sinus-Animation (#oben): each behaviour moves the sprite on its own timer
      for (const b of sp.behaviors) {
        if (b.name !== 'Bubble' && b.name !== 'Sinus-Animation') continue;
        const p = b.params;
        const wait = 1000 / (+p.pFrameRate || 25);
        const start = sp.locH;
        let lh = sp.locH;
        let speed = +p.pStartSpeed || 0;
        let t = performance.now();
        screenTicks.push((now) => {
          if (now < t + wait) return;
          const freq = +p.pFreq || 30, amp = +p.pAmp || 0;
          if (p.pDirection === '#oben') {
            const v = sp.locV - speed;
            sp.setLoc(lh + Math.round(Math.sin(sp.locV / freq) * amp), v);
            if (sp.rect().bottom < 0) {
              sp.setLoc(sp.locH, sp.locV + 600 + sp.h);
              lh = start + (p.pRandomDisp ? rnd(1, +p.pRandomDisp) : 0);
              speed = +p.pStartSpeed || 0;
            }
          }
          speed += +p.pAcc || 0;
          t = now;
        });
      }
      // Movie-Loop (barrel members) + Random Movement and Rotation
      const loop = sp.behavior('Movie-Loop');
      if (loop) {
        const p = loop.params;
        const seq = scene.movie.sequence(scene.movie.memberAt(p.pFirstMember.castLib || 1, p.pFirstMember.member)!, scene.movie.memberAt(p.pLastMember.castLib || 1, p.pLastMember.member)!);
        const wait = 1000 / (+p.pFrameRate || 25);
        let i = 0, t = performance.now();
        screenTicks.push((now) => {
          if (now < t + wait || seq.length < 2) return;
          i = (i + 1) % seq.length;
          sp.setMember(seq[i]);
          t = now;
        });
      }
      const rm = sp.behavior('Random Movement and Rotation');
      if (rm) screenTicks.push(randomMovement(sp, rm.params));
    }
  }

  function randomMovement(sp: Sprite, p: Record<string, any>) {
    type P = { x: number; y: number };
    const r = sp.rect();
    const far = Math.max(
      ...[[r.left, r.top], [r.right, r.top], [r.left, r.bottom], [r.right, r.bottom]].map(([x, y]) => Math.hypot(sp.locH - x, sp.locV - y)),
    );
    const lim = { l: +p.pLimitsLeft + far, t: +p.pLimitsTop + far, r: +p.pLimitsRight - far, b: +p.pLimitsBottom - far };
    const speed = +p.pSpeed || 0;
    const restrain = (q: P): P => ({ x: Math.min(lim.r, Math.max(lim.l, q.x)), y: Math.min(lim.b, Math.max(lim.t, q.y)) });
    const len = (q: P) => Math.hypot(q.x, q.y);
    const sign = () => (Math.random() < 0.5 ? -1 : 1);
    let path = { p0: { x: sp.locH, y: sp.locV }, p1: { x: sp.locH, y: sp.locV }, p2: { x: sp.locH, y: sp.locV }, p3: { x: sp.locH, y: sp.locV }, dc: { x: 0, y: 0 }, db: { x: 0, y: 0 }, da: { x: 0, y: 0 } };
    let start = 0, period = 1, end = 0;
    const newPath = () => {
      if (!speed) return;
      const dest = { x: rnd(1, Math.max(1, Math.round(lim.r - lim.l))) + lim.l, y: rnd(1, Math.max(1, Math.round(lim.b - lim.t))) + lim.t };
      const p0 = path.p3;
      const v = { x: dest.x - p0.x, y: dest.y - p0.y };
      const loopy = Math.round((len(v) * (+p.pLoopiness || 0)) / 25);
      const p1 = restrain({ x: p0.x + (path.p3.x - path.p2.x), y: p0.y + (path.p3.y - path.p2.y) });
      const rp = loopy ? { x: sign() * rnd(1, loopy), y: sign() * rnd(1, loopy) } : { x: 0, y: 0 };
      const p2 = restrain({ x: p0.x + (v.x * 2) / 3 + rp.x, y: p0.y + (v.y * 2) / 3 + rp.y });
      const dc = { x: 3 * (p1.x - p0.x), y: 3 * (p1.y - p0.y) };
      const db = { x: 3 * (p2.x - p1.x) - dc.x, y: 3 * (p2.y - p1.y) - dc.y };
      const da = { x: dest.x - p0.x - dc.x - db.x, y: dest.y - p0.y - dc.y - db.y };
      path = { p0, p1, p2, p3: dest, dc, db, da };
      const dist = len({ x: p0.x - p1.x, y: p0.y - p1.y }) + len({ x: p1.x - p2.x, y: p1.y - p2.y }) + len({ x: p2.x - dest.x, y: p2.y - dest.y });
      period = Math.max(1, (dist * 1000) / speed);
      start = performance.now();
      end = start + period;
    };
    newPath();
    let t = 0;
    return (now: number) => {
      if (now < t || !speed) return;
      t = now + 40;
      if (now < end) {
        const e = now - start;
        if (e > 0) {
          const t1 = e / period, t2 = t1 * t1, t3 = t2 * t1;
          sp.setLoc(path.p0.x + path.dc.x * t1 + path.db.x * t2 + path.da.x * t3, path.p0.y + path.dc.y * t1 + path.db.y * t2 + path.da.y * t3);
        }
      } else {
        sp.setLoc(path.p3.x, path.p3.y);
        newPath();
      }
    };
  }

  async function go(l: string) {
    running = false;
    label = l;
    await scene.gotoFrame(l);
    if (!alive || leaving) return;
    bindScreen();
    running = true;
  }

  async function startGame() {
    btn.set('Game-Stop');
    await scene.gotoFrame('Screen-1');
    if (!alive) return;
    label = 'Screen-1';
    diver = scene.sprite(15);
    scene.puppet(15);
    // Taucher.beginSprite
    D.x = diver.locH;
    D.y = diver.locV;
    D.vH = -5;
    D.vV = -5;
    D.mode = 'dive';
    D.dir = 'diveLeft';
    D.paddle = 50;
    D.next = 0;
    diver.setMember(`${pc}L-1`);
    air = AIR_MAX; // Progressbar pCurrentValue 400
    airTimer = performance.now() + 250;
    airBox.style.display = '';
    pad.style.display = 'flex';
    bindScreen();
    running = true;
  }

  scene.onTick((now) => {
    if (scene.frame < 15) {
      if (!leaving) btn.set(checkPrefs() ? 'Game-Start' : 'Game-Back');
      return;
    }
    if (!running || leaving || scene.busy) return;
    // frame script enterFrame: air -1 every 250 ms, empty -> back to AS005-08
    if (now >= airTimer) {
      if (air > 0) {
        air--;
        airTimer = now + 250;
      } else return void exit('AS005-08');
    }
    // Taucher.prepareFrame
    if (now >= D.next) {
      D.next = now + D.paddle;
      updateDiver();
    }
    for (const f of screenTicks) f(now);
    airFill.style.width = `${Math.max(0, Math.min(1, air / AIR_MAX)) * 100}%`;
    airBox.setAttribute('aria-valuenow', String(Math.max(0, air)));
    // Taucher.exitFrame -> checkBorders
    const next = checkBorders();
    if (next && !leaving) void go(next);
  });

  async function exit(target: 'AS005-08' | 'AS017-01') {
    if (leaving) return;
    leaving = true;
    running = false;
    blur();
    pad.style.display = 'none';
    if (target === 'AS005-08') await scene.playSmacker('Schleuse-2');
    else await scene.playSmacker(pc === 'Puck' ? 'Tauchen-2' : 'Tauchen-1');
    if (!alive) return;
    scene.goto(target);
  }

  // dev-only test handle (verification of the full dive)
  if (import.meta.env.MODE !== 'production') {
    (window as any).__dive = {
      D, keys,
      get air() { return air; },
      set air(v: number) { air = v; },
      get label() { return label; },
      go: (l: string) => go(l),
    };
  }

  return () => {
    alive = false;
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('keyup', onKey);
    window.removeEventListener('blur', blur);
  };
});
