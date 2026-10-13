// GS008-01 Inselcafé – local Lingo: Lib.createOrder, Tasse (2), Taster Kakao/Kaffee/Cappuccino/
// Milch/Zucker (3-7), Kellner (8), Mainswitch (9), Taster Start/Stop (10/11).
// Reached from SP008 point 10, needs OS101 = OI005 (Kreide). Back: SP008, position 10, direction 4.
// No win condition: every cup runs once (max. 12 per visit); +1 coin per correct, -1 per wrong cup.

import { registerOrigScene, type OrigScene } from '../sceneView';
import type { Sprite } from '../stage';
import { backToBoard, gameInterface, markPorted, random, showInventar } from './ch1util';

const TICK = 40; // myWaitTime of Tasse
type CupMode = 'start' | 'MovePos1' | 'Pos1' | 'MovePos2' | 'Pos2' | 'MovePos3' | 'pos3' | 'movePos4' | 'pos4' | 'serve' | 'moveBin' | 'stopped';

interface Cup {
  ch: number;
  sp: Sprite;
  mode: CupMode;
  content: number;
  speed: number;
  rotation: number;
  startTime: number;
  timer: number;
  last: number;
}

registerOrigScene('GS008-01', (scene: OrigScene) => {
  markPorted(scene);
  // prepareMovie: createOrder()
  const orders: number[] = [];
  for (let i = 1; i <= 12; i++) {
    let drink = [1, 2, 4][random(3) - 1];
    if (drink === 2) {
      if (random(2) === 1) drink += 8;
      if (random(2) === 1) drink += 16;
    }
    if (drink === 4 && random(2) === 1) drink += 16;
    orders.push(drink);
  }
  const showOrders = () => {
    for (let i = 1; i <= 12; i++) if (scene.stage.has(40 + i)) scene.sprite(40 + i).setMember(`Drink-${orders[i - 1]}`);
  };
  showOrders();

  let stopGame: (() => void) | null = null;
  const back = () => backToBoard(scene, 'SP008', 10, 4);
  const ui = gameInterface(scene, {
    prefId: 'OI005',
    onBack: back,
    onStart: () => {
      void scene.gotoFrame('Game').then(() => {
        if (!scene.alive) return;
        ui.setButton('Game-Stop');
        showOrders();
        stopGame = startGame(scene);
      });
    },
  });
  return () => {
    stopGame?.();
    ui.destroy();
  };
});

