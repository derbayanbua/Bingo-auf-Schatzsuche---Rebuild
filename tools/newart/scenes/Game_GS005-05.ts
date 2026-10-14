// GS005-05 "Taucher anziehen" – diver dressing game in the lock chamber of the lighthouse.
// Score (scene coords = stage y - 45): Bingo/Puck body + all parts share loc (300, 245) at 100 %.
// Bingo 11 body, 12 Mund, 13 Back, 14 Eyes, 15 Head, 16 Nose, 17 ShoeL, 18 ShoeR; Puck 21..28 likewise.
// Clothes (ch 31-45) lie on the left side; "-1" = hover state (10 px bigger, same centre).
// All figure parts are drawn in loc coordinates (atReg) inside their member boxes (x0 = -regX, y0 = -regY).
import { atReg, defineMovie, type Member } from '../lib/api';
import { C, circle, defs, dk, ellipse, g, line, linGrad, lt, path, r2, radGrad, rect } from '../lib/svg';
import { woodPattern } from '../lib/textures';
import { fitText, headline } from '../lib/ui';

const SW = 4;
const INK = C.ink;

// =================================================================== figure geometry (loc, 100 %)

interface Fig {
  fill: string; dark: string; light: string;
  eyes: [number, number][]; eyeRx: number; eyeRy: number;
  nose: [number, number, number, number];
  mouth: [number, number];
  legs: [number, number, number][]; // x, top, ankle y
  arms: [number, number, number, number][]; // shoulder x,y -> hand x,y
  /** clip path (loc) of the body outline */
  body: string;
}

const BLOCK = { x: 60, y: -100, w: 172, h: 222, rx: 30 };
const BALL = { cx: 140, cy: 8, r: 100 };

const BINGO: Fig = {
  fill: C.orange, dark: C.orangeDark, light: C.orangeLight,
  eyes: [[108, -38], [160, -38]], eyeRx: 19, eyeRy: 24,
  nose: [95, 4, 17, 14],
  mouth: [118, 52],
  legs: [[105, 110, 142], [163, 110, 156]],
  arms: [[64, -4, 2, -12], [228, -4, 306, -12]],
  body: `M${BLOCK.x + BLOCK.rx} ${BLOCK.y} h${BLOCK.w - 2 * BLOCK.rx} q${BLOCK.rx} 0 ${BLOCK.rx} ${BLOCK.rx} v${BLOCK.h - 2 * BLOCK.rx} q0 ${BLOCK.rx} ${-BLOCK.rx} ${BLOCK.rx} h${-(BLOCK.w - 2 * BLOCK.rx)} q${-BLOCK.rx} 0 ${-BLOCK.rx} ${-BLOCK.rx} v${-(BLOCK.h - 2 * BLOCK.rx)} q0 ${-BLOCK.rx} ${BLOCK.rx} ${-BLOCK.rx} z`,
};

const PUCK: Fig = {
  fill: C.mint, dark: C.mintDark, light: C.mintLight,
  eyes: [[112, -30], [162, -30]], eyeRx: 18, eyeRy: 23,
  nose: [82, 22, 20, 16],
  mouth: [116, 70],
  legs: [[103, 95, 140], [163, 95, 152]],
  arms: [[46, 0, -22, -6], [234, 0, 330, -6]],
  body: `M${BALL.cx - BALL.r} ${BALL.cy} a${BALL.r} ${BALL.r} 0 1 0 ${2 * BALL.r} 0 a${BALL.r} ${BALL.r} 0 1 0 ${-2 * BALL.r} 0 z`,
};

const figOf = (m: Member): Fig => (m.name.startsWith('Puck') ? PUCK : BINGO);
const box = (m: Member) => ({ x: -m.regX, y: -m.regY, w: m.w, h: m.h });

function armT(sx: number, sy: number, hx: number, hy: number, f: Fig): string {
  const d = `M${sx} ${sy} Q${r2((sx + hx) / 2)} ${r2(sy + 8)} ${hx} ${hy}`;
  return path(d, { fill: 'none', stroke: f.dark, strokeWidth: 16, strokeLinecap: 'round' }) +
    path(d, { fill: 'none', stroke: f.fill, strokeWidth: 9, strokeLinecap: 'round' }) +
    circle(hx, hy, 14, { fill: f.fill, stroke: f.dark, strokeWidth: SW }) +
    path(`M${hx - 7} ${hy - 4} q4 -7 11 -6`, { fill: 'none', stroke: '#fff', strokeWidth: 3, strokeLinecap: 'round', opacity: 0.6 });
}

function legs(f: Fig): string {
  return f.legs.map(([x, t, a]) => rect(x - 7, t, 14, a - t + 6, { rx: 5, fill: f === BINGO ? C.leg : f.dark, stroke: dk(f.dark, 0.4), strokeWidth: 2.5 })).join('');
}

function eyes(f: Fig, look = 0): string {
  return f.eyes.map(([x, y]) =>
    ellipse(x, y, f.eyeRx, f.eyeRy, { fill: C.white, stroke: INK, strokeWidth: SW }) +
    (f === BINGO ? circle(x + 3 + look, y + 5, 10, { fill: C.eyeBlue }) : '') +
    circle(x + 3 + look, y + 5, f === BINGO ? 5 : 8, { fill: INK }) + circle(x + 6 + look, y + 1, 3, { fill: C.white })).join('');
}

function nose(f: Fig): string {
  const [x, y, rx, ry] = f.nose;
  const fill = f === BINGO ? C.nose : C.puckNose;
  return ellipse(x, y, rx, ry, { fill, stroke: dk(fill, 0.45), strokeWidth: 3 }) + ellipse(x - rx * 0.35, y - ry * 0.35, rx * 0.3, ry * 0.22, { fill: '#fff', opacity: 0.6 });
}

