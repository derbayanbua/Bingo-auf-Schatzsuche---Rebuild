// Inventory items OIxxx (Shared_Inventar, 70×70; OI006 joke card 35×38; coins 42×43/44).
// Each icon is drawn in a -32..32 design box (centre 0,0) and fitted into the member canvas.
// Meanings: src/ui/art.ts ITEM_NAMES. Duplicate meanings (keys, wood pieces, bottles, map pieces) get
// distinct shapes/colours so they can be told apart.

import { C, circle, dk, ellipse, g, line, path, poly, r2, rect, rng } from './svg';
import { coinIcon, jokeCardIcon, star } from './ui';

const O = C.ink;
const SW = 2.6;
const f = (fill: string, stroke = dk(fill, 0.45), sw = SW) => ({ fill, stroke, strokeWidth: sw, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const });
const s = (stroke: string, sw = SW) => ({ fill: 'none', stroke, strokeWidth: sw, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const });
const hi = (d: string, w = 3) => path(d, { fill: 'none', stroke: '#ffffff', strokeWidth: w, strokeLinecap: 'round', opacity: 0.6 });

function key(col: string, bow: 'round' | 'clover' | 'square', bit: number): string {
  const d = dk(col, 0.45);
  const head = bow === 'round' ? circle(-14, 0, 10, f(col, d)) + circle(-14, 0, 4, { fill: C.cream, stroke: d, strokeWidth: 2 })
    : bow === 'clover' ? [[-14, -7], [-21, 0], [-14, 7]].map(([x, y]) => circle(x, y, 6, f(col, d))).join('') + circle(-14, 0, 5, f(col, d))
      : rect(-24, -9, 18, 18, { rx: 4, ...f(col, d) }) + rect(-18, -3, 6, 6, { rx: 1, fill: C.cream, stroke: d, strokeWidth: 2 });
  // shaft to the right, teeth hanging down (drawn right → left)
  const teeth = bit === 1 ? 'h-2 v8 h-4 v-4 h-4 v6 h-4 v-10' : bit === 2 ? 'h-2 v6 h-3 v3 h-4 v-5 h-5 v7 h-2 v-11' : 'h-2 v10 h-6 v-6 h-4 v4 h-2 v-8';
  return g({ transform: 'rotate(-30)' }, path(`M-5 -3.5 H24 V3.5 ${teeth} H-5 Z`, f(col, d)), head, hi('M-2 -1.5 h20', 1.6));
}

function bottle(col: string, o: { note?: boolean; cork?: boolean; label?: string; tilt?: number } = {}): string {
  const d = dk(col, 0.5);
  return g({ transform: `rotate(${o.tilt ?? -20})` },
    path('M-6 -30 h12 v10 q12 6 12 18 v28 q0 6 -6 6 h-24 q-6 0 -6 -6 v-28 q0 -12 12 -18 z', { ...f(col, d), fillOpacity: 0.92 }),
    o.cork ? rect(-5, -34, 10, 8, { rx: 2, ...f('#c48a4a') }) : '',
    o.note ? rect(-8, -6, 16, 22, { rx: 2, ...f('#fff3c8', '#a0782a', 2) }) + path('M-5 0 h10 M-5 5 h10 M-5 10 h7', s('#a0782a', 1.4)) : '',
    o.label ? rect(-12, 0, 24, 14, { rx: 3, fill: o.label, stroke: d, strokeWidth: 1.8 }) : '',
    hi('M-12 -4 v20', 3));
}

function jar(col: string, lid = '#c8ccd6'): string {
  return path('M-15 -16 h30 q4 0 4 6 v30 q0 10 -10 10 h-18 q-10 0 -10 -10 v-30 q0 -6 4 -6 z', { ...f(col), fillOpacity: 0.95 }) +
    rect(-17, -24, 34, 9, { rx: 3, ...f(lid) }) + rect(-11, -2, 22, 14, { rx: 3, fill: '#fff8e0', stroke: dk(col, 0.4), strokeWidth: 1.6 }) + hi('M-10 -10 v26');
}

