// Interface_Lesson2: "Gegenstände" – cellar room (shelves, arched window, washing line, bulb, table, crate),
// pick-up items (broom, bucket, bottle, jam jar, spade – transparent, also shown in the pocket),
// crate lid animation Box-1..6 (stage 647,214) and the open crate view Box (800x448).
import { defineMovie } from '../lib/api';
import { C, circle, defs, dk, ellipse, g, line, linGrad, lt, path, poly, r2, rect, rng } from '../lib/svg';
import { exitStrip } from '../lib/menus';
import { boardsPattern, woodPattern } from '../lib/textures';
import { headline } from '../lib/ui';

const WALL = '#8a9a5a', WALL_D = '#5f6e3a', FLOOR = '#5a4a3a';

/** crate (153x148 canvas at scene 647,169); t = lid opening 0..1 */
function crate(t: number, id: string): string {
  const x = 6, y = 50, w = 140, h = 92;
  let s = ellipse(x + w / 2 + 6, y + h + 2, w / 2 + 4, 6, { fill: '#000', opacity: 0.3 });
  s += defs(woodPattern(`${id}w`, { base: '#b88048', dark: '#6b4020', plank: 23, len: 140, seed: 9 }));
  s += rect(x, y, w, h, { fill: `url(#${id}w)`, stroke: C.woodDeep, strokeWidth: 3.5 });
  s += rect(x, y, 14, h, { fill: dk('#b88048', 0.15), stroke: C.woodDeep, strokeWidth: 2.5 }) + rect(x + w - 14, y, 14, h, { fill: dk('#b88048', 0.15), stroke: C.woodDeep, strokeWidth: 2.5 });
  s += rect(x + w / 2 - 12, y + 30, 24, 14, { rx: 3, fill: '#c8ccd6', stroke: '#4d5560', strokeWidth: 2 });
  // inner opening (visible when the lid lifts)
  const top = poly([[x, y], [x + w, y], [x + w - 12, y - 16], [x + 12, y - 16]], { fill: t > 0 ? '#2a1a10' : '#9a6a38', stroke: C.woodDeep, strokeWidth: 3, strokeLinejoin: 'round' });
  s += top;
  // lid: hinged at the back edge (y - 16), rotates up
  const ly = y - 16 - 30 * Math.sin((t * Math.PI) / 2); // projected lid height grows while opening
  if (t === 0) s += poly([[x - 4, y + 2], [x + w + 4, y + 2], [x + w - 8, y - 18], [x + 8, y - 18]], { fill: '#c08850', stroke: C.woodDeep, strokeWidth: 3.5, strokeLinejoin: 'round' }) + path(`M${x + 2} ${y - 4} H${x + w - 2}`, { stroke: C.woodDeep, strokeWidth: 2, opacity: 0.6 });
  else s += poly([[x + 8, y - 16], [x + w - 8, y - 16], [x + w - 4, ly], [x + 4, ly]], { fill: lt('#c08850', 0.1 * t), stroke: C.woodDeep, strokeWidth: 3.5, strokeLinejoin: 'round' }) +
    path(`M${x + 10} ${r2((ly + y - 16) / 2)} H${x + w - 10}`, { stroke: C.woodDeep, strokeWidth: 2, opacity: 0.6 });
  return s;
}

