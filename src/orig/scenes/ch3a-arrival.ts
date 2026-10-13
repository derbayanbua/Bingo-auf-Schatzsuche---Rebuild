// Chapter 3 – arrival on the treasure island: AS030-01 .. AS030-04 (local Lingo of dec/Adventure/AS030-0x).
//
// AS030-01 prepareMovie: CH1+CH2 -> AS030-01, showInventar, characterTalk("Story",100,0) (no Wait cursor);
//   sprite 12 "Tim": locH += mySpeed (3) every 30 ms, left > 900 -> -3 + flipH, right < -100 -> 3.
//   Hotspot-AS 15 (HS1) -> AS030-02 (generic).
// AS030-02 prepareMovie: CH1+CH2 -> AS030-02, Story. Cue "Fahne" -> sprite 12 (Fahne, Two-State
//   Animation #stopped) #forward once. Sprite 14 "Rocco": #talk cursor, mouseUp -> AS030-03.
// AS030-03 prepareMovie: CH1+CH2 -> AS030-03, Story. Cue "Ja" -> sprite 11 (Rocco, pendulum) #forward.
//   Hotspots 13/14 (HS1) -> AS030-04 (generic).
// AS030-04 prepareMovie: PLAYER = firstEnter -> CH1+CH2 -> AS030-04; startMovie: Story (first time).
//   Sprite 11 "Hotspot Abmarsch": walk cursor; mouseUp (no Wait, nothing in the hand):
//   firstEnter -> playSmacker("Abmarsch"), PLAYER none, moods CH3..CH8 = 90, CH9 = 50, all figures
//   (except CH3/CH6) onto SP041 at fixed points; else SP041-03 free -> current figure there (dir 4),
//   otherwise playerTalk(random(101,103)); jumpToCurrentCharacter().
//
// Cue points: the Story sounds carry one cue each (cupt chunk of the movie): AS030-02 "Fahne" at
// 13708 ms, AS030-03 "Ja" at 9427 ms. The web audio has no cue events, so they are timed from the start
// of the voice line (only while it is still playing).

import type { CharId } from '../../game/types';
import { checkPointFree, playerChar } from '../../game/logic';
import { registerOrigScene, type OrigScene } from '../sceneView';
import { markPorted, movieLoops } from './ch3a-util';

function bothHere(scene: OrigScene) {
  const c = scene.ctx.s.chars;
  c.CH1.screen = scene.id;
  c.CH1.position = 0;
  c.CH2.screen = scene.id;
  c.CH2.position = 0;
  scene.refresh(); // showInventar (+ save)
}

/** characterTalk("Story", 100, 0) + CuePassed(name) after `cueMs` */
function story(scene: OrigScene, cueMs?: number, onCue?: () => void) {
  const t0 = performance.now();
  let done = false;
  void scene.talk('Story', { speaker: '', block: false }).then(() => (done = true));
  if (cueMs === undefined || !onCue) return;
  const off = scene.onTick((now) => {
    if (done) return off();
    if (now - t0 >= cueMs) {
      off();
      onCue();
    }
  });
}

/** Two-State Animation (pStartMode #stopped) set to #forward by another script */
function playTwoState(scene: OrigScene, ch: number) {
  if (!scene.stage.has(ch)) return;
  const p = scene.sprite(ch).behavior('Two-State Animation')?.params;
  if (!p) return;
  const a = scene.movie.memberAt(p.pFirstMember?.castLib || 1, p.pFirstMember?.member);
  const b = scene.movie.memberAt(p.pLastMember?.castLib || 1, p.pLastMember?.member);
  if (!a || !b) return;
  void scene.stage.playMembers(ch, scene.movie.sequence(a, b), +p.pFrameRate || 25, { pendulum: !!p.pPendulum, loop: !!p.pLoop });
}

