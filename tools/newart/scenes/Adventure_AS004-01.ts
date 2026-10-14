// AS004-01 "Vor der Hafenkneipe" (outside the harbour pub). Scene coordinates (stage y - 45):
// Tuer 541,183 113x190 (6 frames, opens) · Schild 452,99 210x173 (pub sign, in front) ·
// Gelaender 0,321 323x127 (rope railing, foreground) · exit to the board on the right (SP004).
import { defineMovie } from '../lib/api';
import { doorFrames } from '../lib/house';
import { inScene } from '../lib/stageloc';
import { C, circle, defs, dk, ellipse, g, line, linGrad, lt, path, rect } from '../lib/svg';
import { boardsPattern, cobblePattern } from '../lib/textures';
import { fitText, headline } from '../lib/ui';

const STONE = '#c9b48a', STONE_D = '#7d6a48';

function background(w: number, h: number): string {
  let s = defs(
    linGrad('sky', [[0, C.sky], [1, C.skyLight]]),
    cobblePattern('stone', { base: STONE, mortar: STONE_D, size: 34, seed: 41 }),
    cobblePattern('stone2', { base: '#b8a27a', mortar: '#6e5c3c', size: 30, seed: 42 }),
    boardsPattern('deck', { base: '#c08a52', dark: '#7a5028', w: 30 }),
    linGrad('glow', [[0, '#ffe58a', 0.55], [1, '#ffe58a', 0]], 0, 0, 1, 1),
    linGrad('inside', [[0, '#ffd66a'], [1, '#e89a3a']]),
  );
  s += rect(0, 0, w, h, { fill: 'url(#sky)' });
  // green hill behind the roof (top right)
  s += path('M640 0 Q720 30 800 60 V0 Z', { fill: C.grass, stroke: C.grassDark, strokeWidth: 3 });
  // main wall (gable) – stone
  s += path('M150 0 H660 L800 120 V400 H0 V0 Z', { fill: 'url(#stone)' });
  s += path('M650 -4 L810 130', { stroke: C.roofDark, strokeWidth: 26, strokeLinecap: 'round' }) + path('M650 -4 L810 130', { stroke: C.roof, strokeWidth: 18, strokeLinecap: 'round' });
  // left wing: bay with the glowing window + shingle roof + dormer
  s += rect(0, 0, 330, 400, { fill: 'url(#stone2)' });
  s += path('M0 0 H170 L120 40 H0 Z', { fill: C.roof, stroke: C.roofDark, strokeWidth: 4, strokeLinejoin: 'round' });
  // bay (round tower-ish front)
  s += path('M120 205 H322 V400 H120 Z', { fill: '#a88e64', stroke: '#5e4a2e', strokeWidth: 4 });
  s += rect(120, 205, 202, 195, { fill: 'url(#stone2)', opacity: 0.7 });
  // arched window with warm light (pub interior)
  s += path('M170 340 V250 Q220 196 270 250 V340 Z', { fill: 'url(#inside)', stroke: '#5e3a18', strokeWidth: 6, strokeLinejoin: 'round' });
  s += path('M220 214 V340 M170 280 H270 M170 312 H270', { stroke: '#5e3a18', strokeWidth: 5 });
  s += rect(162, 338, 116, 10, { rx: 3, fill: C.woodMid, stroke: C.woodDeep, strokeWidth: 2.5 });
  // light falling out of the window onto the deck
  s += path('M170 330 L0 300 V420 L120 440 L270 340 Z', { fill: 'url(#glow)', opacity: 0.8 });
  // big roof over the bay
  s += path('M50 190 L170 70 H420 L300 190 Z', { fill: C.roof, stroke: C.roofDark, strokeWidth: 5, strokeLinejoin: 'round' });
  for (let i = 0; i < 6; i++) s += path(`M${70 + i * 40} ${170 - 0} L${170 + i * 42} 76`, { stroke: C.roofDark, strokeWidth: 2, opacity: 0.45 });
  for (let i = 0; i < 4; i++) s += path(`M${66 + i * 30 - i * 3} ${172 - i * 30} H${300 + 0 - i * 30 + i * 30 + 0}`, { stroke: C.roofDark, strokeWidth: 2, opacity: 0.35 });
  s += path('M40 196 H310 L300 186 H50 Z', { fill: C.roofDark });
  // dormer with a half-round window on the roof
  s += path('M200 92 Q285 0 370 92 Z', { fill: C.roof, stroke: C.roofDark, strokeWidth: 4 });
  s += path('M226 90 Q285 30 344 90 Z', { fill: '#3a4a5e', stroke: '#2a1a10', strokeWidth: 5 });
  s += path('M285 42 V90 M252 60 L262 90 M318 60 L308 90', { stroke: '#5e3a18', strokeWidth: 4 });
  // round porthole window
  s += circle(590, 85, 33, { fill: '#8a7a5a', stroke: '#4e4028', strokeWidth: 4 }) + circle(590, 85, 25, { fill: '#5a7898', stroke: '#2a3a4a', strokeWidth: 3 }) +
    path('M574 74 q10 -10 22 -8', { fill: 'none', stroke: C.white, strokeWidth: 3, strokeLinecap: 'round', opacity: 0.7 });
  // door frame (door sprite 541,183 113x190)
  s += rect(530, 172, 135, 205, { rx: 6, fill: '#6b4422', stroke: '#3e2610', strokeWidth: 4 });
  s += rect(520, 164, 155, 14, { rx: 4, fill: C.woodMid, stroke: C.woodDeep, strokeWidth: 3 });
  // lantern beside the door
  s += path('M500 150 h16 v8', { fill: 'none', stroke: '#2a2a2a', strokeWidth: 4 }) +
    path('M504 160 h16 l-3 26 h-10 z', { fill: '#ffe58a', stroke: '#2a2a2a', strokeWidth: 3 }) + rect(502, 156, 20, 6, { rx: 2, fill: '#2a2a2a' });
  // boardwalk
  s += rect(0, 372, w, h - 372, { fill: 'url(#deck)' });
  s += path('M0 372 H800', { stroke: '#5a3a1a', strokeWidth: 4 });
  // doorstep plank
  s += path('M512 384 L540 368 H770 L780 380 L758 396 H520 Z', { fill: '#a87a4a', stroke: '#5a3a1a', strokeWidth: 3, strokeLinejoin: 'round' });
  // chalkboard "Heute: Frische Muscheln" on an easel
  s += g({},
    path('M672 360 L690 250 M742 360 L724 250 M707 360 L707 260', { stroke: '#8a5428', strokeWidth: 7, strokeLinecap: 'round' }),
    rect(664, 254, 86, 98, { rx: 5, fill: '#2f8f4a', stroke: '#c9822e', strokeWidth: 6 }),
    fitText('Heute:', 707, 276, 70, 16, { anchor: 'middle', fill: C.white, font: 'body', weight: 800 }),
    fitText('Frische', 707, 302, 70, 15, { anchor: 'middle', fill: '#ffe58a', font: 'body', weight: 700 }),
    fitText('Muscheln', 707, 328, 74, 17, { anchor: 'middle', fill: C.white, font: 'head', weight: 800 }),
    path('M676 338 q10 8 20 0', { fill: 'none', stroke: C.white, strokeWidth: 2 }));
  // barrel at the wall
  s += g({},
    ellipse(410, 372, 36, 8, { fill: '#000', opacity: 0.2 }),
    path('M380 300 q-6 36 0 72 h60 q6 -36 0 -72 z', { fill: '#a86a32', stroke: C.woodDeep, strokeWidth: 3 }),
    ellipse(410, 300, 30, 8, { fill: '#7a4a20', stroke: C.woodDeep, strokeWidth: 3 }),
    path('M378 320 h64 M377 352 h66', { stroke: '#555', strokeWidth: 4 }));
  // fishing net + float hanging on the wall
  s += path('M360 210 q40 30 90 0 M372 222 q30 30 66 0 M380 206 l20 50 M410 214 l0 46 M440 206 l-20 50', { fill: 'none', stroke: '#8a7a5a', strokeWidth: 2 });
  s += circle(408, 262, 9, { fill: C.red, stroke: C.redDark, strokeWidth: 2.5 }) + path('M399 262 h18', { stroke: C.white, strokeWidth: 4 });
  return s;
}

