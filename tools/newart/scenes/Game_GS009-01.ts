// GS009-01 "Auf der Galerie" – distract the butler: open the gallery window (Fenster, OH2), drag the
// Ming vase (Vase-1 … Vase-5 = smaller while moving into the window hotspot 150,93 46x54) and drop it
// out of the window -> crash -> the butler (Butler-1 … 19) leaves the hall.
// Sprite rectangles (scene = stage y - 45): Background 0,0 · Composing-3 113,47 118x401 (wall slice with the
// window hole – the falling vase sinks behind it, ch12) · Fenster 51,43 195x162 (ch13) · Vase 690,132 ·
// Bass 139,327 70x121 · Haken 315,268 · Butler 397,363 81x85 · Composing-1 250,0 (chains) ·
// Composing-2 0,163 710x179 (railing + chandelier, in front).
import { atReg, defineMovie, type Member } from '../lib/api';
import { butlerAt } from '../lib/butler';
import { introScreen } from '../lib/gs005a';
import { C, circle, defs, dk, el, ellipse, g, line, linGrad, lt, path, r2, rect, rng } from '../lib/svg';
import { headline } from '../lib/ui';

const STRIPE_A = '#fff4d6', STRIPE_B = '#ffd96a';
const FRAME = '#a8862a', FRAME_DK = '#5e4a10';
const GLASS = '#3b4fa6';
/** the window opening of the gallery window (scene coords): arch over x 120..222, y 50..192 */
const HOLE = { x: 120, y: 50, w: 102, h: 142 };
const holePath = (dx = 0, dy = 0) => {
  const { x, y, w, h } = HOLE;
  const r = w / 2;
  return `M${x - dx} ${y + h - dy} V${y + r - dy} A${r} ${r} 0 0 1 ${x + w - dx} ${y + r - dy} V${y + h - dy} Z`;
};
const archPath = (x: number, y: number, w: number, h: number) => `M${x} ${y + h} V${y + w / 2} A${w / 2} ${w / 2} 0 0 1 ${x + w} ${y + w / 2} V${y + h} Z`;

function outside(id: string): string {
  const R = rng(91);
  let s = rect(HOLE.x - 6, HOLE.y - 6, HOLE.w + 12, HOLE.h + 12, { fill: `url(#${id}sky)` });
  for (let i = 0; i < 9; i++) s += circle(HOLE.x + R() * HOLE.w, HOLE.y + 6 + R() * 60, 1.2 + R() * 1.2, { fill: '#fff6c8' });
  s += circle(196, 82, 12, { fill: '#fff3b0' }) + circle(201, 78, 10, { fill: '#5a5cb4' });
  s += path(`M${HOLE.x - 6} 170 q16 -26 34 -10 q14 -22 34 -4 q16 -18 40 2 V200 H${HOLE.x - 6} Z`, { fill: '#2f6b4a', stroke: '#1d4630', strokeWidth: 3 });
  return defs(el('clipPath', { id: `${id}hc` }, path(holePath()))) + g({ clipPath: `url(#${id}hc)` }, s);
}

function closedWindow(x: number, y: number, w: number, h: number): string {
  return path(archPath(x - 7, y - 7, w + 14, h + 10), { fill: FRAME, stroke: FRAME_DK, strokeWidth: 3 }) +
    path(archPath(x, y, w, h), { fill: GLASS, stroke: FRAME_DK, strokeWidth: 2 }) +
    path(`M${x + w / 2} ${y + 2} V${y + h} M${x} ${y + w / 2 + 8} H${x + w} M${x} ${y + w / 2 + 48} H${x + w} M${x} ${y + w / 2 + 88} H${x + w}`, { stroke: FRAME, strokeWidth: 5 }) +
    path(`M${x + 12} ${y + w / 2 + 30} l18 -16 M${x + w / 2 + 12} ${y + w / 2 + 70} l14 -12`, { stroke: '#8fa2ea', strokeWidth: 3, strokeLinecap: 'round', strokeOpacity: 0.8 });
}

