// GS005-05 – Taucher anziehen (Game\GS005-05, Local Lingo Scripts 2-20).
// Intro frame: slots OS101 OI021 / OS102 OI022 / OS103 OI023 + Taster Start/Back -> frame "Game" (15).
// Game: the clothes (ch 31-45) dress the player figure (Bingo 11-18 / Puck 21-28: +3 Back, +4 Eyes,
// +5 Head, +6 Nose, +7 ShoeR, +8 ShoeL). Correct equipment = Back-1, Eyes-2, Head-0, no nose, ShoeR-2,
// ShoeL-2 -> "<Player>Talk-6" + Taster "Game-Ready". Clicking Game-Ready -> video Schleuse-1 -> GS005-06;
// Game-Stop -> back to AS005-08.

import { registerOrigScene } from '../sceneView';
import { gameButton, hideGenericBack, prefSlots, rnd } from './gs005Common';

// script name -> [sound, [offset, member suffix][], clothTalk n (0 = none), laugher]
const CLOTHES: [RegExp, string, [number, string][], number, boolean][] = [
  [/^Taucherbrille/, 'Taucherbrille', [[4, 'Eyes-2']], 0, false],
  [/^Sauerstoff/, 'Sauerstoff', [[3, 'Back-1']], 0, false],
  [/^Topf/, 'Topf', [[5, 'Head-5']], 0, true],
  [/^Flossen/, 'Flossen', [[7, 'ShoeR-2'], [8, 'ShoeL-2']], 0, false],
  [/^Holz/, 'Holzschuhe', [[7, 'ShoeR-3'], [8, 'ShoeL-3']], 0, true],
  [/^Socken/, 'Socken', [[7, 'ShoeR-1'], [8, 'ShoeL-1']], 0, true],
  [/^Sonnenbrille/, 'Sonnenbrille', [[4, 'Eyes-1']], 5, true],
  [/^Fass/, 'Fass', [[3, 'Back-2']], 0, true],
  [/^Flaschen/, 'Flaschen', [[3, 'Back-3']], 0, true],
  // Hut + Mütze play the member "Mütze" (Mac-Roman name M\x9Ftze in the cast)
  [/^Hut/, 'M\\x9Ftze', [[5, 'Head-1']], 1, true],
  [/^Kelle/, 'Kelle', [[5, 'Head-3']], 0, true],
  [/^Klammer/, 'Klammer', [[6, 'Nose-1']], 2, true],
  [/^M.*tze/, 'M\\x9Ftze', [[5, 'Head-2']], 4, true],
  [/^Pfanne/, 'Pfanne', [[5, 'Head-4']], 0, true],
  [/^Punger/, 'Punger', [[6, 'Nose-2']], 3, true],
];

registerOrigScene('GS005-05', (scene) => {
  hideGenericBack(scene);
  const pc = scene.ctx.s.playerCharacter === 'Puck' ? 'Puck' : 'Bingo';
  const shift = pc === 'Puck' ? 20 : 10;
  const mouth = shift + 2;
  let alive = true;
  let leaving = false;

  const checkPrefs = prefSlots(scene);
  const btn = gameButton(scene, (m) => {
    if (leaving) return;
    if (m === 'Game-Start') void startGame();
    else if (m === 'Game-Back') scene.goto('AS005-08'); // Taster Start: gGameBackMovie
    else void exit(m === 'Game-Ready'); // Taster Stop -> gExitFlag -> local exitFrame
  });
  btn.set(checkPrefs() ? 'Game-Start' : 'Game-Back');
  scene.onTick(() => {
    if (scene.frame < 15) btn.set(checkPrefs() ? 'Game-Start' : 'Game-Back');
  });

  // laugher(): 1/3 chance "Lachen-1..4"
  const laugher = () => {
    if (rnd(1, 3) === 1) void scene.sound(`Lachen-${rnd(1, 4)}`, 100);
  };
  // clothTalk(n): puppetSound(4, "<Player>Talk-n"), mouth 12/22, no Wait cursor
  const clothTalk = (n: number) => void scene.talk(`${pc}Talk-${n}`, { mouthCh: mouth, speaker: pc, block: false });

  async function startGame() {
    await scene.gotoFrame('Game');
    if (!alive) return;
    // prepareMovie: only the player's figure is visible
    for (let i = 11; i <= 18; i++) if (scene.stage.has(i)) scene.sprite(i).visible = pc === 'Bingo';
    for (let i = 21; i <= 28; i++) if (scene.stage.has(i)) scene.sprite(i).visible = pc === 'Puck';
    btn.set('Game-Stop');
    // figure parts: Delete Script (Back/Eyes/Nose) -> blend 0, Reset Script (Head/Shoes) -> Base-0
    for (let i = shift + 1; i <= shift + 8; i++) {
      if (!scene.stage.has(i)) continue;
      const sp = scene.sprite(i);
      const b = sp.behaviors.map((x) => x.name).join(',');
      if (/Delete Script/.test(b)) {
        sp.hot = true;
        scene.on(i, 'mouseDown', () => !scene.busy && !scene.hand && (sp.blend = 0));
      } else if (/Reset Script/.test(b)) {
        sp.hot = true;
        scene.on(i, 'mouseDown', () => {
          if (scene.busy || scene.hand || !sp.member) return;
          sp.setMember(sp.member.name.replace(/-\d+$/, '-0'));
        });
      }
    }
    for (let ch = 31; ch <= 45; ch++) {
      if (!scene.stage.has(ch)) continue;
      const sp = scene.sprite(ch);
      const script = sp.behaviors.map((x) => x.name).find((n) => /Script$/.test(n)) ?? '';
      const c = CLOTHES.find(([re]) => re.test(script));
      if (!c) continue;
      const base = (sp.member?.name ?? '').replace(/-\d+$/, '');
      sp.hot = true;
      sp.cursor = 'make';
      scene.on(ch, 'mouseEnter', () => sp.setMember(`${base}-1`));
      scene.on(ch, 'mouseLeave', () => sp.setMember(`${base}-0`));
      scene.on(ch, 'mouseDown', () => {
        if (scene.busy || scene.hand) return;
        const [, snd, parts, talkN, laugh] = c;
        void scene.sound(snd, 100);
        if (talkN) clothTalk(talkN);
        if (laugh) laugher();
        for (const [off, suf] of parts) {
          const t = scene.sprite(shift + off);
          t.setMember(`${pc}${suf}`);
          t.blend = 100;
        }
      });
    }
    scene.sync();
  }

  // enterFrame of the Game frames: equipment check
  scene.onTick(() => {
    if (scene.frame < 15 || leaving) return;
    const s = (o: number) => scene.sprite(shift + o);
    const name = (o: number) => s(o).member?.name;
    const ok =
      name(3) === `${pc}Back-1` && s(3).blend > 0 &&
      name(4) === `${pc}Eyes-2` && s(4).blend > 0 &&
      name(5) === `${pc}Head-0` &&
      s(6).blend === 0 &&
      name(7) === `${pc}ShoeR-2` &&
      name(8) === `${pc}ShoeL-2`;
    if (ok && btn.member === 'Game-Stop') {
      void scene.talk(`${pc}Talk-6`, { mouthCh: mouth, speaker: pc, block: false });
      btn.set('Game-Ready');
    } else if (!ok) btn.set('Game-Stop');
  });

  async function exit(ready: boolean) {
    leaving = true;
    if (ready) {
      await scene.playSmacker('Schleuse-1');
      if (!alive) return;
      scene.goto('GS005-06');
    } else scene.goto('AS005-08');
  }

  return () => {
    alive = false;
  };
});
