// Seaside building blocks for the chapter-1 adventure scenes (lighthouse, beaches, bench at sea):
// sky with clouds, sea strip with wave highlights, sand dune, lighthouse tower bricks, leafy bush,
// deterministic sun-set sky. All functions draw in scene coordinates.

import { C, blob, defs, ellipse, g, linGrad, lt, path, r2, rect, rng } from './svg';

/** sky gradient + soft clouds over 0..w × 0..h */
export function skyWithClouds(id: string, w: number, h: number, o: { top?: string; bottom?: string; clouds?: [number, number, number][]; cloud?: string } = {}): string {
  let s = defs(linGrad(id, [[0, o.top ?? '#4f9fe0'], [1, o.bottom ?? C.skyLight]]));
  s += rect(0, 0, w, h, { fill: `url(#${id})` });
  for (const [i, [x, y, r]] of (o.clouds ?? []).entries()) s += cloud(x, y, r, `${id}c${i}`, o.cloud);
  return s;
}

/** fluffy flat cloud centred at x,y with radius r */
export function cloud(x: number, y: number, r: number, seed: string, col = C.white): string {
  return g({ opacity: 0.92 },
    ellipse(x, y + r * 0.25, r * 1.6, r * 0.42, { fill: col }),
    path(blob(x - r * 0.6, y, r * 0.55, r * 0.45, `${seed}a`, 0.1), { fill: col }),
    path(blob(x + r * 0.1, y - r * 0.2, r * 0.7, r * 0.6, `${seed}b`, 0.1), { fill: col }),
    path(blob(x + r * 0.8, y + r * 0.05, r * 0.5, r * 0.4, `${seed}c`, 0.1), { fill: col }));
}

/** sea between horizon y0 and y1 (x0..x1) with wave dashes */
export function seaStrip(id: string, x0: number, y0: number, x1: number, y1: number, seed = 1, o: { top?: string; bottom?: string } = {}): string {
  const r = rng(seed);
  let s = defs(linGrad(id, [[0, o.top ?? '#5aa8e0'], [1, o.bottom ?? C.water]]));
  s += rect(x0, y0, x1 - x0, y1 - y0, { fill: `url(#${id})` });
  let waves = '';
  const rows = Math.max(2, Math.round((y1 - y0) / 14));
  for (let j = 0; j < rows; j++) {
    const yy = y0 + 6 + (j / rows) * (y1 - y0 - 6);
    const len = 8 + (j / rows) * 22;
    for (let x = x0 + r() * 40; x < x1; x += 40 + r() * 70) waves += `M${r2(x)} ${r2(yy + r() * 6)} q${r2(len / 2)} -${r2(2 + j * 0.4)} ${r2(len)} 0 `;
  }
  s += path(waves, { fill: 'none', stroke: C.white, strokeWidth: 2.2, strokeLinecap: 'round', opacity: 0.55 });
  return s;
}

/** horizontal brick lines clipped to a polygon outline (tower bodies) */
export function brickLines(x0: number, y0: number, x1: number, y1: number, rowH: number, col: string, op = 0.35): string {
  let d = '';
  let row = 0;
  for (let y = y0; y < y1; y += rowH, row++) {
    d += `M${x0} ${y} H${x1} `;
    for (let x = x0 + (row % 2 ? rowH : 0); x < x1; x += rowH * 2) d += `M${x} ${y} v${rowH} `;
  }
  return path(d, { fill: 'none', stroke: col, strokeWidth: 1.6, opacity: op });
}

/** leafy bush made of blobs */
export function leafyBush(x: number, y: number, r: number, seed: string, col = '#4fa64a', dark = '#2f7a3a'): string {
  const parts: [number, number, number][] = [[-0.6, 0.1, 0.6], [0.5, 0.05, 0.65], [0, -0.35, 0.7], [-0.25, 0.3, 0.55], [0.35, 0.35, 0.5]];
  let s = '';
  for (const [i, [dx, dy, rr]] of parts.entries()) s += path(blob(x + dx * r + 4, y + dy * r + 5, rr * r, rr * r * 0.85, `${seed}s${i}`, 0.2), { fill: dark });
  for (const [i, [dx, dy, rr]] of parts.entries()) s += path(blob(x + dx * r, y + dy * r, rr * r, rr * r * 0.85, `${seed}${i}`, 0.2), { fill: i % 2 ? col : lt(col, 0.1), stroke: dark, strokeWidth: 3 });
  for (const [i, [dx, dy, rr]] of parts.slice(0, 3).entries()) s += path(blob(x + dx * r - rr * r * 0.25, y + dy * r - rr * r * 0.3, rr * r * 0.35, rr * r * 0.25, `${seed}h${i}`, 0.2), { fill: '#8fd46a' });
  return s;
}