function door(f: number, w: number, h: number): string {
  const inside = rect(8, 8, w - 16, h - 8, { fill: '#5a3a28' }) + rect(8, 8, w - 16, h - 60, { fill: '#c98a3a', opacity: 0.6 }) +
    rect(8, h - 52, w - 16, 44, { fill: '#7a5038' }) + circle(w * 0.7, 40, 10, { fill: '#ffe58a', opacity: 0.9 });
  return doorFrames(f, 6, w, h, { hinge: 'left', wood: '#c08a4a', id: `d${f}`, outside: inside });
}

/** hanging pub sign: curly iron bracket + blue fish board "Zum blauen Zackenbarsch" (scene coords) */
function sign(): string {
  const iron = { fill: 'none', stroke: '#2a2a30', strokeWidth: 6, strokeLinecap: 'round' as const };
  return g({},
    path('M470 250 C470 210 520 200 520 170 C520 150 500 140 490 152', iron),
    path('M480 120 C500 160 540 150 548 186 C552 206 530 214 522 200', iron),
    path('M470 250 c-14 -6 -12 -26 4 -26', iron),
    path('M512 230 c18 -2 22 -24 6 -30', iron),
    path('M460 100 V262', { stroke: '#2a2a30', strokeWidth: 7, strokeLinecap: 'round' }),
    path('M460 104 H640', { stroke: '#2a2a30', strokeWidth: 6, strokeLinecap: 'round' }),
    line(560, 104, 560, 118, { stroke: '#2a2a30', strokeWidth: 3 }), line(624, 104, 624, 118, { stroke: '#2a2a30', strokeWidth: 3 }),
    // fish board
    path('M520 150 Q560 108 640 120 Q656 124 660 140 Q650 170 600 176 Q560 180 540 168 L510 186 L516 160 L494 146 L522 146 Z', { fill: '#3a7ab8', stroke: '#173f6a', strokeWidth: 4, strokeLinejoin: 'round' }),
    path('M560 122 l10 -12 l10 12 l10 -12 l10 12', { fill: '#3a7ab8', stroke: '#173f6a', strokeWidth: 3, strokeLinejoin: 'round' }),
    circle(640, 136, 5, { fill: C.white, stroke: '#173f6a', strokeWidth: 2 }), circle(641, 136, 2.2, { fill: C.ink }),
    path('M528 128 q20 -12 50 -12', { fill: 'none', stroke: lt('#3a7ab8', 0.5), strokeWidth: 3, strokeLinecap: 'round' }),
    fitText('Zum blauen', 578, 145, 76, 12, { anchor: 'middle', fill: '#ffe58a', font: 'head', weight: 800 }),
    fitText('Zackenbarsch', 576, 163, 84, 13, { anchor: 'middle', fill: '#ffe58a', font: 'head', weight: 800 }));
}

