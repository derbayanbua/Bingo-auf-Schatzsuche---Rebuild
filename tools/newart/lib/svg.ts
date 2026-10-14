// SVG primitives, palette and colour helpers for the "neue Grafik" asset pack.
// Style (see README): flat vector, soft rounded shapes, bold dark outlines, warm island colours.

/** Palette of the approved design (Main.dc.html / Stube.dc.html). */
export const C = {
  ink: '#2a2140', // outlines of faces / UI text
  cream: '#fdf6e3',
  white: '#ffffff',
  // Bongo
  orange: '#ff9447', orangeDark: '#a84a00', orangeLight: '#ffb27a', nose: '#ff9a3c',
  bandana: '#2f6fd8', bandanaDark: '#173f86',
  boot: '#8a5428', bootDark: '#4a2a10', leg: '#5a3a20',
  eyeBlue: '#1d5fa8',
  // Pucki
  mint: '#7ed6a5', mintDark: '#1f6b5a', mintLight: '#b4ecc9', freckle: '#e07a5f', puckNose: '#f2a32a',
  shoe: '#ffd23f', shoeDark: '#8a6d00',
  mouth: '#7a1f1f', tongue: '#e0605a',
  // world
  wall: '#ffe9a8', wallDark: '#f6cf72', beam: '#b9873a',
  wood: '#b8682e', woodMid: '#8a5428', woodDark: '#6b3410', woodDeep: '#4a2a10',
  floor: '#c88a4a', floorDark: '#9c6431',
  sky: '#7fc8f5', skyLight: '#d6f0ff',
  grass: '#5fb85a', grassDark: '#3f8f45', grassLight: '#8fd46a',
  sand: '#f3d58a', sandDark: '#d9b25e',
  dirt: '#a8743f', dirtDark: '#7a5028',
  stone: '#c9c0b0', stoneDark: '#8a8070', stoneLight: '#e4ddd0',
  water: '#2f8fd8', waterLight: '#7fc8f5', waterDark: '#1d5fa8',
  red: '#e8483f', redDark: '#9a2620', roof: '#d9553a', roofDark: '#8f2f1c',
  yellow: '#ffd23f', yellowDark: '#8a6d00', gold: '#f4c542', goldDark: '#a07800',
  blue: '#2f6fd8', blueDark: '#173f86',
  green: '#3fae6a', greenDark: '#1f6b3c',
  pink: '#e88fb4', pinkDark: '#a2346a',
  // interface
  ui: '#3a2a8a', uiDark: '#2a1d6b', uiLight: '#5a48b8', uiText: '#ffffff', uiAccent: '#ffd23f',
  glass: '#cfe8f5',
};

export const FONT_HEAD = "'Baloo 2'";
export const FONT_BODY = 'Nunito';

// ------------------------------------------------------------------ colour helpers

function hex(c: string): [number, number, number] {
  const h = c.replace('#', '');
  const v = h.length === 3 ? h.split('').map((x) => x + x).join('') : h;
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}
function toHex(r: number, g: number, b: number): string {
  const f = (x: number) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0');
  return `#${f(r)}${f(g)}${f(b)}`;
}
/** mix two colours (t = 0 → a, 1 → b) */
export function mix(a: string, b: string, t: number): string {
  const x = hex(a), y = hex(b);
  return toHex(x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t);
}
/** darker shade (t 0..1) */
export const dk = (c: string, t = 0.35) => mix(c, '#1a1028', t);
/** lighter shade (t 0..1) */
export const lt = (c: string, t = 0.35) => mix(c, '#ffffff', t);

// ------------------------------------------------------------------ deterministic random

