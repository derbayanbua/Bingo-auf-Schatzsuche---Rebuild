// GS008-01 "Inselcafé" – serve the drinks written on the blackboard.
// Sprite rectangles (scene coordinates = stage y - 45, see score frame "Game"):
//   Tafel #4 0,89 248x354 (easel board, backgroundTransparent) · Drink-n 28,114+25i (chalk orders) ·
//   Kreidenstrich 24,120+25i 166x3 · Kellner 559,31 241x236 (waiter Alfons, 27 frames, serves a cup) ·
//   Taster Kakao/Kaffee/Cappuccino 275,126/147/168 69x19 · Taster Milch 417,130 · Zucker 485,130 (lit state,
//   blend 0 until hovered – the unlit buttons are part of the background) · Kaffee-Jet 368,202 ·
//   Milch-Jet 438,202 · Zucker-Piece 509,203 · Tasse 43x45 reg bottom centre (cups run on the rail at
//   loc y 259, stops at x 376/446/516, waiter takes it at 656) · Leitschiene 134,251 559x20 ·
//   Mainswitch 683,299 26x23 (lit = on) · Fass 722,305 78x106 (bin for wrong cups).
import { defineMovie, type Member } from '../lib/api';
import { introScreen } from '../lib/gs005a';
import { npcFigure } from '../lib/npcs';
import { C, circle, defs, dk, ellipse, g, line, linGrad, lt, path, r2, radGrad, rect } from '../lib/svg';
import { woodPattern } from '../lib/textures';
import { fitText, headline } from '../lib/ui';

const CHALK = '#f4f1e6';
const BOARD = '#2f7a5a';
const MACHINE = '#e8483f', MACHINE_D = '#8f2620', STEEL = '#c9ced8', STEEL_D = '#6d7484';

// ------------------------------------------------------------------ buttons
interface TasterSpec { label: string; x: number; y: number; w: number; h: number; fill: string; text: string }
const TASTER: Record<string, TasterSpec> = {
  Kakao: { label: 'Kakao', x: 275, y: 126, w: 69, h: 19, fill: '#9a5a2e', text: C.white },
  Kaffee: { label: 'Kaffee', x: 275, y: 147, w: 69, h: 19, fill: '#5a3420', text: C.white },
  Cappuccino: { label: 'Cappuccino', x: 275, y: 168, w: 69, h: 20, fill: '#d9a066', text: '#3a2010' },
  Milch: { label: 'Milch', x: 417, y: 130, w: 58, h: 26, fill: '#f4f6fb', text: '#2a3a6a' },
  Zucker: { label: 'Zucker', x: 485, y: 130, w: 59, h: 26, fill: '#f6b8d0', text: '#6a1a3a' },
};

function taster(t: TasterSpec, lit: boolean): string {
  const fill = lit ? lt(t.fill, 0.15) : mix2(t.fill);
  const stroke = lit ? C.yellow : dk(t.fill, 0.5);
  return rect(1.5, 1.5, t.w - 3, t.h - 3, { rx: (t.h - 3) / 2, fill, stroke, strokeWidth: lit ? 3 : 2 }) +
    (lit ? path(`M${t.h / 2} 4.5 h${t.w - t.h}`, { stroke: C.white, strokeWidth: 1.6, strokeLinecap: 'round', strokeOpacity: 0.7 }) : '') +
    fitText(t.label, t.w / 2, t.h / 2 + 0.5, t.w - 10, t.h * 0.62, { anchor: 'middle', fill: lit ? t.text : mixText(t.text), font: 'head' });
}
const mix2 = (c: string) => dk(c, 0.18);
const mixText = (c: string) => dk(c, 0.1);

