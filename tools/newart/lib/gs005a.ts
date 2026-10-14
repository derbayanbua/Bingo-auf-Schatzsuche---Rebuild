// Shared parts of the lighthouse mini games GS005-01..03 (Fernrohr, Zahlenschloss, Rohr):
// game intro screen (wooden board, preview picture, input device, German instructions).
import { C, circle, defs, dk, el, g, line, lt, path, rect, rng } from './svg';
import { woodPattern } from './textures';
import { fitText } from './ui';

/** arrow keys block (centre x, top y) */
export function arrowKeys(cx: number, y: number, active: boolean): string {
  const key = (x: number, ky: number, rot: number) =>
    rect(x, ky, 40, 40, { rx: 8, fill: '#f4f1ea', stroke: '#5a5560', strokeWidth: 3.5 }) +
    rect(x + 4, ky + 30, 32, 6, { rx: 3, fill: '#c9c3b8' }) +
    g({ transform: `rotate(${rot} ${x + 20} ${ky + 17})` }, path(`M${x + 20} ${ky + 7} l8 11 h-5 v8 h-6 v-8 h-5 z`, { fill: C.ink }));
  const s = rect(cx - 74, y - 6, 148, 104, { rx: 14, fill: '#3b3640', stroke: '#1e1a22', strokeWidth: 4 }) +
    key(cx - 20, y + 2, 0) + key(cx - 66, y + 48, -90) + key(cx - 20, y + 48, 180) + key(cx + 26, y + 48, 90);
  return g({ opacity: active ? 1 : 0.28 }, s);
}

/** computer mouse (centre x, top y) */
export function mouseIcon(cx: number, y: number, active: boolean): string {
  const s = path(`M${cx} ${y} q-6 -16 14 -22 q14 -4 18 -18`, { fill: 'none', stroke: '#3b3640', strokeWidth: 4, strokeLinecap: 'round' }) +
    path(`M${cx - 44} ${y + 60} q0 -60 44 -60 q44 0 44 60 v60 q0 52 -44 52 q-44 0 -44 -52 z`, { fill: '#f4f1ea', stroke: '#5a5560', strokeWidth: 4 }) +
    path(`M${cx - 44} ${y + 62} h88 M${cx} ${y} v62`, { stroke: '#5a5560', strokeWidth: 3 }) +
    rect(cx - 7, y + 18, 14, 28, { rx: 7, fill: '#8a8494', stroke: '#5a5560', strokeWidth: 2.5 }) +
    path(`M${cx - 32} ${y + 72} q2 -40 22 -54`, { fill: 'none', stroke: C.white, strokeWidth: 5, strokeLinecap: 'round', opacity: 0.8 });
  return g({ opacity: active ? 1 : 0.28 }, s);
}

export interface IntroOpts {
  id: string;
  /** preview picture, drawn in a 320x190 box (0,0 = top left) */
  picture: string;
  device: 'keys' | 'mouse';
  lines: string[];
  /** label of the item band above the preference slots (sprite 101.. at scene y 378) */
  prefs?: string;
}

