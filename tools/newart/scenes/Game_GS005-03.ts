// GS005-03 "Rohr abschrauben" – pipe with a flange on the cellar wall, three nuts (sprites 11-13, Schraube-1..10,
// locs (scene) 409,137 / 443,192 / 408,249), adjustable wrench (sprite 25, English-1..17, matte).
// English-1..6: jaw closes on the nut; 7..17: wrench turns counter-clockwise around the nut.
// Nut position relative to the wrench loc = (-129,-75) (snap: loc = hotspot loc + 42,32; hotspots 60x40 at screw + 121,76).
// Tube (ch 15, rect 0,0 483x390, shown when all nuts are off) = loosened pipe over the same wall.
import { atReg, defineMovie } from '../lib/api';
import { introScreen, mossWall } from '../lib/gs005a';
import { C, circle, defs, dk, ellipse, g, line, linGrad, lt, path, poly, rect } from '../lib/svg';
import { headline } from '../lib/ui';

const PIPE = '#e0a020', PIPE_D = '#8a5a08';
const NUTS: [number, number][] = [[409, 137], [443, 192], [408, 249]];
const FL = { x: 392, y: 193, rx: 70, ry: 84 };

function pipeDefs(id: string): string {
  return defs(linGrad(`${id}-p`, [[0, lt(PIPE, 0.35)], [0.45, PIPE], [1, dk(PIPE, 0.3)]]));
}

/** big pipe from the left + flange (holes only, the nuts are separate sprites) */
function bigPipe(id: string, dx: number, dy: number, rot: number, holes: boolean): string {
  const fl = { ...FL, x: FL.x + dx, y: FL.y + dy };
  let s = path(`M-20 ${70 + dy} L${fl.x - 10} ${fl.y - 40} V${fl.y + 38} L-20 ${262 + dy} z`, { fill: `url(#${id}-p)`, stroke: PIPE_D, strokeWidth: 5, strokeLinejoin: 'round' });
  s += path(`M0 ${100 + dy} L${fl.x - 30} ${fl.y - 26}`, { stroke: lt(PIPE, 0.6), strokeWidth: 6, strokeLinecap: 'round', opacity: 0.8 });
  s += path(`M60 ${150 + dy} q40 10 70 -4 M200 ${170 + dy} q30 8 50 -2`, { fill: 'none', stroke: dk(PIPE, 0.25), strokeWidth: 3, opacity: 0.5 });
  // flange: rim + face
  s += ellipse(fl.x - 14, fl.y, fl.rx - 10, fl.ry, { fill: dk(PIPE, 0.25), stroke: PIPE_D, strokeWidth: 5 });
  s += ellipse(fl.x, fl.y, fl.rx - 10, fl.ry, { fill: PIPE, stroke: PIPE_D, strokeWidth: 5 });
  s += path(`M${fl.x - 40} ${fl.y - 60} q20 -20 46 -20`, { fill: 'none', stroke: lt(PIPE, 0.6), strokeWidth: 5, strokeLinecap: 'round' });
  if (holes) for (const [x, y] of NUTS) s += circle(x + dx, y + dy, 9, { fill: '#3a2a08', stroke: PIPE_D, strokeWidth: 2 });
  s += ellipse(fl.x + 6, fl.y, 18, 22, { fill: dk(PIPE, 0.2), stroke: PIPE_D, strokeWidth: 3 });
  return rot ? g({ transform: `rotate(${rot} ${fl.x} ${fl.y})` }, s) : s;
}

function background(w: number, h: number): string {
  let s = pipeDefs('bg') + mossWall(w, h, 'bg');
  // shadow of the pipe on the wall
  s += path('M0 270 L360 240 L380 300 L0 330 z', { fill: '#000', opacity: 0.2 });
  // thin pipe to the small wall flange (behind the big flange)
  s += path(`M${FL.x} 182 L585 198 V214 L${FL.x} 212 z`, { fill: 'url(#bg-p)', stroke: PIPE_D, strokeWidth: 4, strokeLinejoin: 'round' });
  s += ellipse(582, 206, 12, 20, { fill: PIPE, stroke: PIPE_D, strokeWidth: 4 });
  for (const [x, y] of [[582, 192], [586, 206], [582, 220]]) s += circle(x, y, 2.5, { fill: '#3a2a08' });
  s += bigPipe('bg', 0, 0, 0, true);
  return s;
}

function tube(w: number, h: number): string {
  // same wall, pipe pulled away from the flange (sagging, gap) – no nuts any more
  let s = pipeDefs('tb') + mossWall(w, h, 'tb');
  s += path('M0 290 L330 262 L350 322 L0 350 z', { fill: '#000', opacity: 0.2 });
  // the fixed counter-flange stays on the wall pipe
  s += ellipse(FL.x + 24, FL.y, 22, 60, { fill: dk(PIPE, 0.2), stroke: PIPE_D, strokeWidth: 4 });
  s += path(`M${FL.x + 24} 182 L${w} 186 V214 L${FL.x + 24} 212 z`, { fill: 'url(#tb-p)', stroke: PIPE_D, strokeWidth: 4 });
  s += bigPipe('tb', -26, 22, 4, true);
  return s;
}

