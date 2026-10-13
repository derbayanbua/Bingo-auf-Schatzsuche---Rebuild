# `src/orig` – runtime for the original assets (private use)

Everything here is optional: without `public/orig/` all functions are silent no-ops
(`false` / immediate resolve) and the game uses its own vector art + synth sounds.

| File | Purpose |
|---|---|
| `assets.ts` | manifest + audio index (`loadOriginalAssets`, `hasOriginals`, `soundUrl`, `soundKey`, `videoUrl`, `musicUrl`) |
| `gfx.ts` | bitmap index, `movieDir('AS001-01') → 'Adventure_AS001-01'`, cursors, item icons |
| `stage.ts` | Director-like sprite stage (`loadMovie`, `Movie`, `Stage`, `Sprite`) |
| `score.ts` | `ScorePlayer`: frames/labels, play the score, frame hooks, puppet sprites |
| `sound.ts` | channels: music (1), ambient (2/3), voice (4), effects (5–8) |
| `voice.ts` | `talk()` = characterTalk with mouth animation + subtitles (`audio/transcripts.json`) |
| `media.ts` | `playSmacker(name)` video overlay |
| `movieAudio.ts` | Music/Ambient Controller of a movie → `applyMovieAudio(id)` |
| `screens.ts` | Chapter cards, Intro movie, main-menu voice, `startChapter(n)` |
| `sceneView.ts` | original AS/GS scene on top of the generic engine + `registerOrigScene` |

## Porting a scene (`src/orig/scenes/<ID>.ts`)

```ts
import { registerOrigScene } from '../sceneView';

registerOrigScene('AS004-02', (scene) => {
  scene.off(20);                                   // replace generic click handling of channel 20
  scene.on(20, 'mouseUp', async () => {
    if (scene.busy || scene.hand) return;          // Wait cursor / item in hand
    await scene.talk('ArnoldTalk-1', { mouthCh: 47 });   // blocks input while talking (block:false to not)
    await scene.playerTalk(3);                     // BingoTalk-3 / PuckTalk-3, mouth 54 / 65
    scene.sound('Global-Unlock', 100);             // quickSound
    scene.state.set('OS20', 'passiv');             // writeData (persists)
    scene.sync();
  });
  return () => { /* optional cleanup on leave */ };
});
```
Files in `src/orig/scenes/` are imported automatically (`scenes/index.ts` uses `import.meta.glob`) – no list to edit.

### `OrigScene` API (see `sceneView.ts`)
* Sprites: `sprite(ch)`, `member(name)`, `on(ch, ev, fn)`, `off(ch)`, `playSequence(ch, 'Base-1', 'Base-9', fps, {loop, pendulum})`,
  `onTick(fn)`, `wait(ms)`, `stage`, `movie`, `el`.
* State/engine: `state.get/set(key, value, screen?)`, `hand`, `consumeHand()`, `object(key)`, `channelOf(key)`, `sync()`,
  `goto('AS004-01')`, `gotoBoard('SP004', pos, dir)`, `say(text)` (toast; prefer `talk`).
* Voice: `talk(member, {mouthCh?, mouthFrames?, speaker?, mixing?, block? = true})` → Promise (end of line);
  `playerTalk(n, opts)`; `stopTalk()`; `talking` (= soundBusy(4)). Speaker defaults to the `<Name>Talk-n` prefix.
  Subtitles come from `transcripts.json` (`"<Cast>/<Member>"`), missing keys → no bubble; global on/off in Einstellungen.
* Effects: `sound(member, vol = 100)` (quickSound, max 4 parallel, searched through the movie's casts; `"Cast/Name"` forces a cast).
* Video: `playSmacker(name, {skippable})` – blocks input, restarts the scene's music/ambience afterwards. `restartAudio()`.
* Blocking: `busy` (app busy or scene Wait), `block(promiseOrFn)` runs something with the Wait cursor.
* Frames: `frame`, `gotoFrame(n | 'Box' | 'Screen')` (applies that frame's score sprites; channels missing there are removed,
  generic behaviours are re-attached per sprite span), `play({from, to, fps = 15, loop})`, `onEnterFrame(fn)`,
  `onExitFrame(fn)` (a returned Promise pauses `play`), `puppet(ch, on)` (score no longer touches the channel), `player`.
  Note: engine objects (clicks/visibility of items, SVG layer, a11y buttons) are only active on frame 1.

### Generic behaviours handled automatically
Two-State Handling + Two-State Audio (forward/backward/state1/state2/blocked, Blocker → `Global-Unlock`),
Two-State Animation (incl. pendulum sounds, e.g. AS001-01 clock `Tick-1/2`), One-State Handling + One-State Audio,
Mouse Audio, Random Audio, Visible Audio (only when `pSound` resolves to a name – sound members are not in the gfx index),
Random Two-State Animation, Animation Random Visible, Animation Random-Delay Factor-Play, Character Visibility,
Music/Ambient Controller (on mount). Item pickup/drop plays `OIxxx-Sound` (app.ts).

## Other entry points
* `playSmacker(name, {skippable = true, fadeMs})` (`media.ts`): overlay, Space/Esc/Enter/click skip, play button if autoplay is blocked.
* `talk(member, {movie, mouth?: {stage, ch, frames, show}, speaker, host, mixing})`, `stopTalk()`, `setSubtitles()`, `subtitleFor()` (`voice.ts`).
* `playVoice / playEffect / playEffectLoop / setAmbient / playMusic / stopMusic / fadeOutAll / setVolumes / unlock` (`sound.ts`).
* `applyMovieAudio('SP004' | 'AS001-01' | 'Main' | 'Exchange' | 'Chapter-1' …)` (`movieAudio.ts`).
* `startChapter(2)` (`screens.ts`): chapter card, CH1+CH2 → AS020-01 with empty inventories (coins/jokes stay). The
  Reparatur video is played by the AS017-02 port *before* calling it. `chapterScreen(host, n, onNext)`, `introScreen(host)`,
  `menuGreeting()`, `menuButtonTalk(n)`.
* Board/UI effects (`ui/audio.ts` `sfx.*`): `shake` Becher, `roll` Wurf, `step(g)` Stone/Sand/Dirt/Grass-1..3, `turn(g)` -T,
  `obstacle(open, board)` Blocker-1/2, `button` Splash, `item(id)` OIxxx-Sound – originals first, synth fallback.

## Caveats
* Audio needs a user gesture (iOS/Chrome): `unlock()` runs on every pointerdown/keydown in `app.ts`; voice lines started
  before that resolve immediately (silently), ambience waits for the unlock.
* Animations use the stage clock (requestAnimationFrame) – they pause in background tabs.
