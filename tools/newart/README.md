# `tools/newart` – „neue Grafik“ (own, publishable asset pack)

The game's sprite runtime (`src/orig/stage.ts`, `boardOrig.ts`, `sceneView.ts`, all ports in `src/orig/scenes`) draws
Director members by **cast dir + member number**. The new pack replaces every original bitmap 1:1 with own art:

```
public/assets/gfx/
  index.json                 same entries as the original export: {dir: {num: [w, h, regX, regY, name]}}
  score/<Dir>_<Movie>.json   runtime scores (positions/behaviours – layout data, no artwork)
  coverage.json              {dir: [members with new art, total]}  (written by `npm run art`)
  <Dir>_<Movie>/<num>.webp   one image per member, exactly w×h
```

Runtime (`src/orig/gfx.ts`): originals (`public/orig/gfx`, private) when installed **and** the setting
„Originalgrafik verwenden“ is on (default), else the new pack, else the old vector view.
Boards (`Landscape_SPxxx`), chapter cards and the intro use the sprite view only when their movie is **complete**
in the new pack (`hasMovieArt`); adventure/game scenes always run on the stage (missing art = placeholders).

## Commands

| Command | Purpose |
|---|---|
| `npm run art [-- <filter> …] [--force]` | render members (filter = substring of the dir, e.g. `AS004 GS005-0`); unchanged SVGs are skipped (hash cache `tools/.cache/`) |
| `npm run art:report [-- <filter>] [--all]` | coverage per movie; lists missing members (grouped `Base-1..n`) for the filter |
| `npm run art:sheet -- <dir> [regex]` | contact sheet of rendered members → `tools/.cache/newart-preview/` |
| `npm run art:frame -- <dir> [frame] [x,y,w,h]` | composes a score frame like the runtime (optional crop, 3×) – check alignment without the browser |
| `npx tsx tools/newart/preview.ts zoom <dir> <name or #num> [factor]` | one member enlarged, straight from the generator |
| `npm run art:typecheck` | type-check the tools |
| `npm run art:sync` | re-copy `index.json` + scores from an original export (only if `export_graphics.py` changes) |

Commit the rendered `public/assets/gfx/**` together with the generator code.

## Adding art for a movie

Create `tools/newart/scenes/<Dir>_<Movie>.ts` (exact dir name from `index.json`):

```ts
import { defineMovie } from '../lib/api';
import { doorFrames } from '../lib/house';
import { headline } from '../lib/ui';

export default defineMovie({
  Headline: (m, w, h) => headline('Hafenkneipe', w, h),
  Background: (m, w, h) => background(w, h),               // 800x448 scene
  'Door-*': (m, w, h) => doorFrames(m.frame!, 7, w, h),     // Door-1..7 (m.frame = trailing number)
  '#12': (m, w, h) => …,                                    // by member number (duplicate names, e.g. 4× "Drop")
  '*': (m, w, h) => …,                                      // fallback for all other members (return null = placeholder)
});
```

* Generator signature `(m: Member, w, h) => string | null`. `Member` = `{dir, num, name, w, h, regX, regY, base, frame}`.
  Return SVG markup in canvas pixels (0..w, 0..h) – it is wrapped into `<svg width=w height=h>` – or a full
  `<svg …>` document, or `null` (placeholder). Lookup order: `#num` > exact name > `Base-*` > `*`.
* **Never change sizes or registration points.** The runtime places a member at `loc - reg`; scores, hit tests
  (alpha > 24 = clickable) and part animations depend on them. Draw in loc coordinates with `atReg(m, body)`
  (0,0 = registration point) when parts must line up (characters, mouths, animation frames).
* Transparent pixels are click-through: keep clickable objects opaque, leave the rest transparent.
* Positions: read the score (`public/assets/gfx/score/<dir>.json`, sprites `[ch, castLib, member, left, top, w, h, ink, blend, behaviors, name]`;
  scene coordinates = stage y − 45) or `npm run art:frame`. Members drawn on top of the background (doors, windows,
  items, characters) must not be painted into the background a second time.
