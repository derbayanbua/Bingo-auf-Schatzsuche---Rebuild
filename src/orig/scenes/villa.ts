// Villa (chapter 1): AS009-01 Eingang, AS009-02 Ballsaal, AS009-04 Keller,
// GS009-01 Butler ablenken (Mingvase), GS009-02 Gläser-Melodie. Ports of the local Lingo scripts.

import { registerOrigScene, type OrigScene } from '../sceneView';
import type { Sprite } from '../stage';
import { consumeHandItem, GameButtons, insideRect, memberIndex, MouseTracker, oneShot, returnHand, rnd, setZ, type OneShot } from './ch1common';

const lc = (v: string | undefined) => (v ?? '').toLowerCase();

// =============================================================================== AS009-01
registerOrigScene('AS009-01', (scene) => {
  const door = scene.sprite(11);
  const doorFirst = scene.movie.memberAt(1, 3);
  const doorLast = scene.movie.memberAt(1, 14);
  const doorState = () => lc(scene.state.get('OH1')) || 'state1';
  // myMode = #stopped <=> the door shows its end member of the current state
  const doorStopped = () => door.member?.num === (doorState() === 'state2' ? doorLast : doorFirst)?.num;

  // Two-State Activity (12 Butler mouth, 14 Butler hotspot): visible only while door stopped in state2
  const activity = () => {
    const on = doorStopped() && doorState() === 'state2';
    for (const ch of [12, 14]) if (scene.stage.has(ch)) scene.sprite(ch).visible = on;
  };
  activity();
  const offs = [scene.onTick(activity)];

  // Klingel (13)
  let bellTimer = 0;
  scene.sprite(13).cursor = 'make';
  scene.on(13, 'mouseDown', () => {
    if (scene.busy || scene.hand) return;
    void scene.sound('Ding', 50);
  });
  scene.on(13, 'mouseUp', () => {
    if (scene.busy || scene.hand) return;
    void scene.sound('Dong', 50);
    bellTimer = performance.now() + 2000;
  });
  offs.push(
    scene.onTick((now) => {
      if (!bellTimer || now <= bellTimer) return;
      bellTimer = 0;
      if (doorState() === 'state1') {
        // sprite(11).myMode = #forward (state is saved by Two-State Handling -> door stays open)
        void scene.sound('Global-Door-1', 100);
        scene.state.set('OH1', 'state2');
        scene.sync();
      }
    }),
  );

  // Butler (14)
  scene.sprite(14).cursor = 'talk';
  scene.on(14, 'mouseWithin', (sp) => {
    sp.cursor = scene.talking ? 'make' : 'talk';
  });
  scene.on(14, 'mouseUp', () => {
    if (scene.busy) return;
    if (!doorStopped() || doorState() !== 'state2') return;
    if (scene.hand) {
      if (scene.hand !== 'OI002') return; // other item: exit (stays in the hand)
      consumeHandItem(scene); // Eintrittskarte used up
      scene.state.set('HS1', 'activ'); // sprite(15).myState = #activ
      scene.sync();
      const pc = scene.ctx.s.playerCharacter === 'Puck' ? 'ButlerTalk-4' : 'ButlerTalk-3';
      void scene.talk(pc, { mouthCh: 12, block: false });
      return; // soundBusy(4) -> exit
    }
    if (scene.talking) return;
    const passiv = lc(scene.state.get('HS1')) === 'passiv';
    void scene.talk(passiv ? 'ButlerTalk-1' : 'ButlerTalk-2', { mouthCh: 12, block: false });
  });
  return () => offs.forEach((f) => f());
});