// ------------------------------------------------------------------ background
function background(): string {
  let s = defs(
    woodPattern('cf-floor', { base: C.floor, dark: C.floorDark, plank: 22, seed: 4 }),
    linGrad('cf-sky', [[0, C.sky], [1, C.skyLight]]),
    linGrad('cf-counter', [[0, '#fff4d6'], [1, '#f0d9a0']]),
  );
  // striped wallpaper
  s += rect(0, 0, 800, 340, { fill: '#fdf6e3' });
  for (let x = 0; x < 800; x += 44) s += rect(x, 0, 22, 340, { fill: '#9cc8ec' });
  s += rect(0, 318, 800, 14, { fill: C.woodMid, stroke: C.woodDeep, strokeWidth: 3 });
  // window behind the waiter (top right)
  s += rect(632, -10, 180, 214, { rx: 6, fill: C.wood, stroke: C.woodDeep, strokeWidth: 5 });
  s += rect(646, 4, 160, 186, { fill: 'url(#cf-sky)', stroke: C.woodDeep, strokeWidth: 3 });
  s += path('M646 150 q40 -26 80 -8 t90 -6 V190 H646 Z', { fill: C.water });
  s += path('M660 150 q30 -40 70 -10 q20 -30 60 -4 v4 H660 Z', { fill: C.grass, stroke: C.grassDark, strokeWidth: 2.5 });
  s += line(726, 4, 726, 190, { stroke: C.woodDeep, strokeWidth: 6 }) + line(646, 96, 806, 96, { stroke: C.woodDeep, strokeWidth: 6 });
  s += path('M690 40 q8 -10 18 0 q10 -8 16 4 h-34 z', { fill: C.white });
  // floor
  s += rect(0, 332, 800, 116, { fill: 'url(#cf-floor)' });
  // pictures on the wall
  s += rect(600, 24, 26, 34, { rx: 3, fill: C.yellow, stroke: C.yellowDark, strokeWidth: 3 }) + circle(613, 41, 7, { fill: C.red });
  // ---- coffee machine
  // back plate behind the cups
  s += rect(300, 150, 250, 104, { rx: 8, fill: STEEL, stroke: STEEL_D, strokeWidth: 4 });
  s += rect(312, 162, 226, 80, { rx: 6, fill: '#aeb5c2' });
  for (let i = 0; i < 6; i++) s += line(318 + i * 40, 168, 318 + i * 40 + 26, 236, { stroke: '#c4cad5', strokeWidth: 3, strokeLinecap: 'round' });
  // housing
  s += path('M266 82 Q266 68 280 68 H552 Q566 68 566 82 V158 Q566 166 558 166 H356 V196 Q356 204 348 204 H274 Q266 204 266 196 Z',
    { fill: MACHINE, stroke: MACHINE_D, strokeWidth: 5, strokeLinejoin: 'round' });
  s += path('M276 80 H554', { stroke: lt(MACHINE, 0.4), strokeWidth: 4, strokeLinecap: 'round' });
  s += rect(268, 120, 82, 82, { rx: 8, fill: dk(MACHINE, 0.15) });
  s += fitText('Inselcafé', 452, 98, 160, 26, { anchor: 'middle', fill: C.cream, stroke: MACHINE_D, sw: 3 });
  // unlit buttons
  for (const t of Object.values(TASTER)) s += g({ transform: `translate(${t.x} ${t.y})` }, taster(t, false));
  // spouts (Kaffee 377, Milch 446, Zucker 516)
  for (const [x, col] of [[377, '#5a3420'], [446, '#f4f6fb'], [516, '#f6b8d0']] as [number, string][]) {
    s += rect(x - 9, 164, 18, 22, { fill: STEEL, stroke: STEEL_D, strokeWidth: 3 }) +
      path(`M${x - 7} 186 h14 l-3 14 h-8 z`, { fill: '#9aa1ae', stroke: STEEL_D, strokeWidth: 3, strokeLinejoin: 'round' }) +
      circle(x, 175, 4, { fill: col, stroke: STEEL_D, strokeWidth: 1.5 });
  }
  // ---- counter
  s += rect(104, 262, 622, 150, { rx: 10, fill: 'url(#cf-counter)', stroke: '#a07a3a', strokeWidth: 5 });
  s += rect(96, 254, 638, 16, { rx: 6, fill: C.wood, stroke: C.woodDeep, strokeWidth: 4 });
  for (let i = 0; i < 9; i++) s += line(150 + i * 66, 282, 150 + i * 66, 396, { stroke: '#e6cc8c', strokeWidth: 3 });
  s += fitText('INSEL', 448, 316, 220, 50, { anchor: 'middle', fill: C.blue, stroke: C.white, sw: 5 });
  s += fitText('Café', 560, 366, 140, 44, { anchor: 'middle', fill: C.red, stroke: C.white, sw: 5 });
  s += path('M330 352 q20 -16 40 0 q20 16 40 0', { fill: 'none', stroke: C.blue, strokeWidth: 4, strokeLinecap: 'round' });
  // cup icon on the counter
  s += g({ transform: 'translate(400 392)' }, cupShape(0, 0, 0.6));
  // main switch (unlit)
  s += rect(676, 292, 40, 37, { rx: 6, fill: STEEL, stroke: STEEL_D, strokeWidth: 3 }) +
    circle(696, 310, 11, { fill: '#7a2a24', stroke: '#3e140c', strokeWidth: 3 });
  // shadow under the counter
  s += ellipse(415, 416, 330, 10, { fill: '#000', fillOpacity: 0.18 });
  return s;
}

