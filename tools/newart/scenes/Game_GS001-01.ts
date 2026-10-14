// GS001-01 "Flaschenpost" – bottle post + jigsaw puzzle (top view of Bongo's table).
// Score (Game frame): Background 0,44 · pieces Teil-1..19 (ch 11–29) · Schatzkarte 193,97 (= solved map) ·
// Korken + Schatten · Flasche-1/2 at loc (0, 259) lying at the left edge (neck to the right) ·
// Kanne 659,27 (leaves the screen to the right) · Tasse 572,114.
// Puzzle: a piece snaps when its loc equals another's, so all pieces share the map's coordinate frame:
// piece pixel p ↔ map pixel p - reg(piece) + reg(map). The cut lines (piece outlines) are the original
// piece geometry (lib/puzzleCuts.ts, pure shape data); the picture on them is a new treasure map.
import { defineMovie, findMember, type Member } from '../lib/api';
import { minigameIntro } from '../lib/minigameIntro';
import { PUZZLE_CUTS } from '../lib/puzzleCuts';
import { C, circle, defs, dk, ellipse, g, line, linGrad, lt, path, radGrad, rect, rng, blob } from '../lib/svg';
import { woodPattern } from '../lib/textures';
import { fitText, headline, star } from '../lib/ui';

const DIR = 'Game_GS001-01';
const MAP_W = 401, MAP_H = 347, MAP_RX = 202, MAP_RY = 175;
const INK = '#5a3a1a';

function table(id: string, w: number, h: number): string {
  return defs(woodPattern(`${id}w`, { base: '#c0803f', dark: '#8f5a26', plank: 56, len: 260, seed: 3 }), radGrad(`${id}v`, [[0.55, '#000', 0], [1, '#000', 0.32]])) +
    rect(0, 0, w, h, { fill: `url(#${id}w)` }) + rect(0, 0, w, h, { fill: `url(#${id}v)` });
}

