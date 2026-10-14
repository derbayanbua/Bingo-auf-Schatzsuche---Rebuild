// Treasure-island boards (Landscape SP031..SP048): generic top-down board composer (areas + trails from the
// point graph in src/data/boards.json) and island props: big palm crowns, spiky cycads, huts, boats, fire,
// vultures, ship wreck, rope bridge, waterfall, cliffs. Everything is drawn at absolute coordinates.
import boards from '../../../src/data/boards.json';
import { cobblePattern, dirtPattern, grassPattern, sandPattern, waterPattern } from './textures';
import { C, blob, circle, defs, dk, ellipse, g, line, lt, path, r2, rect, rng } from './svg';
import { tufts } from './nature';

export type XY = [number, number];
export interface IslandPt { n: number; x: number; y: number; g: number; nb: (string | null)[]; t: string | null }

/** board points in scene coordinates (stage y − 45) */
export function boardPts(key: string): IslandPt[] {
  const all = (boards as unknown as { boards: Record<string, IslandPt[]> }).boards[key] ?? [];
  return all.map((p) => ({ ...p, y: p.y - 45 }));
}

/** smooth closed (Catmull-Rom) or open curve through points */
export function smooth(pts: XY[], closed = true): string {
  const n = pts.length;
  let d = `M${r2(pts[0][0])} ${r2(pts[0][1])}`;
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const at = (k: number) => (closed ? pts[(k + n) % n] : pts[Math.max(0, Math.min(n - 1, k))]);
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    d += `C${r2(p1[0] + (p2[0] - p0[0]) / 6)} ${r2(p1[1] + (p2[1] - p0[1]) / 6)} ${r2(p2[0] - (p3[0] - p1[0]) / 6)} ${r2(p2[1] - (p3[1] - p1[1]) / 6)} ${r2(p2[0])} ${r2(p2[1])}`;
  }
  return d + (closed ? 'Z' : '');
}

export type AreaKind = 'water' | 'sand' | 'grass' | 'jungle' | 'dirt' | 'rock';
export interface Area { kind: AreaKind; pts: XY[] }

const GROUND: Record<string, string> = { grass: '#64ba58', jungle: '#4f9e48', sand: C.sand };

function areaSvg(a: Area, p: string, i: number): string {
  const d = smooth(a.pts);
  switch (a.kind) {
    case 'water':
      return path(d, { fill: '#e9d08a', stroke: '#d9b25e', strokeWidth: 26, opacity: 0.9 }) +
        path(d, { fill: `url(#${p}wa)`, stroke: '#ffffff', strokeWidth: 9, strokeOpacity: 0.6 }) +
        path(d, { fill: 'none', stroke: lt(C.water, 0.5), strokeWidth: 3, strokeDasharray: '18 12', opacity: 0.8, transform: 'translate(0 7)' });
    case 'sand':
      return path(d, { fill: `url(#${p}sa)`, stroke: '#d9b25e', strokeWidth: 4 });
    case 'dirt':
      return path(d, { fill: `url(#${p}di)`, stroke: C.dirtDark, strokeWidth: 3 });
    case 'rock':
      return path(d, { fill: '#a89e8c', stroke: '#5e554a', strokeWidth: 4 }) + rockFacets(a.pts, `${p}rk${i}`);
    default:
      return path(d, { fill: `url(#${p}${a.kind === 'jungle' ? 'ju' : 'gr'})`, stroke: '#2f7a3a', strokeWidth: 4 });
  }
}

function rockFacets(pts: XY[], seed: string): string {
  const R = rng(seed);
  const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  let s = '';
  for (let i = 0; i < 14; i++) {
    const x = x0 + R() * (x1 - x0), y = y0 + R() * (y1 - y0), rr = 14 + R() * 26;
    s += path(blob(x, y, rr, rr * 0.7, `${seed}${i}`, 0.25, 7), { fill: R() > 0.5 ? '#bdb3a0' : '#968c7a', stroke: '#6e6556', strokeWidth: 2 });
  }
  return `<clipPath id="${seed}c"><path d="${smooth(pts)}"/></clipPath>` + g({ 'clip-path': `url(#${seed}c)` }, s);
}

const TRAIL: Record<number, { w: number; fill: (p: string) => string; edge: string } | undefined> = {
  1: { w: 50, fill: (p) => `url(#${p}co)`, edge: '#00000040' },
  2: { w: 48, fill: (p) => `url(#${p}sa)`, edge: '#c9a04a' },
  3: { w: 44, fill: (p) => `url(#${p}di)`, edge: '#00000030' },
  4: { w: 42, fill: () => '#3f9440', edge: '#2f7a3a66' },
};