// ------------------------------------------------------------------ props
/** cup, (0,0) = bottom centre, 43x45 at s=1 */
function cupShape(x: number, y: number, s = 1): string {
  return g({ transform: `translate(${x} ${y}) scale(${s})` },
    path('M11 -31 q7 0 7 7 q0 9 -10 10', { fill: 'none', stroke: '#8a93a6', strokeWidth: 7, strokeLinecap: 'round' }),
    path('M11 -31 q7 0 7 7 q0 9 -10 10', { fill: 'none', stroke: C.white, strokeWidth: 3, strokeLinecap: 'round' }),
    ellipse(0, -3, 19, 3.5, { fill: '#d9dde6', stroke: '#8a93a6', strokeWidth: 2.5 }),
    path('M-15 -38 H15 L12 -8 Q11 -4 6 -4 H-6 Q-11 -4 -12 -8 Z', { fill: C.white, stroke: '#8a93a6', strokeWidth: 3, strokeLinejoin: 'round' }),
    path('M-14 -27 H14 L13.3 -20 H-13.3 Z', { fill: C.blue }),
    ellipse(0, -38, 15, 3.5, { fill: '#6b4a32', stroke: '#8a93a6', strokeWidth: 2.5 }),
    path('M-10 -33 v18', { stroke: '#eef2f8', strokeWidth: 3, strokeLinecap: 'round' }));
}

function tafel(): string {
  // easel board (member #4 248x354, #40 the same board on an 800x362 canvas)
  return path('M206 18 L246 338', { stroke: C.woodDeep, strokeWidth: 7, strokeLinecap: 'round' }) +
    path('M206 18 L246 338', { stroke: C.wood, strokeWidth: 3.5, strokeLinecap: 'round' }) +
    rect(22, 332, 12, 18, { rx: 4, fill: C.woodMid, stroke: C.woodDeep, strokeWidth: 2.5 }) +
    rect(180, 332, 12, 18, { rx: 4, fill: C.woodMid, stroke: C.woodDeep, strokeWidth: 2.5 }) +
    rect(4, 4, 206, 334, { rx: 8, fill: C.wood, stroke: C.woodDeep, strokeWidth: 4 }) +
    rect(14, 14, 186, 314, { rx: 4, fill: BOARD, stroke: dk(BOARD, 0.4), strokeWidth: 3 }) +
    path('M24 300 q40 -6 80 2', { fill: 'none', stroke: CHALK, strokeWidth: 3, strokeOpacity: 0.18, strokeLinecap: 'round' }) +
    path('M30 60 q60 -10 140 6', { fill: 'none', stroke: CHALK, strokeWidth: 6, strokeOpacity: 0.08, strokeLinecap: 'round' }) +
    rect(60, 326, 50, 6, { rx: 2, fill: CHALK }) + path('M10 10 h190', { stroke: lt(C.wood, 0.35), strokeWidth: 3, strokeLinecap: 'round' });
}

