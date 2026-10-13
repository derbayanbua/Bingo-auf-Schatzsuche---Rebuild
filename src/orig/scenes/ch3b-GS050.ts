// GS050-01 "Buchstabenplatten" and GS050-02 "Zauberspruch" – Local Lingo ports.

import { registerOrigScene, type OrigScene } from '../sceneView';
import type { Sprite } from '../stage';
import { gameInterface } from './ch1util';
import { arrowKeys, inside, markPorted, mouth, movieLoops, random, rolloverFader, setRotation, twoStateAnim, voiceTracker } from './ch3b-util';

const RESULT = 'DIESUCHENACHDEMVERLORENENSCHATZ';

// ------------------------------------------------------------------ GS050-01
// Entered from AS050-01 (Hotspot-GS HS1); gGameBackMovie = "AS050-01"; no requirement.
// Bingo (61) / Puck (62): arrow keys turn (Stone-T) and jump one plate (frames 1..20, every 20 ms,
// 5 px per frame 7..17 + 1/6 px at frame 18, Stone-n at frame 16). checkPlate: plate 11 = start,
// plate 54 = goal -> playSmacker("Halle") -> GS050-02 (gTargetMovie only, no setCharacterScreen);
// plates 12..53 carry a letter (member Platte-n-<Buchstabe>): the next letter of field "result"
// ("DIESUCHENACHDEMVERLORENENSCHATZ") -> letter used up; else the plate sinks (#drawAway: up 60 px,
// locZ 9 = behind the background, 1 s, back 2 px / 40 ms) and the figure falls (blend -5 per frame).
// Original quirk ported: after the plate loop myWrongPlate is always 12 (i = 55), so the figure
// is reset as soon as plate 12 is idle, not when the sunken plate is back.
registerOrigScene('GS050-01', (scene) => {
  markPorted(scene);
  let stop: (() => void) | null = null;
  const ui = gameInterface(scene, {
    prefId: '',
    onBack: () => scene.goto('AS050-01'),
    onStart: () => {
      void scene.gotoFrame('Game').then((ok) => {
        if (!ok || !scene.alive) return;
        ui.setButton('Game-Stop');
        stop = plates(scene);
      });
    },
  });
  return () => {
    stop?.();
    ui.destroy();
  };
});

type PMode = 'stopped' | 'drawAway' | 'Wait' | 'movePlace';
type BMode = 'waitForKey' | 'waitForRelease' | 'Turn' | 'jump' | 'checkPlate' | 'fall' | 'Wait' | 'stopped';

