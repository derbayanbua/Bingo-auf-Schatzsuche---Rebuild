// GS016-01 Angeln – local Lingo: framescript (2), Haken (4), Treibgut Müll (5), Treibgut Wichtig (6),
// Puck (7), Bingo (8), Karaffe (9), Taster Start/Stop (10/11).
// Reached from SP016 point 3, needs OS101 = OI012 (Haken). Back: SP016, position 3, direction 4.

import { registerOrigScene, type OrigScene } from '../sceneView';
import type { Sprite } from '../stage';
import { backToBoard, gameInterface, inventarSound, markPorted, random, rnd, showInventar } from './ch1util';

registerOrigScene('GS016-01', (scene: OrigScene) => {
  markPorted(scene);
  const offs: (() => void)[] = [];
  // framescript (all frames): random player comment every 15-30 s
  let talkTimer = performance.now() + rnd(10000, 20000);
  offs.push(scene.onTick((now) => {
    if (now < talkTimer) return;
    if (!scene.talking) void scene.playerTalk(random(2), { mixing: 90, block: false });
    talkTimer = now + rnd(15000, 30000);
  }));

  let stopGame: (() => void) | null = null;
  const ui = gameInterface(scene, {
    prefId: 'OI012',
    onBack: () => backToBoard(scene, 'SP016', 3, 4),
    onStart: () => {
      void scene.gotoFrame('Game').then(() => {
        if (!scene.alive) return;
        ui.setButton('Game-Stop');
        stopGame = startGame(scene);
      });
    },
  });
  return () => {
    stopGame?.();
    ui.destroy();
    offs.forEach((o) => o());
  };
});

const intersects = (a: Sprite, b: Sprite) => {
  const r = a.rect(), q = b.rect();
  return r.left < q.right && q.left < r.right && r.top < q.bottom && q.top < r.bottom;
};

type DriftMode = 'start' | 'swim' | 'hook';
interface Drift {
  ch: number;
  sp: Sprite;
  important: boolean;
  mode: DriftMode;
  timer: number;
  startV: number;
  next: number;
}

