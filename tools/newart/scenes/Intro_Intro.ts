// Intro_Intro: title sequence – night-purple backdrop, palm fringe, title banner "Bongo auf Schatzsuche",
// Bongo (left) and Pucki (right) with eye overlays, treasure island picture (+ shadow/glow variants),
// rebuild credits instead of the original publisher logos.
//
// Stage positions (frame 128): Background 80,60 · Palmen 0,460 · Banner slides down to 214,-3 · Bingo 45,262,
// Bingo-Augen 87,303 (= +42,+41) · Puck 639,311, Puck-Augen 759,352 (= +120,+41) · island 212,192 ·
// credit cards 240,204 / 240,251 / 242,420.
import { defineMovie } from '../lib/api';
import { C, circle, defs, ellipse, g, linGrad, path, radGrad, rect, rng } from '../lib/svg';
import { bongoAt, goldText, palmFringe, puckiAt } from '../lib/menus';
import { bongoEyes } from '../lib/characters';
import { fitText, star } from '../lib/ui';

// Bongo in the 149x249 member: eyes centred in the Augen rect (42..103, 41..83)
const BK = 0.8, BX = 72.5 - 8.5 * BK, BY = 62 + 58 * BK;
const bongoBody = () => bongoAt(BX, BY, BK, { armL: 6, mouth: 3 });
// Pucki in the 138x196 member (ball left, arm waving)
const PK = 0.92, PX = 38, PY = 70;
const puckiBody = () => puckiAt(PX, PY, PK, { mouth: 3, armL: 3 });

function backdrop(w: number, h: number): string {
  const R = rng('intro');
  let s = defs(radGrad('ibg', [[0, '#5a48b8'], [0.6, '#2a1d6b'], [1, '#140c40']], 0.5, 0.45, 0.75)) + rect(0, 0, w, h, { fill: 'url(#ibg)' });
  for (let i = 0; i < 10; i++) s += ellipse(R() * w, R() * h, 60 + R() * 120, 30 + R() * 60, { fill: '#7a6ad8', opacity: 0.08 + R() * 0.08 });
  for (let i = 0; i < 70; i++) s += circle(R() * w, R() * h, 0.7 + R() * 1.6, { fill: '#fff', opacity: 0.3 + R() * 0.6 });
  s += star(560, 70, 9, C.yellow, C.yellowDark, 1.5) + star(90, 120, 6, C.yellow, C.yellowDark, 1.2);
  return s;
}

function banner(w: number, h: number): string {
  const cx = w / 2;
  let s = defs(linGrad('bn', [[0, '#2a3a8a'], [1, '#1a2460']]));
  s += path(`M4 4 H${w - 4} V40 A${w / 2 - 4} ${h - 44} 0 0 1 4 40 Z`, { fill: 'url(#bn)', stroke: '#fff', strokeWidth: 4 });
  const letters = [['B', '#7cc84a'], ['O', C.yellow], ['N', '#ff9447'], ['G', '#e8483f'], ['O', '#4fa8f0']];
  letters.forEach(([ch, col], i) => {
    const x = cx - 120 + i * 60, y = 64 + (i % 2 ? -4 : 4);
    s += g({ transform: `rotate(${(i - 2) * 4} ${x} ${y})` }, fitText(ch, x, y, 70, 74, { fill: col, anchor: 'middle', stroke: '#0e1440', sw: 7 }), fitText(ch, x - 2, y - 3, 70, 74, { fill: col, anchor: 'middle' }));
  });
  // "AUF SCHATZSUCHE" along an arc
  s += `<defs><path id="barc" d="M50 110 Q${cx} 175 ${w - 50} 110"/></defs>`;
  s += `<text font-family="'Baloo 2'" font-weight="800" font-size="30" fill="${C.yellow}" stroke="#0e1440" stroke-width="4" paint-order="stroke" text-anchor="middle" letter-spacing="2"><textPath href="#barc" startOffset="50%">AUF SCHATZSUCHE</textPath></text>`;
  return s;
}

