// Chapter 3 – Blubberfelsen (AS032-01/02), Steinpuzzle (GS032-01) and the sand cave (AS040-01/02).
// Local Lingo of dec/Adventure/AS032-0x, AS040-0x and dec/Game/GS032-01.
//
// AS032-01 frame script: every exitFrame, if channel 5 is free and random(50) = 1 -> soundEffect(5,
//   "Blub-" & random(2)). prepareMovie: sprite 11 (Puzzle) visible only when AS032-02.HS3 <> activ.
//   [Prüfung erforderlich] score tempo unknown: the frame loop is run at 30 Hz (CH1_SPEC §0.1).
// AS032-02 prepareMovie: sprite 16 (Puzzle/"Schalter") visible only when HS3 <> activ (stone puzzle
//   solved). Schalter mouseUp (no item in the hand, no Wait): sprite(11).myMode = #forward (door OH1
//   opens, also from #blocked) + #soundForward -> Hotspot-GS 12 (pHandlingObject 11) -> GS032-02.
// GS032-01 (needs the 7 stones OI056..OI062): mixSprites(21, 27, rect(100,100,400,400)); Stone: drag
//   with offset (locZ 30), released with loc inside rect(560,355,570,365) -> loc (565,360), locZ
//   spriteNum-10, #stopped, "Stone-"&random(7). All 7 #stopped -> Game-Ready (else Game-Stop). Leaving
//   with gExitFlag while solved -> AS032-02.HS3 = passiv. gGameBackMovie = AS032-02.
// AS040-01: only generic behaviours (box = storage, exits) + Movie-Loop.
// AS040-02 Sandhill (13): member Sandhill-<Sand> (11 = gone). Spade OI052 in the hand + click ->
//   +1 (quickSound "Sand"), at 11 invisible; writeData Sand. The spade stays in the hand.

import { registerOrigScene } from '../sceneView';
import { gameScreen, markPorted, movieLoops, random, rnd } from './ch3a-util';

// ------------------------------------------------------------------ AS032-01
registerOrigScene('AS032-01', (scene) => {
  markPorted(scene);
  movieLoops(scene);
  if (scene.stage.has(11)) scene.sprite(11).visible = (scene.state.get('HS3', 'AS032-02') ?? 'activ').toLowerCase() !== 'activ';
  let ch5 = false;
  let next = 0;
  scene.onTick((now) => {
    if (now < next) return;
    next = now + 1000 / 30;
    if (!ch5 && random(50) === 1) {
      ch5 = true;
      void scene.sound(`Blub-${random(2)}`, 100).then(() => (ch5 = false));
    }
  });
});

// ------------------------------------------------------------------ AS032-02
registerOrigScene('AS032-02', (scene) => {
  markPorted(scene);
  movieLoops(scene);
  if (!scene.stage.has(16)) return;
  const sw = scene.sprite(16);
  sw.visible = (scene.state.get('HS3') ?? 'activ').toLowerCase() !== 'activ';
  scene.off(16);
  sw.hot = true;
  sw.cursor = 'make';
  scene.on(16, 'mouseUp', () => {
    if (scene.hand || scene.busy) return;
    if (scene.state.get('OH1') === 'state2') {
      // already open: only the #soundForward of the door's Two-State Audio
      const a = scene.stage.has(11) ? scene.sprite(11).behavior('Two-State Audio')?.params : undefined;
      if (typeof a?.pSoundForward === 'string' && a.pSoundForward !== 'None') void scene.sound(a.pSoundForward, +a.pMixing1 || 100);
      return;
    }
    scene.state.set('OH1', 'state2'); // Two-State Handling #forward -> state2 (saved in endSprite)
    scene.sync(); // animates the door + Two-State Audio soundForward/soundState2
  });
});

