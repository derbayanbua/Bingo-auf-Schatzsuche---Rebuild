// Chapter 2 – the ship (AS020-01 … AS020-12). Ports of the local Lingo in dec/Adventure/AS020-xx:
//   AS020-02 Tim (4) + Kanone (3), AS020-03 prepareMovie + Objects (3) + Composing (4),
//   AS020-04 Arnold (3), AS020-05 Hotspot Piratenfilme (3), AS020-06 Reeling (3),
//   AS020-07 Alfred (3), AS020-10 Magnus (3), AS020-12 Ben (3).
// AS020-01 / AS020-09 / AS020-11 only use generic behaviours (items, hotspots, Hotspot-GS). The cap
// OI037 exists in three screens (Inventar-Link: AS020-01 OS11, AS020-10 OS12, AS020-11 OS14); the
// link behaviour writes the own state into the other screens at endSprite (= when leaving).
// Mini games and the chapter-3 transition: gs020.ts.

import { RAW_SCENES } from '../../scenes/generic';
import { registerOrigScene, type OrigScene } from '../sceneView';
import type { MemberRef, Sprite } from '../stage';
import { markPorted } from './ch1util';

const sym = (v: string | undefined) => (v ?? '').toLowerCase();
const random = (n: number) => 1 + Math.floor(Math.random() * n);
const rnd = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));

// ------------------------------------------------------------------ AS020-10 engine objects
// tools/gen_scenes.py produced no objects for AS020-10 (its score has the "Box" frame); the generic
// objects of frame 1 are added here before registerGenericScenes() builds the definition
// (this module is imported by main.ts before that call). Rects = score L/T-45/W/H.
{
  const raw = RAW_SCENES['AS020-10'];
  if (raw && raw.objects.length === 0) {
    raw.objects.push(
      { ch: 11, x: 362, y: 390, w: 282, h: 58, label: 'Luke', kind: 'twoState', key: 'OH1', remote: false },
      { ch: 12, x: 329, y: 0, w: 129, h: 46, label: 'Cap', kind: 'item', key: 'OS12', item: 'OI037', invLink: { screen: 'AS020-01', key: 'OS11' } },
      { ch: 15, x: 365, y: 124, w: 71, h: 38, label: 'Rezept', kind: 'item', key: 'OS15', item: 'OI038' },
      { ch: 16, x: -52, y: 322, w: 139, h: 91, label: 'Kiste', kind: 'box', key: 'BOX0' },
      { ch: 17, x: 750, y: 0, w: 50, h: 448, label: 'AS020', kind: 'exit', key: 'HS3', to: 'AS020-01' },
      { ch: 18, x: 529, y: 374, w: 115, h: 73, label: 'GS020', kind: 'game', key: 'HS1', to: 'GS020-05', back: 'AS020-10', handling: 'OH1' },
      { ch: 19, x: 0, y: 0, w: 312, h: 137, label: 'AS020', kind: 'exit', key: 'HS2', to: 'AS020-11' },
    );
  }
}

// ------------------------------------------------------------------ helpers

/** mouseWithin: #talk while `enabled()` and no voice runs, else #make (no change while grabbing) */
function talkCursor(scene: OrigScene, ch: number, enabled: () => boolean) {
  if (!scene.stage.has(ch)) return;
  const sp = scene.sprite(ch);
  const upd = () => {
    sp.cursor = scene.talking || !enabled() ? 'make' : 'talk';
  };
  upd();
  scene.on(ch, 'mouseWithin', () => {
    upd();
    scene.stage.updateCursor();
  });
}

/**
 * AS020-03 prepareMovie: ARNOLD = waitForLand (AS020-04) and SMACKER = none (AS020-05) ->
 * HS10 activ (way up to Ben, AS020-12) and OH3 state2 (hatch open). Called on entering AS020-03 and
 * when one of the two conditions becomes true, so the hatch is already open when the movie starts
 * (prepareMovie runs before the sprites appear – no opening animation).
 */
function as02003Prepare(scene: OrigScene): boolean {
  if (sym(scene.state.get('ARNOLD', 'AS020-04')) !== 'waitforland') return false;
  if (sym(scene.state.get('SMACKER', 'AS020-05')) !== 'none') return false;
  if (scene.state.get('HS10', 'AS020-03') !== 'activ') scene.state.set('HS10', 'activ', 'AS020-03');
  if (scene.state.get('OH3', 'AS020-03') !== 'state2') scene.state.set('OH3', 'state2', 'AS020-03');
  return true;
}