/** trails along the point graph; links to other boards run off the edge */
export function trails(key: string, p: string, w = 800, h = 448): string {
  const pts = boardPts(key);
  const by = new Map(pts.map((q) => [`${key}-${String(q.n).padStart(2, '0')}`, q]));
  const segs: Record<number, string[]> = { 1: [], 2: [], 3: [], 4: [] };
  const dirs: XY[] = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  for (const q of pts) {
    if (!TRAIL[q.g]) continue;
    q.nb.forEach((nb, k) => {
      if (!nb) return;
      const o = by.get(nb);
      let ex: number, ey: number;
      if (o) {
        if (!TRAIL[o.g]) return;
        ex = (q.x + o.x) / 2; ey = (q.y + o.y) / 2;
      } else {
        ex = dirs[k][0] ? (dirs[k][0] > 0 ? w + 40 : -40) : q.x;
        ey = dirs[k][1] ? (dirs[k][1] > 0 ? h + 40 : -40) : q.y;
      }
      segs[q.g].push(`M${r2(q.x)} ${r2(q.y)}L${r2(ex)} ${r2(ey)}`);
    });
  }
  let s = '';
  for (const k of [4, 3, 2, 1]) {
    if (!segs[k].length) continue;
    const t = TRAIL[k]!, d = segs[k].join('');
    s += path(d, { fill: 'none', stroke: t.edge, strokeWidth: t.w + 10, strokeLinecap: 'round', strokeLinejoin: 'round' });
  }
  for (const k of [4, 3, 2, 1]) {
    if (!segs[k].length) continue;
    const t = TRAIL[k]!, d = segs[k].join('');
    s += path(d, { fill: 'none', stroke: t.fill(p), strokeWidth: t.w, strokeLinecap: 'round', strokeLinejoin: 'round' });
    if (k === 4) s += path(d, { fill: 'none', stroke: '#2f7a3a', strokeWidth: t.w - 18, strokeLinecap: 'round', strokeLinejoin: 'round', opacity: 0.25 });
  }
  // dashed guide marks between linked points
  for (const q of pts) {
    if (!TRAIL[q.g]) continue;
    q.nb.forEach((nb, k) => {
      const o = nb ? by.get(nb) : undefined;
      if (!o || o.n < q.n || !TRAIL[o.g]) return;
      const mx = (q.x + o.x) / 2, my = (q.y + o.y) / 2;
      s += path(k % 2 ? `M${r2(mx - 8)} ${r2(my)} h16` : `M${r2(mx)} ${r2(my - 8)} v16`, { stroke: '#3a2a18', strokeWidth: 4, strokeLinecap: 'round', opacity: 0.4 });
    });
  }
  return s;
}

export interface IslandBoard {
  key: string;
  base: 'grass' | 'jungle' | 'sand' | 'water';
  areas?: Area[];
  /** drawn after the areas, before the trails (cliffs, hulls, bridges under the path …) */
  under?: string;
  /** drawn on top of the trails */
  deco?: string;
  tufts?: number;
  w?: number;
  h?: number;
}

/** complete board background */
export function islandBoard(o: IslandBoard): string {
  const w = o.w ?? 800, h = o.h ?? 448, p = o.key.toLowerCase();
  let s = defs(
    grassPattern(`${p}gr`, { base: GROUND.grass, seed: 3 }), grassPattern(`${p}ju`, { base: GROUND.jungle, seed: 7 }),
    sandPattern(`${p}sa`, 4), dirtPattern(`${p}di`, 2), cobblePattern(`${p}co`, { seed: 6, base: '#b9ad98' }),
    waterPattern(`${p}wa`, { base: '#3a9ad8', seed: 12 }));
  const baseFill = o.base === 'water' ? `url(#${p}wa)` : `url(#${p}${o.base === 'sand' ? 'sa' : o.base === 'jungle' ? 'ju' : 'gr'})`;
  s += rect(0, 0, w, h, { fill: baseFill });
  if (o.base !== 'water' && o.base !== 'sand') s += tufts(0, 0, w, h, o.tufts ?? 70, `${p}tf`);
  if (o.base === 'sand') s += dunes(0, 0, w, h, `${p}du`, 10);
  (o.areas ?? []).forEach((a, i) => { s += areaSvg(a, p, i); });
  s += o.under ?? '';
  s += trails(o.key, p, w, h);
  s += o.deco ?? '';
  return s;
}

