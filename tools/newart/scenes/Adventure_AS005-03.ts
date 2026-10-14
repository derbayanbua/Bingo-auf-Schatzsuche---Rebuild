// AS005-03 "Leuchtturm" ground floor: spiral stairs up (AS005-11), lever (Hebel 269,125, 6 frames) that opens the
// floor hatch (Luke 88,286 471x132, 6 frames, down to AS005-05), chest (Box-1 476,204; frames 2-6 = lid opening),
// code lock (Code 22,155 → GS005-02), ladder item (Leiter 155,182). Member "Box" = view into the open chest.
import { defineMovie } from '../lib/api';
import { chest, chestInside } from '../lib/chest';
import { inScene } from '../lib/stageloc';
import { brickLines } from '../lib/seaside';
import { C, circle, defs, dk, ellipse, g, linGrad, lt, path, r2, rect } from '../lib/svg';
import { specklePattern } from '../lib/textures';
import { headline } from '../lib/ui';

function background(w: number, h: number): string {
  let s = defs(specklePattern('fl', { base: '#9aa88a', speck: '#6e7a62', seed: 9, pebbles: 4 }), linGrad('wl', [[0, '#cfcac0'], [1, '#a8a296']]));
  s += rect(0, 0, w, h, { fill: 'url(#wl)' });
  s += brickLines(0, 0, 800, 100, 22, '#6e6a62', 0.5);
  // blue painted wall band
  s += path('M0 96 Q400 120 800 96 V280 H0 Z', { fill: '#4a4aa8' });
  s += brickLines(0, 100, 800, 280, 26, '#2a2a70', 0.5);
  s += path('M0 96 Q400 120 800 96', { fill: 'none', stroke: '#2a2a70', strokeWidth: 5 });
  // floor (round room)
  s += path('M0 270 Q400 290 800 270 V448 H0 Z', { fill: 'url(#fl)' });
  s += path('M0 270 Q400 290 800 270', { fill: 'none', stroke: '#4a4a40', strokeWidth: 4 });
  // spiral stairs (right) going up through the ceiling
  const steps: [number, number, number][] = [[600, 400, 200], [640, 340, 160], [660, 280, 140], [670, 220, 130], [660, 160, 140], [620, 100, 170], [560, 50, 190], [480, 10, 200], [360, -20, 180]];
  for (const [i, [x, y, ww]] of steps.entries()) {
    const col = i < 4 ? '#bdb6aa' : '#5a5650';
    s += path(`M${x} ${y} h${ww} v26 h${-ww} z`, { fill: col, stroke: '#3a3630', strokeWidth: 3 }) + rect(x, y, ww, 7, { fill: lt(col, 0.2) });
  }
  s += rect(730, 0, 70, 448, { fill: '#8a847a', stroke: '#3a3630', strokeWidth: 3 });
  // lever mount on the wall (lever is a sprite)
  s += rect(282, 140, 46, 70, { rx: 12, fill: '#2a2a30', stroke: '#111', strokeWidth: 3 });
  // code lock plate (code sprite on top)
  s += rect(16, 150, 112, 56, { rx: 6, fill: '#3a3a44', opacity: 0.5 });
  // shadow under the chest
  s += ellipse(560, 318, 90, 10, { fill: '#000', opacity: 0.25 });
  // closed chest (Box-1 draws the same on top)
  s += chest(547, 316, 130, 80, 60, 0, 'bgch');
  return s;
}

function lever(f: number): string {
  // pivot at the mount centre (305,182); 1 = down … 6 = up
  const a = 105 - ((f - 1) / 5) * 185; // degrees, 0 = right, 90 = down
  const rad = (a * Math.PI) / 180;
  const ex = 305 + Math.cos(rad) * 46 * 0.7, ey = 182 + Math.sin(rad) * 48;
  return path(`M305 182 L${r2(ex)} ${r2(ey)}`, { stroke: '#111', strokeWidth: 9, strokeLinecap: 'round' }) +
    path(`M305 182 L${r2(ex)} ${r2(ey)}`, { stroke: '#c9ccd2', strokeWidth: 4, strokeLinecap: 'round' }) +
    circle(ex, ey, 10, { fill: C.red, stroke: C.redDark, strokeWidth: 3 }) + circle(ex - 3, ey - 3, 3, { fill: C.white, opacity: 0.7 }) +
    circle(305, 182, 9, { fill: '#555', stroke: '#111', strokeWidth: 3 }) +
    path('M290 150 h30', { stroke: C.red, strokeWidth: 4 });
}

