// Menu-screen kit (Interface_* movies, chapter card, intro): plank table backdrop, palm-frond fringes,
// gold labels, glass bubbles/pills, round yes/no buttons, invisible-ish hit bars, character portraits.
// All functions return SVG bodies in canvas pixels.

import { C, circle, dk, ellipse, g, linGrad, lt, path, r2, radGrad, rect, rng } from './svg';
import { fitText } from './ui';
import { bongo, pucki } from './characters';
import { npcFitted, type NpcId } from './npcs';
import type { MovieArt } from './api';

export const GOLD = '#ffd23f';
export const GOLD_EDGE = '#4a2a10';

/** gold label text (centred by default) */
export function goldText(s: string, x: number, y: number, maxW: number, size: number, anchor: 'start' | 'middle' | 'end' = 'middle', fill = GOLD): string {
  return fitText(s, x, y, maxW, size, { fill, anchor, stroke: GOLD_EDGE, sw: Math.max(2, size * 0.16) });
}

/** horizontal plank table (x0,y0 = offset for crops of the same backdrop) */
export function planks(w: number, h: number, id: string, o: { seed?: string; ox?: number; oy?: number; base?: string; vignette?: boolean } = {}): string {
  const R = rng(o.seed ?? 'planks');
  const ox = o.ox ?? 0, oy = o.oy ?? 0;
  const base = o.base ?? '#a8763e';
  const ph = 32;
  let s = rect(0, 0, w, h, { fill: base });
  let body = '';
  for (let i = 0; i * ph < 600; i++) {
    const y = i * ph;
    const tint = R();
    const col = tint < 0.33 ? base : tint < 0.66 ? lt(base, 0.07) : dk(base, 0.07);
    body += rect(-10, y, 1000, ph, { fill: col });
    // grain
    for (let k = 0; k < 5; k++) {
      const gx = R() * 820 - 20, gy = y + 6 + R() * (ph - 12), gl = 40 + R() * 120;
      body += path(`M${r2(gx)} ${r2(gy)} q${r2(gl / 2)} ${r2(R() * 5 - 2.5)} ${r2(gl)} 0`, { fill: 'none', stroke: dk(base, 0.4), strokeWidth: 1.4, opacity: 0.35, strokeLinecap: 'round' });
    }
    if (R() < 0.5) { const kx = R() * 800, ky = y + ph / 2; body += ellipse(kx, ky, 7, 3.5, { fill: 'none', stroke: dk(base, 0.4), strokeWidth: 1.4, opacity: 0.45 }); }
    // joint + highlight
    body += rect(-10, y, 1000, 2.5, { fill: dk(base, 0.55), opacity: 0.8 }) + rect(-10, y + 2.5, 1000, 1.5, { fill: lt(base, 0.3), opacity: 0.4 });
    const jx = (i * 233) % 800 + 60;
    body += rect(jx, y, 2.5, ph, { fill: dk(base, 0.55), opacity: 0.7 }) + circle(jx - 9, y + ph / 2, 2.2, { fill: dk(base, 0.6) }) + circle(jx + 11, y + ph / 2, 2.2, { fill: dk(base, 0.6) });
  }
  s += g({ transform: `translate(${-ox} ${-oy})` }, body);
  if (o.vignette !== false) {
    s += `<defs>${radGrad(`${id}v`, [[0, '#000', 0], [0.7, '#000', 0.05], [1, '#000', 0.4]], 0.5, 0.5, 0.75)}</defs>`;
    s += g({ transform: `translate(${-ox} ${-oy})` }, rect(0, 0, 800, 448, { fill: `url(#${id}v)` }));
  }
  return s;
}

