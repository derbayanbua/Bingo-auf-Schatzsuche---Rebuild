// GS009-02 "Gläser-Melodie" – juice cellar: open the tap of the barrel (Hahn-1 … 10), fill the jug
// (Karaffe-1 … 6 = tilting), pour into the glasses (Glas-1 … 20 = fill level, note = level), strike them
// with the spoon (Loeffel-1 … 6 = strike) and play the melody of the note button (Button Melodie).
// Sprite rectangles (scene = stage y - 45): Hahn 32,190 100x85 (loc 87,227) · Saft stream 113,273 (stretched,
// blend 76) · glasses ch21 270,161 (Glas-8) and ch22–25 350,175 / 431,189 / 510,202 / 590,215 (62x89) ·
// Loeffel 355,306 · Karaffe 42,297 (loc 113,361; spout of Karaffe-6 at loc + (70..80, 10)).
import { atReg, defineMovie, type Member } from '../lib/api';
import { introScreen } from '../lib/gs005a';
import { C, circle, defs, dk, el, ellipse, g, line, linGrad, lt, path, poly, r2, rect, rng } from '../lib/svg';
import { fitText, headline } from '../lib/ui';

const JUICE = '#ff9a2a', JUICE_DK = '#c25a0a', JUICE_LT = '#ffc46a';
const BRASS = '#e0b040', BRASS_DK = '#7a5a10';
const GLASS_FILL = '#e6f6ff', GLASS_LINE = '#3d6f86';

const pat = (pid: string, w: number, h: number, inner: string) => `<pattern id="${pid}" width="${w}" height="${h}" patternUnits="userSpaceOnUse">${inner}</pattern>`;

function bricks(id: string): string {
  const R = rng(29);
  let inner = rect(0, 0, 120, 56, { fill: '#7a3a2a' });
  const brick = (x: number, y: number) => rect(x + 2, y + 2, 56, 24, { rx: 4, fill: ['#b85a3e', '#a84f36', '#c4664a'][Math.floor(R() * 3)], stroke: '#6a2e20', strokeWidth: 2 });
  inner += brick(0, 0) + brick(60, 0) + brick(-30, 28) + brick(30, 28) + brick(90, 28);
  return pat(id, 120, 56, inner);
}

/** cellar background (scene coords 800x448) */
function cellar(id: string): string {
  let s = defs(bricks(`${id}br`), pat(`${id}fl`, 200, 30, rect(0, 0, 200, 30, { fill: '#9c6431' }) + line(0, 29, 200, 29, { stroke: '#5a3418', strokeWidth: 3 }) + line(120, 0, 120, 30, { stroke: '#5a3418', strokeWidth: 2.5 })),
    linGrad(`${id}lt`, [[0, '#fff2c0', 0.35], [1, '#fff2c0', 0]]));
  s += rect(0, 0, 800, 340, { fill: `url(#${id}br)` });
  // floor
  s += rect(0, 330, 800, 118, { fill: `url(#${id}fl)` }) + rect(0, 326, 800, 10, { fill: '#5a3418' });
  // lamp light cone on the wall
  s += path('M430 0 L250 340 H760 L560 0 Z', { fill: `url(#${id}lt)` });
  s += path('M470 0 h50 v14 q-25 14 -50 0 z', { fill: '#3a3440', stroke: '#1e1a22', strokeWidth: 3 }) + ellipse(495, 18, 14, 6, { fill: '#fff2a0' });
  // barrel stand
  s += path('M-10 300 L150 400 M10 400 L150 250', { stroke: '#7a4a20', strokeWidth: 22, strokeLinecap: 'round' });
  s += path('M-10 300 L150 400 M10 400 L150 250', { stroke: '#c08a4a', strokeWidth: 14, strokeLinecap: 'round' });
  // barrel end face
  s += ellipse(50, 90, 170, 178, { fill: '#c88a4a', stroke: '#4a2a10', strokeWidth: 6 });
  for (let i = -3; i <= 3; i++) s += line(50 + i * 44, -80, 50 + i * 44, 260, { stroke: '#9c6431', strokeWidth: 3 });
  s += ellipse(50, 90, 170, 178, { fill: 'none', stroke: '#5a5a66', strokeWidth: 14 }) + ellipse(50, 90, 170, 178, { fill: 'none', stroke: '#8a8a98', strokeWidth: 5 });
  s += ellipse(50, 90, 146, 154, { fill: 'none', stroke: '#9c6431', strokeWidth: 4 });
  s += path('M150 -20 q40 60 30 130', { fill: 'none', stroke: '#e8b878', strokeWidth: 6, strokeLinecap: 'round', strokeOpacity: 0.6 });
  // tap mount (the tap is the Hahn sprite)
  s += ellipse(42, 232, 18, 14, { fill: BRASS, stroke: BRASS_DK, strokeWidth: 3 });
  // bench / table with the glasses
  const top: [number, number][] = [[196, 226], [790, 280], [760, 368], [196, 312]];
  s += rect(250, 330, 34, 100, { rx: 4, fill: '#8a5428', stroke: '#4a2a10', strokeWidth: 3 }) + rect(680, 360, 34, 80, { rx: 4, fill: '#8a5428', stroke: '#4a2a10', strokeWidth: 3 });
  s += ellipse(480, 430, 300, 14, { fill: '#000', fillOpacity: 0.2 });
  s += poly([[196, 312], [760, 368], [760, 392], [196, 336]], { fill: '#8a5428', stroke: '#4a2a10', strokeWidth: 3, strokeLinejoin: 'round' });
  s += poly(top, { fill: '#c98a3e', stroke: '#4a2a10', strokeWidth: 4, strokeLinejoin: 'round' });
  s += path('M214 236 L770 286', { stroke: '#e6b06a', strokeWidth: 3, strokeLinecap: 'round' });
  return s;
}