function startGame(scene: OrigScene): () => void {
  const offs: (() => void)[] = [];
  const sp = (ch: number) => scene.sprite(ch);
  const now0 = performance.now();

  // ---- Mainswitch (17): starts #off (blend 0)
  let mainOn = false;
  sp(17).blend = 0;
  sp(17).hot = true;
  // blend 0 sprites are not hit-tested by the stage -> use a rectangle check on the background
  const r17 = { l: sp(17).left, t: sp(17).top, r: sp(17).left + sp(17).w, b: sp(17).top + sp(17).h };
  const toggleMain = () => {
    void scene.sound('Main', 100);
    mainOn = !mainOn;
    sp(17).blend = mainOn ? 100 : 0;
  };
  scene.stage.onBackground = (_e, pt) => {
    if (pt.x >= r17.l && pt.x < r17.r && pt.y >= r17.t && pt.y < r17.b) toggleMain();
  };
  offs.push(scene.on(17, 'mouseUp', toggleMain));
  offs.push(() => (scene.stage.onBackground = null));

  // ---- Kellner (11): plays m5..m31 once when serving
  const kellner = { frame: 1, motion: 'stopped' as 'stopped' | 'forward', t: 0, first: 1, last: 0 };
  const kName = /^(.*)-(\d+)$/.exec(sp(11).member?.name ?? 'Kellner-1');
  const kBase = kName?.[1] ?? 'Kellner';
  const kb = sp(11).behavior('Kellner')?.params;
  const lastRef = kb?.pLastMember ? scene.movie.memberAt(kb.pLastMember.castLib || 1, kb.pLastMember.member) : null;
  kellner.last = +(/-(\d+)$/.exec(lastRef?.name ?? '')?.[1] ?? 27);
  const kWait = 1000 / (+kb?.pFrameRate || 25);

  // ---- cups 21..32
  const cups: Cup[] = [];
  for (let i = 1; i <= 12; i++) {
    const ch = 20 + i;
    cups.push({ ch, sp: sp(ch), mode: 'start', content: 0, speed: 0, rotation: 0, startTime: now0 + i * 1000, timer: 0, last: now0 });
  }

  // ---- jets 35/36/37: visible while the button's sound plays
  const jetBusy: Record<number, boolean> = {};
  const button = (ch: number, jet: number, pos: CupMode, sound: string, value: number, all = false) => {
    const s = sp(ch);
    s.blend = 0;
    s.hot = true;
    // Taster: invisible (blend 0) until hovered; the stage only hit-tests visible sprites, so the
    // button is found through its rectangle in onBackground as well
    const press = () => {
      for (const c of cups) {
        if (c.mode !== pos || jetBusy[jet]) continue;
        jetBusy[jet] = true;
        sp(jet).blend = 100;
        void scene.sound(sound, 100).then(() => {
          jetBusy[jet] = false;
          if (scene.alive) sp(jet).blend = 0;
        });
        c.content += value;
        // original: Taster Kakao has no "exit repeat" (the blend check stops further cups anyway)
        if (!all) break;
      }
    };
    return { ch, press, rect: { l: s.left, t: s.top, r: s.left + s.w, b: s.top + s.h } };
  };
  const buttons = [
    button(12, 35, 'Pos1', 'Kakao', 1, true),
    button(13, 35, 'Pos1', 'Kaffee', 2),
    button(14, 35, 'Pos1', 'Cappuccino', 4),
    button(15, 36, 'Pos2', 'Milch', 8),
    button(16, 37, 'pos3', 'Zucker', 16),
  ];
  // pointer handling for the (blend 0) buttons: mouseEnter -> blend 100, mouseLeave -> 0, mouseDown -> press
  const inRect = (r: { l: number; t: number; r: number; b: number }, x: number, y: number) => x >= r.l && x < r.r && y >= r.t && y < r.b;
  const el = scene.stage.el;
  const onMove = (e: PointerEvent) => {
    const pt = scene.stage.toStage(e);
    for (const b of buttons) sp(b.ch).blend = inRect(b.rect, pt.x, pt.y) ? 100 : 0;
  };
  const onDown = (e: PointerEvent) => {
    if (scene.busy) return;
    const pt = scene.stage.toStage(e);
    for (const b of buttons) {
      if (inRect(b.rect, pt.x, pt.y)) {
        sp(b.ch).blend = 100;
        b.press();
      }
    }
  };
  const onLeave = () => buttons.forEach((b) => (sp(b.ch).blend = 0));
  el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerdown', onDown);
  el.addEventListener('pointerleave', onLeave);
  offs.push(() => {
    el.removeEventListener('pointermove', onMove);
    el.removeEventListener('pointerdown', onDown);
    el.removeEventListener('pointerleave', onLeave);
  });

  const checkBlocker = (me: Cup) => {
    for (const c of cups) {
      if (c === me) continue;
      if (c.sp.locH < me.sp.locH + 50 && c.sp.locH > me.sp.locH && c.mode !== 'start') return true;
    }
    return false;
  };
  const move = (c: Cup, limit: number, next: CupMode, wait: boolean, now: number) => {
    if (c.sp.locH < limit) {
      if (!checkBlocker(c)) c.sp.setLoc(c.sp.locH + 5, c.sp.locV);
    } else {
      c.mode = next;
      if (wait) c.timer = now + 5000;
    }
  };
  const checkOrder = (c: Cup) => {
    for (let i = 1; i <= 12; i++) {
      if (sp(40 + i).member?.name === `Drink-${c.content}` && sp(60 + i).blend === 0) {
        void scene.sound('Kreide', 100);
        sp(60 + i).blend = 100;
        c.mode = 'serve';
        return;
      }
    }
    c.mode = 'moveBin';
  };
  const coins = (n: number) => {
    const ch = scene.ctx.s.chars[scene.ctx.ch];
    // subCoins(n): only when enough coins (else nothing)
    if (n > 0 || ch.coins >= -n) ch.coins += n;
    showInventar();
  };

  const update = (c: Cup, now: number) => {
    if (c.mode === 'start' && now > c.startTime) c.mode = 'MovePos1';
    if (c.mode === 'MovePos1') move(c, 376, 'Pos1', true, now);
    if (c.mode === 'Pos1') {
      if (now < c.timer || sp(35).blend === 100) return;
      c.mode = 'MovePos2';
    }
    if (c.mode === 'MovePos2') move(c, 446, 'Pos2', true, now);
    if (c.mode === 'Pos2') {
      if (now < c.timer || sp(36).blend === 100) return;
      c.mode = 'MovePos3';
    }
    if (c.mode === 'MovePos3') move(c, 516, 'pos3', true, now);
    if (c.mode === 'pos3') {
      if (now < c.timer || sp(37).blend === 100) return;
      c.mode = 'movePos4';
    }
    if (c.mode === 'movePos4') move(c, 656, 'pos4', false, now);
    if (c.mode === 'pos4') checkOrder(c);
    if (c.mode === 'moveBin') {
      c.sp.setLoc(c.sp.locH + 5, c.sp.locV);
      if (c.sp.locH > 720) {
        c.speed += 3;
        c.rotation += 5;
        c.sp.el.style.transform = `rotate(${c.rotation}deg)`;
        c.sp.setLoc(c.sp.locH, c.sp.locV + c.speed);
        if (c.sp.locV > 400) {
          c.mode = 'stopped';
          c.sp.el.style.transform = '';
          c.sp.setLoc(156, 304);
          void scene.sound('Tonne', 100);
          coins(-1);
        }
      }
    }
    if (c.mode === 'serve') {
      if (kellner.motion === 'stopped') kellner.motion = 'forward';
      if (kellner.frame > 1) {
        c.sp.blend = 0;
        c.sp.setLoc(156, 304);
        c.mode = 'stopped';
        coins(1);
      }
    }
  };

  offs.push(scene.onTick((now) => {
    // Kellner.updateSprite
    if (kellner.motion === 'forward' && now >= kellner.t + kWait) {
      kellner.frame++;
      sp(11).setMember(`${kBase}-${kellner.frame}`);
      if (kellner.frame === kellner.last) {
        kellner.frame = kellner.first;
        kellner.motion = 'stopped';
      }
      kellner.t = now;
    }
    // Tasse: prepareFrame every 40 ms, paused while the main switch is off
    for (const c of cups) {
      if (now < c.last + TICK) continue;
      if (!mainOn) continue;
      update(c, now);
      c.last = now;
    }
  }));

  return () => offs.forEach((o) => o());
}
