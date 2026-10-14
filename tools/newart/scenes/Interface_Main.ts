// Interface_Main (main menu movie): sunset sky, sea band, message bottle, Bongo on the springboard
// (Sprung-1..30 jump, Drehen-1..6 turn; loc = Bongo's mouth at rest, shared by Mund-1..5), menu bubbles.
import { defineMovie, type Member } from '../lib/api';
import { bongo, bongoEyes, bongoMouth } from '../lib/characters';
import { C, circle, defs, g, linGrad, lt, path, r2, rect, rng } from '../lib/svg';
import { dieFace, headline, pill, star } from '../lib/ui';

const K = 0.42; // Bongo scale in the menu
const BX = -9.5 - 10.5 * K, BY = 7.5 - 6 * K; // Bongo origin so that his mouth sits on the loc

function background(w: number, h: number): string {
  const R = rng('menu');
  let s = defs(linGrad('msky', [[0, '#2a1d6b'], [0.55, '#7a4aa8'], [0.85, '#ff9a6a'], [1, '#ffd23f']]));
  s += rect(0, 0, w, h, { fill: 'url(#msky)' });
  for (let i = 0; i < 40; i++) s += star(R() * w, R() * h * 0.5, 1.5 + R() * 3, C.white, C.white, 0.2).replace('<polygon', `<polygon opacity="${(0.4 + R() * 0.5).toFixed(2)}"`);
  // sun on the horizon + island silhouette with palm
  s += circle(470, 420, 60, { fill: '#ffd23f', opacity: 0.95 }) + circle(470, 420, 78, { fill: '#ffd23f', opacity: 0.25 });
  s += path('M380 430 q60 -40 130 -10 q40 -20 90 0 V480 H380 Z', { fill: '#3a2a6a' });
  s += path('M520 412 q-6 -40 4 -70', { fill: 'none', stroke: '#3a2a6a', strokeWidth: 7, strokeLinecap: 'round' }) +
    [[-40, -6], [-30, 14], [30, -8], [36, 12], [0, -24]].map(([dx, dy]) => path(`M524 342 q${dx / 2} ${dy - 16} ${dx} ${dy}`, { fill: 'none', stroke: '#3a2a6a', strokeWidth: 8, strokeLinecap: 'round' })).join('');
  s += rect(0, 430, w, 50, { fill: '#3f6fd8' }) + path(`M0 430 h${w}`, { stroke: '#ffd9a0', strokeWidth: 3, opacity: 0.8 });
  // bubbles
  for (let i = 0; i < 14; i++) {
    const x = R() * w, y = 60 + R() * 340, r = 4 + R() * 9;
    s += circle(x, y, r, { fill: 'none', stroke: C.white, strokeWidth: 1.5, opacity: 0.35 }) + circle(x - r * 0.3, y - r * 0.3, r * 0.25, { fill: C.white, opacity: 0.4 });
  }
  return s;
}

function sea(w: number, h: number, front = false): string {
  const id = front ? 'wv' : 'sea';
  const top = front ? 22 : 18;
  let d = `M0 ${top}`;
  for (let x = 0; x <= w; x += 60) d += ` q15 -12 30 0 t30 0`;
  d += ` V${h} H0 Z`;
  return defs(linGrad(id, [[0, front ? '#5aa0f0' : '#3f86e0'], [1, front ? '#2f6fd8' : '#1d4fa0']])) +
    path(d, { fill: `url(#${id})`, stroke: '#173f86', strokeWidth: 3 }) +
    path(d.replace(/ V.*$/, ''), { fill: 'none', stroke: C.white, strokeWidth: 4, opacity: 0.6, transform: 'translate(0 4)' });
}

