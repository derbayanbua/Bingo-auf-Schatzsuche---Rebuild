// Chapter 3 – Handelsplatz (AS035-01), Hängebrücke (AS038-01/02) and the well with the winch (AS039-01).
// Local Lingo of dec/Adventure/AS035-01, AS038-0x, AS039-01.
//
// AS035-01 Brunnen (sprites 11/12): visible only when AS035-01.WATER = activ (GS032-02). The field
//   default is "water,passiv" (lower case) – Lingo keys are case-insensitive (readCI/writeCI).
// AS038-01:
//   * Brett 1-3 (OS11..OS13, OI049/OI050/OI051) are generic "Inventar im Adventurescreen" places.
//     Local Hotspot-AS 24 (HS1 -> AS038-02) is visible only while none of sprites 11..13 is passiv.
//   * stopMovie: all three planks in (blend <> 0) -> member("SP038").line[15].item[4] = "SP038-14",
//     line[7].item[7] = "SP038-06", else "________" (board graph, see game/logic.pointNeighbours).
//   * Felsen (16): blend 100 while ROCK = activ.
//   * enterFrame: Zünder (OS17, OI055) and Dynamit (OS18, OI066) both placed while sprite 17 shows
//     Kasten-1 -> playSmacker("Sprengung"), OS17/OS18 passiv (blend 0), ROCK passiv,
//     SP038 line 18 item 10 = "AS045-02", CH1/CH2 in AS045-01 -> AS045-02, Felsen blend 0.
// AS038-02: only generic behaviours.
// AS039-01 Brunnen mit Winde:
//   * Kurbel (13) mouseUp while stopped: soundEffect(free channel, "Kurbel-Sound", 50); Winde lower ->
//     Kurbel backward + Winde #moveUp, upper -> forward + #moveDown. Every 40 ms Kurbel-1..10 (wraps);
//     Winde stopped -> sound fadeOut, Kurbel stopped.
//   * Winde (12) every 20 ms Winde-1..100 down / up; at the bottom: WATER activ and hook Haken-1 (dry
//     tin) -> Haken-2 (#tinwater) + "Ground-Water", else hook not empty -> "Ground-Dry".
//     sprite(11).locH = 400 - frame/3 (rope), sprite(15).locV = 220 + frame*3 (hook).
//   * Seil (11): bottom = sprite(15).top. Haken (15): locH = sprite(11).locH.
//   * Inventar (15), key OS15 empty/tindry/tinwater: mouseDown takes OI063 (dry) / OI071 (water) into
//     the hand; mouseUp with OI063/OI071 on the empty hook -> hangs it on (#stayHere).
//   * OS25 Brett OI051 is generic.

import { boardItemKey } from '../../game/logic';
import { registerOrigScene, type OrigScene } from '../sceneView';
import { playEffectLoop } from '../sound';
import { markPorted, memberNum, movieLoops, readCI } from './ch3a-util';

// ------------------------------------------------------------------ AS035-01
registerOrigScene('AS035-01', (scene) => {
  markPorted(scene);
  movieLoops(scene);
  const on = readCI(scene, 'WATER') === 'activ';
  for (const ch of [11, 12]) if (scene.stage.has(ch)) scene.sprite(ch).visible = on;
});

registerOrigScene('AS038-02', (scene) => {
  markPorted(scene);
  movieLoops(scene);
});

// ------------------------------------------------------------------ AS038-01
/** member("SP038").line[n].item[i] = v (board field override, saved in sceneState.SP038) */
function setBoardItem(scene: OrigScene, line: number, item: number, v: string) {
  const key = boardItemKey(line, item);
  if (scene.ctx.s.sceneState.SP038?.[key] !== v) scene.state.set(key, v, 'SP038');
}

