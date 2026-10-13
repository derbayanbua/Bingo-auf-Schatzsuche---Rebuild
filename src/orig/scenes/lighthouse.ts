// Lighthouse complex, chapter 1: AS005-03/04/05/07/08/09/10/11 (AS005-02 is fully generic).
// Ports of the local Lingo behaviours (dec/Adventure/AS005-xx/casts/Local Lingo). See CH1_SPEC.md §6.5–6.13.
//
// Web conventions used here (no shared API changes):
// * Lingo `blend = 0` sprites still receive clicks; the web stage does not hit-test blend 0, so such
//   sprites are shown with blend 1 ("ghost") where the original relies on clicks through them.
// * Items the original puts into the hand (sprite 110) go into the pocket (ctx.give) – the scene API
//   has no "put into hand" call. [Prüfung erforderlich: Hand statt Hosentasche]
// * refresh() re-renders scene + HUD after hand/pocket changes (gotoScene of the same scene = sync).

import { registerOrigScene, type OrigScene } from '../sceneView';
import type { Sprite } from '../stage';

const sym = (v: string | undefined) => (v ?? '').toLowerCase();
const random = (n: number) => 1 + Math.floor(Math.random() * n); // Lingo random(n)
const randomRange = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));

function refresh(scene: OrigScene) {
  if (scene.alive) scene.ctx.gotoScene(scene.id);
}
function ghost(sp: Sprite, visible: boolean) {
  sp.blend = visible ? 100 : 1;
}
/** prepareFrame with a `the milliSeconds + ms` update timer */
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
/** score sprite of frame 1 that the original view filters out (e.g. channel 112) */
function scoreSprite(scene: OrigScene, ch: number): Sprite | null {
  const s = scene.movie.frame(1)?.sprites.find((x) => x.ch === ch);
  if (!s) return null;
  const sp = scene.sprite(ch);
  sp.setMember(scene.movie.memberAt(s.castLib, s.member));
  sp.setRect(s.left, s.top, s.width, s.height);
  sp.blend = s.blend;
  return sp;
}
function setBottom(sp: Sprite, bottom: number) {
  const h = Math.max(1, bottom - sp.top);
  sp.setRect(sp.left, sp.top, sp.w, h);
}
const fusesIn = (scene: OrigScene, st: string) =>
  ['OS11', 'OS12', 'OS13'].every((k) => sym(scene.state.get(k, 'AS005-07') ?? 'passiv') === st);
const anyFusePassiv = (scene: OrigScene) => ['OS11', 'OS12', 'OS13'].some((k) => sym(scene.state.get(k, 'AS005-07') ?? 'passiv') === 'passiv');
const lift = (scene: OrigScene) => sym(scene.state.get('LIFT', 'AS005-10') ?? 'floor2');

/** setCharacterScreen(cur, target); gTargetMovie = AS005-09 (lift ride, then jumpToCurrentCharacter) */
function liftRide(scene: OrigScene, target: string) {
  scene.state.set('_target', target, 'AS005-09');
  scene.goto('AS005-09');
}

/** Lift-Drive while moving (re-triggered when the previous one ended), like soundBusy(myChannel) */
function driveSound(scene: OrigScene) {
  let busy = false;
  return () => {
    if (busy) return;
    busy = true;
    void scene.sound('Lift-Drive', 100).then(() => (busy = false));
  };
}

// ----------------------------------------------------------------------------- Hebel (AS005-03 / -05)