function bucket(col: string, o: { water?: boolean; dented?: boolean } = {}): string {
  const body = o.dented ? 'M-22 -14 h44 l-4 20 l-4 2 l-1 14 h-27 l-3 -10 l3 -6 z' : 'M-22 -14 h44 l-6 36 h-32 z';
  return path('M-20 -14 q20 -30 40 0', s(dk(col, 0.5), 3)) + path(body, f(col)) + ellipse(0, -14, 22, 6, f(o.water ? C.waterLight : dk(col, 0.25))) +
    (o.water ? path('M-12 -15 q6 -3 12 0 t12 0', s(C.white, 1.8)) : '') + path('M-18 0 h36', s(dk(col, 0.35), 2)) + hi('M-14 -6 l3 22');
}

function woodPiece(variant: number): string {
  const R = rng(variant * 13);
  const shapes = ['M-28 -8 h50 l6 8 l-6 8 h-50 z', 'M-24 -12 l40 -4 l10 10 l-8 14 l-40 4 z', 'M-20 -16 l30 2 l12 20 l-30 10 l-14 -8 z', 'M-30 -4 h60 v8 h-60 z'];
  const d = shapes[variant % shapes.length];
  let grain = '';
  for (let i = 0; i < 3; i++) grain += path(`M${r2(-18 + R() * 6)} ${r2(-6 + i * 5)} q${r2(12 + R() * 8)} ${r2(R() * 3 - 1.5)} ${r2(28 + R() * 6)} 0`, s(C.woodDark, 1.4));
  return g({ transform: `rotate(${variant === 3 ? -40 : -15})` }, path(d, f('#c98a4a', C.woodDark)), grain);
}

function mapPiece(n: number): string {
  const R = rng(500 + n);
  const pts: [number, number][] = [];
  const k = 7 + (n % 3);
  for (let i = 0; i < k; i++) {
    const a = (i / k) * Math.PI * 2 + R() * 0.4;
    const rr = 20 + R() * 9;
    pts.push([Math.cos(a) * rr, Math.sin(a) * rr]);
  }
  const lines = path(`M${r2(-14 + R() * 6)} ${r2(-10 + R() * 6)} q${r2(10 + R() * 6)} ${r2(8)} ${r2(18)} ${r2(2 + R() * 8)}`, { ...s('#a0322a', 2), strokeDasharray: '3 3' });
  const mark = n === 7 ? path('M2 -2 l6 6 M8 -2 l-6 6', s(C.red, 2.6)) : circle(R() * 10 - 5, R() * 10 - 5, 2.5, { fill: '#5fb85a' });
  return poly(pts, f('#f3e2b0', '#a0782a', 2.2)) + lines + mark + path('M-6 12 q4 -3 9 0', s('#2f8fd8', 2));
}