function palm(x: number, y: number, s: number, pot: string): string {
  let f = '';
  for (let i = 0; i < 9; i++) {
    const a = -160 + i * 17.5, rr = 62;
    const ex = Math.cos((a * Math.PI) / 180) * rr, ey = Math.sin((a * Math.PI) / 180) * rr * 0.75;
    f += path(`M0 -40 q${r2(ex * 0.4)} ${r2(ey - 30)} ${r2(ex)} ${r2(ey - 10)} q${r2(-ex * 0.5)} ${r2(-ey * 0.2 + 6)} ${r2(-ex)} ${r2(10 - ey)} z`, { fill: i % 2 ? C.grass : C.grassDark, stroke: '#1f5a2c', strokeWidth: 2.5, strokeLinejoin: 'round' });
  }
  return g({ transform: `translate(${x} ${y}) scale(${s})` },
    f, path('M-24 -40 h48 l-6 40 h-36 z', { fill: pot, stroke: dk(pot, 0.5), strokeWidth: 3.5, strokeLinejoin: 'round' }),
    rect(-28, -46, 56, 10, { rx: 4, fill: lt(pot, 0.15), stroke: dk(pot, 0.5), strokeWidth: 3 }));
}

/** the whole hall seen from the gallery (scene coords 800x448), without the separate sprites */
function hall(id: string, withOutside: boolean): string {
  const pat = (pid: string, w: number, h: number, inner: string) => `<pattern id="${pid}" width="${w}" height="${h}" patternUnits="userSpaceOnUse">${inner}</pattern>`;
  let s = defs(
    pat(`${id}st`, 44, 40, rect(0, 0, 44, 40, { fill: STRIPE_A }) + rect(22, 0, 22, 40, { fill: STRIPE_B })),
    pat(`${id}st2`, 44, 40, rect(0, 0, 44, 40, { fill: dk(STRIPE_A, 0.08) }) + rect(22, 0, 22, 40, { fill: dk(STRIPE_B, 0.1) })),
    pat(`${id}tl`, 48, 24, rect(0, 0, 48, 24, { fill: '#efe6cc' }) + path('M0 24 L24 0 M24 24 L48 0 M0 0 L24 24 M24 0 L48 24', { stroke: '#d4c69e', strokeWidth: 2 })),
    linGrad(`${id}sky`, [[0, '#26307a'], [0.6, '#5a4fb0'], [1, '#e08a6a']]),
  );
  // upper wall
  s += rect(0, 0, 800, 224, { fill: `url(#${id}st)` });
  if (withOutside) s += outside(id);
  s += rect(0, 0, 800, 12, { fill: C.woodMid }) + line(0, 12, 800, 12, { stroke: C.woodDeep, strokeWidth: 3 });
  // upper gallery windows (left one is the Fenster sprite, its opening stays transparent here)
  s += path(archPath(HOLE.x - 7, HOLE.y - 7, HOLE.w + 14, HOLE.h + 10), { fill: 'none', stroke: FRAME_DK, strokeWidth: 3 });
  s += closedWindow(318, 50, 96, 142) + closedWindow(512, 50, 96, 142);
  // lower hall wall (under the gallery)
  s += rect(0, 224, 800, 180, { fill: `url(#${id}st2)` });
  s += rect(0, 224, 800, 18, { fill: '#000', fillOpacity: 0.18 });
  s += closedWindow(128, 250, 90, 118) + closedWindow(324, 250, 90, 118);
  // double door
  s += rect(484, 238, 162, 166, { rx: 6, fill: '#d9d5cc', stroke: '#7a766e', strokeWidth: 4 });
  for (const dx of [492, 568]) {
    s += rect(dx, 246, 70, 158, { rx: 4, fill: '#f2efe8', stroke: '#9a958a', strokeWidth: 3 });
    s += rect(dx + 10, 256, 50, 60, { rx: 4, fill: 'none', stroke: '#b8b3a8', strokeWidth: 3 }) + rect(dx + 10, 328, 50, 66, { rx: 4, fill: 'none', stroke: '#b8b3a8', strokeWidth: 3 });
  }
  s += circle(556, 330, 4.5, { fill: C.gold, stroke: C.goldDark, strokeWidth: 2 }) + circle(578, 330, 4.5, { fill: C.gold, stroke: C.goldDark, strokeWidth: 2 });
  // floor
  s += rect(0, 400, 800, 48, { fill: `url(#${id}tl)` }) + line(0, 401, 800, 401, { stroke: '#b9a77a', strokeWidth: 3 });
  // plants
  s += palm(268, 412, 0.9, '#8a6a4a') + palm(600, 440, 1.05, C.red);
  // white piano (bottom left corner)
  s += path('M-4 382 q60 -8 104 22 l-6 14 h-98 z', { fill: '#fbfbf8', stroke: '#8a8f9a', strokeWidth: 4, strokeLinejoin: 'round' }) +
    rect(-4, 412, 104, 14, { fill: '#e6e8ec', stroke: '#8a8f9a', strokeWidth: 3 }) + rect(80, 424, 8, 30, { fill: '#e6e8ec', stroke: '#8a8f9a', strokeWidth: 3 });
  // gallery floor slab
  s += rect(0, 204, 664, 22, { fill: C.wood, stroke: C.woodDeep, strokeWidth: 3 }) + line(0, 209, 664, 209, { stroke: lt(C.wood, 0.3), strokeWidth: 3 });
  // stairs on the right
  s += rect(650, 204, 160, 22, { fill: C.wood, stroke: C.woodDeep, strokeWidth: 3 });
  for (let i = 0; i < 7; i++) {
    const y = 226 + i * 32, x = 664 - i * 4;
    s += rect(x, y, 150, 32, { fill: i % 2 ? C.woodMid : '#9a5e2c', stroke: C.woodDeep, strokeWidth: 3 }) + line(x, y + 4, 800, y + 4, { stroke: lt(C.wood, 0.25), strokeWidth: 2.5 });
  }
  s += path('M664 226 L640 448 H656 L678 226 Z', { fill: C.woodMid, stroke: C.woodDeep, strokeWidth: 3 });
  return s;
}

