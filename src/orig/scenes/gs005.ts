// Lighthouse mini games, chapter 1: GS005-01 Fernrohr, GS005-02 Zahlenschloss, GS005-03 Rohr,
// GS005-04 Fackel. Ports of the local Lingo (dec/Game/GS005-0x) + the shared Taster Start/Stop and
// Inventar Game Preference behaviours. See CH1_SPEC.md §7.2–7.5 and §0.2.
//
// The interface sprite 109 (Game-Back/Start/Stop/Ready) lies in the status bar in the original; the
// web scene view only shows the scene area, so it is drawn at the bottom right of the scene instead
// (replacing the generic "Zurück" button while the original view is mounted).

import { registerOrigScene, type OrigScene } from '../sceneView';
import { playEffectLoop } from '../sound';
import type { Sprite } from '../stage';

const sym = (v: string | undefined) => (v ?? '').toLowerCase();
const random = (n: number) => 1 + Math.floor(Math.random() * n);
const randomRange = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));

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
function inside(x: number, y: number, r: { left: number; top: number; right: number; bottom: number }) {
  return x >= r.left && x < r.right && y >= r.top && y < r.bottom;
}
function intersects(a: Sprite, b: Sprite) {
  const r = a.rect(), s = b.rect();
  return r.left < s.right && s.left < r.right && r.top < s.bottom && s.top < r.bottom;
}

interface GameCtl {
  /** sprite(109).member = "Game-Ready" */
  ready(): void;
}

/**
 * Intro frame (1) with Taster Start + Inventar Game Preference (sprites 101–107), Game frame (15)
 * with Taster Stop. `game()` runs the movie's Game-frame logic; returns an optional cleanup.
 */
function gameScreen(scene: OrigScene, back: string, game: (ctl: GameCtl) => void | (() => void)) {
  const exitObj = scene.object('_exit');
  const prevVis = exitObj?.visible;
  if (exitObj) exitObj.visible = () => false;
  scene.sync();
  const btn = scene.sprite(109);
  const place = (name: string) => {
    btn.setMember(name);
    btn.setRect(710, 493 - (btn.h || 96));
    btn.blend = 100;
  };
  let onGame = false;
  let cleanup: void | (() => void);
  const prefs = [101, 102, 103, 104, 105, 106, 107].filter((ch) => scene.stage.has(ch));
  const prefState = (ch: number) => sym(scene.state.get(`OS${ch}`) ?? 'activ');
  const checkPrefs = () => prefs.every((ch) => prefState(ch) !== 'passiv');
  for (const ch of prefs) {
    // Inventar Game Preference: drop pId -> activ, click an active slot -> item back into the hand
    const pId = String(scene.sprite(ch).behavior('Inventar Game Preference')?.params.pId ?? '');
    scene.prefSlot(ch, pId, { enabled: () => !onGame });
  }
  place(checkPrefs() ? 'Game-Start' : 'Game-Back');
  btn.cursor = 'make';
  scene.onTick(() => {
    if (!onGame) {
      const want = checkPrefs() ? 'Game-Start' : 'Game-Back';
      if (btn.member?.name !== want) place(want);
    }
  });
  scene.on(109, 'mouseDown', () => {
    if (!scene.busy) void scene.sound('Splash', 100);
  });
  scene.on(109, 'mouseUp', () => {
    if (scene.busy || scene.hand) return;
    const m = btn.member?.name;
    if (m === 'Game-Start' && !onGame) {
      onGame = true;
      void scene.gotoFrame('Game').then(() => {
        if (!scene.alive) return;
        place('Game-Stop');
        cleanup = game({ ready: () => place('Game-Ready') });
      });
      return;
    }
    // Game-Back / Game-Stop / Game-Ready: setCharacterScreen(cur, gGameBackMovie); jumpToCurrentCharacter()
    scene.goto(back);
  });
  return () => {
    if (exitObj) exitObj.visible = prevVis;
    if (typeof cleanup === 'function') cleanup();
  };
}