/** Inventar-Link (Shared 11): endSprite writes the own OS state into the linked screens */
const CAP_LINKS: Record<string, { key: string; to: [string, string][] }> = {
  'AS020-01': { key: 'OS11', to: [['AS020-10', 'OS12'], ['AS020-11', 'OS14']] },
  'AS020-10': { key: 'OS12', to: [['AS020-01', 'OS11'], ['AS020-11', 'OS14']] },
  'AS020-11': { key: 'OS14', to: [['AS020-10', 'OS12'], ['AS020-01', 'OS11']] },
};
function capLink(scene: OrigScene) {
  const l = CAP_LINKS[scene.id];
  return () => {
    const v = scene.state.get(l.key);
    if (v === undefined) return;
    for (const [screen, key] of l.to) scene.state.set(key, v, screen);
  };
}
for (const id of Object.keys(CAP_LINKS)) registerOrigScene(id, (scene) => capLink(scene));

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

// ------------------------------------------------------------------ AS020-02 Kanonendeck: Tim + Kanone

registerOrigScene('AS020-02', (scene) => {
  markPorted(scene);
  const TIM = 16, TIM_MOUTH = 14, KANONE = 23;
  const os15 = () => sym(scene.state.get('OS15'));
  // Tim.mouseWithin: #talk while the cap slot OS15 is #wait
  talkCursor(scene, TIM, () => os15() === 'wait');
  scene.on(TIM, 'mouseUp', () => {
    if (scene.busy) return;
    if (scene.hand === 'OI035') {
      // the rag is used up in any case (#stayHere before the state check)
      scene.consumeHand();
      if (os15() === 'wait') {
        scene.state.set('OS15', 'passiv');
        scene.sync();
        void scene.talk('TimTalk-2', { mouthCh: TIM_MOUTH, block: false });
        return;
      }
    }
    if (scene.talking) return;
    if (os15() === 'wait') void scene.talk('TimTalk-1', { mouthCh: TIM_MOUTH, block: false });
  });

  // Kanone: only after Tim got the rag and while loaded; the lantern OI036 fires it
  scene.sprite(KANONE).cursor = 'make';
  scene.on(KANONE, 'mouseUp', () => {
    if (scene.busy) return;
    if (os15() === 'wait') return;
    if (sym(scene.state.get('CANON')) === 'unloaded') return;
    if (scene.hand !== 'OI036') return;
    // sprite(110).myMode = #returnToSource: the lantern goes back where it came from
    scene.returnHand();
    void (async () => {
      await scene.playSmacker('Kanone');
      // gGameBackScreen = "AS020-02" (GS020-01 uses its fixed gGameBackMovie AS020-02)
      if (scene.alive) scene.goto('GS020-01');
    })();
  });
});

// ------------------------------------------------------------------ AS020-03 Unterdeck

registerOrigScene('AS020-03', (scene) => {
  markPorted(scene);
  if (as02003Prepare(scene)) scene.sync();
  const LUKE = 15, OBJ = 24, COMPOSING = 25;
  const luke = scene.stage.has(LUKE) ? scene.sprite(LUKE) : null;
  const lastRef = (): MemberRef | null => {
    const p = luke?.behavior('Two-State Handling')?.params?.pLastMember;
    return p ? scene.movie.memberAt(p.castLib || 1, p.member) : null;
  };
  const lukeOpen = () => sym(scene.state.get('OH3')) === 'state2';
  // Composing: the open hatch overlay, only when the hatch is open and its animation stopped
  const lukeStopped = () => !!luke && luke.member?.name === lastRef()?.name;
  if (scene.stage.has(COMPOSING)) {
    const comp = scene.sprite(COMPOSING);
    scene.onTick(() => {
      comp.blend = lukeOpen() && lukeStopped() ? 100 : 0;
    });
  }

  // Objects: Ben drops things through the open hatch (only while waiting for land + all films seen)
  if (sym(scene.state.get('ARNOLD', 'AS020-04')) !== 'waitforland') return;
  if (sym(scene.state.get('SMACKER', 'AS020-05')) !== 'none') return;
  scene.puppet(OBJ, true);
  const obj: Sprite = scene.sprite(OBJ);
  obj.setMember('Object-1');
  obj.setRect(270, -125); // score position (above the scene)
  obj.blend = 100;
  let mode: 'waiting' | 'falling' = 'waiting';
  let releaseTime = 0;
  let playerCounter = random(3);
  every(scene, 20, (now) => {
    if (mode === 'waiting') {
      if (lukeOpen() && now > releaseTime) {
        obj.setMember(`Object-${random(5)}`);
        mode = 'falling';
        void scene.sound(`BenTalk-${random(5)}`, 50);
      }
    }
    if (mode === 'falling') {
      obj.setLoc(obj.locH, obj.locV + 20);
      if (obj.locV > 550) {
        void scene.sound(`Crash-${random(3)}`, 50);
        void scene.playerTalk(playerCounter, { block: false });
        playerCounter = playerCounter + 1;
        if (playerCounter === 4) playerCounter = 1;
        obj.setLoc(obj.locH, -100);
        mode = 'waiting';
        releaseTime = now + rnd(2000, 4000);
      }
    }
  });
});