/** gallery window: frame + sash swinging into the room (1 closed … 6 wide open); canvas = scene 51,43 */
function fenster(f: number, w: number, h: number): string {
  const ox = 51, oy = 43;
  const t = (f - 1) / 5;
  const hx = HOLE.x - ox, hy = HOLE.y - oy, hw = HOLE.w, hh = HOLE.h;
  let s = path(holePath(ox, oy), { fill: 'none', stroke: FRAME, strokeWidth: 10, strokeLinejoin: 'round' }) +
    path(holePath(ox, oy), { fill: 'none', stroke: FRAME_DK, strokeWidth: 2.5 });
  const k = Math.cos((t * 135 * Math.PI) / 180);
  const sash = path(archPath(hx, hy, hw, hh), { fill: GLASS, fillOpacity: 0.92, stroke: FRAME, strokeWidth: 7 }) +
    path(`M${hx + hw / 2} ${hy + 2} V${hy + hh} M${hx} ${hy + hw / 2 + 10} H${hx + hw} M${hx} ${hy + hw / 2 + 48} H${hx + hw}`, { stroke: FRAME, strokeWidth: 5 }) +
    path(`M${hx + 14} ${hy + hw / 2 + 32} l18 -16`, { stroke: '#8fa2ea', strokeWidth: 3, strokeLinecap: 'round', opacity: 0.85 }) +
    path(archPath(hx, hy, hw, hh), { fill: 'none', stroke: FRAME_DK, strokeWidth: 2 });
  const grow = 1 + 0.1 * Math.sin(t * Math.PI * 0.75);
  s += g({ transform: `translate(${hx} ${hy + hh / 2}) scale(${r2(Math.abs(k) < 0.04 ? 0.04 : k)} ${r2(grow)}) translate(${-hx} ${-(hy + hh / 2)})` }, sash);
  if (Math.abs(k) < 0.25) s += rect(hx - 4, hy + 4, 8, hh - 4, { rx: 3, fill: FRAME, stroke: FRAME_DK, strokeWidth: 2 });
  void w; void h;
  return s;
}