/** one palm frond: stem from (x,y) in direction ang (deg), length len, bending by bend (deg) */
export function frond(x: number, y: number, ang: number, len: number, bend: number, seed: string, col = '#4f9e3a'): string {
  const R = rng(seed);
  const pts: [number, number, number][] = [];
  const n = 14;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = ((ang + bend * t * t) * Math.PI) / 180;
    const prev = pts[i - 1] ?? [x, y, a];
    const step = len / n;
    pts.push(i === 0 ? [x, y, a] : [prev[0] + Math.cos(a) * step, prev[1] + Math.sin(a) * step, a]);
  }
  const dark = dk(col, 0.45), light = lt(col, 0.12);
  let leaves = '';
  for (let i = 1; i < n; i++) {
    const [px, py, a] = pts[i];
    const t = i / n;
    const ll = len * (0.36 - 0.24 * t) * (0.85 + R() * 0.3);
    for (const side of [-1, 1]) {
      const la = a + side * (0.95 + R() * 0.25) + 0.25 * Math.sign(bend || 1) * side * 0;
      const ex = px + Math.cos(la) * ll, ey = py + Math.sin(la) * ll + ll * 0.3;
      const dx = ex - px, dy = ey - py, L = Math.hypot(dx, dy) || 1;
      const ww = ll * 0.17, qx = (-dy / L) * ww, qy = (dx / L) * ww;
      const mx = px + dx * 0.45, my = py + dy * 0.45;
      const c = side < 0 ? col : light;
      leaves += path(`M${r2(px)} ${r2(py)} Q${r2(mx + qx)} ${r2(my + qy)} ${r2(ex)} ${r2(ey)} Q${r2(mx - qx)} ${r2(my - qy)} ${r2(px)} ${r2(py)} Z`,
        { fill: c, stroke: dark, strokeWidth: 2, strokeLinejoin: 'round' });
    }
  }
  const stem = 'M' + pts.map((p) => `${r2(p[0])} ${r2(p[1])}`).join(' L');
  return leaves + path(stem, { fill: 'none', stroke: dark, strokeWidth: 4, strokeLinecap: 'round' }) + path(stem, { fill: 'none', stroke: lt(col, 0.4), strokeWidth: 1.5, strokeLinecap: 'round' });
}