// ---------------------------------------------------------------- the treasure map (0..401 x 0..347)
function island(cx: number, cy: number, rx: number, ry: number, seed: number): string {
  return path(blob(cx, cy, rx + 6, ry + 6, seed, 0.16, 11), { fill: '#e9d08a', stroke: '#b89a52', strokeWidth: 2 }) +
    path(blob(cx, cy, rx, ry, seed, 0.16, 11), { fill: '#7fb862', stroke: '#3f6b2a', strokeWidth: 3, strokeLinejoin: 'round' }) +
    path(blob(cx - rx * 0.15, cy - ry * 0.15, rx * 0.5, ry * 0.45, seed + 1, 0.2, 8), { fill: '#a7d07e', fillOpacity: 0.8 });
}
function palm(x: number, y: number, s: number): string {
  const leaf = (a: number) => path(`M0 0 q${12 * Math.cos(a)} ${12 * Math.sin(a) - 6} ${18 * Math.cos(a)} ${18 * Math.sin(a) + 4}`, { fill: 'none', stroke: '#2f6b2a', strokeWidth: 4, strokeLinecap: 'round' });
  return g({ transform: `translate(${x} ${y}) scale(${s})` },
    path('M0 0 q4 12 2 24', { fill: 'none', stroke: '#7a4a20', strokeWidth: 4, strokeLinecap: 'round' }),
    g({ transform: 'translate(0 0)' }, [-2.6, -1.9, -1.2, -0.4].map(leaf).join('')), circle(1, 2, 2.5, { fill: '#5a3a1a' }));
}
function mountain(x: number, y: number, s: number): string {
  return g({ transform: `translate(${x} ${y}) scale(${s})` },
    path('M-14 6 L0 -12 L14 6 Z', { fill: '#b89a62', stroke: INK, strokeWidth: 2.2, strokeLinejoin: 'round' }),
    path('M0 -12 L-4 6 M0 -12 l4 5', { fill: 'none', stroke: INK, strokeWidth: 1.4 }));
}
function wave(x: number, y: number, s = 1): string {
  return path(`M${x} ${y} q${6 * s} -6 ${12 * s} 0 t${12 * s} 0 t${12 * s} 0`, { fill: 'none', stroke: '#4f7fa8', strokeWidth: 2.4, strokeLinecap: 'round', strokeOpacity: 0.85 });
}
function compass(cx: number, cy: number, r: number): string {
  const pt = (a: number, len: number, wd: number, col: string) => {
    const c = Math.cos(a), s = Math.sin(a);
    return path(`M${cx + c * len} ${cy + s * len} L${cx - s * wd} ${cy + c * wd} L${cx + s * wd} ${cy - c * wd} Z`, { fill: col, stroke: INK, strokeWidth: 1.4, strokeLinejoin: 'round' });
  };
  let s = circle(cx, cy, r * 0.72, { fill: 'none', stroke: INK, strokeWidth: 1.6 }) + circle(cx, cy, r * 0.62, { fill: 'none', stroke: INK, strokeWidth: 0.8 });
  for (let i = 0; i < 4; i++) s += pt(Math.PI / 4 + (i * Math.PI) / 2, r * 0.6, r * 0.14, '#d9b878');
  for (let i = 0; i < 4; i++) s += pt(-Math.PI / 2 + (i * Math.PI) / 2, r, r * 0.2, i === 0 ? C.red : '#3a2a1a');
  s += circle(cx, cy, 3, { fill: '#f3e2b0', stroke: INK, strokeWidth: 1.4 });
  const lab = (t: string, x: number, y: number) => fitText(t, x, y, 14, 12, { fill: INK, anchor: 'middle' });
  return s + lab('N', cx, cy - r - 8) + lab('S', cx, cy + r + 8) + lab('O', cx + r + 8, cy) + lab('W', cx - r - 8, cy);
}
function ship(x: number, y: number, s: number): string {
  return g({ transform: `translate(${x} ${y}) scale(${s})` },
    path('M-48 0 h96 q-8 22 -30 24 h-40 q-20 -2 -26 -24 z', { fill: '#8a5428', stroke: INK, strokeWidth: 3, strokeLinejoin: 'round' }),
    path('M-40 8 h80', { stroke: '#c0803f', strokeWidth: 3 }),
    [-26, -6, 14].map((x) => circle(x, 14, 3, { fill: '#3a2210' })).join(''),
    line(-14, 0, -14, -62, { stroke: INK, strokeWidth: 3 }), line(18, 0, 18, -50, { stroke: INK, strokeWidth: 3 }),
    path('M-28 -56 h28 q4 12 2 24 h-32 q-2 -12 2 -24 z', { fill: '#fbf3dc', stroke: INK, strokeWidth: 2.2, strokeLinejoin: 'round' }),
    path('M-32 -28 h36 q4 12 2 24 h-40 q-2 -12 2 -24 z', { fill: '#fbf3dc', stroke: INK, strokeWidth: 2.2, strokeLinejoin: 'round' }),
    path('M6 -44 h24 q4 10 2 20 h-28 q-2 -10 2 -20 z', { fill: '#fbf3dc', stroke: INK, strokeWidth: 2.2, strokeLinejoin: 'round' }),
    path('M4 -20 h28 q4 9 2 18 h-32 q-2 -9 2 -18 z', { fill: '#fbf3dc', stroke: INK, strokeWidth: 2.2, strokeLinejoin: 'round' }),
    path('M-14 -62 l14 4 l-14 4 z', { fill: C.red, stroke: INK, strokeWidth: 1.6 }),
    path('M48 0 l18 -10', { stroke: INK, strokeWidth: 2.4 }));
}
function seaSerpent(x: number, y: number): string {
  return g({ transform: `translate(${x} ${y})` },
    path('M0 8 q8 -22 18 -4 q8 -18 18 -2 q6 -14 16 -6', { fill: 'none', stroke: '#3f6b2a', strokeWidth: 6, strokeLinecap: 'round' }),
    path('M52 -4 q8 -6 12 2', { fill: 'none', stroke: '#3f6b2a', strokeWidth: 6, strokeLinecap: 'round' }), circle(60, -4, 1.6, { fill: '#fff' }),
    wave(-6, 12, 0.7), wave(30, 12, 0.7));
}

