// AS005-08 "Leuchtturm" lift shaft with the airlock: steel tube in the rock with a round hatch (Schleuse 341,104,
// 16 frames: hand wheel turns 1-9, hatch swings open 10-16 → GS005-05), call button (Ruftaster 559,214),
// rope (Seil 341,0) and lift basket (Aufzug, loc 360,25).
import { defineMovie } from '../lib/api';
import { rockFill } from '../lib/cave';
import { callButton, liftBasket } from '../lib/lift';
import { inScene } from '../lib/stageloc';
import { C, circle, dk, ellipse, g, lt, path, r2, rect } from '../lib/svg';
import { headline } from '../lib/ui';

const STEEL = '#b8c0c8', BRASS = '#c8a848';

function background(): string {
  let s = rockFill(0, 0, 800, 448, 81, { base: '#c4a070', n: 40 });
  // shadow + tube mouth
  s += ellipse(470, 220, 170, 170, { fill: '#000', opacity: 0.25 });
  s += ellipse(440, 205, 150, 148, { fill: BRASS, stroke: '#6a5418', strokeWidth: 6 });
  s += ellipse(450, 205, 128, 130, { fill: '#8a7a40' });
  s += path('M330 150 Q360 90 440 80', { fill: 'none', stroke: lt(BRASS, 0.5), strokeWidth: 8, strokeLinecap: 'round' });
  // inner rim where the hatch sits
  s += ellipse(478, 196, 92, 100, { fill: '#6a5a28', stroke: '#4a3a10', strokeWidth: 4 });
  return s;
}

/** hatch: f 1..9 wheel turns, 10..16 hatch opens (hinge on the left) */
function hatch(f: number): string {
  const wheel = Math.min(f, 9) - 1;
  const open = f <= 9 ? 0 : (f - 9) / 7;
  const cx = 480, cy = 194;
  let s = '';
  if (open > 0) s += ellipse(478, 196, 86, 94, { fill: '#3a3a40' }) + ellipse(500, 196, 54, 62, { fill: '#c8d0d8', stroke: '#6a7078', strokeWidth: 3 }) +
    rect(486, 150, 30, 8, { rx: 2, fill: C.white, stroke: '#6a7078', strokeWidth: 1.5 });
  const k = Math.cos(open * Math.PI * 0.45);
  const hx = 396;
  s += g({ transform: `translate(${hx} 0) scale(${r2(k)} 1) translate(${-hx} 0)` },
    ellipse(cx, cy, 80, 90, { fill: dk(STEEL, 0.25 * open), stroke: '#4a5058', strokeWidth: 5 / Math.max(0.25, k) }),
    ellipse(cx - 10, cy - 14, 54, 60, { fill: 'none', stroke: lt(STEEL, 0.4), strokeWidth: 4 / Math.max(0.25, k) }),
    rect(cx + 52, cy - 50, 10, 100, { rx: 5, fill: '#d8d0b0', stroke: '#6a6040', strokeWidth: 3 / Math.max(0.25, k) }),
    g({ transform: `rotate(${wheel * 30} ${cx} ${cy})` },
      circle(cx, cy, 28, { fill: 'none', stroke: '#9a2a22', strokeWidth: 12 }), circle(cx, cy, 28, { fill: 'none', stroke: '#e8605a', strokeWidth: 7 }),
      ...[0, 120, 240].map((a) => path(`M${cx} ${cy} l${r2(Math.cos((a * Math.PI) / 180) * 28)} ${r2(Math.sin((a * Math.PI) / 180) * 28)}`, { stroke: '#c8403a', strokeWidth: 7, strokeLinecap: 'round' })),
      circle(cx, cy, 8, { fill: '#c8ccd2', stroke: '#4a5058', strokeWidth: 3 })),
    ...[-36, 36].map((dy) => rect(cx - 92, cy + dy - 10, 26, 20, { rx: 6, fill: STEEL, stroke: '#4a5058', strokeWidth: 3 })));
  return s;
}

export default defineMovie({
  Headline: (m, w, h) => headline('Leuchtturm', w, h),
  Background: () => background(),
  'Schleuse-*': (m) => inScene(m, hatch(m.frame ?? 1)),
  Ruftaster: (m, w, h) => callButton(w, h),
  Seil: (m, w, h) => path(`M${w / 2 - 6} 0 V${h} M${w / 2 + 6} 0 V${h}`, { stroke: '#2a2a2e', strokeWidth: 4 }),
  Aufzug: (m, w, h) => liftBasket(w, h, { pulley: true, basketH: 120 }),
});