function bottle(m: Member, w: number, h: number): string {
  const f = m.frame ?? 1;
  const ang = 30 * Math.cos((2 * Math.PI * (f - 1)) / 20);
  return g({ transform: `translate(${m.regX} ${m.regY}) rotate(${r2(ang)})` },
    path('M-14 -100 h28 v26 q34 16 34 54 v96 q0 16 -16 16 h-64 q-16 0 -16 -16 v-96 q0 -38 34 -54 z', { fill: '#7fd0a8', stroke: C.greenDark, strokeWidth: 4, opacity: 0.92 }),
    rect(-12, -112, 24, 18, { rx: 4, fill: '#c48a4a', stroke: C.woodDeep, strokeWidth: 3 }),
    path('M-24 -10 h48 v60 h-48 z', { fill: '#fff3c8', stroke: '#a0782a', strokeWidth: 3 }),
    path('M-16 4 h32 M-16 16 h32 M-16 28 h22', { stroke: '#a0782a', strokeWidth: 2.5, strokeLinecap: 'round' }),
    path('M-30 -20 v80', { stroke: C.white, strokeWidth: 6, strokeLinecap: 'round', opacity: 0.5 }));
}

/** springboard + Bongo; dy = vertical offset of Bongo, bend = how far the board end is pressed down */
function springboard(m: Member, w: number, h: number, dy: number, bend: number, pose: { armL?: number; armR?: number; mouth?: number; turn?: number }): string {
  const endY = 58 + bend;
  const board = path(`M-98 112 Q-40 ${r2(70 + bend * 0.4)} 30 ${r2(endY)} l4 10 Q-40 ${r2(82 + bend * 0.4)} -96 122 z`, { fill: '#e0b070', stroke: C.woodDeep, strokeWidth: 3, strokeLinejoin: 'round' }) +
    rect(-60, 92, 16, 30, { rx: 3, fill: C.woodMid, stroke: C.woodDeep, strokeWidth: 2.5 });
  const turn = pose.turn ?? 1;
  const fig = g({ transform: `translate(${r2(BX)} ${r2(BY + dy)}) scale(${r2(K * turn)} ${K})` }, bongo(K, { armL: pose.armL, armR: pose.armR, mouth: pose.mouth }));
  return g({ transform: `translate(${m.regX} ${m.regY})` }, board, fig);
}

function sprung(m: Member, w: number, h: number): string {
  const f = m.frame ?? 1;
  const dy = (47 - m.regY) * 0.95;
  const air = dy < -10;
  return springboard(m, w, h, dy, Math.max(0, dy), { armL: air ? 6 : 1, armR: air ? 6 : 1, mouth: air ? 3 : f > 1 && f < 6 ? 2 : 1 });
}

function drehen(m: Member, w: number, h: number): string {
  const t = ((m.frame ?? 1) - 1) / 5;
  return springboard(m, w, h, 0, 0, { turn: Math.max(0.15, Math.cos(t * Math.PI)) * (t > 0.5 ? -1 : 1), armL: 3, armR: 3 });
}

/** menu bubble button: plate with icon + label (Spielen / Lernen / Krimskrams / Einstellungen) */
function menuDrop(label: string, icon: (cx: number, cy: number, r: number) => string) {
  return (m: Member, w: number, h: number) => {
    const r = Math.min(w, h - 24) / 2 - 3;
    const cx = w / 2, cy = r + 3;
    return circle(cx, cy, r, { fill: lt(C.uiLight, 0.15), stroke: C.uiDark, strokeWidth: 3.5 }) +
      circle(cx, cy, r - 7, { fill: lt(C.uiLight, 0.35) }) +
      path(`M${cx - r * 0.55} ${cy - r * 0.4} q${r * 0.3} ${-r * 0.35} ${r * 0.7} ${-r * 0.3}`, { fill: 'none', stroke: C.white, strokeWidth: 4, strokeLinecap: 'round', opacity: 0.6 }) +
      icon(cx, cy, r * 0.62) + g({ transform: `translate(0 ${h - 24})` }, pill(label, w, 24));
  };
}