/** Ming vase (white porcelain, blue pattern), fills the canvas */
function vase(id: string, w: number, h: number): string {
  const sx = w / 64, sy = h / 88;
  const body = 'M22 6 h20 v6 q-3 4 -2 10 q20 14 18 38 q-2 18 -12 24 h-28 q-10 -6 -12 -24 q-2 -24 18 -38 q1 -6 -2 -10 z';
  return g({ transform: `scale(${r2(sx)} ${r2(sy)})` },
    defs(el('clipPath', { id: `${id}c` }, path(body))),
    path(body, { fill: '#f8f8fc', stroke: '#2a3a7a', strokeWidth: 3.5, strokeLinejoin: 'round' }),
    g({ clipPath: `url(#${id}c)` },
      rect(0, 24, 64, 7, { fill: '#2f5fb8' }), rect(0, 74, 64, 6, { fill: '#2f5fb8' }),
      path('M14 52 q6 -10 12 0 t12 0 t12 0', { fill: 'none', stroke: '#2f5fb8', strokeWidth: 3, strokeLinecap: 'round' }),
      circle(32, 50, 6, { fill: 'none', stroke: '#2f5fb8', strokeWidth: 2.5 }), circle(18, 62, 3, { fill: '#2f5fb8' }), circle(46, 62, 3, { fill: '#2f5fb8' })),
    rect(20, 3, 24, 6, { rx: 2, fill: '#f8f8fc', stroke: '#2a3a7a', strokeWidth: 3 }),
    path('M16 36 q-4 10 -2 22', { fill: 'none', stroke: C.white, strokeWidth: 3.5, strokeLinecap: 'round' }));
}

/** grappling hook lying on the floor */
function haken(w: number, h: number): string {
  return path(`M4 ${h - 8} q4 -8 14 -8 h10`, { fill: 'none', stroke: '#3a4458', strokeWidth: 6, strokeLinecap: 'round' }) +
    path(`M4 ${h - 8} q4 -8 14 -8 h10`, { fill: 'none', stroke: '#8e9ab2', strokeWidth: 2.5, strokeLinecap: 'round' }) +
    path('M28 6 v8 q0 6 -6 6 M28 14 q0 -6 5 -9', { fill: 'none', stroke: '#3a4458', strokeWidth: 4.5, strokeLinecap: 'round' }) +
    circle(28, 4, 3, { fill: 'none', stroke: '#3a4458', strokeWidth: 2.5 });
}

function chain(x1: number, y1: number, x2: number, y2: number): string {
  const n = Math.max(2, Math.round(Math.hypot(x2 - x1, y2 - y1) / 11));
  const a = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
  let s = '';
  for (let i = 0; i < n; i++) {
    const x = x1 + ((x2 - x1) * (i + 0.5)) / n, y = y1 + ((y2 - y1) * (i + 0.5)) / n;
    s += ellipse(x, y, 7, i % 2 ? 2.2 : 4, { fill: 'none', stroke: '#22202a', strokeWidth: 3, transform: `rotate(${r2(a)} ${r2(x)} ${r2(y)})` });
  }
  return s;
}

