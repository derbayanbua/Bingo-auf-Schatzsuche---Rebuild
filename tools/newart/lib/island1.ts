// Board kit for island 1 (Landscape SP002–SP019): point lookup, organic ground regions (sand, water,
// grass), shore lines, docks and small top-down props (benches, parasol, market stalls, gazebo …).
// Everything is drawn in scene coordinates (800×448, scene y = stage y − 45), light from the upper left.

import { C, blob, circle, defs, dk, ellipse, g, line, lt, path, r2, rect, rng } from './svg';
import { cobblePattern, dirtPattern, grassPattern, sandPattern, waterPattern } from './textures';
import { SHADOW_DX, SHADOW_DY } from './nature';
import boards from '../../../src/data/boards.json';

export type Pt = { n: number; x: number; y: number; g: number };
export type XY = [number, number];

/** board points in scene coordinates */
export function boardPts(id: string): Pt[] {
  return ((boards as unknown as { boards: Record<string, Pt[]> }).boards[id] ?? []).map((p) => ({ ...p, y: p.y - 45 }));
}
/** point lookup P(n) → [x, y] */
export function pointFn(id: string): (n: number) => XY {
  const pts = boardPts(id);
  return (n) => {
    const p = pts.find((q) => q.n === n)!;
    return [p.x, p.y];
  };
}

/** standard pattern set: gr (grass), cob, dirt, sand, wat */
export function boardDefs(seed = 1, extra = ''): string {
  return defs(grassPattern('gr', { base: '#6cc060', seed: 4 + seed }), cobblePattern('cob', { seed: 8 + seed }), dirtPattern('dirt', 3 + seed),
    sandPattern('sand', 5 + seed), waterPattern('wat', { base: '#3a9ae0', seed: 9 + seed }), extra);
}