// =============================================================================== AS009-02
const DIALOGS: Record<string, [string, number][]> = {
  'Dialog-1': [
    ['Dialog01', 65], ['Dialog02', 54], ['Dialog03', 43], ['Dialog04', 65], ['Dialog05', 43], ['Dialog06', 65],
    ['Dialog07', 43], ['Dialog08', 54], ['Dialog09', 43], ['Dialog10', 65], ['Dialog11', 43], ['Dialog12', 43],
    ['Dialog13', 54], ['Dialog14', 43], ['Dialog15', 65], ['Dialog16', 43], ['Dialog17', 65], ['Dialog18', 54],
    ['Dialog19', 65], ['Dialog20', 54], ['Dialog21', 65], ['Dialog22', 54], ['Dialog23', 65], ['Dialog24', 54],
  ],
  'Dialog-2': [
    ['Dialog02', 54], ['Dialog03', 43], ['Dialog05', 43], ['Dialog07', 43], ['Dialog08', 54], ['Dialog09', 43],
    ['Dialog11b', 43], ['Dialog12', 43], ['Dialog13', 54], ['Dialog14', 43], ['Dialog22', 54],
  ],
  'Dialog-3': [
    ['Dialog01', 65], ['Dialog03', 43], ['Dialog04', 65], ['Dialog05', 43], ['Dialog06', 65], ['Dialog07', 43],
    ['Dialog08', 54], ['Dialog09b', 43], ['Dialog10', 65], ['Dialog11', 43], ['Dialog12', 43], ['Dialog15', 65],
    ['Dialog16', 43], ['Dialog17', 65],
  ],
};
const SPEAKER: Record<number, string> = { 54: 'Bingo', 65: 'Puck', 43: 'Rocco' };

registerOrigScene('AS009-02', (scene) => {
  const offs: (() => void)[] = [];
  const has = (ch: number) => scene.stage.has(ch);
  const visible = (ch: number) => has(ch) && scene.sprite(ch).visible;

  // ---- Butler.beginSprite
  if (lc(scene.state.get('OH1', 'GS009-01')) === 'state2') {
    for (const ch of [30, 31, 32, 33]) if (has(ch)) scene.sprite(ch).visible = false;
  } else if (has(13)) scene.sprite(13).visible = false; // Tapetentür hidden behind the butler

  // ---- Voice Controller (sprite 81)
  let dialogMode: 'stopped' | 'running' = 'stopped';
  async function runDialog(name: string) {
    dialogMode = 'running';
    try {
      for (const [member, mouth] of DIALOGS[name]) {
        if (!scene.alive) return;
        // lines whose mouth sprite is invisible are skipped
        if (!visible(mouth)) continue;
        await scene.talk(member, { mouthCh: mouth, mixing: 80, speaker: SPEAKER[mouth], block: false });
      }
    } finally {
      dialogMode = 'stopped';
    }
  }

  // ---- Butler (30)
  if (has(30)) {
    scene.sprite(30).cursor = 'talk';
    scene.on(30, 'mouseWithin', (sp) => (sp.cursor = dialogMode !== 'stopped' ? 'make' : 'talk'));
    scene.on(30, 'mouseUp', () => {
      if (scene.hand || dialogMode !== 'stopped') return;
      void scene.talk('ButlerTalk-1', { mouthCh: 33, block: false });
    });
  }

  // ---- Rocco (41)
  let roccoTimer = performance.now() + rnd(3000, 5000);
  scene.sprite(41).cursor = 'talk';
  scene.on(41, 'mouseWithin', (sp) => (sp.cursor = dialogMode === 'stopped' ? 'talk' : 'make'));
  scene.on(41, 'mouseUp', () => {
    if (scene.hand) return returnHand(scene);
    if (scene.busy) return;
    let dialog = 'Dialog-1';
    if (!visible(62)) dialog = 'Dialog-2';
    if (!visible(51)) dialog = 'Dialog-3';
    if (dialogMode !== 'stopped') return;
    if (lc(scene.state.get('OS11', 'AS012-01')) === 'wait') scene.state.set('OS11', 'activ', 'AS012-01'); // Flaschenpost erscheint
    scene.stopTalk(); // sound stop 4
    void runDialog(dialog);
  });
  offs.push(
    scene.onTick((now) => {
      if (dialogMode !== 'stopped') return;
      if (now > roccoTimer && !scene.talking) {
        void scene.talk(`RoccoTalk-${rnd(1, 5)}`, { mouthCh: 43, mixing: 20, block: false });
        roccoTimer = now + rnd(3000, 5000);
      }
    }),
  );

  // ---- Pflanztopf (71): OH1, pTransition 150, 25 fps
  const pot = scene.sprite(71);
  const right = pot.locH;
  const left = right - 150;
  let potState = lc(scene.state.get('OH1')) === 'state2' ? 'state2' : 'state1';
  let potMode: 'stopped' | 'forward' | 'backward' = 'stopped';
  let potNext = 0;
  pot.setLoc(potState === 'state2' ? left : right, pot.locV);
  // Two-State Audio refs castLib 3 members 5/5/6/7 [Prüfung erforderlich: Stone-Start / Stone-Loop / Stone-Stop]
  const potSound = { forward: 'Stone-Start', backward: 'Stone-Start', state1: 'Stone-Loop', state2: 'Stone-Stop' };
  pot.cursor = 'make';
  scene.on(71, 'mouseUp', () => {
    if (scene.hand) return; // getCursor() = #grab: only no cursor change; the item is not taken
    if (potState === 'state1' && potMode === 'stopped') {
      potMode = 'forward';
      void scene.sound(potSound.forward, 100);
    } else if (potState === 'state2' && potMode === 'stopped') {
      potMode = 'backward';
      void scene.sound(potSound.backward, 100);
    }
  });
  offs.push(
    scene.onTick((now) => {
      if (potMode === 'stopped' || now < potNext) return;
      if (potMode === 'forward') {
        if (pot.locH > left) pot.setLoc(pot.locH - 10, pot.locV);
        else {
          potState = 'state2';
          potMode = 'stopped';
          scene.state.set('OH1', potState);
          void scene.sound(potSound.state2, 100);
        }
      } else if (potMode === 'backward') {
        if (pot.locH < right) pot.setLoc(pot.locH + 10, pot.locV);
        else {
          potState = 'state1';
          potMode = 'stopped';
          scene.state.set('OH1', potState);
          void scene.sound(potSound.state1, 100);
        }
      }
      potNext = now + 1000 / 25;
    }),
  );
  return () => offs.forEach((f) => f());
});