/** map body in map pixels (0..401 x 0..347); `id` prefixes the defs */
function mapArt(id: string): string {
  const R = rng(17);
  let s = defs(radGrad(`${id}p`, [[0, '#f6e6b8'], [0.7, '#ecd497'], [1, '#d4b26a']], 0.5, 0.45, 0.65));
  s += rect(-10, -10, MAP_W + 20, MAP_H + 20, { fill: `url(#${id}p)` });
  // stains + fibres
  for (let i = 0; i < 16; i++) s += path(blob(R() * MAP_W, R() * MAP_H, 10 + R() * 26, 8 + R() * 18, i + 3, 0.3), { fill: '#b88a3a', fillOpacity: 0.08 + R() * 0.07 });
  for (let i = 0; i < 40; i++) {
    const x = R() * MAP_W, y = R() * MAP_H;
    s += line(x, y, x + 6 + R() * 14, y + (R() - 0.5) * 3, { stroke: '#a07a3a', strokeWidth: 0.8, strokeOpacity: 0.35 });
  }
  // sea hatching
  for (const [x, y] of [[40, 150], [150, 60], [330, 160], [200, 300], [60, 320], [250, 120], [350, 40], [140, 150]]) s += wave(x, y);
  // islands
  s += island(275, 95, 52, 38, 21) + palm(258, 78, 1) + palm(292, 88, 0.85) + mountain(278, 112, 0.9);
  s += island(105, 262, 62, 44, 33) + palm(78, 250, 1.1) + mountain(112, 262, 1.1) + mountain(136, 274, 0.8) + palm(130, 236, 0.9);
  s += island(238, 222, 20, 14, 41) + palm(240, 214, 0.75);
  // dashed route Große Insel → Kleine Insel → Schatzinsel
  s += path('M128 228 C160 200 196 236 222 224 C250 212 236 172 214 150 C192 126 238 112 270 100', { fill: 'none', stroke: C.red, strokeWidth: 3.4, strokeDasharray: '9 7', strokeLinecap: 'round' });
  // X marks the spot
  s += path('M266 92 l14 14 M280 92 l-14 14', { stroke: '#c0261c', strokeWidth: 5, strokeLinecap: 'round' });
  s += compass(70, 70, 34) + ship(320, 290, 0.85) + seaSerpent(160, 100);
  // labels
  const lab = (t: string, x: number, y: number, w: number) => fitText(t, x, y, w, 20, { fill: INK, anchor: 'middle' });
  s += lab('Schatzinsel', 275, 40, 120) + lab('Große Insel', 105, 196, 120) + lab('Kleine Insel', 300, 198, 110);
  // border line
  s += rect(14, 14, MAP_W - 28, MAP_H - 28, { rx: 6, fill: 'none', stroke: INK, strokeWidth: 1.4, strokeOpacity: 0.35, strokeDasharray: '2 4' });
  return s;
}

/** cut path of a piece in its own canvas pixels */
const cut = (m: Member) => PUZZLE_CUTS[m.name]?.d ?? `M0 0h${m.w}v${m.h}h-${m.w}z`;

function piece(m: Member): string {
  const id = `p${m.num}`;
  const d = cut(m);
  const edge = [[-1, 0], [1, 0], [0, -1], [0, 1], [1, 1]].map(([x, y]) => path(d, { fill: '#6b4a20', transform: `translate(${x} ${y})`, fillOpacity: 0.55 })).join('');
  const dx = m.regX - MAP_RX, dy = m.regY - MAP_RY;
  return edge + `<clipPath id="${id}c"><path transform="translate(${-dx} ${-dy})" d="${d}"/></clipPath>` +
    g({ transform: `translate(${dx} ${dy})` }, g({ clipPath: `url(#${id}c)` }, mapArt(id)));
}

