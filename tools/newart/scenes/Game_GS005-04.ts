// GS005-04 "Fackel anzünden" – light the torch in the cave with a match.
// Sprite rectangles (scene coordinates = stage y - 45, see score):
//   Shine 10,46 182x206 (glow around the torch) · Torch 83,73 60x136 (flame, blend 0 until lit) ·
//   Spiritus 101,184 24x16 (= torch head) · Matchbox 708,225 83x69 (drawer slides out of the box; opaque
//   copy of the wall so the whole rect is clickable) · Match 81x10.. (reg = held end, head right, burns
//   down & curls up) · Flame (match flame, reg = bottom centre, at match loc + (75 - 3f, 3)) ·
//   Ignition 542,226 93x47 (invisible rubbing area, blend 0).
import { defineMovie, type Member } from '../lib/api';
import { introScreen } from '../lib/gs005a';
import { C, circle, defs, ellipse, g, line, linGrad, lt, path, poly, r2, radGrad, rect, rng } from '../lib/svg';
import { fitText, headline } from '../lib/ui';

const ROCK = '#8a6446', ROCK_D = '#5e4230', ROCK_L = '#a87e58';

// ------------------------------------------------------------------ cave background (without matchbox)
function cave(id: string): string {
  const R = rng('gs54-cave');
  let s = defs(
    linGrad(`${id}-wall`, [[0, '#6e4e36'], [0.5, ROCK], [1, '#6a4a33']]),
    linGrad(`${id}-dark`, [[0, '#1a1018'], [1, '#2e2028']]),
    linGrad(`${id}-floor`, [[0, '#b88a52'], [1, '#8a6238']]),
  );
  s += rect(0, 0, 800, 448, { fill: `url(#${id}-wall)` });
  // rock lumps on the wall
  for (let i = 0; i < 46; i++) {
    const x = R() * 800, y = R() * 380, rx = 20 + R() * 46, ry = 10 + R() * 22;
    s += ellipse(x, y, rx, ry, { fill: R() > 0.5 ? ROCK_L : ROCK_D, fillOpacity: 0.35 });
  }
  for (let i = 0; i < 18; i++) {
    const x = R() * 800, y = R() * 360;
    s += path(`M${r2(x)} ${r2(y)} q${r2(10 + R() * 20)} ${r2(6 + R() * 8)} ${r2(30 + R() * 30)} ${r2(-4 + R() * 8)}`, { fill: 'none', stroke: ROCK_D, strokeWidth: 3, strokeLinecap: 'round', strokeOpacity: 0.6 });
  }
  // bulging rock on the right
  s += path('M560 0 C600 60 610 140 600 210 C590 300 600 380 620 448 H800 V0 Z', { fill: '#7a583e', stroke: ROCK_D, strokeWidth: 5 });
  s += path('M600 40 q20 50 12 110', { fill: 'none', stroke: ROCK_L, strokeWidth: 6, strokeLinecap: 'round', strokeOpacity: 0.6 });
  // sandy floor
  s += path('M0 410 Q200 380 400 392 T800 400 V448 H0 Z', { fill: `url(#${id}-floor)`, stroke: '#6b4a28', strokeWidth: 4 });
  // mine entrance: dark tunnel with wooden frame (middle)
  s += path('M372 92 H552 V430 H372 Z', { fill: `url(#${id}-dark)` });
  s += path('M372 352 Q460 330 552 352 V430 H372 Z', { fill: '#6b4a28', fillOpacity: 0.85 });
  s += path('M410 430 L440 330 H490 L520 430 Z', { fill: '#2e2028', fillOpacity: 0.5 });
  const beam = (x: number, y: number, w: number, h: number) =>
    rect(x, y, w, h, { rx: 4, fill: C.wood, stroke: C.woodDeep, strokeWidth: 4 }) +
    line(x + 6, y + 8, x + 6, y + h - 8, { stroke: lt(C.wood, 0.3), strokeWidth: 3, strokeLinecap: 'round', strokeOpacity: 0.7 });
  s += beam(346, 80, 30, 360) + beam(548, 80, 30, 360);
  s += rect(330, 62, 264, 30, { rx: 5, fill: C.wood, stroke: C.woodDeep, strokeWidth: 4 }) +
    line(340, 70, 584, 70, { stroke: lt(C.wood, 0.3), strokeWidth: 3, strokeLinecap: 'round', strokeOpacity: 0.7 });
  s += [[340, 74], [584, 74], [360, 140], [564, 140]].map(([x, y]) => circle(x, y, 3.5, { fill: C.woodDeep })).join('');
  // torch bracket (left) – torch head = Spiritus 101,184 24x16
  s += torch();
  // rock ledge for the matchbox (right)
  s += path('M526 240 Q560 236 640 258 T796 300 L790 326 Q720 330 650 300 T532 266 Z', { fill: '#9a7250', stroke: ROCK_D, strokeWidth: 4, strokeLinejoin: 'round' });
  s += path('M540 246 Q600 250 700 284',{ fill: 'none', stroke: ROCK_L, strokeWidth: 4, strokeLinecap: 'round', strokeOpacity: 0.7 });
  return s;
}