function mouth(f: Fig, n: number, patch: boolean): string {
  const [cx, cy] = f.mouth;
  const s = f === BINGO ? 1.45 : 1.6;
  const p = patch ? ellipse(cx, cy + 4, 31 * s, 21 * s, { fill: f.fill }) : '';
  let m: string;
  if (n <= 1) {
    m = path(`M-22 -3 q22 22 44 0 q-22 8 -44 0 z`, { fill: C.mouth, stroke: INK, strokeWidth: SW / s, strokeLinejoin: 'round' }) + path('M-8 0.5 h16 v3.5 q-8 2.5 -16 0 z', { fill: '#fff' });
  } else if (n === 2) {
    m = path('M-21 -5 q21 6 42 0 q-6 22 -21 22 q-15 0 -21 -22 z', { fill: C.mouth, stroke: INK, strokeWidth: SW / s, strokeLinejoin: 'round' }) +
      path('M-9 -2.5 h18 v4 q-9 2 -18 0 z', { fill: '#fff' }) + ellipse(0, 12, 8, 4, { fill: C.tongue });
  } else {
    m = path('M-17 -8 q17 -4 34 0 q4 14 -3 22 q-14 9 -28 0 q-7 -8 -3 -22 z', { fill: C.mouth, stroke: INK, strokeWidth: SW / s, strokeLinejoin: 'round' }) +
      path('M-9 -7 h18 v4.5 q-9 2 -18 0 z', { fill: '#fff' }) + ellipse(0, 11, 9, 5, { fill: C.tongue });
  }
  return p + g({ transform: `translate(${cx} ${cy}) scale(${s})` }, m);
}

function bodyBingo(): string {
  const b = BLOCK, f = BINGO;
  return legs(f) + f.arms.map(([a, b2, c, d]) => armT(a, b2, c, d, f)).join('') +
    path(f.body, { fill: f.fill, stroke: f.dark, strokeWidth: 5 }) +
    path(`M${b.x + 12} ${b.y + 50} v130 q0 12 10 14`, { fill: 'none', stroke: f.light, strokeWidth: 8, strokeLinecap: 'round', opacity: 0.7 }) +
    // bandana band
    path(`M${b.x - 1} ${b.y + 36} v-6 q0 -31 31 -31 h${b.w - 60} q31 0 31 31 v6 q-${b.w / 2} 12 -${b.w + 2} 0 z`, { fill: C.bandana, stroke: C.bandanaDark, strokeWidth: SW }) +
    [[85, -86], [115, -92], [148, -90], [180, -92], [208, -84], [100, -74], [132, -76], [165, -76], [195, -72]].map(([x, y]) => circle(x, y, 4.5, { fill: '#fff' })).join('') +
    eyes(f) + nose(f) + mouth(f, 1, false);
}

function bodyPuck(): string {
  const f = PUCK, { cx, cy, r } = BALL;
  return legs(f) + f.arms.map(([a, b2, c, d]) => armT(a, b2, c, d, f)).join('') +
    path(f.body, { fill: f.fill, stroke: f.dark, strokeWidth: 5 }) +
    path(`M${cx - 78} ${cy - 10} q8 -60 62 -78`, { fill: 'none', stroke: f.light, strokeWidth: 9, strokeLinecap: 'round', opacity: 0.8 }) +
    path(`M${cx - 60} ${cy + 74} q60 36 120 4`, { fill: 'none', stroke: f.dark, strokeWidth: 5, strokeLinecap: 'round', opacity: 0.25 }) +
    [[64, 34, 4], [56, 24, 3.5], [70, 22, 3], [196, 30, 4], [204, 20, 3.5], [190, 18, 3]].map(([x, y, rr]) => circle(x, y, rr, { fill: C.freckle })).join('') +
    eyes(f) + nose(f) + mouth(f, 1, false);
}

// =================================================================== clothes (drawn into a box)

type Draw = (x: number, y: number, w: number, h: number, id: string) => string;

const steel = '#9fb3c2', steelDark = '#3e5566';

const drawSunglasses: Draw = (x, y, w, h) => {
  const rx = w * 0.2, ry = h * 0.36, cy = y + h * 0.5;
  const l = x + w * 0.27, r = x + w * 0.66;
  return path(`M${r + rx} ${cy - ry * 0.4} L${x + w - 2} ${cy - ry * 0.7}`, { stroke: INK, strokeWidth: 4, strokeLinecap: 'round', fill: 'none' }) +
    path(`M${l + rx - 2} ${cy - 4} q${r2((r - l) / 2 - rx + 2)} -8 ${r2(r - l - 2 * rx + 4)} 0`, { stroke: INK, strokeWidth: 4, fill: 'none' }) +
    [l, r].map((cx) => ellipse(cx, cy, rx, ry, { fill: '#2a2140', stroke: '#e8483f', strokeWidth: 3 }) +
      path(`M${r2(cx - rx * 0.5)} ${r2(cy - ry * 0.3)} q${r2(rx * 0.3)} ${r2(-ry * 0.4)} ${r2(rx * 0.7)} ${r2(-ry * 0.45)}`, { stroke: '#fff', strokeWidth: 3, fill: 'none', opacity: 0.7, strokeLinecap: 'round' })).join('');
};

function drawSunglassesOn(f: Fig, x: number, y: number, w: number, h: number): string {
  const [[lx, ly], [rx2]] = f.eyes;
  const ex = f.eyeRx + 6, ey = f.eyeRy * 0.75;
  const cy = ly + 2;
  return path(`M${rx2 + ex} ${cy - 4} L${x + w - 3} ${cy - 10}`, { stroke: INK, strokeWidth: 5, strokeLinecap: 'round', fill: 'none' }) +
    path(`M${lx - ex} ${cy - 4} L${x + 3} ${cy - 8}`, { stroke: INK, strokeWidth: 5, strokeLinecap: 'round', fill: 'none' }) +
    path(`M${lx + ex - 3} ${cy - 6} q${(rx2 - lx) / 2 - ex + 3} -10 ${rx2 - lx - 2 * ex + 6} 0`, { stroke: INK, strokeWidth: 5, fill: 'none' }) +
    [lx, rx2].map((cx) => ellipse(cx, cy, ex, ey, { fill: '#2a2140', stroke: C.red, strokeWidth: 4 }) +
      path(`M${cx - ex * 0.5} ${cy - ey * 0.3} q${ex * 0.3} ${-ey * 0.4} ${ex * 0.7} ${-ey * 0.45}`, { stroke: '#fff', strokeWidth: 3.5, fill: 'none', opacity: 0.7, strokeLinecap: 'round' })).join('');
}