/** hexagon nut, frame 1..10 = rotation steps of 60/9 deg (counter-clockwise) */
function nut(frame: number, w: number, h: number): string {
  const a = (-(frame - 1) * 60) / 9;
  const r = 22;
  const pts: [number, number][] = Array.from({ length: 6 }, (_, i) => {
    const t = ((i * 60 + 30 + a) * Math.PI) / 180;
    return [w / 2 + Math.cos(t) * r, h / 2 + Math.sin(t) * r];
  });
  const sideA = ((a + 30) * Math.PI) / 180;
  return ellipse(w / 2 + 3, h / 2 + 4, r, r, { fill: '#000', opacity: 0.25 }) +
    poly(pts, { fill: '#5a5a66', stroke: '#1e1e26', strokeWidth: 3.5, strokeLinejoin: 'round' }) +
    circle(w / 2, h / 2, 13, { fill: '#7a7a88', stroke: '#2e2e38', strokeWidth: 2.5 }) +
    circle(w / 2, h / 2, 6, { fill: '#9a9aa8', stroke: '#2e2e38', strokeWidth: 2 }) +
    line(pts[3][0], pts[3][1], pts[4][0], pts[4][1], { stroke: '#b8b8c4', strokeWidth: 3, strokeLinecap: 'round' }) +
    path(`M${w / 2 + Math.cos(sideA) * 4} ${h / 2 + Math.sin(sideA) * 4} l${Math.cos(sideA) * 8} ${Math.sin(sideA) * 8}`, { stroke: '#2e2e38', strokeWidth: 2 });
}

/** adjustable wrench, origin = nut centre; jawOpen 0..1; handle points down at rot 0 */
function wrench(id: string, jawOpen: number, rot: number): string {
  const steel = '#a8acb8', steelD = '#4a4e5a';
  const lowY = 20 + jawOpen * 14;
  const body =
    // shank + head
    path('M24 -34 h34 q24 0 24 30 v64 q0 12 -10 14 l-6 60 h-36 l-6 -60 q-14 -4 -14 -18 v-56 z',
      { fill: steel, stroke: steelD, strokeWidth: 4, strokeLinejoin: 'round' }) +
    // fixed upper jaw (rounded tip over the nut)
    path('M-16 -30 q-2 10 8 10 h48 v-14 h-42 q-14 0 -14 4 z', { fill: lt(steel, 0.15), stroke: steelD, strokeWidth: 4, strokeLinejoin: 'round' }) +
    // moving lower jaw
    path(`M-18 ${lowY} h48 v22 h-30 q-20 0 -18 -22 z`, { fill: steel, stroke: steelD, strokeWidth: 4, strokeLinejoin: 'round' }) +
    // worm screw
    rect(32, lowY + 8, 26, 34, { rx: 5, fill: '#c8ccd6', stroke: steelD, strokeWidth: 3 }) +
    [0, 1, 2, 3, 4].map((i) => line(34, lowY + 14 + i * 6, 56, lowY + 12 + i * 6, { stroke: steelD, strokeWidth: 2 })).join('') +
    path('M30 -29 h30', { stroke: C.white, strokeWidth: 3, strokeLinecap: 'round', opacity: 0.7 }) +
    // rubber handle
    rect(30, 70, 46, 160, { rx: 20, fill: '#2e2a33', stroke: '#0e0b12', strokeWidth: 4 }) +
    path('M40 86 V214', { stroke: '#5a5462', strokeWidth: 5, strokeLinecap: 'round' }) +
    [104, 134, 164, 194].map((y) => path(`M34 ${y} h38`, { stroke: '#0e0b12', strokeWidth: 2, opacity: 0.6 })).join('') +
    circle(53, 216, 5, { fill: '#5a5462', stroke: '#0e0b12', strokeWidth: 2 });
  return g({ transform: `rotate(${rot.toFixed(2)})` }, body) + `<!-- ${id} -->`;
}

function english(m: Parameters<typeof atReg>[0]): string {
  const f = m.frame ?? 1;
  const jaw = f <= 6 ? 1 - (f - 1) / 5 : 0;
  const rot = f <= 6 ? 0 : (-72 * (f - 6)) / 11;
  return atReg(m, g({ transform: 'translate(-129 -75)' }, wrench(`e${f}`, jaw, rot)));
}

function introPicture(): string {
  return g({ transform: 'scale(0.4) translate(-120 -30)' }, pipeDefs('ip') + mossWall(800, 600, 'ip') + bigPipe('ip', 0, 0, 0, true) +
    NUTS.map(([x, y]) => g({ transform: `translate(${x - 34} ${y - 33})` }, nut(1, 68, 66))).join('') +
    g({ transform: 'translate(560 230)' }, wrench('ip', 0.4, -20)));
}

export default defineMovie({
  Headline: (m, w, h) => headline('Rohr abschrauben', w, h),
  Intro: () => introScreen({
    id: 'gs53', device: 'mouse', picture: introPicture(),
    lines: [
      'Dieses Rohr könnten wir gut gebrauchen – vielleicht lässt sich damit eine Kiste aufhebeln?',
      'Löst du die drei Schrauben mit dem Schraubenschlüssel?',
    ],
    prefs: 'Für dieses Spiel brauchst du folgende Sachen – leg sie hier ab:',
  }),
  Background: (m, w, h) => background(w, h),
  Tube: (m, w, h) => tube(w, h),
  'Schraube-*': (m, w, h) => nut(m.frame ?? 1, w, h),
  'English-*': (m) => english(m),
});
