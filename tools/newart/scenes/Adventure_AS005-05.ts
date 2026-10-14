// AS005-05 "Leuchtturm" cellar: metal cabinet (Schrank 117,190, 11 frames, blocked by key OI068) with three fuses and a
// wrench inside, barred passage (Gitter 321,243) with a torch behind (Fackel 327,245, 21-frame loop) → AS005-07,
// ceiling hatch (Luke 430,87, 6 frames) → AS005-03, wall lever (Hebel 566,247), pipe on the ceiling (Rohr 186,155 +
// Rohr Composing 110,142), ladder lying on the floor (Leiter-1) / leaning to the hatch (Leiter-2).
import { defineMovie } from '../lib/api';
import { itemShape } from '../lib/items';
import { inScene } from '../lib/stageloc';
import { C, circle, defs, dk, ellipse, g, linGrad, lt, path, r2, radGrad, rect } from '../lib/svg';
import { specklePattern } from '../lib/textures';
import { headline } from '../lib/ui';

const PIPE = '#d09a3a', PIPE_D = '#7a5414';

function pipeLine(d: string, w = 12): string {
  return path(d, { fill: 'none', stroke: PIPE_D, strokeWidth: w + 6, strokeLinecap: 'round', strokeLinejoin: 'round' }) +
    path(d, { fill: 'none', stroke: PIPE, strokeWidth: w, strokeLinecap: 'round', strokeLinejoin: 'round' }) +
    path(d, { fill: 'none', stroke: lt(PIPE, 0.45), strokeWidth: w * 0.3, strokeLinecap: 'round', strokeLinejoin: 'round', transform: `translate(-2 -2)` });
}

function background(w: number, h: number): string {
  let s = defs(
    specklePattern('moss', { base: '#8aa860', speck: '#5e7a3a', seed: 12, size: 60 }),
    specklePattern('ceil', { base: '#5e7040', speck: '#3e5028', seed: 13, size: 60 }),
    specklePattern('flo', { base: '#7a9a50', speck: '#5a7a3a', seed: 14, size: 60 }),
    radGrad('torch', [[0, '#ffd25a', 0.9], [1, '#ffd25a', 0]]),
  );
  // ceiling, walls, floor (room seen into the right corner)
  s += rect(0, 0, w, h, { fill: 'url(#moss)' });
  s += path('M0 0 H800 V80 L580 160 H0 Z', { fill: 'url(#ceil)' });
  s += path('M0 132 H580 L800 80', { fill: 'none', stroke: '#3e5028', strokeWidth: 5 });
  s += path('M580 160 V390', { stroke: '#4e6430', strokeWidth: 4 });
  s += path('M580 160 L800 80 V448 L580 390 Z', { fill: '#000', opacity: 0.1 });
  s += path('M0 390 H580 L800 448 H0 Z', { fill: 'url(#flo)' }) + path('M0 390 H580 L800 448', { fill: 'none', stroke: '#3e5028', strokeWidth: 4 });
  // ceiling opening frame (hatch sprite closes it)
  s += path('M444 92 H668 L640 128 H470 Z', { fill: '#2a2418', stroke: '#3e5028', strokeWidth: 4 });
  // pipes: left vertical + top run on the back wall (the removable piece is the Rohr sprite)
  s += pipeLine('M34 395 V160 H110') + pipeLine('M330 172 H560 Q585 172 585 196 V388');
  s += rect(26, 150, 18, 20, { rx: 4, fill: PIPE, stroke: PIPE_D, strokeWidth: 3 });
  // cabinet interior (the doors are the Schrank sprite)
  s += rect(120, 196, 146, 200, { fill: '#2a3034', stroke: '#15181a', strokeWidth: 4 });
  s += rect(132, 250, 122, 44, { rx: 4, fill: '#4a5258', stroke: '#15181a', strokeWidth: 3 }); // fuse panel
  for (const x of [165, 199, 232]) s += rect(x - 9, 262, 18, 20, { rx: 3, fill: '#1a1d20' });
  s += rect(126, 326, 134, 6, { fill: '#5a6268' }) + rect(126, 220, 134, 6, { fill: '#5a6268' });
  // passage behind the grate: dark tunnel with warm torch light
  s += path('M318 384 V246 H438 V384 Z', { fill: '#3a2a10', stroke: '#2a3018', strokeWidth: 5 });
  s += circle(345, 270, 60, { fill: 'url(#torch)' });
  s += path('M330 384 L360 300 H410 L430 384 Z', { fill: '#6a4a1a', opacity: 0.6 });
  s += rect(340, 282, 10, 24, { fill: '#5a3418', stroke: '#2a1a08', strokeWidth: 2 }); // torch holder
  // metal bin
  s += ellipse(512, 328, 26, 7, { fill: '#5a5f68', stroke: '#2a2c33', strokeWidth: 3 }) +
    path('M486 328 V388 Q512 398 538 388 V328', { fill: '#6a707a', stroke: '#2a2c33', strokeWidth: 3 }) +
    path('M486 344 Q512 352 538 344 M486 370 Q512 378 538 370', { fill: 'none', stroke: '#2a2c33', strokeWidth: 2.5 }) +
    ellipse(530, 392, 30, 6, { fill: '#000', opacity: 0.2 });
  // lever plate (lever = sprite)
  s += path('M582 270 L606 262 V300 L582 306 Z', { fill: '#3a3d44', stroke: '#15181a', strokeWidth: 3 });
  return s;
}