registerOrigScene('AS038-01', (scene) => {
  markPorted(scene);
  movieLoops(scene);
  const s = scene.ctx.s;
  const st = (k: string) => (scene.state.get(k) ?? 'activ').toLowerCase();
  // Felsen
  if (scene.stage.has(16)) scene.sprite(16).blend = (scene.state.get('ROCK') ?? '').toLowerCase() === 'activ' ? 100 : 0;
  // local Hotspot-AS 24 (HS1): prepareFrame visibility
  const hs = scene.object('HS1');
  const prevVis = hs?.visible;
  const bridgeOK = () => st('OS11') !== 'passiv' && st('OS12') !== 'passiv' && st('OS13') !== 'passiv';
  if (hs) hs.visible = () => bridgeOK();
  // stopMovie: board graph of SP038 (kept up to date while the scene is open, so it is saved even
  // when the page is closed in here)
  const writeBridge = () => {
    const ok = bridgeOK();
    setBoardItem(scene, 15, 4, ok ? 'SP038-14' : '________');
    setBoardItem(scene, 7, 7, ok ? 'SP038-06' : '________');
  };
  let lastOK: boolean | null = null;
  let blasting = false;
  scene.onTick(() => {
    const ok = bridgeOK();
    if (ok !== lastOK) {
      lastOK = ok;
      writeBridge();
      scene.sync();
    }
    // enterFrame: Zünder + Dynamit placed
    if (blasting || !scene.stage.has(17) || !scene.stage.has(18)) return;
    if (scene.sprite(17).member?.name !== 'Kasten-1') return;
    if (st('OS17') !== 'activ' || st('OS18') !== 'activ' || scene.busy) return;
    blasting = true;
    void (async () => {
      // sprite(17).myMode = #forward (plunger) – runs behind the video, the sprite is hidden afterwards
      await scene.playSmacker('Sprengung');
      if (!scene.alive) return;
      scene.state.set('OS17', 'passiv');
      scene.state.set('OS18', 'passiv');
      scene.sprite(17).blend = 0;
      scene.sprite(18).blend = 0;
      scene.state.set('ROCK', 'passiv');
      setBoardItem(scene, 18, 10, 'AS045-02');
      if (s.chars.CH1.screen === 'AS045-01') s.chars.CH1.screen = 'AS045-02';
      if (s.chars.CH2.screen === 'AS045-01') s.chars.CH2.screen = 'AS045-02';
      if (scene.stage.has(16)) scene.sprite(16).blend = 0;
      scene.refresh();
      scene.sync();
    })();
  });
  return () => {
    writeBridge();
    if (hs) hs.visible = prevVis;
  };
});