/** palm fringe along the top and/or bottom edge of an 800x448 screen (shadows included) */
export function palmFringe(w: number, h: number, seed: string, o: { top?: boolean; bottom?: boolean; shadow?: boolean } = {}): string {
  const R = rng(seed);
  const top = o.top ?? true, bottom = o.bottom ?? true;
  const fr: string[] = [];
  const add = (x: number, y: number, ang: number, len: number, bend: number, k: string, col: string) => {
    if (o.shadow !== false) fr.push(g({ transform: 'translate(10 14)', opacity: 0.22 }, frond(x, y, ang, len, bend, k, '#000').replace(/stroke="[^"]+"/g, 'stroke="none"')));
    fr.push(frond(x, y, ang, len, bend, k, col));
  };
  const cols = ['#4f9e3a', '#5fb85a', '#3f8f45'];
  if (top) for (let i = 0; i < 8; i++) {
    const x = (i + 0.2 + R() * 0.5) * (w / 7.5) - 40;
    const left = R() < 0.5;
    add(x, -20, left ? 160 - R() * 30 : 20 + R() * 30, 150 + R() * 70, left ? -40 : 40, `${seed}t${i}`, cols[i % 3]);
  }
  if (bottom) for (let i = 0; i < 9; i++) {
    const x = (i + R() * 0.6) * (w / 8) - 20;
    const left = R() < 0.5;
    add(x, h + 25, left ? -150 + R() * 25 : -30 - R() * 25, 140 + R() * 60, left ? 35 : -35, `${seed}b${i}`, cols[(i + 1) % 3]);
  }
  return fr.join('');
}

/** standard menu backdrop: planks + palm fringes top and bottom */
export const menuBackdrop = (w: number, h: number, seed: string, o: { top?: boolean; bottom?: boolean } = {}) =>
  planks(w, h, `pl${seed}`, { seed: 'planks' }) + palmFringe(w, h, seed, o);

/** empty glass bubble (sockets, portrait frames) */
export function glassBubble(cx: number, cy: number, r: number, id: string, fill = 'rgba(255,255,255,0.12)'): string {
  return `<defs>${radGrad(id, [[0, '#fff', 0.05], [0.8, '#fff', 0.12], [1, '#fff', 0.35]])}</defs>` +
    circle(cx + 3, cy + 4, r, { fill: '#000', opacity: 0.18 }) +
    circle(cx, cy, r, { fill }) + circle(cx, cy, r, { fill: `url(#${id})`, stroke: 'rgba(255,255,255,0.75)', strokeWidth: 3 }) +
    path(`M${r2(cx - r * 0.62)} ${r2(cy - r * 0.35)} q${r2(r * 0.22)} ${r2(-r * 0.38)} ${r2(r * 0.62)} ${r2(-r * 0.45)}`, { fill: 'none', stroke: '#fff', strokeWidth: Math.max(2, r * 0.1), strokeLinecap: 'round', opacity: 0.75 });
}

/** opaque round plate with a picture inside (menu choices, portraits) */
export function plate(cx: number, cy: number, r: number, id: string, inner: string, bg = '#bfe6f7'): string {
  return `<defs><clipPath id="${id}c"><circle cx="${r2(cx)}" cy="${r2(cy)}" r="${r2(r - 3)}"/></clipPath>${linGrad(`${id}g`, [[0, lt(bg, 0.3)], [1, bg]])}</defs>` +
    circle(cx + 3, cy + 4, r, { fill: '#000', opacity: 0.25 }) +
    circle(cx, cy, r, { fill: `url(#${id}g)` }) + g({ 'clip-path': `url(#${id}c)` }, inner) +
    circle(cx, cy, r - 1.5, { fill: 'none', stroke: '#fff', strokeWidth: 4 }) + circle(cx, cy, r, { fill: 'none', stroke: C.uiDark, strokeWidth: 2.5 }) +
    path(`M${r2(cx - r * 0.6)} ${r2(cy - r * 0.45)} q${r2(r * 0.25)} ${r2(-r * 0.35)} ${r2(r * 0.65)} ${r2(-r * 0.42)}`, { fill: 'none', stroke: '#fff', strokeWidth: Math.max(2, r * 0.08), strokeLinecap: 'round', opacity: 0.7 });
}

/** menu choice: round plate on top, gold caption (1-2 lines) below */
export function choice(w: number, h: number, id: string, lines: string[], inner: (cx: number, cy: number, r: number) => string, bg?: string): string {
  const lh = 18;
  const capH = lines.length * lh + 2;
  const r = Math.min(w / 2 - 4, (h - capH) / 2 - 3);
  const cx = w / 2, cy = r + 3;
  return plate(cx, cy, r, id, inner(cx, cy, r), bg) + lines.map((l, i) => goldText(l, w / 2, h - capH + lh * i + lh / 2, w - 2, 17)).join('');
}

/** glass rim pill with gold label (settings) */
export function glassPill(label: string, w: number, h: number): string {
  return rect(2, 2, w - 4, h - 4, { rx: (h - 4) / 2, fill: 'rgba(255,255,255,0.14)', stroke: 'rgba(255,255,255,0.7)', strokeWidth: 2.5 }) +
    rect(4, h - 6, w - 8, 2, { rx: 1, fill: '#000', opacity: 0.2 }) + goldText(label, w / 2, h / 2 + 1, w - h, h * 0.6);
}

/** clickable but nearly invisible bar (hit areas of text menus) */
export function hitBar(w: number, h: number): string {
  return rect(0, 0, w, h, { rx: h / 2, fill: '#fff', opacity: 0.12 });
}

/** round JA / NEIN button */
export function roundButton(label: string, w: number, h: number, yes: boolean): string {
  const r = Math.min(w, h) / 2 - 5, cx = w / 2, cy = h / 2;
  const col = yes ? '#5fb85a' : C.red;
  return circle(cx + 2, cy + 3, r, { fill: '#000', opacity: 0.25 }) +
    circle(cx, cy, r, { fill: '#fdf6e3', stroke: '#8a8070', strokeWidth: 3 }) + circle(cx, cy, r - 7, { fill: col, stroke: dk(col, 0.45), strokeWidth: 2.5 }) +
    path(`M${cx - r * 0.5} ${cy - r * 0.35} q${r * 0.3} ${-r * 0.3} ${r * 0.7} ${-r * 0.3}`, { fill: 'none', stroke: '#fff', strokeWidth: 3, strokeLinecap: 'round', opacity: 0.6 }) +
    fitText(label, cx, cy + 1, r * 1.5, r * 0.62, { fill: '#fff', anchor: 'middle', stroke: dk(col, 0.5), sw: 3 });
}

/** Bongo (k = scale, origin = his loc at 100 %) */
export function bongoAt(x: number, y: number, k: number, pose: Parameters<typeof bongo>[1] = {}, flip = false): string {
  return g({ transform: `translate(${r2(x)} ${r2(y)}) scale(${r2(flip ? -k : k)} ${r2(k)})` }, bongo(k, pose));
}

export function puckiAt(x: number, y: number, k: number, pose: Parameters<typeof pucki>[1] = {}, flip = false): string {
  return g({ transform: `translate(${r2(x)} ${r2(y)}) scale(${r2(flip ? -k : k)} ${r2(k)})` }, pucki(k, pose));
}

export type Who9 = 'Bingo' | 'Puck' | NpcId;
export const CAST9: Who9[] = ['Bingo', 'Puck', 'Reeling', 'Alfred', 'Magnus', 'Ben', 'Arnold', 'Tim', 'Rocco'];
export const NAME9: Record<Who9, string> = { Bingo: 'Bongo', Puck: 'Pucki', Reeling: 'Käpt’n Reling', Alfred: 'Alfons', Magnus: 'Mats', Ben: 'Bert', Arnold: 'Arno', Tim: 'Tom', Rocco: 'Rocko' };

/** head-and-shoulders portrait of any character, filling a circle of radius r at (cx,cy) */
export function portrait(who: Who9, cx: number, cy: number, r: number): string {
  if (who === 'Bingo') return bongoAt(cx, cy + r * 0.62, r / 95, { mouth: 3 });
  if (who === 'Puck') { const k = r / 62; return puckiAt(cx - 35 * k, cy - 16 * k + r * 0.12, k, { mouth: 3 }); }
  const s = r * 2.6;
  return g({ transform: `translate(${r2(cx - s / 2)} ${r2(cy - r * 0.95)})` }, npcFitted(who, s, s * 1.0, { mouth: 3 }));
}

/** save-slot members of Interface_File/Load: ButtonN (hit bar), SaveN-0 (free slot), SaveN-1 (used slot) */
export function slotMembers(): MovieArt {
  const a: MovieArt = {};
  for (let i = 1; i <= 8; i++) {
    a[`Button${i}`] = (m, w, h) => hitBar(w, h);
    a[`Save${i}-*`] = (m, w, h) => (m.frame === 1
      ? goldText(`– Spielstand ${i} –`, w / 2, h / 2 + 1, w - 6, 20)
      : goldText('– freier Speicherplatz –', w / 2, h / 2 + 1, w - 6, 20, 'middle', '#e8d8a8'));
  }
  return a;
}

/** lesson exit strip (50x448): arrows top/bottom + vertical "AUSGANG" */
export function exitStrip(w: number, h: number, left: boolean): string {
  const arrow = (cy: number) => path(left ? `M${w / 2 + 8} ${cy - 14} L${w / 2 - 10} ${cy} L${w / 2 + 8} ${cy + 14} Z` : `M${w / 2 - 8} ${cy - 14} L${w / 2 + 10} ${cy} L${w / 2 - 8} ${cy + 14} Z`,
    { fill: GOLD, stroke: GOLD_EDGE, strokeWidth: 2.5, strokeLinejoin: 'round' });
  return rect(0, 0, w, h, { fill: '#2a1d6b', opacity: 0.22 }) + arrow(30) + arrow(h - 30) +
    'AUSGANG'.split('').map((ch, i) => goldText(ch, w / 2, h / 2 - 78 + i * 26, 30, 22)).join('');
}

/** status-bar caption "Hosentasche" with lines left/right, centred at (cx, cy) */
export function pocketCaption(cx: number, cy: number, w: number): string {
  const tw = 86;
  return path(`M${cx - w / 2 + 2} ${cy + 4} v-4 H${cx - tw / 2 - 4} M${cx + tw / 2 + 4} ${cy} H${cx + w / 2 - 2} v4`, { fill: 'none', stroke: GOLD, strokeWidth: 2 }) +
    fitText('Hosentasche', cx, cy, tw, 14, { fill: GOLD, anchor: 'middle' });
}

/** little floppy disk icon */
export function floppy(cx: number, cy: number, s: number): string {
  const x = cx - s / 2, y = cy - s / 2;
  return rect(x, y, s, s, { rx: s * 0.08, fill: '#3a4a6a', stroke: '#1d2540', strokeWidth: Math.max(2, s * 0.05) }) +
    rect(x + s * 0.22, y + 2, s * 0.56, s * 0.32, { fill: '#c8ccd6', stroke: '#1d2540', strokeWidth: 2 }) + rect(x + s * 0.6, y + s * 0.06, s * 0.1, s * 0.22, { fill: '#3a4a6a' }) +
    rect(x + s * 0.14, y + s * 0.5, s * 0.72, s * 0.44, { rx: 3, fill: '#fdf6e3', stroke: '#1d2540', strokeWidth: 2 }) +
    path(`M${x + s * 0.22} ${y + s * 0.64} h${s * 0.56} M${x + s * 0.22} ${y + s * 0.76} h${s * 0.56}`, { stroke: C.blue, strokeWidth: 2 });
}

/** fat arrow pointing right (or left with flip) */
export function fatArrow(cx: number, cy: number, s: number, flip = false): string {
  const d = `M${-s * 0.5} ${-s * 0.18} h${s * 0.5} v${-s * 0.2} l${s * 0.45} ${s * 0.38} l${-s * 0.45} ${s * 0.38} v${-s * 0.2} h${-s * 0.5} z`;
  return g({ transform: `translate(${r2(cx)} ${r2(cy)}) scale(${flip ? -1 : 1} 1)` }, path(d, { fill: '#fdf6e3', stroke: '#6a6070', strokeWidth: 3, strokeLinejoin: 'round' }));
}

/** treasure chest icon (closed or open with glow) */
export function chest(cx: number, cy: number, r: number, open = false): string {
  const glow = open ? circle(cx, cy - r * 0.3, r * 0.9, { fill: GOLD, opacity: 0.45 }) : '';
  const lid = open
    ? path(`M${cx - r} ${cy - r * 0.2} l${r * 0.15} ${-r * 0.75} h${r * 1.7} l${r * 0.15} ${r * 0.75} z`, { fill: lt(C.wood, 0.15), stroke: C.woodDeep, strokeWidth: 3, strokeLinejoin: 'round' }) +
      ellipse(cx, cy - r * 0.2, r * 0.85, r * 0.2, { fill: C.gold, stroke: C.goldDark, strokeWidth: 2 }) +
      [[-0.4, -0.3], [0.1, -0.38], [0.45, -0.28]].map(([dx, dy]) => circle(cx + r * dx, cy + r * dy, r * 0.16, { fill: C.gold, stroke: C.goldDark, strokeWidth: 1.5 })).join('')
    : path(`M${cx - r} ${cy - r * 0.2} q0 ${-r * 0.8} ${r} ${-r * 0.8} q${r} 0 ${r} ${r * 0.8} z`, { fill: lt(C.wood, 0.15), stroke: C.woodDeep, strokeWidth: 3 });
  return glow + rect(cx - r, cy - r * 0.2, r * 2, r * 1.1, { rx: 4, fill: C.wood, stroke: C.woodDeep, strokeWidth: 3 }) + lid +
    rect(cx - r * 0.18, cy - r * 0.3, r * 0.36, r * 0.45, { rx: 2, fill: C.yellow, stroke: C.yellowDark, strokeWidth: 2 }) + path(`M${cx - r} ${cy + r * 0.4} h${r * 2}`, { stroke: C.yellow, strokeWidth: 3 });
}

/** open book icon */
export function bookIcon(cx: number, cy: number, r: number): string {
  return path(`M${cx} ${cy - r * 0.45} q${-r * 0.5} ${-r * 0.3} ${-r} 0 v${r * 1.0} q${r * 0.5} ${-r * 0.3} ${r} 0 q${r * 0.5} ${-r * 0.3} ${r} 0 v${-r * 1.0} q${-r * 0.5} ${-r * 0.3} ${-r} 0 z`, { fill: '#fdf6e3', stroke: C.ink, strokeWidth: 3, strokeLinejoin: 'round' }) +
    path(`M${cx} ${cy - r * 0.45} v${r * 1.0}`, { stroke: C.ink, strokeWidth: 2.5 }) +
    path(`M${cx - r * 0.75} ${cy - r * 0.1} h${r * 0.55} M${cx - r * 0.75} ${cy + r * 0.12} h${r * 0.55} M${cx + r * 0.2} ${cy - r * 0.1} h${r * 0.55} M${cx + r * 0.2} ${cy + r * 0.12} h${r * 0.4}`, { stroke: C.blue, strokeWidth: 2.5, strokeLinecap: 'round' });
}

/** pair of patched trousers (the pocket symbol) */
export function trousers(cx: number, cy: number, s: number): string {
  const k = s / 100;
  return g({ transform: `translate(${r2(cx)} ${r2(cy)}) scale(${r2(k)})` },
    path('M-42 -48 h84 l6 92 h-36 l-12 -60 l-12 60 h-36 z', { fill: '#c99a2e', stroke: '#6a4a10', strokeWidth: 4, strokeLinejoin: 'round' }),
    rect(-44, -56, 88, 12, { rx: 3, fill: '#b5861e', stroke: '#6a4a10', strokeWidth: 3.5 }),
    rect(-32, -36, 24, 22, { rx: 4, fill: '#ead27a', stroke: '#6a4a10', strokeWidth: 2.5, transform: 'rotate(-6 -20 -25)' }),
    rect(10, -34, 22, 22, { rx: 4, fill: '#ead27a', stroke: '#6a4a10', strokeWidth: 2.5, transform: 'rotate(5 21 -23)' }),
    path('M-26 -31 l12 0 M14 -29 l12 0', { stroke: '#6a4a10', strokeWidth: 1.5, strokeDasharray: '2 2' }));
}
