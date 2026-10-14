// Intro screen of a minigame (800x448): scene picture top left, controls hint top right,
// task text in the middle and the item band at the bottom (slot sprites are drawn on top by the runtime).
import { C, circle, defs, dk, g, line, linGrad, path, rect } from './svg';
import { woodPattern } from './textures';
import { fitText } from './ui';

export type Controls = 'mouse' | 'keys' | 'both';

/** computer mouse icon (centre, height) */
export function mouseIcon(cx: number, cy: number, h: number): string {
  const w = h * 0.62;
  return g({ transform: `translate(${cx} ${cy})` },
    path(`M0 ${-h / 2 - 18} q${w * 0.3} -20 ${w * 0.55} -14`, { fill: 'none', stroke: C.ink, strokeWidth: 4, strokeLinecap: 'round' }),
    rect(-w / 2, -h / 2, w, h, { rx: w / 2, fill: '#f4f1ea', stroke: C.ink, strokeWidth: 4 }),
    line(-w / 2 + 2, -h * 0.12, w / 2 - 2, -h * 0.12, { stroke: C.ink, strokeWidth: 3 }),
    line(0, -h / 2, 0, -h * 0.12, { stroke: C.ink, strokeWidth: 3 }),
    rect(-5, -h * 0.4, 10, 18, { rx: 5, fill: C.uiLight, stroke: C.ink, strokeWidth: 2.5 }),
    path(`M${-w / 2 + 10} ${h * 0.05} q4 ${h * 0.25} ${w * 0.28} ${h * 0.36}`, { fill: 'none', stroke: '#fff', strokeWidth: 4, strokeLinecap: 'round', opacity: 0.8 }));
}

/** arrow key cluster (centre, key size) */
export function keysIcon(cx: number, cy: number, k: number): string {
  const key = (x: number, y: number, rot: number) =>
    g({ transform: `translate(${x} ${y})` },
      rect(-k / 2, -k / 2, k, k, { rx: k * 0.2, fill: '#f4f1ea', stroke: C.ink, strokeWidth: 3.5 }),
      rect(-k / 2 + 4, k / 2 - 9, k - 8, 5, { rx: 2, fill: '#d6d0c2' }),
      g({ transform: `rotate(${rot})` }, path(`M0 ${-k * 0.22} l${k * 0.18} ${k * 0.26} h${-k * 0.36} z`, { fill: C.ink })));
  const s = k + 6;
  return key(cx, cy - s / 2, 0) + key(cx - s, cy + s / 2, -90) + key(cx, cy + s / 2, 180) + key(cx + s, cy + s / 2, 90);
}

/** word-wrap into lines of ~maxChars */
function wrap(s: string, maxChars: number): string[] {
  const out: string[] = [];
  let cur = '';
  for (const w of s.split(' ')) {
    if (cur && (cur + ' ' + w).length > maxChars) {
      out.push(cur);
      cur = w;
    } else cur = cur ? cur + ' ' + w : w;
  }
  if (cur) out.push(cur);
  return out;
}

/**
 * art: SVG body drawn into the picture card (coordinates 0..340 x 0..200)
 * task: the task text (German)
 */
export function minigameIntro(id: string, art: string, task: string, controls: Controls, o: { items?: boolean } = {}): string {
  const W = 800, H = 448;
  let s = defs(
    woodPattern(`${id}w`, { base: '#a8682f', dark: '#7a4a20', plank: 30 }),
    linGrad(`${id}v`, [[0, '#000', 0], [1, '#000', 0.35]]),
  );
  s += rect(0, 0, W, H, { fill: `url(#${id}w)` }) + rect(0, 0, W, H, { fill: `url(#${id}v)` });
  // picture card (slightly rotated, pinned)
  s += g({ transform: 'translate(40 26) rotate(-2)' },
    rect(6, 8, 356, 216, { rx: 14, fill: '#000', opacity: 0.25 }),
    rect(0, 0, 356, 216, { rx: 14, fill: C.cream, stroke: C.woodDeep, strokeWidth: 4 }),
    `<clipPath id="${id}c"><rect x="8" y="8" width="340" height="200" rx="9"/></clipPath>`,
    g({ clipPath: `url(#${id}c)` }, g({ transform: 'translate(8 8)' }, art)),
    rect(8, 8, 340, 200, { rx: 9, fill: 'none', stroke: dk(C.cream, 0.4), strokeWidth: 2 }),
    circle(178, 2, 8, { fill: C.red, stroke: C.redDark, strokeWidth: 3 }) + circle(175, -1, 2.5, { fill: '#fff', opacity: 0.8 }));
  // controls (top right)
  const ctrlText = controls === 'mouse' ? 'Gespielt wird mit der Maus!' : controls === 'keys' ? 'Gespielt wird mit den Pfeiltasten!' : 'Gespielt wird mit Maus oder Pfeiltasten!';
  s += g({},
    rect(430, 28, 340, 210, { rx: 22, fill: C.ui, stroke: C.uiDark, strokeWidth: 4, opacity: 0.92 }),
    fitText(ctrlText, 600, 62, 310, 24, { fill: C.uiAccent, anchor: 'middle' }),
    controls !== 'keys' ? mouseIcon(controls === 'both' ? 520 : 600, 160, 92) : '',
    controls !== 'mouse' ? keysIcon(controls === 'both' ? 680 : 600, 156, 40) : '');
  // task text
  const lines = wrap(task, 62);
  const y0 = 292 - (lines.length - 1) * 16;
  s += rect(30, y0 - 30, 740, lines.length * 32 + 28, { rx: 20, fill: '#1a1028', opacity: 0.45 });
  s += lines.map((l, i) => fitText(l, 400, y0 + i * 32, 720, 26, { fill: C.white, anchor: 'middle', stroke: C.uiDark, sw: 4 })).join('');
  // item band
  if (o.items !== false) {
    s += rect(0, 352, W, 96, { fill: C.uiDark, opacity: 0.88 }) + line(0, 352, W, 352, { stroke: C.uiAccent, strokeWidth: 3 });
    s += fitText('Für dieses Spiel brauchst du diese Sachen – leg sie hier ab:', 400, 368, 700, 17, { fill: C.uiAccent, anchor: 'middle', font: 'body', weight: 800 });
  }
  return s;
}