/** soft dune ridges on sand */
export function dunes(x: number, y: number, w: number, h: number, seed: string, n: number): string {
  const R = rng(seed);
  let s = '';
  for (let i = 0; i < n; i++) {
    const cx = x + R() * w, cy = y + R() * h, l = 50 + R() * 70;
    s += path(`M${r2(cx - l)} ${r2(cy + 8)} Q${r2(cx)} ${r2(cy - 14)} ${r2(cx + l)} ${r2(cy + 6)}`, { fill: 'none', stroke: '#d9b25e', strokeWidth: 5, strokeLinecap: 'round', opacity: 0.55 });
    s += path(`M${r2(cx - l * 0.8)} ${r2(cy + 3)} Q${r2(cx)} ${r2(cy - 17)} ${r2(cx + l * 0.8)} ${r2(cy + 1)}`, { fill: 'none', stroke: '#fff3c8', strokeWidth: 3, strokeLinecap: 'round', opacity: 0.6 });
  }
  return s;
}

// ------------------------------------------------------------------ plants

function frond(cx: number, cy: number, a: number, L: number, wd: number, bend: number, teeth: number): string {
  const dx = Math.cos(a), dy = Math.sin(a), nx = -dy, ny = dx;
  const P = (t: number): XY => [cx + dx * L * t + nx * bend * L * t * t, cy + dy * L * t + ny * bend * L * t * t];
  const left: XY[] = [], right: XY[] = [];
  for (let i = 1; i <= teeth; i++) {
    const t = i / (teeth + 1);
    const ww = wd * Math.sin(Math.PI * Math.pow(t, 0.75)) * (i % 2 ? 1 : 0.55);
    const [px, py] = P(t);
    left.push([px + nx * ww, py + ny * ww]);
    right.push([px - nx * ww, py - ny * ww]);
  }
  const tip = P(1);
  const pts = [[cx, cy] as XY, ...left, tip, ...right.reverse()];
  return 'M' + pts.map((q) => `${r2(q[0])} ${r2(q[1])}`).join('L') + 'Z';
}

/** palm crown from above (overlay-sized); shadow falls to the lower right */
export function palmCrown(cx: number, cy: number, r: number, seed: number | string, o: { shadow?: boolean; n?: number; col?: string; light?: string } = {}): string {
  const R = rng(seed);
  const n = o.n ?? 11, col = o.col ?? '#5cb83a', light = o.light ?? '#a8dc4a', dark = '#2a6a26';
  const fr: { d: string; mid: string; c: string }[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + R() * 0.35;
    const L = r * (0.82 + R() * 0.2), bend = (R() - 0.5) * 0.5;
    const d = frond(cx, cy, a, L, r * 0.2, bend, 14);
    const mx = cx + Math.cos(a) * L * 0.5 - Math.sin(a) * bend * L * 0.25, my = cy + Math.sin(a) * L * 0.5 + Math.cos(a) * bend * L * 0.25;
    const ex = cx + Math.cos(a) * L - Math.sin(a) * bend * L, ey = cy + Math.sin(a) * L + Math.cos(a) * bend * L;
    fr.push({ d, mid: `M${r2(cx)} ${r2(cy)}Q${r2(mx)} ${r2(my)} ${r2(ex)} ${r2(ey)}`, c: i % 3 === 0 ? dk(col, 0.12) : i % 3 === 1 ? col : lt(col, 0.12) });
  }
  let s = '';
  if (o.shadow !== false) s += g({ transform: `translate(${r2(r * 0.38)} ${r2(r * 0.26)})`, opacity: 0.22 }, fr.map((f) => path(f.d, { fill: '#000' })).join(''));
  // lower (darker) and upper layer
  s += fr.map((f, i) => (i % 2 ? '' : path(f.d, { fill: f.c, stroke: dark, strokeWidth: Math.max(1.5, r / 55), strokeLinejoin: 'round' }) + path(f.mid, { fill: 'none', stroke: light, strokeWidth: Math.max(1.2, r / 70), strokeLinecap: 'round' }))).join('');
  s += fr.map((f, i) => (i % 2 ? path(f.d, { fill: lt(f.c, 0.08), stroke: dark, strokeWidth: Math.max(1.5, r / 55), strokeLinejoin: 'round' }) + path(f.mid, { fill: 'none', stroke: light, strokeWidth: Math.max(1.2, r / 70), strokeLinecap: 'round' }) : '')).join('');
  s += circle(cx, cy, r * 0.1, { fill: '#8a6a2a', stroke: '#4a3410', strokeWidth: 2 });
  for (let i = 0; i < 3; i++) s += circle(cx + Math.cos(i * 2.1) * r * 0.09, cy + Math.sin(i * 2.1) * r * 0.09, r * 0.055, { fill: '#6b4a1a', stroke: '#3a2408', strokeWidth: 1.2 });
  return s;
}

