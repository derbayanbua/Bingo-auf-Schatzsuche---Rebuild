// Flat, tileable SVG patterns (wood, cobble stone, grass, sand, dirt, water) + sky/wall gradients.
// Usage: put the returned <pattern>/<linearGradient> into defs(), fill with `url(#id)`.

import { C, blob, circle, dk, ellipse, line, linGrad, lt, path, r2, rect, rng } from './svg';

/** horizontal (or vertical) planks */
export function woodPattern(id: string, o: { base?: string; dark?: string; plank?: number; len?: number; vertical?: boolean; seed?: number } = {}): string {
  const base = o.base ?? C.floor, dark = o.dark ?? C.floorDark, ph = o.plank ?? 24, len = o.len ?? 160;
  const R = rng(o.seed ?? 7);
  const W = len * 2, H = ph * 4;
  let s = rect(0, 0, W, H, { fill: base });
  for (let i = 0; i < 4; i++) {
    const y = i * ph;
    s += rect(0, y, W, ph, { fill: i % 2 ? lt(base, 0.06) : base });
    s += line(0, y + 0.75, W, y + 0.75, { stroke: dark, strokeWidth: 1.5, opacity: 0.55 });
    const off = (i * 61) % len;
    s += line(off, y, off, y + ph, { stroke: dark, strokeWidth: 1.5, opacity: 0.55 });
    s += line(off + len, y, off + len, y + ph, { stroke: dark, strokeWidth: 1.5, opacity: 0.55 });
    // grain
    for (let k = 0; k < 3; k++) {
      const gx = R() * W, gy = y + 5 + R() * (ph - 10), gl = 20 + R() * 40;
      s += path(`M${r2(gx)} ${r2(gy)} q${r2(gl / 2)} ${r2(R() * 4 - 2)} ${r2(gl)} 0`, { fill: 'none', stroke: dark, strokeWidth: 1, opacity: 0.25, strokeLinecap: 'round' });
    }
  }
  const tf = o.vertical ? ' patternTransform="rotate(90)"' : '';
  return `<pattern id="${id}" patternUnits="userSpaceOnUse" width="${W}" height="${H}"${tf}>${s}</pattern>`;
}

/** cobble stones (top-down roads) */
export function cobblePattern(id: string, o: { base?: string; mortar?: string; size?: number; seed?: number } = {}): string {
  const base = o.base ?? C.stone, mortar = o.mortar ?? C.stoneDark, sz = o.size ?? 18;
  const R = rng(o.seed ?? 3);
  const W = sz * 6, H = sz * 6;
  let s = rect(0, 0, W, H, { fill: mortar });
  for (let j = 0; j < 6; j++) {
    for (let i = 0; i < 6; i++) {
      const cx = i * sz + (j % 2 ? sz / 2 : 0) + sz / 2, cy = j * sz + sz / 2;
      const col = [base, lt(base, 0.12), dk(base, 0.08), mixStone(base, R())][Math.floor(R() * 4)];
      for (const dx of [0, -W, W]) {
        const d = blob(cx + dx, cy, sz * 0.42, sz * 0.38, `${o.seed ?? 3}-${i}-${j}`, 0.12, 7);
        s += path(d, { fill: col });
        s += path(d, { fill: 'none', stroke: lt(col, 0.35), strokeWidth: 1.2, opacity: 0.5, transform: `translate(-0.8 -0.8)` });
      }
    }
  }
  return `<pattern id="${id}" patternUnits="userSpaceOnUse" width="${W}" height="${H}">${s}</pattern>`;
}
function mixStone(base: string, t: number) {
  return t > 0.5 ? lt(base, 0.2) : dk(base, 0.15);
}