const drawMask: Draw = (x, y, w, h) => {
  const cx = x + w / 2, cy = y + h * 0.55;
  const mw = w * 0.7, mh = h * 0.72;
  return path(`M${x + 3} ${cy - 3} L${x + w - 3} ${cy - 3}`, { stroke: '#1d1d2b', strokeWidth: h * 0.18, strokeLinecap: 'round' }) +
    rect(cx - mw / 2, cy - mh / 2, mw, mh, { rx: mh * 0.45, fill: '#ffd23f', stroke: '#8a6d00', strokeWidth: 3 }) +
    rect(cx - mw / 2 + 6, cy - mh / 2 + 5, mw - 12, mh - 10, { rx: mh * 0.38, fill: '#bfe6f7', stroke: '#2a5b78', strokeWidth: 2.5 }) +
    path(`M${cx - mw / 2 + 14} ${cy - mh / 2 + 12} l${mw * 0.2} 0`, { stroke: '#fff', strokeWidth: 4, strokeLinecap: 'round', opacity: 0.9 });
};

function drawMaskOn(f: Fig, x: number, y: number, w: number, h: number): string {
  const [[lx, ly], [rx2]] = f.eyes;
  const cx = (lx + rx2) / 2, cy = ly;
  const mw = rx2 - lx + 2 * f.eyeRx + 26, mh = f.eyeRy * 2 + 20;
  const strapY = cy - 6;
  return path(`M${x + 3} ${strapY - 4} Q${cx} ${strapY - 18} ${x + w - 3} ${strapY - 10}`, { stroke: '#1d1d2b', strokeWidth: 12, fill: 'none', strokeLinecap: 'round' }) +
    rect(cx - mw / 2, cy - mh / 2, mw, mh, { rx: mh * 0.42, fill: '#ffd23f', stroke: '#8a6d00', strokeWidth: 5 }) +
    rect(cx - mw / 2 + 8, cy - mh / 2 + 8, mw - 16, mh - 16, { rx: mh * 0.34, fill: '#bfe6f7', fillOpacity: 0.55, stroke: '#2a5b78', strokeWidth: 3 }) +
    eyes(f, -1) +
    path(`M${cx - mw / 2 + 18} ${cy - mh / 2 + 16} l${mw * 0.22} 0`, { stroke: '#fff', strokeWidth: 5, strokeLinecap: 'round', opacity: 0.85 });
}

const drawBarrel: Draw = (x, y, w, h) => {
  const bulge = w * 0.12;
  const d = `M${x + bulge} ${y + 3} h${w - 2 * bulge} q${bulge * 1.6} ${h / 2 - 3} 0 ${h - 6} h${-(w - 2 * bulge)} q${-bulge * 1.6} ${-(h / 2 - 3)} 0 ${-(h - 6)} z`;
  const staves = [0.3, 0.5, 0.7].map((t) => line(x + w * t, y + 5, x + w * t, y + h - 5, { stroke: C.woodDark, strokeWidth: 2, opacity: 0.6 })).join('');
  const hoops = [0.2, 0.8].map((t) => path(`M${x + bulge * 0.4} ${y + h * t} q${w / 2 - bulge * 0.4} 5 ${w - bulge * 0.8} 0`, { stroke: '#4a4a58', strokeWidth: Math.max(4, h * 0.06), fill: 'none' })).join('');
  return path(d, { fill: C.wood, stroke: C.woodDeep, strokeWidth: 3.5 }) + staves + hoops +
    path(`M${x + bulge + 5} ${y + h * 0.3} v${h * 0.4}`, { stroke: lt(C.wood, 0.4), strokeWidth: 4, strokeLinecap: 'round', opacity: 0.7 });
};

function bottle(x: number, y: number, w: number, h: number, tilt = 0): string {
  const neck = w * 0.4, sh = h * 0.32;
  const d = `M${x + (w - neck) / 2} ${y + h * 0.1} h${neck} v${sh * 0.4} q${(w - neck) / 2} ${sh * 0.3} ${(w - neck) / 2} ${sh * 0.7} v${h - h * 0.1 - sh * 1.1 - 3} q0 3 -3 3 h${-w + 6} q-3 0 -3 -3 v${-(h - h * 0.1 - sh * 1.1 - 3)} q0 ${-sh * 0.4} ${(w - neck) / 2} ${-sh * 0.7} z`;
  const body = path(d, { fill: '#cfeef0', stroke: '#4f8a95', strokeWidth: 3 }) +
    rect(x + (w - neck) / 2 - 1, y, neck + 2, h * 0.13, { rx: 2, fill: '#c98a4a', stroke: '#6b3410', strokeWidth: 2.5 }) +
    rect(x + w * 0.2, y + h * 0.55, w * 0.6, h * 0.2, { rx: 2, fill: '#fff', stroke: '#4f8a95', strokeWidth: 1.5 }) +
    path(`M${x + w * 0.22} ${y + h * 0.4} v${h * 0.1}`, { stroke: '#fff', strokeWidth: 3, strokeLinecap: 'round' });
  return tilt ? g({ transform: `rotate(${tilt} ${x + w / 2} ${y + h})` }, body) : body;
}

const drawBottles: Draw = (x, y, w, h) => bottle(x + 2, y + h * 0.15, w * 0.46, h * 0.83, -6) + bottle(x + w * 0.5, y + 2, w * 0.46, h * 0.95, 4);