/** spiky round cycad / grass palm from above */
export function spikyBush(cx: number, cy: number, r: number, seed: number | string, o: { shadow?: boolean } = {}): string {
  const R = rng(seed);
  const star = (rr: number, n: number, k: number, rot: number) => {
    let d = '';
    for (let i = 0; i < n * 2; i++) {
      const a = rot + (i / (n * 2)) * Math.PI * 2;
      const q = i % 2 ? rr * k : rr * (0.92 + R() * 0.12);
      d += `${i ? 'L' : 'M'}${r2(cx + Math.cos(a) * q)} ${r2(cy + Math.sin(a) * q)}`;
    }
    return d + 'Z';
  };
  let s = '';
  if (o.shadow !== false) s += path(star(r, 30, 0.75, 0.1), { fill: '#000', opacity: 0.2, transform: `translate(${r2(r * 0.35)} ${r2(r * 0.28)})` });
  s += path(star(r, 30, 0.72, 0), { fill: '#3a9a34', stroke: '#1f5e22', strokeWidth: Math.max(1.5, r / 50), strokeLinejoin: 'round' });
  s += path(star(r * 0.78, 26, 0.68, 0.12), { fill: '#52b840', stroke: '#2a7428', strokeWidth: 1.5, strokeLinejoin: 'round' });
  s += path(star(r * 0.55, 20, 0.62, 0.05), { fill: '#7ed04e', stroke: '#2a7428', strokeWidth: 1.5, strokeLinejoin: 'round' });
  s += path(star(r * 0.3, 14, 0.55, 0.2), { fill: '#a8e060', stroke: '#3a8a2a', strokeWidth: 1.2 });
  return s + circle(cx, cy, r * 0.08, { fill: '#2a6a26' });
}

/** small fern / palm sapling (board decoration) */
export function sapling(cx: number, cy: number, r: number, seed: number | string): string {
  return palmCrown(cx, cy, r, seed, { n: 7, col: '#6cc23a', light: '#c8ec6a' });
}

// ------------------------------------------------------------------ props

/** round hut with a straw cone roof from above */
export function hutTop(cx: number, cy: number, r: number, seed: number | string): string {
  const R = rng(seed);
  let s = ellipse(cx + r * 0.35, cy + r * 0.28, r, r * 0.95, { fill: '#000', opacity: 0.22 });
  s += path(blob(cx, cy, r, r, `${seed}`, 0.05, 14), { fill: '#e2b86a', stroke: '#8a6a2a', strokeWidth: 3 });
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2 + R() * 0.05;
    s += line(cx + Math.cos(a) * r * 0.1, cy + Math.sin(a) * r * 0.1, cx + Math.cos(a) * r * 0.97, cy + Math.sin(a) * r * 0.97, { stroke: i % 2 ? '#b88a3a' : '#f3d58a', strokeWidth: 2, opacity: 0.85 });
  }
  s += circle(cx, cy, r * 0.62, { fill: 'none', stroke: '#9a7330', strokeWidth: 2, opacity: 0.6 });
  // lower-right half in shade
  s += path(`M${r2(cx - r * 0.7)} ${r2(cy + r * 0.7)}A${r} ${r} 0 0 0 ${r2(cx + r * 0.7)} ${r2(cy - r * 0.7)}Z`, { fill: '#7a5020', opacity: 0.18 });
  return s + circle(cx, cy, r * 0.13, { fill: '#a8803a', stroke: '#5a3a10', strokeWidth: 2 });
}

/** square plank hut roof from above */
export function plankRoof(x: number, y: number, w: number, h: number): string {
  let s = rect(x + 14, y + 10, w, h, { fill: '#000', opacity: 0.22, rx: 3 });
  s += rect(x, y, w, h, { fill: '#c9955a', stroke: '#6b3410', strokeWidth: 3, rx: 3 });
  for (let xx = x + 12; xx < x + w; xx += 12) s += line(xx, y + 2, xx, y + h - 2, { stroke: '#8a5428', strokeWidth: 1.6 });
  s += rect(x, y + h / 2, w, h / 2, { fill: '#6b3410', opacity: 0.18 });
  return s + line(x, y + h / 2, x + w, y + h / 2, { stroke: '#6b3410', strokeWidth: 4 });
}