function hebel(scene: OrigScene, ch: number, lukeKey: string, lukeLink: { screen: string; key: string }, sounds: { fwd?: string; back?: string; s1?: string; s2?: string; lukeFwd?: string; lukeBack?: string; lukeS1?: string }) {
  let mode: 'stopped' | 'forward' | 'backward' = 'stopped';
  const state = () => (sym(scene.state.get('SWITCH')) === 'state2' ? 'state2' : 'state1');
  const bind = () => {
  const sp = scene.sprite(ch);
  sp.setMember(state() === 'state2' ? 'Hebel-6' : 'Hebel-1');
  sp.cursor = 'make';
  scene.off(ch);
  scene.on(ch, 'mouseUp', () => {
    if (scene.busy || scene.hand) return;
    if (sym(scene.state.get('LOCK', 'AS005-03') ?? 'closed') === 'closed') return;
    if (sym(scene.state.get('LEADER')) === 'activ') return;
    if (mode !== 'stopped') return;
    if (state() === 'state1') {
      mode = 'forward';
      if (sounds.fwd) void scene.sound(sounds.fwd);
    } else {
      mode = 'backward';
      if (sounds.back) void scene.sound(sounds.back);
    }
  });
  };
  const setLuke = (v: 'state1' | 'state2') => {
    scene.state.set(lukeKey, v);
    scene.state.set(lukeLink.key, v, lukeLink.screen);
    // the Two-State Audio of the AS005-05 hatch uses cast member refs the generic view cannot play
    if (v === 'state2' && sounds.lukeFwd) void scene.sound(sounds.lukeFwd);
    if (v === 'state1' && sounds.lukeBack) {
      void scene.sound(sounds.lukeBack);
      if (sounds.lukeS1) void scene.wait(6 * 40).then(() => {
        if (scene.alive) void scene.sound(sounds.lukeS1!);
      });
    }
    scene.sync();
  };
  every(scene, 40, () => {
    if (mode === 'stopped' || scene.frame !== 1 || !scene.stage.has(ch)) return;
    const sp = scene.sprite(ch);
    let [, f] = memberNum(sp);
    if (mode === 'forward' && f < 6) sp.setMember(`Hebel-${++f}`);
    if (mode === 'backward' && f > 1) sp.setMember(`Hebel-${--f}`);
    const save = (v: string) => {
      scene.state.set('SWITCH', v, 'AS005-03');
      scene.state.set('SWITCH', v, 'AS005-05');
    };
    if (f === 1) {
      mode = 'stopped';
      save('state1');
      setLuke('state1');
      if (sounds.s1) void scene.sound(sounds.s1);
    }
    if (f === 6) {
      mode = 'stopped';
      save('state2');
      setLuke('state2');
      if (sounds.s2) void scene.sound(sounds.s2);
    }
  });
  bind();
  return bind;
}

// ----------------------------------------------------------------------------- Lampe (AS005-04 / -11)

function lampe(scene: OrigScene, ch: number, vol: number) {
  const sp = scene.sprite(ch);
  let mode: 'stopped' | 'switchOn' | 'glimmOut' = 'stopped';
  let frame = 1;
  let timer = 0;
  every(scene, 40, (now) => {
    const sw = sym(scene.state.get('OH1', 'AS005-11'));
    if (mode === 'switchOn' && sw !== 'state2') mode = 'stopped';
    if (mode === 'stopped' && sw === 'state2') mode = 'switchOn';
    if (mode === 'stopped') return; // original: the lamp keeps its last member when switched off
    if (mode === 'switchOn') {
      if (now < timer) return;
      sp.setMember('Lampe-2');
      frame = 2;
      void scene.sound('Lampe', vol);
      timer = now + 1000;
      mode = 'glimmOut';
    }
    if (mode === 'glimmOut') {
      if (now < timer) return;
      if (frame < 6) frame++;
      else {
        timer = now + 2000;
        mode = 'switchOn';
      }
    }
    sp.setMember(`Lampe-${frame}`);
  });
}

// ----------------------------------------------------------------------------- AS005-03 Erdgeschoss