/** closed Catmull-Rom spline through the points (organic outline) */
export function smooth(pts: XY[], closed = true): string {
  const n = pts.length;
  const at = (i: number) => pts[closed ? (i + n) % n : Math.max(0, Math.min(n - 1, i))];
  let d = `M${r2(pts[0][0])} ${r2(pts[0][1])}`;
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    const c1: XY = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: XY = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${r2(c1[0])} ${r2(c1[1])} ${r2(c2[0])} ${r2(c2[1])} ${r2(p2[0])} ${r2(p2[1])}`;
  }
  return closed ? d + ' Z' : d;
}

/** filled organic region with a darker soft edge */
export function region(pts: XY[], fill: string, edge = '#00000026', edgeW = 8): string {
  const d = smooth(pts);
  return path(d, { fill: 'none', stroke: edge, strokeWidth: edgeW, strokeLinejoin: 'round' }) + path(d, { fill });
}

/** sand region */
export const sandArea = (pts: XY[]) => region(pts, 'url(#sand)', '#c9a24e66', 10);
/** grass region on top of sand */
export const grassArea = (pts: XY[]) => region(pts, 'url(#gr)', '#3f8f4555', 8);

/** water region: wet-sand rim, water, foam line along the outline, some glints inside */
export function waterArea(pts: XY[], seed: number | string): string {
  const d = smooth(pts);
  const R = rng(seed);
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  let glints = '';
  for (let i = 0; i < 22; i++) {
    const x = x0 + R() * (x1 - x0), y = y0 + R() * (y1 - y0), l = 10 + R() * 16;
    glints += path(`M${r2(x)} ${r2(y)} q${r2(l / 4)} -4 ${r2(l / 2)} 0 t${r2(l / 2)} 0`, { fill: 'none', stroke: '#ffffff', strokeWidth: 2.2, strokeLinecap: 'round', opacity: 0.55 });
  }
  const clip = `wc${String(seed).replace(/\W/g, '')}`;
  return path(d, { fill: 'none', stroke: '#c9a24e', strokeWidth: 26, strokeLinejoin: 'round', opacity: 0.55 }) +
    path(d, { fill: 'url(#wat)', stroke: '#bfe6ff', strokeWidth: 9, strokeLinejoin: 'round' }) +
    path(d, { fill: 'none', stroke: '#ffffff', strokeWidth: 3, strokeLinejoin: 'round', strokeDasharray: '14 9', opacity: 0.9 }) +
    `<clipPath id="${clip}"><path d="${d}"/></clipPath>` + g({ 'clip-path': `url(#${clip})` }, glints);
}

/** dashed guide marks between neighbouring fields (as on SP001) */
export function guideMarks(pts: Pt[]): string {
  let s = '';
  for (const p of pts) {
    for (const q of pts) {
      if (q.n <= p.n || Math.hypot(q.x - p.x, q.y - p.y) > 76) continue;
      const mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2;
      const horiz = Math.abs(q.x - p.x) > Math.abs(q.y - p.y);
      s += path(horiz ? `M${r2(mx - 8)} ${r2(my)} h16` : `M${r2(mx)} ${r2(my - 8)} v16`, { stroke: dk('#8a7a60', 0.2), strokeWidth: 4, strokeLinecap: 'round', opacity: 0.45 });
    }
  }
  return s;
}

/** wooden jetty from (x1,y1) to (x2,y2), planks across, posts at the sides */
export function dock(x1: number, y1: number, x2: number, y2: number, w: number): string {
  const len = Math.hypot(x2 - x1, y2 - y1), ang = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
  let s = rect(6, -w / 2 + 10, len, w, { fill: '#000', opacity: 0.22 });
  s += rect(0, -w / 2, len, w, { fill: '#c08a52', stroke: '#6b3e18', strokeWidth: 3, rx: 3 });
  for (let x = 12; x < len - 4; x += 12) s += line(x, -w / 2 + 2, x, w / 2 - 2, { stroke: '#7a4a20', strokeWidth: 1.8, opacity: 0.8 });
  s += line(4, -w / 2 + 5, len - 4, -w / 2 + 5, { stroke: lt('#c08a52', 0.35), strokeWidth: 2, opacity: 0.8 });
  for (let x = 6; x < len; x += 46) s += circle(x, -w / 2 - 1, 5, { fill: '#8a5428', stroke: '#4a2a10', strokeWidth: 2 }) + circle(x, w / 2 + 1, 5, { fill: '#8a5428', stroke: '#4a2a10', strokeWidth: 2 });
  return g({ transform: `translate(${r2(x1)} ${r2(y1)}) rotate(${r2(ang)})` }, s);
}

/** park bench from above (centre, rotation in degrees; long side horizontal at 0) */
export function bench(cx: number, cy: number, rot = 0): string {
  const s = rect(-26 + 6, -11 + 6, 52, 22, { fill: '#000', opacity: 0.2, rx: 3 }) +
    rect(-26, -11, 52, 22, { fill: '#b8682e', stroke: '#4a2a10', strokeWidth: 2.5, rx: 3 }) +
    line(-24, -3.5, 24, -3.5, { stroke: '#6b3410', strokeWidth: 1.6 }) + line(-24, 3.5, 24, 3.5, { stroke: '#6b3410', strokeWidth: 1.6 }) +
    rect(-26, -14, 52, 5, { fill: '#8a5428', stroke: '#4a2a10', strokeWidth: 2, rx: 2 });
  return g({ transform: `translate(${r2(cx)} ${r2(cy)}) rotate(${r2(rot)})` }, s);
}

/** wooden crate from above */
export function crate(cx: number, cy: number, s = 22, rot = 0): string {
  const h = s / 2;
  return g({ transform: `translate(${r2(cx)} ${r2(cy)}) rotate(${r2(rot)})` },
    rect(-h + 5, -h + 5, s, s, { fill: '#000', opacity: 0.2 }),
    rect(-h, -h, s, s, { fill: '#c99a5e', stroke: '#6b3e18', strokeWidth: 2.5, rx: 2 }),
    path(`M${-h + 3} ${-h + 3} L${h - 3} ${h - 3} M${h - 3} ${-h + 3} L${-h + 3} ${h - 3}`, { stroke: '#8a5428', strokeWidth: 2 }));
}

/** beach parasol from above (striped) */
export function parasol(cx: number, cy: number, r: number, col = C.red): string {
  let s = circle(cx + r * 0.35, cy + r * 0.3, r, { fill: '#000', opacity: 0.2 });
  const n = 10;
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
    s += path(`M${r2(cx)} ${r2(cy)} L${r2(cx + Math.cos(a0) * r)} ${r2(cy + Math.sin(a0) * r)} A${r} ${r} 0 0 1 ${r2(cx + Math.cos(a1) * r)} ${r2(cy + Math.sin(a1) * r)} Z`, { fill: i % 2 ? C.white : col });
  }
  return s + circle(cx, cy, r, { fill: 'none', stroke: dk(col, 0.4), strokeWidth: 3 }) + circle(cx, cy, r * 0.09, { fill: '#e8e0d0', stroke: '#6b6050', strokeWidth: 1.5 });
}