function island(w: number, h: number, mode: 'pic' | 'shadow' | 'glow'): string {
  const R = rng('isl');
  // torn-paper edge
  const pts: string[] = [];
  const n = 40;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rx = w / 2 - 8 - R() * 8, ry = h / 2 - 8 - R() * 8;
    const k = 1 / Math.max(Math.abs(Math.cos(a)) ** 4 + Math.abs(Math.sin(a)) ** 4, 1e-6) ** 0.25;
    pts.push(`${(w / 2 + Math.cos(a) * rx * k).toFixed(1)},${(h / 2 + Math.sin(a) * ry * k).toFixed(1)}`);
  }
  const edge = `M${pts.join(' L')} Z`;
  if (mode === 'shadow') return `<defs><filter id="ish"><feGaussianBlur stdDeviation="5"/></filter></defs>` + path(edge, { fill: '#000', opacity: 0.5, filter: 'url(#ish)' });
  if (mode === 'glow') return `<defs><filter id="igl"><feGaussianBlur stdDeviation="7"/></filter></defs>` + path(edge, { fill: C.yellow, opacity: 0.7, filter: 'url(#igl)' });
  let s = `<defs><clipPath id="icl"><path d="${edge}"/></clipPath>${linGrad('isky', [[0, '#7fc8f5'], [1, '#d6f0ff']])}${linGrad('isea', [[0, '#5ad0c0'], [1, '#2f8fd8']])}</defs>`;
  let p = rect(0, 0, w, h, { fill: 'url(#isky)' });
  p += ellipse(90, 50, 40, 10, { fill: '#fff', opacity: 0.8 }) + ellipse(280, 40, 50, 12, { fill: '#fff', opacity: 0.8 });
  p += rect(0, 120, w, h, { fill: 'url(#isea)' });
  p += path('M20 140 Q60 70 120 90 Q170 30 230 70 Q300 60 350 140 Z', { fill: '#3f8f45', stroke: '#1f5a2a', strokeWidth: 3 });
  p += path('M60 140 Q100 100 150 115 Q200 80 260 110 Q300 115 320 140 Z', { fill: '#5fb85a' });
  for (let i = 0; i < 26; i++) p += circle(50 + R() * 270, 75 + R() * 55, 6 + R() * 6, { fill: i % 3 ? '#4fa64a' : '#e8483f', stroke: '#1f5a2a', strokeWidth: 1.5 });
  p += path('M160 60 q4 -20 -2 -36', { fill: 'none', stroke: '#6b4a30', strokeWidth: 4 }) + [[-20, 4], [18, 2], [-10, -8], [12, -10]].map(([dx, dy]) => path(`M158 24 q${dx / 2} ${dy - 8} ${dx} ${dy}`, { fill: 'none', stroke: '#2f7a3a', strokeWidth: 5, strokeLinecap: 'round' })).join('');
  p += path('M0 146 Q90 136 180 146 T375 144', { fill: 'none', stroke: '#fff', strokeWidth: 3, opacity: 0.7 });
  // little ship
  p += g({ transform: 'translate(220 170)' }, path('M-26 0 h52 l-8 14 h-36 z', { fill: C.woodMid, stroke: C.woodDeep, strokeWidth: 2.5 }), path('M0 0 v-38', { stroke: C.woodDeep, strokeWidth: 3 }), path('M2 -36 q18 12 0 30 z', { fill: '#fdf6e3', stroke: '#8a7040', strokeWidth: 2 }), path('M-2 -32 q-16 10 0 26 z', { fill: '#fdf6e3', stroke: '#8a7040', strokeWidth: 2 }));
  s += g({ 'clip-path': 'url(#icl)' }, p) + path(edge, { fill: 'none', stroke: '#fdf6e3', strokeWidth: 8, strokeLinejoin: 'round' });
  return s;
}

const credit = (lines: string[], w: number, h: number, size: number) =>
  lines.map((l, i) => (i === 0 ? goldText(l, w / 2, (h / (lines.length + 0.2)) * (i + 0.6), w - 6, size) : fitText(l, w / 2, (h / (lines.length + 0.2)) * (i + 0.6), w - 6, size * 0.8, { fill: '#fff', anchor: 'middle', font: 'body', stroke: '#140c40', sw: 4 }))).join('');

export default defineMovie({
  Background: (m, w, h) => backdrop(w, h),
  Palmen: (m, w, h) => palmFringe(w, h - 10, 'introPalmB', { top: false, shadow: false }) + palmFringe(w, h + 30, 'introPalm', { top: false, shadow: false }),
  'more software': (m, w, h) => credit(['Ein Fan-Projekt', 'Rebuild für den Browser'], w, h, 34),
  'Bingo Banner': (m, w, h) => banner(w, h),
  Bingo: (m, w, h) => bongoBody(),
  'Bingo-Augen': (m, w, h) => g({ transform: 'translate(-42 -41)' }, g({ transform: `translate(${BX} ${BY}) scale(${BK})` }, bongoEyes(1, 4))),
  Puck: (m, w, h) => puckiBody(),
  'Puck-Augen': (m, w, h) => g({ transform: 'translate(-120 -41)' }, puckiBody()),
  Ensslin: (m, w, h) => credit(['nach dem Original von', 'Outline Multimedia / more software (2001)'], w, h, 26),
  Schatzinsel: (m, w, h) => island(w, h, 'pic'),
  'Schatzinsel Schatten': (m, w, h) => island(w, h, 'shadow'),
  'Schatzinsel Leuchten': (m, w, h) => island(w, h, 'glow'),
  Outline: (m, w, h) => fitText('Grafik & Code: mit KI (Claude) erstellt', w / 2, h / 2 + 1, w - 6, 20, { fill: '#fff', anchor: 'middle', font: 'body', stroke: '#140c40', sw: 3 }),
});
