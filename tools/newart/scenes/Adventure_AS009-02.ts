// AS009-02 "Ballsaal" (villa ballroom): band (piano + double bass), Arno, Bert, Alfons and Tom at the party,
// Käpt'n Reling on the gallery, the butler (separate sprite, parts as overlays) and Rocko (separate sprite).
// Crops of the painting: Bass 264,251 · Piano 91,267 · ArnoldArm 332,282 · ArnoldLid 370,255 · BenLid 412,244 ·
// AlfredArm 430,279 · ReelingArm 40,53 · ReelingLid 101,65 · TimSchuh 715,357 · TimArm 767,323 · TimLid 723,325.
// Overlays: Butler (loc 524,304) + ButlerArme/ButlerAugen/ButlerMund; Rocco (loc 593,366) + Rocco50ArmLinks/ArmRechts/Mund.
// Tuer 499,199 (door to the cellar AS009-04, 6 frames), Pflanze 10,287 (palm pot, foreground), items OS027 (matches), OS012.
import { defineMovie, Member } from '../lib/api';
import { itemShape } from '../lib/items';
import { RigPose, npcRig, rigAtEye, rigMouthDy } from '../lib/npcrig';
import { atLoc, inScene } from '../lib/stageloc';
import { C, blob, circle, defs, dk, ellipse, g, linGrad, lt, path, r2, rect } from '../lib/svg';
import { headline } from '../lib/ui';

type St = Record<string, number>;
const tt = (f: number | undefined, n: number) => ((f ?? 1) - 1) / (n - 1);

function room(): string {
  let s = defs(linGrad('fl', [[0, '#e8dcb8'], [1, '#f6eed6']]));
  s += rect(0, 0, 800, 448, { fill: '#fff4c0' });
  for (let x = 0; x < 800; x += 36) s += rect(x, 0, 16, 448, { fill: '#f6d86a' });
  // arched night windows
  for (const [x, y, w] of [[240, 70, 74], [380, 70, 74], [516, 70, 74], [240, 200, 72], [380, 200, 72]] as [number, number, number][]) {
    s += path(`M${x} ${y + 100} V${y + 30} Q${x + w / 2} ${y - 8} ${x + w} ${y + 30} V${y + 100} Z`, { fill: '#2a3a9a', stroke: '#f0e0a0', strokeWidth: 6 });
    s += path(`M${x + w / 2} ${y + 6} V${y + 100} M${x} ${y + 50} H${x + w}`, { stroke: '#f0e0a0', strokeWidth: 4 });
  }
  // floor (herringbone hint)
  s += path('M0 300 H800 V448 H0 Z', { fill: 'url(#fl)' });
  let hb = '';
  for (let y = 312; y < 448; y += 24) for (let x = (y / 24) % 2 ? 0 : 20; x < 800; x += 40) hb += `M${x} ${y} l20 12 M${x + 20} ${y + 12} l20 -12 `;
  s += path(hb, { stroke: '#d8c898', strokeWidth: 2, fill: 'none' });
  s += path('M0 300 H800', { stroke: '#c8b078', strokeWidth: 3 });
  // gallery: floor beam + balustrade, posts
  s += rect(0, 140, 620, 18, { fill: '#e8b880', stroke: '#9a6a3a', strokeWidth: 3 });
  s += rect(60, 158, 24, 222, { fill: '#c8945a', stroke: '#7a4a20', strokeWidth: 3 });
  s += rect(180, 158, 18, 150, { fill: '#e8b880', stroke: '#9a6a3a', strokeWidth: 3 });
  // stairs on the right up to the gallery
  s += path('M800 300 L640 150 H800 Z', { fill: '#8a5a2a', stroke: '#4a2a10', strokeWidth: 3 });
  for (let i = 0; i < 8; i++) s += path(`M${652 + i * 20} ${162 + i * 18.5} H800`, { stroke: '#5a3418', strokeWidth: 3 });
  s += path('M630 140 L800 290', { stroke: '#e8b880', strokeWidth: 10, strokeLinecap: 'round' });
  // back door frame (the door is a sprite) + table with red cloth + bottles
  s += rect(494, 194, 109, 124, { fill: '#e8e8ea', stroke: '#9a9aa2', strokeWidth: 4 });
  s += path('M548 290 L700 278 L720 330 L560 346 Z', { fill: C.red, stroke: C.redDark, strokeWidth: 3 });
  s += path('M560 346 V380 M712 330 V368', { stroke: '#3a2a1a', strokeWidth: 6 });
  s += rect(640, 250, 16, 36, { rx: 6, fill: '#5ab8a8', stroke: '#2a6a5a', strokeWidth: 2.5 }) + ellipse(680, 284, 18, 5, { fill: C.white, stroke: '#8a93a6', strokeWidth: 2 });
  // chandelier
  s += path('M410 0 V70', { stroke: '#2a2a2a', strokeWidth: 4 }) + path('M330 110 Q410 140 490 110', { fill: 'none', stroke: '#2a2a2a', strokeWidth: 6 }) +
    path('M410 70 L340 104 M410 70 L480 104 M410 70 V120', { stroke: '#2a2a2a', strokeWidth: 3 });
  for (const x of [336, 372, 410, 448, 484]) s += rect(x - 6, 84, 12, 24, { rx: 3, fill: '#fff8e0', stroke: '#a8a090', strokeWidth: 2 }) + ellipse(x, 80, 4, 6, { fill: '#ffd25a' });
  return s;
}