function torch(): string {
  return rect(52, 236, 34, 22, { rx: 4, fill: '#6a6470', stroke: '#2e2a34', strokeWidth: 4 }) +
    circle(60, 247, 3, { fill: '#2e2a34' }) + circle(78, 247, 3, { fill: '#2e2a34' }) +
    path('M86 247 L104 238', { stroke: '#2e2a34', strokeWidth: 6, strokeLinecap: 'round' }) +
    // shaft
    path('M96 276 L106 200 L120 200 L112 278 Z', { fill: C.wood, stroke: C.woodDeep, strokeWidth: 4, strokeLinejoin: 'round' }) +
    path('M103 262 L109 212', { stroke: lt(C.wood, 0.3), strokeWidth: 3, strokeLinecap: 'round' }) +
    ellipse(106, 240, 12, 6, { fill: '#6a6470', stroke: '#2e2a34', strokeWidth: 3.5 }) +
    // wrapped head
    path('M98 204 Q96 184 113 182 Q130 184 128 204 Q113 212 98 204 Z', { fill: '#5a4636', stroke: '#2a1c14', strokeWidth: 4, strokeLinejoin: 'round' }) +
    path('M100 196 q13 5 26 0 M101 189 q12 5 24 0', { fill: 'none', stroke: '#2a1c14', strokeWidth: 2.5, strokeLinecap: 'round' });
}

// ------------------------------------------------------------------ matchbox (world coordinates)
const BOX = { cx: 632, cy: 236, a: 15, L: 170, W: 44 };

function matchesIn(n: number, x0: number): string {
  // matches lie along the drawer, heads at the outer (right) end
  let s = '';
  for (let i = 0; i < n; i++) {
    const y = -BOX.W / 2 + 8 + i * 9.5;
    s += rect(x0 + 18, y - 2.5, 122, 5, { rx: 2, fill: '#f1d9a0', stroke: '#9a7a40', strokeWidth: 1.5 }) +
      ellipse(x0 + 141, y, 7, 4.2, { fill: C.red, stroke: C.redDark, strokeWidth: 2 }) +
      circle(x0 + 139, y - 1.4, 1.4, { fill: lt(C.red, 0.5) });
  }
  return s;
}