const DRINKS: Record<number, string> = {
  1: 'Kakao', 2: 'Kaffee', 4: 'Cappuccino', 10: 'Kaffee + Milch', 18: 'Kaffee + Zucker', 20: 'Cappuccino + Zucker', 26: 'Kaffee + Milch + Zucker',
};
function drink(m: Member, w: number, h: number): string {
  const txt = DRINKS[m.frame ?? 1] ?? 'Kaffee';
  return fitText(txt, 1, m.regY + 1, w - 2, 15, { fill: CHALK, font: 'body', weight: 800 });
}

function kreidenstrich(w: number, h: number): string {
  return path(`M1.5 2 Q${w * 0.3} 0.8 ${w * 0.55} 1.8 T${w - 1.5} 1.2`, { fill: 'none', stroke: CHALK, strokeWidth: 2.2, strokeLinecap: 'round' });
}

function leitschiene(w: number, h: number): string {
  return rect(2, 3, w - 4, h - 6, { rx: 4, fill: '#3fae6a', stroke: '#1f6b3c', strokeWidth: 3 }) +
    path(`M8 7 H${w - 8}`, { stroke: '#8fd46a', strokeWidth: 2.5, strokeLinecap: 'round' }) +
    Array.from({ length: Math.floor((w - 20) / 24) }, (_, i) => circle(14 + i * 24, h / 2 + 2, 2.2, { fill: '#1f6b3c' })).join('');
}

function jet(color: string, stroke: string, w: number, h: number): string {
  const cx = w / 2;
  return path(`M${cx - 3} 0 Q${cx - 4} ${h * 0.6} ${cx - 2} ${h - 4} H${cx + 2} Q${cx + 4} ${h * 0.6} ${cx + 3} 0 Z`, { fill: color, stroke, strokeWidth: 1.4 }) +
    ellipse(cx, h - 3, w / 2 - 2, 2.6, { fill: color, stroke, strokeWidth: 1.2 }) +
    circle(cx - w / 2 + 4, h - 7, 1.6, { fill: color }) + circle(cx + w / 2 - 4, h - 8, 1.4, { fill: color });
}

function sugar(w: number, h: number): string {
  const cube = (x: number, y: number, s: number) =>
    path(`M${x} ${y + s * 0.3} l${s * 0.5} ${-s * 0.3} l${s * 0.5} ${s * 0.3} v${s * 0.7} l${-s * 0.5} ${s * 0.3} l${-s * 0.5} ${-s * 0.3} z`, { fill: C.white, stroke: '#9aa4b5', strokeWidth: 1.4, strokeLinejoin: 'round' }) +
    path(`M${x} ${y + s * 0.3} l${s * 0.5} ${s * 0.3} l${s * 0.5} ${-s * 0.3} M${x + s * 0.5} ${y + s * 0.6} v${s * 0.7}`, { fill: 'none', stroke: '#c4cad5', strokeWidth: 1.1 });
  return cube(1.5, 1.5, 12) + path(`M${w / 2 - 3} ${h - 3} l2 1 M${w / 2 + 3} ${h - 2} l-1 1`, { stroke: '#c4cad5', strokeWidth: 1.4, strokeLinecap: 'round' });
}