function cellar(w: number, h: number): string {
  const R = rng('cellar');
  let s = defs(linGrad('cw', [[0, lt(WALL, 0.05)], [1, WALL_D]]), boardsPattern('cfloor', { base: FLOOR, dark: dk(FLOOR, 0.4), w: 60 }));
  s += rect(0, 0, w, h, { fill: 'url(#cw)' });
  for (let i = 0; i < 26; i++) s += ellipse(R() * w, R() * 300, 10 + R() * 30, 5 + R() * 10, { fill: WALL_D, opacity: 0.18 });
  s += path('M0 330 L800 320 V448 H0 Z', { fill: 'url(#cfloor)' }) + path('M0 330 L800 320', { stroke: dk(WALL_D, 0.4), strokeWidth: 4 });
  // arched window with bars
  s += path('M300 190 V120 a95 80 0 0 1 190 0 V190 Z', { fill: '#3a4a7a', stroke: '#8a4a2a', strokeWidth: 14 });
  for (let x = 320; x < 480; x += 26) s += line(x, 60, x, 190, { stroke: '#4a4a52', strokeWidth: 5 });
  s += rect(280, 186, 290, 16, { rx: 3, fill: '#b5a98a', stroke: '#6a5e40', strokeWidth: 3 });
  // shelves left with jars
  for (const y of [100, 160, 220, 280]) {
    s += path(`M0 ${y} L170 ${y - 18} l0 12 L0 ${y + 12} Z`, { fill: C.wood, stroke: C.woodDeep, strokeWidth: 3, strokeLinejoin: 'round' });
    s += rect(100, y - 6, 6, 18, { fill: '#4a4a52' });
  }
  for (const [x, y, c] of [[10, 180, C.red], [44, 176, C.red], [120, 120, '#e0a000'], [20, 120, '#7a5aa8']] as [number, number, string][]) s += rect(x, y, 26, 30, { rx: 5, fill: c, stroke: dk(c, 0.5), strokeWidth: 2.5 }) + rect(x - 2, y - 6, 30, 8, { rx: 2, fill: '#c8ccd6', stroke: '#4d5560', strokeWidth: 2 }) + rect(x + 5, y + 10, 16, 10, { fill: '#fdf6e3' });
  // washing line + laundry
  s += path('M340 10 Q560 50 800 0', { fill: 'none', stroke: '#e0d8c0', strokeWidth: 2.5 });
  const sock = (x: number, y: number, c: string, rot: number) => g({ transform: `translate(${x} ${y}) rotate(${rot})` }, path('M-8 0 h16 v40 q0 8 10 8 h4 v12 h-18 q-12 0 -12 -14 z', { fill: c, stroke: dk(c, 0.5), strokeWidth: 2.5, strokeLinejoin: 'round' }), circle(-2, 14, 2.5, { fill: '#fff' }), circle(4, 28, 2.5, { fill: '#fff' }));
  s += sock(400, 26, C.red, 10) + sock(610, 38, C.red, -4) + sock(690, 34, '#d07a3a', 6);
  s += path('M440 34 L560 46 L556 116 L444 110 Z', { fill: '#4a7ad8', stroke: '#173f86', strokeWidth: 3, strokeLinejoin: 'round' });
  for (let i = 0; i < 14; i++) s += circle(452 + R() * 96, 46 + R() * 60, 3, { fill: C.yellow });
  for (const x of [406, 446, 552, 614, 694]) s += rect(x - 3, 20 + (x - 340) * 0.06, 6, 14, { rx: 2, fill: '#e0c070', stroke: '#8a6d00', strokeWidth: 1.5 });
  // bulb
  s += line(400, 0, 400, 95, { stroke: '#222', strokeWidth: 2.5 }) + rect(390, 92, 20, 26, { rx: 4, fill: '#333' });
  s += circle(400, 158, 120, { fill: '#fff6c0', opacity: 0.12 });
  s += path('M400 118 c-26 6 -26 30 -16 44 q6 10 6 20 h20 q0 -10 6 -20 c10 -14 10 -38 -16 -44 z', { fill: '#fffbe0', stroke: '#c8b860', strokeWidth: 2.5 });
  // table
  s += ellipse(400, 410, 200, 18, { fill: '#000', opacity: 0.25 });
  for (const [x1, x2] of [[230, 214], [290, 280], [520, 528], [570, 586]]) s += path(`M${x1} 320 L${x2} 410`, { stroke: C.woodDeep, strokeWidth: 18, strokeLinecap: 'round' }) + path(`M${x1} 320 L${x2} 410`, { stroke: C.woodMid, strokeWidth: 12, strokeLinecap: 'round' });
  s += path('M196 284 L600 276 L604 316 L200 330 Z', { fill: '#c89858', stroke: C.woodDeep, strokeWidth: 4, strokeLinejoin: 'round' }) + path('M200 330 L604 316 L604 334 L200 348 Z', { fill: '#9a6a38', stroke: C.woodDeep, strokeWidth: 3.5, strokeLinejoin: 'round' });
  s += g({ transform: 'translate(647 169)' }, crate(0, 'bgc'));
  return s;
}

/** open crate seen from above (Box member, full screen) */
function boxView(w: number, h: number): string {
  let s = defs(woodPattern('bxa', { base: '#c08850', dark: '#6b4020', plank: 36, len: 260, seed: 2 }), woodPattern('bxb', { base: '#a87040', dark: '#5a3418', plank: 30, len: 220, seed: 5 }));
  s += rect(0, 0, w, h, { fill: 'url(#bxa)' });
  s += poly([[60, 100], [740, 100], [640, 140], [160, 140]], { fill: '#8a5a30', stroke: C.woodDeep, strokeWidth: 4 });
  s += rect(160, 140, 480, 220, { fill: 'url(#bxb)', stroke: C.woodDeep, strokeWidth: 4 });
  s += poly([[60, 100], [160, 140], [160, 360], [60, 430]], { fill: '#d09a60', stroke: C.woodDeep, strokeWidth: 4 });
  s += poly([[740, 100], [640, 140], [640, 360], [740, 430]], { fill: '#d09a60', stroke: C.woodDeep, strokeWidth: 4 });
  s += poly([[60, 430], [160, 360], [640, 360], [740, 430]], { fill: '#6b4020', stroke: C.woodDeep, strokeWidth: 4 });
  for (const x of [108, 692]) s += path(`M${x} 180 l-10 60 l10 60 l10 -60 z`, { fill: '#7a8090', stroke: '#3a3f4a', strokeWidth: 3 }) + rect(x - 4, 196, 8, 20, { fill: '#e0e4ec' }) + rect(x - 4, 264, 8, 20, { fill: '#e0e4ec' });
  s += rect(0, 0, w, 100, { fill: '#a87040', stroke: C.woodDeep, strokeWidth: 4 }) + rect(0, 430, w, 18, { fill: '#a87040', stroke: C.woodDeep, strokeWidth: 4 });
  s += path('M0 50 H800 M0 75 H800', { stroke: C.woodDeep, strokeWidth: 2, opacity: 0.5 });
  return s;
}

