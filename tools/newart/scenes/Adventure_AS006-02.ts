// AS006-02 "Witz-O-Mat" close-up: the joke machine on the wall. Hebel 688,12 (6 frames, pulled down),
// Klappe 603,296 66x94 (card slot: 1 empty, 2-8 card drops in, 9-12 flap opens, 13-16 card gone, flap closes),
// Message 481,6 ("Störung" label covering "Betrieb").
import { defineMovie } from '../lib/api';
import { inScene } from '../lib/stageloc';
import { C, circle, defs, dk, g, linGrad, lt, path, r2, rect } from '../lib/svg';
import { cobblePattern } from '../lib/textures';
import { fitText, headline } from '../lib/ui';

const TQ = '#3ac8c8', TQ_D = '#147878';

function background(w: number, h: number): string {
  let s = defs(cobblePattern('wall', { base: '#e8e4dc', mortar: '#b8b2a6', size: 46, seed: 71 }), linGrad('body', [[0, lt(TQ, 0.15)], [1, TQ]]));
  s += rect(0, 0, w, h, { fill: 'url(#wall)' });
  // door frame on the left: striped panel + stone blocks
  s += rect(0, 0, 70, h, { fill: '#e8603a' });
  for (let y = -60; y < h; y += 56) s += path(`M0 ${y} L70 ${y + 50} V${y + 78} L0 ${y + 28} Z`, { fill: C.yellow });
  for (const [y, hh] of [[0, 100], [108, 136], [252, 136], [396, 60]] as [number, number][]) s += rect(70, y, 130, hh, { rx: 4, fill: '#9a968c', stroke: '#5a564e', strokeWidth: 4 });
  // machine
  s += rect(386, 40, 302, 372, { rx: 22, fill: '#000', opacity: 0.18, transform: 'translate(10 10)' });
  s += rect(380, 34, 302, 372, { rx: 22, fill: 'url(#body)', stroke: TQ_D, strokeWidth: 6 });
  // status label "Betrieb"
  s += rect(484, 10, 104, 30, { rx: 8, fill: '#e8f8f0', stroke: TQ_D, strokeWidth: 4 }) + fitText('Betrieb', 536, 31, 90, 17, { anchor: 'middle', fill: '#2f8f4a', font: 'body', weight: 900 });
  s += fitText('Witz-O-Mat', 531, 100, 260, 50, { anchor: 'middle', fill: '#2a1d6b', font: 'head', weight: 800 });
  // smiley
  s += circle(530, 188, 92, { fill: C.yellow, stroke: '#c89a00', strokeWidth: 5 }) + path('M470 160 q20 -20 40 -10', { fill: 'none', stroke: C.white, strokeWidth: 8, strokeLinecap: 'round', opacity: 0.6 }) +
    path('M498 150 v30 M562 150 v30', { stroke: C.ink, strokeWidth: 9, strokeLinecap: 'round' }) +
    path('M470 210 Q530 270 590 210', { fill: 'none', stroke: C.ink, strokeWidth: 8, strokeLinecap: 'round' });
  // instructions
  const lines = ['So geht’s:', '1. Gut überlegen', '2. Anleitung lesen', '3. Hebel ziehen', '4. Witzkarte nehmen', '5. Weiterspielen'];
  lines.forEach((t, i) => { s += fitText(t, 400, 296 + i * 18, 190, 15, { fill: '#1a2a3a', font: 'body', weight: i ? 800 : 900, anchor: 'start' }); });
  // lever mount on the right side
  s += rect(680, 120, 30, 40, { rx: 8, fill: '#5a5f68', stroke: '#2a2c33', strokeWidth: 3 });
  // card slot frame (flap is the Klappe sprite)
  s += rect(600, 294, 72, 98, { rx: 6, fill: TQ_D });
  return s;
}

/** lever: pivot (712,140); 1 = up … 6 = down (pulled) */
function lever(f: number): string {
  const a = ((-80 + ((f - 1) / 5) * 155) * Math.PI) / 180;
  const ex = 712 + Math.cos(a) * 20, ey = 140 + Math.sin(a) * 100;
  return path(`M712 140 L${r2(ex)} ${r2(ey)}`, { stroke: '#1a1a1e', strokeWidth: 12, strokeLinecap: 'round' }) +
    path(`M710 140 L${r2(ex - 2)} ${r2(ey)}`, { stroke: '#9aa0aa', strokeWidth: 4, strokeLinecap: 'round' }) +
    circle(ex, ey, 17, { fill: C.red, stroke: C.redDark, strokeWidth: 3 }) + circle(ex - 5, ey - 5, 5, { fill: C.white, opacity: 0.6 }) +
    circle(712, 140, 10, { fill: '#5a5f68', stroke: '#2a2c33', strokeWidth: 3 });
}

function card(x: number, y: number, w: number, h: number): string {
  return rect(x, y, w, h, { rx: 3, fill: C.white, stroke: '#8a93a6', strokeWidth: 2 }) +
    circle(x + w / 2, y + h * 0.3, Math.min(w, h) * 0.18, { fill: C.yellow, stroke: '#a07800', strokeWidth: 1.5 }) +
    path(`M${x + 6} ${y + h * 0.62} h${w - 12} M${x + 6} ${y + h * 0.76} h${w - 16}`, { stroke: '#8a93a6', strokeWidth: 2 });
}

/** card slot: glass flap + card */
function slot(f: number): string {
  const x = 604, y = 298, w = 64, h = 90;
  let s = rect(x, y, w, h, { rx: 4, fill: '#1a5a5a' });
  // card falling in (2..8), lying (8..12)
  if (f >= 2 && f <= 12) { const t = Math.min(1, (f - 2) / 6); s += card(x + 10, y + 4 + t * 46, w - 20, 36); }
  // flap: closed 1..8, opens 9..12, closes 13..16
  const open = f <= 8 ? 0 : f <= 12 ? (f - 8) / 4 : Math.max(0, 1 - (f - 12) / 4);
  const fh = h * (1 - 0.75 * open);
  s += rect(x + 2, y + 2, w - 4, fh - 4, { rx: 3, fill: '#bfe8f5', fillOpacity: 0.55, stroke: '#e8f8fc', strokeWidth: 3 });
  s += path(`M${x + 8} ${y + 10} l14 0`, { stroke: C.white, strokeWidth: 3, strokeLinecap: 'round' });
  s += rect(x, y - 2, w, 8, { rx: 3, fill: '#c8ccd2', stroke: '#5a5f68', strokeWidth: 2 });
  return s;
}

export default defineMovie({
  Headline: (m, w, h) => headline('Witz-O-Mat', w, h),
  Background: (m, w, h) => background(w, h),
  'Hebel-*': (m) => inScene(m, lever(m.frame ?? 1)),
  'Klappe-*': (m) => inScene(m, slot(m.frame ?? 1)),
  Message: (m, w, h) => rect(3, 4, w - 6, h - 8, { rx: 8, fill: '#fff0f0', stroke: dk(TQ, 0.3), strokeWidth: 4 }) + fitText('Störung', w / 2, h / 2 + 7, w - 16, 19, { anchor: 'middle', fill: C.red, font: 'body', weight: 900 }),
});