// ------------------------------------------------------------------ AS020-04 Steuerrad: Arnold

registerOrigScene('AS020-04', (scene) => {
  markPorted(scene);
  const ARNOLD = 24, MOUTH = 12;
  const st = () => sym(scene.state.get('ARNOLD'));
  talkCursor(scene, ARNOLD, () => !scene.busy);
  const say = (n: number) => void scene.talk(`ArnoldTalk-${n}`, { mouthCh: MOUTH, block: false });
  scene.on(ARNOLD, 'mouseUp', () => {
    if (scene.busy) return;
    const hand = scene.hand;
    switch (st()) {
      case 'talk':
        if (!hand) {
          scene.state.set('ARNOLD', 'waitForCard');
          say(1);
        } else scene.returnHand();
        return;
      case 'waitforcard':
        if (!hand) return say(1);
        if (hand === 'OI040') {
          scene.state.set('ARNOLD', 'waitForLand');
          scene.consumeHand();
          as02003Prepare(scene);
          say(2);
        } else scene.returnHand();
        return;
      case 'waitforland':
        if (!hand) say(2);
        else scene.returnHand();
        return;
      case 'land':
        if (!hand) {
          // sprite(23).myState = #activ: the Hotspot-GS to the sailing game
          scene.state.set('HS5', 'activ');
          scene.sync();
          say(3);
        } else scene.returnHand();
        return;
    }
  });
});

// ------------------------------------------------------------------ AS020-05 Kammer: Piratenfilme + Laterne

registerOrigScene('AS020-05', (scene) => {
  markPorted(scene);
  const FILM = 15, LANTERN = 11;
  // Movie-Loop of the burning lantern (Feuertopf-1..21, 25 fps)
  if (scene.stage.has(LANTERN)) {
    const p = scene.sprite(LANTERN).behavior('Movie-Loop')?.params;
    const a = p?.pFirstMember ? scene.movie.memberAt(p.pFirstMember.castLib || 1, p.pFirstMember.member) : null;
    const b = p?.pLastMember ? scene.movie.memberAt(p.pLastMember.castLib || 1, p.pLastMember.member) : null;
    if (a && b) void scene.playSequence(LANTERN, a, b, +(p?.pFrameRate ?? 25) || 25, { loop: true });
  }
  if (!scene.stage.has(FILM)) return;
  const film = scene.sprite(FILM);
  const smk = () => sym(scene.state.get('SMACKER'));
  const s0 = smk();
  if (s0 === 'pirat1' || s0 === 'pirat2' || s0 === 'pirat3') film.setMember(`Pirat-${s0.slice(-1)}`);
  else if (s0 === 'none') film.blend = 0;
  film.cursor = smk() === 'none' ? 'make' : 'look';
  scene.on(FILM, 'mouseUp', () => {
    if (scene.busy || scene.hand) return;
    const s = smk();
    const next: Record<string, string> = { pirat1: 'pirat2', pirat2: 'pirat3', pirat3: 'none' };
    if (!next[s]) return;
    void (async () => {
      await scene.playSmacker(`Pirat-${s.slice(-1)}`);
      film.visible = false; // visibility 0 until the movie is entered again
      scene.state.set('SMACKER', next[s]);
      if (next[s] === 'none') as02003Prepare(scene);
    })();
  });
});

// ------------------------------------------------------------------ AS020-06 Kapitänskajüte: Reeling

