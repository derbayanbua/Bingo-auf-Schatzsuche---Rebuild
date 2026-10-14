// AS009-04 "Saftkeller" (villa cellar): the butler waiting between the barrels (crops: Arm 338,200 18 frames wave,
// Hand 281,263, Augen 314,220, Mund 315,247), juice barrel with tap (hotspot GS009-02), wine bottle item
// (Weinflasche 411,218), chest (Box-1 125,347; member "Box" = view into the chest).
import { defineMovie, Member } from '../lib/api';
import { chest, chestInside } from '../lib/chest';
import { itemShape } from '../lib/items';
import { npcRig, rigAtEye, rigMouthDy } from '../lib/npcrig';
import { inScene } from '../lib/stageloc';
import { C, circle, defs, dk, ellipse, g, path, r2, rect } from '../lib/svg';
import { boardsPattern, cobblePattern } from '../lib/textures';
import { headline } from '../lib/ui';

type St = Record<string, number>;
const tt = (f: number | undefined, n: number) => ((f ?? 1) - 1) / (n - 1);
const K = 0.69;
const CHEST = { cx: 178, bottom: 436, w: 100, h: 60, d: 50 };

function rack(x: number, y: number, w: number, h: number): string {
  let s = rect(x, y, w, h, { fill: '#6a4422', stroke: '#3a2210', strokeWidth: 3 });
  for (let i = 0; i <= w; i += 24) s += path(`M${x + i} ${y} l${Math.min(24, w - i)} ${h} M${x + i} ${y + h} l${Math.min(24, w - i)} ${-h}`, { stroke: '#8a5a2a', strokeWidth: 4 });
  for (let i = 12; i < w; i += 24) for (let j = 14; j < h; j += 26) s += circle(x + i, y + j, 6, { fill: '#2f6a3a', stroke: '#1a3a20', strokeWidth: 2 });
  return s;
}

