// Ending: AS050-02 (Story, inventories cleared, Heimfahrt), AS050-05 (Schatzkiste), AS050-07 (Gold,
// Pirat), AS050-10/11/12 (Schluss-Story) and AS060-01 (Abspann) – Local Lingo ports.
// characterTalk("Story", 100, 0) never sets the Wait cursor: the hotspots stay usable while the story
// runs (as in the original). CuePassed handlers use the cue points of the Story members (ch3b-util).

import { registerOrigScene, type OrigScene } from '../sceneView';
import { musicUrl } from '../assets';
import { getVolumes } from '../sound';
import { cueTalk, markPorted, mouth, movieLoops, twoStateAnim } from './ch3b-util';

/** prepareMovie: setCharacterScreen(#CH1/#CH2, id); showInventar() */
function bothHere(scene: OrigScene) {
  const chars = scene.ctx.s.chars;
  chars.CH1.screen = scene.id;
  chars.CH2.screen = scene.id;
  scene.refresh();
}

/** Hotspot-AS: setCharacterScreen(currentCharacter, target); [video]; jumpToCurrentCharacter() */
function hotspot(scene: OrigScene, chs: number[], target: string, video?: string) {
  let leaving = false;
  for (const ch of chs) {
    if (!scene.stage.has(ch)) continue;
    const sp = scene.sprite(ch);
    scene.off(ch);
    sp.hot = true;
    sp.cursor = 'walk';
    scene.on(ch, 'mouseUp', async () => {
      if (leaving || scene.busy || scene.hand) return;
      leaving = true;
      scene.ctx.s.chars[scene.ctx.ch].screen = target;
      if (video) await scene.playSmacker(video);
      if (scene.alive) scene.goto(target);
    });
  }
}

// ------------------------------------------------------------------ AS050-02
// prepareMovie: CH1/CH2 -> AS050-02, all six inventory slots "OI000". startMovie: Story; cue "Bingo"
// -> sprite(54).myTalkMode = #talk. Hotspot-AS 14/15 (pId 0, local): setCharacterScreen(cur,
// "AS050-05"), playSmacker("Heimfahrt", 1), jumpToCurrentCharacter().
registerOrigScene('AS050-02', (scene) => {
  markPorted(scene);
  const chars = scene.ctx.s.chars;
  for (const c of ['CH1', 'CH2'] as const) chars[c].inventory = ['OI000', 'OI000', 'OI000'];
  bothHere(scene);
  movieLoops(scene);
  const m54 = mouth(scene, 54);
  void cueTalk(scene, 'Story', (n) => {
    if (n === 'Bingo') m54.mode = 'talk';
  });
  hotspot(scene, [14, 15], 'AS050-05', 'Heimfahrt');
});

// ------------------------------------------------------------------ AS050-05
// prepareMovie: CH1/CH2 -> AS050-05. Schatzkiste (sprite 20, Two-State Animation #stopped):
// #state1: #look, mouseUp -> #forward + characterTalk("Story") + Wait cursor until #state2 and the
// voice channel is free; #state2: #take, mouseUp -> AS050-07 (gTargetMovie only).
registerOrigScene('AS050-05', (scene) => {
  markPorted(scene);
  bothHere(scene);
  movieLoops(scene);
  const CHEST = 20;
  if (!scene.stage.has(CHEST)) return;
  const chest = twoStateAnim(scene, CHEST);
  const sp = scene.sprite(CHEST);
  scene.off(CHEST);
  sp.hot = true;
  sp.cursor = 'look';
  let opening = false;
  let leaving = false;
  scene.on(CHEST, 'mouseWithin', () => {
    sp.cursor = scene.hand ? null : chest.state === 'state1' ? 'look' : 'take';
  });
  scene.on(CHEST, 'mouseUp', () => {
    if (scene.busy || scene.hand || opening || leaving) return;
    if (chest.state === 'state1') {
      opening = true;
      chest.forward();
      const talk = scene.talk('Story', { speaker: '', block: false });
      void scene.block(Promise.all([chest.done(), talk]).then(() => undefined)).then(() => {
        opening = false;
        sp.cursor = 'take';
      });
      return;
    }
    leaving = true;
    scene.goto('AS050-07');
  });
});

// ------------------------------------------------------------------ AS050-07
// prepareMovie: CH1/CH2 -> AS050-07; startMovie: Story with cues: "Bingo" -> 13 #talk + blend 100;
// "Puck" -> 14 #forward; "Arnold" -> 15 #forward; "Gold" -> 11 #forward + 13 blend 0;
// "Gold Stop" -> 11 #backward; "Arnold Stop" -> 15 #backward; every cue except "Bingo" ends with
// 13 #stopped. Hotspot-AS 16/17 (HS1) -> AS050-10, the local framescript plays "Pirat" first.
registerOrigScene('AS050-07', (scene) => {
  markPorted(scene);
  bothHere(scene);
  movieLoops(scene);
  const m13 = mouth(scene, 13);
  const a11 = twoStateAnim(scene, 11), a14 = twoStateAnim(scene, 14), a15 = twoStateAnim(scene, 15);
  const blend = (ch: number, b: number) => scene.stage.has(ch) && (scene.sprite(ch).blend = b);
  void cueTalk(scene, 'Story', (n) => {
    if (n === 'Bingo') {
      m13.mode = 'talk';
      blend(13, 100);
      return;
    }
    if (n === 'Puck') a14.forward();
    if (n === 'Arnold') a15.forward();
    if (n === 'Gold') {
      a11.forward();
      blend(13, 0);
    }
    if (n === 'Gold Stop') a11.backward();
    if (n === 'Arnold Stop') a15.backward();
    m13.mode = 'stopped';
  });
  hotspot(scene, [16, 17], 'AS050-10', 'Pirat');
});

