// AS001-02 "Bongos Haus" (outside). Scene coordinates (stage y - 45):
// Window 342,107 138x169 · Door 677,135 108x224 · Glocke 567,127 78x163 · Blumentopf 608,304 76x86 ·
// Hausschluessel 619,353 58x33 (under the pot) · exit to the board at the left edge (Hotspot SP001 0..50).
import { defineMovie } from '../lib/api';
import { doorFrames, wallBell, windowFrames } from '../lib/house';
import { itemShape } from '../lib/items';
import { bush, flowers, tufts } from '../lib/nature';
import { C, blob, circle, defs, ellipse, g, linGrad, path, rect } from '../lib/svg';
import { boardsPattern, grassPattern } from '../lib/textures';
import { headline } from '../lib/ui';

function background(w: number, h: number): string {
  let s = defs(
    linGrad('sky', [[0, C.sky], [1, C.skyLight]]),
    grassPattern('lawn', { base: C.grass, seed: 21 }),
    boardsPattern('planks', { base: '#f6dfa0', dark: '#c9a55a', w: 24 }),
  );
  s += rect(0, 0, w, h, { fill: 'url(#sky)' });
  s += ellipse(150, 40, 60, 16, { fill: C.white, opacity: 0.9 }) + ellipse(200, 30, 40, 14, { fill: C.white, opacity: 0.9 });
  // distant sea + hills on the left
  s += path('M0 250 q120 -40 260 -10 V330 H0 Z', { fill: '#7fbf6a' });
  // lawn
  s += rect(0, 300, w, h - 300, { fill: 'url(#lawn)' });
  // house: wall from x 300, roof edge on top, balcony beam
  s += rect(300, -10, 520, 375, { fill: 'url(#planks)', stroke: '#a8843a', strokeWidth: 5 });
  s += path('M285 -6 L820 -6 L820 22 L285 40 Z', { fill: C.roof, stroke: C.roofDark, strokeWidth: 4, strokeLinejoin: 'round' });
  for (let x = 300; x < 820; x += 26) s += path(`M${x} ${40 - ((x - 285) / 535) * 18} v-14`, { stroke: C.roofDark, strokeWidth: 2, opacity: 0.6 });
  // balcony above the door
  s += rect(600, 60, 210, 14, { rx: 4, fill: C.woodMid, stroke: C.woodDeep, strokeWidth: 3 });
  for (let x = 610; x < 810; x += 20) s += rect(x, 20, 9, 40, { rx: 4, fill: '#f0e2b8', stroke: '#a8843a', strokeWidth: 2 });
  s += rect(600, 14, 210, 10, { rx: 4, fill: C.woodMid, stroke: C.woodDeep, strokeWidth: 3 });
  // gutter / downpipe
  s += path('M520 40 V300 q0 12 -12 12 h-10', { fill: 'none', stroke: '#8a6a5a', strokeWidth: 9, strokeLinecap: 'round' }) +
    path('M520 40 V300 q0 12 -12 12 h-10', { fill: 'none', stroke: '#b89a8a', strokeWidth: 4, strokeLinecap: 'round' });
  // door frame + steps (door sprite 677,135 108x224)
  s += rect(668, 126, 126, 240, { rx: 10, fill: '#7a3f18' });
  s += rect(660, 358, 142, 12, { rx: 3, fill: '#c9c0b0', stroke: '#8a8070', strokeWidth: 2.5 }) + rect(650, 368, 162, 12, { rx: 3, fill: '#b9b2a6', stroke: '#8a8070', strokeWidth: 2.5 });
  s += rect(660, 378, 140, 8, { fill: C.red, opacity: 0.9 });
  // window frame shadow (window sprite 342,107)
  s += rect(336, 101, 150, 186, { rx: 10, fill: '#000', opacity: 0.12 });
  // flower box under the window
  s += rect(340, 286, 142, 22, { rx: 4, fill: C.woodMid, stroke: C.woodDeep, strokeWidth: 3 }) + flowers(380, 282, 4, 'box1', C.red) + flowers(440, 282, 4, 'box2', C.yellow);
  // wall base + house foundation
  s += rect(300, 358, 520, 12, { fill: '#a39a8c', stroke: '#6e665a', strokeWidth: 2 });
  // barrel + sunflower
  s += g({},
    ellipse(568, 360, 38, 8, { fill: '#000', opacity: 0.2 }),
    path('M536 300 q-6 30 0 58 h64 q6 -28 0 -58 z', { fill: '#a86a32', stroke: C.woodDeep, strokeWidth: 3 }),
    ellipse(568, 300, 32, 8, { fill: '#7a4a20', stroke: C.woodDeep, strokeWidth: 3 }),
    path('M534 318 h68 M533 344 h70', { stroke: '#555', strokeWidth: 4 }));
  s += path('M618 320 C 612 260 628 200 620 140', { fill: 'none', stroke: C.grassDark, strokeWidth: 6, strokeLinecap: 'round' }) +
    path('M620 250 q22 -14 30 0 q-14 10 -30 0 M618 210 q-22 -12 -30 2 q14 8 30 -2', { fill: C.grass, stroke: C.grassDark, strokeWidth: 2 }) +
    Array.from({ length: 12 }, (_, i) => {
      const a = (i * Math.PI) / 6;
      return ellipse(620 + Math.cos(a) * 17, 132 + Math.sin(a) * 17, 10, 5, { fill: C.yellow, stroke: C.yellowDark, strokeWidth: 1.5, transform: `rotate(${(i * 30)} ${620 + Math.cos(a) * 17} ${132 + Math.sin(a) * 17})` });
    }).join('') + circle(620, 132, 12, { fill: '#7a4a20', stroke: '#4a2a10', strokeWidth: 2 });
  // big tree on the left
  s += path('M150 440 C 160 360 140 300 170 230 L190 232 C 176 300 196 360 200 440 Z', { fill: '#8a5a32', stroke: '#4a2a10', strokeWidth: 4 }) +
    path('M168 280 q-40 -20 -70 -50 M182 260 q30 -30 70 -40', { fill: 'none', stroke: '#8a5a32', strokeWidth: 12, strokeLinecap: 'round' });
  const crown: [number, number, number][] = [[90, 170, 70], [190, 120, 90], [280, 180, 60], [140, 230, 60], [240, 240, 55], [40, 230, 50]];
  for (const [i, [x, y, r]] of crown.entries()) s += path(blob(x + 6, y + 8, r, r * 0.85, `t${i}s`, 0.18), { fill: '#2f7a3a' });
  for (const [i, [x, y, r]] of crown.entries()) s += path(blob(x, y, r, r * 0.85, `t${i}`, 0.18), { fill: i % 2 ? '#4fa64a' : '#5fb85a', stroke: '#2f7a3a', strokeWidth: 3 }) + path(blob(x - r * 0.25, y - r * 0.3, r * 0.4, r * 0.3, `t${i}h`, 0.2), { fill: '#8fd46a' });
  // garden path from the left (exit to the board) to the door
  s += path('M0 420 q300 -50 650 -40 h160 v20 q-420 0 -810 70 z', { fill: '#e9d29a', stroke: '#c4a860', strokeWidth: 3, opacity: 0.95 });
  s += bush(270, 330, 26, 'b1') + bush(40, 340, 30, 'b2', '#3f9a4a');
  s += flowers(250, 380, 5, 'f1') + flowers(340, 400, 4, 'f2') + flowers(110, 395, 4, 'f3');
  s += tufts(0, 330, 800, 110, 40, 'tf');
  return s;
}