function plates(scene: OrigScene): () => void {
  const offs: (() => void)[] = [];
  movieLoops(scene);
  const puck = scene.ctx.s.playerCharacter === 'Puck';
  const CH = puck ? 62 : 61;
  for (const ch of [61, 62]) if (scene.stage.has(ch)) scene.sprite(ch).visible = ch === CH;
  if (!scene.stage.has(CH)) return () => undefined;
  const me = scene.sprite(CH);
  const startLoc = { h: me.locH, v: me.locV };
  let result = RESULT; // member("Result").text, reset in prepareMovie
  const keys = arrowKeys(scene, 8, 316);
  offs.push(() => keys.destroy());

  // ---- plates (BehaviorScript 4), every 40 ms
  interface Plate { sp: Sprite; ch: number; mode: PMode; startV: number; timer: number; next: number }
  const plate = new Map<number, Plate>();
  for (let ch = 12; ch <= 53; ch++) {
    if (!scene.stage.has(ch)) continue;
    const sp = scene.sprite(ch);
    plate.set(ch, { sp, ch, mode: 'stopped', startV: sp.locV, timer: 0, next: 0 });
  }
  const updatePlate = (p: Plate, now: number) => {
    if (p.mode === 'drawAway') {
      p.sp.el.style.zIndex = '9';
      if (p.sp.locV > p.startV - 60) p.sp.setLoc(p.sp.locH, p.sp.locV - 10);
      else {
        p.mode = 'Wait';
        p.timer = now + 1000;
        bMode = 'fall'; // sprite(61).myMode = #fall; sprite(62).myMode = #fall
      }
    }
    if (p.mode === 'Wait' && now > p.timer) p.mode = 'movePlace';
    if (p.mode === 'movePlace') {
      if (p.sp.locV < p.startV) p.sp.setLoc(p.sp.locH, p.sp.locV + 2);
      else {
        p.mode = 'stopped';
        p.sp.el.style.zIndex = String(p.ch);
      }
    }
  };

  // ---- Bingo (BehaviorScript 3), exitFrame, myUpdateTime + 20 ms
  let bMode: BMode = 'waitForKey';
  let rotation = 0, target = 0;
  let turnDir: 'right' | 'left' | 'none' = 'none';
  let wrong = 0;
  let upd = 0;
  let leaving = false;
  const base = (me.member?.name ?? 'JmpBingo-1').split('-')[0];
  const frameNo = () => +((me.member?.name ?? '').split('-')[1] ?? 1);
  const dir = () => {
    const d = ((rotation % 360) + 360) % 360;
    return d === 0 ? 1 : d === 90 ? 2 : d === 180 ? 3 : 4;
  };
  const turnAndJump = (t: number) => {
    const cur = dir();
    const diff = Math.abs(t - cur);
    turnDir = 'none';
    let deg = diff === 0 ? 0 : 90;
    if (diff === 1) turnDir = t > cur ? 'right' : 'left';
    if (diff === 2) {
      turnDir = 'right';
      deg = 180;
    }
    if (diff === 3) turnDir = t > cur ? 'left' : 'right';
    if (diff) void scene.sound('Stone-T', 100);
    target = turnDir === 'right' ? rotation + deg : rotation - deg;
    bMode = 'Turn';
  };
  const move = (dh: number, dv: number) => {
    me.setLoc(me.locH + dh, me.locV + dv);
    setRotation(me, rotation);
  };

  const update = async (): Promise<boolean> => {
    let f: number | undefined;
    if (bMode === 'waitForKey') {
      if (keys.isDown(37)) turnAndJump(4);
      if (keys.isDown(39)) turnAndJump(2);
      if (keys.isDown(38)) turnAndJump(1);
      if (keys.isDown(40)) turnAndJump(3);
    }
    if (bMode === 'waitForRelease') {
      if (keys.isDown(37) || keys.isDown(38) || keys.isDown(39) || keys.isDown(40)) return false;
      bMode = 'waitForKey';
    }
    if (bMode === 'Turn') {
      if (rotation !== target) {
        rotation += turnDir === 'right' ? 30 : -30;
        setRotation(me, rotation);
      } else {
        if (rotation === -90) rotation = 270;
        bMode = 'jump';
      }
    }
    if (bMode === 'jump') {
      f = frameNo();
      if (f === 20) {
        me.setMember(`${base}-1`);
        setRotation(me, rotation);
        bMode = 'checkPlate';
        return false; // exit (no myUpdateTime)
      }
      f++;
      me.setMember(`${base}-${f}`);
      setRotation(me, rotation);
      const d = dir();
      if (f > 6 && f < 18) move(d === 2 ? 5 : d === 4 ? -5 : 0, d === 1 ? -5 : d === 3 ? 5 : 0);
      if (f === 18) move(d === 2 ? 6 : d === 4 ? -6 : 0, d === 1 ? -1 : d === 3 ? 1 : 0);
    }
    if (f === 16) void scene.sound(`Stone-${random(3)}`, 100);
    if (bMode === 'fall') {
      const fr = frameNo();
      if (fr === 20) {
        me.setMember(`${base}-1`);
        setRotation(me, rotation);
        bMode = 'Wait';
        return false;
      }
      me.blend = me.blend - 5;
      me.setMember(`${base}-${fr + 1}`);
      setRotation(me, rotation);
    }
    if (bMode === 'checkPlate') {
      let i = 11;
      for (; i <= 54; i++) {
        if (!scene.stage.has(i)) continue;
        if (!inside(me.locH, me.locV, scene.sprite(i).rect())) continue;
        if (i === 11) {
          bMode = 'waitForRelease';
          break;
        }
        if (i === 54) {
          // playSmacker("Halle", 1); gTargetMovie = GS050-02; gExitFlag = 1
          leaving = true;
          await scene.playSmacker('Halle');
          if (scene.alive) scene.ctx.showScene('GS050-02');
          return true;
        }
        const ch = (scene.sprite(i).member?.name ?? '').split('-')[2] ?? '';
        if (result.charAt(0) === ch) {
          result = result.slice(1);
          bMode = 'waitForRelease';
          break;
        }
        const p = plate.get(i);
        if (p) p.mode = 'drawAway';
        wrong = i;
      }
      if (i === 55) {
        bMode = 'fall';
        wrong = 12;
      }
    }
    if (bMode === 'Wait') {
      if ((plate.get(wrong)?.mode ?? 'stopped') === 'stopped') {
        me.setLoc(startLoc.h, startLoc.v);
        me.blend = 100;
        rotation = 0;
        setRotation(me, 0);
        result = RESULT;
        bMode = 'waitForRelease';
      }
    }
    return true;
  };

  let busy = false;
  offs.push(scene.onTick((now) => {
    if (!scene.alive || scene.frame < 15 || leaving) return;
    for (const p of plate.values()) {
      if (now < p.next) continue;
      p.next = now + 40;
      if (p.mode !== 'stopped') updatePlate(p, now);
    }
    if (busy || now < upd || bMode === 'stopped') return;
    busy = true;
    void update().then((setTime) => {
      busy = false;
      if (setTime) upd = performance.now() + 20;
    });
  }));
  return () => offs.forEach((o) => o());
}