// ------------------------------------------------------------------ GS032-01 Steinpuzzle
registerOrigScene('GS032-01', (scene) => {
  markPorted(scene);
  let solved = false;
  const offs: (() => void)[] = [];
  const leave = () => {
    // exitFrame with gExitFlag: myPuzzleSolved -> writeData("AS032-02", "HS3", 1, #passiv)
    if (solved) scene.state.set('HS3', 'passiv', 'AS032-02');
    scene.goto('AS032-02');
  };
  const ui = gameScreen(scene, 'AS032-02', () => {
    const stones = [21, 22, 23, 24, 25, 26, 27].filter((ch) => scene.stage.has(ch));
    const mode = new Map<number, 'activ' | 'inHand' | 'stopped'>();
    for (const ch of stones) mode.set(ch, 'activ');
    // mixSprites(21, 27, rect(100, 100, 400, 400))
    let tries = 0;
    for (let i = 0; i < stones.length; i++) {
      for (;;) {
        if (++tries > 1000) {
          i = 0;
          tries = 0;
        }
        const sp = scene.sprite(stones[i]);
        sp.setLoc(rnd(100, 400), rnd(100, 400));
        let touching = false;
        for (let j = 0; j < i; j++) {
          const a = sp.rect(), b = scene.sprite(stones[j]).rect();
          if (a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom) {
            touching = true;
            break;
          }
        }
        if (!touching) break;
      }
    }
    let drag: { ch: number; dx: number; dy: number; pid: number } | null = null;
    const setZ = (ch: number, z: number) => (scene.sprite(ch).el.style.zIndex = String(z));
    for (const ch of stones) {
      const sp = scene.sprite(ch);
      sp.hot = true;
      sp.cursor = 'take';
      scene.on(ch, 'mouseDown', (_s, e, pt) => {
        if (mode.get(ch) === 'stopped' || drag || scene.hand) return;
        drag = { ch, dx: pt.x - sp.locH, dy: pt.y - sp.locV, pid: e.pointerId };
        mode.set(ch, 'inHand');
        scene.stage.cursorOverride = 'grab';
        scene.stage.updateCursor();
        setZ(ch, 30 + 100); // locZ 30: above every stone
      });
    }
    const move = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.pid) return;
      const p = scene.stage.toStage(e);
      scene.sprite(drag.ch).setLoc(Math.round(p.x - drag.dx), Math.round(p.y - drag.dy));
    };
    const up = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.pid) return;
      move(e);
      const { ch } = drag;
      drag = null;
      const sp = scene.sprite(ch);
      scene.stage.cursorOverride = null;
      if (sp.locH >= 560 && sp.locH < 570 && sp.locV >= 355 && sp.locV < 365) {
        sp.setLoc(565, 360);
        setZ(ch, ch - 10);
        mode.set(ch, 'stopped');
        // a stopped stone has only the make cursor and ignores clicks: let clicks reach loose stones
        sp.hot = false;
        void scene.sound(`Stone-${random(7)}`, 100);
      } else {
        setZ(ch, ch);
        mode.set(ch, 'activ');
      }
      scene.stage.updateCursor();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    offs.push(() => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    });
    // enterFrame: all stones #stopped -> Game-Ready, else Game-Stop
    scene.onTick(() => {
      solved = stones.every((ch) => mode.get(ch) === 'stopped');
      if (solved) ui.ready();
      else ui.stop();
    });
  }, (m) => (m === 'Game-Back' ? scene.goto('AS032-02') : leave()));
  return () => {
    // leaving by other means (e.g. figure switch = jumpToCurrentCharacter -> gExitFlag) also saves the flag
    if (solved && ui.onGame) scene.state.set('HS3', 'passiv', 'AS032-02');
    offs.forEach((f) => f());
    ui.cleanup();
  };
});

// ------------------------------------------------------------------ AS040-01 / AS040-02
registerOrigScene('AS040-01', (scene) => {
  markPorted(scene);
  movieLoops(scene);
});

registerOrigScene('AS040-02', (scene) => {
  markPorted(scene);
  movieLoops(scene);
  if (!scene.stage.has(13)) return;
  const sp = scene.sprite(13);
  const sand = () => parseInt(scene.state.get('Sand') ?? '1', 10) || 0;
  if (sand() >= 11) sp.visible = false;
  else sp.setMember(`Sandhill-${sand()}`);
  scene.off(13);
  sp.hot = true;
  sp.cursor = 'make';
  scene.on(13, 'mouseUp', () => {
    if (!scene.hand || scene.busy) return;
    if (scene.hand !== 'OI052') return;
    const n = parseInt(/-(\d+)$/.exec(sp.member?.name ?? '')?.[1] ?? '1', 10) + 1;
    void scene.sound('Sand', 100);
    if (n <= 10) sp.setMember(`Sandhill-${n}`);
    else sp.visible = false;
    scene.state.set('Sand', String(n));
  });
});
