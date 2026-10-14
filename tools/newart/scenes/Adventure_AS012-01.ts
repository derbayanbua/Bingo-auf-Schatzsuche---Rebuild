// AS012-01 "Am Strand" (second beach): open sea, sand slope, big boulder with a young birch; a message in a bottle
// bobs in the water (Flasche 208,181 59x56, 21-frame loop, item). Exit right to the board.
import { defineMovie } from '../lib/api';
import { leafyBush, seaStrip, skyWithClouds } from '../lib/seaside';
import { C, blob, defs, ellipse, g, path, r2, rect } from '../lib/svg';
import { sandPattern, specklePattern } from '../lib/textures';
import { headline } from '../lib/ui';

function background(w: number, h: number): string {
  let s = skyWithClouds('sky', w, h, { clouds: [[150, 50, 40], [480, 70, 46], [720, 40, 30]] });
  s += defs(sandPattern('sand', 31), specklePattern('rock', { base: '#c8bcae', speck: '#8a7e70', seed: 32, pebbles: 6 }));
  s += seaStrip('sea', 0, 150, 800, 448, 9, { top: '#6ab0e0', bottom: '#2f7fc8' });
  s += path('M0 448 V400 Q300 330 560 220 Q680 170 800 140 V448 Z', { fill: 'url(#sand)', stroke: C.sandDark, strokeWidth: 4 });
  s += path('M0 400 Q300 330 560 220 Q680 170 800 140', { fill: 'none', stroke: C.white, strokeWidth: 5, opacity: 0.5, transform: 'translate(-8 -6)' });
  // boulder + birch
  s += path(blob(600, 318, 136, 62, 'rk', 0.12), { fill: 'url(#rock)', stroke: '#6a5e50', strokeWidth: 4 });
  s += path('M500 300 Q560 270 640 280', { fill: 'none', stroke: '#e8e0d4', strokeWidth: 6, strokeLinecap: 'round', opacity: 0.8 });
  s += path('M760 340 C750 260 730 200 700 140 M748 280 C780 230 790 200 800 180', { fill: 'none', stroke: '#e8e8e0', strokeWidth: 8, strokeLinecap: 'round' });
  s += path('M760 340 C750 260 730 200 700 140', { fill: 'none', stroke: '#3a3a3a', strokeWidth: 8, strokeLinecap: 'round', strokeDasharray: '4 22' });
  s += leafyBush(720, 210, 70, 'bi1', '#7ac850', '#3a7a2a') + leafyBush(660, 300, 44, 'bi2', '#7ac850', '#3a7a2a');
  return s;
}

/** bottle bobbing on the waves, frame 1..21 (loop) */
function bottle(f: number, w: number, h: number): string {
  const ph = ((f - 1) / 21) * Math.PI * 2;
  const dy = Math.sin(ph) * 3, rot = -28 + Math.sin(ph + 0.8) * 8;
  return g({ transform: `translate(${w / 2} ${r2(h / 2 + 4 + dy)}) rotate(${r2(rot)})` },
    path('M-20 -9 H8 Q14 -9 16 -5 H22 V5 H16 Q14 9 8 9 H-20 Q-25 9 -25 0 Q-25 -9 -20 -9 Z', { fill: '#5ac87a', fillOpacity: 0.9, stroke: '#1f6b3c', strokeWidth: 2.5 }),
    rect(22, -4, 6, 8, { rx: 2, fill: '#c8843a', stroke: '#6a3a10', strokeWidth: 1.5 }),
    path('M-16 -4 h18 v8 h-18 z', { fill: '#f6efd8', stroke: '#a89870', strokeWidth: 1.2 }),
    path('M-18 -6 h22', { stroke: C.white, strokeWidth: 2, strokeLinecap: 'round', opacity: 0.7 })) +
    ellipse(w / 2, h / 2 + 12 + dy * 0.5, 22, 4, { fill: 'none', stroke: C.white, strokeWidth: 2, opacity: 0.7 });
}

export default defineMovie({
  Headline: (m, w, h) => headline('Am Strand', w, h),
  Background: (m, w, h) => background(w, h),
  'Flasche-*': (m, w, h) => bottle(m.frame ?? 1, w, h),
});