export function crate(cx: number, cy: number, s0: number, rot = 0): string {
  const h = s0 / 2;
  return g({ transform: `rotate(${rot} ${cx} ${cy})` },
    rect(cx - h + 6, cy - h + 5, s0, s0, { fill: '#000', opacity: 0.22, rx: 2 }),
    rect(cx - h, cy - h, s0, s0, { fill: '#c98a4a', stroke: '#6b3410', strokeWidth: 2.5, rx: 2 }),
    line(cx - h + 3, cy - h + 3, cx + h - 3, cy + h - 3, { stroke: '#8a5428', strokeWidth: 3 }),
    rect(cx - h + 3, cy - h + 3, s0 - 6, s0 - 6, { fill: 'none', stroke: '#8a5428', strokeWidth: 2 }));
}

export function barrelTop(cx: number, cy: number, r: number): string {
  return ellipse(cx + 5, cy + 4, r, r, { fill: '#000', opacity: 0.22 }) + circle(cx, cy, r, { fill: '#a8642a', stroke: '#4a2a10', strokeWidth: 2.5 }) +
    circle(cx, cy, r * 0.78, { fill: 'none', stroke: '#6b6b70', strokeWidth: 2.5 }) + circle(cx, cy, r * 0.5, { fill: '#c98a4a', stroke: '#6b3410', strokeWidth: 1.5 });
}

/** stone well from above */
export function well(cx: number, cy: number, r: number): string {
  let s = ellipse(cx + r * 0.3, cy + r * 0.25, r, r, { fill: '#000', opacity: 0.22 });
  s += circle(cx, cy, r, { fill: '#c9c0b0', stroke: '#5e554a', strokeWidth: 3 });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    s += line(cx + Math.cos(a) * r * 0.66, cy + Math.sin(a) * r * 0.66, cx + Math.cos(a) * r, cy + Math.sin(a) * r, { stroke: '#7e7466', strokeWidth: 2 });
  }
  s += circle(cx, cy, r * 0.66, { fill: '#1d3f5a', stroke: '#5e554a', strokeWidth: 2.5 });
  s += ellipse(cx - r * 0.15, cy - r * 0.15, r * 0.25, r * 0.12, { fill: '#7fc8f5', opacity: 0.5 });
  s += rect(cx - r * 1.1, cy - 4, r * 2.2, 8, { fill: '#8a5428', stroke: '#4a2a10', strokeWidth: 2, rx: 2 });
  return s + circle(cx, cy, 5, { fill: '#c98a4a', stroke: '#4a2a10', strokeWidth: 1.5 });
}

/** ring of stones around a fire pit (the flames are a separate member) */
export function firePit(cx: number, cy: number, r: number): string {
  let s = circle(cx, cy, r, { fill: '#3a2a20', opacity: 0.85 }) + circle(cx, cy, r * 0.7, { fill: '#5a3a28' });
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    s += path(blob(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 6, 5, `fp${i}`, 0.2, 7), { fill: '#a89e8c', stroke: '#5e554a', strokeWidth: 1.8 });
  }
  return s;
}

/** wooden ladder between two points */
export function ladder(x1: number, y1: number, x2: number, y2: number, wd = 18): string {
  const L = Math.hypot(x2 - x1, y2 - y1), a = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
  let s = rect(0, -wd / 2 - 3, L, 6, { fill: '#8a5428', stroke: '#4a2a10', strokeWidth: 1.5, rx: 2 }) + rect(0, wd / 2 - 3, L, 6, { fill: '#8a5428', stroke: '#4a2a10', strokeWidth: 1.5, rx: 2 });
  for (let x = 8; x < L - 4; x += 12) s += rect(x, -wd / 2, 4, wd, { fill: '#c98a4a', stroke: '#4a2a10', strokeWidth: 1.2 });
  return g({ transform: `translate(${r2(x1)} ${r2(y1)}) rotate(${r2(a)})` }, s);
}

/** rope bridge with planks from (x1,y1) to (x2,y2) */
export function ropeBridge(x1: number, y1: number, x2: number, y2: number, wd = 40, seed = 'rb'): string {
  const R = rng(seed);
  const L = Math.hypot(x2 - x1, y2 - y1), a = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
  let s = rect(10, -wd / 2 + 14, L - 20, wd, { fill: '#000', opacity: 0.18 });
  for (let x = 6; x < L - 8; x += 16) {
    const jit = (R() - 0.5) * 3, tw = (R() - 0.5) * 6;
    s += rect(x, -wd / 2 + jit, 11, wd, { fill: R() > 0.5 ? '#c98a4a' : '#b8783a', stroke: '#5a3410', strokeWidth: 1.8, rx: 2, transform: `rotate(${r2(tw)} ${r2(x + 5)} 0)` });
  }
  for (const yy of [-wd / 2 - 2, wd / 2 + 2]) {
    s += path(`M0 ${yy} Q${r2(L / 2)} ${yy + 5} ${r2(L)} ${yy}`, { fill: 'none', stroke: '#5a4020', strokeWidth: 4, strokeLinecap: 'round' });
    s += path(`M0 ${yy} Q${r2(L / 2)} ${yy + 5} ${r2(L)} ${yy}`, { fill: 'none', stroke: '#d9b77a', strokeWidth: 1.6, strokeDasharray: '4 4' });
  }
  for (const x of [0, L]) for (const yy of [-wd / 2 - 4, wd / 2 + 4]) s += circle(x, yy, 6, { fill: '#8a5428', stroke: '#4a2a10', strokeWidth: 2 });
  return g({ transform: `translate(${r2(x1)} ${r2(y1)}) rotate(${r2(a)})` }, s);
}