/** tap on the barrel: handle turns from horizontal (closed) to vertical (open); outlet at canvas 88,82 */
function hahn(f: number): string {
  const t = (f - 1) / 9;
  let s = '';
  s += path('M4 40 H70 q18 0 18 18 V78', { fill: 'none', stroke: BRASS_DK, strokeWidth: 16, strokeLinecap: 'round', strokeLinejoin: 'round' });
  s += path('M4 40 H70 q18 0 18 18 V78', { fill: 'none', stroke: BRASS, strokeWidth: 10, strokeLinecap: 'round', strokeLinejoin: 'round' });
  s += path('M8 37 H66', { stroke: '#fff0b0', strokeWidth: 3, strokeLinecap: 'round' });
  s += rect(79, 74, 18, 10, { rx: 3, fill: BRASS, stroke: BRASS_DK, strokeWidth: 3 });
  // valve body + handle
  s += circle(52, 40, 12, { fill: BRASS, stroke: BRASS_DK, strokeWidth: 3.5 });
  s += g({ transform: `rotate(${r2(-90 * t)} 52 34)` },
    rect(52 - 4, 14, 8, 22, { fill: BRASS_DK }),
    rect(24, 8, 56, 12, { rx: 6, fill: C.red, stroke: C.redDark, strokeWidth: 3 }),
    circle(52, 14, 5, { fill: BRASS, stroke: BRASS_DK, strokeWidth: 2 }));
  return s;
}

/** juice stream (stretched by the game) */
function saft(w: number, h: number): string {
  return rect(0, 0, w, h, { fill: JUICE }) + rect(w * 0.25, 0, w * 0.22, h, { fill: JUICE_LT }) + rect(w - 2.5, 0, 2.5, h, { fill: JUICE_DK });
}

/** drinking glass, fill level 0..1 (canvas 62x89) */
function glas(id: string, level: number): string {
  const bowl = 'M10 6 H52 L46 58 Q31 66 16 58 Z';
  const top = 10, bot = 60;
  const y = bot - (bot - top) * level;
  let s = defs(el('clipPath', { id: `${id}c` }, path(bowl)));
  s += ellipse(31, 84, 18, 4, { fill: '#000', fillOpacity: 0.18 });
  s += path(bowl, { fill: GLASS_FILL, fillOpacity: 0.55 });
  if (level > 0) s += g({ clipPath: `url(#${id}c)` }, rect(0, y, 62, 80, { fill: JUICE }), ellipse(31, y, 24, 3, { fill: JUICE_LT }));
  s += path(bowl, { fill: 'none', stroke: GLASS_LINE, strokeWidth: 3.5, strokeLinejoin: 'round' });
  s += ellipse(31, 6, 21, 3.5, { fill: 'none', stroke: GLASS_LINE, strokeWidth: 2.5 });
  s += rect(28, 62, 6, 18, { fill: GLASS_FILL, stroke: GLASS_LINE, strokeWidth: 2.5 });
  s += ellipse(31, 81, 16, 4.5, { fill: GLASS_FILL, stroke: GLASS_LINE, strokeWidth: 3 });
  s += path('M16 14 L19 48', { stroke: C.white, strokeWidth: 4, strokeLinecap: 'round', strokeOpacity: 0.9 });
  return s;
}