/** beach towel / lounger */
export function towel(cx: number, cy: number, w: number, h: number, rot: number, col = C.blue): string {
  let stripes = '';
  for (let y = -h / 2 + 8; y < h / 2 - 4; y += 12) stripes += rect(-w / 2 + 2, y, w - 4, 5, { fill: C.white, opacity: 0.9 });
  return g({ transform: `translate(${r2(cx)} ${r2(cy)}) rotate(${r2(rot)})` },
    rect(-w / 2 + 5, -h / 2 + 5, w, h, { fill: '#000', opacity: 0.18, rx: 4 }),
    rect(-w / 2, -h / 2, w, h, { fill: col, stroke: dk(col, 0.4), strokeWidth: 2.5, rx: 4 }), stripes);
}

/** beach ball */
export function ball(cx: number, cy: number, r: number): string {
  return circle(cx + 4, cy + 3, r, { fill: '#000', opacity: 0.2 }) + circle(cx, cy, r, { fill: C.white, stroke: '#2a2140', strokeWidth: 2 }) +
    path(`M${cx} ${cy - r} A${r} ${r} 0 0 1 ${cx + r} ${cy} L${cx} ${cy} Z`, { fill: C.red }) +
    path(`M${cx} ${cy + r} A${r} ${r} 0 0 1 ${cx - r} ${cy} L${cx} ${cy} Z`, { fill: C.blue }) +
    circle(cx, cy, r, { fill: 'none', stroke: '#2a2140', strokeWidth: 2 });
}

/** sunflower seen from above */
export function sunflower(cx: number, cy: number, r = 9): string {
  let s = circle(cx + 3, cy + 3, r, { fill: '#000', opacity: 0.18 });
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    s += ellipse(cx + Math.cos(a) * r * 0.75, cy + Math.sin(a) * r * 0.75, r * 0.42, r * 0.22, { fill: C.yellow, stroke: '#c08a00', strokeWidth: 0.8, transform: `rotate(${r2((a * 180) / Math.PI)} ${r2(cx + Math.cos(a) * r * 0.75)} ${r2(cy + Math.sin(a) * r * 0.75)})` });
  }
  return s + circle(cx, cy, r * 0.45, { fill: '#6b3e18', stroke: '#3a2008', strokeWidth: 1.2 });
}

/** market stall: striped awning (top view) with goods peeking out in front */
export function stall(x: number, y: number, w: number, h: number, col: string): string {
  let s = rect(x + 10, y + 10, w, h, { fill: '#000', opacity: 0.22, rx: 3 });
  s += rect(x, y + h - 6, w, 14, { fill: '#c08a52', stroke: '#6b3e18', strokeWidth: 2, rx: 2 });
  const R = rng(`${x}${y}`);
  for (let xx = x + 8; xx < x + w - 8; xx += 14) s += circle(xx, y + h + 1, 4.5, { fill: [C.red, C.yellow, '#8fd46a', '#ff9447'][Math.floor(R() * 4)], stroke: '#00000055', strokeWidth: 1 });
  const n = Math.round(w / 14);
  for (let i = 0; i < n; i++) s += rect(x + (i * w) / n, y, w / n, h - 4, { fill: i % 2 ? C.white : col });
  s += rect(x, y, w, h - 4, { fill: 'none', stroke: dk(col, 0.45), strokeWidth: 3, rx: 2 });
  s += path(`M${x} ${y + h - 4} ` + Array.from({ length: n }, (_, i) => `q${r2(w / n / 2)} 7 ${r2(w / n)} 0`).join(' '), { fill: col, stroke: dk(col, 0.45), strokeWidth: 2 });
  return s;
}

/** round table with checkered cloth and four stools */
export function tableTop(cx: number, cy: number, r = 20): string {
  let s = '';
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    s += crate(cx + Math.cos(a) * r * 1.6, cy + Math.sin(a) * r * 1.6, 16, (a * 180) / Math.PI);
  }
  s += rect(cx - r + 6, cy - r + 6, r * 2, r * 2, { fill: '#000', opacity: 0.2, rx: 3 });
  s += rect(cx - r, cy - r, r * 2, r * 2, { fill: C.white, stroke: '#173f86', strokeWidth: 2.5, rx: 3 });
  const k = r / 3;
  for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) if ((i + j) % 2 === 0) s += rect(cx - r + i * k, cy - r + j * k, k, k, { fill: C.blue });
  return s + rect(cx - r, cy - r, r * 2, r * 2, { fill: 'none', stroke: '#173f86', strokeWidth: 2.5, rx: 3 });
}