// =============================================================================== AS009-04
registerOrigScene('AS009-04', (scene) => {
  // local frame script: first visit comment
  if (lc(scene.state.get('PLAYER')) === 'firstenter') {
    scene.state.set('PLAYER', 'none');
    void scene.playerTalk(1, { block: false });
  }
  let timer = performance.now() + rnd(5000, 10000);
  scene.sprite(18).cursor = 'talk';
  scene.on(18, 'mouseWithin', (sp) => (sp.cursor = scene.talking ? 'make' : 'talk'));
  scene.on(18, 'mouseUp', () => {
    if (scene.hand || scene.busy || scene.talking) return;
    void scene.talk('ButlerTalk-2', { mouthCh: 40, block: false });
  });
  const off = scene.onTick((now) => {
    if (now > timer && !scene.talking) {
      void scene.talk('ButlerTalk-1', { mixing: 50, block: false, speaker: 'Butler' });
      timer = now + rnd(5000, 10000);
    }
  });
  return off;
});

// =============================================================================== GS009-01
registerOrigScene('GS009-01', (scene) => {
  const offs: (() => void)[] = [];
  const mouse = new MouseTracker(scene);
  offs.push(() => mouse.destroy());
  const buttons = new GameButtons(scene, 'AS009-02', [], () => void start());
  offs.push(() => buttons.destroy());
  async function start() {
    await scene.gotoFrame('Game');
    if (scene.alive) offs.push(vaseGame(scene, mouse, buttons));
  }
  return () => offs.forEach((f) => f());
});

