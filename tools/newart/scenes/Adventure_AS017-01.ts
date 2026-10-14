// AS017-01 "In der Höhle": sea cave with the sunken wreck in green water, a rock ledge in front; the diving suit
// lies on the ledge (Anzug-1 552,283 / Anzug-2 553,271 – two states). Hotspot over the wreck → diving game.
import { defineMovie } from '../lib/api';
import { inScene } from '../lib/stageloc';
import { C, blob, circle, defs, linGrad, path, rect } from '../lib/svg';
import { headline } from '../lib/ui';
import { caveBack, wreckShip } from '../lib/wreck';

function background(): string {
  let s = caveBack('cv', 171);
  s += defs(linGrad('wat', [[0, '#5aa898'], [1, '#2a6a6a']]));
  s += wreckShip(330, 150, 0.85, 14, { broken: true });
  s += path('M0 100 Q400 120 800 150 V448 H0 Z', { fill: 'url(#wat)', opacity: 0.88 });
  s += path('M0 100 Q400 120 800 150', { fill: 'none', stroke: '#c8f0e0', strokeWidth: 3, opacity: 0.7 });
  let rip = '';
  for (let i = 0; i < 18; i++) rip += `M${(i * 97) % 760 + 20} ${170 + ((i * 53) % 240)} q14 -4 28 0 `;
  s += path(rip, { fill: 'none', stroke: '#c8f0e0', strokeWidth: 2, opacity: 0.5 });
  // rock ledge front right
  s += path(blob(640, 360, 160, 80, 'ledge', 0.12), { fill: '#b8783a', stroke: '#5a3418', strokeWidth: 4 });
  s += path('M500 330 Q640 290 790 320', { fill: 'none', stroke: '#d8a060', strokeWidth: 6, strokeLinecap: 'round' });
  return s;
}

/** diving suit lying on the ledge: 1 = folded, 2 = spread out */
function suit(v: number): string {
  const blue = '#5ab0d8', bd = '#1d5f88';
  const o = { fill: blue, stroke: bd, strokeWidth: 3, strokeLinejoin: 'round' as const };
  if (v === 1) return path('M560 300 Q570 288 600 292 L650 294 Q672 296 670 312 Q668 326 640 326 L580 324 Q556 320 560 300 Z', o) +
    circle(660, 300, 14, { fill: '#c8e8f8', stroke: bd, strokeWidth: 3 }) + circle(600, 312, 6, { fill: C.red, stroke: C.redDark, strokeWidth: 2 }) + path('M590 300 h40', { stroke: bd, strokeWidth: 2 });
  return path('M560 300 Q556 286 584 284 L690 286 Q706 290 704 304 L700 320 Q690 332 668 328 L590 326 Q562 324 560 300 Z', o) +
    path('M600 286 L590 270 M640 286 L650 270', { stroke: bd, strokeWidth: 8, strokeLinecap: 'round' }) + circle(690, 296, 16, { fill: '#c8e8f8', stroke: bd, strokeWidth: 3 }) +
    circle(612, 306, 6, { fill: C.red, stroke: C.redDark, strokeWidth: 2 }) + circle(640, 306, 6, { fill: C.red, stroke: C.redDark, strokeWidth: 2 }) + rect(570, 318, 40, 6, { fill: '#555', rx: 2 });
}

export default defineMovie({
  Headline: (m, w, h) => headline('In der Höhle', w, h),
  Background: () => background(),
  'Anzug-*': (m) => inScene(m, suit(m.frame ?? 1)),
});