registerOrigScene('AS005-03', (scene) => {
  const st = scene.state;
  let offs: (() => void)[] = [];
  const clear = () => {
    for (const f of offs) f();
    offs = [];
  };
  let boxMode: 'stopped' | 'openBox' | 'closeBox' = 'stopped';
  let bindHebel: (() => void) | null = null;

  function setupScreen() {
    clear();
    // Codeschloss: open lock picture only when LOCK = opened (sprite stays the GS005-02 hotspot)
    ghost(scene.sprite(11), sym(st.get('LOCK') ?? 'closed') === 'opened');
    if (bindHebel) bindHebel();
    else bindHebel = hebel(scene, 12, 'OH2', { screen: 'AS005-05', key: 'OH1' }, { fwd: 'Trapdoor-1', back: 'Trapdoor-2' });
    scene.off(13); // Luke: pRemote = not clickable
    scene.sprite(15).blend = sym(st.get('LEADER')) === 'activ' ? 100 : 0; // Leiter (display only)
    // Box (pId OI016)
    const box = scene.sprite(14);
    scene.off(14);
    box.cursor = 'look';
    if (sym(st.get('BOX0')) === 'state2') {
      box.setMember('Box-6');
      boxMode = 'closeBox';
      void scene.sound('Box-Close', 100);
    }
    offs.push(scene.on(14, 'mouseUp', () => {
      if (scene.busy || boxMode !== 'stopped') return;
      const bst = sym(st.get('BOX0') ?? 'blocked');
      if (scene.hand) {
        if (scene.hand === 'OI016' && bst === 'blocked') {
          void scene.sound('Box-Crack', 100);
          st.set('BOX0', 'state1');
        }
        return; // original: the item stays in the hand
      }
      if (bst === 'blocked') {
        void scene.sound('Box-Blocked', 100);
        return;
      }
      boxMode = 'openBox';
      void scene.sound('Box-Open', 100);
    }));
    // Power (exit to AS005-02): Arnold waits in the pub once the Riegel was taken out of the box.
    // [Prüfung erforderlich] original compares the symbol readData(...)=#OI014 with the string "OI014";
    // ported as the evident intent (BOX1 no longer holds OI014). Done on mouseDown so it is saved with the exit.
    offs.push(scene.on(16, 'mouseDown', () => {
      if (scene.busy || scene.hand) return;
      if (sym(st.get('BOX1')) !== 'oi014' && sym(st.get('ARNOLD', 'AS004-02')) !== 'gotpower') {
        const c7 = scene.ctx.s.chars.CH7;
        c7.screen = 'AS004-02';
        c7.mode = 'stopped';
      }
    }));
    scene.sync();
  }

  function setupBox() {
    clear();
    for (let ch = 11; ch <= 32; ch++) scene.off(ch);
    for (let i = 1; i <= 8; i++) {
      const itemCh = 9 + 2 * i;
      const key = `BOX${i}`;
      const show = () => {
        const it = st.get(key) ?? 'OI000';
        const sp = scene.sprite(itemCh);
        if (it !== 'OI000') {
          sp.setMember(it);
          sp.blend = 100;
        } else sp.blend = 0;
        scene.sprite(itemCh).cursor = it !== 'OI000' ? 'take' : 'make';
        scene.sprite(itemCh + 1).cursor = it !== 'OI000' ? 'take' : 'make';
      };
      show();
      const click = () => {
        if (scene.busy) return;
        const it = st.get(key) ?? 'OI000';
        if (scene.hand) {
          if (it !== 'OI000') return; // #aboutToReturn
          st.set(key, scene.hand);
          scene.consumeHand();
          show();
          refresh(scene);
          return;
        }
        if (it === 'OI000') return;
        if (!scene.ctx.give(it)) {
          scene.say('Meine Hosentasche ist voll!');
          return;
        }
        void scene.sound(`${it}-Sound`, 100);
        st.set(key, 'OI000');
        show();
        refresh(scene);
      };
      offs.push(scene.on(itemCh, 'mouseUp', click), scene.on(itemCh + 1, 'mouseUp', click));
    }
    for (const ch of [31, 32]) {
      scene.sprite(ch).cursor = 'walk';
      offs.push(scene.on(ch, 'mouseUp', () => {
        if (scene.busy || scene.hand) return;
        void scene.gotoFrame('Screen').then(() => scene.alive && setupScreen());
      }));
    }
  }

  every(scene, 40, () => {
    if (boxMode === 'stopped' || scene.frame !== 1) return;
    const sp = scene.sprite(14);
    let [, f] = memberNum(sp);
    if (boxMode === 'openBox') {
      if (f < 6) sp.setMember(`Box-${++f}`);
      else {
        boxMode = 'stopped';
        st.set('BOX0', 'state2');
        void scene.gotoFrame('Box').then(() => scene.alive && setupBox());
      }
    } else if (boxMode === 'closeBox') {
      if (f > 1) sp.setMember(`Box-${--f}`);
      else {
        boxMode = 'stopped';
        st.set('BOX0', 'state1');
      }
    }
  });

  setupScreen();
});