/** lawn: base colour with darker/lighter tufts */
export function grassPattern(id: string, o: { base?: string; seed?: number; size?: number } = {}): string {
  const base = o.base ?? C.grass, W = o.size ?? 120;
  const R = rng(o.seed ?? 11);
  let s = rect(0, 0, W, W, { fill: base });
  for (let i = 0; i < 26; i++) {
    const x = R() * W, y = R() * W, col = R() > 0.5 ? dk(base, 0.18) : lt(base, 0.2);
    s += path(`M${r2(x)} ${r2(y)} l-2 -5 M${r2(x)} ${r2(y)} l0 -6 M${r2(x)} ${r2(y)} l2.5 -5`, { stroke: col, strokeWidth: 1.4, strokeLinecap: 'round', fill: 'none', opacity: 0.8 });
  }
  for (let i = 0; i < 8; i++) s += ellipse(R() * W, R() * W, 6 + R() * 10, 3 + R() * 5, { fill: dk(base, 0.1), opacity: 0.25 });
  return `<pattern id="${id}" patternUnits="userSpaceOnUse" width="${W}" height="${W}">${s}</pattern>`;
}

/** sand / dirt: specks and pebbles */
export function specklePattern(id: string, o: { base: string; speck?: string; seed?: number; size?: number; pebbles?: number }): string {
  const W = o.size ?? 90, R = rng(o.seed ?? 5);
  const speck = o.speck ?? dk(o.base, 0.25);
  let s = rect(0, 0, W, W, { fill: o.base });
  for (let i = 0; i < 40; i++) s += circle(R() * W, R() * W, 0.6 + R() * 1.3, { fill: R() > 0.3 ? speck : lt(o.base, 0.4), opacity: 0.7 });
  for (let i = 0; i < (o.pebbles ?? 3); i++) {
    const x = R() * W, y = R() * W;
    s += ellipse(x, y, 2.5 + R() * 2, 2 + R() * 1.5, { fill: lt(speck, 0.3), stroke: speck, strokeWidth: 0.8 });
  }
  return `<pattern id="${id}" patternUnits="userSpaceOnUse" width="${W}" height="${W}">${s}</pattern>`;
}
export const sandPattern = (id: string, seed = 5) => specklePattern(id, { base: C.sand, speck: C.sandDark, seed });
export const dirtPattern = (id: string, seed = 6) => specklePattern(id, { base: C.dirt, speck: C.dirtDark, seed, pebbles: 6 });

/** water with light wave strokes (top-down sea / river) */
export function waterPattern(id: string, o: { base?: string; seed?: number; size?: number } = {}): string {
  const base = o.base ?? C.water, W = o.size ?? 140, R = rng(o.seed ?? 9);
  let s = rect(0, 0, W, W, { fill: base });
  for (let i = 0; i < 9; i++) {
    const x = R() * W, y = R() * W, l = 14 + R() * 18;
    s += path(`M${r2(x)} ${r2(y)} q${r2(l / 4)} -4 ${r2(l / 2)} 0 t${r2(l / 2)} 0`, { fill: 'none', stroke: lt(base, 0.45), strokeWidth: 2, strokeLinecap: 'round', opacity: 0.8 });
  }
  return `<pattern id="${id}" patternUnits="userSpaceOnUse" width="${W}" height="${W}">${s}</pattern>`;
}

/** wall boards (vertical planks) for houses seen from outside */
export function boardsPattern(id: string, o: { base?: string; dark?: string; w?: number } = {}): string {
  const base = o.base ?? '#f3dc9a', dark = o.dark ?? '#c9a55a', bw = o.w ?? 22;
  let s = rect(0, 0, bw * 4, 200, { fill: base });
  for (let i = 0; i < 4; i++) {
    s += rect(i * bw, 0, bw, 200, { fill: i % 2 ? lt(base, 0.08) : base });
    s += line(i * bw + 0.75, 0, i * bw + 0.75, 200, { stroke: dark, strokeWidth: 1.5 });
  }
  return `<pattern id="${id}" patternUnits="userSpaceOnUse" width="${bw * 4}" height="200">${s}</pattern>`;
}

export const skyGrad = (id: string) => linGrad(id, [[0, C.sky], [1, C.skyLight]]);
export const wallGrad = (id: string) => linGrad(id, [[0, C.wall], [1, C.wallDark]]);
export const floorGrad = (id: string) => linGrad(id, [[0, C.floor], [1, C.floorDark]]);
export const nightGrad = (id: string) => linGrad(id, [[0, '#2a1d6b'], [1, '#4a3aa0']]);
