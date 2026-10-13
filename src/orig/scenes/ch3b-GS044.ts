// GS044-01 "Häuptling verstehen" (Sprachspiel) and GS044-02 "Suppe kochen" – Local Lingo ports.

import { registerOrigScene, type OrigScene } from '../sceneView';
import { gameInterface } from './ch1util';
import { MouseTracker } from './ch1common';
import { cueTalk, inside, markPorted, movieLoop, movieLoops, random, rolloverFader, voiceTracker, type MovieLoop } from './ch3b-util';

const once = (f: () => void) => {
  let done = false;
  return () => {
    if (done) return;
    done = true;
    f();
  };
};

/** an interface-bar button (sprite 95, T502/T503) moved into the scene (same x, bottom aligned) */
function barButton(scene: OrigScene, ch: number, member: string, left: number) {
  scene.puppet(ch);
  const sp = scene.sprite(ch);
  sp.setMember(member);
  sp.setRect(left, 493 - sp.h);
  sp.el.style.zIndex = String(ch);
  sp.cursor = 'make';
  sp.hitRect = true;
  sp.blend = 50;
  scene.on(ch, 'mouseEnter', () => (sp.blend = 100)); // Rollover Fader 50 -> 100
  scene.on(ch, 'mouseLeave', () => (sp.blend = 50));
  return sp;
}

// ------------------------------------------------------------------ GS044-01
// Entered from AS044-01 (local Hotspot-GS, character stays on AS044-01); needs OS101 = OI064 (Lexikon).
// gGameBackMovie = "AS044-01". Field "Dialog": "H" = the chief talks (BossTalk-n), numbers = the word
// buttons (Sprachtaster, member Word-n -> playerTalk(n)) the player has to press in that order.
// Wrong word -> drops 41..49 + "?" (35) visible again, counters reset. After the 10th chief line:
// writeData("AS044-01","OH1",#state1) (hut 1 unblocked) + Game-Ready. Taster Lexikon (95): holding
// the button shows the dictionary (sprite 60, Paper-1/Paper-2).
const DIALOG = ['1', '2', 'H', '14', '10', '13', 'H', '4', 'H', '5', '9', '9', 'H', '4', '10', '8', 'H', '7', '5', '12', '9', 'H', '4', '12', 'H', '13', '4', '12', 'H', '13', '9', '2', '12', 'H', 'H'];

registerOrigScene('GS044-01', (scene) => {
  markPorted(scene);
  let stop: (() => void) | null = null;
  const ui = gameInterface(scene, {
    prefId: 'OI064',
    onBack: () => scene.goto('AS044-01'),
    onStart: () => {
      void scene.gotoFrame('Game').then((ok) => {
        if (!ok || !scene.alive) return;
        ui.setButton('Game-Stop');
        stop = chief(scene, once(() => ui.setButton('Game-Ready')));
      });
    },
  });
  return () => {
    stop?.();
    ui.destroy();
  };
});

