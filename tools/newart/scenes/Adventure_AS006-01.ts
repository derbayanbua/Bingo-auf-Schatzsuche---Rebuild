// AS006-01 "Alfons' Haus": half-timbered house with a clock tower, the Witz-O-Mat on the wall next to the door
// (hotspot 223,343 41x49 → AS006-02), big chestnut tree with a bench. Exits to the board left and right.
import { defineMovie } from '../lib/api';
import { flowers, tufts } from '../lib/nature';
import { cloud } from '../lib/seaside';
import { C, blob, circle, defs, ellipse, g, linGrad, path, rect } from '../lib/svg';
import { grassPattern } from '../lib/textures';
import { headline } from '../lib/ui';

function background(w: number, h: number): string {
  let s = defs(linGrad('sky', [[0, '#4f9fe0'], [1, C.skyLight]]), grassPattern('lawn', { base: C.grass, seed: 66 }), grassPattern('hill', { base: '#4fa64a', seed: 67 }));
  s += rect(0, 0, w, h, { fill: 'url(#sky)' });
  s += cloud(120, 60, 34, 'c1') + cloud(700, 250, 26, 'c2') + cloud(560, 40, 22, 'c3');
  s += path('M0 260 Q120 200 300 260 Q520 300 640 280 Q740 250 800 270 V448 H0 Z', { fill: 'url(#hill)', stroke: '#2f7a3a', strokeWidth: 3 });
  s += rect(0, 380, w, 68, { fill: 'url(#lawn)' });
  // house body
  const beam = { fill: 'none', stroke: '#7a4a20', strokeWidth: 9, strokeLinecap: 'round' as const };
  s += rect(56, 296, 286, 120, { fill: '#f6f2ea', stroke: '#8a8070', strokeWidth: 4 }); // ground floor
  s += rect(50, 186, 298, 112, { fill: '#f6f2ea', stroke: '#8a8070', strokeWidth: 4 }); // upper floor
  s += path('M50 186 H348 M50 236 H348 M50 296 H348 M50 186 V296 M110 186 V296 M166 186 V296 M232 186 V296 M290 186 V296 M348 186 V296 M110 186 L166 236 M166 186 L110 236 M232 236 L290 186 M290 236 L348 296', beam);
  // shutters + windows
  for (const x of [76, 236]) s += rect(x, 244, 24, 46, { fill: C.red }) + path(`M${x} 250 l24 12 M${x} 266 l24 12 M${x} 282 l24 8`, { stroke: C.yellow, strokeWidth: 5 });
  for (const x of [108, 196]) s += rect(x, 248, 44, 38, { fill: '#9ad0f0', stroke: C.white, strokeWidth: 4 }) + path(`M${x + 22} 248 V286 M${x} 267 H${x + 44}`, { stroke: C.white, strokeWidth: 3 });
  for (const x of [56, 92, 128, 164, 200, 236, 272, 308]) s += rect(x, 296, 22, 14, { fill: '#8a5428' });
  // roofs
  s += path('M36 192 L80 120 H330 L360 192 Z', { fill: '#8a8070', stroke: '#4a4438', strokeWidth: 4 });
  // clock tower
  s += rect(120, 92, 100, 100, { fill: '#f6f2ea', stroke: '#7a4a20', strokeWidth: 8 });
  s += path('M108 96 L170 14 L232 96 Z', { fill: '#b8b4ac', stroke: '#6a665e', strokeWidth: 4, strokeLinejoin: 'round' });
  s += circle(170, 140, 34, { fill: '#fff6dc', stroke: '#8a6a20', strokeWidth: 4 }) +
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => circle(170 + Math.sin((i * Math.PI) / 6) * 27, 140 - Math.cos((i * Math.PI) / 6) * 27, 2, { fill: C.ink })).join('') +
    path('M170 140 V116 M170 140 L186 146', { stroke: C.ink, strokeWidth: 4, strokeLinecap: 'round' });
  // arched door with striped panels
  s += path('M136 414 V362 Q172 320 208 362 V414 Z', { fill: '#8a8070', stroke: '#5a5448', strokeWidth: 8 });
  s += path('M142 414 V364 Q172 332 202 364 V414 Z', { fill: '#e8603a' }) + path('M146 400 L200 360 M146 380 L190 348 M150 414 L202 378 M170 414 L202 396', { stroke: C.yellow, strokeWidth: 6 }) + path('M172 336 V414', { stroke: '#7a3a1a', strokeWidth: 3 });
  // Witz-O-Mat on the wall (little turquoise box with a smiley)
  s += rect(224, 344, 38, 46, { rx: 5, fill: '#3ac8c8', stroke: '#1a7a7a', strokeWidth: 3 }) + circle(243, 362, 11, { fill: C.yellow, stroke: '#a07800', strokeWidth: 2 }) +
    path('M237 364 q6 6 12 0', { fill: 'none', stroke: C.ink, strokeWidth: 2 }) + circle(239, 359, 1.5, { fill: C.ink }) + circle(247, 359, 1.5, { fill: C.ink }) +
    rect(232, 378, 22, 6, { rx: 2, fill: '#1a7a7a' });
  // tree: trunk + crown
  s += path('M520 420 C530 330 510 260 470 200 M528 300 C560 250 600 220 660 190 M524 260 C500 200 420 170 360 160', { fill: 'none', stroke: '#9a9a96', strokeWidth: 14, strokeLinecap: 'round' });
  s += path('M500 422 C510 340 520 290 516 230 H540 C540 300 548 360 556 422 Z', { fill: '#a8a8a2', stroke: '#5a5a56', strokeWidth: 4 });
  const crown: [number, number, number][] = [[300, 110, 70], [420, 80, 90], [560, 70, 100], [690, 110, 80], [480, 170, 80], [620, 180, 70], [360, 190, 60], [760, 170, 50]];
  for (const [i, [x, y, r]] of crown.entries()) s += path(blob(x + 6, y + 8, r, r * 0.8, `tr${i}s`, 0.2), { fill: '#2f7a3a' });
  for (const [i, [x, y, r]] of crown.entries()) s += path(blob(x, y, r, r * 0.8, `tr${i}`, 0.2), { fill: i % 2 ? '#5fb85a' : '#6cc45a', stroke: '#2f7a3a', strokeWidth: 3 }) + path(blob(x - r * 0.3, y - r * 0.3, r * 0.35, r * 0.25, `tr${i}h`, 0.2), { fill: '#a8e070' });
  // bench under the tree
  s += path('M456 400 V420 M512 400 V420', { stroke: '#a88a5a', strokeWidth: 6, strokeLinecap: 'round' }) +
    rect(450, 384, 72, 10, { rx: 3, fill: '#f0dcb0', stroke: '#a88a5a', strokeWidth: 3 }) + rect(456, 364, 66, 8, { rx: 3, fill: '#f0dcb0', stroke: '#a88a5a', strokeWidth: 3 }) + rect(456, 374, 66, 7, { rx: 3, fill: '#f0dcb0', stroke: '#a88a5a', strokeWidth: 3 });
  s += ellipse(500, 424, 90, 10, { fill: '#000', opacity: 0.15 });
  s += flowers(200, 420, 3, 'f1', C.white) + flowers(330, 420, 3, 'f2', C.white) + flowers(580, 436, 3, 'f3', C.white);
  s += tufts(0, 390, 800, 58, 30, 'tf');
  return s;
}

export default defineMovie({
  Headline: (m, w, h) => headline('Alfons’ Haus', w, h),
  Background: (m, w, h) => background(w, h),
});