/** railing of the gallery + chandelier (canvas = scene 0,163) */
function railing(w: number, h: number): string {
  let s = '';
  // chandelier (behind the railing)
  const cx = 314, cy = 92;
  s += chain(0 + 250 - 0, 0, cx - 120, cy - 4) + chain(314, 0, cx, cy - 16) + chain(378, 0, cx + 120, cy - 4);
  s += ellipse(cx, cy, 134, 22, { fill: 'none', stroke: '#22202a', strokeWidth: 7 }) + ellipse(cx, cy, 134, 22, { fill: 'none', stroke: '#4a4656', strokeWidth: 2 });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    const x = cx + Math.cos(a) * 134, y = cy + Math.sin(a) * 22;
    s += path(`M${r2(x)} ${r2(y)} q0 18 ${r2(Math.cos(a) * 8)} 22`, { fill: 'none', stroke: '#22202a', strokeWidth: 4 });
    s += path(`M${r2(x - 16)} ${r2(y - 6)} q16 16 32 0 z`, { fill: '#2c2a34', stroke: '#16141c', strokeWidth: 3 });
    s += rect(x - 10, y - 46, 20, 40, { rx: 4, fill: '#fbf6ea', stroke: '#a49c86', strokeWidth: 2.5 });
    s += path(`M${r2(x)} ${r2(y - 62)} q6 8 0 14 q-6 -6 0 -14 z`, { fill: C.yellow, stroke: '#e08a1a', strokeWidth: 2 });
  }
  // top rail with balusters, curving down the stairs at the right
  for (let x = 14; x < 668; x += 46) {
    s += rect(x - 7, 12, 14, 32, { rx: 7, fill: 'none', stroke: '#e3a464', strokeWidth: 6 }) + rect(x - 7, 12, 14, 32, { rx: 7, fill: 'none', stroke: '#9a5e2c', strokeWidth: 1.5 });
  }
  for (let i = 0; i < 4; i++) {
    const x = 684 + i * 6, y = 30 + i * 36;
    s += line(x, y, x, y + 26, { stroke: '#e3a464', strokeWidth: 6, strokeLinecap: 'round' });
  }
  s += path(`M0 8 H664 q30 0 34 26 L${w - 6} ${h - 2}`, { fill: 'none', stroke: '#9a5e2c', strokeWidth: 15, strokeLinecap: 'round', strokeLinejoin: 'round' });
  s += path(`M0 8 H664 q30 0 34 26 L${w - 6} ${h - 2}`, { fill: 'none', stroke: '#eab47a', strokeWidth: 10, strokeLinecap: 'round', strokeLinejoin: 'round' });
  s += path('M0 5 H660', { stroke: '#fbd7a8', strokeWidth: 2.5 });
  return s;
}

/** Bongo with a double bass (canvas right-aligned, local box 73x121) */
function bass(f: number, w: number, h: number): string {
  const p = (f - 1) / 10;
  const pluck = Math.sin(p * Math.PI * 4);
  const ox = w - 73;
  let s = '';
  // Bongo body
  s += rect(22, 4, 54, 130, { rx: 18, fill: C.orange, stroke: C.orangeDark, strokeWidth: 4 });
  s += path('M22 26 q0 -22 22 -22 h14 q18 0 18 22 z', { fill: C.bandana, stroke: C.bandanaDark, strokeWidth: 3.5 });
  for (const [x, y] of [[34, 14], [50, 10], [64, 18]]) s += circle(x, y, 2.6, { fill: C.white });
  s += ellipse(42, 40, 8, 10, { fill: C.white, stroke: C.ink, strokeWidth: 3 }) + ellipse(60, 40, 8, 10, { fill: C.white, stroke: C.ink, strokeWidth: 3 });
  s += circle(40, 42, 3.8, { fill: C.eyeBlue }) + circle(58, 42, 3.8, { fill: C.eyeBlue }) + circle(39, 41, 1.3, { fill: C.white }) + circle(57, 41, 1.3, { fill: C.white });
  if (f === 6) s += path('M33 38 q9 -8 18 0 M51 38 q9 -8 18 0', { fill: C.orange, stroke: C.ink, strokeWidth: 3 });
  s += ellipse(51, 52, 5, 4, { fill: C.nose, stroke: C.orangeDark, strokeWidth: 2 });
  s += path('M42 60 q9 8 18 0', { fill: 'none', stroke: C.ink, strokeWidth: 3, strokeLinecap: 'round' });
  // double bass
  s += line(26, 0, 30, 70, { stroke: '#3a2412', strokeWidth: 6, strokeLinecap: 'round' });
  s += path('M10 74 q-8 -14 6 -22 q10 -2 18 2 q14 -2 18 10 q4 10 -4 16 q12 10 8 26 q-4 18 -24 18 q-24 0 -28 -20 q-2 -18 6 -30 z', { fill: '#b8682e', stroke: '#4a2a10', strokeWidth: 3.5, strokeLinejoin: 'round' });
  s += path('M24 70 v40 M32 70 v40', { stroke: '#f2e2c0', strokeWidth: 1.4 });
  s += path('M16 84 q-3 4 0 8 M42 84 q3 4 0 8', { fill: 'none', stroke: '#2a1808', strokeWidth: 2.5, strokeLinecap: 'round' });
  s += rect(20, 104, 16, 5, { rx: 2, fill: '#2a1808' });
  // hands (white gloves): one on the neck, one plucking
  s += ellipse(28, 58, 9, 7,{ fill: C.white, stroke: '#8a8a9a', strokeWidth: 2.5 });
  s += ellipse(40 + pluck * 4, 82 + pluck * 3, 9, 7, { fill: C.white, stroke: '#8a8a9a', strokeWidth: 2.5 });
  void h;
  return g({ transform: `translate(${ox} 0)` }, s);
}