// ------------------------------------------------------------------ GS050-02
// Shown after the Halle video (character screen stays GS050-01); gGameBackMovie = "AS050-01".
// Magic (40): beginSprite soundEffect(4,"Zauberspruch-1") + mouth 33/34; word buttons 12..25
// (Sprachtaster: newWord + playerTalk(word), mouth stopped). When the voice channel is free and more
// than 6 words were said: "1,1,4,5,13,14,3" -> Zauberspruch-3, Sperre (30) #forward (opens) – once;
// anything else -> Zauberspruch-2, Sperre #backward, words cleared. Hotspot-AS (40, HS1) is only
// visible while the Sperre is in #state2 -> both characters to AS050-02 (local framescript).
registerOrigScene('GS050-02', (scene) => {
  markPorted(scene);
  let stop: (() => void) | null = null;
  const ui = gameInterface(scene, {
    prefId: '',
    onBack: () => scene.goto('AS050-01'),
    onStart: () => {
      void scene.gotoFrame('Game').then((ok) => {
        if (!ok || !scene.alive) return;
        ui.setButton('Game-Stop');
        stop = spell(scene);
      });
    },
  });
  return () => {
    stop?.();
    ui.destroy();
  };
});

function spell(scene: OrigScene): () => void {
  const offs: (() => void)[] = [];
  const has = (ch: number) => scene.stage.has(ch);
  movieLoops(scene);
  // soundBusy(4): the voice starts asynchronously (loading) -> count the lines that have not ended yet
  const vt = voiceTracker(scene);
  const track = (p: Promise<void>) => void vt.track(p);
  const voiceBusy = vt.busy;
  const m = mouth(scene, 33, 34, voiceBusy);
  const gate = twoStateAnim(scene, 30);
  const RIGHT = '1,1,4,5,13,14,3';
  let words: number[] = [];
  let passTalk = false;
  const voice = (name: string) => {
    track(scene.talk(name, { speaker: '', block: false }));
    m.mode = 'talk';
  };
  voice('Zauberspruch-1');
  for (let ch = 12; ch <= 25; ch++) {
    if (!has(ch)) continue;
    rolloverFader(scene, ch);
    scene.sprite(ch).cursor = 'make';
    scene.on(ch, 'mouseDown', () => {
      if (scene.hand) return;
      const w = +((scene.sprite(ch).member?.name ?? '').split('-')[1] ?? 0);
      words.push(w); // sendSprite(40, #newWord, myWord)
      track(scene.playerTalk(w, { block: false }));
      m.mode = 'stopped';
    });
  }
  if (has(26)) scene.sprite(26).hot = false;
  // Hotspot AS050-02 (40)
  const HS = 40;
  let leaving = false;
  if (has(HS)) {
    const hs = scene.sprite(HS);
    scene.off(HS);
    hs.cursor = 'walk';
    hs.hitRect = true;
    scene.on(HS, 'mouseUp', () => {
      if (leaving || scene.busy || scene.hand || gate.state !== 'state2') return;
      leaving = true;
      const chars = scene.ctx.s.chars;
      chars[scene.ctx.ch].screen = 'AS050-02';
      chars.CH1.screen = 'AS050-02';
      chars.CH2.screen = 'AS050-02';
      scene.goto('AS050-02');
    });
    offs.push(scene.onTick(() => {
      hs.visible = gate.state === 'state2';
      hs.hot = hs.visible;
    }));
  }
  offs.push(scene.onTick(() => {
    if (voiceBusy()) return;
    if (words.length > 6) {
      if (words.join(',') === RIGHT) {
        if (passTalk) return;
        voice('Zauberspruch-3');
        gate.forward();
        passTalk = true;
      } else {
        voice('Zauberspruch-2');
        gate.backward();
        passTalk = false;
        words = [];
      }
    }
  }));
  return () => offs.forEach((o) => o());
}