const drawHat: Draw = (x, y, w, h) => {
  const cx = x + w / 2;
  return ellipse(cx, y + h * 0.75, w / 2 - 2, h * 0.2, { fill: '#e8c060', stroke: '#8a6020', strokeWidth: 3 }) +
    path(`M${cx - w * 0.28} ${y + h * 0.75} q-2 ${-h * 0.62} ${w * 0.28} ${-h * 0.66} q${w * 0.3} 0 ${w * 0.28} ${h * 0.66} z`, { fill: '#f0d070', stroke: '#8a6020', strokeWidth: 3 }) +
    path(`M${cx - w * 0.27} ${y + h * 0.6} q${w * 0.27} 6 ${w * 0.54} 0`, { stroke: C.red, strokeWidth: h * 0.12, fill: 'none' });
};

const drawBeanie: Draw = (x, y, w, h, id) => {
  const cx = x + w / 2, pr = Math.min(w, h) * 0.13;
  const top = y + pr * 1.6, bot = y + h - 3;
  const brim = h * 0.17;
  const cap = `M${x + w * 0.08} ${bot - brim} Q${x + w * 0.12} ${top + h * 0.15} ${cx} ${top} Q${x + w * 0.88} ${top + h * 0.15} ${x + w * 0.92} ${bot - brim} z`;
  const n = 6, stripes: string[] = [];
  for (let i = 1; i < n; i++) {
    const yy = top + ((bot - brim - top) * i) / n;
    stripes.push(line(x, yy, x + w, yy, { stroke: '#fff', strokeWidth: (bot - brim - top) / n / 2.2 }));
  }
  return defs(`<clipPath id="${id}"><path d="${cap}"/></clipPath>`) +
    path(cap, { fill: '#6a5ad8' }) + g({ clipPath: `url(#${id})` }, ...stripes) + path(cap, { fill: 'none', stroke: '#2e2380', strokeWidth: 3.5 }) +
    rect(x + 3, bot - brim, w - 6, brim, { rx: brim / 2, fill: '#6a5ad8', stroke: '#2e2380', strokeWidth: 3.5 }) +
    path(`M${x + 8} ${bot - brim / 2} H${x + w - 8}`, { stroke: '#fff', strokeWidth: brim * 0.3, strokeDasharray: '6 6' }) +
    circle(cx, y + pr + 2, pr, { fill: '#8a7cf0', stroke: '#2e2380', strokeWidth: 3.5 }) + circle(cx - pr * 0.3, y + pr * 0.7 + 2, pr * 0.3, { fill: '#fff', opacity: 0.6 });
};

const drawLadle: Draw = (x, y, w, h) => {
  // bowl on the left (on the head), handle going up/right
  const br = Math.min(w * 0.3, h * 0.42);
  const bx = x + br + 3, by = y + h - br - 3;
  return path(`M${bx + br * 0.6} ${by - br * 0.5} L${x + w - 6} ${y + 6}`, { stroke: steelDark, strokeWidth: 9, strokeLinecap: 'round' }) +
    path(`M${bx + br * 0.6} ${by - br * 0.5} L${x + w - 6} ${y + 6}`, { stroke: steel, strokeWidth: 4, strokeLinecap: 'round' }) +
    circle(x + w - 8, y + 8, 4, { fill: 'none', stroke: steelDark, strokeWidth: 2.5 }) +
    path(`M${bx - br} ${by} a${br} ${br} 0 0 0 ${2 * br} 0 z`, { fill: steel, stroke: steelDark, strokeWidth: 3.5 }) +
    ellipse(bx, by, br, br * 0.3, { fill: '#cfdbe4', stroke: steelDark, strokeWidth: 3 });
};

const drawClothespin: Draw = (x, y, w, h) => {
  const cx = x + w / 2;
  return path(`M${cx - w * 0.38} ${y + h - 3} L${cx - w * 0.12} ${y + 3} h${w * 0.18} L${cx + w * 0.02} ${y + h - 3} z`, { fill: '#e2b36a', stroke: '#7a5020', strokeWidth: 3, strokeLinejoin: 'round' }) +
    path(`M${cx + w * 0.38} ${y + h - 3} L${cx + w * 0.12} ${y + 3} h${-w * 0.18} L${cx - w * 0.02} ${y + h - 3} z`, { fill: '#eec383', stroke: '#7a5020', strokeWidth: 3, strokeLinejoin: 'round' }) +
    rect(cx - w * 0.36, y + h * 0.36, w * 0.72, h * 0.1, { rx: 2, fill: steel, stroke: steelDark, strokeWidth: 2 });
};

function clothespinAt(cx: number, cy: number, len: number, rot: number): string {
  return g({ transform: `rotate(${rot} ${cx} ${cy})` }, drawClothespin(cx - len * 0.17, cy - len, len * 0.34, len, ''));
}

const drawPan: Draw = (x, y, w, h) => {
  // pan with handle to the left
  const pw = w * 0.55, cx = x + w - pw / 2 - 2, cy = y + h * 0.55;
  return path(`M${x + 6} ${y + h * 0.42} L${cx - pw * 0.4} ${cy - 2}`, { stroke: '#1d1d2b', strokeWidth: h * 0.2, strokeLinecap: 'round' }) +
    circle(x + 8, y + h * 0.42, h * 0.05, { fill: '#888' }) +
    ellipse(cx, cy + h * 0.1, pw / 2, h * 0.36, { fill: '#3a3a48', stroke: '#1d1d2b', strokeWidth: 3.5 }) +
    ellipse(cx, cy, pw / 2 - 2, h * 0.3, { fill: '#5a5a6c', stroke: '#1d1d2b', strokeWidth: 3 }) +
    path(`M${cx - pw * 0.3} ${cy - h * 0.12} q${pw * 0.15} -4 ${pw * 0.3} -4`, { stroke: '#9a9ab0', strokeWidth: 3, fill: 'none', strokeLinecap: 'round' });
};

const drawPlunger: Draw = (x, y, w, h) => {
  const cw = Math.min(w - 4, h * 0.6), ch = cw * 0.55;
  const cx = x + w / 2, cy = y + h - ch - 2;
  return rect(cx - w * 0.09, y + 2, w * 0.18, h - ch, { rx: w * 0.08, fill: '#a86a35', stroke: '#5a3010', strokeWidth: 2.5 }) +
    path(`M${cx - cw / 2} ${cy + ch} q0 ${-ch} ${cw / 2} ${-ch} q${cw / 2} 0 ${cw / 2} ${ch} z`, { fill: C.red, stroke: C.redDark, strokeWidth: 3 }) +
    path(`M${cx - cw * 0.3} ${cy + ch * 0.5} q${cw * 0.1} ${-ch * 0.3} ${cw * 0.25} ${-ch * 0.4}`, { stroke: '#ff9a90', strokeWidth: 3, fill: 'none', strokeLinecap: 'round' });
};