// ------------------------------------------------------------------ AS030-01
registerOrigScene('AS030-01', (scene) => {
  markPorted(scene);
  bothHere(scene);
  movieLoops(scene);
  story(scene);
  if (scene.stage.has(12)) {
    // Tim walks along the beach
    const sp = scene.sprite(12);
    let speed = 3;
    let next = 0;
    scene.onTick((now) => {
      if (now < next) return;
      next = now + 30;
      sp.setLoc(sp.locH + speed, sp.locV);
      if (sp.left > 900) {
        speed = -3;
        sp.el.style.transform = 'scaleX(-1)'; // flipH
      }
      if (sp.left + sp.w < -100) {
        speed = 3;
        sp.el.style.transform = '';
      }
    });
  }
});

// ------------------------------------------------------------------ AS030-02
registerOrigScene('AS030-02', (scene) => {
  markPorted(scene);
  bothHere(scene);
  movieLoops(scene);
  story(scene, 13708, () => playTwoState(scene, 12));
  if (scene.stage.has(14)) {
    const sp = scene.sprite(14);
    sp.hot = true;
    sp.cursor = 'talk';
    scene.on(14, 'mouseWithin', () => {
      // getCursor() = #grab / #Wait -> keep that cursor (the scene view shows them as overrides)
      sp.cursor = 'talk';
    });
    scene.on(14, 'mouseUp', () => {
      // original: no Wait / hand check here
      scene.goto('AS030-03');
    });
  }
});

// ------------------------------------------------------------------ AS030-03
registerOrigScene('AS030-03', (scene) => {
  markPorted(scene);
  bothHere(scene);
  movieLoops(scene);
  story(scene, 9427, () => playTwoState(scene, 11));
});

// ------------------------------------------------------------------ AS030-04
const ABMARSCH: [CharId, number, number][] = [
  ['CH1', 7, 3],
  ['CH2', 3, 4],
  ['CH4', 6, 3],
  ['CH5', 4, 3],
  ['CH8', 5, 4],
  ['CH7', 1, 3],
  ['CH9', 2, 4],
];

registerOrigScene('AS030-04', (scene) => {
  markPorted(scene);
  const s = scene.ctx.s;
  const first = () => (scene.state.get('PLAYER') ?? '').toLowerCase() === 'firstenter';
  if (first()) {
    s.chars.CH1.screen = 'AS030-04';
    s.chars.CH2.screen = 'AS030-04';
    s.chars.CH1.position = 0;
    s.chars.CH2.position = 0;
  }
  scene.refresh();
  if (first()) story(scene);
  if (!scene.stage.has(11)) return;
  const hs = scene.sprite(11);
  scene.off(11);
  hs.hot = true;
  hs.cursor = 'walk';
  let leaving = false;
  scene.on(11, 'mouseUp', () => {
    if (leaving || scene.busy || scene.hand) return;
    if (first()) {
      leaving = true;
      void (async () => {
        await scene.playSmacker('Abmarsch');
        if (!scene.alive) return;
        scene.state.set('PLAYER', 'none');
        for (const ch of ['CH3', 'CH4', 'CH5', 'CH6', 'CH7', 'CH8'] as CharId[]) s.chars[ch].mood = 90;
        s.chars.CH9.mood = 50;
        for (const [ch, pos, dir] of ABMARSCH) {
          const c = s.chars[ch];
          c.screen = 'SP041';
          c.position = pos;
          c.direction = dir;
        }
        scene.ctx.jumpToCurrent();
      })();
      return;
    }
    if (checkPointFree(s, 'SP041-03')) {
      const c = s.chars[playerChar(s)];
      c.screen = 'SP041';
      c.position = 3;
      c.direction = 4;
      leaving = true;
      scene.ctx.jumpToCurrent();
    } else {
      // occupied: playerTalk(random(101,103)) from Shared/Audio-2 (same as the app's Hotspot-SP check)
      scene.gotoBoard('SP041', 3, 4);
    }
  });
});
