// Underwater kit (GS005-06 diving): side-view divers Bongo/Pucki, water backdrop, rocks from 1-bit masks,
// seaweed, coins, barrels, treasure chest, bubbles.
import { blob, C, circle, defs, dk, ellipse, g, line, linGrad, lt, path, rect, rng } from './svg';

export type Diver = 'Bingo' | 'Puck';

const TANK = '#ffd23f', TANKD = '#8a6d00';
const FIN = '#2fbf9a', FIND = '#145c4a';

/**
 * Side view of a swimming diver, facing LEFT, origin = body centre, roughly x -48..48, y -30..28.
 * phase: flipper kick phase (radians); face: 1 = facing left, -1 = right, in between = turning (squash).
 */
export function diverSide(who: Diver, phase: number, face = 1): string {
  const kick = Math.sin(phase);
  const legA = 10 + kick * 16, legB = 10 - kick * 16; // degrees
  const bongo = who === 'Bingo';
  const body = bongo ? C.orange : C.mint, bodyD = bongo ? C.orangeDark : C.mintDark;
  const shoe = bongo ? C.boot : C.shoe, shoeD = bongo ? C.bootDark : C.shoeDark;
  const leg = (deg: number, y: number, back: boolean) =>
    g({ transform: `translate(18 ${y}) rotate(${deg})` },
      rect(0, -4, 16, 8, { rx: 4, fill: back ? dk(body, 0.15) : body, stroke: bodyD, strokeWidth: 2.5 }),
      rect(12, -6, 10, 12, { rx: 4, fill: shoe, stroke: shoeD, strokeWidth: 2.5 }),
      path('M20 -6 L40 -12 Q44 0 40 12 L20 6 Z', { fill: back ? dk(FIN, 0.2) : FIN, stroke: FIND, strokeWidth: 2.5, strokeLinejoin: 'round' }),
      path('M26 -4 L38 -6 M26 4 L38 6', { stroke: FIND, strokeWidth: 1.4, fillOpacity: 0.6 }));
  let s = leg(-legB, 4, true);
  // oxygen tank on the back (top)
  s += rect(-16, -32, 40, 14, { rx: 7, fill: TANK, stroke: TANKD, strokeWidth: 3 }) + rect(-22, -29, 8, 8, { rx: 2, fill: '#9aa4ad', stroke: '#4d5560', strokeWidth: 2 }) +
    path('M-10 -28 h24', { stroke: '#fff', strokeWidth: 2.5, strokeLinecap: 'round', fillOpacity: 0.6 });
  // body
  if (bongo) {
    s += rect(-30, -20, 54, 40, { rx: 14, fill: body, stroke: bodyD, strokeWidth: 3.5 }) +
      path('M-26 -12 q10 -8 30 -6', { fill: 'none', stroke: C.orangeLight, strokeWidth: 4, strokeLinecap: 'round' }) +
      // bandana on top + knot at the back
      path('M-28 -12 q0 -8 10 -8 h30 q10 0 12 8 z', { fill: C.bandana, stroke: C.bandanaDark, strokeWidth: 2.5 }) +
      circle(-14, -15, 1.6, { fill: '#fff' }) + circle(-2, -16, 1.6, { fill: '#fff' }) + circle(10, -15, 1.6, { fill: '#fff' }) +
      path('M24 -14 l8 -6 l-2 8 l6 4 l-10 0 z', { fill: C.bandana, stroke: C.bandanaDark, strokeWidth: 2, strokeLinejoin: 'round' });
  } else {
    s += circle(-2, 0, 22, { fill: body, stroke: bodyD, strokeWidth: 3.5 }) +
      path('M-18 -8 q6 -10 18 -12', { fill: 'none', stroke: C.mintLight, strokeWidth: 4, strokeLinecap: 'round' }) +
      path('M-2 -22 q-4 -12 6 -12 q6 2 0 8', { fill: 'none', stroke: bodyD, strokeWidth: 3, strokeLinecap: 'round' }) +
      circle(-14, 10, 1.4, { fill: C.freckle }) + circle(-10, 13, 1.4, { fill: C.freckle });
  }
  // arm pointing forward
  s += path('M-8 8 q-14 6 -24 4', { fill: 'none', stroke: bodyD, strokeWidth: 9, strokeLinecap: 'round' }) +
    path('M-8 8 q-14 6 -24 4', { fill: 'none', stroke: body, strokeWidth: 5, strokeLinecap: 'round' });
  // diving mask (front = left) + snorkel to the tank
  const mx = bongo ? -27 : -22;
  s += path(`M${mx + 6} -14 q-4 -14 14 -16`, { fill: 'none', stroke: '#2a2140', strokeWidth: 3.5, strokeLinecap: 'round' }) +
    rect(mx - 8, -12, 18, 16, { rx: 6, fill: '#bfe6ff', stroke: C.ink, strokeWidth: 3 }) +
    circle(mx - 1, -4, 3.5, { fill: '#fff', stroke: C.ink, strokeWidth: 1.2 }) + circle(mx - 2.2, -4, 1.8, { fill: bongo ? C.eyeBlue : C.ink }) +
    path(`M${mx - 5} -9 l4 -1`, { stroke: '#fff', strokeWidth: 2, strokeLinecap: 'round' }) +
    // mouthpiece
    rect(mx - 6, 6, 8, 6, { rx: 2, fill: '#2a2140' }) + path(`M${mx - 2} 9 q10 14 24 -28`, { fill: 'none', stroke: '#2a2140', strokeWidth: 2.5 });
  s += leg(-legA, 12, false);
  return g({ transform: `scale(${face.toFixed(3)} 1)` }, s);
}