/** cabinet doors (two leaves, both swing open towards the viewer); f 1 … 11 */
function cabinet(f: number): string {
  const t = (f - 1) / 10;
  const k = Math.cos(t * Math.PI * 0.47);
  const steel = '#9ab4c0', dkS = '#3a4a52';
  const x0 = 118, x1 = 268, xm = 193, y0 = 194, y1 = 398;
  let s = rect(x0 - 4, y0 - 6, x1 - x0 + 8, 8, { fill: '#7a8e98', stroke: dkS, strokeWidth: 3 });
  s += path(`M${x0 - 4} ${y0} V${y1 + 2} M${x1 + 4} ${y0} V${y1 + 2}`, { stroke: '#7a8e98', strokeWidth: 8 });
  // left leaf hinged at x0, right leaf hinged at x1
  const lw = (xm - x0) * k, rw = (x1 - xm) * k, grow = 8 * (1 - k);
  const shade = dk(steel, 0.25 * t);
  s += path(`M${x0} ${y0} L${r2(x0 + lw)} ${r2(y0 - grow)} V${r2(y1 + grow)} L${x0} ${y1} Z`, { fill: shade, stroke: dkS, strokeWidth: 3.5, strokeLinejoin: 'round' });
  s += path(`M${x1} ${y0} L${r2(x1 - rw)} ${r2(y0 - grow)} V${r2(y1 + grow)} L${x1} ${y1} Z`, { fill: dk(steel, 0.12 + 0.25 * t), stroke: dkS, strokeWidth: 3.5, strokeLinejoin: 'round' });
  if (k > 0.4) {
    s += rect(x1 - rw + 8 * k, y0 + 12, rw - 16 * k, y1 - y0 - 24, { rx: 4, fill: 'none', stroke: lt(steel, 0.3), strokeWidth: 2.5 });
    s += rect(x0 + 8 * k, y0 + 12, lw - 16 * k, y1 - y0 - 24, { rx: 4, fill: 'none', stroke: lt(steel, 0.3), strokeWidth: 2.5 });
    s += ellipse(x1 - rw + 16 * k, 296, 4 * k + 1, 6, { fill: '#1a1d20' }) + rect(x1 - rw + 15 * k, 300, 2 * k + 1, 9, { fill: '#1a1d20' });
  }
  return s;
}

function grate(): string {
  let s = path('M322 248 H434 M322 362 H434', { stroke: '#5a5a5a', strokeWidth: 9, strokeLinecap: 'round' });
  for (let x = 336; x < 430; x += 15) s += path(`M${x} 246 V366`, { stroke: '#3a3a3a', strokeWidth: 7, strokeLinecap: 'round' }) + path(`M${x - 1} 246 V366`, { stroke: '#a8a8a8', strokeWidth: 3, strokeLinecap: 'round' });
  return s;
}

function flame(f: number): string {
  const ph = ((f - 1) / 21) * Math.PI * 2;
  const sx = 1 + 0.12 * Math.sin(ph * 2), lean = 4 * Math.sin(ph);
  return g({ transform: `translate(345 284) scale(${r2(sx)} ${r2(2 - sx)})` },
    path(`M-9 0 Q-12 -14 ${r2(lean)} -34 Q12 -14 9 0 Z`, { fill: '#ff8a2a', stroke: '#c84a10', strokeWidth: 2 }),
    path(`M-5 0 Q-6 -10 ${r2(lean * 0.7)} -22 Q6 -10 5 0 Z`, { fill: '#ffd25a' }));
}

