// AS019-01 "Aussichtspunkt": bench on the green hill above the sea, red maple, the lighthouse far away with its
// beacon (Lampe 443,164, 7 frames), sailing boats passing behind it (Boot), Overlay 0,156 800x82 = foreground
// strip (lighthouse, branches, hill) in front of the boats, chest (Box-1 37,327, member "Box" = inside view),
// item OS005 489,308.
import { defineMovie } from '../lib/api';
import { chest, chestInside } from '../lib/chest';
import { itemArt } from '../lib/items';
import { brickLines, seaStrip, skyWithClouds } from '../lib/seaside';
import { flowers, tufts } from '../lib/nature';
import { inScene } from '../lib/stageloc';
import { C, blob, circle, defs, ellipse, g, path, radGrad, rect } from '../lib/svg';
import { grassPattern } from '../lib/textures';
import { headline } from '../lib/ui';

const CH = { cx: 90, bottom: 416, w: 100, h: 60, d: 50 };

function lighthouse(): string {
  const tw = 'M432 270 L436 176 H458 L462 270 Z';
  return path(tw, { fill: '#f4f1ea', stroke: '#8a867c', strokeWidth: 2.5 }) +
    path('M434 214 H460 V234 H433 Z', { fill: '#8f86e0' }) + path('M434 250 H461 V262 H433 Z', { fill: '#8f86e0' }) +
    rect(434, 162, 26, 14, { fill: '#e8d8a0', stroke: '#8a6a3a', strokeWidth: 2 }) +
    path('M428 164 Q447 140 466 164 Z', { fill: '#c8503a', stroke: '#7a2a1a', strokeWidth: 2.5 }) + rect(428, 176, 38, 4, { fill: '#8a5a2a' });
}

function hill(): string {
  return path('M0 330 Q200 290 420 270 Q600 240 680 150 Q740 80 800 60 V448 H0 Z', { fill: 'url(#gr)', stroke: '#2f7a3a', strokeWidth: 4 });
}

function maple(front: boolean): string {
  let s = '';
  if (!front) s += path('M664 352 C676 280 640 200 560 150 M664 300 C700 240 740 200 800 180 M668 260 C620 200 520 150 420 170 M664 352 C660 300 690 220 700 120', { fill: 'none', stroke: '#9a9a9a', strokeWidth: 12, strokeLinecap: 'round' }) +
    path('M650 356 C660 300 656 260 664 200 L676 200 C676 260 680 300 684 356 Z', { fill: '#a8a8a8', stroke: '#5a5a5a', strokeWidth: 3 });
  const blobs: [number, number, number][] = [[320, 200, 40], [430, 150, 46], [520, 110, 60], [620, 60, 70], [720, 110, 70], [780, 220, 50], [560, 190, 46], [260, 250, 30]];
  for (const [i, [x, y, r]] of blobs.entries()) {
    for (let j = 0; j < 7; j++) {
      const a = j * 0.9 + i, d = j ? r * 0.55 : 0;
      const bx = x + Math.cos(a) * d, by = y + Math.sin(a) * d * 0.7;
      s += path(blob(bx, by, r * 0.5, r * 0.4, `mp${i}-${j}`, 0.45, 7), { fill: (i + j) % 3 ? '#d8283a' : '#a81424', stroke: '#6a0a14', strokeWidth: 2.5 });
    }
  }
  return s;
}

function world(): string {
  let s = skyWithClouds('sky', 800, 448, { clouds: [[140, 50, 36], [380, 90, 30]] });
  s += defs(grassPattern('gr', { base: '#4fa64a', seed: 81 }), radGrad('beam', [[0, '#fff6a0', 1], [1, '#fff6a0', 0]]));
  s += seaStrip('sea', 0, 136, 800, 360, 13, { top: '#8ab8d8', bottom: '#5a90c0' });
  s += lighthouse();
  s += hill();
  s += maple(false);
  // bench + bin
  s += path('M456 330 L452 356 M534 330 L540 352 M466 316 L470 356 M524 318 L520 354', { stroke: '#8a7a5a', strokeWidth: 6, strokeLinecap: 'round' });
  s += path('M450 318 L540 312 L546 326 L456 332 Z', { fill: '#c8a070', stroke: '#6a4a2a', strokeWidth: 3 }) +
    path('M460 296 L548 290 L548 300 L460 306 Z M458 284 L550 278 L550 288 L458 294 Z', { fill: '#c8a070', stroke: '#6a4a2a', strokeWidth: 3 });
  s += path('M568 306 H596 L592 340 H572 Z', { fill: '#2f8a4a', stroke: '#1a4a2a', strokeWidth: 3 }) + ellipse(582, 306, 14, 4, { fill: '#1a4a2a' });
  s += flowers(110, 340, 3, 'f1', C.white) + flowers(240, 352, 3, 'f2', C.white) + flowers(370, 318, 3, 'f3', C.white) + flowers(560, 358, 3, 'f4', C.white);
  s += tufts(0, 320, 800, 128, 26, 'tf');
  s += ellipse(CH.cx + 14, CH.bottom, 66, 8, { fill: '#000', opacity: 0.2 });
  return s;
}

/** foreground in front of the passing boats (lighthouse, red leaves, hill) */
function overlay(): string {
  return defs(grassPattern('gr', { base: '#4fa64a', seed: 81 })) + lighthouse() + hill() + maple(true);
}

function boat(w: number, h: number): string {
  return path(`M4 ${h - 12} H${w - 4} L${w - 10} ${h - 3} H10 Z`, { fill: '#a8582a', stroke: '#5a2a10', strokeWidth: 2 }) +
    path(`M${w / 2} ${h - 13} V4 L${w - 6} ${h - 15} Z`, { fill: C.white, stroke: '#8a93a6', strokeWidth: 1.5 }) +
    path(`M${w / 2 - 2} ${h - 13} V10 L8 ${h - 15} Z`, { fill: '#f4f4f8', stroke: '#8a93a6', strokeWidth: 1.5 }) + path(`M${w / 2} 4 l7 3 l-7 3`, { fill: C.red });
}

export default defineMovie({
  Headline: (m, w, h) => headline('Aussichtspunkt', w, h),
  LeuchtturmWeit: () => world(),
  '#3': (m, w, h) => chestInside(w, h),
  'Box-*': (m) => inScene(m, chest(CH.cx, CH.bottom, CH.w, CH.h, CH.d, ((m.frame ?? 1) - 1) / 5, `ch${m.frame}`)),
  'Lampe-*': (m, w, h) => {
    const f = m.frame ?? 1;
    const k = [0, 0.4, 1, 0.8, 0.5, 0.25, 0.1][f - 1];
    return k ? circle(w / 2, h / 2, Math.min(w, h) / 2, { fill: 'url(#bm)', opacity: k }) + defs(radGrad('bm', [[0, '#fffbe0', 1], [1, '#ffe24a', 0]])) : rect(w / 2 - 1, h / 2 - 1, 2, 2, { fill: '#e8d8a0' });
  },
  Boot: (m, w, h) => boat(w, h),
  Overlay: (m) => inScene(m, overlay()),
  OS005: (m, w, h) => itemArt('OI005', w, h),
});