/** member art for BingoL/W/R-n and PuckL/W/R-n (canvas w×h, reg) */
export function diverMember(name: string, regX: number, regY: number): string | null {
  const mm = /^(Bingo|Puck)([LWR])-(\d+)$/.exec(name);
  if (!mm) return null;
  const who = mm[1] as Diver, kind = mm[2], f = +mm[3];
  const n = kind === 'R' && who === 'Puck' ? 11 : 10;
  const phase = ((f - 1) / n) * Math.PI * 2;
  let face = 1;
  if (kind === 'R') face = -1;
  if (kind === 'W') {
    const c = Math.cos(((f - 1) / 9) * Math.PI);
    face = Math.sign(c || 1) * Math.max(0.18, Math.abs(c));
  }
  return g({ transform: `translate(${regX} ${regY}) scale(0.98)` }, diverSide(who, phase, face));
}

// ---------------------------------------------------------------- water backdrop

/** water gradient + light rays + floating particles (0..w x 0..h) */
export function water(id: string, w: number, h: number, depth: number, seed = 1): string {
  // depth 0 = near the surface (light), 1 = deep
  const top = lt('#2aa6b8', 0.35 * (1 - depth)), bot = dk('#1d6f86', 0.25 + depth * 0.3);
  let s = defs(linGrad(`${id}g`, [[0, top], [1, bot]]), linGrad(`${id}r`, [[0, '#ffffff', 0.22], [1, '#ffffff', 0]]));
  s += rect(0, 0, w, h, { fill: `url(#${id}g)` });
  const R = rng(seed);
  for (let i = 0; i < 5; i++) {
    const x = 60 + i * 170 + R() * 60, wd = 30 + R() * 50;
    s += path(`M${x} 0 h${wd} L${x + wd - 120} ${h} h${-wd * 1.8} Z`, { fill: `url(#${id}r)`, fillOpacity: 0.5 + (1 - depth) * 0.5 });
  }
  for (let i = 0; i < 70; i++) s += circle(R() * w, R() * h, 0.8 + R() * 1.4, { fill: '#e8fbff', fillOpacity: 0.25 + R() * 0.4 });
  return s;
}

/** distant rock silhouettes (background layer) */
export function farRocks(w: number, y: number, seed: number, col = '#1f5f73'): string {
  const R = rng(seed);
  let s = '';
  for (let x = -40; x < w + 40; x += 70 + R() * 60) s += path(blob(x, y + R() * 30, 60 + R() * 50, 50 + R() * 40, seed * 31 + x, 0.25), { fill: col, fillOpacity: 0.55 });
  return s;
}

/** sandy floor from y to the bottom with a soft wavy top */
export function seabed(w: number, h: number, y: number, seed: number): string {
  const R = rng(seed);
  let d = `M0 ${y}`;
  for (let x = 0; x <= w; x += 50) d += ` Q${x + 25} ${y - 8 + R() * 16} ${x + 50} ${y + (R() - 0.5) * 10}`;
  d += ` V${h} H0 Z`;
  let s = path(d, { fill: '#d9c48a', stroke: '#8a7a4a', strokeWidth: 4, strokeLinejoin: 'round' });
  for (let i = 0; i < 60; i++) s += ellipse(R() * w, y + 14 + R() * (h - y), 2 + R() * 4, 1.2 + R() * 2, { fill: '#b8a36a', fillOpacity: 0.6 });
  for (let i = 0; i < 8; i++) s += path(blob(R() * w, y + 20 + R() * (h - y - 20), 10 + R() * 12, 6 + R() * 6, seed + i, 0.2), { fill: C.stone, stroke: C.stoneDark, strokeWidth: 3 });
  return s;
}