/** rope railing in the foreground (scene coords) */
function railing(): string {
  const post = (x: number, top: number, wd: number) => rect(x, top, wd, 448 - top + 4, { rx: 4, fill: '#8a5428', stroke: '#3e2610', strokeWidth: 4 }) +
    ellipse(x + wd / 2, top + 2, wd / 2, 5, { fill: '#b8783e', stroke: '#3e2610', strokeWidth: 3 }) + rect(x + 4, top + 10, 5, 448 - top - 10, { fill: lt('#8a5428', 0.25) });
  const rope = (d: string) => path(d, { fill: 'none', stroke: '#4a3018', strokeWidth: 9, strokeLinecap: 'round' }) + path(d, { fill: 'none', stroke: '#b08850', strokeWidth: 5, strokeLinecap: 'round', strokeDasharray: '6 4' });
  return rope('M-10 352 Q50 376 108 352') + rope('M108 352 Q210 420 312 368') + post(96, 336, 24) + post(296, 350, 24);
}

export default defineMovie({
  Headline: (m, w, h) => headline('Vor der Hafenkneipe', w, h),
  Background: (m, w, h) => background(w, h),
  'Tuer-*': (m, w, h) => door(m.frame ?? 1, w, h),
  Schild: (m) => inScene(m, sign()),
  Gelaender: (m) => inScene(m, railing()),
});