const iconDice = (cx: number, cy: number, r: number) => g({ transform: `translate(${cx - r} ${cy - r * 0.9}) rotate(-10 ${r} ${r})` }, dieFace(5, r * 1.15, r * 1.15)) + g({ transform: `translate(${cx - r * 0.1} ${cy - r * 0.1}) rotate(12 ${r * 0.5} ${r * 0.5})` }, dieFace(3, r, r));
const iconBook = (cx: number, cy: number, r: number) => path(`M${cx} ${cy - r * 0.6} q${-r * 0.5} ${-r * 0.3} ${-r} 0 v${r * 1.3} q${r * 0.5} ${-r * 0.3} ${r} 0 q${r * 0.5} ${-r * 0.3} ${r} 0 v${-r * 1.3} q${-r * 0.5} ${-r * 0.3} ${-r} 0 z`, { fill: C.white, stroke: C.ink, strokeWidth: 3, strokeLinejoin: 'round' }) + path(`M${cx} ${cy - r * 0.6} v${r * 1.3}`, { stroke: C.ink, strokeWidth: 2.5 }) + path(`M${cx - r * 0.75} ${cy - r * 0.2} h${r * 0.5} M${cx - r * 0.75} ${cy + r * 0.1} h${r * 0.5} M${cx + r * 0.25} ${cy - r * 0.2} h${r * 0.5}`, { stroke: C.blue, strokeWidth: 2.5, strokeLinecap: 'round' });
const iconChest = (cx: number, cy: number, r: number) => rect(cx - r, cy - r * 0.2, r * 2, r * 1.1, { rx: 4, fill: C.wood, stroke: C.woodDeep, strokeWidth: 3 }) + path(`M${cx - r} ${cy - r * 0.2} q0 ${-r * 0.8} ${r} ${-r * 0.8} q${r} 0 ${r} ${r * 0.8} z`, { fill: lt(C.wood, 0.15), stroke: C.woodDeep, strokeWidth: 3 }) + rect(cx - r * 0.18, cy - r * 0.35, r * 0.36, r * 0.45, { rx: 2, fill: C.yellow, stroke: C.yellowDark, strokeWidth: 2 }) + path(`M${cx - r} ${cy + r * 0.4} h${r * 2}`, { stroke: C.yellow, strokeWidth: 3 });
const iconGear = (cx: number, cy: number, r: number) => {
  let teeth = '';
  for (let i = 0; i < 8; i++) teeth += rect(cx - r * 0.18, cy - r * 1.05, r * 0.36, r * 0.4, { rx: 2, fill: '#c8ccd6', stroke: '#4d5560', strokeWidth: 2.5, transform: `rotate(${i * 45} ${cx} ${cy})` });
  return teeth + circle(cx, cy, r * 0.78, { fill: '#c8ccd6', stroke: '#4d5560', strokeWidth: 3 }) + circle(cx, cy, r * 0.3, { fill: C.uiLight, stroke: '#4d5560', strokeWidth: 2.5 });
};

export default defineMovie({
  Background: (m, w, h) => background(w, h),
  Headline: (m, w, h) => headline('Hauptauswahl', w, h),
  Meer: (m, w, h) => sea(w, h),
  Welle: (m, w, h) => sea(w, h, true),
  '#5': menuDrop('Spielen', iconDice),
  '#6': menuDrop('Lernen', iconBook),
  '#7': menuDrop('Krimskrams', iconChest),
  '#8': menuDrop('Einstellungen', iconGear),
  Quit: (m, w, h) => pill('Ende', w, h),
  'Flaschenpost-*': bottle,
  'Sprung-*': sprung,
  'Drehen-*': drehen,
  // flying bandana tips at the top of the jump
  'Top-*': (m, w, h) => g({ transform: `translate(${w / 2} ${h / 2}) rotate(${((m.frame ?? 19) - 20) * 15})` },
    path('M-14 4 l14 -12 l14 12 l-14 4 z', { fill: C.bandana, stroke: C.bandanaDark, strokeWidth: 2.5, strokeLinejoin: 'round' }), circle(-4, 0, 2, { fill: C.white }), circle(5, 1, 2, { fill: C.white })),
  // talking mouth on the loc (Mund-4/5 = wider variants of 3)
  'Mund-*': (m, w, h) => g({ transform: `translate(${m.regX} ${m.regY}) translate(${r2(BX)} ${r2(BY)}) scale(${K})` }, bongoMouth(Math.min(3, m.frame ?? 1), 4 / Math.max(K, 0.01) * 0.3)),
  // eye pair (blink/look overlay, own loc): fitted into the canvas
  Augen: (m, w, h) => g({ transform: `translate(${r2(w / 2)} ${r2(h / 2)}) scale(${r2(Math.min(w / 58, h / 38))}) translate(-8.5 58)` }, bongoEyes(1, 3)),
});