function plungerOn(f: Fig, x: number, y: number, w: number, h: number): string {
  const [nx, ny, nrx] = f.nose;
  const cw = nrx * 2 + 18, ch = cw * 0.55;
  const top = [x + w - 8, y + 6];
  return path(`M${nx} ${ny - ch * 0.6} L${top[0]} ${top[1]}`, { stroke: '#5a3010', strokeWidth: 12, strokeLinecap: 'round' }) +
    path(`M${nx} ${ny - ch * 0.6} L${top[0]} ${top[1]}`, { stroke: '#a86a35', strokeWidth: 7, strokeLinecap: 'round' }) +
    g({ transform: `rotate(18 ${nx} ${ny})` },
      path(`M${nx - cw / 2} ${ny + ch * 0.45} q0 ${-ch * 1.1} ${cw / 2} ${-ch * 1.1} q${cw / 2} 0 ${cw / 2} ${ch * 1.1} z`, { fill: C.red, stroke: C.redDark, strokeWidth: 4 }),
      path(`M${nx - cw * 0.3} ${ny} q${cw * 0.1} ${-ch * 0.4} ${cw * 0.25} ${-ch * 0.5}`, { stroke: '#ff9a90', strokeWidth: 3.5, fill: 'none', strokeLinecap: 'round' }));
}

function tank(x: number, y: number, w: number, h: number): string {
  return rect(x, y + w * 0.3, w, h - w * 0.3, { rx: w / 2, fill: '#ffd23f', stroke: '#8a6d00', strokeWidth: 3.5 }) +
    rect(x + w * 0.3, y + 4, w * 0.4, w * 0.4, { rx: 2, fill: '#9fb3c2', stroke: steelDark, strokeWidth: 2.5 }) +
    rect(x + w * 0.15, y, w * 0.7, w * 0.18, { rx: 3, fill: C.red, stroke: C.redDark, strokeWidth: 2.5 }) +
    path(`M${x + w * 0.25} ${y + w * 0.6} v${h * 0.5}`, { stroke: '#fff3b0', strokeWidth: w * 0.14, strokeLinecap: 'round' }) +
    rect(x, y + h * 0.55, w, h * 0.08, { fill: '#2a2140', opacity: 0.6 });
}

const drawTank: Draw = (x, y, w, h) => {
  // two tanks with a hose loop and mouthpiece
  const tw = w * 0.2;
  const tx = x + w * 0.5;
  return path(`M${tx + tw * 0.5} ${y + 10} C${x - 5} ${y - 4} ${x - 5} ${y + h} ${x + w * 0.3} ${y + h - 10} S${x + w} ${y + h} ${x + w - 4} ${y + h * 0.6}`, { stroke: '#1d1d2b', strokeWidth: 7, fill: 'none', strokeLinecap: 'round' }) +
    tank(tx, y + 6, tw, h * 0.82) + tank(tx + tw * 1.05, y + 6, tw, h * 0.82) +
    ellipse(x + w * 0.3, y + h - 10, 10, 7, { fill: '#9fb3c2', stroke: steelDark, strokeWidth: 2.5 });
};

const drawPot: Draw = (x, y, w, h) => {
  const iw = w * 0.76, ix = x + (w - iw) / 2;
  return rect(x + 2, y + h * 0.3, w * 0.16, h * 0.16, { rx: 4, fill: '#3e5566', stroke: '#1d2a33', strokeWidth: 2.5 }) +
    rect(x + w - 2 - w * 0.16, y + h * 0.3, w * 0.16, h * 0.16, { rx: 4, fill: '#3e5566', stroke: '#1d2a33', strokeWidth: 2.5 }) +
    path(`M${ix} ${y + 4} h${iw} v${h - 12} q0 6 -6 6 h${-iw + 12} q-6 0 -6 -6 z`, { fill: '#b8c6d0', stroke: '#3e5566', strokeWidth: 3.5 }) +
    rect(ix - 3, y + 2, iw + 6, h * 0.18, { rx: 3, fill: '#d6e0e7', stroke: '#3e5566', strokeWidth: 3 }) +
    path(`M${ix + iw * 0.15} ${y + h * 0.35} v${h * 0.4}`, { stroke: '#fff', strokeWidth: 4, strokeLinecap: 'round', opacity: 0.8 });
};