// ------------------------------------------------------------------ AS050-10 / AS050-11
// prepareMovie: CH1/CH2 -> here; startMovie: Story. Hotspot-AS HS1 (generic) -> AS050-11 / AS050-12.
for (const id of ['AS050-10', 'AS050-11']) {
  registerOrigScene(id, (scene) => {
    markPorted(scene);
    bothHere(scene);
    movieLoops(scene);
    void scene.talk('Story', { speaker: '', block: false });
  });
}

// ------------------------------------------------------------------ AS050-12
// prepareMovie: CH1/CH2 -> AS050-12; startMovie: Story with cues "Bingo" (13 talk, 15 stopped),
// "Puck" (13 stopped, 15 talk), "Both" (12 + 17 #forward, 13 + 15 talk), others: both stopped.
// enterFrame: soundBusy(4) = 0 -> AS060-01 (gTargetMovie only).
registerOrigScene('AS050-12', (scene) => {
  markPorted(scene);
  bothHere(scene);
  movieLoops(scene);
  const m13 = mouth(scene, 13), m15 = mouth(scene, 15);
  const a12 = twoStateAnim(scene, 12), a17 = twoStateAnim(scene, 17);
  void cueTalk(scene, 'Story', (n) => {
    if (n === 'Bingo') {
      m13.mode = 'talk';
      m15.mode = 'stopped';
    } else if (n === 'Puck') {
      m13.mode = 'stopped';
      m15.mode = 'talk';
    } else if (n === 'Both') {
      a12.forward();
      a17.forward();
      m13.mode = 'talk';
      m15.mode = 'talk';
    } else {
      m13.mode = 'stopped';
      m15.mode = 'stopped';
    }
  }).then(() => {
    if (scene.alive) scene.ctx.showScene('AS060-01');
  });
});

// ------------------------------------------------------------------ AS060-01
// prepareMovie: CH1/CH2 -> AS060-01. Framescript (every 40 ms): Credit sprite 11 fades in (+5),
// stays 5 s, fades out (-5), 2 s pause, next member Credit-2..20; after Credit-3 has faded out the
// external file "Outtake" starts on sound channel 4 (voice volume). After Credit-20 the logos 21, 22,
// 23 fade in one after the other (+5). Then the movie stays on its frame.
// Web: afterwards the game is marked as finished (sceneState AS060-01 DONE = yes) and the app returns
// to the main menu [Prüfung erforderlich: the original has no automatic exit; 5 s pause chosen].
registerOrigScene('AS060-01', (scene) => {
  markPorted(scene);
  bothHere(scene);
  const has = (ch: number) => scene.stage.has(ch);
  const sp = (ch: number) => scene.sprite(ch);
  let mode: 'fadeIn' | 'wait1' | 'wait2' | 'fadeOut' | 'logo1' | 'logo2' | 'logo3' | 'end' = 'fadeIn';
  let counter = 1;
  let timer = 0;
  let upd = 0;
  let outtake: HTMLAudioElement | null = null;
  let endAt = 0;
  const step = (now: number) => {
    const credit = has(11) ? sp(11) : null;
    if (!credit) return;
    if (mode === 'fadeIn') {
      if (credit.blend < 100) credit.blend = credit.blend + 5;
      else {
        timer = now + 5000;
        mode = 'wait1';
      }
    }
    if (mode === 'wait1') {
      if (now < timer) return;
      mode = 'fadeOut';
    }
    if (mode === 'wait2') {
      if (now < timer) return;
      mode = 'fadeIn';
    }
    if (mode === 'fadeOut') {
      if (credit.blend > 0) credit.blend = credit.blend - 5;
      else if (counter < 20) {
        if (counter === 3) startOuttake();
        counter++;
        const m = scene.member(`Credit-${counter}`);
        if (m) credit.setMember(m);
        timer = now + 2000;
        mode = 'wait2';
      } else mode = 'logo1';
    }
    for (const [lm, ch, nextMode] of [['logo1', 21, 'logo2'], ['logo2', 22, 'logo3'], ['logo3', 23, 'end']] as const) {
      if (mode !== lm) continue;
      if (has(ch) && sp(ch).blend < 100) sp(ch).blend = sp(ch).blend + 5;
      else mode = nextMode;
    }
  };
  // sound playFile 4, the moviePath & "Outtake" (gVoiceVolume)
  const startOuttake = () => {
    scene.stopTalk();
    const url = musicUrl('Outtake');
    if (!url) return;
    outtake = new Audio(url);
    outtake.volume = Math.max(0, Math.min(1, getVolumes().voice / 255));
    void outtake.play().catch(() => undefined);
  };
  let done = false;
  scene.onTick((now) => {
    if (now >= upd) {
      upd = now + 40;
      step(now);
    }
    if (mode !== 'end' || done) return;
    if (!endAt) endAt = now + 5000;
    if (now < endAt) return;
    done = true;
    scene.state.set('DONE', 'yes');
    scene.toMainMenu();
  });
  return () => {
    outtake?.pause();
    outtake = null;
  };
});