// ----------------------------------------------------------------------------- AS005-04 Galerie

function dove(scene: OrigScene, ch: number, dir: 1 | -1) {
  if (!scene.stage.has(ch)) return;
  const sp = scene.sprite(ch);
  let mode: 'stopped' | 'flying' = 'stopped';
  let wings: 1 | -1 = 1;
  let start = performance.now() + randomRange(5000, 10000);
  every(scene, 40, (now) => {
    if (mode === 'stopped') {
      if (now < start) return;
      mode = 'flying';
    }
    if (dir > 0) {
      sp.setLoc(sp.locH + 20, sp.locV);
      if (sp.left > 800) {
        sp.setLoc(-200, randomRange(100, 500));
        mode = 'stopped';
        start = now + randomRange(5000, 10000);
      }
    } else {
      sp.setLoc(sp.locH - 10, sp.locV);
      if (sp.left + sp.w < 0) {
        sp.setLoc(1000, randomRange(100, 350));
        mode = 'stopped';
        start = now + randomRange(5000, 10000);
      }
    }
    let [base, f] = memberNum(sp);
    if (wings > 0) {
      f++;
      if (f === 11) wings = -1;
    } else {
      f--;
      if (f === 1) wings = 1;
    }
    sp.setMember(`${base}-${f}`);
  });
}

registerOrigScene('AS005-04', (scene) => {
  dove(scene, 72, 1);
  dove(scene, 43, -1);
  dove(scene, 44, -1);
  lampe(scene, 47, 50);
});

// ----------------------------------------------------------------------------- AS005-05 Keller