/**
 * rock drawn exactly over a 1-bit collision geometry (run-length path `d`, offset ox/oy):
 * dark outline (dilated copies), stone fill, texture blobs clipped to the shape.
 */
export function maskRock(id: string, d: string, ox: number, oy: number, mw: number, mh: number, seed: number): string {
  const R = rng(seed);
  const col = '#9a8a6e', colD = '#3e3426', colL = '#c4b48e';
  let s = '';
  for (const [x, y] of [[-3, 0], [3, 0], [0, -3], [0, 3], [-2, -2], [2, 2], [-2, 2], [2, -2]]) s += path(d, { fill: colD, transform: `translate(${x} ${y})` });
  s += path(d, { fill: col });
  let tex = '';
  for (let i = 0; i < 90; i++) {
    const x = R() * mw, y = R() * mh;
    tex += path(blob(x, y, 14 + R() * 30, 10 + R() * 22, seed * 7 + i, 0.3), { fill: R() < 0.5 ? colL : dk(col, 0.25), fillOpacity: 0.35 + R() * 0.3 });
  }
  for (let i = 0; i < 26; i++) {
    const x = R() * mw, y = R() * mh;
    tex += path(`M${x} ${y} q${8 + R() * 10} ${-4 - R() * 6} ${18 + R() * 14} ${R() * 6}`, { fill: 'none', stroke: colD, strokeWidth: 2.5, strokeLinecap: 'round', strokeOpacity: 0.6 });
  }
  // light top edge: shape shifted down, lighter, clipped
  s += `<clipPath id="${id}c"><path d="${d}"/></clipPath>` +
    g({ clipPath: `url(#${id}c)` }, tex);
  return g({ transform: `translate(${ox} ${oy})` }, s);
}

/** one swaying seaweed strand from (x,y) going up (len < 0: hanging down) */
export function kelp(x: number, y: number, len: number, sway: number, seed: number, col = '#3fae6a'): string {
  const R = rng(seed);
  const dir = len < 0 ? 1 : -1, L = Math.abs(len);
  const n = Math.max(3, Math.round(L / 40));
  let d = `M${x} ${y}`;
  const pts: [number, number][] = [];
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    const px = x + Math.sin(t * 3 + seed) * sway * t, py = y + dir * L * t;
    pts.push([px, py]);
    d += ` Q${x + Math.sin((t - 0.5 / n) * 3 + seed) * sway * t + (R() - 0.5) * 12} ${py - dir * (L / n) * 0.5} ${px} ${py}`;
  }
  let s = path(d, { fill: 'none', stroke: dk(col, 0.4), strokeWidth: 7, strokeLinecap: 'round' }) + path(d, { fill: 'none', stroke: col, strokeWidth: 4, strokeLinecap: 'round' });
  for (const [i, [px, py]] of pts.entries()) {
    const side = i % 2 ? 1 : -1;
    s += path(`M${px} ${py} q${side * 14} ${-dir * 2} ${side * 22} ${dir * 10} q${-side * 12} 2 ${-side * 22} ${-dir * 10} z`, { fill: lt(col, 0.15), stroke: dk(col, 0.4), strokeWidth: 2.5, strokeLinejoin: 'round' });
  }
  return s;
}

export function bubble(cx: number, cy: number, r: number): string {
  return circle(cx, cy, r, { fill: '#cff4ff', fillOpacity: 0.35, stroke: '#ffffff', strokeWidth: Math.max(1.5, r * 0.18) }) +
    path(`M${cx - r * 0.5} ${cy - r * 0.1} q0 -${r * 0.4} ${r * 0.4} -${r * 0.45}`, { fill: 'none', stroke: '#fff', strokeWidth: Math.max(1.2, r * 0.16), strokeLinecap: 'round' });
}