export default defineMovie({
  Headline: (m, w, h) => headline('Bongos Haus', w, h),
  Background: (m, w, h) => background(w, h),
  'Door-*': (m, w, h) => doorFrames(m.frame ?? 1, 7, w, h, { hinge: 'right', wood: '#b8682e', id: `d${m.frame}`, outside: rect(8, 8, w - 16, h - 8, { fill: '#5a3a28' }) + rect(8, 8, w - 16, 30, { fill: '#e9c47a', opacity: 0.35 }) + rect(20, h - 60, w - 40, 50, { fill: '#7a5038' }) }),
  'Window-*': (m, w, h) => windowFrames(m.frame ?? 1, 6, w, h, { id: `w${m.frame}`, curtains: C.bandana, outside: rect(9, 9, w - 18, h - 28, { fill: '#e8d6a8' }) + rect(9, h - 60, w - 18, 41, { fill: '#c88a4a' }) + circle(w * 0.7, 50, 14, { fill: C.yellow, opacity: 0.9 }) + path(`M${w * 0.62} 64 q${w * 0.08} -26 ${w * 0.16} 0 z`, { fill: C.yellow }) }),
  // bell: frames 1..21 swing out and back (One-State animation plays 1 → 21)
  'Glocke-*': (m, w, h) => {
    const f = m.frame ?? 1;
    const deg = f === 1 ? 0 : 22 * Math.sin(((f - 1) / 20) * Math.PI * 3) * (1 - (f - 1) / 22);
    return wallBell(w, h, deg);
  },
  Blumentopf: (m, w, h) => g({ transform: `translate(${w / 2} ${h / 2}) scale(${w / 60} ${h / 62})` }, itemShape('OI004')),
  Hausschluessel: (m, w, h) => g({ transform: `translate(${w / 2} ${h / 2}) scale(${w / 64} ${h / 40})` }, itemShape('OI026')),
});