registerOrigScene('AS005-05', (scene) => {
  const st = scene.state;
  // Hebel 29 -> Luke 21 (link AS005-03.OH2). Two-State Audio refs: c3 m10/m11 = Hebel-01/-02,
  // Luke c3 m9/m8/m7 = Trapdoor-1/-2/-3, c6 m1 = silent. [Prüfung erforderlich: Member-Nummern -> Namen]
  hebel(scene, 29, 'OH1', { screen: 'AS005-03', key: 'OH2' }, { s1: 'Hebel-01', s2: 'Hebel-02', lukeFwd: 'Trapdoor-1', lukeBack: 'Trapdoor-2', lukeS1: 'Trapdoor-3' });
  scene.off(21); // Luke: pRemote

  // Gitter / Fackel
  scene.sprite(23).blend = sym(st.get('GITTER') ?? 'closed') === 'opened' ? 100 : 0;
  const torchOn = sym(st.get('TORCH') ?? 'off') === 'on';
  scene.sprite(24).blend = torchOn ? 100 : 0;
  const t1 = scene.movie.memberAt(1, 6), t2 = scene.movie.memberAt(1, 26);
  if (t1 && t2) void scene.playSequence(24, t1, t2, 25, { loop: true }); // Movie-Loop

  // Leiter (sprite 27, pId OI015) – ladder standing in the hatch
  const leiter = scene.sprite(27);
  const lstate = () => sym(st.get('LEADER') ?? 'passiv');
  const showLeiter = () => {
    ghost(leiter, lstate() === 'activ');
    leiter.cursor = lstate() === 'activ' ? 'take' : 'make';
  };
  showLeiter();
  const saveLeiter = (v: string) => {
    st.set('LEADER', v, 'AS005-05');
    st.set('LEADER', v, 'AS005-03');
    st.set('HS1', v); // sprite(41).myState (Hotspot-AS -> AS005-03)
  };
  scene.on(27, 'mouseDown', () => {
    if (scene.busy || scene.hand || lstate() !== 'activ') return;
    if (!scene.ctx.give('OI015')) {
      scene.say('Meine Hosentasche ist voll!');
      return;
    }
    void scene.sound('OI015-Sound', 100);
    saveLeiter('passiv');
    showLeiter();
    refresh(scene);
  });
  scene.on(27, 'mouseUp', () => {
    if (scene.busy || !scene.hand || lstate() === 'activ') return;
    if ((st.get('OH1') ?? 'state1') === 'state1') return; // hatch closed
    if (scene.hand !== 'OI015') return;
    saveLeiter('activ');
    scene.consumeHand();
    void scene.sound('OI015-Sound', 100);
    showLeiter();
    refresh(scene);
  });

  // Rohr (sprite 30): falls down once GS005-03 unscrewed it
  const rohr = scene.sprite(30);
  let pMode: 'stopped' | 'falling' = 'stopped';
  let pVel = 10;
  const pAcc = 3, pGround = 450, pElasticity = 0.45;
  let soundPlayed = false;
  if (sym(st.get('TUBE', 'GS005-03')) === 'free') {
    if (sym(st.get('OS30') ?? 'locked') === 'locked') pMode = 'falling';
    else rohr.setLoc(rohr.locH, pGround);
  }
  every(scene, 1000 / 25, () => {
    if (pMode === 'stopped') return;
    if (pMode === 'falling') rohr.setLoc(rohr.locH, rohr.locV + pVel);
    if (pVel < 30) pVel += pAcc;
    if (rohr.locV >= pGround) {
      rohr.setLoc(rohr.locH, pGround);
      pVel = Math.round(-pVel * pElasticity);
      if (!soundPlayed) {
        soundPlayed = true;
        void scene.sound('Tube', 100);
        st.set('OS30', 'activ');
        st.set('HS3', 'passiv');
        if (scene.stage.has(43)) scene.sprite(43).visible = false; // sprite(43).visibility = 0
        scene.sync();
      }
      if (Math.abs(pVel) <= 2 * pAcc) {
        pVel = 0;
        pMode = 'stopped';
      }
    }
  });

  // Hotspot Gang (sprite 42, HS0) -> AS005-07
  const gang = scene.sprite(42);
  gang.cursor = 'walk';
  scene.on(42, 'mouseUp', () => {
    if (scene.busy || scene.hand) return;
    if (sym(st.get('HS0') ?? 'activ') === 'passiv') return;
    if (sym(st.get('TORCH')) === 'on' && sym(st.get('GITTER')) === 'opened') {
      scene.goto('AS005-07');
      return;
    }
    if (sym(st.get('GITTER') ?? 'closed') === 'closed') {
      st.set('ARNOLD', 'ask', 'AS004-02');
      void scene.playerTalk(3);
      return;
    }
    if (sym(st.get('TORCH') ?? 'off') === 'off') void scene.playerTalk(random(2));
  });
});

// ----------------------------------------------------------------------------- AS005-07 Etage 1