function hatch(f: number): string {
  // hinge at the left edge of the opening (444..668 x 92..128); hangs down further each frame
  const t = (f - 1) / 5;
  const a = t * Math.PI * 0.42;
  const L = 200;
  const hx = 458, hy = 112;
  const fx = hx + L * Math.cos(a), fy = hy + L * Math.sin(a) * 1.1;
  let s = '';
  if (t > 0) s += path('M444 92 H668 L640 128 H470 Z', { fill: '#1a140a' });
  const wood = '#a8743f';
  s += path(`M${hx} ${hy - 14} L${r2(fx + 10)} ${r2(fy - 14 - 6 * (1 - t))} L${r2(fx + 10)} ${r2(fy + 4)} L${hx} ${hy + 8} Z`, { fill: dk(wood, 0.15 * t), stroke: '#4a2a10', strokeWidth: 4, strokeLinejoin: 'round' });
  s += path(`M${hx} ${hy - 3} L${r2(fx + 10)} ${r2(fy - 4)}`, { stroke: '#6b4422', strokeWidth: 2.5 });
  if (t === 0) s += path('M444 92 H668 L640 128 H470 Z', { fill: wood, stroke: '#4a2a10', strokeWidth: 4, strokeLinejoin: 'round' }) + path('M456 110 H654', { stroke: '#6b4422', strokeWidth: 3 });
  return s;
}

function wallLever(f: number): string {
  const a = ((-40 + ((f - 1) / 5) * 100) * Math.PI) / 180; // pointing up-left → down-left
  const px = 594, py = 284;
  const ex = px - Math.cos(a) * 24, ey = py + Math.sin(a) * 28;
  return path(`M${px} ${py} L${r2(ex)} ${r2(ey)}`, { stroke: '#2a2a2a', strokeWidth: 6, strokeLinecap: 'round' }) +
    circle(ex, ey, 6, { fill: C.red, stroke: C.redDark, strokeWidth: 2 }) + circle(px, py, 5, { fill: '#555', stroke: '#111', strokeWidth: 2 });
}

function ladder(x0: number, y0: number, x1: number, y1: number, wd: number, rungs: number): string {
  const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy);
  const nx = (-dy / len) * wd, ny = (dx / len) * wd;
  const rail = (ox: number, oy: number) => path(`M${r2(x0 + ox)} ${r2(y0 + oy)} L${r2(x1 + ox)} ${r2(y1 + oy)}`, { stroke: '#7a6a3a', strokeWidth: 9, strokeLinecap: 'round' }) + path(`M${r2(x0 + ox)} ${r2(y0 + oy)} L${r2(x1 + ox)} ${r2(y1 + oy)}`, { stroke: '#e8d8a0', strokeWidth: 4, strokeLinecap: 'round' });
  let s = rail(0, 0) + rail(nx, ny);
  for (let i = 1; i < rungs; i++) { const t = i / rungs; s += path(`M${r2(x0 + dx * t)} ${r2(y0 + dy * t)} l${r2(nx)} ${r2(ny)}`, { stroke: '#7a6a3a', strokeWidth: 5, strokeLinecap: 'round' }); }
  return s;
}

const item = (id: string, w: number, h: number, rot = 0, sc = 1) => g({ transform: `translate(${w / 2} ${h / 2}) rotate(${rot}) scale(${r2((Math.min(w, h) / 64) * sc)})` }, itemShape(id));

export default defineMovie({
  Headline: (m, w, h) => headline('Leuchtturm', w, h),
  Background: (m, w, h) => background(w, h),
  'Schrank-*': (m) => inScene(m, cabinet(m.frame ?? 1)),
  Gitter: (m) => inScene(m, grate()),
  'Fackel-*': (m) => inScene(m, flame(m.frame ?? 1)),
  'Luke-*': (m) => inScene(m, hatch(m.frame ?? 1)),
  'Hebel-*': (m) => inScene(m, wallLever(m.frame ?? 1)),
  Rohr: (m, w, h) => pipeLine(`M8 ${h / 2} H${w - 8}`, 10) + rect(w - 14, 2, 12, h - 4, { rx: 3, fill: PIPE, stroke: PIPE_D, strokeWidth: 2.5 }),
  'Rohr Composing': (m) => inScene(m, pipeLine('M110 160 H160') + rect(150, 150, 16, 20, { rx: 4, fill: PIPE, stroke: PIPE_D, strokeWidth: 3 })),
  'Sicherung 1': (m, w, h) => item('OI018', w, h, 0, 1.2),
  'Sicherung 2': (m, w, h) => item('OI018', w, h, 0, 1.2),
  'Sicherung 3': (m, w, h) => item('OI018', w, h, 0, 1.2),
  '#47': (m, w, h) => g({ transform: `translate(${w / 2} ${h / 2}) rotate(40) scale(0.95 0.8)` }, itemShape('OI017')),
  'Leiter-1': (m) => inScene(m, ladder(590, 392, 768, 372, 22, 9)),
  'Leiter-2': (m) => inScene(m, ladder(492, 404, 574, 180, 26, 8)),
});
