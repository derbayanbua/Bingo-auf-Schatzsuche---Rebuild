// Interface_Lessons: "Lernen" menu – four lesson plates (board, crate, talking, mouse).
import { defineMovie } from '../lib/api';
import { C, circle, dk, ellipse, g, path, rect } from '../lib/svg';
import { choice, menuBackdrop } from '../lib/menus';
import { boardPoint, headline, pill } from '../lib/ui';

const iconBoard = (cx: number, cy: number, r: number) =>
  rect(cx - r, cy - r, r * 2, r * 2, { fill: C.grass }) +
  path(`M${cx - r} ${cy + r * 0.2} Q${cx} ${cy - r * 0.5} ${cx + r} ${cy + r * 0.1}`, { fill: 'none', stroke: C.stone, strokeWidth: r * 0.35 }) +
  [-0.55, 0, 0.55].map((t) => g({ transform: `translate(${cx + t * r - r * 0.2} ${cy - r * 0.12 - (t === 0 ? r * 0.25 : 0) + Math.abs(t) * r * 0.1}) scale(${r * 0.4 / 50})` }, boardPoint(t === 0 ? 'Red' : 'Blue', 0, 50, 50))).join('');
const iconCrate = (cx: number, cy: number, r: number) =>
  rect(cx - r * 0.6, cy - r * 0.35, r * 1.2, r * 0.9, { fill: C.wood, stroke: C.woodDeep, strokeWidth: 3 }) +
  path(`M${cx - r * 0.6} ${cy - r * 0.05} h${r * 1.2} M${cx - r * 0.6} ${cy + r * 0.25} h${r * 1.2}`, { stroke: C.woodDeep, strokeWidth: 2 }) +
  path(`M${cx - r * 0.6} ${cy - r * 0.35} l${r * 0.25} ${-r * 0.4} h${r * 1.2} l${-r * 0.25} ${r * 0.4} z`, { fill: dk(C.wood, 0.1), stroke: C.woodDeep, strokeWidth: 3, strokeLinejoin: 'round' }) +
  rect(cx - r * 0.1, cy - r * 0.95, r * 0.12, r * 0.6, { fill: '#c8ccd6', stroke: '#4d5560', strokeWidth: 2, transform: `rotate(20 ${cx} ${cy})` });
const iconTalk = (cx: number, cy: number, r: number) =>
  path(`M${cx - r * 0.75} ${cy - r * 0.55} h${r * 1.0} q${r * 0.2} 0 ${r * 0.2} ${r * 0.2} v${r * 0.4} q0 ${r * 0.2} ${-r * 0.2} ${r * 0.2} h${-r * 0.5} l${-r * 0.3} ${r * 0.25} v${-r * 0.25} h${-r * 0.2} q${-r * 0.2} 0 ${-r * 0.2} ${-r * 0.2} v${-r * 0.4} q0 ${-r * 0.2} ${r * 0.2} ${-r * 0.2} z`, { fill: '#fff', stroke: C.ink, strokeWidth: 3, strokeLinejoin: 'round' }) +
  circle(cx + r * 0.35, cy + r * 0.45, r * 0.32, { fill: C.yellow, stroke: C.yellowDark, strokeWidth: 2.5 }) + circle(cx + r * 0.1, cy + r * 0.2, r * 0.09, { fill: C.yellow, stroke: C.yellowDark, strokeWidth: 1.5 }) +
  [-0.45, -0.2, 0.05].map((t) => circle(cx + t * r, cy - r * 0.25, r * 0.07, { fill: C.ink })).join('');
const iconMouse = (cx: number, cy: number, r: number) =>
  ellipse(cx + r * 0.15, cy + r * 0.62, r * 0.45, r * 0.1, { fill: '#000', opacity: 0.2 }) +
  circle(cx + r * 0.15, cy + r * 0.2, r * 0.38, { fill: '#ff8a3c', stroke: '#8a3a10', strokeWidth: 3 }) +
  path(`M${cx - r * 0.2} ${cy + r * 0.2} h${r * 0.7} M${cx + r * 0.15} ${cy - r * 0.18} v${r * 0.76}`, { stroke: '#8a3a10', strokeWidth: 2 }) +
  path(`M${cx - r * 0.55} ${cy - r * 0.7} l0 ${r * 0.75} l${r * 0.2} ${-r * 0.18} l${r * 0.15} ${r * 0.3} l${r * 0.12} ${-r * 0.06} l${-r * 0.15} ${-r * 0.3} l${r * 0.27} ${-r * 0.02} z`, { fill: '#fff', stroke: C.ink, strokeWidth: 2.5, strokeLinejoin: 'round' });

export default defineMovie({
  Headline: (m, w, h) => headline('Lernen', w, h),
  Backdrop: (m, w, h) => menuBackdrop(w, h, 'lessons'),
  'Lektion-1': (m, w, h) => choice(w, h, 'l1', ['Lektion 1', 'Das Spielbrett'], iconBoard, '#bfe6a0'),
  'Lektion-2': (m, w, h) => choice(w, h, 'l2', ['Lektion 2', 'Gegenstände'], iconCrate, '#ffe9a8'),
  'Lektion-3': (m, w, h) => choice(w, h, 'l3', ['Lektion 3', 'Reden & Geben'], iconTalk, '#d6f0ff'),
  'Lektion-4': (m, w, h) => choice(w, h, 'l4', ['Lektion 4', 'Die Maus'], iconMouse, '#f0e0ff'),
  Main: (m, w, h) => pill('Hauptauswahl', w, h),
});
