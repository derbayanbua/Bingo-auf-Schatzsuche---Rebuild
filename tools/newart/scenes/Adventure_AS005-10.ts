// AS005-10 "Leuchtturm" winch room: electric winch with rope drum (Trommel 179,276, 41 frames winding), rope over a
// ceiling pulley down to the lift (Aufzug loc 398,235, comes up through the floor hole), Composing-2 (pulley, rope,
// drum bearing – foreground), Composing-1 (front floor edge in front of the lift), diving gear on the bench (items in
// two positions each), call button (Ruftaster 457,287).
import { defineMovie } from '../lib/api';
import { itemShape } from '../lib/items';
import { callButton, liftBasket } from '../lib/lift';
import { inScene } from '../lib/stageloc';
import { C, circle, defs, dk, ellipse, g, linGrad, lt, path, r2, rect } from '../lib/svg';
import { cobblePattern, woodPattern } from '../lib/textures';
import { headline } from '../lib/ui';

function background(w: number, h: number): string {
  let s = defs(
    cobblePattern('br', { base: '#c8a078', mortar: '#8a6a48', size: 26, seed: 51 }),
    cobblePattern('br2', { base: '#b89068', mortar: '#7a5a38', size: 26, seed: 52 }),
    linGrad('fl', [[0, '#9a8a78'], [1, '#c8b8a4']]),
    woodPattern('bench', { base: '#d8a860', dark: '#a87838', plank: 14, seed: 5 }),
  );
  s += rect(0, 0, w, h, { fill: 'url(#br)' });
  s += path('M0 0 H800 L740 140 H120 Z', { fill: '#a88a68' }) + path('M0 0 L120 140 V350 L0 380 Z', { fill: 'url(#br2)' });
  s += path('M430 140 V340', { stroke: '#7a5a38', strokeWidth: 4 }) + path('M120 140 H740', { stroke: '#7a5a38', strokeWidth: 4 });
  // floor with the hole for the lift
  s += path('M0 380 L120 340 H800 V448 H0 Z', { fill: 'url(#fl)' });
  s += path('M296 372 L330 344 H470 L480 372 Z', { fill: '#2a2420' });
  // barred window
  s += rect(208, 214, 92, 70, { fill: '#9ad0f0', stroke: '#6a5a48', strokeWidth: 5 });
  for (let x = 220; x < 300; x += 12) s += path(`M${x} 214 V284`, { stroke: '#e8f4fa', strokeWidth: 5 });
  // winch motor (blue) + base plate
  s += path('M20 382 L60 352 H330 L360 382 Z', { fill: '#4a4e58', stroke: '#22252c', strokeWidth: 4 });
  s += ellipse(80, 318, 40, 60, { fill: '#3a4ab0', stroke: '#1a2270', strokeWidth: 4 }) + rect(80, 258, 90, 120, { fill: '#3a4ab0', stroke: '#1a2270', strokeWidth: 4 }) +
    ellipse(170, 318, 30, 60, { fill: '#9aa8c8', stroke: '#1a2270', strokeWidth: 4 });
  for (let i = 0; i < 6; i++) s += path(`M${92 + i * 12} 266 V370`, { stroke: '#2a3490', strokeWidth: 3 });
  // bench with the diving gear
  s += rect(498, 296, 284, 14, { rx: 3, fill: 'url(#bench)', stroke: '#7a5428', strokeWidth: 3 }) + rect(510, 336, 260, 10, { rx: 3, fill: 'url(#bench)', stroke: '#7a5428', strokeWidth: 3 }) +
    [504, 754].map((x) => rect(x, 296, 20, 82, { fill: 'url(#bench)', stroke: '#7a5428', strokeWidth: 3 })).join('');
  // post with the call button
  s += rect(458, 300, 14, 72, { fill: '#9a9aa2', stroke: '#4a4a52', strokeWidth: 3 });
  // ceiling pulley plate (pulley + rope are Composing-2)
  return s;
}

