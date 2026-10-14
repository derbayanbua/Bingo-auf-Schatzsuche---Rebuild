// GS042-01 "Hüpfen und Rennen" (Frogger) – Local Lingo: prepareMovie, Bingo und Puck (3), Fass (4),
// Stamm (5), Kroko (6). Entered from AS042-01 (Hotspot-GS HS2); needs OS101 = OI065 (Teilnahmekarte).
// gGameBackMovie = "AS042-01". Win: playerTalk(7), sprite(16).myState = #activ (OS16 -> Dynamit OI066
// can be taken), Taster "Game-Ready".
// Controls: arrow keys (baKeyIsDown) or the on-screen pad (press and hold = key held).

import { registerOrigScene, type OrigScene } from '../sceneView';
import type { Sprite } from '../stage';
import { gameInterface } from './ch1util';
import { arrowKeys, intersects, markPorted, movieLoops, random, rnd, rotatedRect, setRotation } from './ch3b-util';

registerOrigScene('GS042-01', (scene: OrigScene) => {
  markPorted(scene);
  // prepareMovie: writeData(movieField(), "OS16", 1, #locked) on every entry
  scene.state.set('OS16', 'locked');
  let stopGame: (() => void) | null = null;
  const ui = gameInterface(scene, {
    prefId: 'OI065',
    onBack: () => scene.goto('AS042-01'),
    onStart: () => {
      void scene.gotoFrame('Game').then((ok) => {
        if (!ok || !scene.alive) return;
        ui.setButton('Game-Stop');
        stopGame = startGame(scene, () => ui.setButton('Game-Ready'));
      });
    },
  });
  return () => {
    stopGame?.();
    ui.destroy();
  };
});

type Mode = 'waitForKey' | 'waitForRelease' | 'Turn' | 'jump' | 'stopped';