function world(st: St = {}): string {
  let s = defs(cobblePattern('brick', { base: '#b8705a', mortar: '#6a3a2a', size: 24, seed: 41 }), boardsPattern('floor', { base: '#8a6a4a', dark: '#5a4028', w: 34 }));
  s += rect(0, 0, 800, 448, { fill: 'url(#brick)' });
  // vaults
  s += path('M-20 300 Q-20 40 200 30 Q400 40 400 300', { fill: 'none', stroke: '#5a2a1a', strokeWidth: 10, opacity: 0.6 });
  s += path('M400 300 Q400 60 590 60 Q780 60 800 300', { fill: 'none', stroke: '#5a2a1a', strokeWidth: 10, opacity: 0.6 });
  s += path('M60 300 Q60 120 200 110 Q340 120 340 300 Z', { fill: '#000', opacity: 0.18 }) + path('M470 300 Q470 140 590 130 Q720 140 720 300 Z', { fill: '#000', opacity: 0.18 });
  // floor
  s += rect(0, 290, 800, 158, { fill: 'url(#floor)' }) + path('M0 290 H800', { stroke: '#3a2210', strokeWidth: 4 });
  // wine racks
  s += rack(210, 210, 110, 84) + rack(410, 210, 70, 80) + rack(520, 214, 130, 80);
  // pillar
  s += rect(370, 160, 38, 160, { fill: 'url(#brick)', stroke: '#5a2a1a', strokeWidth: 4 }) + rect(370, 160, 38, 160, { fill: '#000', opacity: 0.12 });
  // juice barrel on a trestle with tap (left)
  s += path('M10 320 L60 250 M150 320 L100 250 M40 320 L110 250', { stroke: '#a88a5a', strokeWidth: 8, strokeLinecap: 'round' });
  s += path('M-20 170 H130 Q150 220 130 270 H-20 Z', { fill: '#7a5a3a', stroke: '#3a2210', strokeWidth: 4 });
  s += path('M20 170 Q4 220 20 270 M80 170 Q64 220 80 270', { fill: 'none', stroke: '#4a4a4a', strokeWidth: 6 });
  s += ellipse(132, 220, 22, 50, { fill: '#c8a878', stroke: '#3a2210', strokeWidth: 4 });
  s += path('M150 240 h20 v10 h-6 v10 h-8 v-10 h-6 z', { fill: '#c8ccd2', stroke: '#4a4e58', strokeWidth: 2 }) + rect(150, 230, 10, 14, { fill: '#c8a838' });
  s += ellipse(166, 300, 28, 8, { fill: '#e8e0d0', stroke: '#8a8070', strokeWidth: 2 }) + path('M150 300 v20 M182 300 v20', { stroke: '#8a8070', strokeWidth: 4 });
  // table + chairs (right)
  s += ellipse(560, 286, 64, 14, { fill: '#e8d8a8', stroke: '#8a7a50', strokeWidth: 3 }) + path('M560 300 V380 M530 380 H590', { stroke: '#8a7a50', strokeWidth: 8, strokeLinecap: 'round' });
  s += rect(552, 236, 12, 44, { rx: 4, fill: '#2f6a3a', stroke: '#1a3a20', strokeWidth: 2 }) + rect(555, 226, 6, 12, { fill: '#2f6a3a' });
  for (const [x, y, sc] of [[450, 250, 1.1], [620, 240, 1]] as [number, number, number][]) {
    s += g({ transform: `translate(${x} ${y}) scale(${sc})` },
      path('M0 0 V140 M60 0 V140 M10 60 L4 140 M54 60 L58 140', { stroke: '#c8b078', strokeWidth: 6, strokeLinecap: 'round' }),
      path('M-4 70 H64 L70 84 H-8 Z', { fill: '#d8c088', stroke: '#8a7a50', strokeWidth: 3 }),
      path('M0 14 H60 M0 30 H60 M0 46 H60', { stroke: '#c8b078', strokeWidth: 4 }));
  }
  // butler
  {
    const [x, y] = rigAtEye('Butler', [330, 225], K);
    const a = tt(st.Arm, 18), b = tt(st.Hand, 4);
    const up = a;
    s += npcRig('Butler', x, y, K, {
      eyes: (['open', 'left', 'right', 'up'] as const)[(st.Augen ?? 1) - 1], mouth: [1, 2, 3][(st.Mund ?? 1) - 1],
      face: { eyeK: 0.8, mouthK: 0.7, mouthDy: rigMouthDy('Butler', 225, 254, K) },
      armL: { hand: [298, 280], rot: -40 + 30 * b },
      armR: { hand: [366 + 4 * up, 296 - 80 * up], elbow: [376, 270 - 20 * up], rot: 20 - 40 * up + 20 * Math.sin(a * Math.PI * 4) * up },
    });
  }
  // chest shadow + closed chest is the Box sprite
  s += ellipse(CHEST.cx + 14, CHEST.bottom, 66, 8, { fill: '#000', opacity: 0.25 });
  return s;
}

const part = (st: (f: number) => St) => (m: Member) => inScene(m, world(st(m.frame ?? 1)));

export default defineMovie({
  Headline: (m, w, h) => headline('Saftkeller', w, h),
  Background: () => world(),
  '#3': (m, w, h) => chestInside(w, h),
  'Box-*': (m) => inScene(m, chest(CHEST.cx, CHEST.bottom, CHEST.w, CHEST.h, CHEST.d, ((m.frame ?? 1) - 1) / 5, `ch${m.frame}`)),
  Weinflasche: (m, w, h) => g({ transform: `translate(${w / 2} ${h / 2}) rotate(-80) scale(${r2(h / 64)})` }, itemShape('OI013')),
  'Arm-*': part((f) => ({ Arm: f })),
  'Hand-*': part((f) => ({ Hand: f })),
  'Augen-*': part((f) => ({ Augen: f })),
  'Mund-*': part((f) => ({ Mund: f })),
});