/** waterfall seen from above: rocky lip across the river with foaming white water below */
export function waterfall(lip: XY[], drop: number, seed = 'wf'): string {
  const R = rng(seed);
  let s = '';
  for (let i = 0; i < lip.length - 1; i++) {
    const [ax, ay] = lip[i], [bx, by] = lip[i + 1];
    for (let k = 0; k < 4; k++) {
      const t = (k + R() * 0.8) / 4, x = ax + (bx - ax) * t, y = ay + (by - ay) * t;
      s += path(`M${r2(x)} ${r2(y)} q${r2((R() - 0.5) * 8)} ${r2(drop * 0.5)} ${r2((R() - 0.5) * 6)} ${r2(drop * (0.8 + R() * 0.4))}`, { fill: 'none', stroke: '#ffffff', strokeWidth: 6 + R() * 6, strokeLinecap: 'round', opacity: 0.75 });
    }
  }
  const d = 'M' + lip.map((q) => `${r2(q[0])} ${r2(q[1])}`).join('L');
  s += path(d, { fill: 'none', stroke: '#e8f6ff', strokeWidth: 14, strokeLinecap: 'round', opacity: 0.8, transform: `translate(0 ${r2(drop)})` });
  for (let i = 0; i < 10; i++) {
    const t = R() * (lip.length - 1), j = Math.floor(t), f = t - j;
    const x = lip[j][0] + (lip[j + 1][0] - lip[j][0]) * f, y = lip[j][1] + (lip[j + 1][1] - lip[j][1]) * f;
    s += circle(x + (R() - 0.5) * 20, y + drop + (R() - 0.3) * 18, 4 + R() * 6, { fill: '#ffffff', opacity: 0.7 });
  }
  s += path(d, { fill: 'none', stroke: '#6e6556', strokeWidth: 16, strokeLinecap: 'round', strokeLinejoin: 'round' });
  s += path(d, { fill: 'none', stroke: '#a89e8c', strokeWidth: 10, strokeLinecap: 'round', strokeLinejoin: 'round' });
  return s;
}

/** cave mouth in a cliff (dark arch opening downward) */
export function caveMouth(cx: number, cy: number, w: number, h: number): string {
  return path(`M${r2(cx - w / 2)} ${r2(cy + h / 2)} Q${r2(cx - w / 2)} ${r2(cy - h / 2)} ${r2(cx)} ${r2(cy - h / 2)} Q${r2(cx + w / 2)} ${r2(cy - h / 2)} ${r2(cx + w / 2)} ${r2(cy + h / 2)} Z`, { fill: '#2a1d18', stroke: '#5e554a', strokeWidth: 5, strokeLinejoin: 'round' }) +
    path(`M${r2(cx - w * 0.3)} ${r2(cy + h / 2)} Q${r2(cx)} ${r2(cy - h * 0.1)} ${r2(cx + w * 0.3)} ${r2(cy + h / 2)}`, { fill: '#120c0a' });
}

/** creeper vines draped over rocks */
export function vines(x: number, y: number, n: number, seed: string): string {
  const R = rng(seed);
  let s = '';
  for (let i = 0; i < n; i++) {
    const sx = x + (R() - 0.5) * 60, sy = y + (R() - 0.5) * 30, l = 25 + R() * 35;
    const d = `M${r2(sx)} ${r2(sy)} c${r2(R() * 20 - 10)} ${r2(l * 0.3)} ${r2(R() * 30 - 15)} ${r2(l * 0.6)} ${r2(R() * 20 - 10)} ${r2(l)}`;
    s += path(d, { fill: 'none', stroke: '#2a6a26', strokeWidth: 4, strokeLinecap: 'round' }) + path(d, { fill: 'none', stroke: '#8fd46a', strokeWidth: 1.6, strokeLinecap: 'round' });
  }
  return s;
}

