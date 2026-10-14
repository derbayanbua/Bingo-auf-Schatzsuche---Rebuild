// AS005-11 "Leuchtturm" lantern room: windows all around (sunset outside), telescope, chair, book, the big lamp
// (Lampe 211,51 249x248: 1 off, 2 brightest … 7 fading) and its switch (Schalter 359,281, 4 frames).
// Exits: down (AS005-03), gallery door right (AS005-04).
import { defineMovie } from '../lib/api';
import { cloud } from '../lib/seaside';
import { inScene } from '../lib/stageloc';
import { C, circle, defs, dk, ellipse, g, linGrad, lt, path, r2, radGrad, rect } from '../lib/svg';
import { boardsPattern, cobblePattern } from '../lib/textures';
import { headline } from '../lib/ui';

const FRAME = '#e0a060', FRAME_D = '#8a5420';

function world(glow = 0, sw = 1): string {
  let s = defs(
    linGrad('dusk', [[0, '#e8823a'], [0.7, '#f6b25a'], [1, '#ffd98a']]),
    boardsPattern('deck', { base: '#c8945a', dark: '#8a5a2a', w: 30 }),
    cobblePattern('ring', { base: '#d8d8dc', mortar: '#8a8a92', size: 22, seed: 61 }),
    radGrad('glow', [[0, '#ffffff', 1], [0.45, '#fff6c0', 0.9], [1, '#ffd25a', 0]]),
  );
  // outside through the windows
  s += rect(0, 0, 800, 448, { fill: 'url(#dusk)' });
  s += cloud(150, 80, 40, 'c1', '#c86a3a') + cloud(520, 70, 50, 'c2', '#c86a3a');
  s += rect(0, 196, 800, 60, { fill: '#3a5a8a' });
  s += path('M0 150 H800', { stroke: '#8a6a4a', strokeWidth: 4 }); // gallery railing outside
  // ceiling ring
  s += path('M0 0 H800 V22 Q400 50 0 22 Z', { fill: '#5a4ab0', stroke: '#2a1d6b', strokeWidth: 3 });
  // window frames (pillars)
  for (const [x, wd] of [[0, 46], [214, 44], [436, 36], [606, 40], [770, 40]] as [number, number][]) s += rect(x, 20, wd, 240, { fill: FRAME, stroke: FRAME_D, strokeWidth: 4 });
  s += path('M0 34 Q400 60 800 34', { fill: 'none', stroke: FRAME, strokeWidth: 16 }) + path('M0 140 Q400 156 800 140', { fill: 'none', stroke: FRAME, strokeWidth: 8 });
  // telescope on a stand at the left window
  s += g({ transform: 'rotate(-8 110 120)' },
    rect(50, 102, 140, 30, { rx: 10, fill: '#3a2a1a', stroke: '#1a1008', strokeWidth: 3 }),
    rect(46, 98, 30, 38, { rx: 8, fill: '#e8c070', stroke: '#8a6a20', strokeWidth: 3 }), rect(110, 98, 14, 38, { fill: '#e8c070', stroke: '#8a6a20', strokeWidth: 2 }),
    ellipse(48, 117, 6, 15, { fill: '#cfe8f5', stroke: '#8a6a20', strokeWidth: 2 }));
  s += path('M122 140 L110 230 M122 140 L140 230', { stroke: '#8a6a4a', strokeWidth: 8, strokeLinecap: 'round' });
  // stone ring wall around the stair opening + wooden floor
  s += path('M0 290 Q400 200 800 290 V448 H0 Z', { fill: 'url(#deck)' });
  s += path('M0 252 Q400 196 800 252 V292 Q400 236 0 292 Z', { fill: 'url(#ring)', stroke: '#6a6a72', strokeWidth: 4 });
  s += path('M60 448 Q60 320 400 310 Q740 320 740 448', { fill: '#a87a4a', stroke: '#6a4a20', strokeWidth: 4 });
  // chair
  s += path('M440 300 L436 170 M500 300 L500 170', { stroke: '#a89878', strokeWidth: 6, strokeLinecap: 'round' }) +
    [190, 210, 230].map((y) => path(`M436 ${y} H500`, { stroke: '#a89878', strokeWidth: 4 })).join('') +
    path('M430 250 L520 240 L540 262 L446 274 Z', { fill: '#c8b48a', stroke: '#6a5a3a', strokeWidth: 3 }) +
    path('M452 272 L448 330 M534 262 L536 320', { stroke: '#a89878', strokeWidth: 6, strokeLinecap: 'round' });
  // open book on the floor
  s += path('M664 372 L716 352 L770 372 L718 392 Z', { fill: '#f6efe0', stroke: '#8a7a60', strokeWidth: 3 }) + path('M716 352 V392', { stroke: '#8a7a60', strokeWidth: 2 }) +
    path('M676 372 l30 -12 M684 378 l30 -12 M726 362 l30 10 M724 370 l30 10', { stroke: '#b8a890', strokeWidth: 2 });
  // lamp stand (tripod)
  s += path('M300 330 L230 420 M400 340 L400 430 M490 330 L560 410', { stroke: '#2a2a30', strokeWidth: 14, strokeLinecap: 'round' });
  s += ellipse(395, 300, 80, 26, { fill: '#3a3a40', stroke: '#15151a', strokeWidth: 4 }) + rect(315, 280, 160, 22, { fill: '#3a3a40' }) + ellipse(395, 280, 80, 26, { fill: '#c8ccd2', stroke: '#4a4e58', strokeWidth: 4 });
  s += ellipse(395, 276, 52, 16, { fill: C.yellow, stroke: C.yellowDark, strokeWidth: 4 });
  // the bulb
  s += path('M360 270 Q300 200 300 140 Q300 60 395 56 Q490 60 490 140 Q490 200 430 270 Z', { fill: '#e8f4fa', fillOpacity: 0.35, stroke: '#a8b8c8', strokeWidth: 3 });
  s += path('M380 270 L370 190 M410 270 L420 190', { fill: 'none', stroke: glow ? '#e84a3a' : '#555', strokeWidth: 2.5 });
  let coil = 'M370 190 ';
  for (let i = 0; i < 9; i++) coil += `q3 -10 6 0 q-1 6 0 0 `;
  s += path(coil, { fill: 'none', stroke: glow ? '#e84a3a' : '#666', strokeWidth: 2.5 });
  s += path('M330 110 Q336 80 360 70', { fill: 'none', stroke: C.white, strokeWidth: 6, strokeLinecap: 'round', opacity: 0.8 });
  if (glow > 0) s += ellipse(395, 160, 90 + 70 * glow, 100 + 60 * glow, { fill: 'url(#glow)', opacity: Math.min(1, glow) });
  // switch box on the stand rim
  s += switchBox(sw);
  return s;
}

/** rocker switch on the lamp stand, frame 1 (off) … 4 (on) */
function switchBox(f: number): string {
  const a = -30 + ((f - 1) / 3) * 60;
  return ellipse(390, 312, 24, 18, { fill: '#2a2a30', stroke: '#0a0a0e', strokeWidth: 3 }) +
    g({ transform: `rotate(${r2(a)} 390 310)` }, path('M374 310 Q390 296 406 310 Q390 318 374 310 Z', { fill: '#a84a3a', stroke: '#4a1a10', strokeWidth: 3 }));
}

export default defineMovie({
  Headline: (m, w, h) => headline('Leuchtturm', w, h),
  LeuchtturmObenInnen: () => world(),
  'Lampe-*': (m) => inScene(m, world([0, 1, 0.8, 0.6, 0.45, 0.3, 0.15][(m.frame ?? 1) - 1])),
  'Schalter-*': (m) => inScene(m, switchBox(m.frame ?? 1)),
});
