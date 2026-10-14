// AS004-02 "In der Hafenkneipe" (harbour pub inside) with Mats, Arno, Bert, Käpt'n Reling, Tom and Alfons.
// All NPC part members are opaque crops of one scene painting (`world(state)`), like the original part bitmaps:
// MagnusHandRechts 20,284 · MagnusHandLinks 129,298 · MagnusAugen 55,263 · ArnoldArmRechts 78,162 · ArnoldLid 146,169 ·
// ArnoldMund 154,209 · BenHandRechts 269,193 · BenHandLinks 329,202 · BenLid 317,162 · ReelingArmLinks 361,233 ·
// ReelingAuge 437,212 · ReelingHandLinks 462,216 · ReelingMund 419,241 · TimHandRechts 207,322 · TimBeinLinks 252,370 ·
// AlfredArmRechts 553,169 · AlfredHandRechts 604,237 · AlfredAugen 599,180 · AlfredMund 603,222.
// Ventilator 217,0 259x108 (ceiling fan, 10-frame loop) · Key-1 648,279 / Key-2 630,277 (items on the key board) ·
// Musicbox hotspot 233,196 83x78.
import { defineMovie, Member } from '../lib/api';
import { itemShape } from '../lib/items';
import { RigEyes, npcRig, rigAtEye, rigMouthDy } from '../lib/npcrig';
import { inScene } from '../lib/stageloc';
import { C, circle, defs, dk, ellipse, g, line, linGrad, lt, path, r2, rect } from '../lib/svg';
import { boardsPattern, woodPattern } from '../lib/textures';
import { headline } from '../lib/ui';

type St = Record<string, number>;
const tt = (f: number | undefined, n: number) => ((f ?? 1) - 1) / (n - 1);
const LOOK: RigEyes[] = ['open', 'right', 'up', 'left'];

function room(): string {
  let s = defs(
    woodPattern('wall', { base: '#a8743f', dark: '#7a5028', plank: 30, vertical: true, seed: 3 }),
    boardsPattern('floor', { base: '#b98a55', dark: '#7a5432', w: 34 }),
    linGrad('lamp', [[0, '#fff1b0', 0.7], [1, '#fff1b0', 0]]),
    woodPattern('bar', { base: '#8a5428', dark: '#5a3418', plank: 22, seed: 8 }),
  );
  s += rect(0, 0, 800, 448, { fill: 'url(#wall)' });
  // ceiling beam + fishing net
  s += rect(0, 0, 800, 26, { fill: '#6b4422', stroke: '#3e2610', strokeWidth: 3 });
  let net = '';
  for (let i = 0; i <= 16; i++) net += `M${i * 50} 24 Q${i * 50 + 25} ${70 + (i % 3) * 10} ${i * 50 + 50} 24 `;
  for (let i = 0; i < 16; i++) net += `M${i * 50 + 10} 30 L${i * 50 + 40} 70 M${i * 50 + 40} 30 L${i * 50 + 10} 70 `;
  s += path(net, { fill: 'none', stroke: '#e8dcc0', strokeWidth: 2, opacity: 0.7 });
  // floor (back wall foot at y 262)
  s += rect(0, 262, 800, 186, { fill: 'url(#floor)' });
  s += rect(0, 256, 800, 10, { fill: '#5a3418' });
  // life ring
  s += circle(250, 148, 32, { fill: C.white, stroke: '#8a8a8a', strokeWidth: 3 }) + circle(250, 148, 15, { fill: 'url(#wall)', stroke: '#8a8a8a', strokeWidth: 3 }) +
    [0, 1, 2, 3].map((i) => path(`M${250 + 15 * Math.cos(i * Math.PI / 2 + 0.4)} ${148 + 15 * Math.sin(i * Math.PI / 2 + 0.4)} L${250 + 32 * Math.cos(i * Math.PI / 2 + 0.4)} ${148 + 32 * Math.sin(i * Math.PI / 2 + 0.4)} A32 32 0 0 1 ${250 + 32 * Math.cos(i * Math.PI / 2 + 0.95)} ${148 + 32 * Math.sin(i * Math.PI / 2 + 0.95)} L${250 + 15 * Math.cos(i * Math.PI / 2 + 0.95)} ${148 + 15 * Math.sin(i * Math.PI / 2 + 0.95)} Z`, { fill: C.red })).join('') +
    circle(250, 148, 32, { fill: 'none', stroke: '#8a8a8a', strokeWidth: 3 });
  // window with a harbour view on the left
  s += rect(30, 70, 120, 110, { rx: 8, fill: '#7fc8f5', stroke: '#5a3418', strokeWidth: 8 }) + rect(34, 140, 112, 36, { fill: C.water }) +
    path('M60 140 l18 -30 l4 30 z', { fill: C.white }) + path('M90 80 v96 M34 125 h112', { stroke: '#5a3418', strokeWidth: 5 });
  // stuffed swordfish trophy on the board above the bar
  s += path('M500 118 q50 -30 120 -6 l40 -16 l-6 22 l8 20 l-40 -14 q-60 22 -122 -6 l-50 -6 z', { fill: '#5d8fb8', stroke: '#24496a', strokeWidth: 4, strokeLinejoin: 'round' }) +
    circle(522, 112, 3.5, { fill: C.ink }) + path('M560 100 l12 -16 l10 18', { fill: '#5d8fb8', stroke: '#24496a', strokeWidth: 3 });
  // back shelf with bottles + glasses behind the bar
  s += rect(500, 150, 230, 10, { rx: 3, fill: '#6b4422', stroke: '#3e2610', strokeWidth: 3 });
  const bot = ['#3f9a4a', '#a83a2a', '#e0b030', '#4a6ab8', '#3f9a4a', '#8a3aa0'];
  for (let i = 0; i < 6; i++) { const x = 516 + i * 34; if (x > 560 && x < 668) continue; s += rect(x, 116, 14, 34, { rx: 5, fill: bot[i], stroke: dk(bot[i], 0.5), strokeWidth: 2.5 }) + rect(x + 4, 104, 6, 14, { rx: 2, fill: bot[i], stroke: dk(bot[i], 0.5), strokeWidth: 2 }); }
  s += rect(690, 200, 100, 8, { rx: 3, fill: '#6b4422' });
  // pendant lamp
  s += line(700, 26, 700, 60, { stroke: '#2a2a2a', strokeWidth: 3 }) + path('M680 74 q20 -24 40 0 z', { fill: C.yellow, stroke: C.yellowDark, strokeWidth: 3 }) +
    path('M680 74 L640 200 H760 L720 74 Z', { fill: 'url(#lamp)', opacity: 0.5 });
  return s;
}