/** hand cart from above */
export function cart(cx: number, cy: number, rot = 0): string {
  return g({ transform: `translate(${r2(cx)} ${r2(cy)}) rotate(${r2(rot)})` },
    rect(-22 + 6, -15 + 6, 44, 30, { fill: '#000', opacity: 0.2 }),
    rect(-27, -19, 8, 8, { rx: 2, fill: '#333', stroke: '#111', strokeWidth: 1.5 }), rect(-27, 11, 8, 8, { rx: 2, fill: '#333', stroke: '#111', strokeWidth: 1.5 }),
    rect(-22, -15, 44, 30, { fill: '#b8682e', stroke: '#4a2a10', strokeWidth: 2.5, rx: 2 }),
    rect(-17, -10, 34, 20, { fill: '#8a5428', stroke: '#4a2a10', strokeWidth: 1.5 }),
    path('M22 -8 L44 -4 M22 8 L44 4', { stroke: '#6b3410', strokeWidth: 3, strokeLinecap: 'round' }));
}

/** octagonal gazebo / pavilion roof from above */
export function gazeboTop(cx: number, cy: number, r: number, col = '#9a8a7a'): string {
  const oct = (rr: number, dx = 0, dy = 0) => Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    return `${r2(cx + dx + Math.cos(a) * rr)},${r2(cy + dy + Math.sin(a) * rr)}`;
  }).join(' ');
  let s = `<polygon points="${oct(r, r * 0.4, r * 0.3)}" fill="#000" opacity="0.22"/>`;
  s += `<polygon points="${oct(r)}" fill="${col}" stroke="${dk(col, 0.5)}" stroke-width="3" stroke-linejoin="round"/>`;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    s += line(cx, cy, cx + Math.cos(a) * r, cy + Math.sin(a) * r, { stroke: dk(col, 0.35), strokeWidth: 2 });
  }
  return s + path(`M${cx - r * 0.7} ${cy - r * 0.2} L${cx} ${cy}`, { stroke: lt(col, 0.4), strokeWidth: 3, opacity: 0.7 }) + circle(cx, cy, r * 0.12, { fill: C.gold, stroke: C.goldDark, strokeWidth: 2 });
}

/** trimmed hedge bed (rectangle) */
export function hedge(x: number, y: number, w: number, h: number, seed: number | string): string {
  const R = rng(seed);
  let s = rect(x + 8, y + 8, w, h, { fill: '#000', opacity: 0.2, rx: 8 }) + rect(x, y, w, h, { fill: '#2f7a3a', stroke: '#1d4f26', strokeWidth: 3, rx: 8 });
  for (let i = 0; i < (w * h) / 500; i++) s += circle(x + 6 + R() * (w - 12), y + 6 + R() * (h - 12), 4 + R() * 4, { fill: R() > 0.5 ? '#3f8f45' : '#4fa64a', opacity: 0.8 });
  return s;
}

/** scattered pebbles */
export function pebbles(x: number, y: number, w: number, h: number, n: number, seed: number | string): string {
  const R = rng(seed);
  let s = '';
  for (let i = 0; i < n; i++) {
    const px = x + R() * w, py = y + R() * h, r = 2.5 + R() * 3;
    s += ellipse(px + 1.5, py + 1.5, r, r * 0.8, { fill: '#000', opacity: 0.2 }) + ellipse(px, py, r, r * 0.8, { fill: C.stone, stroke: C.stoneDark, strokeWidth: 1.2 });
  }
  return s;
}

/** sheet roof (flat, rotatable) with a skylight */
export function flatRoof(cx: number, cy: number, w: number, h: number, rot: number, col = '#b9b4ae'): string {
  return g({ transform: `translate(${r2(cx)} ${r2(cy)}) rotate(${r2(rot)})` },
    rect(-w / 2 + SHADOW_DX * 0.6, -h / 2 + SHADOW_DY * 0.6, w, h, { fill: '#000', opacity: 0.22, rx: 3 }),
    rect(-w / 2, -h / 2, w, h, { fill: col, stroke: dk(col, 0.5), strokeWidth: 3, rx: 3 }),
    rect(-w / 2 + 8, -h / 2 + 8, w - 16, h - 16, { fill: 'none', stroke: lt(col, 0.4), strokeWidth: 2, rx: 2 }),
    rect(-w * 0.25, -h * 0.25, 18, 14, { fill: '#5a6a80', stroke: '#2a3040', strokeWidth: 2 }));
}

/** a few blossom dots on a tree crown */
export function blossoms(cx: number, cy: number, r: number, n: number, seed: number | string, col = '#ff6b8a'): string {
  const R = rng(seed);
  let s = '';
  for (let i = 0; i < n; i++) {
    const a = R() * Math.PI * 2, d = Math.sqrt(R()) * r * 0.85;
    s += circle(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 2.5 + R() * 2, { fill: col, stroke: dk(col, 0.35), strokeWidth: 1 });
  }
  return s;
}

export { blob };