function chief(scene: OrigScene, ready: () => void): () => void {
  const offs: (() => void)[] = [];
  const has = (ch: number) => scene.stage.has(ch);
  const sp = (ch: number) => scene.sprite(ch);
  movieLoops(scene);
  if (has(60)) sp(60).visible = false; // prepareMovie / framescript beginSprite
  // ---- Boss (sprite 30)
  let bossMode: 'stopped' | 'forward' | 'backward' = 'stopped';
  let talkCounter = 0;
  let dialogCounter = 1;
  let timer = 0;
  let upd = 0;
  const line = (n: number) => DIALOG[n - 1] ?? '';
  const boss = has(30) ? sp(30) : null;
  // CuePassed (local framescript): "A" / "I" / "UO" / "PB" -> sprite(30).member = <cue>-1, #forward
  const onCue = (n: string) => {
    if (!boss || !['A', 'I', 'UO', 'PB'].includes(n)) return;
    const m = scene.member(`${n}-1`);
    if (m) boss.setMember(m);
    bossMode = 'forward';
  };
  const vt = voiceTracker(scene);
  offs.push(scene.onTick((now) => {
    if (now < upd) return;
    if (!vt.busy()) bossMode = 'stopped';
    upd = now + 40;
    if (line(dialogCounter) === 'H' && !vt.busy() && now > timer) {
      talkCounter++;
      dialogCounter++;
      void vt.track(cueTalk(scene, `BossTalk-${talkCounter}`, onCue, { speaker: 'Häuptling' }));
      if (has(40 + talkCounter)) sp(40 + talkCounter).blend = 0;
    }
    if (talkCounter === 10) {
      if (scene.state.get('OH1', 'AS044-01') !== 'state1') scene.state.set('OH1', 'state1', 'AS044-01');
      ready();
    }
    if (!boss) return;
    const [b, f] = (boss.member?.name ?? 'A-1').split('-');
    const fr = +f || 1;
    const lastFrame = b === 'I' ? 5 : b === 'PB' ? 3 : 4;
    if (bossMode === 'forward') {
      const m = scene.member(`${b}-${fr + 1}`);
      if (m) boss.setMember(m);
      if (fr + 1 >= lastFrame) bossMode = 'backward';
    } else if (bossMode === 'backward') {
      const m = scene.member(`${b}-${fr - 1}`);
      if (m) boss.setMember(m);
      if (fr - 1 <= 1) bossMode = 'forward';
    }
  }));
  // ---- Sprachtaster 12..25 (mouseDown)
  for (let ch = 12; ch <= 25; ch++) {
    if (!has(ch)) continue;
    rolloverFader(scene, ch);
    sp(ch).hitRect = true;
    sp(ch).cursor = 'make';
    scene.on(ch, 'mouseDown', () => {
      if (scene.hand) return;
      const word = +((sp(ch).member?.name ?? '').split('-')[1] ?? 0);
      void vt.track(scene.playerTalk(word, { block: false }));
      if (dialogCounter === 1 && has(35)) sp(35).blend = 0;
      if (line(dialogCounter) !== String(word)) {
        for (let i = 41; i <= 49; i++) if (has(i)) sp(i).blend = 100;
        const q = 34 + random(4); // only sprite 35 exists
        if (has(q)) sp(q).blend = 100;
        talkCounter = 0;
        dialogCounter = 1;
        if (has(35)) sp(35).blend = 100;
      } else dialogCounter++;
      timer = performance.now() + 1000;
    });
  }
  if (has(26)) sp(26).hot = false; // word labels: no script
  // ---- Taster Lexikon (95): mouseDown shows sprite 60 (Paper-1), mouseUp / mouseUpOutside hides it
  const lex = barButton(scene, 95, 'Button Lexikon', 527);
  lex.props.label = 'Lexikon';
  let shown = false;
  const hide = () => {
    if (!shown) return;
    shown = false;
    if (has(60)) sp(60).visible = false;
    void scene.sound('Paper-2', 100);
  };
  scene.on(95, 'mouseDown', () => {
    if (scene.hand || scene.busy) return;
    shown = true;
    if (has(60)) sp(60).visible = true;
    void scene.sound('Paper-1', 100);
  });
  window.addEventListener('pointerup', hide);
  window.addEventListener('pointercancel', hide);
  offs.push(() => {
    window.removeEventListener('pointerup', hide);
    window.removeEventListener('pointercancel', hide);
  });
  scene.sync();
  return () => offs.forEach((o) => o());
}

// ------------------------------------------------------------------ GS044-02
// Entered from AS044-02 (Hotspot-GS HS2); needs OS101 = OI045 (Salz). gGameBackMovie = "AS044-02".
// Suppe (30): buildSoup() = 3 different random parts of "Apfel,Banane,Keule,Kirsche,Karotte,Salz,
// Socke,Wurst" (random(8), random(7), random(6)). Zutaten (21..28) are thrown into the pot (physics
// below); the three cooks (51..53) rate the soup: part n at position n -> #best, elsewhere -> #middle,
// empty soup -> #bad. All three #best -> writeData("AS044-01", OH2/OH3, #state1) + Game-Ready.
// "Neue Suppe" (95): NewSoup sound, soup emptied.
registerOrigScene('GS044-02', (scene) => {
  markPorted(scene);
  let stop: (() => void) | null = null;
  const ui = gameInterface(scene, {
    prefId: 'OI045',
    onBack: () => scene.goto('AS044-02'),
    onStart: () => {
      void scene.gotoFrame('Game').then((ok) => {
        if (!ok || !scene.alive) return;
        ui.setButton('Game-Stop');
        stop = soup(scene, once(() => ui.setButton('Game-Ready')));
      });
    },
  });
  return () => {
    stop?.();
    ui.destroy();
  };
});

type ZMode = 'inStore' | 'inHand' | 'inAir' | 'hitRightBorder' | 'hitLeftBorder' | 'hitTopBorder' | 'hitBottomBorder' | 'returnToStart1' | 'returnToStart2' | 'stopped';