function vaseGame(scene: OrigScene, mouse: MouseTracker, buttons: GameButtons): () => void {
  const offs: (() => void)[] = [];
  scene.stage.el.style.touchAction = 'none';
  offs.push(() => (scene.stage.el.style.touchAction = ''));
  const sp = (ch: number) => scene.sprite(ch);

  // Haken (16): engine item; Inventar im Adventurescreen hides it when passiv (engine only on frame 1)
  const hook = () => {
    if (scene.stage.has(16)) sp(16).visible = lc(scene.state.get('OS16')) !== 'passiv';
  };
  hook();
  offs.push(scene.onTick(hook));

  // Butler-1 (21): Two-State Handling pRemote -> not clickable
  scene.off(21);
  const butler = sp(21);
  const butlerLast = scene.movie.memberAt(1, 33);

  // ---- Fenster (13): Two-State Handling copy, pId 2 -> OH2, m9..m14, 25 fps
  const win = sp(13);
  const winSeq = scene.movie.sequence(scene.movie.memberAt(1, 9)!, scene.movie.memberAt(1, 14)!);
  let winState = lc(scene.state.get('OH2')) || 'state1';
  let winMode: 'stopped' | 'forward' | 'backward' = 'stopped';
  let winFrame = winState === 'state2' ? winSeq.length - 1 : 0;
  win.setMember(winSeq[winFrame]);
  let winNext = 0;
  win.cursor = 'make';
  scene.on(13, 'mouseUp', () => {
    if (scene.hand) return;
    // #soundBlocked = "None"
    if (winState === 'state1' && winMode === 'stopped') {
      winMode = 'forward';
      void scene.sound('Global-Window-1', 100);
    } else if (winState === 'state2' && winMode === 'stopped') {
      winMode = 'backward';
      void scene.sound('Global-Window-2', 100);
    }
  });
  offs.push(
    scene.onTick((now) => {
      if (now < winNext || winMode === 'stopped') return;
      if (winMode === 'forward' && winFrame < winSeq.length - 1) win.setMember(winSeq[++winFrame]);
      if (winMode === 'backward' && winFrame > 0) win.setMember(winSeq[--winFrame]);
      if (winFrame === 0) {
        winState = 'state1';
        winMode = 'stopped';
      }
      if (winFrame === winSeq.length - 1) {
        winMode = 'stopped';
        winState = 'state2';
      }
      scene.state.set('OH2', winState); // saveData (endSprite)
      winNext = now + 1000 / 25;
    }),
  );

  // ---- Mingvase (14)
  const vase = sp(14);
  let vMode: 'stopped' | 'inHand' | 'falling' = 'stopped';
  let ground = 225;
  let speedV = 0;
  let vNext = 0;
  vase.cursor = 'take';
  scene.on(14, 'mouseDown', () => {
    if (scene.hand) return;
    vMode = 'inHand';
    mouse.restrict = { l: 0, t: 0, r: 740, b: ground };
    mouse.clamp();
    mouse.onceUp(() => {
      vMode = 'falling';
      mouse.restrict = null;
    });
  });
  const hotspot = sp(20);
  if (!hotspot.member?.url) hotspot.hot = false;
  offs.push(
    scene.onTick((now) => {
      if (now < vNext) return;
      if (vMode === 'inHand') {
        vase.setLoc(mouse.x, mouse.y);
        let n = memberIndex(vase);
        if (insideRect(vase.locH, vase.locV, hotspot.rect())) {
          if (winState === 'state1') return; // exit (window closed)
          if (n < 5) n++;
          else {
            setZ(vase, 11);
            ground = 600;
          }
        } else if (n > 1) n--;
        else {
          setZ(vase, 14);
          ground = 225;
        }
        vase.setMember(`Vase-${n}`);
      }
      if (vMode === 'falling') {
        if (vase.locV < ground) {
          vase.setLoc(vase.locH, vase.locV + speedV);
          speedV += 2;
        }
        if (vase.locV > ground) {
          if (ground === 600) {
            void scene.sound('Bruch', 100);
            void action();
          } else void scene.sound('Vase', Math.min(100, speedV * 3)); // [Prüfung erforderlich: mix > 100 capped]
          vase.setLoc(vase.locH, ground);
          vMode = 'stopped';
          speedV = 0;
        }
      }
      vNext = now + 20;
    }),
  );

  // ---- Action (sprite 81)
  let running = false;
  const waitFree = async () => {
    while (scene.alive && scene.talking) await scene.wait(40);
  };
  async function action() {
    if (running) return;
    running = true;
    await waitFree();
    if (!scene.alive) return;
    winState = 'blocked'; // window can no longer be closed / opened
    scene.state.set('OH2', 'blocked');
    await scene.playerTalk(1, { block: false });
    await waitFree();
    if (!scene.alive) return;
    await scene.talk('ButlerTalk-1', { block: false });
    await waitFree();
    if (!scene.alive) return;
    scene.state.set('OH1', 'state2'); // sprite(21).myMode = #forward (Two-State Handling animates)
    scene.sync();
    while (scene.alive && butler.member?.num !== butlerLast?.num) await scene.wait(40);
    if (!scene.alive) return;
    buttons.setReady();
    scene.state.set('HS5', 'passiv', 'AS009-02');
    await scene.talk('ButlerTalk-2', { block: false });
    await waitFree();
    if (!scene.alive) return;
    await scene.playerTalk(2, { block: false });
  }
  return () => offs.forEach((f) => f());
}