function mainswitch(w: number, h: number): string {
  return defs(radGrad('ms-g', [[0, '#ffd27a', 0.9], [1, '#ff5a3c', 0]])) + ellipse(w / 2 + 1, h / 2, w / 2, h / 2, { fill: 'url(#ms-g)' }) +
    circle(13, 11, 9.5, { fill: '#ff4a3a', stroke: '#9a2620', strokeWidth: 2.5 }) + circle(10, 8, 3, { fill: '#ffc0b0' });
}

function fass(w: number, h: number): string {
  const x0 = 4, x1 = w + 4; // barrel continues past the right edge
  return path(`M${x0 + 6} 12 Q${x0 - 2} ${h / 2} ${x0 + 6} ${h - 6} H${x1} V12 Z`, { fill: C.wood, stroke: C.woodDeep, strokeWidth: 4, strokeLinejoin: 'round' }) +
    [26, 48, 70].map((x) => line(x, 14, x + (x > 40 ? 0 : -2), h - 8, { stroke: C.woodMid, strokeWidth: 3 })).join('') +
    ellipse(x0 + 44, 12, 42, 9, { fill: '#3a2414', stroke: C.woodDeep, strokeWidth: 4 }) +
    [30, h - 26].map((y) => path(`M${x0 + 1} ${y} Q${w / 2} ${y + 6} ${w} ${y + 2}`, { fill: 'none', stroke: '#5a5560', strokeWidth: 6 })).join('') +
    path(`M${x0 + 12} 26 Q${x0 + 8} ${h / 2} ${x0 + 12} ${h - 18}`, { fill: 'none', stroke: lt(C.wood, 0.35), strokeWidth: 3, strokeLinecap: 'round' });
}

// ------------------------------------------------------------------ waiter (Alfons), 27 frames
const K = 1.15, FX = 150, FY = 275; // figure transform in member coordinates
const SHOULDER: [number, number] = [FX - 55.4 * K, FY - 77 * K];
const KEYS: [number, number, number][] = [ // frame, hand x, hand y
  [2, 97, 205], [8, 70, 118], [14, 210, 96], [18, 262, 120], [22, 190, 170], [27, 72, 236],
];
function handAt(f: number): [number, number] {
  for (let i = 0; i < KEYS.length - 1; i++) {
    const [f0, x0, y0] = KEYS[i], [f1, x1, y1] = KEYS[i + 1];
    if (f >= f0 && f <= f1) {
      const t = (f - f0) / (f1 - f0), e = t * t * (3 - 2 * t);
      return [x0 + (x1 - x0) * e, y0 + (y1 - y0) * e];
    }
  }
  return [KEYS[KEYS.length - 1][1], KEYS[KEYS.length - 1][2]];
}

function kellner(m: Member): string {
  const f = m.frame ?? 1;
  const eyes = f === 1 || f >= 24 ? 'open' : f <= 8 ? 'left' : f <= 18 ? 'right' : 'open';
  const mouth = f >= 6 && f <= 14 ? (f % 2 ? 3 : 2) : 1;
  const lean = f === 1 ? 0 : f <= 8 ? -3 * Math.min(1, (f - 1) / 3) : f <= 18 ? 2 : 0;
  const fig = g({ transform: `rotate(${r2(lean)} ${FX} ${FY}) translate(${FX} ${FY}) scale(${K})` }, npcFigure('Alfred', { eyes, mouth, armR: f >= 8 && f <= 18 ? 0.25 : 0.05 }));
  if (f === 1) return fig;
  const [hx, hy] = handAt(f);
  const carry = f <= 17;
  // while the cup is passed to the right (behind him), the arm goes behind the body
  const behind = f >= 10 && f <= 24;
  let s = behind ? '' : fig;
  if (carry) s += cupShape(hx, hy + 24, 1);
  const [sx, sy] = SHOULDER;
  const ex = (sx + hx) / 2 - 18, ey = Math.max(sy, hy) + 10;
  const d = `M${r2(sx)} ${r2(sy)} Q${r2(ex)} ${r2(ey)} ${r2(hx)} ${r2(hy)}`;
  s += path(d, { fill: 'none', stroke: '#8f8a9e', strokeWidth: 13 * K + 4, strokeLinecap: 'round' }) +
    path(d, { fill: 'none', stroke: '#f4f4f4', strokeWidth: 13 * K - 2, strokeLinecap: 'round' }) +
    circle(hx, hy, 10.5 * K, { fill: '#f2d2b8', stroke: '#8f8a9e', strokeWidth: 3.2 });
  return behind ? s + fig : s;
}