registerOrigScene('AS005-07', (scene) => {
  const st = scene.state;
  const auf = scene.sprite(20);
  let liftState = lift(scene);
  auf.setLoc(auf.locH, liftState === 'floor1' ? 40 : -320);
  let liftMode: 'stopped' | 'moveDown' = 'stopped';
  const drive = driveSound(scene);
  let release: (() => void) | null = null;

  // Hotspot-LiftUp (15): prepareFrame -> visible only with all three fuses in place
  const hs = scene.sprite(15);
  hs.cursor = 'walk';
  scene.on(15, 'mouseUp', () => {
    if (scene.busy || scene.hand) return;
    liftRide(scene, 'AS005-08');
  });

  // Ruftaster (16)
  const rt = scene.sprite(16);
  ghost(rt, false);
  rt.cursor = 'make';
  let rtMode: 'stopped' | 'wait' = 'stopped';
  let rtTimer = 0;
  scene.on(16, 'mouseDown', () => {
    if (scene.busy) return;
    void scene.sound('Beep', 100);
    rt.blend = 100;
    if (anyFusePassiv(scene)) return;
    rtTimer = performance.now() + 1000;
    rtMode = 'wait';
  });
  const up = () => {
    if (!scene.busy) ghost(rt, false);
  };
  window.addEventListener('pointerup', up);

  // fuse slots (11–13, passiv = invisible): dropping OI018 there inserts the fuse
  scene.stage.onBackground = (_e, pt) => {
    if (scene.busy || scene.hand !== 'OI018') return;
    for (const ch of [11, 12, 13]) {
      if (sym(st.get(`OS${ch}`) ?? 'passiv') !== 'passiv' || !scene.stage.has(ch)) continue;
      const r = scene.sprite(ch).rect();
      if (pt.x >= r.left && pt.x < r.right && pt.y >= r.top && pt.y < r.bottom) {
        st.set(`OS${ch}`, 'activ');
        scene.consumeHand();
        void scene.sound('OI018-Sound', 100);
        refresh(scene);
        return;
      }
    }
  };

  scene.onTick((now) => {
    hs.visible = fusesIn(scene, 'activ');
    if (rtMode === 'wait' && now > rtTimer) {
      if (anyFusePassiv(scene)) return;
      if (liftState !== 'floor1') {
        void scene.block(new Promise<void>((r) => (release = r)));
        liftMode = 'moveDown';
        rtMode = 'stopped';
      }
    }
  });
  every(scene, 40, () => {
    if (liftMode !== 'moveDown') return;
    if (auf.locV < 40) {
      auf.setLoc(auf.locH, auf.locV + 5);
      drive();
    } else {
      release?.();
      release = null;
      st.set('LIFT', 'floor1', 'AS005-10');
      void scene.playerTalk(1, { block: false });
      void scene.sound('Lift-Stop', 100);
      liftMode = 'stopped';
      liftState = 'floor1';
    }
  });
  return () => {
    window.removeEventListener('pointerup', up);
    release?.();
  };
});

// ----------------------------------------------------------------------------- AS005-08 Etage 2