function matchbox(n: number, ext: number): string {
  const { L, W } = BOX;
  const dx = L / 2 + ext - 150; // drawer left end (local)
  const drawer = rect(dx, -W / 2 + 2, 150, W - 4, { rx: 3, fill: '#f4e2b4', stroke: '#9a7a40', strokeWidth: 3 }) +
    rect(dx + 5, -W / 2 + 6, 140, W - 12, { rx: 2, fill: '#e2c88e' }) + matchesIn(n, dx);
  const sleeve =
    rect(-L / 2, -W / 2, L, W + 8, { rx: 5, fill: '#7a2a1c', stroke: '#3e140c', strokeWidth: 4 }) + // striking side (lower)
    path(`M${-L / 2 + 6} ${W / 2 + 4} h${L - 12}`, { stroke: '#4e1a10', strokeWidth: 3, strokeDasharray: '2 3' }) +
    rect(-L / 2, -W / 2, L, W, { rx: 5, fill: C.blue, stroke: C.blueDark, strokeWidth: 4 }) +
    rect(-L / 2 + 10, -W / 2 + 7, L - 20, W - 14, { rx: 4, fill: 'none', stroke: C.yellow, strokeWidth: 2.5 }) +
    path(`M${-L / 2 + 8} ${-W / 2 + 5} h${L - 40}`, { stroke: lt(C.blue, 0.45), strokeWidth: 3, strokeLinecap: 'round' }) +
    path(`M${-L / 2 + 24} 0 l8 -12 l4 8 l5 -6 l1 14 q-9 6 -18 -4 z`, { fill: C.yellow, stroke: C.yellowDark, strokeWidth: 1.6 }) +
    fitText('Streichhölzer', 8, 1, L - 70, 17, { anchor: 'middle', fill: C.white });
  const shadow = ellipse(4, W / 2 + 10, L / 2 + ext / 2 + 4, 7, { fill: '#000', fillOpacity: 0.22 });
  return g({ transform: `translate(${BOX.cx} ${BOX.cy}) rotate(${BOX.a})` }, shadow, drawer, sleeve);
}

function background(): string {
  return cave('bg') + matchbox(4, 0);
}

/** Matchbox<n>-<f>: wall patch (opaque, clickable) + box with the drawer pulled out (f 1 closed .. 6 open) */
function matchboxMember(m: Member): string {
  const mm = /^Matchbox(\d)-(\d)$/.exec(m.name)!;
  const n = +mm[1], f = +mm[2];
  const ext = ((f - 1) / 5) * 56;
  return g({ transform: 'translate(-708 -225)' }, cave(`mb${m.num}`), matchbox(n, ext));
}

// ------------------------------------------------------------------ flames
function flameShape(cx: number, by: number, w: number, h: number, sway: number, id: string): string {
  const tipX = cx + sway, tipY = by - h;
  const outer = `M${r2(cx - w / 2)} ${r2(by - w * 0.35)} C${r2(cx - w / 2)} ${r2(by - h * 0.45)} ${r2(tipX - w * 0.12)} ${r2(tipY + h * 0.25)} ${r2(tipX)} ${r2(tipY)} C${r2(tipX + w * 0.12)} ${r2(tipY + h * 0.25)} ${r2(cx + w / 2)} ${r2(by - h * 0.45)} ${r2(cx + w / 2)} ${r2(by - w * 0.35)} A${r2(w / 2)} ${r2(w * 0.4)} 0 0 1 ${r2(cx - w / 2)} ${r2(by - w * 0.35)} Z`;
  const k = 0.62, iw = w * k, ih = h * 0.62;
  const itx = cx + sway * 0.6, ity = by - ih;
  const inner = `M${r2(cx - iw / 2)} ${r2(by - iw * 0.4)} C${r2(cx - iw / 2)} ${r2(by - ih * 0.5)} ${r2(itx - 2)} ${r2(ity + ih * 0.3)} ${r2(itx)} ${r2(ity)} C${r2(itx + 2)} ${r2(ity + ih * 0.3)} ${r2(cx + iw / 2)} ${r2(by - ih * 0.5)} ${r2(cx + iw / 2)} ${r2(by - iw * 0.4)} A${r2(iw / 2)} ${r2(iw * 0.4)} 0 0 1 ${r2(cx - iw / 2)} ${r2(by - iw * 0.4)} Z`;
  return path(outer, { fill: '#ff8a2a', stroke: '#c8461a', strokeWidth: Math.max(1.2, w * 0.08), strokeLinejoin: 'round', id: `${id}-o` }) +
    path(inner, { fill: C.yellow }) +
    ellipse(cx + sway * 0.2, by - iw * 0.45, iw * 0.28, iw * 0.38, { fill: '#fff6c8' });
}

