// AS011-01 Strand (Muschel) and AS012-01 Strand mit Flaschenpost.

import { registerOrigScene } from '../sceneView';
import type { MemberRef } from '../stage';

// AS011-01 Muschel (sprite 12, after the item behaviour's mouseDown):
//   if sprite(110).blend = 100 then playerTalk(1)
//   setCharacterScreen(#CH4, "AS004-02"); setCharacterMode(#CH4, #stopped)
registerOrigScene('AS011-01', (scene) => {
  scene.on(12, 'mouseDown', () => {
    if (scene.busy) return;
    // [Prüfung erforderlich] the hand only becomes visible one frame after the pickup, so in the
    // original this line plays only when an item was already held while clicking the shell
    if (scene.hand) void scene.playerTalk(1, { block: false });
    const ch4 = scene.ctx.s.chars.CH4;
    ch4.screen = 'AS004-02'; // Alfred waits in the pub
    ch4.mode = 'stopped';
    scene.state.set('OS12', scene.state.get('OS12') ?? 'activ'); // persist
  });
  // note: the original Muschel script also reacts after the shell was taken (blend 0 stays
  // clickable); the stage does not hit-test hidden sprites, so this repeat trigger is not ported
});

// AS012-01 Flasche (sprite 11): Movie-Loop m3..m23 at 15 fps (#forward) + item OI032 + Flaschenpost
registerOrigScene('AS012-01', (scene) => {
  const sp = scene.sprite(11);
  const seq: MemberRef[] = [];
  for (let m = 3; m <= 23; m++) {
    const r = scene.movie.memberAt(1, m);
    if (r) seq.push(r);
  }
  let i = 0;
  let last = performance.now();
  const off = scene.onTick((now) => {
    if (now < last + 1000 / 15) return;
    i = (i + 1) % seq.length;
    if (seq[i]) sp.setMember(seq[i]);
    last = now;
  });
  scene.on(11, 'mouseDown', () => {
    if (scene.busy) return;
    if (scene.hand) void scene.playerTalk(1, { block: false }); // [Prüfung erforderlich] see AS011-01
  });
  return off;
});