/** footwear in a box, ankle at (ax, ay) */
function shoe(kind: number, x: number, y: number, w: number, h: number, ax: number, toeLeft: boolean): string {
  const sole = y + h - 4;
  const toe = toeLeft ? x + 3 : x + w - 3, heel = toeLeft ? x + w - 3 : x + 3;
  const dir = toeLeft ? -1 : 1;
  if (kind === 0) {
    // Bongo boots / Pucki sneakers – "own" shoes
    const d = `M${heel} ${sole} V${y + h * 0.3} Q${heel} ${y + 4} ${ax} ${y + 4} Q${ax + dir * 14} ${y + 4} ${ax + dir * 16} ${y + h * 0.4} Q${toe} ${y + h * 0.42} ${toe} ${sole - 8} Q${toe} ${sole} ${toe - dir * 8} ${sole} Z`;
    return path(d, { fill: C.boot, stroke: C.bootDark, strokeWidth: SW, strokeLinejoin: 'round' }) +
      line(x + 4, sole - 6, x + w - 4, sole - 6, { stroke: C.bootDark, strokeWidth: 3 }) +
      path(`M${ax - 8} ${y + h * 0.35} h16 M${ax - 8} ${y + h * 0.5} h16`, { stroke: '#e8c690', strokeWidth: 3, strokeLinecap: 'round' });
  }
  if (kind === 1) {
    // striped socks
    const d = `M${ax - dir * 14} ${y + 3} h${dir * 28} V${sole - 18} Q${ax + dir * 14} ${sole} ${ax - dir * 6} ${sole} H${toe + dir * -10} Q${toe} ${sole} ${toe} ${sole - 10} Q${toe} ${sole - 22} ${toe - dir * 14} ${sole - 22} H${ax - dir * 14} Z`;
    const id = `sock${x}${y}`.replace(/[^a-z0-9]/gi, '');
    let st = '';
    for (let yy = y + 8; yy < sole; yy += 10) st += line(x, yy, x + w, yy, { stroke: '#fff', strokeWidth: 4.5 });
    return defs(`<clipPath id="${id}"><path d="${d}"/></clipPath>`) + path(d, { fill: C.red }) + g({ clipPath: `url(#${id})` }, st) + path(d, { fill: 'none', stroke: C.redDark, strokeWidth: 3.5, strokeLinejoin: 'round' });
  }
  if (kind === 2) {
    // flipper
    const d = `M${heel} ${sole - 4} Q${heel} ${y + 6} ${ax} ${y + 6} Q${ax - dir * 18} ${y + h * 0.4} ${toe} ${y + h * 0.35} L${toe} ${sole} Q${(toe + heel) / 2} ${sole + 2} ${heel} ${sole - 4} Z`;
    return path(d, { fill: '#3fbf5a', stroke: '#1d6b30', strokeWidth: 3.5, strokeLinejoin: 'round' }) +
      [0.25, 0.5].map((t) => path(`M${ax - dir * 18} ${y + h * 0.5} L${toe - dir * 4} ${y + h * (0.4 + t * 0.6)}`, { stroke: '#1d6b30', strokeWidth: 2.5, opacity: 0.6 })).join('') +
      ellipse(ax, y + 8, 12, 5, { fill: '#2a8a40', stroke: '#1d6b30', strokeWidth: 2.5 });
  }
  // wooden clog
  const d = `M${heel} ${sole} V${y + h * 0.35} Q${heel} ${y + 6} ${(heel + ax) / 2} ${y + 6} H${ax + dir * 8} Q${toe} ${y + h * 0.25} ${toe} ${sole - 6} Q${toe} ${sole} ${toe - dir * 6} ${sole} Z`;
  return path(d, { fill: '#e8b874', stroke: '#7a5020', strokeWidth: SW, strokeLinejoin: 'round' }) +
    ellipse(ax, y + 9, 11, 5, { fill: '#5a3a20' }) +
    path(`M${toe - dir * 12} ${y + h * 0.45} q${-dir * 6} 6 0 12`, { stroke: '#7a5020', strokeWidth: 2.5, fill: 'none' }) +
    path(`M${heel + dir * 6} ${y + h * 0.4} v${h * 0.3}`, { stroke: '#fff2d0', strokeWidth: 3, strokeLinecap: 'round', opacity: 0.8 });
}

function shoeMember(m: Member): string {
  const f = figOf(m), b = box(m);
  const kind = m.frame ?? 0;
  const cxBox = b.x + b.w / 2;
  // nearest leg
  const leg = f.legs.reduce((a, l) => (Math.abs(l[0] - cxBox) < Math.abs(a[0] - cxBox) ? l : a));
  let ax = Math.max(b.x + 18, Math.min(b.x + b.w - 18, leg[0]));
  const toeLeft = ax - b.x > b.x + b.w - ax;
  if (kind === 2) ax = toeLeft ? b.x + b.w - 22 : b.x + 22;
  // leg stub down to the shoe (covers the gap between body leg end and the box top)
  const stub = leg[2] < b.y + 8 ? rect(leg[0] - 7, leg[2], 14, b.y + 10 - leg[2], { rx: 4, fill: f === BINGO ? C.leg : f.dark }) : '';
  return atReg(m, stub + shoe(kind, b.x, b.y, b.w, b.h, ax, toeLeft));
}

// =================================================================== figure parts

function clipOutside(f: Fig, id: string, b: { x: number; y: number; w: number; h: number }, body: string): string {
  // draw `body` only where the figure is not (behind the figure)
  const outer = `M${b.x - 50} ${b.y - 50} h${b.w + 100} v${b.h + 100} h${-b.w - 100} z`;
  return defs(`<clipPath id="${id}"><path clip-rule="evenodd" d="${outer} ${f.body}"/></clipPath>`) + g({ clipPath: `url(#${id})` }, body);
}

function backMember(m: Member): string {
  const f = figOf(m), b = box(m), n = m.frame ?? 1;
  const id = `bk${m.num}`;
  if (n === 1) {
    // tanks behind the figure (top right), hose in front to a mouthpiece near the mouth
    const tw = 30, th = 120;
    const tx = b.x + b.w - 2 * tw - 14, ty = b.y + 2;
    const tanks = tank(tx, ty, tw, th) + tank(tx + tw + 4, ty + 6, tw, th);
    const [mx, my] = f.mouth;
    const mpx = mx - 48, mpy = my + 6;
    const hose = `M${tx + tw / 2} ${ty + 10} C${b.x - 20} ${b.y - 10} ${b.x - 10} ${my - 10} ${mpx} ${mpy}` +
      ` M${mpx + 14} ${mpy + 2} C${mx} ${b.y + b.h + 10} ${b.x + b.w + 10} ${b.y + b.h - 10} ${tx + tw * 1.5 + 4} ${ty + 16}`;
    return atReg(m, clipOutside(f, id, b, tanks) +
      path(hose, { stroke: '#1d1d2b', strokeWidth: 9, fill: 'none', strokeLinecap: 'round' }) +
      path(hose, { stroke: '#3a3a52', strokeWidth: 4, strokeDasharray: '4 6', fill: 'none' }) +
      ellipse(mpx + 6, mpy + 1, 13, 9, { fill: '#9fb3c2', stroke: steelDark, strokeWidth: 3 }));
  }
  if (n === 2) return atReg(m, clipOutside(f, id, b, drawBarrel(b.x - 30, b.y, b.w + 26, b.h, id)));
  return atReg(m, clipOutside(f, id, b, drawBottles(b.x, b.y, b.w - 2, b.h, id)));
}