// ------------------------------------------------------------------ AS039-01
registerOrigScene('AS039-01', (scene) => {
  markPorted(scene);
  movieLoops(scene);
  const has = (ch: number) => scene.stage.has(ch);
  if (!has(11) || !has(12) || !has(13) || !has(15)) return;
  const seil = scene.sprite(11), winde = scene.sprite(12), kurbelSp = scene.sprite(13), haken = scene.sprite(15);
  const seilTop = seil.top;
  const hookState = () => (scene.state.get('OS15') ?? 'empty').toLowerCase();
  const hookMember = () => (hookState() === 'tindry' ? 'Haken-1' : hookState() === 'tinwater' ? 'Haken-2' : 'Haken-0');
  haken.setMember(hookMember());

  let windeMode: 'stopped' | 'moveDown' | 'moveUp' = 'stopped';
  let windeState: 'upperPosition' | 'lowerPosition' = 'upperPosition';
  let kurbel: 'stopped' | 'forward' | 'backward' = 'stopped';
  let kurbelSound: (() => void) | null = null;

  // Kurbel
  scene.off(13);
  kurbelSp.hot = true;
  kurbelSp.cursor = 'make';
  scene.on(13, 'mouseUp', () => {
    if (kurbel !== 'stopped' || scene.busy) return;
    // soundEffect(myChannel, "Kurbel-Sound", 50) – looped here and faded when the winch stops
    if (!kurbelSound) kurbelSound = playEffectLoop(scene.movie.dir, 'Kurbel-Sound', 50);
    if (windeState === 'lowerPosition') {
      kurbel = 'backward';
      windeMode = 'moveUp';
    } else {
      kurbel = 'forward';
      windeMode = 'moveDown';
    }
  });
  let kNext = 0, wNext = 0;
  const layout = () => {
    // Seil.prepareFrame: bottom = sprite(15).top; Haken.prepareFrame: locH = sprite(11).locH
    haken.setLoc(seil.locH, haken.locV);
    seil.setRect(seil.left, seilTop, seil.w, Math.max(1, haken.top - seilTop));
  };
  scene.onTick((now) => {
    // 12 Winde (every 20 ms)
    if (now >= wNext) {
      wNext = now + 20;
      if (windeMode !== 'stopped') {
        let f = memberNum(winde)[1];
        if (windeMode === 'moveDown') {
          if (f < 100) {
            f++;
            winde.setMember(`Winde-${f}`);
          } else {
            windeMode = 'stopped';
            windeState = 'lowerPosition';
            if (readCI(scene, 'WATER', 'AS035-01') === 'activ') {
              if (haken.member?.name === 'Haken-1') {
                scene.state.set('OS15', 'tinwater');
                haken.setMember('Haken-2');
                void scene.sound('Ground-Water', 100);
              }
            } else if (haken.member?.name !== 'Haken-0') void scene.sound('Ground-Dry', 100);
          }
        } else if (f > 1) {
          f--;
          winde.setMember(`Winde-${f}`);
        } else {
          windeMode = 'stopped';
          windeState = 'upperPosition';
        }
        seil.setLoc(400 - Math.trunc(f / 3), seil.locV);
        haken.setLoc(haken.locH, 220 + f * 3);
      }
    }
    // 13 Kurbel (every 40 ms)
    if (now >= kNext) {
      kNext = now + 40;
      if (kurbel !== 'stopped') {
        if (windeMode === 'stopped') {
          kurbelSound?.(); // sound fadeOut
          kurbelSound = null;
          kurbel = 'stopped';
        }
        let f = memberNum(kurbelSp)[1];
        if (kurbel === 'forward') f = f + 1 === 11 ? 1 : f + 1;
        if (kurbel === 'backward') f = f - 1 === 0 ? 10 : f - 1;
        kurbelSp.setMember(`Kurbel-${f}`);
      }
    }
    layout();
  });

  // 15 Inventar (hook)
  scene.off(15);
  haken.hot = true;
  haken.hitRect = true;
  const sync = () => {
    const st = hookState();
    if (haken.member?.name !== hookMember()) haken.setMember(hookMember());
    haken.cursor = st === 'empty' ? 'make' : 'take';
    haken.props.pickup = st !== 'empty';
    haken.props.sourceKey = 'OS15';
  };
  sync();
  scene.onTick(sync);
  scene.on(15, 'mouseUp', () => {
    if (scene.busy) return;
    const hand = scene.hand;
    if (!hand) {
      // Inventar.mouseDown (taken on the release like the app's other item places, so a press can be
      // dragged; in Lingo the hand only shows one frame later, so the same click's mouseUp is a no-op)
      const st = hookState();
      if (st !== 'tindry' && st !== 'tinwater') return;
      scene.state.set('OS15', 'empty');
      haken.setMember('Haken-0');
      // #returnToSource: back onto the hook (mySourceSprite 15)
      scene.putInHand(st === 'tindry' ? 'OI063' : 'OI071', { key: 'OS15', value: st });
      return;
    }
    if (hookState() !== 'empty') return;
    if (hand === 'OI063' || hand === 'OI071') {
      scene.state.set('OS15', hand === 'OI063' ? 'tindry' : 'tinwater');
      scene.consumeHand(); // #stayHere
      sync();
      return;
    }
    scene.returnHand(); // #aboutToReturn
  });
  return () => kurbelSound?.();
});
