// AS005-02 "Am Leuchtturm" (lighthouse, outside). Scene coordinates (stage y - 45):
// Tuer 328,187 144x179 (11 frames, opens; the opening is painted into the background) ·
// OS028 528,300 100x76 (stone, item) · Hotspot AS005-03 386,220 · exit to the board on the right.
import { defineMovie } from '../lib/api';
import { itemArt } from '../lib/items';
import { brickLines, leafyBush, seaStrip, skyWithClouds } from '../lib/seaside';
import { C, defs, dk, ellipse, g, linGrad, lt, path, r2, rect } from '../lib/svg';
import { sandPattern } from '../lib/textures';
import { fitText, headline } from '../lib/ui';

const TOWER = '#f4f1ea', TOWER_D = '#9a968c', BAND = '#8f86e0', BAND_D = '#4a3fa0';
/** arch of the door opening in door-canvas coordinates (144x179) */
const ARCH = 'M10 172 C4 110 18 14 72 10 C126 14 140 110 134 172 Z';

function background(w: number, h: number): string {
  let s = skyWithClouds('sky', w, h, { clouds: [[110, 70, 46], [210, 150, 30], [740, 40, 30]] });
  s += defs(sandPattern('sand', 11), linGrad('tw', [[0, '#d9d4c8'], [0.25, TOWER], [0.8, TOWER], [1, '#cfc9bb']], 0, 0, 1, 0));
  s += seaStrip('sea', 0, 300, 320, 400, 5);
  // tower (slightly tapering, top cut off)
  const tower = 'M300 384 L318 0 H676 L690 384 Z';
  s += path(tower, { fill: 'url(#tw)', stroke: TOWER_D, strokeWidth: 4 });
  s += `<clipPath id="tc"><path d="${tower}"/></clipPath>`;
  s += g({ clipPath: 'url(#tc)' },
    brickLines(296, 4, 700, 384, 14, TOWER_D, 0.45),
    rect(290, 104, 410, 82, { fill: BAND }), brickLines(296, 104, 700, 186, 14, BAND_D, 0.4),
    path('M296 104 H700 M296 186 H700', { stroke: BAND_D, strokeWidth: 4 }),
    rect(300, 0, 26, 384, { fill: '#000', opacity: 0.06 }), rect(650, 0, 50, 384, { fill: '#000', opacity: 0.1 }));
  // door opening (dark, the door leaf is a sprite) + stone frame
  s += g({ transform: 'translate(328 187)' },
    path(ARCH, { fill: '#6e6a62', stroke: '#4a463e', strokeWidth: 10, strokeLinejoin: 'round' }),
    path(ARCH, { fill: '#2a2430' }),
    path('M24 172 C20 120 34 40 72 30 C110 40 124 120 120 172 Z', { fill: '#3a3444' }),
    path('M30 172 L40 150 H104 L114 172 Z', { fill: '#4a4458' }));
  // year plaque "1890"
  s += path('M372 170 Q410 150 448 170 L444 182 Q410 168 376 182 Z', { fill: '#b07a3e', stroke: '#5a3a18', strokeWidth: 3, strokeLinejoin: 'round' }) +
    fitText('1890', 410, 178, 50, 16, { anchor: 'middle', fill: '#2a1a10', font: 'head', weight: 800 });
  // sign "Höhe / Stufen"
  s += rect(468, 192, 104, 64, { rx: 4, fill: '#c98a4a', stroke: '#6b4422', strokeWidth: 3 }) +
    fitText('Höhe:', 520, 207, 94, 12, { anchor: 'middle', fill: '#2a1a10', font: 'body', weight: 800 }) +
    fitText('jede Menge Meter', 520, 221, 94, 12, { anchor: 'middle', fill: '#2a1a10', font: 'body', weight: 700 }) +
    fitText('Stufen:', 520, 238, 94, 12, { anchor: 'middle', fill: '#2a1a10', font: 'body', weight: 800 }) +
    fitText('jede Menge', 520, 252, 94, 12, { anchor: 'middle', fill: '#2a1a10', font: 'body', weight: 700 });
  // stone step in front of the door
  s += path('M312 366 H440 L446 386 H306 Z', { fill: '#a8a294', stroke: '#6e6a62', strokeWidth: 3, strokeLinejoin: 'round' });
  // bush on the right
  s += leafyBush(720, 250, 70, 'bu1') + leafyBush(650, 300, 40, 'bu2', '#5fb85a');
  // dune
  s += path('M0 410 Q200 380 380 384 Q600 380 800 312 V448 H0 Z', { fill: 'url(#sand)', stroke: C.sandDark, strokeWidth: 4 });
  s += path('M60 430 q30 -8 60 0 M520 420 q40 -10 80 -4 M680 380 q30 -8 60 -6', { fill: 'none', stroke: C.sandDark, strokeWidth: 3, strokeLinecap: 'round' });
  // tufts of beach grass
  for (const [x, y] of [[120, 404], [560, 372], [770, 324]] as [number, number][]) s += path(`M${x} ${y} q-6 -20 -14 -26 M${x} ${y} q0 -24 4 -32 M${x} ${y} q8 -16 18 -22`, { fill: 'none', stroke: '#6a9a3a', strokeWidth: 3, strokeLinecap: 'round' });
  return s;
}

/** arched door leaf, hinge on the right; f = 1 closed … 11 open */
function door(f: number): string {
  const t = (f - 1) / 10;
  const k = Math.cos(t * Math.PI * 0.46);
  const xr = 134;
  const wood = dk('#b8834a', 0.3 * t);
  const leaf = g({ transform: `translate(${xr} 0) scale(${r2(k)} 1) translate(${-xr} 0)` },
    path(ARCH, { fill: wood, stroke: '#4a2a10', strokeWidth: 4 / Math.max(0.3, k), strokeLinejoin: 'round' }),
    path('M40 168 V60 M72 168 V20 M104 168 V40', { stroke: dk(wood, 0.3), strokeWidth: 3 / Math.max(0.3, k) }),
    path('M24 70 H120 M18 140 H126', { stroke: dk(wood, 0.45), strokeWidth: 6 / Math.max(0.3, k), opacity: 0.8 }),
    rect(28, 82, 9, 34, { rx: 3, fill: '#d9a030', stroke: '#6a4a10', strokeWidth: 2 / Math.max(0.3, k) }),
    ellipse(32, 124, 4, 6, { fill: '#2a1a10' }));
  // leaf thickness (edge) when opening
  const edge = t > 0 ? g({ transform: `translate(${r2(-9 * Math.sin(t * 1.4))} 2) translate(${xr} 0) scale(${r2(k)} 1) translate(${-xr} 0)` },
    path(ARCH, { fill: lt('#8a5428', 0.1), stroke: '#4a2a10', strokeWidth: 4 / Math.max(0.3, k) })) : '';
  return edge + leaf;
}

export default defineMovie({
  Headline: (m, w, h) => headline('Am Leuchtturm', w, h),
  LeuchturmUntenAussen: (m, w, h) => background(w, h),
  'Tuer-*': (m) => door(m.frame ?? 1),
  OS028: (m, w, h) => itemArt('OI028', w, h),
});
