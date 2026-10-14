// Wooden chest ("Box" behaviour): the chest in the scene with an opening lid, and the full-screen
// view into the open chest (member "Box", 800x448, items are laid on top at the 8 container slots
// 215/315/415/515 × 162/272, 67x67 each).
//
//   chest(cx, bottom, w, h, d, t, id)  → chest in scene coordinates, t = 0 closed … 1 open
//   chestInside(w, h, id)              → 800x448 interior view

import { C, defs, dk, g, linGrad, lt, path, r2, rect } from './svg';
import { woodPattern } from './textures';

const WOOD = '#c27a3a', WOOD_D = '#5a3214';

export function chest(cx: number, bottom: number, w: number, h: number, d: number, t: number, id: string): string {
  const x0 = cx - w / 2, x1 = cx + w / 2, top = bottom - h;
  const dx = d * 0.55, dy = -d * 0.45; // oblique depth vector (to the back right)
  const sw = 3.5;
  const o = { stroke: WOOD_D, strokeWidth: sw, strokeLinejoin: 'round' as const };
  let s = defs(woodPattern(`${id}w`, { base: WOOD, dark: dk(WOOD, 0.25), plank: Math.max(10, h / 4), seed: 7 }));
  // side face
  s += path(`M${x1} ${top} l${dx} ${dy} V${bottom + dy} l${-dx} ${-dy} Z`, { fill: dk(WOOD, 0.22), ...o });
  // front face
  s += rect(x0, top, w, h, { fill: `url(#${id}w)`, ...o });
  s += path(`M${x0} ${top + h * 0.5} H${x1}`, { stroke: WOOD_D, strokeWidth: 2.5, opacity: 0.6 });
  // metal corners + lock plate
  for (const xx of [x0, x1 - 10]) s += rect(xx, top, 10, h, { fill: '#8a8f99', stroke: '#3a3d44', strokeWidth: 2 });
  s += rect(cx - 12, top + 4, 24, 18, { rx: 3, fill: C.gold, stroke: C.goldDark, strokeWidth: 2.5 }) + rect(cx - 2, top + 10, 4, 7, { rx: 1, fill: '#3a2a10' });
  s += path(`M${cx - 14} ${top + h * 0.62} q14 12 28 0`, { fill: 'none', stroke: '#6a6f79', strokeWidth: 4, strokeLinecap: 'round' });
  // top: interior (when open) + lid hinged at the back edge
  const back: [number, number] = [x0 + dx, top + dy];
  const a = t * Math.PI * 0.62;
  const lx = -dx * Math.cos(a), ly = -dy * Math.cos(a) - d * 1.05 * Math.sin(a);
  const lidTh = Math.max(6, h * 0.12);
  if (t > 0) {
    s += path(`M${x0} ${top} L${back[0]} ${back[1]} H${back[0] + w} L${x1} ${top} Z`, { fill: '#3a2210', ...o });
    s += path(`M${x0 + 6} ${top} L${back[0] + 4} ${back[1] + 4} V${back[1] + h * 0.5} L${x0 + 6} ${top + h * 0.4} Z`, { fill: '#5a3418', opacity: 0.8 });
  }
  const p0 = back, p1: [number, number] = [back[0] + w, back[1]];
  const q0: [number, number] = [p0[0] + lx, p0[1] + ly], q1: [number, number] = [p1[0] + lx, p1[1] + ly];
  const n = (pt: [number, number]) => `${r2(pt[0])} ${r2(pt[1])}`;
  // lid thickness towards the viewer side
  const thick = Math.cos(a) > 0.3 ? lidTh : lidTh * 0.6;
  s += path(`M${n(q0)} L${n(q1)} l0 ${r2(thick)} L${r2(q0[0])} ${r2(q0[1] + thick)} Z`, { fill: dk(WOOD, 0.1), ...o });
  s += path(`M${n(p1)} L${n(q1)} l0 ${r2(thick)} L${r2(p1[0])} ${r2(p1[1] + thick)} Z`, { fill: dk(WOOD, 0.3), ...o });
  s += path(`M${n(p0)} L${n(p1)} L${n(q1)} L${n(q0)} Z`, { fill: t > 0.5 ? dk(WOOD, 0.15) : lt(WOOD, 0.12), ...o });
  s += path(`M${r2((p0[0] + q0[0]) / 2)} ${r2((p0[1] + q0[1]) / 2)} L${r2((p1[0] + q1[0]) / 2)} ${r2((p1[1] + q1[1]) / 2)}`, { stroke: WOOD_D, strokeWidth: 2, opacity: 0.5 });
  return g({}, s);
}

/** full-screen view into the open chest */
export function chestInside(w: number, h: number, id = 'box'): string {
  let s = defs(
    woodPattern(`${id}f`, { base: '#8a5428', dark: '#5a3214', plank: 34, seed: 2 }),
    woodPattern(`${id}s`, { base: '#c88a4a', dark: '#8a5428', plank: 30, vertical: true, seed: 4 }),
    linGrad(`${id}sh`, [[0, '#000', 0.45], [1, '#000', 0]]),
  );
  s += rect(0, 0, w, h, { fill: '#2a1608' });
  // rim (top edge seen from above)
  s += rect(0, 0, w, 40, { fill: `url(#${id}f)` }) + rect(0, 0, w, 40, { fill: '#000', opacity: 0.15 });
  // back wall
  s += path(`M60 40 H740 L640 130 H160 Z`, { fill: `url(#${id}f)`, stroke: '#3a2010', strokeWidth: 4 });
  // floor
  s += rect(160, 130, 480, 240, { fill: `url(#${id}f)`, stroke: '#3a2010', strokeWidth: 4 });
  s += rect(160, 130, 480, 50, { fill: `url(#${id}sh)` });
  // side walls
  s += path(`M60 40 L160 130 V370 L60 440 Z`, { fill: `url(#${id}s)`, stroke: '#3a2010', strokeWidth: 4 });
  s += path(`M740 40 L640 130 V370 L740 440 Z`, { fill: `url(#${id}s)`, stroke: '#3a2010', strokeWidth: 4 });
  s += path(`M740 40 L640 130 V370 L740 440 Z`, { fill: '#000', opacity: 0.18 });
  // front wall (bottom strip)
  s += path(`M60 440 L160 370 H640 L740 440 Z`, { fill: dk('#c88a4a', 0.1), stroke: '#3a2010', strokeWidth: 4 });
  // iron handles on the side walls
  for (const [x, dir] of [[108, 1], [692, -1]] as [number, number][]) {
    s += path(`M${x} 170 q${dir * 16} 70 0 140`, { fill: 'none', stroke: '#3a3d44', strokeWidth: 12, strokeLinecap: 'round' });
    s += path(`M${x} 170 q${dir * 16} 70 0 140`, { fill: 'none', stroke: '#9aa0aa', strokeWidth: 5, strokeLinecap: 'round' });
    s += rect(x - 9, 160, 18, 20, { rx: 3, fill: '#6a6f79', stroke: '#2a2c33', strokeWidth: 2.5 }) + rect(x - 9, 300, 18, 20, { rx: 3, fill: '#6a6f79', stroke: '#2a2c33', strokeWidth: 2.5 });
  }
  // outer rim frame
  s += rect(2, 2, w - 4, h - 4, { fill: 'none', stroke: '#5a3214', strokeWidth: 8, rx: 6 });
  return s;
}