* Reference: the original images in `D:\Workspace_D\bingo\analysis\img\<dir>\` may be looked at **only for layout**
  (size, pose, what is depicted, which frame is open/closed). Never trace, sample or copy pixels; never embed them.
* Animation frames: derive the pose from `m.frame` (e.g. `t = (frame-1)/(n-1)`); frame 1 is usually the resting /
  closed state. Check the behaviour parameters in the score when unsure (pendulum, first/last member).
* Text in bitmaps (headlines, buttons, labels): German, fonts `'Baloo 2'` (head, 800) / `Nunito` (body) – they are
  bundled from `@expo-google-fonts/*` for rendering. Use `fitText`/`headline`/`pill` from `lib/ui.ts`.
* Character names in new texts: Bongo, Pucki, Käpt’n Reling, Alfons, Mats, Bert, Arno, Tom, Rocko
  (internal ids/member names stay Bingo/Puck/Reeling/Alfred/Magnus/Ben/Arnold/Tim/Rocco).
* Deterministic output: use `rng(seed)`/`blob(…, seed)` instead of `Math.random()` (otherwise every run re-renders).
* Ids inside one SVG must be unique (`defs`, patterns, clipPaths) – prefix them per member/frame.

## Library (`lib/`)

| Module | Contents |
|---|---|
| `api.ts` | `defineMovie`, `Member`, `atReg`, `membersOf(dir)`, `findMember(dir, name)`, `packIndex()` |
| `svg.ts` | palette `C`, `dk/lt/mix`, `rng`, element helpers (`rect, circle, ellipse, path, g, poly, line`), `fs/st` style shorthands, `linGrad/radGrad/defs`, `roundedPath`, `blob`, `svgDoc`, `fitBox` |
| `textures.ts` | patterns: `woodPattern`, `cobblePattern`, `grassPattern`, `sandPattern`, `dirtPattern`, `specklePattern`, `waterPattern`, `boardsPattern`; gradients `skyGrad`, `wallGrad`, `floorGrad`, `nightGrad` |
| `characters.ts` | **Bongo/Pucki kit** (front view, loc coords at 100 %): `bongo(k, pose)`, `pucki(k, pose)`, parts `bongoEyes/Lid/Mouth/ArmL/ArmR/Boots`, `puckiEyes/Lid/Mouth/ArmL/Curl/Shoes`, `characterMember(name, …)` for `Bingo<scale><Part>-n` / `Puck…` names, `figureSvg(who, w, h, pose)` |
| `npcs.ts` | NPC kit (front view, origin = feet): `npcFigure(id, {mouth 1..5, eyes, armL, armR})`, `npcEyes`, `npcMouth`, `npcBounds`, `npcFitted(id, w, h, pose)`; ids `Reeling Alfred Magnus Ben Arnold Tim Rocco` |
| `topdown.ts` | board figures: `jumpMember(id, frame, w, h, regX, regY, frame1)` (20-frame hop), `jumpState(f)`, `NPC` looks/names |
| `items.ts` | all inventory items: `itemArt(id, w, h)` (fitted), `itemShape(id)` (raw, −32..32 box – for bigger in-scene versions) |
| `ui.ts` | `headline`, `pill`, `fitText`, `textWidth`, `coinIcon`, `jokeCardIcon`, `star`, `boardPoint`, `moodBubble`, `dieFace`, `shaker`, `cursorArt`, `slotSocket`, `switchButton`, `arrowShape`, `roundArrow`, `gameButton`, `counterField` |
| `house.ts` | side-view scene parts: `doorFrames`, `windowFrames`, `outsideView`, `pendulum`, `wallBell`, `table`, `chair`, `picture` |
| `nature.ts` | top-down board parts: `treeTop`, `bush`, `flowers`, `rockTop`, `fern`, `palmTop`, `roofTop`, `fence`, `road`, `tufts` |
| `placeholder.ts`, `raster.ts` | placeholder art, SVG → webp (resvg + sharp; lossless unless big) |

Examples: `scenes/Adventure_AS001-01.ts` (interior, look of the approved „Stube“ design), `Adventure_AS001-02.ts`
(exterior), `Landscape_SP001.ts` (board: roads follow the point graph from `src/data/boards.json`),
`Interface_Main.ts` (menu movie, Bongo on the springboard), shared casts `Shared_*.ts`.

## Style guide (summary of the approved design)

* Flat vector, soft rounded shapes, **bold dark outlines** (≈4 px at 100 %, colour = darker shade of the fill or
  ink `#2a2140` for faces), little or no gradients (only sky/wall/floor), simple highlights (light stroke upper left)
  and flat shadows (black, 15–25 % opacity, falling to the lower right on boards).
* Warm island colours (`C` in `svg.ts`): wall `#ffe9a8`, wood `#b8682e/#8a5428`, floor `#c88a4a`, sky `#7fc8f5`,
  grass `#5fb85a`, sea `#2f8fd8`, accent yellow `#ffd23f`, red `#e8483f`; interface purple `#3a2a8a/#2a1d6b/#5a48b8`.
* Bongo: orange block `#ff9447` (outline `#a84a00`), blue bandana `#2f6fd8` with white dots and a knot on the
  viewer's right, blue eyes, brown boots `#8a5428`. Pucki: mint ball `#7ed6a5` (outline `#1f6b5a`), one curl on
  top, freckles, yellow sneakers `#ffd23f` with white stripes. NPCs: Käpt’n Reling (navy, captain's cap, white beard),
  Alfons (white, chef's hat, moustache), Mats (green, red knitted cap), Bert (pink, striped bandana, spyglass),
  Arno (orange, red headband, big arms), Tom (teal, sailor cap), Rocko (grey, black tricorn, eye patch).
* Faces: white eyes with dark outline, round pupils with a white glint, small nose, wide smile with teeth.
* Characters of the original casts keep their parts separate (eyes/lid/mouth/arms/shoes): draw parts with the
  same geometry as the body so overlays are seamless (mouth members paint a body-coloured patch first).