registerOrigScene('AS005-08', (scene) => {
  const st = scene.state;
  const auf = scene.sprite(70);
  const l = lift(scene);
  auf.setLoc(auf.locH, l === 'floor1' ? 480 : l === 'floor3' ? -330 : 70);
  let liftMode: 'stopped' | 'moveUp' | 'moveDown' = 'stopped';
  const drive = driveSound(scene);
  let release: (() => void) | null = null;

  const seil = scene.sprite(16);
  const hsDown = scene.sprite(21), hsUp = scene.sprite(22);
  const vis = l === 'floor2' && fusesIn(scene, 'activ');
  hsDown.visible = vis;
  hsUp.visible = vis;
  hsDown.cursor = hsUp.cursor = 'walk';
  scene.on(21, 'mouseUp', () => {
    if (scene.busy || scene.hand || sym(st.get('HS0')) === 'passiv') return;
    liftRide(scene, 'AS005-07');
  });
  scene.on(22, 'mouseUp', () => {
    if (scene.busy || scene.hand || sym(st.get('HS0')) === 'passiv') return;
    liftRide(scene, 'AS005-10');
  });

  const rt = scene.sprite(11);
  ghost(rt, false);
  rt.cursor = 'make';
  let rtMode: 'stopped' | 'wait' = 'stopped';
  let rtTimer = 0;
  scene.on(11, 'mouseDown', () => {
    if (scene.busy) return;
    void scene.sound('Beep', 100);
    rt.blend = 100;
    if (anyFusePassiv(scene)) return;
    rtTimer = performance.now() + 1000;
    rtMode = 'wait';
  });
  const up = () => {
    if (!scene.busy) ghost(rt, false);
  };
  window.addEventListener('pointerup', up);

  scene.onTick((now) => {
    setBottom(seil, auf.top); // Rope
    if (rtMode === 'wait' && now > rtTimer) {
      if (anyFusePassiv(scene)) return;
      const cur = lift(scene);
      if (cur === 'floor3' || cur === 'floor1') {
        void scene.block(new Promise<void>((r) => (release = r)));
        liftMode = cur === 'floor3' ? 'moveDown' : 'moveUp';
        rtMode = 'stopped';
      }
    }
  });
  every(scene, 40, () => {
    if (liftMode === 'stopped') return;
    const moving = liftMode === 'moveUp' ? auf.locV > 70 : auf.locV < 70;
    if (moving) {
      auf.setLoc(auf.locH, auf.locV + (liftMode === 'moveUp' ? -5 : 5));
      drive();
    } else {
      release?.();
      release = null;
      st.set('LIFT', 'floor2', 'AS005-10');
      void scene.playerTalk(1, { block: false });
      void scene.sound('Lift-Stop', 100);
      liftMode = 'stopped';
      hsDown.visible = true;
      hsUp.visible = true;
    }
  });
  return () => {
    window.removeEventListener('pointerup', up);
    release?.();
  };
});

// ----------------------------------------------------------------------------- AS005-09 Aufzugsfahrt

registerOrigScene('AS005-09', (scene) => {
  const st = scene.state;
  const seil = scene.sprite(11);
  const auf = scene.sprite(12);
  const puck = scene.ctx.s.playerCharacter === 'Puck';
  auf.setMember(puck ? 'Lift-Puck' : 'Lift-Bingo');
  scene.sprite(puck ? 13 : 14).visible = false;
  const target = st.get('_target') ?? 'AS005-08';
  const l = lift(scene);
  let mode: 'stopped' | 'moveUp' | 'moveDown' = 'stopped';
  let next = 'floor2';
  if (target === 'AS005-08') {
    if (l === 'floor1') {
      auf.setLoc(auf.locH, 550);
      mode = 'moveUp';
      next = 'floor2';
    }
    if (l === 'floor3') {
      auf.setLoc(auf.locH, -150);
      mode = 'moveDown';
      next = 'floor2';
    }
  }
  if (target === 'AS005-10') {
    auf.setLoc(auf.locH, 550);
    mode = 'moveUp';
    next = 'floor3';
  }
  if (target === 'AS005-07') {
    auf.setLoc(auf.locH, -150);
    mode = 'moveDown';
    next = 'floor1';
  }
  let release: (() => void) | null = null;
  void scene.block(new Promise<void>((r) => (release = r))); // startMovie: setCursor(#Wait)
  const arrive = () => {
    release?.();
    release = null;
    mode = 'stopped';
    st.set('LIFT', next, 'AS005-10');
    scene.goto(target); // jumpToCurrentCharacter()
  };
  if (mode === 'stopped') {
    // [Prüfung erforderlich] original: target AS005-08 with LIFT = floor2 never moves (endless Wait cursor);
    // here the ride ends immediately instead of locking the game.
    void scene.wait(500).then(() => scene.alive && arrive());
  }
  const drive = driveSound(scene);
  const follow = () => {
    for (const ch of [13, 14]) if (scene.stage.has(ch)) scene.sprite(ch).setLoc(auf.locH, auf.locV);
  };
  every(scene, 40, () => {
    if (mode === 'moveUp') {
      if (auf.locV > -150) {
        auf.setLoc(auf.locH, auf.locV - 5);
        follow();
        drive();
      } else {
        void scene.sound('Lift-Stop', 100);
        arrive();
        return;
      }
    } else if (mode === 'moveDown') {
      if (auf.locV < 550) {
        auf.setLoc(auf.locH, auf.locV + 5);
        follow();
        drive();
      } else {
        void scene.sound('Lift-Stop', 100);
        arrive();
        return;
      }
    }
    setBottom(seil, auf.top);
  });
  return () => release?.();
});

