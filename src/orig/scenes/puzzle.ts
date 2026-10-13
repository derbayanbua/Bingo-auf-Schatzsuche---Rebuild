// GS001-01 – Flaschenpost + Puzzle (Schatzkarte). Port of the local Lingo:
//   MovieScript 1 (prepareMovie: pieces invisible; gGameBackMovie = AS001-01)
//   Jigsaw Puzzle Frame Behavior (talk timer), Jigsaw Puzzle Sprite Behavior (pieces 11–29),
//   Flasche (50, shaking), Korken (51, cork + shadow 48).
// Drag input uses pointer events (mouse + touch).

import { registerOrigScene, type OrigScene } from '../sceneView';
import { playEffectLoop } from '../sound';
import type { Sprite } from '../stage';
import { GameButtons, MouseTracker, rectsIntersect, rnd, setSize, setZ } from './ch1common';

const FIRST = 11;
const LAST = 29;

registerOrigScene('GS001-01', (scene) => {
  const offs: (() => void)[] = [];
  const mouse = new MouseTracker(scene);
  offs.push(() => mouse.destroy());
  const buttons = new GameButtons(scene, 'AS001-01', [{ ch: 101, item: 'OI032' }], () => void startGame());
  offs.push(() => buttons.destroy());

  async function startGame() {
    await scene.gotoFrame('Game');
    if (!scene.alive) return;
    offs.push(game(scene, mouse, buttons));
  }

  return () => {
    for (const f of offs) f();
  };
});

type CorkMode = 'bottle' | 'inHand' | 'falling' | 'ground' | 'lifting';