function bar(): string {
  let s = '';
  // counter (Alfons stands behind it)
  s += rect(478, 244, 222, 14, { rx: 4, fill: '#a86a32', stroke: '#4a2a10', strokeWidth: 4 });
  s += rect(486, 256, 206, 134, { fill: 'url(#bar)', stroke: '#4a2a10', strokeWidth: 4 });
  s += path('M486 300 H692 M486 344 H692', { stroke: '#4a2a10', strokeWidth: 3, opacity: 0.6 });
  // key board on the front of the counter (keys are separate items)
  s += rect(612, 268, 70, 24, { rx: 4, fill: '#d9a35a', stroke: '#6b4422', strokeWidth: 3 }) + [624, 640, 656, 670].map((x) => circle(x, 280, 3, { fill: '#555' })).join('');
  // bar stool
  s += ellipse(500, 300, 26, 7, { fill: '#2f8f7a', stroke: '#1b5a4a', strokeWidth: 3 }) + path('M484 304 L478 380 M516 304 L522 380 M490 350 H510', { stroke: '#6b4422', strokeWidth: 6, strokeLinecap: 'round' });
  return s;
}

function jukebox(): string {
  return g({},
    path('M236 274 V226 Q236 196 274 196 Q312 196 312 226 V274 Z', { fill: '#e85aa0', stroke: '#8a1f5a', strokeWidth: 4 }),
    path('M246 230 Q246 208 274 208 Q302 208 302 230 V240 H246 Z', { fill: '#ffe58a', stroke: '#8a6d00', strokeWidth: 3 }),
    ...[0, 1, 2, 3].map((i) => rect(248 + i * 13, 214 + 0, 3, 24, { fill: '#e8a020', opacity: 0.7 })),
    rect(246, 246, 56, 18, { rx: 4, fill: '#ffd23f', stroke: '#8a6d00', strokeWidth: 2.5 }),
    ...[0, 1, 2, 3, 4].map((i) => circle(253 + i * 10.5, 255, 3, { fill: i % 2 ? C.red : C.blue })),
    rect(240, 266, 68, 10, { rx: 3, fill: '#8a1f5a' }));
}

function frontTable(): string {
  return g({},
    path('M-10 338 H246 L254 352 H-10 Z', { fill: '#b8783e', stroke: '#4a2a10', strokeWidth: 4, strokeLinejoin: 'round' }),
    rect(-10, 352, 262, 16, { fill: '#8a5428', stroke: '#4a2a10', strokeWidth: 3 }),
    rect(20, 366, 18, 90, { fill: '#6b3a18', stroke: '#4a2a10', strokeWidth: 3 }), rect(212, 366, 18, 90, { fill: '#6b3a18', stroke: '#4a2a10', strokeWidth: 3 }),
    // mug of cocoa + plate
    ellipse(110, 342, 30, 6, { fill: C.white, stroke: '#8a93a6', strokeWidth: 2.5 }),
    rect(190, 318, 22, 26, { rx: 4, fill: '#f0e6d0', stroke: '#8a7a50', strokeWidth: 2.5 }), path('M212 324 q10 0 10 8 q0 8 -10 8', { fill: 'none', stroke: '#8a7a50', strokeWidth: 3 }));
}