/** glass jug in loc coords (0,0 = registration point), tilted clockwise by deg */
function karaffe(deg: number): string {
  const body = 'M-24 -48 H6 L28 -60 L16 -38 Q46 -20 42 22 Q38 60 -6 62 Q-50 60 -54 22 Q-56 -18 -24 -36 Z';
  return g({ transform: `rotate(${r2(deg)})` },
    path('M-50 -26 q-22 6 -16 36 q4 16 16 18', { fill: 'none', stroke: GLASS_LINE, strokeWidth: 7, strokeLinecap: 'round' }),
    path('M-50 -26 q-22 6 -16 36 q4 16 16 18', { fill: 'none', stroke: GLASS_FILL, strokeWidth: 3, strokeLinecap: 'round' }),
    path(body, { fill: GLASS_FILL, fillOpacity: 0.7, stroke: GLASS_LINE, strokeWidth: 4, strokeLinejoin: 'round' }),
    path('M-24 -48 H6', { stroke: GLASS_LINE, strokeWidth: 6, strokeLinecap: 'round' }),
    path('M-38 -6 q-6 24 4 44', { fill: 'none', stroke: C.white, strokeWidth: 5, strokeLinecap: 'round' }),
    path('M-20 40 q14 8 32 0', { fill: 'none', stroke: GLASS_LINE, strokeWidth: 2, strokeOpacity: 0.5 }));
}
const KARAFFE_DEG = [0, 12, 26, 42, 58, 76];

/** silver spoon in loc coords, bowl on the left; deg = strike rotation */
function loeffel(deg: number): string {
  return g({ transform: `rotate(${r2(deg)})` },
    path('M-34 -2 L62 -5 q6 0 6 5 q0 5 -6 5 L-34 3 Z', { fill: '#d8dde6', stroke: '#5a6070', strokeWidth: 2.5, strokeLinejoin: 'round' }),
    ellipse(-48, 0, 17, 9, { fill: '#e8ecf2', stroke: '#5a6070', strokeWidth: 3 }),
    ellipse(-50, -2, 9, 4, { fill: C.white }),
    path('M-24 -1 L56 -3', { stroke: C.white, strokeWidth: 1.6, strokeLinecap: 'round' }));
}

/** note button (moved into the scene) */
function melodyButton(w: number, h: number): string {
  let s = circle(w / 2, 40, 36, { fill: C.ui, stroke: C.uiDark, strokeWidth: 4 }) +
    circle(w / 2, 40, 30, { fill: C.uiLight, stroke: C.uiAccent, strokeWidth: 3 });
  s += path(`M${w / 2 - 12} 54 V26 L${w / 2 + 14} 20 V48`, { fill: 'none', stroke: C.white, strokeWidth: 4, strokeLinejoin: 'round' }) +
    ellipse(w / 2 - 17, 54, 7, 5.5, { fill: C.white, transform: `rotate(-20 ${w / 2 - 17} 54)` }) +
    ellipse(w / 2 + 9, 48, 7, 5.5, { fill: C.white, transform: `rotate(-20 ${w / 2 + 9} 48)` });
  s += rect(6, h - 24, w - 12, 22, { rx: 11, fill: C.uiAccent, stroke: dk(C.uiAccent, 0.45), strokeWidth: 2.5 });
  s += fitText('Melodie', w / 2, h - 12, w - 24, 15, { fill: '#2a1a00', anchor: 'middle' });
  return s;
}

function intro(): string {
  const k = 0.4;
  const gl = (x: number, y: number, lv: number, id: string) => g({ transform: `translate(${x} ${y})` }, glas(id, lv));
  const pic = g({ transform: `scale(${k}) translate(0 20)` },
    cellar('ic'), g({ transform: 'translate(32 190)' }, hahn(1)),
    gl(270, 161, 7 / 19, 'ig1'), gl(350, 175, 0.2, 'ig2'), gl(431, 189, 0.5, 'ig3'), gl(510, 202, 0.8, 'ig4'), gl(590, 215, 0, 'ig5'),
    g({ transform: 'translate(420 321)' }, loeffel(0)), g({ transform: 'translate(113 361)' }, karaffe(0)));
  return introScreen({
    id: 'gs92', device: 'mouse', picture: pic,
    lines: ['Fülle die Gläser mit Saft und schlag sie mit dem Löffel an.', 'Gießen und Anschlagen: Gegenstand halten und Pfeiltaste ↓ drücken.', 'Spiel die Melodie vom Notenknopf nach!'],
    prefs: 'Für dieses Spiel brauchst du folgende Sachen – leg sie hier ab:',
  });
}

export default defineMovie({
  Headline: (m, w, h) => headline('Gläser-Melodie', w, h),
  Intro: () => intro(),
  Background: () => cellar('bg'),
  'Hahn-*': (m) => hahn(m.frame ?? 1),
  Saft: (m, w, h) => saft(w, h),
  'Glas-*': (m) => glas(`g${m.frame}`, ((m.frame ?? 1) - 1) / 19),
  'Karaffe-*': (m: Member) => atReg(m, karaffe(KARAFFE_DEG[(m.frame ?? 1) - 1])),
  // strike = the spoon tips towards the glass: foreshortened (flatter, a bit longer), like the shrinking canvas
  'Loeffel-*': (m: Member) => atReg(m, g({ transform: `scale(${r2(1 + 0.018 * ((m.frame ?? 1) - 1))} ${r2(1 - 0.09 * ((m.frame ?? 1) - 1))})` }, loeffel(0))),
  'Button Melodie': (m, w, h) => melodyButton(w, h),
});

void lt;
