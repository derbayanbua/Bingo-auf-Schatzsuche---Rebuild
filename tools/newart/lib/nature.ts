// Top-down landscape pieces for the boards (Landscape SPxxx) and shared decoration:
// tree crowns with cast shadow, bushes, flowers, rocks, palms, roofs, fences, roads.
// All functions draw at absolute coordinates and return SVG strings.

import { C, blob, circle, dk, ellipse, g, line, lt, path, r2, rect, rng } from './svg';

/** light comes from the upper left: shadows fall to the lower right */
export const SHADOW_DX = 34, SHADOW_DY = 22;

/** tree crown seen from above (cx,cy = crown centre, r = radius) + optional cast shadow */
export function treeTop(cx: number, cy: number, r: number, seed: number | string, o: { shadow?: boolean; light?: string; dark?: string; base?: string } = {}): string {
  const R = rng(seed);
  const base = o.base ?? '#4fa64a', light = o.light ?? '#8fd46a', dark = o.dark ?? '#2f7a3a';
  let s = '';
  if (o.shadow !== false) s += path(blob(cx + SHADOW_DX * (r / 90), cy + SHADOW_DY * (r / 90), r * 1.02, r * 0.92, `${seed}s`, 0.2, 11), { fill: '#000', opacity: 0.2 });
  s += path(blob(cx, cy, r, r * 0.95, `${seed}a`, 0.16, 12), { fill: base, stroke: dark, strokeWidth: Math.max(2, r / 30) });
  // leaf clusters: darker lower-right, lighter upper-left
  for (let i = 0; i < 9; i++) {
    const a = R() * Math.PI * 2, d = R() * r * 0.55;
    const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d;
    const rr = r * (0.25 + R() * 0.18);
    s += path(blob(x + rr * 0.15, y + rr * 0.15, rr, rr * 0.9, `${seed}d${i}`, 0.2, 8), { fill: dark, opacity: 0.35 });
    s += path(blob(x, y, rr * 0.85, rr * 0.8, `${seed}l${i}`, 0.2, 8), { fill: R() > 0.5 ? base : lt(base, 0.12) });
    s += path(blob(x - rr * 0.25, y - rr * 0.25, rr * 0.4, rr * 0.35, `${seed}h${i}`, 0.25, 7), { fill: light, opacity: 0.9 });
  }
  return s;
}

export function bush(cx: number, cy: number, r: number, seed: number | string, col = '#4fa64a'): string {
  return path(blob(cx + r * 0.3, cy + r * 0.25, r, r * 0.85, `${seed}s`, 0.2), { fill: '#000', opacity: 0.18 }) +
    path(blob(cx, cy, r, r * 0.9, `${seed}`, 0.22, 9), { fill: col, stroke: dk(col, 0.4), strokeWidth: 2 }) +
    path(blob(cx - r * 0.25, cy - r * 0.25, r * 0.45, r * 0.4, `${seed}h`, 0.2), { fill: lt(col, 0.3) });
}

/** daisy patch */
export function flowers(cx: number, cy: number, n: number, seed: number | string, petal = '#ffffff', heart = C.yellow): string {
  const R = rng(seed);
  let s = '';
  for (let i = 0; i < n; i++) {
    const x = cx + (R() - 0.5) * 30, y = cy + (R() - 0.5) * 20, rr = 3.2 + R() * 1.5;
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 + R();
      s += ellipse(x + Math.cos(a) * rr, y + Math.sin(a) * rr, rr * 0.75, rr * 0.5, { fill: petal, stroke: '#c9c2d6', strokeWidth: 0.6, transform: `rotate(${r2((a * 180) / Math.PI)} ${r2(x + Math.cos(a) * rr)} ${r2(y + Math.sin(a) * rr)})` });
    }
    s += circle(x, y, rr * 0.55, { fill: heart, stroke: dk(heart, 0.3), strokeWidth: 0.6 });
  }
  return s;
}

/** boulder seen from above */
export function rockTop(cx: number, cy: number, rx: number, ry: number, seed: number | string, col = C.stone): string {
  return path(blob(cx + rx * 0.3, cy + ry * 0.35, rx, ry, `${seed}s`, 0.15), { fill: '#000', opacity: 0.22 }) +
    path(blob(cx, cy, rx, ry, `${seed}`, 0.16, 8), { fill: col, stroke: dk(col, 0.45), strokeWidth: 2.5 }) +
    path(blob(cx - rx * 0.2, cy - ry * 0.25, rx * 0.5, ry * 0.4, `${seed}h`, 0.2, 7), { fill: lt(col, 0.3) }) +
    path(`M${r2(cx + rx * 0.1)} ${r2(cy - ry * 0.1)} l${r2(rx * 0.25)} ${r2(ry * 0.3)}`, { stroke: dk(col, 0.35), strokeWidth: 2, strokeLinecap: 'round' });
}