/** Flame-n: match flame, 16 flicker frames, reg = bottom centre */
function matchFlame(m: Member, w: number, h: number): string {
  const f = m.frame ?? 1;
  const sway = Math.sin(f * 1.3) * 2.6 + Math.sin(f * 0.55) * 1.2;
  const fh = (h - 4) * (0.82 + 0.12 * Math.sin(f * 0.9));
  const fw = Math.min(w - 3, 12 + Math.sin(f * 2.1));
  return circle(m.regX, h - 4, fw * 0.75, { fill: '#ffd23f', opacity: 0.25 }) + flameShape(m.regX, h - 2, fw, fh, sway, `fl${f}`);
}

/** Torch-n: big torch flame (18 frames, loop), base on the torch head (canvas 30,121) */
function torchFlame(m: Member, w: number, h: number): string {
  const f = m.frame ?? 1;
  const R = rng(`torch${f}`);
  const sway = Math.sin(f * 0.7) * 7 + (R() - 0.5) * 4;
  const fh = 100 + Math.sin(f * 1.1) * 10 + R() * 8;
  let s = flameShape(30, 124, 34 + Math.sin(f * 1.7) * 3, fh, sway, `t${f}`);
  // side tongues
  s += flameShape(19, 120, 14, 34 + R() * 16, -6 + sway * 0.4, `tl${f}`) + flameShape(41, 121, 14, 30 + R() * 18, 5 + sway * 0.4, `tr${f}`);
  // sparks
  for (let i = 0; i < 3; i++) {
    const y = 10 + ((f * 7 + i * 23) % 50), x = 30 + sway * 0.8 + Math.sin(f + i * 2) * 14;
    s += circle(x, y, 1.8, { fill: '#ffe08a' });
  }
  return s;
}

/** Shine-n: warm glow of the burning torch (1 = none … 5 = full) */
function shine(m: Member, w: number, h: number): string {
  const f = m.frame ?? 1;
  const op = f === 1 ? 0.02 : 0.15 + 0.12 * (f - 2);
  return defs(radGrad(`sh${f}`, [[0, '#ffd27a', op + 0.15], [0.45, '#ff9a3c', op], [1, '#ff9a3c', 0]])) +
    ellipse(103, 110, 92, 104, { fill: `url(#sh${f})` });
}

/** Match-n: held at the left end (reg x 0), head right; burns down from the head and curls upwards */
function match(m: Member): string {
  const f = m.frame ?? 1;
  const bp = 75 - 3 * f; // burning point (flame position)
  const end = m.w - m.regX - 3;
  const top = -(m.regY - 2.5);
  let s = '';
  if (f === 1) {
    s += rect(0, -1, 72, 4.5, { rx: 2, fill: '#f1d9a0', stroke: '#9a7a40', strokeWidth: 1.4 }) +
      ellipse(75, 1.2, 5.6, 3.8, { fill: C.red, stroke: C.redDark, strokeWidth: 1.6 }) + circle(73.5, 0, 1.2, { fill: lt(C.red, 0.5) });
    return s;
  }
  s += rect(0, -1, bp + 1, 4.5, { rx: 2, fill: '#f1d9a0', stroke: '#9a7a40', strokeWidth: 1.4 });
  const ty = Math.min(1, top + 2);
  const d = `M${bp} 1.2 Q${r2(bp + (end - bp) * 0.65)} 1.2 ${r2(end)} ${r2(ty)}`;
  s += path(d, { fill: 'none', stroke: '#1e1a1e', strokeWidth: 4.2, strokeLinecap: 'round' }) +
    path(d, { fill: 'none', stroke: '#5a5058', strokeWidth: 1.4, strokeLinecap: 'round', strokeDasharray: '3 4' }) +
    circle(end, ty, 3, { fill: '#1e1a1e' }) +
    circle(bp + 1, 1.2, 2.4, { fill: '#ff8a2a' });
  return s;
}

