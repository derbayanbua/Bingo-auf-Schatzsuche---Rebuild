// Lighthouse lift (secret passage AS005-07/08/09/10): wooden basket hanging on four chains from a pulley block.
//   liftBasket(w, h, o) → drawn into a w×h canvas: hook/pulley at the top centre, basket filling the bottom part.
//   o.inner(x, y, w, h) → callback to draw a passenger between the back and the front slats.

import { C, circle, dk, g, lt, path, r2, rect } from './svg';

const WOOD = '#d8c08a', WOOD_D = '#7a6a3a';

function chain(x0: number, y0: number, x1: number, y1: number, sw: number): string {
  return path(`M${r2(x0)} ${r2(y0)} L${r2(x1)} ${r2(y1)}`, { stroke: '#2a2a2e', strokeWidth: sw * 1.6, strokeDasharray: `${r2(sw * 2.4)} ${r2(sw * 1.2)}`, strokeLinecap: 'round' }) +
    path(`M${r2(x0)} ${r2(y0)} L${r2(x1)} ${r2(y1)}`, { stroke: '#6a6a72', strokeWidth: sw * 0.6, strokeDasharray: `${r2(sw * 2.4)} ${r2(sw * 1.2)}` });
}

export function liftBasket(w: number, h: number, o: { pulley?: boolean; basketH?: number; inner?: (x: number, y: number, w: number, h: number) => string } = {}): string {
  const cx = w / 2;
  const s = Math.max(0.5, w / 250);
  const bh = o.basketH ?? h * 0.3;
  const by = h - bh - 4 * s;
  const bx0 = 6 * s, bx1 = w - 6 * s;
  const backY = by - 12 * s;
  const sw = 3 * s;
  let out = '';
  // top block
  const topY = o.pulley ? 34 * s : 8 * s;
  if (o.pulley) out += circle(cx, 18 * s, 16 * s, { fill: '#8a8f99', stroke: '#2a2c33', strokeWidth: 3 * s }) + circle(cx, 18 * s, 5 * s, { fill: '#2a2c33' });
  out += path(`M${cx} 0 V${topY}`, { stroke: '#2a2a2e', strokeWidth: 6 * s });
  out += rect(cx - 30 * s, topY, 60 * s, 14 * s, { rx: 3 * s, fill: '#5a5f68', stroke: '#2a2c33', strokeWidth: 2.5 * s });
  const hy = topY + 14 * s;
  // back chains + back slats
  out += chain(cx - 20 * s, hy, bx0 + 30 * s, backY, sw) + chain(cx + 20 * s, hy, bx1 - 30 * s, backY, sw);
  out += rect(bx0 + 24 * s, backY, bx1 - bx0 - 48 * s, bh * 0.75, { fill: dk(WOOD, 0.3), stroke: WOOD_D, strokeWidth: sw });
  // floor
  out += path(`M${bx0} ${h - 8 * s} L${bx0 + 24 * s} ${backY + bh * 0.75} H${bx1 - 24 * s} L${bx1} ${h - 8 * s} Z`, { fill: dk(WOOD, 0.15), stroke: WOOD_D, strokeWidth: sw });
  if (o.inner) out += o.inner(bx0, by, bx1 - bx0, bh);
  // front chains + front frame (posts + 3 slats)
  out += chain(cx - 24 * s, hy, bx0 + 4 * s, by, sw) + chain(cx + 24 * s, hy, bx1 - 4 * s, by, sw);
  for (const x of [bx0, bx1 - 12 * s, cx - 6 * s]) out += rect(x, by - 6 * s, 12 * s, bh + 6 * s, { rx: 3 * s, fill: WOOD, stroke: WOOD_D, strokeWidth: sw });
  for (const f of [0.15, 0.5, 0.88]) out += rect(bx0 - 2 * s, by + bh * f - 5 * s, bx1 - bx0 + 4 * s, 10 * s, { rx: 3 * s, fill: lt(WOOD, 0.1), stroke: WOOD_D, strokeWidth: sw });
  for (const x of [bx0 + 6 * s, bx1 - 6 * s]) out += circle(x, by - 8 * s, 6 * s, { fill: 'none', stroke: '#2a2a2e', strokeWidth: 3 * s });
  return g({}, out);
}

/** small red call button on a plate (canvas coordinates) */
export function callButton(w: number, h: number, plate = '#7a7f88'): string {
  const r = Math.min(w, h) * 0.32;
  return rect(2, 2, w - 4, h - 4, { rx: 5, fill: plate, stroke: '#2a2c33', strokeWidth: 2 }) +
    circle(w / 2, h / 2, r, { fill: C.red, stroke: C.redDark, strokeWidth: 2 }) + circle(w / 2 - r * 0.3, h / 2 - r * 0.3, r * 0.3, { fill: C.white, opacity: 0.6 });
}
