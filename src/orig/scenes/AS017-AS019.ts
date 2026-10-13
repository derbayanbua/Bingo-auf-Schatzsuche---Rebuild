// AS017-01 (Wrack), AS017-02 (Ende Kapitel 1) and AS019-01 (Bank am Meer) – Local Lingo ports.

import { registerOrigScene } from '../sceneView';
import { startChapter } from '../screens';
import { hideGenericBack as dropNote } from './gs005Common';

// ------------------------------------------------------------------ AS017-01
// prepareMovie: writeData("AS004-02","REELING",#ask); both players here -> sprite 12 (Anzug-2) blend 100.
// Sprite 13 "Hotspot AS005-08" (HS<pId>, pId 1): walk cursor; mouseUp (not passiv / Wait / item in hand)
// -> setCharacterScreen(cur, "AS005-08"), writeData("AS005-08","OH1",#state2), jump.
registerOrigScene('AS017-01', (scene) => {
  dropNote(scene);
  scene.state.set('REELING', 'ask', 'AS004-02');
  const chars = scene.ctx.s.chars;
  if (chars.CH1.screen === 'AS017-01' && chars.CH2.screen === 'AS017-01' && scene.stage.has(12)) scene.sprite(12).blend = 100;
  if (!scene.stage.has(13)) return;
  const hs = scene.sprite(13);
  const passiv = () => scene.state.get('HS1') === 'passiv';
  hs.hot = true;
  hs.cursor = passiv() ? 'make' : 'walk';
  scene.off(13);
  scene.on(13, 'mouseUp', () => {
    if (passiv() || scene.busy || scene.hand) return;
    scene.state.set('OH1', 'state2', 'AS005-08');
    scene.goto('AS005-08');
  });
});

// ------------------------------------------------------------------ AS017-02
// prepareMovie: CH1 + CH2 -> AS017-02. startMovie: characterTalk("Story",100,0) with Wait cursor;
// ESC / Space stop it. Sprite 19 "Hotspot zu Chapter-2": #look; mouseUp -> playSmacker("Reparatur")
// -> Chapter-2 (CH1/CH2 -> AS020-01, inventories cleared; app.startChapter).
registerOrigScene('AS017-02', (scene) => {
  dropNote(scene);
  const chars = scene.ctx.s.chars;
  chars.CH1.screen = 'AS017-02';
  chars.CH2.screen = 'AS017-02';
  scene.sync();
  let alive = true;
  let leaving = false;
  const onKey = (e: KeyboardEvent) => {
    if ((e.key === 'Escape' || e.key === ' ') && scene.talking) {
      e.preventDefault();
      scene.stopTalk();
    }
  };
  window.addEventListener('keydown', onKey);
  void scene.talk('Story', { speaker: '' });
  if (scene.stage.has(19)) {
    const hs = scene.sprite(19);
    hs.hot = true;
    hs.cursor = 'look';
    scene.off(19);
    scene.on(19, 'mouseUp', async () => {
      if (leaving || scene.busy || scene.hand) return;
      leaving = true;
      await scene.playSmacker('Reparatur');
      if (alive) await startChapter(2);
    });
  }
  return () => {
    alive = false;
    window.removeEventListener('keydown', onKey);
  };
});

// ------------------------------------------------------------------ AS019-01
// Boot I (11): every 60 ms locH+1, >850 -> -50.  Boot II (12): locH-1, < -50 -> 850.
// Leuchtfeuer (17): reads AS005-11.OH1 every 40 ms; state2 -> Lampe-2, 1 s, Lampe-3..6 (40 ms), 2 s, again.
registerOrigScene('AS019-01', (scene) => {
  dropNote(scene);
  const boats: [number, number][] = [[11, 1], [12, -1]];
  for (const [ch, d] of boats) {
    if (!scene.stage.has(ch)) continue;
    const sp = scene.sprite(ch);
    let t = performance.now();
    scene.onTick((now) => {
      if (now < t + 60 || !scene.stage.has(ch) || scene.frame !== 1) return;
      let x = sp.locH + d;
      if (d > 0 && x > 850) x = -50;
      if (d < 0 && x < -50) x = 850;
      sp.setLoc(x, sp.locV);
      t = now;
    });
  }
  if (scene.stage.has(17)) {
    const sp = scene.sprite(17);
    let mode: 'stopped' | 'switchOn' | 'glimmOut' = 'stopped';
    let frame = 1, timer = 0, upd = 0;
    scene.onTick((now) => {
      if (now < upd || scene.frame !== 1) return;
      upd = now + 40;
      const sw = scene.state.get('OH1', 'AS005-11');
      if (mode === 'switchOn' && sw !== 'state2') mode = 'stopped';
      if (mode === 'stopped' && sw === 'state2') mode = 'switchOn';
      if (mode === 'stopped') return;
      if (mode === 'switchOn') {
        if (now < timer) return;
        sp.setMember('Lampe-2');
        frame = 2;
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
});