function balustrade(): string {
  let s = rect(0, 92, 620, 10, { rx: 3, fill: '#e8b880', stroke: '#9a6a3a', strokeWidth: 3 });
  for (let x = 10; x < 610; x += 24) s += ellipse(x + 6, 120, 6, 16, { fill: 'none', stroke: '#c8945a', strokeWidth: 5 });
  return s;
}

function piano(): string {
  return path('M96 290 L120 262 H250 Q270 266 262 290 Z', { fill: '#f6f6f8', stroke: '#8a8a92', strokeWidth: 3 }) +
    rect(96, 290, 160, 24, { fill: '#e8e8ec', stroke: '#8a8a92', strokeWidth: 3 }) + path('M110 314 V350 M240 314 V350', { stroke: '#8a8a92', strokeWidth: 6 }) +
    rect(100, 284, 70, 8, { fill: C.white, stroke: '#2a2a2a', strokeWidth: 1.5 }) + [0, 1, 2, 3, 4, 5, 6, 7].map((i) => rect(104 + i * 8, 284, 3, 5, { fill: '#2a2a2a' })).join('');
}

function bass(): string {
  return g({ transform: 'rotate(-8 300 290)' },
    path('M282 250 Q262 270 276 290 Q260 310 280 334 H320 Q340 310 324 290 Q338 270 318 250 Z', { fill: '#a8582a', stroke: '#5a2a10', strokeWidth: 3 }),
    path('M300 250 V180', { stroke: '#3a2a1a', strokeWidth: 6 }), path('M296 260 V320 M304 260 V320', { stroke: '#e8d8a0', strokeWidth: 1.5 }));
}

function world(st: St = {}, opt: { butler?: boolean; rocco?: boolean } = { butler: true, rocco: true }): string {
  let s = room();
  // Käpt'n Reling on the gallery (behind the balustrade)
  {
    const k = 0.36; const [x, y] = rigAtEye('Reeling', [112, 70.5], k);
    const a = tt(st.ReelingArm, 7);
    s += npcRig('Reeling', x, y, k, { eyes: st.ReelingLid ? 'closed' : 'open', noLegs: true, armL: { hand: [72 - 10 * a, 110 - 40 * a], elbow: [70, 106 - 10 * a], rot: -20 - 40 * a }, armR: { hand: [134, 96], rot: 10 } });
  }
  s += balustrade();
  // band: pianist + bass player
  {
    const a = tt(st.Piano, 5);
    s += npcRig('Band', 128, 318, 0.5, { mouth: 1, armL: { hand: [118 + 6 * Math.sin(a * 6), 286], rot: 90 }, armR: { hand: [150 - 6 * Math.sin(a * 5), 286], rot: 90 } });
    s += piano();
    const b = tt(st.Bass, 11);
    s += bass();
    s += npcRig('Band', 330, 318, 0.48, { mouth: 3, eyes: 'left', armL: { hand: [298, 214], rot: -30 }, armR: { hand: [292 - 18 * Math.sin(b * Math.PI), 280 - 4 * b], rot: 100 } });
  }
  // Arno, Bert, Alfons in the middle
  {
    const k = 0.39; const [x, y] = rigAtEye('Ben', [423, 254], k);
    s += npcRig('Ben', x, y, k, { eyes: st.BenLid ? 'closed' : 'open', mouth: 2, armL: { hand: [402, 290], rot: -10 }, armR: { hand: [444, 288], rot: 10 } });
  }
  {
    const k = 0.44; const [x, y] = rigAtEye('Arnold', [384, 268], k);
    const a = tt(st.ArnoldArm, 4);
    s += npcRig('Arnold', x, y, k, { eyes: st.ArnoldLid ? 'closed' : 'open', mouth: 3, armL: { hand: [352 - 4 * a, 316 - 18 * a], rot: -20 - 40 * a }, armR: { hand: [418, 314], rot: 20 } });
  }
  {
    const k = 0.45; const x = 462, y = 336;
    const a = tt(st.AlfredArm, 4);
    s += npcRig('Alfred', x, y, k, { mouth: 2, eyes: 'left', armL: { hand: [446 - 2 * a, 312 - 18 * a], rot: -30 * a }, armR: { hand: [488, 316], rot: 20 } });
  }
  // Tom on roller skates (right)
  {
    const k = 0.75; const [x, y] = rigAtEye('Tim', [733.5, 330], k);
    const a = tt(st.TimArm, 6), b = tt(st.TimSchuh, 3);
    s += npcRig('Tim', x, y, k, {
      eyes: st.TimLid ? 'closed' : 'open', mouth: 3, face: { eyeK: 0.5, gap: 9 }, legs: [-8 * b, 0],
      armL: { hand: [700, 356], rot: -10 }, armR: { hand: [786 + 4 * a, 352 - 16 * a], rot: 20 + 40 * a },
    });
    // skates
    for (const [dx, rot] of [[-13, -8 * b], [13, 0]] as [number, number][]) s += g({ transform: `rotate(${r2(rot)} ${r2(x + dx)} ${r2(y - 20 * k)})` }, rect(x + dx - 14, y - 4, 30, 6, { rx: 2, fill: C.red, stroke: C.redDark, strokeWidth: 2 }), circle(x + dx - 8, y + 4, 4, { fill: C.yellow, stroke: '#8a6d00', strokeWidth: 1.5 }), circle(x + dx + 10, y + 4, 4, { fill: C.yellow, stroke: '#8a6d00', strokeWidth: 1.5 }));
  }
  if (opt.butler) s += butler(st, 'all');
  if (opt.rocco) s += rocco(st, 'all');
  return s;
}