/** floor hatch (two leaves), t 0 closed … 1 open; area 100..550 × 300..412 */
function hatch(t: number): string {
  const wood = '#c8904a', wd = '#6b4422';
  const L = [[100, 412], [128, 304], [322, 300], [326, 412]] as [number, number][]; // left leaf (hinge left edge)
  const R = [[330, 412], [326, 300], [520, 296], [552, 408]] as [number, number][];
  let s = '';
  // hole
  if (t > 0) s += path('M102 412 L128 302 L520 296 L552 410 Z', { fill: '#1a1a14', stroke: '#3a3a30', strokeWidth: 4 }) +
    path('M140 330 L520 324 L536 400 L120 405 Z', { fill: '#2a2a20' });
  const a = t * Math.PI * 0.5;
  // left leaf rotates up about its left edge: free (right) edge goes up and left
  const lf = (p: [number, number], i: number) => (i < 2 ? p : [p[0] - (p[0] - 120) * (1 - Math.cos(a)), p[1] - 150 * Math.sin(a) * (i === 3 ? 1 : 0.85)] as [number, number]);
  const rf = (p: [number, number], i: number) => (i === 2 || i === 3 ? p : [p[0] + (540 - p[0]) * (1 - Math.cos(a)) * 0.9, p[1] - 150 * Math.sin(a) * (i === 0 ? 1 : 0.85)] as [number, number]);
  const leaf = (pts: [number, number][], col: string) => {
    const d = `M${pts.map((p) => `${r2(p[0])} ${r2(p[1])}`).join(' L')} Z`;
    return path(d, { fill: col, stroke: wd, strokeWidth: 4, strokeLinejoin: 'round' }) +
      path(`M${r2((pts[0][0] + pts[3][0]) / 2)} ${r2((pts[0][1] + pts[3][1]) / 2)} L${r2((pts[1][0] + pts[2][0]) / 2)} ${r2((pts[1][1] + pts[2][1]) / 2)}`, { stroke: dk(col, 0.3), strokeWidth: 2.5 });
  };
  const lp = L.map(lf), rp = R.map(rf);
  s += leaf(rp, dk(wood, 0.2 * t));
  s += leaf(lp, dk(wood, 0.25 * t));
  if (t < 0.3) for (const [x, y] of [[262, 355], [400, 350]]) s += ellipse(x, y, 16, 7, { fill: 'none', stroke: C.gold, strokeWidth: 5 }) + ellipse(x, y - 2, 6, 5, { fill: '#222' });
  return s;
}

function ladder(): string {
  const rail = (x0: number, y0: number, x1: number, y1: number) => path(`M${x0} ${y0} L${x1} ${y1}`, { stroke: '#7a5a2a', strokeWidth: 10, strokeLinecap: 'round' }) + path(`M${x0} ${y0} L${x1} ${y1}`, { stroke: '#e0c080', strokeWidth: 5, strokeLinecap: 'round' });
  let s = rail(170, 418, 230, 190) + rail(214, 420, 278, 194);
  for (let i = 1; i < 7; i++) { const t = i / 7; s += path(`M${r2(170 + 60 * t)} ${r2(418 - 228 * t)} L${r2(214 + 64 * t)} ${r2(420 - 226 * t)}`, { stroke: '#7a5a2a', strokeWidth: 6, strokeLinecap: 'round' }); }
  return s;
}

function codeLock(w: number, h: number): string {
  let s = rect(2, 2, w - 4, h - 4, { rx: 6, fill: '#3a3a44', stroke: '#15151a', strokeWidth: 3 });
  for (let i = 0; i < 6; i++) s += rect(10 + i * 14, 8, 11, h - 16, { rx: 4, fill: C.yellow, stroke: C.yellowDark, strokeWidth: 2 }) + path(`M${12 + i * 14} ${h / 2} h7`, { stroke: C.yellowDark, strokeWidth: 2 });
  return s;
}

export default defineMovie({
  Headline: (m, w, h) => headline('Leuchtturm', w, h),
  Background: (m, w, h) => background(w, h),
  '#3': (m, w, h) => chestInside(w, h),
  'Box-*': (m) => inScene(m, chest(547, 316, 130, 80, 60, ((m.frame ?? 1) - 1) / 5, `ch${m.frame}`)),
  'Hebel-*': (m) => inScene(m, lever(m.frame ?? 1)),
  'Luke-*': (m) => inScene(m, hatch(((m.frame ?? 1) - 1) / 5)),
  Code: (m, w, h) => codeLock(w, h),
  Leiter: (m) => inScene(m, ladder()),
});