/** spinning coin: rx = half the visible width */
export function coin(cx: number, cy: number, rx: number, ry: number): string {
  if (rx < 2.6) return rect(cx - rx, cy - ry, rx * 2, ry * 2, { rx: rx, fill: C.goldDark });
  return ellipse(cx, cy, rx, ry, { fill: C.gold, stroke: C.goldDark, strokeWidth: 1.6 }) +
    ellipse(cx, cy, rx * 0.6, ry * 0.62, { fill: 'none', stroke: lt(C.gold, 0.5), strokeWidth: 1.2 });
}

/** wooden barrel (side view, centred, 44×56) */
export function barrel(): string {
  return rect(-22, -28, 44, 56, { rx: 14, fill: '#a8682f', stroke: C.woodDeep, strokeWidth: 3.5 }) +
    path('M-10 -27 q-4 27 0 54 M10 -27 q4 27 0 54', { fill: 'none', stroke: C.woodDark, strokeWidth: 2 }) +
    rect(-23, -18, 46, 6, { rx: 2, fill: '#6b6f78', stroke: '#33363c', strokeWidth: 2 }) +
    rect(-23, 12, 46, 6, { rx: 2, fill: '#6b6f78', stroke: '#33363c', strokeWidth: 2 }) +
    path('M-16 -6 v14', { stroke: lt('#a8682f', 0.4), strokeWidth: 3, strokeLinecap: 'round' }) +
    circle(0, 0, 3, { fill: C.woodDeep });
}

/** treasure chest, bottom centre at (0,0), lid open 0..1 */
export function chest(open: number): string {
  const wd = 84, bh = 40;
  const lidH = 30;
  let s = rect(-wd / 2, -bh, wd, bh, { rx: 6, fill: '#9a5a26', stroke: C.woodDeep, strokeWidth: 3.5 }) +
    rect(-wd / 2, -bh + 12, wd, 6, { fill: C.gold, stroke: C.goldDark, strokeWidth: 1.5 }) +
    rect(-6, -bh + 8, 12, 14, { rx: 2, fill: C.gold, stroke: C.goldDark, strokeWidth: 2 }) + circle(0, -bh + 15, 2, { fill: C.woodDeep });
  if (open > 0.05) {
    // gold heap inside + glow
    s = ellipse(0, -bh - 2, wd / 2 - 4, 10 + open * 4, { fill: C.gold, stroke: C.goldDark, strokeWidth: 2.5 }) +
      [-24, -10, 6, 20].map((x, i) => circle(x, -bh - 6 - (i % 2) * 4, 5, { fill: lt(C.gold, 0.3), stroke: C.goldDark, strokeWidth: 1.5 })).join('') + s;
  }
  // lid: a box above, height grows with the opening (seen more from inside)
  const lh = lidH * (1 - open) + 8 + open * 52;
  const top = -bh - lh;
  s += path(`M${-wd / 2} ${-bh} V${top + 12} q0 -12 12 -12 h${wd - 24} q12 0 12 12 V${-bh} Z`, { fill: open > 0.5 ? '#7a4418' : '#a8682f', stroke: C.woodDeep, strokeWidth: 3.5, strokeLinejoin: 'round' });
  if (open > 0.5) s += rect(-wd / 2 + 8, top + 8, wd - 16, lh - 12, { rx: 6, fill: '#5a3010' });
  s += rect(-wd / 2, top + 10, 8, lh - 10, { fill: C.gold, stroke: C.goldDark, strokeWidth: 1.5 }) + rect(wd / 2 - 8, top + 10, 8, lh - 10, { fill: C.gold, stroke: C.goldDark, strokeWidth: 1.5 });
  return s;
}

/** coral fan (bottom centre) */
export function coral(x: number, y: number, s: number, col: string, seed: number): string {
  const R = rng(seed);
  let d = '';
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i - 2) * 0.35;
    const L = 30 + R() * 20;
    const ex = Math.cos(a) * L, ey = Math.sin(a) * L;
    d += `M0 0 Q${ex * 0.4} ${ey * 0.6} ${ex} ${ey} M${ex * 0.6} ${ey * 0.6} l${(R() - 0.5) * 18} ${-10 - R() * 8} `;
  }
  return g({ transform: `translate(${x} ${y}) scale(${s})` }, path(d, { fill: 'none', stroke: dk(col, 0.45), strokeWidth: 9, strokeLinecap: 'round' }), path(d, { fill: 'none', stroke: col, strokeWidth: 5, strokeLinecap: 'round' }));
}

export { line };