// =============================================================================== GS009-02
registerOrigScene('GS009-02', (scene) => {
  const offs: (() => void)[] = [];
  const mouse = new MouseTracker(scene);
  offs.push(() => mouse.destroy());
  const buttons = new GameButtons(scene, 'AS009-04', [{ ch: 101, item: 'OI008' }], () => void start());
  offs.push(() => buttons.destroy());
  async function start() {
    await scene.gotoFrame('Game');
    if (scene.alive) offs.push(glassGame(scene, mouse, buttons));
  }
  return () => offs.forEach((f) => f());
});

function glassGame(scene: OrigScene, mouse: MouseTracker, buttons: GameButtons): () => void {
  const offs: (() => void)[] = [];
  const el = scene.stage.el;
  el.style.touchAction = 'none';
  offs.push(() => (el.style.touchAction = ''));
  const sp = (ch: number) => scene.sprite(ch);
  const r = (ch: number) => sp(ch).rect();
  const rectOf = (s: Sprite) => ({ top: s.top, bottom: s.top + s.h, left: s.left, right: s.left + s.w });
  const setRect = (s: Sprite, x: { top: number; bottom: number; left: number; right: number }) =>
    s.setRect(x.left, x.top, Math.max(0, x.right - x.left), Math.max(0, x.bottom - x.top));

  // hotspot sprites 26–35 only define rects (not drawn) [Prüfung erforderlich: ink/visibility in the original]
  for (let ch = 26; ch <= 35; ch++) if (scene.stage.has(ch)) sp(ch).blend = 0;

  // ---- baKeyIsDown(40): arrow down key, plus an on-screen button for touch
  let keyDown = false;
  const kd = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      keyDown = true;
      e.preventDefault();
    }
  };
  const ku = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') keyDown = false;
  };
  window.addEventListener('keydown', kd);
  window.addEventListener('keyup', ku);
  offs.push(() => {
    window.removeEventListener('keydown', kd);
    window.removeEventListener('keyup', ku);
  });
  // touch substitute for the ↓ key (not in the original): hold it with a second finger
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = '▼';
  btn.title = 'Pfeiltaste ↓ (gedrückt halten: kippen / anschlagen)';
  btn.setAttribute('aria-label', 'Pfeiltaste nach unten');
  btn.style.cssText =
    'position:absolute;left:1.5%;bottom:3%;width:9%;aspect-ratio:1;z-index:200;border-radius:50%;border:3px solid #ffd23f;background:rgba(40,30,0,.55);color:#ffd23f;font-size:min(5vw,32px);touch-action:none;user-select:none;cursor:pointer';
  const press = (on: boolean) => (e: PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    keyDown = on;
    if (on) btn.setPointerCapture?.(e.pointerId);
  };
  btn.addEventListener('pointerdown', press(true));
  btn.addEventListener('pointerup', press(false));
  btn.addEventListener('pointercancel', press(false));
  btn.addEventListener('contextmenu', (e) => e.preventDefault());
  el.append(btn);
  offs.push(() => btn.remove());

  // ---- Melodietaster (108, interface bar -> moved into the scene) [Prüfung erforderlich: position]
  scene.puppet(108);
  const mel = sp(108);
  mel.setMember('Button Melodie');
  mel.setRect(513, 493 - mel.h);
  mel.cursor = 'make';
  let melody: OneShot | null = null;
  scene.on(108, 'mouseUp', () => {
    melody?.stop(); // soundEffect(8, …) restarts channel 8
    melody = oneShot(scene, 'Melodie', 100);
  });
  offs.push(() => {
    melody?.stop();
    scene.stage.removeSprite(108);
  });

  // ---- state
  const hahn = { mode: 'stopped' as 'stopped' | 'forward' | 'backward', state: 'closed' as 'closed' | 'open', next: 0 };
  const karaffe = { mode: 'base' as string, fill: 0, baseH: sp(42).locH, baseV: sp(42).locV, lastFrame: 3 };
  const s43 = sp(43);
  const tapRect = rectOf(s43);
  const saftHahn = { mode: 'stopped' as string, sound: null as OneShot | null, next: 0 };
  s43.blend = 0;
  const s15 = sp(15);
  const jugRect0 = rectOf(s15);
  const saftK = { mode: 'stopped' as string, bottomLevel: jugRect0.bottom, topLevel: jugRect0.top, glas: 0 };
  s15.blend = 0;
  const glas: Record<number, { mode: string; timer: number }> = {};
  for (let ch = 22; ch <= 25; ch++) glas[ch] = { mode: 'stopped', timer: 0 };
  const loeffel = { mode: 'base' as string, baseH: sp(40).locH, baseV: sp(40).locV, next: 0, melodie: [] as string[], talk: 0 };
  let drinkSound: Promise<void> | null = null;

  // ---- Hahn (11)
  sp(11).cursor = 'make';
  const hahnUp = () => {
    if (hahn.state === 'closed' && hahn.mode === 'stopped') {
      hahn.mode = 'forward';
      void scene.sound('Zapfhahn-1', 50);
    } else if (hahn.state === 'open' && hahn.mode === 'stopped') {
      hahn.mode = 'backward';
      void scene.sound('Zapfhahn-2', 50);
    }
  };
  scene.on(11, 'mouseUp', hahnUp);

  // Saft-Hahn (43) handlers
  const tapStartFlow = () => {
    setRect(s43, { ...tapRect, bottom: tapRect.top });
    saftHahn.mode = 'startFlow';
    saftHahn.sound?.stop();
    saftHahn.sound = oneShot(scene, 'Saftstrahl', 100);
    s43.blend = 75;
  };
  const tapStopFlow = () => {
    if (saftHahn.sound?.busy) {
      saftHahn.sound.stop();
      saftHahn.sound = null;
    }
    saftHahn.mode = 'stopFlow';
  };

  // ---- Karaffe (42)
  const k = sp(42);
  k.cursor = 'take';
  scene.on(42, 'mouseDown', () => {
    if (saftHahn.mode === 'flowing') return;
    karaffe.mode = 'inHand';
    mouse.onceUp(() => {
      if (saftHahn.mode === 'flowing') return;
      karaffe.mode = 'returnToBase';
    });
  });
  // Saft-Karaffe (15) handlers
  const jugStartFlow = () => {
    for (let i = 27; i <= 30; i++) {
      const hr = r(i);
      if (!insideRect(mouse.x, mouse.y, hr)) continue;
      setRect(s15, { top: k.locV + 10, bottom: k.locV + 10, left: k.locH + 70, right: k.locH + 80 });
      saftK.bottomLevel = sp(i - 5).locV;
      saftK.mode = 'startFlow';
      s15.blend = 75;
      mouse.restrict = { l: hr.left, t: hr.top, r: hr.right, b: hr.bottom };
      mouse.clamp();
      saftK.glas = i - 5;
    }
  };
  const jugStopFlow = () => {
    mouse.restrict = null;
    saftK.mode = 'stopFlow';
  };

  // ---- Glas (22–25)
  for (let ch = 22; ch <= 25; ch++) {
    sp(ch).cursor = 'make';
    scene.on(ch, 'mouseDown', () => {
      glas[ch].mode = 'drink';
      glas[ch].timer = performance.now();
      mouse.onceUp(() => (glas[ch].mode = 'stopped'));
    });
  }

  // ---- Loeffel (40)
  sp(40).cursor = 'take';
  scene.on(40, 'mouseDown', () => {
    loeffel.mode = 'inHand';
    mouse.onceUp(() => (loeffel.mode = 'returnToBase'));
  });

  // ---- per-frame logic (fixed 30 Hz logic tick, channel order like prepareFrame)
  let acc = 0;
  offs.push(
    scene.onTick((now, dt) => {
      acc += dt;
      if (acc < 1000 / 30) return;
      acc = 0;
      tickHahn(now);
      tickSaftKaraffe();
      for (let ch = 22; ch <= 25; ch++) tickGlas(ch, now);
      tickLoeffel(now);
      tickKaraffe();
      tickSaftHahn(now);
    }),
  );
  offs.push(() => {
    saftHahn.sound?.stop();
  });

  function tickHahn(now: number) {
    if (now < hahn.next) return;
    const h = sp(11);
    let f = memberIndex(h);
    if (hahn.mode === 'forward') {
      if (f < 10) h.setMember(`Hahn-${++f}`);
      else {
        hahn.mode = 'stopped';
        hahn.state = 'open';
        tapStartFlow();
      }
    }
    if (hahn.mode === 'backward') {
      if (f > 1) h.setMember(`Hahn-${--f}`);
      else {
        hahn.mode = 'stopped';
        hahn.state = 'closed';
        tapStopFlow();
      }
    }
    hahn.next = now + 40;
  }

  function tickSaftHahn(now: number) {
    if (now < saftHahn.next) return;
    const c = rectOf(s43);
    if (saftHahn.mode === 'startFlow') {
      if (c.bottom < tapRect.bottom) {
        c.bottom += 10;
        if (c.bottom >= tapRect.bottom) {
          c.bottom = tapRect.bottom;
          saftHahn.mode = 'flowing';
        }
        setRect(s43, c);
      }
    }
    if (saftHahn.mode === 'flowing') {
      setRect(s43, { ...c, left: tapRect.left - rnd(1, 2), right: tapRect.right + rnd(1, 2) });
      if (karaffe.fill < 20) karaffe.fill++;
      if (saftHahn.sound && !saftHahn.sound.busy) {
        hahnUp(); // sendSprite(11, #mouseUp): the tap closes when the sound is over
        saftHahn.mode = 'stopFlow';
        saftHahn.sound = null;
      }
    }
    if (saftHahn.mode === 'stopFlow') {
      const c2 = rectOf(s43);
      if (c2.top < tapRect.bottom) {
        c2.top += 10;
        if (c2.top >= tapRect.bottom) {
          s43.blend = 0;
          setRect(s43, tapRect);
          saftHahn.mode = 'stopped';
        } else setRect(s43, c2);
      }
    }
    saftHahn.next = now + 10;
  }

  function tickKaraffe() {
    let f = memberIndex(k);
    if (karaffe.mode === 'inHand') {
      k.setLoc(mouse.x, mouse.y);
      if (keyDown) {
        karaffe.mode = 'turnForward';
        let inside = false;
        for (let i = 27; i <= 30; i++) if (insideRect(mouse.x, mouse.y, r(i))) inside = true;
        karaffe.lastFrame = inside ? 6 : 3;
        if (karaffe.fill === 0) karaffe.lastFrame = 6;
      }
    }
    if (karaffe.mode === 'turnForward') {
      k.setLoc(mouse.x, mouse.y);
      f = memberIndex(k);
      if (!keyDown) karaffe.mode = 'turnBackward';
      if (f < karaffe.lastFrame) k.setMember(`Karaffe-${f + 1}`);
      else if (karaffe.lastFrame === 6 && karaffe.fill > 0) {
        karaffe.mode = 'flowing';
        jugStartFlow();
      }
    }
    if (karaffe.mode === 'flowing') {
      k.setLoc(mouse.x, mouse.y);
      if (!keyDown || karaffe.fill === 0) {
        karaffe.mode = 'turnBackward';
        jugStopFlow();
      }
    }
    if (karaffe.mode === 'turnBackward') {
      k.setLoc(mouse.x, mouse.y);
      f = memberIndex(k);
      if (f > 1) k.setMember(`Karaffe-${f - 1}`);
      else if (!keyDown) karaffe.mode = 'inHand';
    }
    if (karaffe.mode === 'returnToBase') {
      mouse.restrict = null;
      jugStopFlow();
      f = memberIndex(k);
      if (f > 1) k.setMember(`Karaffe-${f - 1}`);
      const dh = Math.trunc((k.locH - karaffe.baseH) / 5), dv = Math.trunc((k.locV - karaffe.baseV) / 5);
      k.setLoc(k.locH - dh, k.locV - dv);
      if (Math.abs(k.locH - karaffe.baseH) < 5 && Math.abs(k.locV - karaffe.baseV) < 5) {
        k.setLoc(karaffe.baseH, karaffe.baseV);
        karaffe.mode = 'base';
      }
    }
  }

  function tickSaftKaraffe() {
    const c = rectOf(s15);
    if (saftK.mode === 'startFlow') {
      if (c.bottom < saftK.bottomLevel) {
        c.bottom += 20;
        c.left = k.locH + 70;
        c.right = k.locH + 80;
        if (c.bottom >= saftK.bottomLevel) {
          c.bottom = saftK.bottomLevel;
          saftK.mode = 'flowing';
          glas[saftK.glas].mode = 'fill';
        }
        setRect(s15, c);
      }
    }
    if (saftK.mode === 'flowing') {
      setRect(s15, { top: k.locV + 10, bottom: c.bottom, left: k.locH + 72 - rnd(1, 2), right: k.locH + 78 + rnd(1, 2) });
    }
    if (saftK.mode === 'stopFlow') {
      const d = rectOf(s15);
      if (d.bottom < saftK.bottomLevel) d.bottom = Math.min(saftK.bottomLevel, d.bottom + 20);
      if (d.top < saftK.bottomLevel) {
        d.top += 20;
        if (d.top >= saftK.bottomLevel) {
          s15.blend = 0;
          setRect(s15, jugRect0);
          saftK.mode = 'stopped';
          if (glas[saftK.glas]) glas[saftK.glas].mode = 'stopped';
          return;
        }
      }
      setRect(s15, d);
    }
  }

  function tickGlas(ch: number, now: number) {
    const g = glas[ch];
    const s = sp(ch);
    if (g.mode === 'drink') {
      if (now < g.timer) return;
      const f = memberIndex(s);
      if (f > 1) {
        s.setMember(`Glas-${f - 1}`);
        if (!drinkSound) drinkSound = scene.sound('Trinken', 100).then(() => void (drinkSound = null)); // soundEffect(5) if free
        g.timer = now + 500;
      }
    }
    if (g.mode === 'fill') {
      if (now < g.timer) return;
      const f = memberIndex(s);
      if (f < 20 && karaffe.fill > 0) {
        karaffe.fill--;
        s.setMember(`Glas-${f + 1}`);
      }
      g.timer = now + 100;
    }
  }

  function tickLoeffel(now: number) {
    if (now < loeffel.next) return;
    const l = sp(40);
    if (loeffel.mode === 'inHand') {
      l.setLoc(mouse.x, mouse.y);
      if (keyDown) loeffel.mode = 'hitForward';
    }
    if (loeffel.mode === 'hitForward') {
      const f = memberIndex(l);
      if (f < 6) l.setMember(`Loeffel-${f + 1}`);
      else {
        for (let i = 31; i <= 35; i++) {
          if (!insideRect(mouse.x, mouse.y, r(i))) continue;
          const note = String(memberIndex(sp(i - 10)));
          void scene.sound(`Kling-${note}`, 100);
          loeffel.melodie.push(note);
          if (loeffel.melodie.length >= 7) {
            if (loeffel.melodie.join(',') === '8,8,11,10,8,6,8') {
              void scene.talk('ButlerTalk-4', { block: false, speaker: 'Butler' });
              buttons.setReady();
              scene.state.set('OS11', 'activ', 'AS009-04');
            } else {
              loeffel.talk = loeffel.talk + 1 === 4 ? 1 : loeffel.talk + 1;
              void scene.talk(`ButlerTalk-${loeffel.talk}`, { block: false, speaker: 'Butler' });
            }
            loeffel.melodie = [];
          }
        }
        loeffel.mode = 'hitBackward';
      }
      l.setLoc(mouse.x, mouse.y);
    }
    if (loeffel.mode === 'hitBackward') {
      const f = memberIndex(l);
      if (f > 1) l.setMember(`Loeffel-${f - 1}`);
      else loeffel.mode = mouse.down ? 'inHand' : 'returnToBase';
      l.setLoc(mouse.x, mouse.y);
    }
    if (loeffel.mode === 'returnToBase') {
      const dh = Math.trunc((l.locH - loeffel.baseH) / 5), dv = Math.trunc((l.locV - loeffel.baseV) / 5);
      l.setLoc(l.locH - dh, l.locV - dv);
      if (Math.abs(l.locH - loeffel.baseH) < 5 && Math.abs(l.locV - loeffel.baseV) < 5) {
        l.setLoc(loeffel.baseH, loeffel.baseV);
        loeffel.mode = 'base';
        loeffel.melodie = [];
      }
    }
    loeffel.next = now + 20;
  }

  return () => offs.forEach((f) => f());
}