function benTable(): string {
  return g({},
    ellipse(352, 230, 34, 8, { fill: '#b8783e', stroke: '#4a2a10', strokeWidth: 3.5 }),
    rect(346, 236, 12, 40, { fill: '#6b3a18', stroke: '#4a2a10', strokeWidth: 2.5 }),
    path('M330 276 H374', { stroke: '#4a2a10', strokeWidth: 6, strokeLinecap: 'round' }),
    // the table cloth hides Bert's legs
    path('M318 232 Q352 244 386 232 L392 268 Q352 280 312 268 Z', { fill: '#e8dcc0', stroke: '#8a7a50', strokeWidth: 3, strokeLinejoin: 'round' }),
    path('M318 246 Q352 258 388 246', { fill: 'none', stroke: C.red, strokeWidth: 3, strokeDasharray: '6 5' }));
}

function world(st: St = {}): string {
  let s = room();
  // ---- Alfons behind the bar
  {
    const k = 0.8; const [x, y] = rigAtEye('Alfred', [614, 189.5], k);
    const a = tt(st.AlfredArmRechts, 6), b = tt(st.AlfredHandRechts, 6);
    s += npcRig('Alfred', x, y, k, {
      mouth: [1, 2, 3][(st.AlfredMund ?? 1) - 1], eyes: LOOK[(st.AlfredAugen ?? 1) - 1],
      face: { eyeK: 0.8, gap: 12, mouthK: 0.9, mouthDy: rigMouthDy('Alfred', 189.5, 231, k) },
      armL: { hand: [576 - 4 * a, 186 - 6 * a], rot: -15 - 35 * a },
    });
    s += bar();
    s += npcRig('Alfred', x, y, k, { layer: 'armsFront', armR: { hand: [624 + 8 * Math.sin(b * Math.PI * 2), 246], rot: 70 } });
  }
  // ---- Arno (back left)
  {
    const k = 0.78; const [x, y] = rigAtEye('Arnold', [171.5, 184], k);
    const a = tt(st.ArnoldArmRechts, 6);
    s += npcRig('Arnold', x, y, k, {
      mouth: [1, 2, 3][(st.ArnoldMund ?? 1) - 1], eyes: st.ArnoldLid ? 'closed' : 'open',
      face: { mouthDy: rigMouthDy('Arnold', 184, 220, k) },
      armL: { hand: [102 - 4 * a, 214 - 34 * a], elbow: [92, 222 - 8 * a], rot: -20 - 20 * a },
      armR: { hand: [238, 248], rot: 10 },
    });
  }
  // ---- jukebox + Bert leaning on it
  s += jukebox();
  {
    const k = 0.5; const [x, y] = rigAtEye('Ben', [331, 176.5], k);
    const a = tt(st.BenHandRechts, 6), b = tt(st.BenHandLinks, 6);
    s += npcRig('Ben', x, y, k, {
      eyes: st.BenLid ? 'closed' : 'open', noLegs: true,
      armL: { hand: [292 - 2 * a, 212 - 6 * a], rot: -30 + 50 * a },
      armR: { hand: [352 + 2 * b, 216 - 5 * b], rot: 20 - 40 * b },
    });
  }
  s += benTable();
  // ---- Käpt'n Reling (middle)
  {
    const k = 0.85; const [x, y] = rigAtEye('Reeling', [444, 218], k);
    const a = tt(st.ReelingArmLinks, 11), b = tt(st.ReelingHandLinks, 6);
    s += ellipse(x, y + 2, 60, 9, { fill: '#000', opacity: 0.15 });
    s += npcRig('Reeling', x, y, k, {
      mouth: [1, 2, 3][(st.ReelingMund ?? 1) - 1], eyes: LOOK[(st.ReelingAuge ?? 1) - 1],
      armL: { hand: [380 - 6 * a, 286 - 34 * a], rot: -20 - 30 * a },
      armR: { hand: [482, 223], rot: 80 + 25 * Math.sin(b * Math.PI) },
    });
  }
  // ---- Mats behind the front table
  {
    const k = 0.85; const [x, y] = rigAtEye('Magnus', [82.5, 272], k);
    const a = tt(st.MagnusHandRechts, 6), b = tt(st.MagnusHandLinks, 6);
    s += npcRig('Magnus', x, y, k, {
      eyes: LOOK[(st.MagnusAugen ?? 1) - 1], noLegs: true,
      armL: { hand: [62 - 6 * a, 330 - 14 * a], rot: -10 - 40 * a },
      armR: { hand: [150 + 4 * b, 330 - 10 * b], rot: 20 + 30 * b },
    });
  }
  s += frontTable();
  // ---- Tom (front, swinging his leg)
  {
    const k = 1; const x = 287, y = 430;
    const a = tt(st.TimHandRechts, 6), b = tt(st.TimBeinLinks, 6);
    s += ellipse(x, y + 2, 50, 8, { fill: '#000', opacity: 0.18 });
    s += npcRig('Tim', x, y, k, {
      mouth: 3, legs: [24 * b, 0],
      armL: { hand: [231, 343], rot: -25 + 50 * a },
      armR: { hand: [338, 404], rot: 20 },
    });
  }
  return s;
}