/** stage coordinates of the mouse (the mouseLoc) */
function mouseTracker(scene: OrigScene) {
  const m = { x: 400, y: 300 };
  const move = (e: PointerEvent) => {
    const p = scene.stage.toStage(e);
    m.x = p.x;
    m.y = p.y;
  };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerdown', move);
  return { m, off: () => (window.removeEventListener('pointermove', move), window.removeEventListener('pointerdown', move)) };
}

// ----------------------------------------------------------------------------- GS005-01 Fernrohr

registerOrigScene('GS005-01', (scene) =>
  gameScreen(scene, 'AS005-04', () => {
    const pano = scene.sprite(5);
    const zoom = scene.sprite(6);
    let zoomFactor = 1;
    let target: 'none' | 'zoom1' | 'zoom2' | 'zoom3' = 'none';
    let roccoJoke = 0;
    let timer = performance.now() + randomRange(10000, 15000);
    let talkCounter = random(4);
    const inR = (x1: number, y1: number, x2: number, y2: number) => pano.locH >= x1 && pano.locH < x2 && pano.locV >= y1 && pano.locV < y2;
    scene.onTick((now) => {
      if (zoomFactor === 1) {
        target = 'none';
        if (inR(570, 110, 630, 170)) target = 'zoom1';
        if (inR(520, 70, 580, 130)) target = 'zoom2';
        if (inR(140, 70, 200, 130)) target = 'zoom3';
      }
      if (now > timer) {
        if (!roccoJoke && target === 'zoom3' && zoomFactor > 1 && !scene.talking) {
          void scene.playerTalk(6, { block: false });
          roccoJoke = 1;
          timer = now + 20000;
        }
        if (!scene.talking) {
          talkCounter = talkCounter < 4 ? talkCounter + 1 : 1;
          void scene.playerTalk(talkCounter, { block: false });
          timer = now + randomRange(20000, 30000);
        }
      }
    });
    const size = () => {
      const w = (scene.member(target)?.w ?? 0) / 4 * zoomFactor;
      zoom.width = w;
      zoom.height = w; // original uses the member width for the height too
      zoom.layout();
    };
    const key = (e: KeyboardEvent) => {
      if (scene.busy) return;
      const s = zoomFactor > 1 ? zoom : pano;
      const r = s.rect();
      const k = e.key;
      if (k === 'ArrowRight') {
        if (r.right > 440) s.setLoc(s.locH - 10, s.locV);
      } else if (k === 'ArrowLeft') {
        if (r.left < 305) s.setLoc(s.locH + 10, s.locV);
      } else if (k === 'ArrowUp') {
        if (r.top < 195) s.setLoc(s.locH, s.locV + 10);
      } else if (k === 'ArrowDown') {
        if (r.bottom > 320) s.setLoc(s.locH, s.locV - 10);
      } else if (k === '+' || k === '=') {
        if (target === 'none') {
          if (!scene.talking) void scene.playerTalk(5, { block: false });
        } else {
          zoom.setMember(target);
          zoom.blend = 100;
          if (zoomFactor < 4) {
            zoomFactor++;
            void scene.sound('Zoom', 100);
            size();
          }
        }
      } else if (k === '-') {
        if (target !== 'none' && zoomFactor > 1) {
          zoomFactor--;
          void scene.sound('Zoom', 100);
          if (zoomFactor === 1) zoom.blend = 0;
          else {
            zoom.setLoc(378, 252);
            size();
          }
        }
      } else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }),
);

// ----------------------------------------------------------------------------- GS005-02 Zahlenschloss

registerOrigScene('GS005-02', (scene) =>
  gameScreen(scene, 'AS005-03', (ctl) => {
    const unlockNum: Record<number, number> = { 12: 3, 15: 8, 18: 7, 21: 1, 24: 9, 27: 2 };
    const wheels = new Map<number, { mode: 'stopped' | 'next' | 'prev' | 'fwd' | 'back'; cur: number; target: number; targetFrame: number }>();
    const opened = sym(scene.state.get('LOCK', 'AS005-03') ?? 'closed') === 'opened';
    for (const ch of [12, 15, 18, 21, 24, 27]) {
      const cur = opened ? unlockNum[ch] : 0;
      wheels.set(ch, { mode: 'stopped', cur, target: cur, targetFrame: cur * 7 + 1 });
      scene.sprite(ch).setMember(`Ziffern-${cur * 7 + 1}`);
    }
    const checkUnlock = () => {
      if ([...wheels].every(([ch, w]) => w.cur === unlockNum[ch])) {
        scene.state.set('LOCK', 'opened', 'AS005-03');
        ctl.ready();
        void scene.playerTalk(4, { block: false });
      } else scene.state.set('LOCK', 'closed', 'AS005-03'); // turning the wheels locks again
    };
    for (const ch of [12, 15, 18, 21, 24, 27]) {
      for (const [b, dir, base] of [[ch - 1, 'next', 'Oben'], [ch + 1, 'prev', 'Unten']] as const) {
        const sp = scene.sprite(b);
        sp.cursor = 'make';
        scene.on(b, 'mouseDown', () => {
          const w = wheels.get(ch)!;
          if (w.mode !== 'stopped' || scene.busy) return;
          sp.setMember(`${base}-1`);
          void scene.sound('Klick', 100);
          w.mode = dir;
        });
      }
    }
    const up = () => {
      for (const ch of [12, 15, 18, 21, 24, 27]) {
        if (scene.stage.has(ch - 1)) scene.sprite(ch - 1).setMember('Oben-0');
        if (scene.stage.has(ch + 1)) scene.sprite(ch + 1).setMember('Unten-0');
      }
    };
    window.addEventListener('pointerup', up);
    every(scene, 20, () => {
      for (const [ch, w] of wheels) {
        if (w.mode === 'stopped') continue;
        const sp = scene.sprite(ch);
        if (w.mode === 'next') {
          w.target = (w.cur + 1) % 10;
          w.targetFrame = w.target * 7 + 1;
          w.mode = 'fwd';
        }
        if (w.mode === 'prev') {
          w.target = (w.cur + 9) % 10;
          w.targetFrame = w.target * 7 + 1;
          w.mode = 'back';
        }
        let [, f] = memberNum(sp);
        if (f !== w.targetFrame) {
          f += w.mode === 'fwd' ? 1 : -1;
          if (f === 72) f = 1;
          if (f === 0) f = 71;
          sp.setMember(`Ziffern-${f}`);
        } else {
          w.cur = w.target;
          w.mode = 'stopped';
          checkUnlock();
        }
      }
    });
    // Framescript: Bingo/Puck comment every 10–20 s (first line is Talk-2, no soundBusy check)
    let talk = 1;
    let timer = performance.now() + randomRange(10000, 20000);
    scene.onTick((now) => {
      if (now > timer) {
        talk = talk < 3 ? talk + 1 : 1;
        void scene.playerTalk(talk, { block: false });
        timer = now + randomRange(10000, 20000);
      }
    });
    return () => window.removeEventListener('pointerup', up);
  }),
);

// ----------------------------------------------------------------------------- GS005-03 Rohr abschrauben

registerOrigScene('GS005-03', (scene) =>
  gameScreen(scene, 'AS005-05', (ctl) => {
    const eng = scene.sprite(25);
    const tube = scene.sprite(15);
    type ScrewMode = 'inPlace' | 'turning' | 'falling' | 'stopped';
    const screws = new Map<number, { mode: ScrewMode; v: number }>([[11, { mode: 'inPlace', v: 0 }], [12, { mode: 'inPlace', v: 0 }], [13, { mode: 'inPlace', v: 0 }]]);
    let mode: 'stopped' | 'inHand' | 'close' | 'closed' | 'open' | 'turnForward' | 'turnBackward' = 'stopped';
    let state: 'free' | 'snap1' | 'snap2' | 'snap3' | 'grab1' | 'grab2' | 'grab3' = 'free';
    let grab = { x: 0, y: 0 };
    let downOnEng = false;
    const { m, off } = mouseTracker(scene);
    const lower = () => m.y > eng.top + 130;
    const turning = () => mode === 'turnForward' || mode === 'turnBackward';
    const move = () => {
      if (mode === 'inHand') eng.setLoc(m.x - grab.x, m.y - grab.y);
      eng.cursor = mode === 'inHand' ? 'grab' : lower() ? 'take' : 'make';
    };
    window.addEventListener('pointermove', move);
    scene.on(25, 'mouseDown', () => {
      if (scene.busy || mode === 'inHand' || turning()) return;
      downOnEng = true;
      if (mode === 'stopped' && lower()) {
        mode = 'inHand';
        grab = { x: m.x - eng.locH, y: m.y - eng.locV };
        return;
      }
      if (mode === 'closed' && lower()) {
        mode = 'turnForward';
        const n = state === 'grab1' ? 11 : state === 'grab2' ? 12 : state === 'grab3' ? 13 : 0;
        const s = screws.get(n);
        if (s) s.mode = 'turning';
        void scene.sound('Turn', 100);
      }
    });
    const mouseUp = () => {
      if (turning()) return;
      if (lower()) {
        for (const [i, hsCh] of [[11, 21], [12, 22], [13, 23]] as const) {
          if (inside(eng.locH, eng.locV, scene.sprite(hsCh).rect()) && screws.get(i)!.mode === 'inPlace') {
            const hs = scene.sprite(hsCh);
            eng.setLoc(hs.locH + 42, hs.locV + 32);
            scene.sprite(i).el.style.zIndex = '50';
            mode = 'stopped';
            state = `snap${i - 10}` as typeof state;
            void scene.sound('Snap', 100);
            return;
          }
        }
        mode = 'stopped';
      }
      if (m.y < eng.top + 130) {
        if (state.startsWith('snap')) {
          mode = 'close';
          void scene.sound('Grip', 100);
          return;
        }
        if (state.startsWith('grab')) {
          mode = 'open';
          void scene.sound('Grip', 100);
        }
      }
    };
    const up = (e: PointerEvent) => {
      const was = downOnEng;
      downOnEng = false;
      if (!was || !scene.alive) return;
      const p = scene.stage.toStage(e);
      if (eng.hit(p.x, p.y)) mouseUp();
      else if (!turning()) mode = 'stopped'; // mouseUpOutSide
    };
    window.addEventListener('pointerup', up);
    every(scene, 40, () => {
      let [base, f] = memberNum(eng);
      if (mode === 'turnForward') {
        if (f < 17) f++;
        else mode = 'turnBackward';
        eng.setMember(`${base}-${f}`);
      }
      if (mode === 'turnBackward') {
        if (f > 1) f--;
        else {
          mode = 'stopped';
          state = 'free';
        }
        eng.setMember(`${base}-${f}`);
      }
      if (mode === 'close') {
        if (f < 6) eng.setMember(`${base}-${++f}`);
        else {
          mode = 'closed';
          state = state.replace('snap', 'grab') as typeof state;
        }
      }
      if (mode === 'open') {
        if (f > 1) eng.setMember(`${base}-${--f}`);
        else {
          mode = 'stopped';
          state = state.replace('grab', 'snap') as typeof state;
        }
      }
      for (const [ch, s] of screws) {
        const sp = scene.sprite(ch);
        if (mode === 'inHand') sp.el.style.zIndex = String(ch);
        let [sb, sf] = memberNum(sp);
        if (s.mode === 'turning') {
          if (sf < 9) sf++;
          else {
            sf = 1;
            s.mode = 'falling';
          }
          sp.setMember(`${sb}-${sf}`);
        }
        if (s.mode === 'falling') {
          sf = sf < 9 ? sf + 1 : 1;
          sp.setMember(`${sb}-${sf}`);
          sp.setLoc(sp.locH, sp.locV + s.v);
          s.v += 3;
          if (sp.top > 600) {
            s.mode = 'stopped';
            void scene.sound('Screw', 100);
          }
        }
      }
    });
    scene.onTick(() => {
      if ([...screws.values()].some((s) => s.mode !== 'stopped')) return;
      if (tube.blend === 0) {
        tube.blend = 100;
        void scene.sound('Tube-Sound', 100);
        scene.state.set('TUBE', 'free');
        ctl.ready();
      }
    });
    return () => {
      off();
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }),
);

// ----------------------------------------------------------------------------- GS005-04 Fackel anzünden

registerOrigScene('GS005-04', (scene) =>
  gameScreen(scene, 'AS005-05', (ctl) => {
    // Web: the match is held while the RIGHT mouse button is pressed on the open matchbox (as in the
    // original). Touch: touching the open matchbox takes a match and holds it while the finger stays down.
    // [Prüfung erforderlich: Touch-Ersatz für die rechte Maustaste]
    const shine = scene.sprite(11), torch = scene.sprite(12), spiritus = scene.sprite(13);
    const box = scene.sprite(15), match = scene.sprite(20), flame = scene.sprite(21), ign = scene.sprite(22);
    const { m, off } = mouseTracker(scene);
    let rightHeld = false;
    // Matchbox
    let boxMode: 'stopped' | 'forward' | 'backward' = 'stopped';
    let boxState: 'closed' | 'opened' = 'closed';
    let matches = 4;
    // Match
    let mMode: 'stopped' | 'inHand' | 'falling' = 'stopped';
    let mState: 'off' | 'burning' = 'off';
    let mTimer = 0;
    let mLastH = m.x;
    // Torch (Flame Script 5) / Shine
    let tMode: 'stopped' | 'waiting' | 'flaming' = 'stopped';
    let sMode: 'stopped' | 'forward' = 'stopped';
    // Ignition
    let iMode: 'stopped' | 'checkSpeed' = 'stopped';
    let iLastH = m.x;
    let wasInside = false;

    torch.blend = 0;
    match.blend = 0;
    const f1 = scene.movie.memberAt(1, 61), f2 = scene.movie.memberAt(1, 76);
    if (f1 && f2) void scene.playSequence(21, f1, f2, 25, { loop: true }); // Movie-Loop of the match flame

    const ctx = (e: Event) => e.preventDefault();
    scene.el.addEventListener('contextmenu', ctx);
    const rightMouseDown = () => {
      if (matches === 0 || boxState !== 'opened') return;
      void scene.sound('Match', 100);
      matches--;
      box.setMember(`Matchbox${matches}-6`);
      mMode = 'inHand';
      mState = 'off';
      rightHeld = true;
    };
    // Original: the RIGHT mouse button takes a match and holds it while pressed.
    // Remake: double-click / double-tap on the open box takes a match; it follows the pointer
    // until the next press is released (works the same with mouse and touch).
    let lastDown = 0;
    let armed = false;
    let pendingClose = 0;
    scene.on(15, 'mouseDown', (_sp, e) => {
      if (scene.busy || rightHeld) return;
      if (e.button !== 0) return;
      const now = performance.now();
      if (now - lastDown < 400 && boxState === 'opened' && matches > 0) {
        lastDown = 0;
        clearTimeout(pendingClose);
        armed = false;
        return rightMouseDown();
      }
      lastDown = now;
      if (boxMode === 'stopped' && boxState === 'closed') {
        boxMode = 'forward';
        void scene.sound('Open', 80);
      } else if (boxMode === 'stopped' && boxState === 'opened') {
        // single click closes the box – delayed so that a double-click can take a match instead
        pendingClose = window.setTimeout(() => {
          if (boxMode === 'stopped' && boxState === 'opened' && !rightHeld) {
            boxMode = 'backward';
            void scene.sound('Close', 80);
          }
        }, 420);
      }
    });
    const downAny = () => {
      if (rightHeld) armed = true;
    };
    const up = () => {
      if (rightHeld && armed) rightHeld = false;
    };
    window.addEventListener('pointerdown', downAny);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);

    every(scene, 40, () => {
      // Matchbox
      box.cursor = boxState === 'opened' && matches > 0 ? 'take' : 'make';
      if (boxMode !== 'stopped') {
        let [b, f] = memberNum(box);
        if (boxMode === 'forward') {
          if (f < 6) f++;
          else {
            boxState = 'opened';
            boxMode = 'stopped';
          }
        } else {
          if (f > 1) f--;
          else {
            boxState = 'closed';
            boxMode = 'stopped';
          }
        }
        box.setMember(`${b}-${f}`);
      }
      // Ignition (rubbing surface, sprite 22 is invisible but receives the mouse in Lingo)
      const inI = inside(m.x, m.y, ign.rect());
      if (inI && !wasInside) iLastH = m.x; // mouseEnter: getSpeedH()
      if (!inI && wasInside) iMode = 'stopped'; // mouseLeave
      wasInside = inI;
      if (inI && mMode === 'inHand' && mState !== 'burning') iMode = 'checkSpeed';
      if (iMode === 'checkSpeed') {
        const s = Math.abs(m.x - iLastH);
        iLastH = m.x;
        if (s > 75) {
          /* too fast */
        } else if (s > 40) {
          void scene.sound('Light-1', 100);
          mState = 'burning';
          iMode = 'stopped';
        } else if (s > 30) {
          void scene.sound('Try-3', 100);
          iMode = 'stopped';
        } else if (s > 20) {
          void scene.sound('Try-2', 100);
          iMode = 'stopped';
        } else if (s > 10) {
          void scene.sound('Try-1', 100);
          iMode = 'stopped';
        }
      }
      // Torch (Flame Script on sprite 12)
      if (tMode === 'stopped' && intersects(spiritus, flame) && mState === 'burning') {
        sMode = 'forward';
        tMode = 'waiting';
      }
      if (tMode === 'flaming') {
        let [, f] = memberNum(torch);
        f = f < 18 ? f + 1 : 1;
        torch.setMember(`Torch-${f}`);
        torch.blend = 100;
      }
      // Shine
      if (sMode === 'forward') {
        let [b, f] = memberNum(shine);
        if (f < 5) f++;
        else {
          tMode = 'flaming';
          void scene.playerTalk(1, { block: false });
          scene.state.set('TORCH', 'on', 'AS005-05');
          scene.state.set('HS4', 'passiv', 'AS005-05');
          ctl.ready();
          sMode = 'stopped';
        }
        shine.setMember(`${b}-${f}`);
      }
    });

    // Match (20 ms) + Flame Script 7 (every frame)
    every(scene, 20, (now) => {
      if (mMode !== 'stopped') {
        if (!rightHeld) mMode = 'falling'; // the rightMouseUp
        if (mMode === 'inHand') {
          match.setLoc(m.x, m.y);
          match.blend = 100;
          let [b, f] = memberNum(match);
          flame.setLoc(match.locH + 75 - f * 3, match.locV + 3);
          const speed = m.x - mLastH;
          mLastH = m.x;
          let skip = false;
          if (speed > -75 && speed < 75) flame.el.style.transform = `skewX(${-speed * 2}deg)`;
          else {
            flame.blend = 0;
            mState = 'off';
          }
          if (mState === 'off' || now < mTimer) skip = true;
          if (!skip) {
            if (f < 22) f++;
            else mMode = 'falling';
            match.setMember(`${b}-${f}`);
            mTimer = now + 500;
          }
        }
        if (mMode === 'falling') {
          if (match.locV < 600) match.setLoc(match.locH, match.locV + 25);
          else {
            match.setMember('Match-1');
            mMode = 'stopped';
            match.blend = 0;
          }
        }
      }
      flame.blend = mMode === 'inHand' && mState === 'burning' ? 100 : 0;
      if (tMode === 'flaming' && intersects(flame, torch) && mState === 'off') {
        if (match.member?.name === 'Match-1') void scene.sound('Light-2', 100);
        mState = 'burning';
      }
    });

    // Visible Audio on the torch: loop "Torch" (50 %) while it is visible
    let stopLoop: (() => void) | null = null;
    scene.onTick(() => {
      const vis = torch.blend > 0;
      if (vis && !stopLoop) stopLoop = playEffectLoop(scene.movie.dir, 'Torch', 50);
      else if (!vis && stopLoop) {
        stopLoop();
        stopLoop = null;
      }
    });
    return () => {
      off();
      stopLoop?.();
      scene.el.removeEventListener('contextmenu', ctx);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointerdown', downAny);
      clearTimeout(pendingClose);
      window.removeEventListener('pointercancel', up);
    };
  }),
);