function startGame(scene: OrigScene): () => void {
  const offs: (() => void)[] = [];
  const sp = (ch: number) => scene.sprite(ch);
  const HOOK = 30, ROPE = 31, BOX = 35, KARAFFE = 23;
  const ctx = scene.ctx;

  // prepareMovie: only the player's figure
  const puck = ctx.s.playerCharacter === 'Puck';
  if (scene.stage.has(puck ? 14 : 15)) sp(puck ? 14 : 15).visible = false;
  const figure = puck ? 15 : 14;
  const figBase = puck ? 'Puck' : 'Bingo';

  // mouse position (the mouseH / the mouseV); touch drags move it too
  const el = scene.stage.el;
  const oldTouch = el.style.touchAction;
  el.style.touchAction = 'none';
  const hook = sp(HOOK);
  let mouse = { x: hook.locH, y: hook.locV + 40 };
  const onMove = (e: PointerEvent) => (mouse = scene.stage.toStage(e));
  el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerdown', onMove);
  offs.push(() => {
    el.removeEventListener('pointermove', onMove);
    el.removeEventListener('pointerdown', onMove);
    el.style.touchAction = oldTouch;
  });

  // ---- Haken
  let locH = hook.locH, locV = hook.locV, oldH = locH, oldV = locV;
  let mode: 'free' | 'overBox' | 'box' = 'free';
  let hitH: 'none' | 'left' | 'right' = 'none';
  let hitV: 'none' | 'bottom' = 'none';
  let hooked = HOOK; // myHookSprite
  const box = sp(BOX);
  box.blend = 0;
  const ropeTop = sp(ROPE).top;

  const updatePosition = () => {
    const dH = hook.locH - mouse.x;
    const dV = hook.locV - mouse.y + 40;
    locH -= dH / 20;
    locV -= dV / 20;
    if (hitH === 'right') {
      if (locH > oldH) locH = oldH;
      else hitH = 'none';
    }
    if (hitH === 'left') {
      if (locH < oldH) locH = oldH;
      else hitH = 'none';
    }
    if (hitV === 'bottom') {
      if (locV > oldV) locV = oldV;
      else hitV = 'none';
    }
    hook.setLoc(locH, locV);
    if (hooked !== HOOK) sp(hooked).setLoc(hook.locH, hook.locV);
    sp(ROPE).setRect(Math.round(hook.locH), ropeTop, 1, Math.max(1, Math.round(hook.locV - ropeTop)));
  };
  const wood = () => void scene.sound(`Holz${random(4)}`, 100);

  const updateHook = () => {
    updatePosition();
    const hs = sp(hooked);
    const h = hs.rect(), b = box.rect();
    if (mode === 'free') {
      if (h.right < b.right && h.left > b.left && h.bottom < b.top) {
        mode = 'overBox';
        box.blend = 100;
        return;
      }
    }
    if (mode === 'overBox') {
      if (h.right > b.right || h.left < b.left) {
        mode = 'free';
        hitH = hitV = 'none';
        box.blend = 0;
        return;
      }
      if (intersects(hs, box)) mode = 'box';
    }
    if (mode === 'box') {
      if (!intersects(hs, box)) {
        mode = 'free';
        hitH = hitV = 'none';
        box.blend = 0;
        return;
      }
      if (hitH === 'none' && h.right > b.right) {
        hitH = 'right';
        wood();
        updatePosition();
      }
      if (hitH === 'none' && h.left < b.left) {
        hitH = 'left';
        wood();
        updatePosition();
      }
      if (hitV === 'none' && sp(hooked).rect().bottom > b.bottom) {
        hitV = 'bottom';
        wood();
        if (hooked !== HOOK) {
          const name = sp(hooked).member?.name;
          if (name === 'Muenze') {
            inventarSound('OI007');
            ctx.addCoins(1);
          }
          if (name === 'Geldsack') {
            inventarSound('OI081');
            ctx.addCoins(10);
          }
          if (name === 'Witzkarte') {
            inventarSound('OI006');
            ctx.addJokes(1);
          }
          showInventar(scene);
          resetDrift(drifts.find((d) => d.ch === hooked)!, performance.now());
          hooked = HOOK;
        }
        updatePosition();
      }
      if (hitH === 'none') oldH = locH;
      if (hitV === 'none') oldV = locV;
    }
  };

  // ---- Treibgut
  const drifts: Drift[] = [];
  const now0 = performance.now();
  for (let ch = 18; ch <= 26; ch++) {
    if (!scene.stage.has(ch)) continue;
    const s = sp(ch);
    const d: Drift = { ch, sp: s, important: ch >= 23, mode: 'start', timer: now0 + random(5000), startV: s.locV, next: 0 };
    s.setLoc(s.locH, d.startV - 100 + random(200));
    s.blend = 50;
    drifts.push(d);
  }
  const resetDrift = (d: Drift, now: number) => {
    d.mode = 'start';
    d.timer = now + random(d.important ? 10000 : 5000);
    d.sp.setLoc(900, d.startV - 100 + random(200));
    d.sp.blend = 50;
    d.sp.el.style.zIndex = String(d.ch);
  };
  const catchIt = (d: Drift) => {
    d.mode = 'hook';
    d.sp.el.style.zIndex = '28';
    d.sp.blend = 100;
    void scene.sound('Water', 100);
    hooked = d.ch;
  };
  const comment = (n: number) => {
    if (!scene.talking) void scene.playerTalk(n, { mixing: 90, block: false });
  };
  const updateDrift = (d: Drift, now: number) => {
    if (d.mode === 'start') {
      for (const o of drifts) if (o.mode === 'swim' && o.sp.locH > 700) return;
      if (now > d.timer) d.mode = 'swim';
    }
    if (d.mode !== 'swim') return;
    if (d.important && d.sp.blend === 0) return;
    d.sp.setLoc(d.sp.locH - 3, d.sp.locV);
    if (d.sp.locH < -100) resetDrift(d, now);
    if (!d.important) {
      if (intersects(d.sp, hook) && hooked === HOOK) catchIt(d);
      return;
    }
    // Treibgut Wichtig: only when aimed exactly
    if (Math.abs(d.sp.locH - hook.locH) < 3 && Math.abs(d.sp.locV - hook.locV) < 3 && hooked === HOOK) {
      catchIt(d);
      const name = d.sp.member?.name;
      if (name === 'Muenze') comment(rnd(7, 9));
      if (name === 'Geldsack') comment(rnd(10, 12));
      if (name === 'Witzkarte') comment(rnd(4, 6));
      if (name === 'Karaffe') comment(3);
    }
  };

  // ---- Karaffe (sprite 23, key OI008 in the GS016-01 field)
  const karaffeState = () => scene.state.get('OI008') ?? 'activ';
  const karaffe = scene.stage.has(KARAFFE) ? sp(KARAFFE) : null;
  if (karaffe) {
    offs.push(scene.on(KARAFFE, 'mouseWithin', () => {
      karaffe.cursor = karaffeState() !== 'passiv' && hooked === KARAFFE ? 'take' : 'make';
    }));
    const takeKaraffe = () => {
      if (karaffeState() === 'passiv' || hooked !== KARAFFE || scene.hand || scene.busy) return;
      // original mouseDown: OI008 goes into the hand (source 23); dropped into the pocket it is kept,
      // anything else returns it to the carafe on the hook (sprite 23 mouseUp -> activ again)
      hooked = HOOK;
      scene.state.set('OI008', 'passiv');
      scene.putInHand('OI008', () => {
        if (!scene.alive) {
          scene.state.set('OI008', 'activ'); // the carafe drifts again on the next visit
          return;
        }
        scene.state.set('OI008', 'activ');
        hooked = KARAFFE;
      });
    };
    // tap = click (mouseUp); a drag picks it up through the scene's pickup test
    offs.push(scene.on(KARAFFE, 'mouseUp', takeKaraffe));
    offs.push(scene.onTick(() => {
      karaffe.props.pickup = karaffeState() !== 'passiv' && hooked === KARAFFE;
    }));
  }

  // ---- figure follows the hook
  const fig = scene.stage.has(figure) ? sp(figure) : null;
  let figT = 0, last = 0;
  offs.push(scene.onTick((now) => {
    // Haken: every frame (fixed 30 Hz logic tick, see CH1_SPEC 0.1)
    if (now - last >= 33) {
      last = now;
      updateHook();
      if (karaffe) {
        const st = karaffeState();
        if (st === 'activ') karaffe.blend = hooked === KARAFFE ? 100 : 50;
        if (st === 'passiv') {
          karaffe.blend = 0;
          karaffe.setLoc(hook.locH, hook.locV);
        }
      }
    }
    for (const d of drifts) {
      if (now < d.next) continue;
      d.next = now + 20;
      updateDrift(d, now);
    }
    if (fig && now - figT >= 40) {
      figT = now;
      fig.setMember(`${figBase}-${Math.round(hook.locH / 40) + 1}`);
    }
  }));

  return () => offs.forEach((o) => o());
}