// ----------------------------------------------------------------------------- AS005-10 Etage 3

registerOrigScene('AS005-10', (scene) => {
  const st = scene.state;
  const auf = scene.sprite(11);
  const seil = scene.sprite(12);
  const l = lift(scene);
  auf.setLoc(auf.locH, l === 'floor3' ? 280 : 500);
  scene.sprite(15).setMember(l === 'floor3' ? 'Trommel-41' : 'Trommel-1');
  let liftMode: 'stopped' | 'moveUp' = 'stopped';
  const drive = driveSound(scene);
  let release: (() => void) | null = null;

  const hs = scene.sprite(31);
  hs.visible = l === 'floor3' && fusesIn(scene, 'activ');
  hs.cursor = 'walk';
  scene.on(31, 'mouseUp', () => {
    if (scene.busy || scene.hand) return;
    liftRide(scene, 'AS005-08');
  });

  const rt = scene.sprite(30);
  rt.blend = 100;
  rt.cursor = 'make';
  let rtMode: 'stopped' | 'wait' = 'stopped';
  let rtTimer = 0;
  scene.on(30, 'mouseDown', () => {
    if (scene.busy) return;
    void scene.sound('Beep', 100);
    ghost(rt, false);
    if (anyFusePassiv(scene)) return;
    rtTimer = performance.now() + 1000;
    rtMode = 'wait';
  });
  const up = () => {
    if (!scene.busy) rt.blend = 100;
  };
  window.addEventListener('pointerup', up);

  scene.onTick((now) => {
    if (rtMode === 'wait' && now > rtTimer) {
      if (anyFusePassiv(scene)) return;
      if (lift(scene) !== 'floor3') {
        void scene.block(new Promise<void>((r) => (release = r)));
        liftMode = 'moveUp';
        rtMode = 'stopped';
        // Trommel (Two-State Animation) #forward
        const p = scene.sprite(15).behavior('Two-State Animation')?.params ?? {};
        void scene.playSequence(15, 'Trommel-1', 'Trommel-41', +p.pFrameRate || 25);
      }
    }
  });
  every(scene, 40, () => {
    if (liftMode === 'moveUp') {
      if (auf.locV > 280) {
        auf.setLoc(auf.locH, auf.locV - 5);
        drive();
      } else {
        release?.();
        release = null;
        st.set('LIFT', 'floor3', 'AS005-10');
        void scene.playerTalk(1, { block: false });
        void scene.sound('Lift-Stop', 100);
        liftMode = 'stopped';
        rt.blend = 100;
        hs.visible = true;
      }
    }
    setBottom(seil, auf.top);
  });
  return () => {
    window.removeEventListener('pointerup', up);
    release?.();
  };
});

// ----------------------------------------------------------------------------- AS005-11 Wärterzimmer

registerOrigScene('AS005-11', (scene) => {
  lampe(scene, 11, 100);
  // Diary (channel 112 is filtered out of the scene view as interface range -> restore it)
  const d = scoreSprite(scene, 112);
  if (d) {
    d.cursor = 'look';
    scene.on(112, 'mouseUp', () => {
      if (scene.busy || scene.hand) return;
      void scene.playerTalk(1);
    });
  }
});