function game(scene: OrigScene, mouse: MouseTracker, buttons: GameButtons): () => void {
  const offs: (() => void)[] = [];
  scene.stage.el.style.touchAction = 'none';
  offs.push(() => (scene.stage.el.style.touchAction = ''));
  const sp = (ch: number) => scene.sprite(ch);
  const st = (k: string, screen?: string) => (scene.state.get(k, screen) ?? '').toLowerCase();

  // ---------------------------------------------------------------- prepareMovie / beginSprite
  for (let i = FIRST; i <= LAST; i++) sp(i).visible = false;
  const links = new Map<number, number[]>();
  for (let i = FIRST; i <= LAST; i++) {
    links.set(i, [i]);
    sp(i).cursor = 'make';
  }
  // Frame behaviour: sprite(30).visibility = PUZZLE solved
  let mapVisibility = st('PUZZLE') === 'solved';
  const map = sp(30);
  // visibility (puzzle solved) AND Inventar im Adventurescreen (OS30 activ -> blend 100)
  const showMap = () => {
    map.visible = mapVisibility && st('OS30') === 'activ';
  };
  showMap();
  offs.push(scene.onTick(showMap));

  // ---------------------------------------------------------------- Frame behaviour: talk timer
  let talkTimer = performance.now() + rnd(10000, 15000);
  let talkCounter = rnd(1, 6);
  offs.push(
    scene.onTick((now) => {
      if (mapVisibility) return;
      if (now > talkTimer) {
        if (scene.talking) return;
        talkCounter = talkCounter === 6 ? 1 : talkCounter + 1;
        void scene.playerTalk(talkCounter, { block: false });
        talkTimer = now + rnd(15000, 20000);
      }
    }),
  );

  // ---------------------------------------------------------------- pieces
  let dragCh = 0;
  let offH = 0, offV = 0;
  const moveToZ = (ch: number, front: boolean) => {
    for (const s of links.get(ch)!) setZ(sp(s), front ? 35 : s);
  };
  for (let ch = FIRST; ch <= LAST; ch++) {
    scene.on(ch, 'mouseDown', () => {
      if (dragCh) return;
      const me = sp(ch);
      offH = mouse.x - me.locH;
      offV = mouse.y - me.locV;
      dragCh = ch;
      moveToZ(ch, true);
      const r = me.rect();
      // baRestrictCursor: the piece stays inside (0,45)-(800,492)
      mouse.restrict = { l: 0 + mouse.x - r.left, t: 45 + mouse.y - r.top, r: 800 - (r.right - mouse.x), b: 492 - (r.bottom - mouse.y) };
      mouse.onceUp(() => {
        if (dragCh !== ch) return;
        dragPieces();
        dragCh = 0;
        for (const s of [...links.get(ch)!]) checkForNewLinks(s);
        moveToZ(ch, false);
        mouse.restrict = null;
      });
    });
  }
  function dragPieces() {
    if (!dragCh) return;
    const h = mouse.x - offH, v = mouse.y - offV;
    for (const s of links.get(dragCh)!) sp(s).setLoc(h, v);
  }
  offs.push(scene.onTick(dragPieces));

  function closeEnough(me: number, s: number): boolean {
    const c = 4; // pCloseness
    const a = sp(me), b = sp(s);
    if (Math.abs(a.locH - b.locH) >= c || Math.abs(a.locV - b.locV) >= c) return false;
    const r = a.rect();
    return rectsIntersect(b.rect(), { left: r.left - c - 1, top: r.top - c - 1, right: r.right + c + 1, bottom: r.bottom + c + 1 });
  }

  function checkForNewLinks(me: number) {
    // note: like the original, also invisible (not yet shaken out) pieces are candidates
    for (let s = FIRST; s <= LAST; s++) {
      const mine = links.get(me)!;
      if (mine.includes(s)) continue;
      if (!closeEnough(me, s)) continue;
      void scene.sound('Puzzleteil', 100);
      if (!scene.talking && rnd(1, 4) === 1) void scene.playerTalk(rnd(7, 8), { block: false });
      const merged = [...mine, ...links.get(s)!];
      for (const x of merged) links.set(x, merged);
      const m = sp(me);
      for (const x of merged) sp(x).setLoc(m.locH, m.locV);
      checkDoneGame(me);
      return;
    }
  }

  function checkDoneGame(me: number) {
    if (links.get(me)!.length !== LAST - FIRST + 1) return;
    map.setLoc(sp(FIRST).locH, sp(FIRST).locV);
    for (let i = FIRST; i <= LAST; i++) sp(i).visible = false;
    mapVisibility = true;
    map.blend = 100;
    scene.state.set('OS30', 'activ'); // sprite(30).myState = #activ (saved by the item behaviour)
    scene.state.set('PUZZLE', 'solved');
    scene.state.set('OS20', 'activ', 'AS001-01');
    buttons.setReady();
    showMap();
  }

  // ---------------------------------------------------------------- bottle (50)
  const bottle = sp(50);
  const cork = sp(51);
  const shadow = sp(48);
  let bottleMode: 'stopped' | 'inHand' = 'stopped';
  let bottleOffH = 0;
  let bottleNext = performance.now() + 40;
  let oldMouse = '';
  let rascheln: (() => void) | null = null;
  let quietTimer = 0;
  const stopRascheln = () => {
    rascheln?.();
    rascheln = null;
  };
  offs.push(stopRascheln);
  bottle.cursor = 'make';
  scene.on(50, 'mouseDown', () => {
    if (bottleMode === 'inHand') return;
    bottleMode = 'inHand';
    bottleOffH = 0 - mouse.x;
    mouse.onceUp(() => {
      stopRascheln();
      bottleMode = 'stopped';
    });
  });
  const firstHidden = () => {
    for (let i = FIRST; i <= LAST; i++) if (!sp(i).visible) return i;
    return 0;
  };
  offs.push(
    scene.onTick((now) => {
      if (now < bottleNext) return;
      bottleNext = now + 40;
      if (bottleMode !== 'inHand') return;
      bottle.setLoc(Math.min(0, mouse.x + bottleOffH), mouse.y);
      if (mapVisibility) return;
      const loc = `${Math.round(mouse.x)},${Math.round(mouse.y)}`;
      if (oldMouse !== loc) {
        if (bottle.member?.name === 'Flasche-2' && rnd(1, 5) === 1) {
          const i = firstHidden();
          if (i) sp(i).visible = true;
        }
        if (firstHidden()) {
          // soundEffect(freeFXChannel, "Raschel") while the channel is not busy -> continuous
          if (!rascheln) rascheln = playLoop(scene, 'Raschel');
          quietTimer = 0;
        } else stopRascheln();
      } else {
        if (quietTimer === 0) quietTimer = now + 500;
        if (now > quietTimer && rascheln) {
          stopRascheln();
          quietTimer = 0;
        }
      }
      oldMouse = loc;
    }),
  );

  // ---------------------------------------------------------------- cork (51) + shadow (48)
  let corkMode: CorkMode = 'bottle';
  let shH = -50, shV = 50, speedZ = 0;
  const w0 = cork.w, h0 = cork.h;
  let corkNext = 0;
  // Lingo: blend 0 sprites stay clickable; the stage ignores blend 0, so "0" is a tiny blend here
  const hide = (s: Sprite) => (s.blend = 0.01);
  cork.cursor = 'take';
  scene.on(51, 'mouseDown', () => {
    mouse.restrict = { l: 60, t: 80, r: 550, b: 450 }; // baRestrictCursor(60, 80, 550, 450)
    mouse.clamp();
    mouse.onceUp(corkUp);
    if (corkMode === 'bottle') {
      cork.blend = 100;
      shadow.blend = 100;
      corkMode = 'inHand';
      bottle.setMember('Flasche-2');
      void scene.sound('Plop', 100);
      return;
    }
    if (corkMode === 'ground') corkMode = 'lifting';
  });
  function corkUp() {
    mouse.restrict = null; // baFreeCursor
    if (corkMode === 'inHand') {
      // intersects(): rect test [Prüfung erforderlich: Director uses the matte shape of the bottle]
      if (rectsIntersect(cork.rect(), bottle.rect())) {
        corkMode = 'bottle';
        bottle.setMember('Flasche-1');
        void scene.sound('Quitsch', 100);
      } else corkMode = 'falling';
    }
  }
  const updateShadow = () => {
    const f = (50 + shV) / 100;
    setSize(cork, w0 * f, h0 * f);
    setSize(shadow, w0 * f, h0 * f);
    shadow.setLoc(cork.locH + shH, cork.locV + shV);
  };
  const updatePosition = () => cork.setLoc(mouse.x, mouse.y);
  offs.push(
    scene.onTick((now) => {
      if (now < corkNext) return;
      corkNext = now + 10;
      if (corkMode === 'bottle') {
        hide(cork);
        hide(shadow);
        cork.setLoc(bottle.locH + 200, bottle.locV);
        updateShadow();
      }
      if (corkMode === 'inHand') {
        updatePosition();
        updateShadow();
      }
      if (corkMode === 'falling') {
        speedZ += 1;
        shH += speedZ;
        shV -= speedZ;
        if (shH > 0) {
          shH = 0;
          speedZ = -speedZ / 2;
          void scene.sound('Tisch', 100);
        }
        if (shH === 0 && Math.abs(speedZ) < 2) corkMode = 'ground';
        setZ(cork, 49);
        updateShadow();
      }
      if (corkMode === 'lifting') {
        shH = shH > -50 ? shH - 5 : -50;
        shV = shV < 50 ? shV + 5 : 50;
        if (shH === -50) {
          corkMode = 'inHand';
          speedZ = 0;
          shV = 50;
          setZ(cork, 51);
        }
        updatePosition();
        updateShadow();
      }
    }),
  );

  return () => {
    for (const f of offs) f();
  };
}

/** looping effect with a stop function (soundEffect re-triggered while busy = continuous) */
function playLoop(scene: OrigScene, name: string): () => void {
  return playEffectLoop(scene.movie.dir, name, 100);
}
