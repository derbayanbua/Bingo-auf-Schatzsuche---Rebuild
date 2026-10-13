// Chapter 3 – big tree (AS031-01..03) and desert with the vulture (AS033-01/02). Local Lingo of
// dec/Adventure/AS031-0x, AS033-0x.
//
// AS031-01 / AS031-02 prepareMovie: AS031-02.HS1 = passiv -> sprite 11 (rope ladder) visibility 0.
//   The ladder hangs down once the vulture got its water (AS033-02 writes AS031-01/02 HS1 = activ).
//   Items / exits are generic (OS12 Brett OI049, HS1/HS2, Hotspot-SP).
// AS031-03 Baumhaus: only generic behaviours (OS12 = Zünder OI055, HS0).
// AS033-01 enterFrame: PLAYER = firstEnter -> Wait, playerTalk(1); after it: PLAYER none,
//   characterTalk("GeierTalk-1", 100, 11). Local Hotspot-AS 12 (HS1) -> AS033-02 with #talk cursor,
//   blocked while passiv / voice busy / item in the hand.
// AS033-02 sprite 19 "Geier": voice busy -> nothing. AS031-02.HS1 passiv and OI071 (tin with water)
//   in the hand -> #stayHere, playerTalk(2) (Wait), playSmacker("Geier"), AS031-01/02 HS1 = activ.
//   Otherwise (#talk cursor = no item, HS1 passiv): playerTalk(1) (Wait), characterTalk("GeierTalk-1", 12).

import { registerOrigScene, type OrigScene } from '../sceneView';
import { markPorted, movieLoops } from './ch3a-util';

const passiv = (v: string | undefined) => (v ?? '').toLowerCase() === 'passiv';

function ladder(scene: OrigScene) {
  markPorted(scene);
  movieLoops(scene);
  if (passiv(scene.state.get('HS1', 'AS031-02')) && scene.stage.has(11)) scene.sprite(11).visible = false;
}
registerOrigScene('AS031-01', ladder);
registerOrigScene('AS031-02', ladder);
registerOrigScene('AS031-03', (scene) => {
  markPorted(scene);
  movieLoops(scene);
});

// ------------------------------------------------------------------ AS033-01
registerOrigScene('AS033-01', (scene) => {
  markPorted(scene);
  movieLoops(scene);
  if ((scene.state.get('PLAYER') ?? '').toLowerCase() === 'firstenter') {
    void (async () => {
      await scene.playerTalk(1); // setCursor(#Wait) until soundBusy(4) = 0
      if (!scene.alive) return;
      scene.state.set('PLAYER', 'none');
      void scene.talk('GeierTalk-1', { mouthCh: 11, block: false });
    })();
  }
  if (!scene.stage.has(12)) return;
  const hs = scene.sprite(12);
  scene.off(12);
  hs.hot = true;
  const blocked = () => passiv(scene.state.get('HS1')) || scene.talking || !!scene.hand;
  hs.cursor = 'talk';
  scene.on(12, 'mouseWithin', () => {
    hs.cursor = blocked() ? 'make' : 'talk';
    scene.stage.updateCursor();
  });
  scene.on(12, 'mouseUp', () => {
    if (blocked() || scene.busy) return;
    scene.goto('AS033-02');
  });
});

// ------------------------------------------------------------------ AS033-02
registerOrigScene('AS033-02', (scene) => {
  markPorted(scene);
  movieLoops(scene);
  if (!scene.stage.has(19)) return;
  const sp = scene.sprite(19);
  const ladderDown = () => !passiv(scene.state.get('HS1', 'AS031-02'));
  scene.off(19);
  sp.hot = true;
  const cursor = () => (scene.talking ? 'make' : ladderDown() ? 'make' : 'talk');
  sp.cursor = cursor();
  scene.on(19, 'mouseWithin', () => {
    sp.cursor = cursor();
    scene.stage.updateCursor();
  });
  scene.on(19, 'mouseUp', () => {
    if (scene.talking || scene.busy) return;
    if (!ladderDown() && scene.hand === 'OI071') {
      scene.consumeHand(); // #stayHere
      void scene.block(async () => {
        await scene.playerTalk(2, { block: false });
        if (!scene.alive) return;
        await scene.playSmacker('Geier');
        scene.state.set('HS1', 'activ', 'AS031-01');
        scene.state.set('HS1', 'activ', 'AS031-02');
        scene.sync();
      });
      return;
    }
    if (scene.hand || ladderDown()) return; // getCursor() <> #talk
    void (async () => {
      await scene.playerTalk(1);
      if (scene.alive) void scene.talk('GeierTalk-1', { mouthCh: 12, block: false });
    })();
  });
});