function startGame(scene: OrigScene, ready: () => void): () => void {
  const offs: (() => void)[] = [];
  movieLoops(scene); // Kroko-1 Movie-Loop
  const puck = scene.ctx.s.playerCharacter === 'Puck';
  // prepareMovie: only the player's figure is visible. Sprites 61/62 lie in the interface bar
  // (T527/T534) which the scene view filters out -> puppet sprites at their score position.
  const CH = puck ? 62 : 61;
  for (const ch of [61, 62]) if (ch !== CH && scene.stage.has(ch)) scene.sprite(ch).visible = false;
  scene.puppet(CH);
  const me = scene.sprite(CH);
  me.setMember(puck ? 'JmpPuck-1' : 'JmpBingo-1');
  me.setRect(puck ? 351 : 344, puck ? 527 : 534);
  me.visible = true;
  me.blend = 100;
  me.el.style.zIndex = String(CH);
  const startLoc = { h: me.locH, v: me.locV };

  // ---- Dynamit (sprite 16, Inventar im Adventurescreen OS16 on the game frame)
  const DYN = 16;
  const dynState = () => (scene.state.get('OS16') ?? 'activ').toLowerCase();
  if (scene.stage.has(DYN)) {
    const d = scene.sprite(DYN);
    // the port's mouseUp below replaces the generic item click of OS16 on the game frame (sceneView)
    d.hot = true;
    d.hitHidden = true;
    d.props.sourceKey = 'OS16';
    const show = () => {
      const st = dynState();
      d.blend = st === 'activ' || st === 'locked' ? 100 : 0;
      d.cursor = st === 'activ' && !scene.hand ? 'take' : null;
      d.props.pickup = st === 'activ';
    };
    show();
    offs.push(scene.onTick(show));
    scene.on(DYN, 'mouseUp', () => {
      if (scene.busy) return;
      const st = dynState();
      if (scene.hand) {
        // drop the same item back onto its (passiv) place
        if (scene.hand === 'OI066' && st === 'passiv') {
          scene.state.set('OS16', 'activ');
          scene.consumeHand();
        } else scene.returnHand();
        return;
      }
      if (st !== 'activ') return;
      scene.state.set('OS16', 'passiv');
      scene.putInHand('OI066', { key: 'OS16' });
      show();
    });
  }

  // ---- drifting objects: 11 Kroko (+random(1,3) → right), 12/15 Stamm (locH - random(-5,-1) → right),
  //      13/14 Fass (+random(-3,-1) → left); every 30 ms; the linked figure moves along
  interface Drift { sp: Sprite; ch: number; kind: 'Kroko' | 'Stamm' | 'Fass'; speed: number; next: number }
  const drifts: Drift[] = [];
  const now0 = performance.now();
  for (const [ch, kind] of [[11, 'Kroko'], [12, 'Stamm'], [13, 'Fass'], [14, 'Fass'], [15, 'Stamm']] as const) {
    if (!scene.stage.has(ch)) continue;
    const speed = kind === 'Kroko' ? rnd(1, 3) : kind === 'Stamm' ? rnd(-5, -1) : rnd(-3, -1);
    drifts.push({ sp: scene.sprite(ch), ch, kind, speed, next: now0 });
  }

  // ---- Bingo und Puck
  const keys = arrowKeys(scene, 8, 316);
  offs.push(() => keys.destroy());
  let mode: Mode = 'waitForKey';
  let rotation = 0;
  let target = 0;
  let turnDir: 'right' | 'left' | 'none' = 'none';
  let link = 0; // myLinkSprite
  let next = 0;
  let fade: { until: number } | null = null; // synchronous splash loop (blend -2 per updateStage)
  const base = puck ? 'JmpPuck' : 'JmpBingo';
  const frameNo = () => +(/-(\d+)$/.exec(me.member?.name ?? '')?.[1] ?? 1);
  const dir = () => {
    const d = ((rotation % 360) + 360) % 360; // Lingo mod keeps the sign; only -90 occurs and is fixed below
    return d === 0 ? 1 : d === 90 ? 2 : d === 180 ? 3 : 4;
  };
  const rect = () => rotatedRect(me, rotation);
  const comment = () => {
    if (random(8) === 1 && !scene.talking) void scene.playerTalk(random(6), { mixing: 50, block: false });
  };
  const turnAndJump = (t: number) => {
    const cur = dir();
    const diff = Math.abs(t - cur);
    turnDir = 'none';
    let deg = diff === 0 ? 0 : 90;
    if (diff === 1) {
      turnDir = t > cur ? 'right' : 'left';
      void scene.sound('Grass-T', 100);
    }
    if (diff === 2) {
      turnDir = 'right';
      deg = 180;
      void scene.sound('Grass-T', 100);
    }
    if (diff === 3) {
      turnDir = t > cur ? 'left' : 'right';
      void scene.sound('Grass-T', 100);
    }
    target = turnDir === 'right' ? rotation + deg : rotation - deg;
    mode = 'Turn';
  };
  const splash = () => {
    void scene.sound('Splash', 100);
    fade = { until: performance.now() + 500 }; // 50 x (blend - 2; updateStage()) [Prüfung erforderlich: Dauer]
  };
  const endSplash = () => {
    fade = null;
    me.blend = 100;
    me.setLoc(startLoc.h, startLoc.v);
    rotation = 0;
    setRotation(me, 0);
  };

  const update = () => {
    if (mode === 'waitForKey') {
      if (me.locV > 435) return turnAndJump(1);
      if (me.locV === 105 && me.locH < 435) return turnAndJump(2);
      if (me.locV === 105 && me.locH > 535) return turnAndJump(4);
      if (me.locV === 105 && me.locH < 535 && me.locH > 435) {
        void scene.playerTalk(7, { block: false });
        scene.state.set('OS16', 'activ');
        ready();
        mode = 'stopped';
      }
      if (keys.isDown(37)) {
        comment();
        turnAndJump(4);
      }
      if (keys.isDown(39)) {
        comment();
        turnAndJump(2);
      }
      if (keys.isDown(38)) {
        comment();
        turnAndJump(1);
      }
      if (keys.isDown(40)) {
        comment();
        turnAndJump(3);
      }
    }
    if (mode === 'waitForRelease') {
      if (keys.isDown(37) || keys.isDown(38) || keys.isDown(39) || keys.isDown(40)) return;
      mode = 'waitForKey';
    }
    if (mode === 'Turn') {
      if (rotation !== target) {
        rotation += turnDir === 'right' ? 30 : -30;
        setRotation(me, rotation);
      } else {
        if (rotation === -90) rotation = 270;
        mode = 'jump';
      }
    }
    if (mode === 'jump') {
      const f = frameNo();
      if (f === 20) {
        me.setMember(`${base}-1`);
        setRotation(me, rotation);
        mode = 'waitForRelease';
        if (me.locV < 435 && me.locV > 105) {
          let found = 0;
          const r = rect();
          for (let i = 11; i <= 15; i++) {
            if (!scene.stage.has(i)) continue;
            const o = scene.sprite(i).rect();
            if (intersects(r, o) && r.left > o.left - 20 && r.right < o.right + 20) {
              found = i;
              break;
            }
          }
          if (found) link = found;
          else return splash(); // myLinkSprite keeps its old value (original)
        } else link = 0;
        if (link === 0) void scene.sound(`Grass-${random(3)}`, 100);
        else {
          const n = (scene.sprite(link).member?.name ?? '').split('-')[0];
          if (n === 'Baumstamm') void scene.sound('Hit-1', 100);
          if (n === 'Fass') void scene.sound('Hit-2', 100);
          if (n === 'Kroko') void scene.sound('Hit-3', 100);
        }
        return;
      }
      me.setMember(`${base}-${f + 1}`);
      if (f + 1 > 6 && f + 1 < 18) {
        const d = dir();
        if (d === 1) me.setLoc(me.locH, me.locV - 5);
        if (d === 2) me.setLoc(me.locH + 3, me.locV);
        if (d === 3) me.setLoc(me.locH, me.locV + 5);
        if (d === 4) me.setLoc(me.locH - 3, me.locV);
      }
      setRotation(me, rotation);
    }
    const r = me.rect();
    if (r.right < 0 || r.left > 800) splash();
  };

  offs.push(scene.onTick((now) => {
    if (!scene.alive || scene.frame < 15) return;
    if (fade) {
      // the original loop runs synchronously: nothing else moves meanwhile
      me.blend = Math.max(0, Math.round(((fade.until - now) / 500) * 100));
      if (now >= fade.until) endSplash();
      return;
    }
    for (const d of drifts) {
      if (now < d.next) continue;
      d.next = now + 30;
      const dx = d.kind === 'Stamm' ? -d.speed : d.speed;
      d.sp.setLoc(d.sp.locH + dx, d.sp.locV);
      if (link === d.ch) {
        me.setLoc(me.locH + dx, me.locV);
        setRotation(me, rotation);
      }
      const r = d.sp.rect();
      if (d.kind === 'Fass' && r.right < 0) {
        d.sp.setLoc(900, d.sp.locV);
        d.speed = rnd(-3, -1);
      }
      if (d.kind === 'Stamm' && r.left > 800) {
        d.sp.setLoc(-100, d.sp.locV);
        d.speed = rnd(-5, -1);
      }
      if (d.kind === 'Kroko' && r.left > 800) {
        d.sp.setLoc(-100, d.sp.locV);
        d.speed = rnd(1, 3);
      }
    }
    if (mode !== 'stopped' && now >= next) {
      next = now + 30;
      update();
    }
  }));
  return () => offs.forEach((o) => o());
}
