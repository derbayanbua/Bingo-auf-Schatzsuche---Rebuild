// AS004-02 Hafenkneipe – local Lingo: Musicbox (3), Arnold (4), Alfred (5), Reeling (6).
// AS004-01 (vor der Kneipe) has no local logic: door (Two-State), hotspots and Hotspot-SP are generic.
// Keys/Schlüsselbrett OS33/OS34 are generic "Inventar im Adventurescreen" items.

import { registerOrigScene, type OrigScene } from '../sceneView';
import { inventarSound, markPorted, placeCharacter, returnHand, showInventar } from './ch1util';

const MUSICBOX = 12;
const ARNOLD = 35, ARNOLD_MOUTH = 18;
const REELING = 36, REELING_MOUTH = 26;
const ALFRED = 37, ALFRED_MOUTH = 32;

registerOrigScene('AS004-02', (scene: OrigScene) => {
  markPorted(scene);
  const s = scene.ctx.s;
  const get = (k: string) => (scene.state.get(k) ?? '').toLowerCase();

  // mouseWithin cursors: #talk unless voice runs (#make); Arnold #make while ARNOLD = none
  const talkCursor = (ch: number, enabled: () => boolean) => {
    scene.sprite(ch).cursor = 'talk';
    scene.on(ch, 'mouseWithin', (sp) => {
      sp.cursor = scene.talking || !enabled() ? 'make' : 'talk';
      scene.stage.updateCursor();
    });
  };

  // ---- Musicbox: coin (OI007) -> video "Hafenkneipe"
  scene.off(MUSICBOX);
  scene.sprite(MUSICBOX).cursor = 'make';
  scene.on(MUSICBOX, 'mouseUp', () => {
    if (scene.busy) return;
    if (scene.hand !== 'OI007') {
      if (scene.hand) returnHand();
      return;
    }
    scene.consumeHand(); // #stayHere: the coin is spent
    inventarSound('OI007');
    showInventar();
    void scene.playSmacker('Hafenkneipe');
  });

  // ---- Arnold (CH7): ask -> waitForPower -> (OI014 Power-Riegel) gotPower
  talkCursor(ARNOLD, () => get('ARNOLD') !== 'none');
  scene.on(ARNOLD, 'mouseUp', () => {
    if (scene.busy) return;
    void (async () => {
      const st = get('ARNOLD');
      const hand = scene.hand;
      const askPower = async () => {
        await scene.playerTalk(2);
        await scene.talk('ArnoldTalk-1', { mouthCh: ARNOLD_MOUTH, block: false });
        scene.state.set('ARNOLD', 'waitForPower');
      };
      if (st === 'ask' && !hand) return askPower();
      if (st === 'waitforpower') {
        if (hand) {
          if (hand === 'OI014') {
            await scene.block(async () => {
              placeCharacter(s, 'CH7', 'SP018'); // Arnold walks to the lighthouse board
              scene.state.set('GITTER', 'opened', 'AS005-05');
              scene.state.set('HS4', 'activ', 'AS005-05');
              scene.state.set('ARNOLD', 'gotPower');
              scene.consumeHand(); // #stayHere: the bar is eaten
              inventarSound('OI014');
              showInventar();
              await scene.talk('ArnoldTalk-2', { mouthCh: ARNOLD_MOUTH, block: false });
            });
            await scene.playSmacker('Gitter');
            return;
          }
          // original: any other item -> no reaction; it goes back to the pocket
          // [Prüfung erforderlich] (original keeps it in the hand until dropped elsewhere)
          returnHand();
          return;
        }
        return askPower();
      }
      if (st === 'gotpower') {
        if (!hand) void scene.talk('ArnoldTalk-3', { mouthCh: ARNOLD_MOUTH, block: false });
        else returnHand();
        return;
      }
      if (hand) returnHand();
    })();
  });

  // ---- Alfred (CH4): Muschel OI025 -> Schrankschlüssel OI068
  talkCursor(ALFRED, () => true);
  scene.on(ALFRED, 'mouseUp', () => {
    if (scene.busy) return;
    const hand = scene.hand;
    if (hand === 'OI025') {
      scene.consumeHand();
      inventarSound('OI025');
      placeCharacter(s, 'CH4', 'SP018');
      void scene.block(async () => {
        await scene.talk('AlfredTalk-2', { mouthCh: ALFRED_MOUTH, block: false });
        // setInventar(cc, getFreeInventar(cc), "OI068") – the shell slot just became free
        scene.ctx.give('OI068');
        inventarSound('OI068');
        showInventar();
      });
      return;
    }
    if (hand) {
      returnHand();
      return;
    }
    if (scene.talking) return; // cursor would be #make
    void scene.talk('AlfredTalk-1', { mouthCh: ALFRED_MOUTH, block: false });
  });

  // ---- Reeling: callBanana -> ask (AS017-01) -> waitForJuice -> (OI013) gotJuice -> Chaos -> AS017-02
  talkCursor(REELING, () => true);
  scene.on(REELING, 'mouseUp', () => {
    if (scene.busy) return;
    void (async () => {
      const hand = scene.hand;
      if (get('REELING') === 'waitforjuice' && hand === 'OI013') {
        scene.state.set('REELING', 'gotJuice');
        scene.consumeHand();
        inventarSound('OI013');
        showInventar();
        await scene.talk('ReelingTalk-3', { mouthCh: REELING_MOUTH });
        // playSmacker("Chaos", 1) + gTargetMovie AS017-02 (setCharacterScreen is done by AS017-02)
        await scene.playSmacker('Chaos');
        if (scene.alive) scene.goto('AS017-02');
        return;
      }
      if (scene.talking) return;
      const st = get('REELING');
      if (st === 'callbanana') {
        if (!hand) void scene.talk('ReelingTalk-1', { mouthCh: REELING_MOUTH, block: false });
        else returnHand();
        return;
      }
      if ((st === 'ask' || st === 'waitforjuice') && !hand) {
        if (st === 'ask') scene.state.set('REELING', 'waitForJuice');
        await scene.playerTalk(1);
        void scene.talk('ReelingTalk-2', { mouthCh: REELING_MOUTH, block: false });
        return;
      }
      if (hand) returnHand();
    })();
  });
});