// ---- butler (separate sprite with part overlays)
const BK = 0.55;
function butlerPose(st: St): RigPose {
  const a = tt(st.ButlerArme, 13);
  return {
    eyes: (['open', 'left', 'right', 'up'] as const)[(st.ButlerAugen ?? 1) - 1], mouth: [1, 2, 3][(st.ButlerMund ?? 1) - 1], face: { mouthK: 0.6 },
    armL: { hand: [498 - 4 * Math.sin(a * Math.PI), 326 - 8 * Math.sin(a * Math.PI)], rot: -30 },
    armR: { hand: [540 + 6 * Math.sin(a * Math.PI * 2), 322 - 10 * Math.sin(a * Math.PI)], rot: 30 },
  };
}
function butler(st: St, layer: 'all' | 'body' | 'arms' | 'eyes' | 'mouth'): string {
  const [x, y] = rigAtEye('Butler', [516.5, 270], BK);
  const p = butlerPose(st);
  return npcRig('Butler', x, y, BK, { ...p, face: { ...p.face, mouthDy: rigMouthDy('Butler', 270, 293, BK) }, layer: layer === 'all' ? undefined : layer });
}

// ---- Rocko (separate sprite)
const RK = 0.55;
function rocco(st: St, layer: 'all' | 'body' | 'armsBehind' | 'armsFront' | 'mouth'): string {
  const x = 581, feet = 393;
  const eyeY = feet - 47.2;
  const a = tt(st.Rocco50ArmLinks, 7), b = tt(st.Rocco50ArmRechts, 5);
  return npcRig('Rocco', x, feet, RK, {
    mouth: [1, 2, 3][(st.Rocco50Mund ?? 1) - 1], face: { mouthK: 0.55, mouthDy: rigMouthDy('Rocco', eyeY, 369, RK) },
    armL: { hand: [534 - 4 * b, 380 - 10 * b], rot: -40 + 30 * b, behind: true },
    armR: { hand: [640 + 6 * a, 352 - 30 * a], rot: 40 + 30 * a },
    layer: layer === 'all' ? undefined : layer,
  });
}

/** back door: double leaves open to the dark cellar stairs; f 1..6 */
function door(f: number): string {
  const t = (f - 1) / 5;
  let s = rect(500, 200, 97, 116, { fill: '#a8583a' });
  for (let y = 206; y < 316; y += 12) s += path(`M500 ${y} H597`, { stroke: '#7a3a20', strokeWidth: 2 });
  s += path('M520 316 L540 260 H560 L580 316 Z', { fill: '#2a1a10' });
  const k = Math.cos(t * Math.PI * 0.45);
  s += path(`M500 200 L${r2(500 + 48 * k)} ${r2(200 - 6 * (1 - k))} V${r2(316 + 6 * (1 - k))} L500 316 Z`, { fill: '#f0f0f2', stroke: '#8a8a92', strokeWidth: 3 });
  s += path(`M597 200 L${r2(597 - 48 * k)} ${r2(200 - 6 * (1 - k))} V${r2(316 + 6 * (1 - k))} L597 316 Z`, { fill: '#e4e4e8', stroke: '#8a8a92', strokeWidth: 3 });
  if (k > 0.4) s += rect(500 + 8 * k, 212, 32 * k, 40, { fill: 'none', stroke: '#c8c8d0', strokeWidth: 2 }) + rect(597 - 40 * k, 212, 32 * k, 40, { fill: 'none', stroke: '#c8c8d0', strokeWidth: 2 });
  return s;
}