/** saguaro cactus from above */
export function cactusTop(cx: number, cy: number, r: number, arms: number[] = [0.3, 3.4]): string {
  let s = ellipse(cx + r * 0.6, cy + r * 0.4, r * 1.1, r, { fill: '#000', opacity: 0.2 });
  for (const a of arms) {
    const ex = cx + Math.cos(a) * r * 1.8, ey = cy + Math.sin(a) * r * 1.8;
    s += line(cx, cy, ex, ey, { stroke: '#2f6a2a', strokeWidth: r * 1.05, strokeLinecap: 'round' }) + line(cx, cy, ex, ey, { stroke: '#5aa848', strokeWidth: r * 0.75, strokeLinecap: 'round' });
  }
  s += circle(cx, cy, r, { fill: '#5aa848', stroke: '#2f6a2a', strokeWidth: 2.5 });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    s += line(cx + Math.cos(a) * r * 0.3, cy + Math.sin(a) * r * 0.3, cx + Math.cos(a) * r * 0.95, cy + Math.sin(a) * r * 0.95, { stroke: '#3f8a3a', strokeWidth: 1.5 });
  }
  return s + circle(cx - r * 0.25, cy - r * 0.25, r * 0.25, { fill: '#8fd46a', opacity: 0.7 });
}

// ------------------------------------------------------------------ animated members

/** yellow rowing boat bobbing in the water (frames 1..n loop) */
export function rowBoat(f: number, n: number, w: number, h: number): string {
  const t = ((f - 1) / n) * Math.PI * 2;
  const rot = Math.sin(t) * 3, dy = Math.cos(t) * 1.5;
  const cx = w * 0.48, top = 14, bot = h - 20, hw = w * 0.36;
  const hull = `M${r2(cx)} ${top} C${r2(cx + hw * 0.9)} ${top + 18} ${r2(cx + hw)} ${r2(bot - 50)} ${r2(cx + hw * 0.85)} ${bot} L${r2(cx - hw * 0.85)} ${bot} C${r2(cx - hw)} ${r2(bot - 50)} ${r2(cx - hw * 0.9)} ${top + 18} ${r2(cx)} ${top}Z`;
  const rip = 1 + 0.06 * Math.sin(t * 2);
  let s = g({ opacity: 0.55 }, ellipse(cx, (top + bot) / 2 + 4, hw * 1.35 * rip, (bot - top) * 0.6 * rip, { fill: 'none', stroke: '#ffffff', strokeWidth: 2, strokeDasharray: '10 8' }));
  s += path(hull, { fill: '#000', opacity: 0.25, transform: `translate(7 6)` });
  let b = path(hull, { fill: C.yellow, stroke: '#8a6d00', strokeWidth: 3.5, strokeLinejoin: 'round' });
  const inner = `M${r2(cx)} ${top + 12} C${r2(cx + hw * 0.7)} ${top + 26} ${r2(cx + hw * 0.8)} ${r2(bot - 50)} ${r2(cx + hw * 0.68)} ${bot - 8} L${r2(cx - hw * 0.68)} ${bot - 8} C${r2(cx - hw * 0.8)} ${r2(bot - 50)} ${r2(cx - hw * 0.7)} ${top + 26} ${r2(cx)} ${top + 12}Z`;
  b += path(inner, { fill: '#f0b92a', stroke: '#c99a10', strokeWidth: 2 });
  for (let i = 0; i < 4; i++) b += line(cx + (i - 1.5) * 9, top + 30, cx + (i - 1.5) * 11, bot - 10, { stroke: '#d9a618', strokeWidth: 1.4 });
  for (const yy of [top + 48, bot - 36]) b += rect(cx - hw * 0.78, yy, hw * 1.56, 13, { fill: '#c98a4a', stroke: '#6b3410', strokeWidth: 2, rx: 2 });
  // oars
  b += line(cx - 4, top + 34, cx - 12, bot - 22, { stroke: '#e8cf9a', strokeWidth: 4, strokeLinecap: 'round' }) + ellipse(cx - 12, bot - 22, 6, 13, { fill: '#e8cf9a', stroke: '#8a6a3a', strokeWidth: 1.5, transform: `rotate(8 ${r2(cx - 12)} ${bot - 22})` });
  b += line(cx + 6, top + 36, cx + 8, bot - 24, { stroke: '#d9bd85', strokeWidth: 4, strokeLinecap: 'round' }) + ellipse(cx + 8, bot - 24, 5.5, 12, { fill: '#d9bd85', stroke: '#8a6a3a', strokeWidth: 1.5 });
  b += circle(cx, top - 5, 5, { fill: 'none', stroke: '#4a4a52', strokeWidth: 2.5 });
  s += g({ transform: `translate(0 ${r2(dy)}) rotate(${r2(rot)} ${r2(cx)} ${r2(h / 2)})` }, b);
  return s;
}

