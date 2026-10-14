// Scene building blocks (side view, like the adventure screens): doors and windows with open/close
// frames, outside views, furniture, wall decoration. All draw into a member canvas (0..w, 0..h)
// unless a function takes explicit coordinates.

import { C, circle, dk, ellipse, g, line, linGrad, lt, path, r2, rect } from './svg';
import { bush, flowers } from './nature';

/** small outdoor view (sky, hills, garden) filling x,y,w,h – seen through doors/windows */
export function outsideView(x: number, y: number, w: number, h: number, id: string): string {
  return `<defs>${linGrad(id, [[0, C.sky], [1, C.skyLight]])}<clipPath id="${id}c"><rect x="${x}" y="${y}" width="${w}" height="${h}"/></clipPath></defs>` +
    g({ clipPath: `url(#${id}c)` },
      rect(x, y, w, h, { fill: `url(#${id})` }),
      ellipse(x + w * 0.3, y + h * 0.22, w * 0.18, h * 0.06, { fill: C.white, opacity: 0.9 }),
      path(`M${x} ${y + h * 0.7} q${w * 0.3} ${-h * 0.14} ${w * 0.55} ${-h * 0.04} q${w * 0.3} ${h * 0.1} ${w * 0.45} ${-h * 0.06} V${y + h} H${x} Z`, { fill: C.grass }),
      path(`M${x} ${y + h * 0.82} q${w * 0.5} ${-h * 0.08} ${w} 0 V${y + h} H${x} Z`, { fill: C.grassDark, opacity: 0.6 }),
      bush(x + w * 0.75, y + h * 0.7, Math.min(w, h) * 0.12, `${id}b`),
      flowers(x + w * 0.3, y + h * 0.88, 3, `${id}f`));
}

/**
 * Door that opens (frame 1 = closed … n = wide open). The canvas is the door opening incl. frame.
 * hinge: 'left' | 'right' (where the leaf is fixed). The leaf swings towards the viewer (gets wider + darker).
 */
export function doorFrames(f: number, n: number, w: number, h: number, o: { hinge?: 'left' | 'right'; wood?: string; frameCol?: string; id?: string; outside?: string } = {}): string {
  const t = Math.max(0, Math.min(1, (f - 1) / Math.max(1, n - 1)));
  const wood = o.wood ?? C.wood, fr = o.frameCol ?? '#7a3f18';
  const id = o.id ?? `door${f}`;
  const b = 8; // frame width
  const ox = b, oy = b, ow = w - 2 * b, oh = h - b;
  let s = rect(0, 0, w, h, { rx: 8, fill: fr }) + (o.outside ?? outsideView(ox, oy, ow, oh, `${id}o`));
  // leaf: closed = fills the opening; opening = perspective trapezoid narrowing (cos) and growing in height
  const k = Math.cos((t * Math.PI) / 2 * 0.92);
  const lw = Math.max(6, ow * k);
  const grow = 10 * (1 - k);
  const hingeLeft = (o.hinge ?? 'left') === 'left';
  const x0 = hingeLeft ? ox : ox + ow - lw;
  const near = hingeLeft ? x0 + lw : x0; // free edge comes closer → taller
  const pts = hingeLeft
    ? `M${x0} ${oy} L${near} ${oy - grow} L${near} ${oy + oh + grow * 0.3} L${x0} ${oy + oh} Z`
    : `M${near} ${oy - grow} L${x0 + lw} ${oy} L${x0 + lw} ${oy + oh} L${near} ${oy + oh + grow * 0.3} Z`;
  const shade = dk(wood, 0.25 * t);
  s += path(pts, { fill: shade, stroke: dk(wood, 0.5), strokeWidth: 4, strokeLinejoin: 'round' });
  if (k > 0.35) {
    // panels + knob on the free side
    const px = x0 + lw * 0.14, pw = lw * 0.72;
    s += rect(px, oy + oh * 0.08, pw, oh * 0.33, { rx: 6 * k, fill: 'none', stroke: dk(wood, 0.45), strokeWidth: 3.5 });
    s += rect(px, oy + oh * 0.5, pw, oh * 0.42, { rx: 6 * k, fill: 'none', stroke: dk(wood, 0.45), strokeWidth: 3.5 });
    const kx = hingeLeft ? x0 + lw * 0.86 : x0 + lw * 0.14;
    s += ellipse(kx, oy + oh * 0.5, 7 * k, 7, { fill: C.yellow, stroke: C.yellowDark, strokeWidth: 2.5 });
    s += rect(kx - 5 * k, oy + oh * 0.55, 10 * k, 14, { rx: 3, fill: C.ink });
  }
  return s;
}

/**
 * Casement window with two sashes and curtains (1 = closed … n = open). Canvas = window incl. frame.
 */