/** fern / small palm from above */
export function fern(cx: number, cy: number, r: number, seed: number | string, col = '#3f9a4a'): string {
  const R = rng(seed);
  let s = '';
  const n = 7;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + R() * 0.4;
    const ex = cx + Math.cos(a) * r, ey = cy + Math.sin(a) * r;
    const mx = cx + Math.cos(a + 0.25) * r * 0.55, my = cy + Math.sin(a + 0.25) * r * 0.55;
    s += path(`M${r2(cx)} ${r2(cy)} Q${r2(mx)} ${r2(my)} ${r2(ex)} ${r2(ey)}`, { fill: 'none', stroke: dk(col, 0.35), strokeWidth: 7, strokeLinecap: 'round' });
    s += path(`M${r2(cx)} ${r2(cy)} Q${r2(mx)} ${r2(my)} ${r2(ex)} ${r2(ey)}`, { fill: 'none', stroke: col, strokeWidth: 4.5, strokeLinecap: 'round' });
  }
  return s + circle(cx, cy, 3, { fill: dk(col, 0.4) });
}

/** palm crown from above */
export function palmTop(cx: number, cy: number, r: number, seed: number | string): string {
  const R = rng(seed);
  let s = path(blob(cx + r * 0.35, cy + r * 0.25, r * 0.9, r * 0.8, `${seed}s`, 0.3, 10), { fill: '#000', opacity: 0.18 });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + R() * 0.3;
    const ex = cx + Math.cos(a) * r, ey = cy + Math.sin(a) * r;
    const nx = -Math.sin(a) * r * 0.16, ny = Math.cos(a) * r * 0.16;
    s += path(`M${r2(cx)} ${r2(cy)} Q${r2(cx + Math.cos(a) * r * 0.5 + nx)} ${r2(cy + Math.sin(a) * r * 0.5 + ny)} ${r2(ex)} ${r2(ey)} Q${r2(cx + Math.cos(a) * r * 0.5 - nx)} ${r2(cy + Math.sin(a) * r * 0.5 - ny)} ${r2(cx)} ${r2(cy)} Z`, { fill: i % 2 ? '#4fa64a' : '#3f8f45', stroke: '#2a6a30', strokeWidth: 1.8 });
  }
  return s + circle(cx, cy, r * 0.12, { fill: '#8a5428', stroke: '#4a2a10', strokeWidth: 2 });
}

/** gable roof from above (ridge horizontal), with chimney */
export function roofTop(x: number, y: number, w: number, h: number, o: { col?: string; chimney?: [number, number] } = {}): string {
  const col = o.col ?? C.roof;
  let s = rect(x + SHADOW_DX * 0.5, y + SHADOW_DY * 0.5, w, h, { fill: '#000', opacity: 0.22, rx: 3 });
  s += rect(x, y, w, h / 2, { fill: lt(col, 0.08), stroke: dk(col, 0.45), strokeWidth: 3 });
  s += rect(x, y + h / 2, w, h / 2, { fill: dk(col, 0.12), stroke: dk(col, 0.45), strokeWidth: 3 });
  for (let yy = y + 10; yy < y + h - 4; yy += 11) s += line(x + 3, yy, x + w - 3, yy, { stroke: dk(col, 0.3), strokeWidth: 1.6, opacity: 0.6 });
  s += line(x, y + h / 2, x + w, y + h / 2, { stroke: dk(col, 0.5), strokeWidth: 4 });
  if (o.chimney) s += rect(o.chimney[0], o.chimney[1], 18, 16, { fill: '#8a5a3a', stroke: '#4a2a10', strokeWidth: 2.5 }) + rect(o.chimney[0] + 3, o.chimney[1] + 3, 12, 10, { fill: '#2a1a10' });
  return s;
}

/** fence line (posts + rails) from above */
export function fence(x1: number, y1: number, x2: number, y2: number, col = '#8a5428'): string {
  const n = Math.max(2, Math.round(Math.hypot(x2 - x1, y2 - y1) / 26));
  let s = line(x1, y1, x2, y2, { stroke: dk(col, 0.4), strokeWidth: 6, strokeLinecap: 'round' }) + line(x1, y1, x2, y2, { stroke: col, strokeWidth: 3.5, strokeLinecap: 'round' });
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    s += rect(x1 + (x2 - x1) * t - 3.5, y1 + (y2 - y1) * t - 3.5, 7, 7, { rx: 1.5, fill: lt(col, 0.1), stroke: dk(col, 0.45), strokeWidth: 1.8 });
  }
  return s;
}

/** soft-edged road along a polyline (fill = pattern url or colour) */
export function road(pts: [number, number][], width: number, fill: string, edge = '#00000033'): string {
  const d = 'M' + pts.map(([x, y]) => `${r2(x)} ${r2(y)}`).join(' L');
  return path(d, { fill: 'none', stroke: edge, strokeWidth: width + 8, strokeLinecap: 'round', strokeLinejoin: 'round' }) +
    path(d, { fill: 'none', stroke: fill, strokeWidth: width, strokeLinecap: 'round', strokeLinejoin: 'round' });
}

/** grass tufts scattered over an area (deterministic) */
export function tufts(x: number, y: number, w: number, h: number, n: number, seed: number | string, col = C.grassDark): string {
  const R = rng(seed);
  let s = '';
  for (let i = 0; i < n; i++) {
    const tx = x + R() * w, ty = y + R() * h;
    s += path(`M${r2(tx)} ${r2(ty)} l-3 -7 M${r2(tx)} ${r2(ty)} l0 -9 M${r2(tx)} ${r2(ty)} l3 -7`, { stroke: col, strokeWidth: 1.8, strokeLinecap: 'round', fill: 'none' });
  }
  return g({ opacity: 0.8 }, s);
}