function headMember(m: Member): string {
  const f = figOf(m), b = box(m), n = m.frame ?? 0;
  const id = `hd${m.num}`;
  switch (n) {
    case 0: {
      if (f === BINGO) {
        // bandana knot (top right)
        const kx = b.x + 22, ky = b.y + b.h - 18;
        return atReg(m, path(`M${kx} ${ky} l40 -22 l-4 18 l20 2 l-24 12 z`, { fill: C.bandana, stroke: C.bandanaDark, strokeWidth: SW, strokeLinejoin: 'round' }) +
          path(`M${kx} ${ky} l44 6 l-10 12 l-20 -8 z`, { fill: C.bandana, stroke: C.bandanaDark, strokeWidth: SW, strokeLinejoin: 'round' }) +
          circle(kx, ky, 11, { fill: C.bandana, stroke: C.bandanaDark, strokeWidth: SW }) + circle(kx + 30, ky - 12, 3, { fill: '#fff' }) + circle(kx + 28, ky + 6, 3, { fill: '#fff' }));
      }
      // Pucki curl
      const d = `M${b.x + b.w * 0.5} ${b.y + b.h - 2} q-6 -38 20 -44 q24 -2 22 20 q-2 14 -16 12 q-12 -2 -8 -12`;
      return atReg(m, path(d, { stroke: f.dark, strokeWidth: 16, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' }) +
        path(d, { stroke: f.fill, strokeWidth: 8, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' }));
    }
    case 1: return atReg(m, drawHat(b.x, b.y, b.w, b.h, id));
    case 2: return atReg(m, drawBeanie(b.x, b.y, b.w, b.h, id));
    case 3: return atReg(m, drawLadle(b.x, b.y, b.w, b.h, id));
    case 4: return atReg(m, drawPan(b.x, b.y, b.w, b.h, id));
    default: return atReg(m, drawPot(b.x, b.y, b.w, b.h, id));
  }
}

function noseMember(m: Member): string {
  const f = figOf(m), b = box(m);
  if (m.frame === 2) return atReg(m, plungerOn(f, b.x, b.y, b.w, b.h));
  const [nx, ny, , nry] = f.nose;
  return atReg(m, nose(f) + clothespinAt(nx + 4, ny + nry * 0.2, Math.min(b.h - 14, 90), 14));
}

function eyesMember(m: Member): string {
  const f = figOf(m), b = box(m);
  return atReg(m, m.frame === 2 ? drawMaskOn(f, b.x, b.y, b.w, b.h) : drawSunglassesOn(f, b.x, b.y, b.w, b.h));
}

// =================================================================== inventory items on the left

const ITEMS: Record<string, Draw> = {
  Brille: drawSunglasses,
  Fass: drawBarrel,
  Flaschen: drawBottles,
  Hut: drawHat,
  Kelle: drawLadle,
  Klammer: drawClothespin,
  Mütze: drawBeanie,
  Pfanne: drawPan,
  Punger: drawPlunger,
  Taucherbrille: drawMask,
  Taucherflasche: drawTank,
  Topf: drawPot,
  Flossen: (x, y, w, h) => shoe(2, x, y + h * 0.1, w * 0.62, h * 0.85, x + w * 0.62 - 22, true) + shoe(2, x + w * 0.36, y, w * 0.62, h * 0.85, x + w - 22, true),
  Holzschuh: (x, y, w, h) => shoe(3, x, y + h * 0.25, w * 0.55, h * 0.73, x + w * 0.4, true) + shoe(3, x + w * 0.42, y + 2, w * 0.55, h * 0.73, x + w * 0.82, true),
  Socken: (x, y, w, h) => shoe(1, x + 2, y + 2, w * 0.5, h - 4, x + w * 0.4, true) + shoe(1, x + w * 0.48, y + 2, w * 0.5, h - 4, x + w * 0.88, true),
};

function itemMember(key: string, m: Member, w: number, h: number): string {
  const hover = m.frame === 1;
  const pad = hover ? 1 : 3;
  const art = ITEMS[key](pad, pad, w - 2 * pad, h - 2 * pad, `it${m.num}`);
  // hover: soft yellow glow behind the item
  return hover ? g({ opacity: 0.55 }, `<filter id="gl${m.num}" x="-20%" y="-20%" width="140%" height="140%"><feMorphology operator="dilate" radius="3" in="SourceAlpha" result="d"/><feFlood flood-color="#ffd23f"/><feComposite in2="d" operator="in"/></filter>`, g({ filter: `url(#gl${m.num})` }, art)) + art : art;
}

// =================================================================== background / intro

function background(w: number, h: number): string {
  let s = defs(
    radGrad('tube', [[0, '#5d7a86'], [0.7, '#3a5260'], [1, '#22323c']], 0.62, 0.5, 0.75),
    linGrad('plate', [[0, '#a9bcc6'], [1, '#7f96a3']]),
  );
  s += rect(0, 0, w, h, { fill: 'url(#tube)' });
  // ribs of the tube
  for (let i = 0; i < 6; i++) {
    const rr = 360 + i * 70;
    s += ellipse(560, 210, rr, rr * 0.82, { fill: 'none', stroke: '#22323c', strokeWidth: 10, opacity: 0.35 });
    s += ellipse(560, 210, rr - 8, rr * 0.82 - 8, { fill: 'none', stroke: '#8fb0bf', strokeWidth: 3, opacity: 0.25 });
  }
  // floor grating at the bottom left (where the clothes lie)
  s += path('M0 448 V300 Q120 330 250 448 Z', { fill: '#2c3e48', opacity: 0.6 });
  // big round hatch
  s += ellipse(560, 210, 270, 240, { fill: '#2a3a44' });
  s += ellipse(560, 210, 255, 225, { fill: 'url(#plate)', stroke: '#3e5566', strokeWidth: 6 });
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    s += circle(560 + Math.cos(a) * 238, 210 + Math.sin(a) * 208, 5, { fill: '#cfdbe4', stroke: '#3e5566', strokeWidth: 2 });
  }
  s += ellipse(560, 210, 200, 175, { fill: 'none', stroke: '#6f8794', strokeWidth: 3, opacity: 0.6 });
  // water line through the glass?  -> drops/streaks
  s += path('M330 140 q8 40 0 90 M760 120 q-6 50 4 110', { stroke: '#d6e7ef', strokeWidth: 4, opacity: 0.25, fill: 'none', strokeLinecap: 'round' });
  // signs + lever
  const sign = (x: number, y: number, t: string, wd: number) => rect(x, y, wd, 34, { rx: 5, fill: '#fdf6e3', stroke: '#5a3a20', strokeWidth: 3 }) +
    circle(x + 7, y + 17, 2.5, { fill: '#5a3a20' }) + circle(x + wd - 7, y + 17, 2.5, { fill: '#5a3a20' }) +
    fitText(t, x + wd / 2, y + 25, wd - 22, 20, { fill: '#3a2410', anchor: 'middle' });
  s += sign(372, 8, 'offen', 70) + sign(560, 4, 'geschlossen', 140);
  s += path('M462 142 L548 6', { stroke: '#1d2a33', strokeWidth: 22, strokeLinecap: 'round' }) +
    path('M462 142 L548 6', { stroke: C.yellow, strokeWidth: 14, strokeLinecap: 'round' }) +
    path('M532 30 L556 -8', { stroke: C.red, strokeWidth: 16, strokeLinecap: 'round' }) +
    circle(462, 142, 17, { fill: '#9fb3c2', stroke: '#1d2a33', strokeWidth: 4 }) + circle(458, 138, 5, { fill: '#fff', opacity: 0.6 });
  // light from the left
  s += ellipse(70, 360, 120, 90, { fill: '#ffe9a8', opacity: 0.12 });
  return s;
}

function intro(w: number, h: number): string {
  let s = defs(woodPattern('ibrd', { base: '#a8743f', dark: '#7a5028', plank: 30, len: 220 }));
  s += rect(0, 0, w, h, { fill: 'url(#ibrd)' });
  // preview picture
  s += g({ transform: 'rotate(-1.5 190 112)' },
    rect(20, 8, 340, 206, { rx: 14, fill: '#fdf6e3', stroke: C.woodDeep, strokeWidth: 4 }),
    `<svg x="30" y="18" width="320" height="186" viewBox="0 0 800 448" preserveAspectRatio="xMidYMid slice">${background(800, 448)}<g transform="translate(300 245)">${bodyBingo()}</g>` +
    `<g transform="translate(300 245)">${drawBeanie(53, -222, 186, 174, 'ibn')}</g>` +
    `<g transform="translate(40 60)">${drawBarrel(0, 0, 70, 80, 'ib')}</g><g transform="translate(40 200)">${drawTank(0, 0, 126, 105, 'it')}</g></svg>`,
    rect(30, 18, 320, 186, { rx: 6, fill: 'none', stroke: C.woodDeep, strokeWidth: 3 }));
  // mouse
  s += g({ transform: 'translate(690 40)' },
    path('M0 -18 q0 -14 0 -26', { stroke: '#555', strokeWidth: 4, fill: 'none' }),
    rect(-50, -20, 100, 160, { rx: 50, fill: '#f2f2f2', stroke: '#555', strokeWidth: 4 }),
    line(0, -20, 0, 40, { stroke: '#555', strokeWidth: 3 }), line(-50, 40, 50, 40, { stroke: '#555', strokeWidth: 3 }),
    rect(-7, 0, 14, 26, { rx: 7, fill: '#888' }));
  s += fitText('Gespielt wird', 532, 34, 200, 26, { fill: C.yellow, anchor: 'middle' }) + fitText('mit der Maus!', 532, 64, 200, 26, { fill: C.yellow, anchor: 'middle' });
  // instructions
  const lines = [
    'Na, was braucht man wohl zum Tauchen?',
    'Klick die Sachen links an, dann zieht ihr sie an.',
    'Klickst du ein angezogenes Teil an, kommt es wieder weg.',
  ];
  lines.forEach((t, i) => (s += fitText(t, 400, 262 + i * 30, 720, 24, { fill: C.yellow, anchor: 'middle', stroke: '#3a2410', sw: 3 })));
  // slot bar
  s += rect(0, 357, w, 22, { fill: '#2a2140', opacity: 0.45 });
  s += fitText('Für dieses Spiel brauchst du diese Sachen – leg sie hier ab:', 400, 373, 640, 15, { fill: C.yellow, anchor: 'middle', font: 'body', weight: 700 });
  return s;
}

// =================================================================== movie

export default defineMovie({
  Headline: (m, w, h) => headline('Taucher anziehen', w, h),
  Intro: (m, w, h) => intro(w, h),
  Background: (m, w, h) => background(w, h),
  Bingo: (m) => atReg(m, bodyBingo()),
  Puck: (m) => atReg(m, bodyPuck()),
  'BingoMund-*': (m) => atReg(m, mouth(BINGO, m.frame ?? 1, true)),
  'PuckMund-*': (m) => atReg(m, mouth(PUCK, m.frame ?? 1, true)),
  'BingoBack-*': backMember, 'PuckBack-*': backMember,
  'BingoEyes-*': eyesMember, 'PuckEyes-*': eyesMember,
  'BingoHead-*': headMember, 'PuckHead-*': headMember,
  'BingoNose-*': noseMember, 'PuckNose-*': noseMember,
  'BingoShoeR-*': shoeMember, 'BingoShoeL-*': shoeMember, 'PuckShoeR-*': shoeMember, 'PuckShoeL-*': shoeMember,
  '#60': (m, w, h) => itemMember('Mütze', m, w, h),
  '#61': (m, w, h) => itemMember('Mütze', m, w, h),
  '*': (m, w, h) => (ITEMS[m.base] && m.base !== 'Mütze' ? itemMember(m.base, m, w, h) : null),
});