/** butler watching the gallery, turning away and leaving (frame 19 = gone) */
function butler(f: number, w: number, h: number): string {
  if (f >= 19) return rect(0, 0, w, h, { fill: 'none' });
  const turn = f <= 8 ? 0 : Math.min(1, (f - 8) / 4);
  const leave = f <= 12 ? 0 : (f - 12) / 6;
  const look: [number, number] = f <= 8 ? [Math.sin(f) * 0.4, -0.9] : [1, -0.2];
  const bob = f <= 8 ? Math.sin((f - 1) * 0.8) * 1.5 : 0;
  return butlerAt(41 + leave * 30, 82 + bob + leave * 110, 0.78, { look, turn, bored: f >= 3 && f <= 4 });
}

function intro(): string {
  const k = 0.4;
  const pic = g({ transform: `scale(${k})` },
    hall('ip', true), g({ transform: 'translate(250 0)' }, chainsOnly(128, 163)), g({ transform: 'translate(0 163)' }, railing(710, 179)),
    butlerAt(438, 440, 0.78, { look: [0, -0.9] }), g({ transform: 'translate(690 132)' }, vase('iv', 64, 88)));
  return introScreen({
    id: 'gs91', device: 'mouse', picture: pic,
    lines: ['Die Galerie – von hier oben sieht man die ganze Halle!', 'Aber der Butler lässt Bongo und Pucki nicht aus den Augen.', 'Wie könnte man ihn bloß ablenken?'],
  });
}

function chainsOnly(w: number, h: number): string {
  return chain(64, 0, 64, h - 40) + chain(64, h - 40, 0, h) + chain(64, h - 40, 64, h) + chain(64, h - 40, w, h) +
    circle(64, h - 40, 6, { fill: '#22202a' });
}

/** Composing-3: wall slice (scene 113,47) with the window opening cut out (vase falls behind it) */
function composing3(w: number, h: number): string {
  const ox = 113, oy = 47;
  return `<mask id="c3m" maskUnits="userSpaceOnUse" x="0" y="0" width="${w}" height="${h}">` +
    rect(0, 0, w, h, { fill: '#fff' }) + path(holePath(ox, oy), { fill: '#000' }) + '</mask>' +
    g({ mask: 'url(#c3m)' }, svgOf(hall('c3', false), ox, oy, w, h));
}

/** nested svg viewport showing the scene rect x,y,w,h (avoids huge off-canvas layers) */
const svgOf = (body: string, x: number, y: number, w: number, h: number) => `<svg x="0" y="0" width="${w}" height="${h}" viewBox="${x} ${y} ${w} ${h}">${body}</svg>`;

const vaseArt =(m: Member, w: number, h: number) => vase(`v${m.frame}`, w, h);

export default defineMovie({
  Headline: (m, w, h) => headline('Auf der Galerie', w, h),
  Intro: () => intro(),
  Background: () => hall('bg', true),
  'Composing-1': (m, w, h) => chainsOnly(w, h),
  'Composing-2': (m, w, h) => railing(w, h),
  'Composing-3': (m, w, h) => composing3(w, h),
  'Fenster-*': (m, w, h) => fenster(m.frame ?? 1, w, h),
  'Vase-*': vaseArt,
  Haken: (m, w, h) => haken(w, h),
  'Bass-*': (m, w, h) => bass(m.frame ?? 1, w, h),
  'Butler-*': (m, w, h) => butler(m.frame ?? 1, w, h),
});

void atReg; void dk;