function soup(scene: OrigScene, ready: () => void): () => void {
  const offs: (() => void)[] = [];
  const has = (ch: number) => scene.stage.has(ch);
  const sp = (ch: number) => scene.sprite(ch);
  movieLoops(scene, [21, 22, 23, 24, 25, 26, 27, 28]); // Feuer-1; the Zutaten loops are created below
  const mouse = new MouseTracker(scene);
  offs.push(() => mouse.destroy());

  // ---- Suppe (30)
  const parts = 'Apfel,Banane,Keule,Kirsche,Karotte,Salz,Socke,Wurst'.split(',');
  const pick = (n: number) => parts.splice(random(n) - 1, 1)[0];
  const recipe = [pick(8), pick(7), pick(6)];
  let current: string[] = [];
  const pot = has(30) ? sp(30) : null;
  if (pot) pot.hot = false;
  const sensor = has(40) ? sp(40) : null;

  // ---- Eingeborener (51..53): member Koch-n, every 80 ms
  type CMode = 'stopped' | 'middle' | 'best' | 'bad' | undefined;
  const cook: Record<number, CMode> = { 51: undefined, 52: undefined, 53: undefined };
  const updateCooks = () => {
    for (const ch of [51, 52, 53]) {
      if (!has(ch)) continue;
      const s = sp(ch);
      const [b, f] = (s.member?.name ?? 'Koch-1').split('-');
      let fr = +f || 1;
      const m = cook[ch];
      if (m === 'stopped' || m === undefined) continue;
      if (m === 'middle') {
        if (fr < 5) fr++;
        else cook[ch] = 'stopped';
      }
      if (m === 'best') {
        if (fr < 11) fr++;
        else cook[ch] = 'stopped';
      }
      if (m === 'bad') {
        if (fr > 1) fr--;
        else cook[ch] = 'stopped';
      }
      const r = scene.member(`${b}-${fr}`);
      if (r) s.setMember(r);
    }
  };
  // Suppe.prepareFrame
  const rate = () => {
    if (!current.length) {
      for (const i of [1, 2, 3]) {
        cook[50 + i] = 'bad';
        if (has(60 + i)) sp(60 + i).blend = 0;
      }
      return;
    }
    for (let i = 1; i <= 3; i++) {
      const it = current[i - 1];
      if (it && has(60 + i)) {
        const m = scene.member(`Icon-${it}`);
        if (m) sp(60 + i).setMember(m);
        sp(60 + i).blend = 100;
      }
    }
    for (let n = 1; n <= 3; n++) {
      if (current[n - 1] === recipe[n - 1]) cook[50 + n] = 'best';
      else for (let i = 1; i <= 3; i++) if (current[i - 1] === recipe[n - 1]) cook[50 + n] = 'middle';
    }
    if (cook[51] !== 'best' || cook[52] !== 'best' || cook[53] !== 'best') return;
    if (scene.state.get('OH2', 'AS044-01') !== 'state1' || scene.state.get('OH3', 'AS044-01') !== 'state1') {
      scene.state.set('OH2', 'state1', 'AS044-01');
      scene.state.set('OH3', 'state1', 'AS044-01');
    }
    ready();
  };

  // ---- Zutaten (21..28)
  interface Z {
    ch: number; s: ReturnType<typeof sp>; loop: MovieLoop | null; mode: ZMode; startH: number; startV: number;
    lastH: number; lastV: number; velH: number; velV: number; acc: number; overPot: boolean; next: number;
    ground: number; top: number; el: number;
  }
  const zs: Z[] = [];
  for (let ch = 21; ch <= 28; ch++) {
    if (!has(ch)) continue;
    const s = sp(ch);
    const p = s.behavior('Zutaten')?.params ?? {};
    const z: Z = {
      ch, s, loop: movieLoop(scene, s), mode: 'inStore', startH: s.locH, startV: s.locV, lastH: 0, lastV: 0,
      velH: 0, velV: 0, acc: 1, overPot: false, next: 0, ground: +p.pGround || 525, top: +(p.pTop ?? 0), el: +(p.pElasticity ?? 0.2),
    };
    zs.push(z);
    s.hot = true;
    s.cursor = 'take';
    s.hitRect = true;
    scene.on(ch, 'mouseWithin', () => {
      s.cursor = s.locH === z.startH && s.locV === z.startV ? 'take' : null;
    });
    scene.on(ch, 'mouseDown', () => {
      if (z.mode !== 'inStore' || scene.hand) return;
      if (s.locH !== z.startH || s.locV !== z.startV) return;
      z.mode = 'inHand';
      mouse.restrict = { l: 560, t: 45, r: 800, b: 493 }; // baRestrictCursor(560, 45, 800, 493)
      mouse.clamp();
      mouse.onceUp(() => {
        if (z.mode !== 'inHand') return;
        z.mode = 'inAir';
        if (random(3) === 1 && !scene.talking) void scene.playerTalk(random(7), { block: false });
        mouse.restrict = null; // baFreeCursor()
      });
    });
  }
  const iInt = (x: number) => Math.round(x); // Lingo integer()
  const updateZ = (z: Z) => {
    const s = z.s;
    if (z.mode === 'inAir') {
      // checkMotion
      const r = s.rect();
      if (r.right + z.velH > 800) z.mode = 'hitRightBorder';
      if (r.left + z.velH < 0) z.mode = 'hitLeftBorder';
      if (r.top + z.velV < z.top) z.mode = 'hitTopBorder';
      if (r.bottom + z.velV > z.ground) z.mode = 'hitBottomBorder';
    }
    if (z.mode === 'inAir') {
      s.setLoc(s.locH + z.velH, s.locV + z.velV);
      if (sensor && inside(s.locH, s.rect().bottom, sensor.rect())) {
        z.velH = 0;
        if (pot) pot.blend = 100;
        z.overPot = true;
      }
      if (z.overPot && sensor && s.rect().top > sensor.rect().bottom) {
        s.setLoc(z.startH, z.startV);
        if (pot) pot.blend = 0;
        z.overPot = false;
        z.mode = 'inStore';
        z.velV = 0;
        z.velH = 0;
        z.acc = 1;
        current.push((s.member?.name ?? '').split('-')[0]);
        void scene.sound(`Blub-${random(3)}`, 100);
      }
    }
    if (z.mode === 'hitRightBorder') {
      const diff = 800 - s.rect().right;
      z.velH = iInt(-z.velH * z.el);
      s.setLoc(s.locH + z.velH - diff, s.locV + z.velV);
      z.mode = 'inAir';
    }
    if (z.mode === 'hitLeftBorder') {
      const diff = s.rect().left;
      z.velH = iInt(-z.velH * z.el);
      s.setLoc(s.locH + z.velH + diff, s.locV + z.velV);
      z.mode = 'inAir';
    }
    if (z.mode === 'hitTopBorder') {
      z.velV = iInt(-z.velV * z.el);
      z.mode = 'inAir';
    }
    if (z.mode === 'hitBottomBorder') {
      z.velV = iInt(-z.velV * z.el);
      if (Math.abs(z.velV) <= 2 * z.acc) {
        z.velV = 0;
        z.mode = 'returnToStart1';
        if (z.loop) z.loop.mode = 'forward';
      } else z.mode = 'inAir';
    }
    if (z.mode === 'inHand') {
      s.setLoc(Math.round(mouse.x), Math.round(mouse.y));
      z.velH = Math.max(-30, Math.min(30, s.locH - z.lastH));
      z.velV = Math.max(-30, Math.min(30, s.locV - z.lastV));
      z.lastH = s.locH;
      z.lastV = s.locV;
    }
    if (z.mode === 'returnToStart1') {
      if (s.rect().top < 600) s.setLoc(s.locH, s.locV + 5);
      else {
        s.setLoc(z.startH, -200);
        z.mode = 'returnToStart2';
      }
    }
    if (z.mode === 'returnToStart2') {
      if (s.locV < z.startV) s.setLoc(s.locH, s.locV + 5);
      else {
        s.setLoc(s.locH, z.startV);
        z.mode = 'inStore';
        if (z.loop) z.loop.mode = 'stopped';
      }
    }
    if (z.velV < 30) z.velV += z.acc;
  };

  // ---- Neue Suppe (95)
  barButton(scene, 95, 'New', 506);
  scene.on(95, 'mouseDown', () => {
    if (scene.hand) return;
    void scene.sound('NewSoup', 100);
  });
  scene.on(95, 'mouseUp', () => {
    if (scene.hand) return;
    current = [];
  });

  let cookT = 0;
  offs.push(scene.onTick((now) => {
    if (!scene.alive || scene.frame < 15) return;
    rate();
    for (const z of zs) {
      if (z.mode === 'stopped' || now < z.next) continue;
      z.next = now + 20;
      updateZ(z);
    }
    if (now >= cookT) {
      cookT = now + 80;
      updateCooks();
    }
  }));
  return () => offs.forEach((o) => o());
}