/** 800x448 intro screen of a mini game (Intro frame, behind Start button + preference slots) */
export function introScreen(o: IntroOpts): string {
  const R = rng(o.id);
  let s = defs(woodPattern(`${o.id}-wood`, { base: C.wood, dark: C.woodDeep, plank: 32, len: 190, seed: 11 }),
    el('clipPath', { id: `${o.id}-pic` }, rect(46, 26, 320, 190, { rx: 14 })));
  s += rect(0, 0, 800, 448, { fill: `url(#${o.id}-wood)` });
  // soft vignette
  s += rect(0, 0, 800, 448, { fill: 'none', stroke: C.woodDeep, strokeWidth: 26, opacity: 0.25 });
  // nails
  for (const [x, y] of [[18, 18], [782, 18], [18, 430], [782, 430]]) s += circle(x, y, 5, { fill: '#8a8070', stroke: '#4a4038', strokeWidth: 2 });
  // picture with frame
  s += rect(40, 20, 332, 202, { rx: 18, fill: C.woodDeep, opacity: 0.35, transform: 'translate(6 7)' });
  s += g({ clipPath: `url(#${o.id}-pic)` }, g({ transform: 'translate(46 26)' }, o.picture));
  s += rect(43, 23, 326, 196, { rx: 16, fill: 'none', stroke: C.wall, strokeWidth: 7 });
  s += rect(39, 19, 334, 204, { rx: 19, fill: 'none', stroke: C.woodDeep, strokeWidth: 3 });
  // input device
  const head = o.device === 'keys' ? 'der Tastatur!' : 'der Maus!';
  s += fitText('Gespielt wird mit', 540, 28, 220, 24, { fill: C.yellow, anchor: 'middle', stroke: C.woodDeep, sw: 4 });
  s += fitText(head, 540, 56, 220, 24, { fill: C.yellow, anchor: 'middle', stroke: C.woodDeep, sw: 4 });
  s += arrowKeys(540, 100, o.device === 'keys');
  s += mouseIcon(710, 46, o.device === 'mouse');
  // instructions
  const y0 = o.prefs ? 262 : 280;
  o.lines.forEach((t, i) => {
    s += fitText(t, 400, y0 + i * 28, 740, 21, { fill: C.yellow, anchor: 'middle', font: 'body', weight: 800, stroke: C.woodDeep, sw: 4 });
  });
  if (o.prefs) {
    s += rect(0, 352, 800, 24, { fill: C.uiDark, opacity: 0.55 });
    s += fitText(o.prefs, 400, 364, 700, 16, { fill: C.wall, anchor: 'middle', font: 'body', weight: 700 });
  }
  // a few wood knots
  for (let i = 0; i < 5; i++) {
    const x = 60 + R() * 680, y = 236 + R() * 20;
    s += path(`M${x - 14} ${y} q14 -7 28 0 q-14 7 -28 0`, { fill: 'none', stroke: dk(C.wood, 0.4), strokeWidth: 2, opacity: 0.5 });
  }
  return s;
}

/** warm sunset sky gradient stops (for the telescope game) */
export const SUNSET: [number, string][] = [[0, '#7a3a6e'], [0.35, '#e0603a'], [0.75, '#ff9a3c'], [1, '#ffd27a']];

/** flat stylised cloud */
export function cloud(x: number, y: number, s: number, fill: string): string {
  return path(`M${x} ${y} q${8 * s} ${-18 * s} ${26 * s} ${-12 * s} q${10 * s} ${-16 * s} ${30 * s} ${-6 * s} q${20 * s} ${-4 * s} ${22 * s} ${12 * s} q${14 * s} 0 ${14 * s} ${8 * s} z`,
    { fill, stroke: dk(fill, 0.25), strokeWidth: 2.5, strokeLinejoin: 'round' });
}

/** sea shimmer lines inside a box */
export function shimmer(seed: string, x: number, y: number, w: number, h: number, color: string, n = 40): string {
  const R = rng(seed);
  let s = '';
  for (let i = 0; i < n; i++) {
    const yy = y + Math.pow(R(), 1.4) * h, xx = x + R() * w, len = 8 + R() * 36 * (0.5 + (yy - y) / h);
    s += line(xx, yy, xx + len, yy, { stroke: color, strokeWidth: 2, strokeLinecap: 'round', opacity: 0.5 + R() * 0.4 });
  }
  return s;
}

/** mossy green lighthouse cellar wall (GS005-03, shared by Background and Tube so they match) */
export function mossWall(w: number, h: number, id: string): string {
  const R = rng('gs005-03-wall');
  let s = rect(0, 0, w, h, { fill: '#6f9a4a' });
  s += rect(560, 0, 240, 448, { fill: '#7fab55' }) + line(556, 0, 552, 448, { stroke: '#4f7a34', strokeWidth: 5 });
  for (let i = 0; i < 160; i++) {
    const x = R() * 800, y = R() * 448, r = 3 + R() * 9;
    s += circle(x, y, r, { fill: R() > 0.5 ? '#5a8a3c' : lt('#6f9a4a', 0.15), opacity: 0.55 });
  }
  for (let i = 0; i < 9; i++) {
    const x = R() * 800, y = R() * 448;
    s += path(`M${x} ${y} l${6 - R() * 12} ${14 + R() * 10} l${6 - R() * 12} ${14 + R() * 10}`, { fill: 'none', stroke: '#e8efe0', strokeWidth: 2.5, strokeLinecap: 'round', opacity: 0.7 });
  }
  void id;
  return s;
}