/** Explosion-n: spark burst when the match head flares up */
function explosion(m: Member, w: number, h: number): string {
  const f = m.frame ?? 1;
  const cx = m.regX, cy = m.regY, r = Math.max(2, Math.min(w, h) / 2 - 1);
  if (f === 1) return circle(cx, cy, 1.8, { fill: '#fff2a8', stroke: '#ff8a2a', strokeWidth: 0.8 });
  const n = 8, pts: [number, number][] = [];
  for (let i = 0; i < n * 2; i++) {
    const a = (i * Math.PI) / n - Math.PI / 2, rr = i % 2 ? r * 0.45 : r;
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  const fade = f === 4 ? 0.7 : 1;
  return g({ opacity: fade }, poly(pts, { fill: '#ffb03a', stroke: '#d0501a', strokeWidth: 1.5, strokeLinejoin: 'round' }),
    circle(cx, cy, r * 0.35, { fill: '#fff6c8' }),
    f === 4 ? circle(cx - r * 0.2, cy - r * 0.5, r * 0.3, { fill: '#9a9098', opacity: 0.6 }) : '');
}

/** Ignition: rubbing surface (invisible in the game) */
function ignition(w: number, h: number): string {
  return path(`M4 4 L18 2 L${w - 3} ${h - 14} L${w - 16} ${h - 3} Z`, { fill: '#7a2a1c', stroke: '#3e140c', strokeWidth: 3, strokeLinejoin: 'round' }) +
    path(`M14 8 L${w - 14} ${h - 10}`, { stroke: '#4e1a10', strokeWidth: 2, strokeDasharray: '2 3' });
}

function introPicture(): string {
  let s = defs(linGrad('ip54', [[0, '#6e4e36'], [1, '#4a3424']]), radGrad('ip54g', [[0, '#ffd27a', 0.7], [1, '#ff9a3c', 0]]));
  s += rect(0, 0, 320, 190, { fill: 'url(#ip54)' });
  s += ellipse(110, 70, 90, 80, { fill: 'url(#ip54g)' });
  s += g({ transform: 'translate(60 20) scale(0.9)' },
    path('M36 150 L46 74 L60 74 L52 152 Z', { fill: C.wood, stroke: C.woodDeep, strokeWidth: 4 }),
    path('M38 78 Q36 58 53 56 Q70 58 68 78 Q53 86 38 78 Z', { fill: '#5a4636', stroke: '#2a1c14', strokeWidth: 4 }),
    flameShape(53, 70, 30, 66, 4, 'ipf'));
  s += g({ transform: 'translate(200 120) rotate(15)' },
    rect(-60, -20, 120, 44, { rx: 5, fill: '#7a2a1c', stroke: '#3e140c', strokeWidth: 4 }),
    rect(-60, -20, 120, 38, { rx: 5, fill: C.blue, stroke: C.blueDark, strokeWidth: 4 }),
    rect(-50, -13, 100, 24, { rx: 3, fill: 'none', stroke: C.yellow, strokeWidth: 2.5 }));
  s += g({ transform: 'translate(170 70) rotate(-12)' },
    rect(0, -2, 90, 5, { rx: 2, fill: '#f1d9a0', stroke: '#9a7a40', strokeWidth: 1.5 }), ellipse(92, 0.5, 7, 4.5, { fill: C.red, stroke: C.redDark, strokeWidth: 2 }));
  return s;
}

export default defineMovie({
  Headline: (m, w, h) => headline('Fackel anzünden', w, h),
  Intro: () => introScreen({
    id: 'gs54', device: 'mouse', picture: introPicture(),
    lines: [
      'In der Höhle ist es stockdunkel – zünde die Fackel an!',
      'Klicke auf die Schachtel, um sie zu öffnen. Ein Doppelklick nimmt ein Streichholz.',
      'Reibe es nicht zu schnell und nicht zu langsam über die Reibfläche der Schachtel,',
      'bis es brennt. Dann halte die Flamme an die Fackel. Vorsicht: Wind bläst sie aus!',
    ],
  }),
  Background: () => background(),
  'Shine-*': (m, w, h) => shine(m, w, h),
  'Torch-*': (m, w, h) => torchFlame(m, w, h),
  'Flame-*': (m, w, h) => matchFlame(m, w, h),
  'Match-*': (m) => g({ transform: `translate(${m.regX} ${m.regY})` }, match(m)),
  'Explosion-*': (m, w, h) => explosion(m, w, h),
  Ignition: (m, w, h) => ignition(w, h),
  '*': (m) => (/^Matchbox\d-\d$/.test(m.name) ? matchboxMember(m) : null),
});