const ICONS: Record<string, () => string> = {
  OI001: () => path('M-8 -26 h16 v6 q14 8 14 26 q0 22 -22 22 q-22 0 -22 -22 q0 -18 14 -26 z', f(C.blue, C.blueDark)) + path('M-17 4 q17 8 34 0', s(C.yellow, 3.5)) + hi('M-10 -8 q-6 10 -4 20'),
  // admission ticket for the villa party (Eintrittskarte; the butler in AS009-01 wants it)
  OI002: () => g({ transform: 'rotate(-35)' }, path('M-28 -13 h56 v8 a4 4 0 0 0 0 8 v10 h-56 v-10 a4 4 0 0 0 0 -8 z', f('#cfe8ff', '#2f6fd8')), path('M14 -13 v26', { ...s('#2f6fd8', 1.6), strokeDasharray: '2 2' }), `<text x="-7" y="0" font-family="'Baloo 2'" font-weight="800" font-size="8.5" fill="#1d4fa0" text-anchor="middle" dominant-baseline="central">EINTRITT</text>`, star(21, 0, 4.5, '#ffd23f', '#b58a00', 1.2)),
  OI003: () => ellipse(0, 4, 30, 14, f(C.white, '#8a93a6')) + ellipse(0, 2, 19, 8, { fill: '#e9eef6', stroke: '#b9c2d2', strokeWidth: 1.6 }) + path('M-26 2 q26 10 52 0', s(C.blue, 2)),
  OI004: () => path('M-14 2 h28 l-4 24 h-20 z', f(C.roof, C.roofDark)) + rect(-16, -2, 32, 7, { rx: 2, ...f('#c4533a') }) + path('M0 -2 v-14 M-8 -2 l-4 -10 M8 -2 l5 -10', s(C.grassDark, 2.6)) +
    [[0, -20, C.red], [-12, -14, C.yellow], [12, -14, '#e88fb4']].map(([x, y, c]) => circle(x as number, y as number, 6, f(c as string)) + circle(x as number, y as number, 2.2, { fill: C.yellow })).join(''),
  OI005: () => g({ transform: 'rotate(-35)' }, rect(-24, -6, 48, 12, { rx: 5, ...f('#bfe8c9', '#3f8f5a') }), path('M18 -6 v12', s('#3f8f5a', 2)), hi('M-18 -2.5 h30', 2)),
  OI006: () => jokeCardIcon(0, 0, 40, 52),
  OI007: () => coinIcon(0, 0, 28),
  OI008: () => path('M-14 -20 h26 l2 40 q0 6 -6 6 h-18 q-6 0 -6 -6 z', f('#b9773a', C.woodDeep)) + path('M14 -10 q14 0 12 14 q-2 10 -12 8', s(C.woodDeep, 6)) + path('M14 -10 q14 0 12 14 q-2 10 -12 8', s('#b9773a', 2.5)) + ellipse(-1, -20, 13, 4, f(C.woodDark, C.woodDeep, 2)) + path('M-12 -6 h24 M-12 10 h24', s(C.woodDark, 2)),
  OI009: () => key('#3a3a46', 'square', 1),
  OI010: () => woodPiece(3),
  OI012: () => path('M8 -28 v24 q0 18 -14 18 q-12 0 -12 -12', s('#7a808c', 7)) + path('M8 -28 v24 q0 18 -14 18 q-12 0 -12 -12', s('#c8ccd6', 3)) + path('M-18 2 l-4 -6 l8 2', f('#c8ccd6', '#7a808c', 2)) + circle(8, -28, 5, f('#c8ccd6', '#7a808c', 2.2)),
  OI013: () => bottle('#3fae6a', { cork: true, label: '#fff3c8' }),
  OI014: () => g({ transform: 'rotate(-20)' }, rect(-28, -11, 56, 22, { rx: 5, ...f('#7a3e12', '#3a1a05') }), rect(-14, -13, 28, 26, { rx: 2, ...f(C.red, C.redDark) }), `<text x="0" y="1" font-family="'Baloo 2'" font-weight="800" font-size="10" fill="#fff" text-anchor="middle" dominant-baseline="central">POWER</text>`),
  OI015: () => rect(-26, -20, 52, 40, { rx: 4, ...f('none', '#4d5560', 4) }) + [-16, -6, 4, 14].map((x) => line(x, -20, x + 4, 20, s('#7a808c', 4))).join('') + line(-26, 0, 26, 0, s('#7a808c', 4)) + rect(-26, -20, 52, 40, { rx: 4, fill: 'none', stroke: '#4d5560', strokeWidth: 3 }),
  OI016: () => g({ transform: 'rotate(-40)' }, rect(-30, -4, 60, 8, { rx: 4, ...f('#9aa4ad', '#4d5560') }), hi('M-26 -1.5 h50', 1.6)),
  OI017: () => g({ transform: 'rotate(-40)' }, rect(-20, -4.5, 38, 9, { rx: 4, ...f('#aab3bd', '#4d5560') }), path('M16 -12 a12 12 0 1 1 0 24 l-2 -7 a5 5 0 1 0 0 -10 z', f('#aab3bd', '#4d5560')), path('M-26 -9 a10 10 0 1 0 0 18 l3 -5 a4 4 0 1 1 0 -8 z', f('#aab3bd', '#4d5560'))),
  OI018: () => path('M-24 8 q0 -26 24 -26 q24 0 24 26 z', f('#2f6fd8', C.blueDark)) + path('M-24 8 h40 q12 0 14 6 h-54 z', f('#1d4fa0', C.blueDark)) + circle(0, -18, 5, f(C.red)) + path('M-14 -4 q14 -8 28 0', s(C.white, 2.4)),
  OI021: () => rect(-26, -12, 52, 24, { rx: 12, ...f('#35b0c9', '#1d6f82') }) + ellipse(-11, 0, 9, 8, f(C.glass, '#1d6f82', 2)) + ellipse(11, 0, 9, 8, f(C.glass, '#1d6f82', 2)) + path('M-26 0 q-6 -14 6 -18 M26 0 q6 -14 -6 -18', s('#1d6f82', 3)) + hi('M-15 -3 l3 -2 M7 -3 l3 -2', 2),
  OI022: () => [-11, 11].map((x) => rect(x - 9, -18, 18, 44, { rx: 8, ...f(x < 0 ? '#e8483f' : '#f2f2f6', x < 0 ? C.redDark : '#7a7f8c') }) + rect(x - 3, -26, 6, 9, { rx: 2, ...f('#9aa4ad', '#4d5560', 2) }) + hi(`M${x - 4} -10 v26`)).join('') + rect(-22, 4, 44, 6, { rx: 2, ...f('#4d5560', '#2a2c33', 1.6) }),
  OI023: () => g({ transform: 'rotate(-30)' }, path('M-28 -4 l26 -2 l6 4 l-6 4 l-26 -2 z', f('#3fae6a', C.greenDark)), path('M-28 4 l26 2 l6 -4', f('#3fae6a', C.greenDark)), path('M4 -2 l22 -8 l2 4 l-20 8 z M4 2 l22 8 l2 -4 l-20 -8 z', f('#9aa4ad', '#4d5560', 2)), circle(2, 0, 3.5, f('#c8ccd6', '#4d5560', 2))),
  OI025: () => path('M0 26 q-30 -8 -26 -32 q10 -20 26 -20 q16 0 26 20 q4 24 -26 32 z', f('#f6c6b8', '#c07a68')) + path('M0 24 v-40 M0 24 l-14 -36 M0 24 l14 -36 M0 24 l-22 -24 M0 24 l22 -24', s('#c07a68', 2)) + rect(-8, 22, 16, 6, { rx: 2, ...f('#f6c6b8', '#c07a68', 2) }),
  OI026: () => key('#c9cdd6', 'round', 2),
  OI027: () => rect(-24, -14, 48, 28, { rx: 3, ...f('#f4c542', C.goldDark) }) + rect(-24, -14, 48, 8, { fill: '#e8483f', stroke: C.goldDark, strokeWidth: 2 }) + path('M-6 2 l6 8 l6 -8 z', f('#e8483f', C.redDark, 1.8)) + g({ transform: 'rotate(-20 18 -10)' }, line(10, -10, 30, -10, s('#e8d4a8', 3)), circle(30, -10, 3.2, f(C.red, C.redDark, 1.5))),
  OI028: () => path('M-24 10 q-6 -18 8 -26 q14 -10 28 -2 q16 8 12 24 q-4 14 -24 14 q-20 0 -24 -10 z', f(C.stone, C.stoneDark)) + path('M-12 -8 q6 -4 14 -2', s(C.stoneLight, 3)) + circle(8, 8, 2, { fill: C.stoneDark }) + circle(-6, 10, 1.6, { fill: C.stoneDark }),
  OI032: () => bottle('#7fc8a8', { note: true, cork: true }),
  OI034: () => g({ transform: 'rotate(-40)' }, path('M-4 -4 h30 q4 0 -2 6 l-6 2 h-22 z', f('#dfe3ea', '#7a808c')), rect(-28, -5, 24, 10, { rx: 4, ...f('#8a5428', C.woodDeep) }), circle(-20, 0, 1.6, { fill: C.cream }), circle(-12, 0, 1.6, { fill: C.cream })),
  OI035: () => path('M-26 -14 q10 -8 22 0 q12 -10 24 -2 q6 10 -2 18 q4 12 -8 18 q-12 4 -20 -4 q-14 4 -18 -8 q-6 -12 2 -22 z', f('#c9d8e8', '#6a7f96')) + path('M-16 -4 q10 6 26 -2 M-12 8 q10 4 20 -2', s('#8aa0b8', 2)) + circle(6, -6, 3, { fill: '#8a7a5a', opacity: 0.6 }),
  OI036: () => rect(-4, 2, 8, 26, { rx: 2, ...f('#8a5428', C.woodDeep) }) + path('M0 4 q-16 -10 -8 -24 q2 8 6 4 q-2 -10 6 -14 q-2 10 6 14 q8 10 -10 20 z', f('#ff9a3c', '#c0392b')) + path('M0 2 q-6 -6 -2 -14 q2 4 4 2 q4 6 -2 12 z', { fill: C.yellow }),
  OI037: () => g({ transform: 'rotate(25)' }, rect(-4, 8, 8, 22, { rx: 3, ...f('#c0392b', C.redDark) }), circle(0, -8, 18, f('#f4c542', C.goldDark)), circle(0, -8, 13, f(C.glass, '#6a8fa8', 2)), hi('M-6 -14 q4 -4 9 -3', 2.4)),
  OI038: () => path('M-20 -26 h32 l10 10 v42 h-42 z', f('#fffaf0', '#a0782a')) + path('M12 -26 v10 h10', s('#a0782a', 2)) + `<text x="-14" y="-15" font-family="'Baloo 2'" font-weight="800" font-size="8" fill="#a0322a" dominant-baseline="central">Rezept</text>` + path('M-14 -4 h24 M-14 4 h24 M-14 12 h18', s('#8a8a8a', 1.6)) + circle(8, 18, 4, { fill: '#e8483f', opacity: 0.7 }),
  OI039: () => bottle('#8fcfe0', { note: true, cork: true, tilt: 25 }),
  OI040: () => path('M-28 -20 l18 6 l18 -6 l18 6 v38 l-18 -6 l-18 6 l-18 -6 z', f('#f3e2b0', '#a0782a')) + path('M-10 -14 v38 M8 -20 v38', s('#d9c08a', 1.6)) + path('M-22 8 q8 -14 18 -6 t16 -4', { ...s('#a0322a', 2.2), strokeDasharray: '3 3' }) + path('M14 -10 l6 6 M20 -10 l-6 6', s(C.red, 3)) + path('M-20 -8 q4 -4 8 0', s('#2f8fd8', 2)),
  OI041: () => jar('#e8483f'),
  OI042: () => jar('#2f6fd8'),
  OI043: () => jar('#e88fb4'),
  OI045: () => path('M-12 -14 h24 v30 q0 8 -8 8 h-8 q-8 0 -8 -8 z', { ...f('#eef3f8', '#7a8a9c'), fillOpacity: 0.95 }) + path('M-12 -14 q0 -14 12 -14 q12 0 12 14 z', f('#c8ccd6', '#4d5560')) + [-5, 0, 5].map((x) => circle(x, -20, 1.4, { fill: '#4d5560' })).join('') + rect(-8, 0, 16, 14, { rx: 2, fill: C.white, opacity: 0.8 }),
  OI049: () => woodPiece(0),
  OI050: () => woodPiece(1),
  OI051: () => woodPiece(2),
  OI052: () => g({ transform: 'rotate(-35)' }, rect(-30, -3, 34, 6, { rx: 3, ...f('#b9773a', C.woodDeep) }), path('M2 -10 h16 q10 0 10 10 q0 10 -10 10 h-16 z', f('#9aa4ad', '#4d5560'))),
  OI054: () => g({ transform: 'rotate(-45)' }, rect(-26, -2.5, 46, 5, { ...f('#b9c0c8', '#4d5560', 2) }), rect(-30, -7, 6, 14, { rx: 2, ...f('#b9c0c8', '#4d5560', 2) }), path('M20 -2.5 l8 2.5 l-8 2.5 z', f('#b9c0c8', '#4d5560', 2))),
  OI055: () => rect(-22, -8, 44, 30, { rx: 4, ...f(C.red, C.redDark) }) + rect(-4, -26, 8, 20, { rx: 2, ...f('#4d5560', '#2a2c33') }) + rect(-16, -30, 32, 7, { rx: 3, ...f('#4d5560', '#2a2c33') }) + path('M-10 4 l10 8 l10 -8', s(C.yellow, 3)) + path('M22 10 q10 0 8 14', s('#2a2c33', 2.4)),
  OI056: () => mapPiece(1), OI057: () => mapPiece(2), OI058: () => mapPiece(3), OI059: () => mapPiece(4), OI060: () => mapPiece(5), OI061: () => mapPiece(6), OI062: () => mapPiece(7),
  OI063: () => bucket('#9aa8b8'),
  OI064: () => rect(-26, -16, 52, 32, { rx: 3, ...f('#fffaf0', '#a0782a') }) + path('M-26 -16 l26 18 l26 -18', s('#a0782a', 2.2)) + circle(0, 4, 5, f(C.red, C.redDark, 1.6)),
  OI065: () => g({ transform: 'rotate(-12)' }, path('M-28 -14 h56 v8 a4 4 0 0 0 0 8 v12 h-56 v-12 a4 4 0 0 0 0 -8 z', f('#ffd9e6', '#c0396b')), path('M10 -14 v28', { ...s('#c0396b', 1.6), strokeDasharray: '2 2' }), `<text x="-9" y="0" font-family="'Baloo 2'" font-weight="800" font-size="9" fill="#c0396b" text-anchor="middle" dominant-baseline="central">TICKET</text>`, path('M16 -4 l3 6 l-6 -4 h7 l-6 4 z', { fill: '#c0396b' })),
  OI066: () => g({ transform: 'rotate(-20)' }, ...[-12, 0, 12].map((x) => rect(x - 6, -18, 12, 36, { rx: 4, ...f(C.red, C.redDark) })), rect(-20, -4, 40, 7, { fill: '#2a2c33' }), path('M0 -18 q6 -10 14 -8', s('#4d5560', 2.4)), circle(15, -26, 3, { fill: C.yellow })),
  OI068: () => key('#d4a93a', 'clover', 3),
  OI069: () => key('#b87333', 'round', 1),
  OI070: () => key('#8fa3b5', 'clover', 2),
  OI071: () => bucket('#9aa8b8', { water: true }),
  OI073: () => g({ transform: 'rotate(-30)' }, rect(-4, -30, 6, 46, { rx: 3, ...f('#b9773a', C.woodDeep) }), rect(-18, 14, 34, 6, { rx: 2, ...f('#9aa4ad', '#4d5560') }), ...[-15, -8, -1, 6, 13].map((x) => rect(x - 1.5, 19, 3, 9, { fill: '#9aa4ad', stroke: '#4d5560', strokeWidth: 1.4 }))),
  OI074: () => bucket('#9aa8b8', { dented: true }),
  OI075: () => bottle('#b4e0c8', { tilt: 10 }),
  OI076: () => jar('#c0392b', '#e0c070'),
  OI077: () => g({ transform: 'rotate(-35)' }, rect(-32, -3, 40, 6, { rx: 3, ...f('#b9773a', C.woodDeep) }), rect(-36, -6, 8, 12, { rx: 3, ...f('#b9773a', C.woodDeep) }), path('M6 -12 h14 q12 0 12 12 q0 12 -12 12 h-14 z', f('#aab3bd', '#4d5560'))),
  OI078: () => rect(-4, 4, 8, 26, { rx: 3, ...f('#aab3bd', '#4d5560') }) + path('M-18 6 q0 -24 18 -24 q18 0 18 24 z', f('#c8ccd6', '#4d5560')) + [-10, -4, 2, 8].map((x) => circle(x + 1, 2, 1.6, { fill: '#4d5560' })).join('') + path('M-10 10 l-4 10 M0 10 v10 M10 10 l4 10', { ...s(C.waterLight, 2.2), strokeDasharray: '3 3' }),
  OI079: () => path('M-26 14 l52 -30 v26 l-52 16 z', f('#ffd23f', '#b58a00')) + path('M-26 14 v12 l52 -16 v-26', f('#f4c542', '#b58a00')) + [[-8, 12, 3.5], [8, 2, 3], [16, 12, 2.5], [-16, 22, 2.5]].map(([x, y, r]) => ellipse(x, y, r, r * 0.8, { fill: '#e0b020' })).join(''),
  OI080: () => g({ transform: 'rotate(-15)' }, path('M-20 0 h40', s('#d9dde4', 3.5)), ...[-12, -4, 4, 12].map((x) => path(`M${x} -12 q2 12 0 24`, s('#d9dde4', 2.4))), path('M-30 -9 q-4 9 0 18 l10 -9 z', f('#d9dde4', '#8a93a6', 2)), path('M20 0 q6 -8 10 -6 q2 6 -2 10 q-4 4 -8 -4 z', f('#d9dde4', '#8a93a6', 2)), circle(25, -1, 1.6, { fill: O })),
  OI081: () => coinIcon(0, 0, 28, '5'),
  OI082: () => coinIcon(0, 0, 28, '10'),
  OI083: () => coinIcon(0, 0, 28, '20'),
};

/** item art fitted into w×h (null if the id is unknown) */
export function itemArt(id: string, w: number, h: number): string | null {
  if (id === 'OI000') return '<g/>'; // empty slot: transparent on purpose
  const fn = ICONS[id];
  if (!fn) return null;
  const k = Math.min(w, h) / 68;
  return g({ transform: `translate(${w / 2} ${h / 2}) scale(${r2(k)})` }, fn());
}

/** raw item drawing in its -32..32 design box (centre 0,0) – for bigger in-scene versions */
export function itemShape(id: string): string {
  return ICONS[id]?.() ?? '';
}

export const ITEM_IDS = Object.keys(ICONS);