function drum(f: number): string {
  const n = Math.round(((f - 1) / 40) * 9);
  const rot = (f - 1) * 18;
  let s = rect(196, 290, 90, 66, { rx: 8, fill: '#8a7a6a', stroke: '#3a3028', strokeWidth: 4 });
  for (let i = 0; i < n; i++) s += path(`M${200 + i * 9} 292 v62`, { stroke: '#e8d8a0', strokeWidth: 7, strokeLinecap: 'round' }) + path(`M${200 + i * 9} 292 v62`, { stroke: '#a89860', strokeWidth: 2 });
  s += ellipse(196, 323, 12, 34, { fill: '#6a5a4a', stroke: '#3a3028', strokeWidth: 4 });
  s += g({ transform: `rotate(${rot} 196 323)` }, path('M196 296 V350', { stroke: '#3a3028', strokeWidth: 3 }));
  return s;
}

function bearing(): string {
  return path('M262 400 V300 Q262 270 300 268 Q336 270 336 300 V400 Z', { fill: '#3a3a40', stroke: '#15151a', strokeWidth: 4 }) +
    circle(300, 312, 14, { fill: '#2f8f4a', stroke: '#15151a', strokeWidth: 3 }) + circle(300, 312, 5, { fill: '#c8ccd2' }) +
    path('M248 400 H352', { stroke: '#15151a', strokeWidth: 8, strokeLinecap: 'round' });
}

function pulleyRope(): string {
  return rect(296, 106, 150, 14, { rx: 3, fill: '#c8ccd2', stroke: '#4a4e58', strokeWidth: 3 }) +
    [306, 436].map((x) => circle(x, 113, 4, { fill: '#2a2c33' })).join('') +
    path('M372 120 v14', { stroke: '#4a4e58', strokeWidth: 8 }) + circle(372, 146, 16, { fill: '#9aa0aa', stroke: '#2a2c33', strokeWidth: 4 }) + circle(372, 146, 5, { fill: '#2a2c33' }) +
    path('M360 156 L286 300', { stroke: '#7a6a3a', strokeWidth: 6, strokeLinecap: 'round' }) + path('M360 156 L286 300', { stroke: '#e8d8a0', strokeWidth: 3, strokeLinecap: 'round' });
}

function floorEdge(): string {
  return path('M275 448 L296 372 H480 L500 448 Z', { fill: 'url(#fl2)' }) + path('M296 372 H480', { stroke: '#6a5a48', strokeWidth: 4 });
}

const item = (id: string, w: number, h: number, rot = 0) => {
  const a = (rot * Math.PI) / 180;
  const bw = 60 * Math.abs(Math.cos(a)) + 56 * Math.abs(Math.sin(a)), bh = 60 * Math.abs(Math.sin(a)) + 56 * Math.abs(Math.cos(a));
  const k = Math.min(w / bw, h / bh) * 1.1;
  return g({ transform: `translate(${w / 2} ${h / 2}) rotate(${rot}) scale(${r2(k)})` }, itemShape(id));
};

export default defineMovie({
  Headline: (m, w, h) => headline('Leuchtturm', w, h),
  Background: (m, w, h) => background(w, h),
  'Trommel-*': (m) => inScene(m, drum(m.frame ?? 1)),
  'Composing-2': (m) => inScene(m, pulleyRope() + bearing()),
  'Composing-1': (m) => inScene(m, defs(linGrad('fl2', [[0, '#9a8a78'], [1, '#c8b8a4']])) + floorEdge().replace('url(#fl2)', '#b4a490')),
  Aufzug: (m, w, h) => liftBasket(w, h, { basketH: 90 }),
  Seil: (m, w, h) => path(`M${w / 2} 0 V${h}`, { stroke: '#e8d8a0', strokeWidth: 4 }),
  Ruftaster: (m, w, h) => callButton(w, h, '#9a9aa2'),
  'Taucherbrille-1': (m, w, h) => item('OI021', w, h),
  'Taucherbrille-2': (m, w, h) => item('OI021', w, h, 70),
  'Sauerstoffflaschen-1': (m, w, h) => item('OI022', w, h, 80),
  'Sauerstoffflaschen-2': (m, w, h) => item('OI022', w, h, 20),
  'Flossen-1': (m, w, h) => item('OI023', w, h, 10),
  'Flossen-2': (m, w, h) => item('OI023', w, h, 25),
});