/** solved map = map clipped to the union of all pieces */
function solvedMap(): string {
  let clip = '';
  for (let i = 1; i <= 19; i++) {
    const m = findMember(DIR, `Teil-${i}`);
    if (m) clip += `<path transform="translate(${MAP_RX - m.regX} ${MAP_RY - m.regY})" d="${cut(m)}"/>`;
  }
  return `<clipPath id="smc">${clip}</clipPath>` + g({ clipPath: 'url(#smc)' }, mapArt('sm'));
}

// ---------------------------------------------------------------- props
/** bottle lying on the table (top view), neck to the right; canvas 199/183 x 192, reg (0,69) */
function bottle(corked: boolean, w: number, h: number): string {
  const glass = '#7fd0a0', glassD = '#2f7a52';
  const cy = 69;
  const body = `M-20 ${cy - 52} H96 q28 0 40 26 q8 12 22 14 v24 q-14 2 -22 14 q-12 26 -40 26 H-20 Z`;
  let s = defs(linGrad('bg', [[0, lt(glass, 0.35)], [0.5, glass], [1, dk(glass, 0.12)]]));
  s += path(body, { fill: '#000', opacity: 0.18, transform: 'translate(12 18)' });
  s += path(body, { fill: 'url(#bg)', stroke: glassD, strokeWidth: 4, strokeLinejoin: 'round', opacity: 0.94 });
  // rolled letter inside
  s += rect(6, cy - 18, 92, 36, { rx: 16, fill: '#f3e2b0', stroke: '#a0782a', strokeWidth: 2.5 }) + path(`M20 ${cy - 18} v36 M80 ${cy - 18} v36`, { stroke: C.red, strokeWidth: 3 });
  // lip
  s += rect(156, cy - 17, 12, 34, { rx: 5, fill: lt(glass, 0.2), stroke: glassD, strokeWidth: 3.5 });
  // highlights
  s += path(`M0 ${cy - 40} H92 q20 0 30 16`, { fill: 'none', stroke: '#fff', strokeWidth: 6, strokeLinecap: 'round', opacity: 0.6 });
  if (corked) s += rect(166, cy - 13, 22, 26, { rx: 7, fill: '#c08a4a', stroke: '#6b4a20', strokeWidth: 3 }) + circle(176, cy - 4, 2, { fill: '#8a5a2a' }) + circle(181, cy + 5, 1.6, { fill: '#8a5a2a' });
  return s;
}

function cork(w: number, h: number): string {
  // seen from above, slightly tilted (bottom + top face)
  return g({ transform: `translate(${w / 2} ${h / 2})` },
    rect(-17, -20, 34, 40, { rx: 12, fill: '#b07a3e', stroke: '#5a3a1a', strokeWidth: 3.5 }),
    ellipse(0, -10, 15, 9, { fill: '#d8a868', stroke: '#5a3a1a', strokeWidth: 2.5 }),
    [[-5, -12], [4, -8], [6, 6], [-6, 8], [0, 14]].map(([x, y]) => circle(x, y, 1.8, { fill: '#6b4a20' })).join(''));
}

function teapot(w: number, h: number): string {
  // big blue teapot seen from above, spout pointing left, body leaving the canvas to the right
  return path('M80 112 q-60 10 -70 -24 q30 4 44 -6', { fill: '#3a7fd8', stroke: C.blueDark, strokeWidth: 5, strokeLinejoin: 'round' }) +
    ellipse(170, 96, 110, 66, { fill: '#000', opacity: 0.18, transform: 'translate(10 8)' }) +
    ellipse(170, 90, 110, 66, { fill: '#3a7fd8', stroke: C.blueDark, strokeWidth: 5 }) +
    ellipse(170, 90, 66, 40, { fill: '#5b9be6', stroke: C.blueDark, strokeWidth: 4 }) +
    circle(170, 90, 12, { fill: C.yellow, stroke: C.yellowDark, strokeWidth: 3 }) +
    [0, 1, 2, 3, 4, 5, 6, 7].map((i) => circle(170 + Math.cos(i * 0.785) * 88, 90 + Math.sin(i * 0.785) * 52, 6, { fill: '#fff', opacity: 0.9 })).join('') +
    path('M100 50 q30 -30 70 -32', { fill: 'none', stroke: '#fff', strokeWidth: 6, strokeLinecap: 'round', opacity: 0.5 });
}