/** campfire flames from above (frame f of n, centred in the w×h box) */
export function fireFlames(f: number, w: number, h: number): string {
  const cx = w / 2, cy = h / 2, R = rng(`fire${f}`);
  const k = 0.9 + 0.1 * Math.sin(f * 1.7);
  let s = path(blob(cx, cy, w * 0.46 * k, h * 0.44 * k, `fo${f}`, 0.3, 11), { fill: '#e8483f', opacity: 0.9 });
  s += path(blob(cx + (R() - 0.5) * 2, cy, w * 0.36 * k, h * 0.34 * k, `fm${f}`, 0.3, 10), { fill: '#ff9447' });
  s += path(blob(cx + (R() - 0.5) * 3, cy + (R() - 0.5) * 2, w * 0.24, h * 0.22, `fy${f}`, 0.3, 9), { fill: '#ffd23f' });
  s += path(blob(cx, cy, w * 0.11, h * 0.1, `fw${f}`, 0.3, 7), { fill: '#fff6c8' });
  for (let i = 0; i < 3; i++) s += circle(R() * w * 0.8 + w * 0.1, R() * h * 0.8 + h * 0.1, 1.2, { fill: '#ffe08a' });
  return s;
}

/** fallen cactus with two vultures (frame f of n: heads turn / wings ruffle) */
export function vultures(f: number, n: number, w: number, h: number): string {
  const t = (f - 1) / (n - 1);
  const sw = Math.sin(t * Math.PI * 2);
  let s = '';
  // log/cactus from upper left to lower right
  const lg = (stroke: string, wd: number) => line(14, 22, 132, 76, { stroke, strokeWidth: wd, strokeLinecap: 'round' });
  s += g({ transform: 'translate(12 10)', opacity: 0.22 }, lg('#000', 26));
  s += lg('#2f6a2a', 26) + lg('#5aa848', 20);
  for (let i = 0; i < 9; i++) s += line(22 + i * 12.5, 25 + i * 5.7, 22 + i * 12.5 + 3, 25 + i * 5.7 - 7, { stroke: '#2f6a2a', strokeWidth: 1.4 }) + line(22 + i * 12.5, 25 + i * 5.7, 22 + i * 12.5 - 3, 25 + i * 5.7 + 7, { stroke: '#2f6a2a', strokeWidth: 1.4 });
  s += ellipse(132, 76, 9, 11, { fill: '#8fd46a', stroke: '#2f6a2a', strokeWidth: 2, transform: 'rotate(-25 132 76)' });
  const bird = (x: number, y: number, head: number, ruffle: number, id: string) => {
    let b = ellipse(x + 8, y + 9, 17, 13, { fill: '#000', opacity: 0.22 });
    const wing = 15 + ruffle * 4;
    b += ellipse(x - 3, y + 2, wing, 11, { fill: '#5a5470', stroke: '#2a2140', strokeWidth: 2 });
    b += ellipse(x + 3, y + 3, wing, 11, { fill: '#6e6888', stroke: '#2a2140', strokeWidth: 2 });
    b += path(`M${x - 8} ${y + 3} q8 6 18 0`, { fill: 'none', stroke: '#3a3450', strokeWidth: 1.6 });
    b += circle(x, y - 4, 8, { fill: '#f3ecdc', stroke: '#8a8070', strokeWidth: 1.5 });
    const hb = g({ transform: `rotate(${r2(head)} ${x} ${y - 6})` },
      line(x, y - 6, x, y - 15, { stroke: '#e0a0a8', strokeWidth: 5, strokeLinecap: 'round' }),
      circle(x, y - 17, 5.5, { fill: '#f0b4b8', stroke: '#8a4a5a', strokeWidth: 1.5 }),
      path(`M${x - 2} ${y - 21} L${x} ${y - 28} L${x + 2} ${y - 21}Z`, { fill: '#e8cf6a', stroke: '#6a5a10', strokeWidth: 1.2 }),
      circle(x - 2.4, y - 18, 1.2, { fill: '#2a2140' }), circle(x + 2.4, y - 18, 1.2, { fill: '#2a2140' }));
    return g({ id }, b + hb);
  };
  s += bird(42, 38, -20 + 45 * Math.max(0, sw), Math.max(0, -sw), `vu1-${f}`);
  s += bird(88, 56, 15 - 40 * Math.max(0, -sw), Math.max(0, sw) * 0.6, `vu2-${f}`);
  return s;
}