registerOrigScene('AS020-06', (scene) => {
  markPorted(scene);
  const REELING = 11, CHAIR = 12;
  if (!scene.stage.has(REELING)) return;
  const sp = scene.sprite(REELING);
  const p = sp.behavior('Reeling')?.params ?? {};
  const nameOf = (r: any, dflt: string) => (r ? scene.movie.memberAt(r.castLib || 1, r.member)?.name : null) ?? dflt;
  const num = (n: string) => parseInt(n.slice(n.lastIndexOf('-') + 1), 10) || 1;
  const first = num(nameOf(p.pFirstMember, 'Reeling-1'));
  const last = num(nameOf(p.pLastMember, 'Reeling-16'));
  const waitMin = +p.pWaitMin || 0, waitMax = p.pWaitMax !== undefined ? +p.pWaitMax : 5000;
  const facMin = +p.pFactorMin || 1, facMax = +p.pFactorMax || 3;
  // rocking on the chair (Reeling-n + Stuhl-n); #soundForward/#soundBackward have no receiver here
  let mode: 'stopped' | 'forward' | 'backward' = 'stopped';
  let frame = first;
  let randomTime = performance.now() + rnd(waitMin, waitMax);
  let factor = rnd(facMin, facMax);
  every(scene, 1000 / (+p.pFrameRate || 25), (now) => {
    if (mode === 'stopped') {
      if (now > randomTime) mode = 'forward';
      return;
    }
    if (mode === 'forward' && frame !== last) frame++;
    else if (mode === 'backward' && frame !== first) frame--;
    sp.setMember(`Reeling-${frame}`);
    if (scene.stage.has(CHAIR)) scene.sprite(CHAIR).setMember(`Stuhl-${frame}`);
    if (frame === first) {
      factor--;
      if (factor === 0) {
        mode = 'stopped';
        randomTime = now + rnd(waitMin, waitMax);
        factor = rnd(facMin, facMax);
      } else mode = 'forward';
    }
    if (frame === last) mode = 'backward';
  });
  const locked = () => sym(scene.state.get('OS20')) === 'locked';
  talkCursor(scene, REELING, locked);
  scene.on(REELING, 'mouseUp', () => {
    if (scene.busy) return;
    const hand = scene.hand;
    if (hand) {
      if (hand === 'OI039') {
        scene.consumeHand();
        void scene.talk('ReelingTalk-2', { block: false }); // mouth sprite 0
        scene.state.set('OS20', 'activ'); // the sea chart can be taken now
        scene.sync();
      } else scene.returnHand();
      return;
    }
    if (scene.talking) return;
    if (locked()) void scene.talk('ReelingTalk-1', { block: false });
  });
});

// ------------------------------------------------------------------ AS020-07 Kombüse: Alfred

registerOrigScene('AS020-07', (scene) => {
  markPorted(scene);
  const ALFRED = 15, MOUTH = 12;
  const st = () => sym(scene.state.get('ALFRED'));
  // beginSprite: back from the pancake game
  if (st() === 'gameok') {
    void scene.talk('AlfredTalk-2', { mouthCh: MOUTH, block: false });
    scene.state.set('ALFRED', 'talk');
  }
  talkCursor(scene, ALFRED, () => st() === 'talk');
  scene.on(ALFRED, 'mouseUp', () => {
    if (scene.busy) return;
    const hand = scene.hand;
    if (st() === 'waitforrezept' && hand) {
      if (hand === 'OI038') {
        scene.consumeHand();
        void scene.talk('AlfredTalk-1', { mouthCh: MOUTH, block: false });
        // sprite(19).myState = #state1; myMode = #forward: the oven opens (ends in state2)
        scene.state.set('OH1', 'state2');
        scene.sync();
      } else scene.returnHand();
      return;
    }
    if (scene.talking) return;
    if (st() === 'talk') {
      if (!hand) void scene.talk('AlfredTalk-2', { mouthCh: MOUTH, block: false });
      else scene.returnHand();
    }
  });
});

// ------------------------------------------------------------------ AS020-10 Magnus friert

registerOrigScene('AS020-10', (scene) => {
  markPorted(scene);
  const MAGNUS = 20;
  const st = () => sym(scene.state.get('MAGNUS'));
  talkCursor(scene, MAGNUS, () => st() !== 'none');
  scene.on(MAGNUS, 'mouseUp', () => {
    if (scene.busy) return;
    const hand = scene.hand;
    if (st() === 'waitforcap' && hand) {
      if (hand === 'OI037') {
        scene.consumeHand();
        // original: mouth sprite 13 (does not exist in this movie -> no mouth animation)
        void scene.talk('MagnusTalk-2', { mouthCh: 13, block: false });
        scene.state.set('OS12', 'activ'); // the cap on Magnus' head
        scene.state.set('MAGNUS', 'none');
        scene.state.set('OS15', 'activ'); // the recipe
        scene.sync();
      } else scene.returnHand();
      return;
    }
    if (scene.talking) return;
    if (st() === 'freeze') {
      void scene.talk('MagnusTalk-1', { mouthCh: 35, block: false });
      scene.state.set('MAGNUS', 'waitForCap');
    }
    // (falls through like the original: the same line is started again)
    if (st() === 'waitforcap') void scene.talk('MagnusTalk-1', { mouthCh: 35, block: false });
  });
});

// ------------------------------------------------------------------ AS020-12 Ausguck: Ben

registerOrigScene('AS020-12', (scene) => {
  markPorted(scene);
  const BEN = 14, MOUTH = 11;
  const land = () => sym(scene.state.get('ARNOLD', 'AS020-04')) === 'land';
  talkCursor(scene, BEN, () => !land());
  scene.on(BEN, 'mouseUp', () => {
    if (scene.busy || scene.hand) return;
    if (land()) return;
    void scene.block(async () => {
      await scene.playerTalk(1, { block: false });
      await scene.talk('BenTalk-1', { mouthCh: MOUTH, block: false });
      scene.state.set('ARNOLD', 'land', 'AS020-04');
    });
  });
});