// items: transparent objects
const broom = (w: number, h: number) => g({},
  rect(w / 2 - 4, 4, 8, h - 60, { rx: 4, fill: '#d8b070', stroke: '#6b4020', strokeWidth: 2.5 }),
  path(`M${w / 2 - 10} ${h - 60} h20 l26 52 q-36 8 -72 0 z`, { fill: '#e8c860', stroke: '#8a6d00', strokeWidth: 3, strokeLinejoin: 'round' }),
  ...Array.from({ length: 7 }, (_, i) => line(w / 2 - 30 + i * 10, h - 30, w / 2 - 34 + i * 11.5, h - 9, { stroke: '#8a6d00', strokeWidth: 1.5 })),
  rect(w / 2 - 12, h - 64, 24, 8, { rx: 2, fill: C.red, stroke: C.redDark, strokeWidth: 2 }));
const bucket = (w: number, h: number) => g({},
  path(`M${w / 2 - 22} 18 a22 18 0 0 1 44 0`, { fill: 'none', stroke: '#4d5560', strokeWidth: 3 }),
  path(`M8 22 h${w - 16} l-6 ${h - 30} h${-(w - 28)} z`, { fill: '#9aa4b5', stroke: '#3a3f4a', strokeWidth: 3, strokeLinejoin: 'round' }),
  ellipse(w / 2, 22, (w - 16) / 2, 6, { fill: '#5a6070', stroke: '#3a3f4a', strokeWidth: 3 }),
  path(`M14 40 h${w - 28}`, { stroke: '#3a3f4a', strokeWidth: 2 }), path(`M16 30 v${h - 44}`, { stroke: '#fff', strokeWidth: 3, opacity: 0.5 }));
const bottle = (w: number, h: number) => g({ transform: `rotate(-12 ${w / 2} ${h / 2})` },
  path(`M${w / 2 - 8} 6 h16 v18 q16 8 16 26 v36 q0 6 -6 6 h-36 q-6 0 -6 -6 v-36 q0 -18 16 -26 z`, { fill: '#4a9a5a', stroke: '#1f5a2a', strokeWidth: 3, opacity: 0.95 }),
  rect(w / 2 - 9, 2, 18, 8, { rx: 2, fill: '#b88048', stroke: C.woodDeep, strokeWidth: 2 }),
  rect(w / 2 - 14, 52, 28, 22, { rx: 3, fill: '#fdf6e3', stroke: '#6a5e40', strokeWidth: 2 }), path(`M${w / 2 - 14} 30 v40`, { stroke: '#fff', strokeWidth: 4, opacity: 0.45, strokeLinecap: 'round' }));
const jam = (w: number, h: number) => g({},
  rect(4, 12, w - 8, h - 14, { rx: 6, fill: '#b02a40', stroke: '#5a1020', strokeWidth: 2.5 }),
  rect(2, 4, w - 4, 10, { rx: 3, fill: '#f0f0f0', stroke: '#6a6a6a', strokeWidth: 2 }), path(`M2 9 h${w - 4}`, { stroke: C.red, strokeWidth: 2, strokeDasharray: '4 3' }),
  rect(8, 22, w - 16, 14, { rx: 2, fill: '#fdf6e3', stroke: '#6a5e40', strokeWidth: 1.5 }), path('M8 18 v20', { stroke: '#fff', strokeWidth: 2.5, opacity: 0.5 }));
const spade = (w: number, h: number) => g({},
  path(`M${w / 2 - 12} 4 h24 v8 h-8 v4 h-8 v-4 h-8 z`, { fill: '#c08850', stroke: C.woodDeep, strokeWidth: 2.5, strokeLinejoin: 'round' }),
  rect(w / 2 - 4, 14, 8, h - 64, { rx: 3, fill: '#c08850', stroke: C.woodDeep, strokeWidth: 2.5 }),
  path(`M${w / 2 - 18} ${h - 52} h36 v28 q0 18 -18 22 q-18 -4 -18 -22 z`, { fill: '#9aa4b5', stroke: '#3a3f4a', strokeWidth: 3, strokeLinejoin: 'round' }),
  path(`M${w / 2 - 10} ${h - 46} v24`, { stroke: '#fff', strokeWidth: 3, opacity: 0.6, strokeLinecap: 'round' }));

export default defineMovie({
  Headline: (m, w, h) => headline('Lektion 2: Gegenstände', w, h),
  Background: (m, w, h) => cellar(w, h),
  Box: (m, w, h) => boxView(w, h),
  Besen: (m, w, h) => broom(w, h),
  Eimer: (m, w, h) => bucket(w, h),
  Flasche: (m, w, h) => bottle(w, h),
  Marmelade: (m, w, h) => jam(w, h),
  Spaten: (m, w, h) => spade(w, h),
  'Box-*': (m, w, h) => crate(((m.frame ?? 1) - 1) / 5, `bx${m.frame}`),
  'Exit-Left': (m, w, h) => exitStrip(w, h, true),
  'Exit-Right': (m, w, h) => exitStrip(w, h, false),
});
