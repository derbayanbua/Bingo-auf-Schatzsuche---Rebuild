// Interface_Lesson4: "Die Maus" – gym corner (two walls, parquet floor), basket on the right wall (Korb),
// ball + its floor shadow.
import { defineMovie } from '../lib/api';
import { C, circle, defs, dk, ellipse, g, line, linGrad, lt, path, poly, rect, rng } from '../lib/svg';
import { exitStrip } from '../lib/menus';
import { headline } from '../lib/ui';

function room(w: number, h: number): string {
  const R = rng('gym');
  let s = defs(linGrad('gl', [[0, '#e8e4d8'], [1, '#cfc8b8']]), linGrad('gr2', [[0, '#f2eee4'], [1, '#d8d2c2']], 0, 0, 1, 0));
  // floor first (boards through a vanishing point), the walls cover everything above the floor line
  let fl = rect(0, 200, 800, 248, { fill: '#c08a4a' });
  // boards running from the corner towards the viewer (lines through a vanishing point behind the corner)
  const vx = 330.5, vy = 150;
  for (let i = -30; i <= 30; i++) {
    const bx = 400 + i * 48;
    fl += line(vx, vy, bx, 448 + 200, { stroke: '#7a4a20', strokeWidth: 1.6, opacity: 0.6 });
  }
  // cross joints (staggered)
  for (let r = 0; r < 14; r++) {
    const y = 236 + r * r * 1.6 + r * 6;
    fl += path(`M0 ${y} L800 ${y + 125 - r * 4}`, { stroke: '#7a4a20', strokeWidth: 1.2, opacity: 0.35 });
  }
  for (let i = 0; i < 18; i++) fl += ellipse(60 + i * 45, 300 + (i % 5) * 28, 30, 4, { fill: '#e0b070', opacity: 0.25 });
  s += fl;
  s += poly([[0, 0], [330, 0], [330, 220], [0, 236]], { fill: 'url(#gl)' });
  s += poly([[330, 0], [800, 0], [800, 345], [330, 220]], { fill: 'url(#gr2)' });
  for (let i = 0; i < 40; i++) s += ellipse(R() * 800, R() * 200, 6 + R() * 16, 3 + R() * 6, { fill: '#b8b0a0', opacity: 0.25 });
  s += line(330, 0, 330, 220, { stroke: '#a8a090', strokeWidth: 3 });
  s += path('M0 236 L330 220 L800 345', { fill: 'none', stroke: '#6b4a2a', strokeWidth: 6 });
  return s;
}

function basket(w: number, h: number): string {
  return rect(40, 2, 56, 66, { rx: 3, fill: '#c8a040', stroke: '#6a4a10', strokeWidth: 3, transform: 'skewY(8)' }) +
    rect(52, 18, 28, 26, { fill: 'none', stroke: '#fff', strokeWidth: 3, transform: 'skewY(8)' }) +
    path('M8 40 L22 76 H58 L72 40', { fill: 'none', stroke: '#fff', strokeWidth: 2 }) +
    path('M18 40 L30 76 M30 40 L36 76 M42 40 L44 76 M54 40 L52 76 M64 40 L58 76 M12 52 H68 M16 64 H64', { stroke: '#fff', strokeWidth: 1.5 }) +
    ellipse(40, 40, 33, 7, { fill: 'none', stroke: C.red, strokeWidth: 4 });
}

function ball(w: number, h: number): string {
  const r = w / 2 - 2, c = '#ff8a3c';
  return circle(w / 2, h / 2, r, { fill: c, stroke: dk(c, 0.5), strokeWidth: 3 }) +
    path(`M${w / 2 - r} ${h / 2} H${w / 2 + r} M${w / 2} ${h / 2 - r} V${h / 2 + r}`, { stroke: dk(c, 0.5), strokeWidth: 2.5 }) +
    path(`M${w / 2 - r * 0.7} ${h / 2 - r * 0.7} q${r * 0.5} ${r * 0.7} 0 ${r * 1.4} M${w / 2 + r * 0.7} ${h / 2 - r * 0.7} q${-r * 0.5} ${r * 0.7} 0 ${r * 1.4}`, { fill: 'none', stroke: dk(c, 0.5), strokeWidth: 2.5 }) +
    path(`M${w / 2 - r * 0.55} ${h / 2 - r * 0.25} q${r * 0.15} ${-r * 0.35} ${r * 0.5} ${-r * 0.45}`, { fill: 'none', stroke: lt(c, 0.6), strokeWidth: 3, strokeLinecap: 'round' });
}

export default defineMovie({
  Headline: (m, w, h) => headline('Lektion 4: Die Maus – werfen, ziehen, ablegen', w, h),
  Raum: (m, w, h) => room(w, h),
  Ball: (m, w, h) => ball(w, h),
  Shadow: (m, w, h) => ellipse(w / 2, h / 2, w / 2 - 1, h / 2 - 1, { fill: '#000', opacity: 0.3 }),
  Korb: (m, w, h) => g({}, basket(w, h)),
  'Exit-Left': (m, w, h) => exitStrip(w, h, true),
  'Exit-Right': (m, w, h) => exitStrip(w, h, false),
});