/** mulberry32 PRNG – textures must be reproducible (same SVG → same webp → cache hit) */
export function rng(seed: number | string): () => number {
  let a = typeof seed === 'number' ? seed : [...seed].reduce((s, ch) => (Math.imul(s ^ ch.charCodeAt(0), 2654435761) >>> 0), 1779033703);
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ------------------------------------------------------------------ element helpers

export type Attrs = Record<string, string | number | undefined | null | false>;

export function attrs(a: Attrs = {}): string {
  let s = '';
  for (const [k, v] of Object.entries(a)) {
    if (v === undefined || v === null || v === false) continue;
    const key = k.replace(/[A-Z]/g, (x) => '-' + x.toLowerCase());
    s += ` ${key}="${typeof v === 'number' ? r2(v) : esc(String(v))}"`;
  }
  return s;
}
export const r2 = (n: number) => String(Math.round(n * 100) / 100);
export function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export const el = (tag: string, a: Attrs = {}, inner?: string) => (inner === undefined ? `<${tag}${attrs(a)}/>` : `<${tag}${attrs(a)}>${inner}</${tag}>`);
export const g = (a: Attrs, ...inner: string[]) => el('g', a, inner.join(''));
export const rect = (x: number, y: number, w: number, h: number, a: Attrs = {}) => el('rect', { x, y, width: w, height: h, ...a });
export const circle = (cx: number, cy: number, r: number, a: Attrs = {}) => el('circle', { cx, cy, r, ...a });
export const ellipse = (cx: number, cy: number, rx: number, ry: number, a: Attrs = {}) => el('ellipse', { cx, cy, rx, ry, ...a });
export const path = (d: string, a: Attrs = {}) => el('path', { d, ...a });
export const line = (x1: number, y1: number, x2: number, y2: number, a: Attrs = {}) => el('line', { x1, y1, x2, y2, ...a });
export const poly = (pts: [number, number][], a: Attrs = {}) => el('polygon', { points: pts.map((p) => `${r2(p[0])},${r2(p[1])}`).join(' '), ...a });

/** fill + outline shorthand: fs('#f00', '#800', 4) */
export function fs(fill: string, stroke?: string, sw?: number, extra: Attrs = {}): Attrs {
  return { fill, stroke: stroke ?? 'none', strokeWidth: stroke ? sw ?? 3 : undefined, strokeLinejoin: 'round', strokeLinecap: 'round', ...extra };
}
/** stroke-only shorthand */
export function st(stroke: string, sw: number, extra: Attrs = {}): Attrs {
  return { fill: 'none', stroke, strokeWidth: sw, strokeLinejoin: 'round', strokeLinecap: 'round', ...extra };
}

export const translate = (x: number, y: number, ...inner: string[]) => g({ transform: `translate(${r2(x)} ${r2(y)})` }, ...inner);
export const scale = (s: number, ...inner: string[]) => g({ transform: `scale(${r2(s)})` }, ...inner);
export const rotate = (deg: number, cx: number, cy: number, ...inner: string[]) => g({ transform: `rotate(${r2(deg)} ${r2(cx)} ${r2(cy)})` }, ...inner);

let uid = 0;
/** unique id for defs (unique inside one rendered document is enough) */
export function uidOf(prefix = 'd'): string {
  uid = (uid + 1) % 1e9;
  return `${prefix}${uid}`;
}

export function linGrad(id: string, stops: [number, string, number?][], x1 = 0, y1 = 0, x2 = 0, y2 = 1): string {
  return `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops
    .map(([o, c, op]) => `<stop offset="${o}" stop-color="${c}"${op !== undefined ? ` stop-opacity="${op}"` : ''}/>`)
    .join('')}</linearGradient>`;
}
export function radGrad(id: string, stops: [number, string, number?][], cx = 0.5, cy = 0.5, r = 0.5): string {
  return `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}">${stops
    .map(([o, c, op]) => `<stop offset="${o}" stop-color="${c}"${op !== undefined ? ` stop-opacity="${op}"` : ''}/>`)
    .join('')}</radialGradient>`;
}
export const defs = (...inner: string[]) => `<defs>${inner.join('')}</defs>`;

/** rounded polygon path through points (corner radius r) – soft shapes */
export function roundedPath(pts: [number, number][], r: number, closed = true): string {
  const n = pts.length;
  let d = '';
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n];
    if (!closed && (i === 0 || i === n - 1)) {
      d += `${i === 0 ? 'M' : 'L'}${r2(p1[0])} ${r2(p1[1])}`;
      continue;
    }
    const v1 = [p0[0] - p1[0], p0[1] - p1[1]], v2 = [p2[0] - p1[0], p2[1] - p1[1]];
    const l1 = Math.hypot(v1[0], v1[1]) || 1, l2 = Math.hypot(v2[0], v2[1]) || 1;
    const rr = Math.min(r, l1 / 2, l2 / 2);
    const a = [p1[0] + (v1[0] / l1) * rr, p1[1] + (v1[1] / l1) * rr];
    const b = [p1[0] + (v2[0] / l2) * rr, p1[1] + (v2[1] / l2) * rr];
    d += `${i === 0 ? 'M' : 'L'}${r2(a[0])} ${r2(a[1])}Q${r2(p1[0])} ${r2(p1[1])} ${r2(b[0])} ${r2(b[1])}`;
  }
  return d + (closed ? 'Z' : '');
}

/** wobbly closed blob around (cx,cy) – stones, bushes, clouds (deterministic) */
export function blob(cx: number, cy: number, rx: number, ry: number, seed: number | string, wobble = 0.18, n = 9): string {
  const R = rng(seed);
  const pts: [number, number][] = [];
  const rot = R() * Math.PI * 2;
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * Math.PI * 2;
    const k = 1 + (R() * 2 - 1) * wobble;
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  // smooth closed Catmull-Rom → cubic Bézier
  let d = `M${r2(pts[0][0])} ${r2(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${r2(c1[0])} ${r2(c1[1])} ${r2(c2[0])} ${r2(c2[1])} ${r2(p2[0])} ${r2(p2[1])}`;
  }
  return d + 'Z';
}

/** outline width for a drawing scale (100 % = 4 px like the design sheet) */
export const ow = (scalePct: number, base = 4) => Math.max(1, (base * scalePct) / 100);

/** wrap a body into a full SVG document of exactly w×h */
export function svgDoc(w: number, h: number, body: string, viewBox?: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="${viewBox ?? `0 0 ${w} ${h}`}">${body}</svg>`;
}

/** soft drop shadow ellipse (flat style: no blur) */
export const shadow = (cx: number, cy: number, rx: number, ry: number, op = 0.18) => ellipse(cx, cy, rx, ry, { fill: '#000', opacity: op });

/** fit a design box (bw×bh, centred on 0,0) into a canvas box with margin; returns transform */
export function fitBox(bw: number, bh: number, w: number, h: number, margin = 2, cx = w / 2, cy = h / 2): string {
  const s = Math.min((w - margin * 2) / bw, (h - margin * 2) / bh);
  return `translate(${r2(cx)} ${r2(cy)}) scale(${r2(s)})`;
}