/** ceiling fan: rod + hub at loc (345,70), 4 blades seen slightly from below, angle phase 0..1 */
function fan(ph: number): string {
  const cx = 345, cy = 76;
  let blades = '';
  const arr = [0, 1, 2, 3].map((i) => (ph + i / 4) * Math.PI * 2).sort((p, q) => Math.sin(p) - Math.sin(q));
  for (const a of arr) {
    const ex = Math.cos(a) * 120, ey = Math.sin(a) * 16;
    const px = -Math.sin(a) * 10, py = Math.cos(a) * 2.5;
    const col = Math.sin(a) > 0 ? '#9a6a3a' : '#7a4a20';
    blades += path(`M${r2(cx + px * 0.6)} ${r2(cy + py * 0.6)} L${r2(cx + ex + px)} ${r2(cy + ey + py)} Q${r2(cx + ex * 1.04)} ${r2(cy + ey * 1.04)} ${r2(cx + ex - px)} ${r2(cy + ey - py)} L${r2(cx - px * 0.6)} ${r2(cy - py * 0.6)} Z`, { fill: col, stroke: '#3e2610', strokeWidth: 2.5, strokeLinejoin: 'round' });
  }
  return line(cx, 0, cx, 66, { stroke: '#2a2a2a', strokeWidth: 5 }) + blades +
    ellipse(cx, cy - 4, 24, 9, { fill: '#3a3a3a', stroke: '#111', strokeWidth: 3 }) + ellipse(cx, cy + 2, 14, 6, { fill: '#555', stroke: '#111', strokeWidth: 2.5 }) +
    path(`M${cx - 18} ${cy - 6} q10 -5 20 -4`, { fill: 'none', stroke: lt('#3a3a3a', 0.5), strokeWidth: 2, strokeLinecap: 'round' });
}

const part = (st: (f: number) => St) => (m: Member) => inScene(m, world(st(m.frame ?? 1)));
const key = (id: string, w: number, h: number) => g({ transform: `translate(${w / 2} ${h / 2}) rotate(90) scale(${r2(h / 64)} ${r2(w / 34)})` }, itemShape(id));

export default defineMovie({
  Headline: (m, w, h) => headline('In der Hafenkneipe', w, h),
  HafenkneipeInnen: () => world(),
  'Ventilator-*': (m) => inScene(m, fan(((m.frame ?? 1) - 1) / 10 / 4)),
  'MagnusHandRechts-*': part((f) => ({ MagnusHandRechts: f })),
  'MagnusHandLinks-*': part((f) => ({ MagnusHandLinks: f })),
  'MagnusAugen-*': part((f) => ({ MagnusAugen: f })),
  'ArnoldArmRechts-*': part((f) => ({ ArnoldArmRechts: f })),
  ArnoldLid: part(() => ({ ArnoldLid: 1 })),
  'ArnoldMund-*': part((f) => ({ ArnoldMund: f })),
  'BenHandRechts-*': part((f) => ({ BenHandRechts: f })),
  'BenHandLinks-*': part((f) => ({ BenHandLinks: f })),
  BenLid: part(() => ({ BenLid: 1 })),
  'ReelingArmLinks-*': part((f) => ({ ReelingArmLinks: f })),
  'ReelingAuge-*': part((f) => ({ ReelingAuge: f })),
  'ReelingHandLinks-*': part((f) => ({ ReelingHandLinks: f })),
  'ReelingMund-*': part((f) => ({ ReelingMund: f })),
  'TimHandRechts-*': part((f) => ({ TimHandRechts: f })),
  'TimBeinLinks-*': part((f) => ({ TimBeinLinks: f })),
  'AlfredArmRechts-*': part((f) => ({ AlfredArmRechts: f })),
  'AlfredHandRechts-*': part((f) => ({ AlfredHandRechts: f })),
  'AlfredAugen-*': part((f) => ({ AlfredAugen: f })),
  'AlfredMund-*': part((f) => ({ AlfredMund: f })),
  'Key-1 (69)': (m, w, h) => key('OI069', w, h),
  'Key-2 (70)': (m, w, h) => key('OI070', w, h),
});