export function windowFrames(f: number, n: number, w: number, h: number, o: { id?: string; curtains?: string | null; frameCol?: string; outside?: string; sill?: boolean } = {}): string {
  const t = Math.max(0, Math.min(1, (f - 1) / Math.max(1, n - 1)));
  const id = o.id ?? `win${f}`;
  const fr = o.frameCol ?? '#7a4a20';
  const b = 9;
  const sillH = o.sill === false ? 0 : 10;
  const ix = b, iy = b, iw = w - 2 * b, ih = h - 2 * b - sillH;
  let s = rect(0, 0, w, h - sillH, { rx: 8, fill: fr }) + (o.outside ?? outsideView(ix, iy, iw, ih, `${id}o`));
  // two sashes rotate outwards: width shrinks with cos
  const k = Math.cos((t * Math.PI) / 2 * 0.9);
  const sw = (iw / 2) * k;
  const glass = (x: number, ww: number) => rect(x, iy, ww, ih, { fill: C.glass, opacity: 0.35, stroke: fr, strokeWidth: 6 }) +
    line(x + ww / 2, iy, x + ww / 2, iy + ih, { stroke: fr, strokeWidth: 4 }) + line(x, iy + ih / 2, x + ww, iy + ih / 2, { stroke: fr, strokeWidth: 4 }) +
    (ww > 20 ? path(`M${r2(x + ww * 0.2)} ${r2(iy + ih * 0.3)} l${r2(ww * 0.18)} ${r2(-ih * 0.12)}`, { stroke: C.white, strokeWidth: 3, strokeLinecap: 'round', opacity: 0.7 }) : '');
  s += glass(ix, Math.max(3, sw)) + glass(ix + iw - Math.max(3, sw), Math.max(3, sw));
  if (o.curtains !== null) {
    const cc = o.curtains ?? C.red;
    s += path(`M${ix + 2} ${iy - 2} q-14 ${ih * 0.45} -2 ${ih + 2} h12 q-8 ${-ih * 0.5} 10 ${-ih - 2} z`, { fill: cc, stroke: dk(cc, 0.4), strokeWidth: 2.5, opacity: 0.95 });
    s += path(`M${ix + iw - 2} ${iy - 2} q14 ${ih * 0.45} 2 ${ih + 2} h-12 q8 ${-ih * 0.5} -10 ${-ih - 2} z`, { fill: cc, stroke: dk(cc, 0.4), strokeWidth: 2.5, opacity: 0.95 });
  }
  if (sillH) s += rect(0, h - sillH - 2, w, sillH + 2, { rx: 4, fill: C.woodMid, stroke: C.woodDeep, strokeWidth: 2.5 });
  return s;
}

/** pendulum (canvas w×h, pivot top centre), angle in degrees */
export function pendulum(w: number, h: number, deg: number, col = C.yellow): string {
  const px = w / 2, py = 3, L = h - 15;
  return g({ transform: `rotate(${r2(deg)} ${px} ${py})` },
    line(px, py, px, py + L, { stroke: dk(col, 0.45), strokeWidth: 4, strokeLinecap: 'round' }),
    line(px, py, px, py + L, { stroke: col, strokeWidth: 2, strokeLinecap: 'round' }),
    circle(px, py + L, Math.min(w / 2 - 2, 9), { fill: col, stroke: dk(col, 0.5), strokeWidth: 2.5 }),
    circle(px - 2.5, py + L - 2.5, 2.5, { fill: C.white, opacity: 0.7 }));
}

/** swinging wall bell with pull rope, frame t 0..1 phase of the swing */
export function wallBell(w: number, h: number, deg: number): string {
  const px = w / 2, py = 30;
  return rect(px - 22, 6, 44, 10, { rx: 4, fill: '#4a4f5a', stroke: '#22252c', strokeWidth: 2.5 }) +
    path(`M${px} 16 v14`, { stroke: '#22252c', strokeWidth: 4 }) +
    g({ transform: `rotate(${r2(deg)} ${px} ${py})` },
      path(`M${px - 22} ${py + 40} q2 -38 22 -40 q20 2 22 40 q-22 8 -44 0 z`, { fill: '#e0a83a', stroke: '#8a5a10', strokeWidth: 3, strokeLinejoin: 'round' }),
      path(`M${px - 12} ${py + 10} q4 -8 10 -9`, { fill: 'none', stroke: '#ffe7a0', strokeWidth: 3, strokeLinecap: 'round' }),
      circle(px, py + 44, 6, { fill: '#8a5a10' }),
      path(`M${px} ${py + 46} C${px + 4} ${py + 70} ${px - 4} ${py + 90} ${px} ${h - 14}`, { fill: 'none', stroke: '#c9a26a', strokeWidth: 3.5, strokeLinecap: 'round' }),
      circle(px, h - 10, 6, { fill: C.red, stroke: C.redDark, strokeWidth: 2 }));
}

/** wooden table (side view) */
export function table(x: number, y: number, w: number, h: number): string {
  return rect(x, y, w, 18, { rx: 6, fill: C.woodMid, stroke: C.woodDeep, strokeWidth: 3 }) +
    rect(x + 16, y + 16, 16, h - 16, { rx: 4, fill: '#6b3a18', stroke: C.woodDeep, strokeWidth: 2.5 }) +
    rect(x + w - 32, y + 16, 16, h - 16, { rx: 4, fill: '#6b3a18', stroke: C.woodDeep, strokeWidth: 2.5 }) +
    line(x + 8, y + 5, x + w - 8, y + 5, { stroke: lt(C.woodMid, 0.3), strokeWidth: 3, strokeLinecap: 'round' });
}

/** chair seen from the side/front */
export function chair(x: number, y: number, s = 1, col = C.wood): string {
  return g({ transform: `translate(${x} ${y}) scale(${s})` },
    rect(0, -90, 10, 150, { rx: 4, fill: col, stroke: dk(col, 0.5), strokeWidth: 2.5 }),
    rect(48, 0, 10, 60, { rx: 4, fill: col, stroke: dk(col, 0.5), strokeWidth: 2.5 }),
    rect(0, -6, 60, 12, { rx: 4, fill: lt(col, 0.1), stroke: dk(col, 0.5), strokeWidth: 2.5 }),
    rect(4, -84, 6, 70, { fill: dk(col, 0.15) }),
    ...[-70, -48, -26].map((yy) => rect(0, yy, 10, 8, { fill: dk(col, 0.2) })));
}

/** framed picture on the wall */
export function picture(x: number, y: number, w: number, h: number, id: string): string {
  return rect(x, y, w, h, { rx: 4, fill: C.woodMid, stroke: C.woodDeep, strokeWidth: 3 }) + outsideView(x + 6, y + 6, w - 12, h - 12, id);
}
