// Chapter 3 (part B) adventure screens – Local Lingo ports:
//   AS042-01 Kartenverkäufer, AS044-01 Eingeborenen-Dorf (Tanz, local Hotspot-GS), AS044-02..04
//   (generic only), AS045-01/02 Wasserfall / Geheimgang (generic + Movie-Loop), AS050-01 Vorraum.
// The local "enterFrame _ exitFrame" scripts with the autopilot calls are not used by the score
// (CH1_SPEC 0.1). prepareMovie = showInventar() everywhere (the app refreshes the HUD on mount).

import { registerOrigScene } from '../sceneView';
import { markPorted, movieLoops } from './ch3b-util';
import { playInventarSound } from '../sound';

// ------------------------------------------------------------------ AS042-01
// prepareMovie: showInventar(); if getCoins() = 0 then addCoins(1).
// Sprite 21 "Kartenverkäufer" (Hotspot Talk): cursor #talk (#make while soundBusy(4));
// mouseUp with an item in the hand: OI007 (Münze) -> if sprite(15).blend = 0 (ticket OS15 not shown)
// #stayHere + OS15 #activ + inventarSound("OI065"), else #aboutToReturn; OI065 -> #stayHere
// (the ticket is taken back); other items: nothing. Without item (and voice free):
// characterTalk("EingeborenerTalk-1", 100, 12).
registerOrigScene('AS042-01', (scene) => {
  markPorted(scene);
  movieLoops(scene);
  const c = scene.ctx.s.chars[scene.ctx.ch];
  if (c.coins === 0) scene.ctx.addCoins(1);
  const TICKET = 15, TALK = 21;
  if (!scene.stage.has(TALK)) return;
  const sp = scene.sprite(TALK);
  scene.off(TALK);
  sp.hot = true;
  sp.cursor = 'talk';
  scene.on(TALK, 'mouseWithin', () => {
    sp.cursor = scene.hand ? null : scene.talking ? 'make' : 'talk';
  });
  scene.on(TALK, 'mouseUp', () => {
    if (scene.busy) return;
    const hand = scene.hand;
    if (hand) {
      if (hand === 'OI007') {
        const st = (scene.state.get(`OS${TICKET}`) ?? 'activ').toLowerCase();
        const shown = st === 'activ' || st === 'locked';
        if (!shown) {
          scene.consumeHand();
          scene.state.set(`OS${TICKET}`, 'activ');
          void playInventarSound('OI065');
          scene.sync();
        } else scene.returnHand();
      } else if (hand === 'OI065') scene.consumeHand();
      return;
    }
    if (scene.talking) return;
    void scene.talk('EingeborenerTalk-1', { mouthCh: 12, block: false });
  });
});

// ------------------------------------------------------------------ AS044-01
// Sprite 102 "Tanzen": #look; mouseUp -> playSmacker("Tanz") (screenChange 0: back to the scene).
// Sprite 22 local "Hotspot-GS" (pId 4): #talk cursor unless passiv / item in hand; mouseUp ->
// gJumpBackMovie = pNextDirectorMovie; startSoftware(Game\GS044-01) – unlike the shared Hotspot-GS
// WITHOUT setCharacterScreen (the character stays on AS044-01; GS044-01 returns via gGameBackMovie).
registerOrigScene('AS044-01', (scene) => {
  markPorted(scene);
  movieLoops(scene);
  const DANCE = 102, CHIEF = 22;
  if (scene.stage.has(DANCE)) {
    const sp = scene.sprite(DANCE);
    scene.off(DANCE);
    sp.hot = true;
    sp.hitRect = true;
    sp.cursor = 'look';
    scene.on(DANCE, 'mouseUp', () => {
      if (scene.busy || scene.hand) return;
      void scene.playSmacker('Tanz');
    });
  }
  if (scene.stage.has(CHIEF)) {
    const sp = scene.sprite(CHIEF);
    const passiv = () => (scene.state.get('HS4') ?? 'activ').toLowerCase() === 'passiv';
    if (scene.state.get('HS4') === undefined) scene.state.set('HS4', 'activ'); // loadData: missing line -> activ
    scene.off(CHIEF);
    sp.hot = true;
    sp.hitRect = true;
    sp.cursor = 'talk';
    scene.on(CHIEF, 'mouseWithin', () => {
      sp.cursor = passiv() || scene.hand ? null : 'talk';
    });
    scene.on(CHIEF, 'mouseUp', () => {
      if (passiv() || scene.hand || scene.busy) return;
      scene.ctx.showScene('GS044-01');
    });
  }
});

// ------------------------------------------------------------------ Movie-Loops only
// AS045-01 Wasserfall-1 (sprite 11), AS050-01 Flammen (sprite 11). Everything else is generic.
for (const id of ['AS045-01', 'AS050-01']) {
  registerOrigScene(id, (scene) => {
    movieLoops(scene);
  });
}