function palm(): string {
  let s = path('M70 455 L60 380 Q120 360 190 380 L176 455 Z', { fill: '#a8583a', stroke: '#5a2a10', strokeWidth: 4 }) + ellipse(125, 382, 66, 12, { fill: '#6a3a1a', stroke: '#5a2a10', strokeWidth: 3 });
  const leaves: [number, number, number][] = [[-160, 70, 110], [-130, 90, 120], [-95, 95, 120], [-60, 90, 110], [-30, 80, 100], [-115, 60, 90], [-75, 60, 90]];
  for (const [a, l] of leaves.map(([a, l]) => [a, l])) {
    const r = (a * Math.PI) / 180;
    const ex = 125 + Math.cos(r) * l * 1.2, ey = 376 + Math.sin(r) * l;
    s += path(`M125 376 Q${r2(125 + Math.cos(r) * l * 0.7 - 10)} ${r2(376 + Math.sin(r) * l * 0.7 - 20)} ${r2(ex)} ${r2(ey)}`, { fill: 'none', stroke: '#2f7a3a', strokeWidth: 16, strokeLinecap: 'round' }) +
      path(`M125 376 Q${r2(125 + Math.cos(r) * l * 0.7 - 10)} ${r2(376 + Math.sin(r) * l * 0.7 - 20)} ${r2(ex)} ${r2(ey)}`, { fill: 'none', stroke: '#5fb85a', strokeWidth: 8, strokeLinecap: 'round', strokeDasharray: '10 4' });
  }
  return s;
}

const part = (st: (f: number) => St) => (m: Member) => inScene(m, world(st(m.frame ?? 1)));
const item = (id: string, w: number, h: number) => g({ transform: `translate(${w / 2} ${h / 2}) scale(${r2(Math.min(w, h) / 58)})` }, itemShape(id));

export default defineMovie({
  Headline: (m, w, h) => headline('Ballsaal', w, h),
  Ballsaal: () => world({}, {}),
  'Bass-*': part((f) => ({ Bass: f })),
  'Piano-*': part((f) => ({ Piano: f })),
  'ArnoldArm-*': part((f) => ({ ArnoldArm: f })),
  ArnoldLid: part(() => ({ ArnoldLid: 1 })),
  BenLid: part(() => ({ BenLid: 1 })),
  'AlfredArm-*': part((f) => ({ AlfredArm: f })),
  'ReelingArm-*': part((f) => ({ ReelingArm: f })),
  ReelingLid: part(() => ({ ReelingLid: 1 })),
  'TimSchuh-*': part((f) => ({ TimSchuh: f })),
  'TimArm-*': part((f) => ({ TimArm: f })),
  TimLid: part(() => ({ TimLid: 1 })),
  'Tuer-*': (m) => inScene(m, door(m.frame ?? 1)),
  Pflanze: (m) => inScene(m, palm()),
  OS027: (m, w, h) => item('OI027', w, h),
  // thin hook: an almost invisible halo (alpha ≈ 30 > hit threshold 24) makes the whole member clickable
  OS012: (m, w, h) => ellipse(w / 2, h / 2, w / 2 - 1, h / 2 - 1, { fill: '#fff8e0', opacity: 0.12 }) + item('OI012', w, h),
  Butler: (m) => inScene(m, butler({}, 'body')),
  'ButlerArme-*': (m) => inScene(m, butler({ ButlerArme: m.frame ?? 1 }, 'arms')),
  'ButlerAugen-*': (m) => inScene(m, butler({ ButlerAugen: m.frame ?? 1 }, 'eyes')),
  'ButlerMund-*': (m) => inScene(m, butler({ ButlerMund: m.frame ?? 1 }, 'mouth')),
  // not placed in the score: tapping left shoe relative to the butler's loc (524,304)
  'ButlerSchuh-*': (m) => {
    const a = (((m.frame ?? 1) - 1) / 4) * 14;
    return atLoc(m, [524, 304], g({ transform: `rotate(${-a} 498 352)` }, path('M492 352 q0 -8 8 -8 q9 0 10 8 z', { fill: '#111', stroke: '#000', strokeWidth: 2 })));
  },
  Rocco: (m) => inScene(m, rocco({}, 'body')),
  'Rocco50ArmLinks-*': (m) => inScene(m, rocco({ Rocco50ArmLinks: m.frame ?? 1 }, 'armsFront')),
  'Rocco50ArmRechts-*': (m) => inScene(m, rocco({ Rocco50ArmRechts: m.frame ?? 1 }, 'armsBehind')),
  'Rocco50Mund-*': (m) => inScene(m, rocco({ Rocco50Mund: m.frame ?? 1 }, 'mouth')),
});