// ------------------------------------------------------------------ intro
function introPicture(): string {
  let s = rect(0, 0, 320, 190, { fill: '#fdf6e3' });
  for (let x = 0; x < 320; x += 24) s += rect(x, 0, 12, 190, { fill: '#9cc8ec' });
  s += rect(14, 20, 90, 150, { rx: 6, fill: C.wood, stroke: C.woodDeep, strokeWidth: 3 }) + rect(20, 26, 78, 138, { rx: 3, fill: BOARD });
  s += ['Kakao', 'Kaffee', 'Cappuccino', 'Kaffee + Milch'].map((t, i) => fitText(t, 26, 42 + i * 20, 66, 12, { fill: CHALK, font: 'body' })).join('');
  s += line(24, 42, 96, 42, { stroke: CHALK, strokeWidth: 1.6 });
  s += rect(120, 40, 140, 50, { rx: 8, fill: MACHINE, stroke: MACHINE_D, strokeWidth: 3 });
  s += rect(110, 120, 210, 70, { rx: 6, fill: '#fff4d6', stroke: '#a07a3a', strokeWidth: 3 }) + rect(110, 112, 210, 10, { rx: 3, fill: '#3fae6a', stroke: '#1f6b3c', strokeWidth: 2 });
  s += [150, 200, 250].map((x) => cupShape(x, 112, 0.7)).join('');
  s += g({ transform: 'translate(292 150) scale(0.55)' }, npcFigure('Alfred', { mouth: 3, armL: 0.6 }));
  return s;
}

export default defineMovie({
  Headline: (m, w, h) => headline('Inselcafé', w, h),
  Intro: () => introScreen({
    id: 'gs81', device: 'mouse', picture: introPicture(),
    lines: [
      'Auf der Tafel stehen die Bestellungen der Gäste.',
      'Schalte die Maschine mit dem roten Knopf ein. Steht eine Tasse unter dem Hahn,',
      'klicke auf die passenden Getränke- und Zutatentaster. Für jedes richtige Getränk',
      'bekommst du eine Münze, für jedes falsche wird dir eine abgezogen. Viel Spaß!',
    ],
  }),
  Background: () => background(),
  '#4': () => tafel(),
  '#40': () => tafel(),
  'Kellner-*': (m) => kellner(m),
  Leitschiene: (m, w, h) => leitschiene(w, h),
  Tasse: (m) => cupShape(m.regX, m.regY, 1),
  'Taster Kakao': () => taster(TASTER.Kakao, true),
  'Taster Kaffee': () => taster(TASTER.Kaffee, true),
  'Taster Cappuccino': () => taster(TASTER.Cappuccino, true),
  'Taster Milch': () => taster(TASTER.Milch, true),
  'Taster Zucker': () => taster(TASTER.Zucker, true),
  Fass: (m, w, h) => fass(w, h),
  'Kaffee-Jet': (m, w, h) => jet('#6b3a1e', '#3a1e0e', w, h),
  'Milch-Jet': (m, w, h) => jet('#fbfbf6', '#9aa4b5', w, h),
  'Zucker-Piece': (m, w, h) => sugar(w, h),
  Mainswitch: (m, w, h) => mainswitch(w, h),
  Kreidenstrich: (m, w, h) => kreidenstrich(w, h),
  'Drink-*': (m, w, h) => drink(m, w, h),
});