function cup(w: number, h: number): string {
  const cx = 60, cy = 62;
  return ellipse(cx + 8, cy + 8, 56, 54, { fill: '#000', opacity: 0.18 }) +
    ellipse(cx, cy, 58, 56, { fill: '#fff', stroke: '#8a93a6', strokeWidth: 3 }) +
    path(`M${cx + 30} ${cy - 8} q34 -6 34 14 q0 20 -32 14`, { fill: 'none', stroke: C.red, strokeWidth: 9, strokeLinecap: 'round' }) +
    path(`M${cx + 30} ${cy - 8} q34 -6 34 14 q0 20 -32 14`, { fill: 'none', stroke: C.redDark, strokeWidth: 2 }) +
    circle(cx, cy, 36, { fill: C.red, stroke: C.redDark, strokeWidth: 4 }) +
    circle(cx, cy, 28, { fill: '#5a3218', stroke: '#3a1e0a', strokeWidth: 2 }) +
    path(`M${cx - 14} ${cy - 10} q10 -10 22 -4`, { fill: 'none', stroke: '#8a5a32', strokeWidth: 3, strokeLinecap: 'round' }) +
    path(`M${cx - 42} ${cy - 24} q14 -20 40 -24`, { fill: 'none', stroke: '#fff', strokeWidth: 4, strokeLinecap: 'round', opacity: 0.7 });
}

function intro(): string {
  // picture: torn map pieces on the table with the bottle
  let art = table('ia', 340, 200);
  const R = rng(5);
  for (let i = 0; i < 12; i++) {
    const x = 70 + (i % 4) * 62 + R() * 20, y = 30 + Math.floor(i / 4) * 56 + R() * 12;
    art += g({ transform: `translate(${x} ${y}) rotate(${(R() - 0.5) * 50})` },
      path(blob(0, 0, 26, 20, i + 9, 0.3, 7), { fill: '#ecd497', stroke: '#8a6a30', strokeWidth: 2.5 }),
      path(`M-14 ${-4 + R() * 8} q10 -6 22 0`, { fill: 'none', stroke: C.red, strokeWidth: 2.4, strokeDasharray: '5 4' }));
  }
  art += g({ transform: 'translate(-60 70) scale(0.55)' }, bottle(false, 183, 192));
  art += g({ transform: 'translate(272 6) scale(0.5)' }, cup(131, 122));
  return minigameIntro('i', art, 'Die Schatzkarte ist ganz schön zerrissen … schaffst du es, sie wieder zusammenzusetzen?', 'mouse');
}

export default defineMovie({
  Headline: (m, w, h) => headline('Flaschenpost', w, h),
  Intro: () => intro(),
  Background: (m, w, h) => table('bg', w, h),
  'Teil-*': (m) => piece(m),
  Schatzkarte: () => solvedMap(),
  'Flasche-1': (m, w, h) => bottle(true, w, h),
  'Flasche-2': (m, w, h) => bottle(false, w, h),
  Korken: (m, w, h) => cork(w, h),
  'Korken Schatten': (m, w, h) => g({ transform: `translate(${w / 2} ${h / 2})` }, rect(-17, -20, 34, 40, { rx: 12, fill: '#000', opacity: 0.3 })),
  Kanne: (m, w, h) => teapot(w, h),
  Tasse: (m, w, h) => cup(w, h),
});

void star;
