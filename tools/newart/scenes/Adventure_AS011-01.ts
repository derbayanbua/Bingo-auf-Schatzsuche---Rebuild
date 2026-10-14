// AS011-01 "Am Strand": sand dune at the sea, beach chair, beach ball, a parasol that opens (Schirm, 6 frames,
// loc 400,224, canvas grows to the left) and a shell (OS025 411,263, item OI025). Exit right to the board.
import { defineMovie } from '../lib/api';
import { itemArt } from '../lib/items';
import { seaStrip, skyWithClouds } from '../lib/seaside';
import { inScene } from '../lib/stageloc';
import { C, circle, defs, dk, ellipse, g, path, r2, rect } from '../lib/svg';
import { sandPattern } from '../lib/textures';
import { headline } from '../lib/ui';

function beachChair(): string {
  const wick = '#e8eef8', wd = '#4a6ab0';
  let s = path('M680 170 Q740 150 800 166 V360 H668 Z', { fill: wick, stroke: wd, strokeWidth: 4, strokeLinejoin: 'round' });
  s += path('M700 190 Q740 176 790 186 V300 H700 Z', { fill: '#c8d4ec', stroke: wd, strokeWidth: 3 });
  let weave = '';
  for (let y = 180; y < 360; y += 10) weave += `M668 ${y} H800 `;
  for (let x = 674; x < 800; x += 10) weave += `M${x} 166 V360 `;
  s += path(weave, { stroke: wd, strokeWidth: 1.2, opacity: 0.45 });
  s += path('M674 300 H800 V340 H674 Z', { fill: '#e8706a', stroke: '#8a2a24', strokeWidth: 3 }) + path('M674 340 H800 V372 H674 Z', { fill: '#c8504a', stroke: '#8a2a24', strokeWidth: 3 });
  s += path('M656 250 H700 V372 H656 Z', { fill: wick, stroke: wd, strokeWidth: 4 });
  return s;
}

function background(w: number, h: number): string {
  let s = skyWithClouds('sky', w, h, { clouds: [[120, 80, 40], [420, 50, 50], [660, 110, 30], [300, 170, 24]] });
  s += defs(sandPattern('sand', 21));
  s += seaStrip('sea', 0, 240, 800, 448, 7);
  // dune
  s += path('M120 340 Q170 300 260 280 Q380 220 470 236 Q560 230 640 222 Q720 220 800 240 V448 H260 Q160 420 120 340 Z', { fill: 'url(#sand)', stroke: C.sandDark, strokeWidth: 4 });
  s += path('M240 300 Q330 290 400 330 M480 270 Q560 300 600 360 M300 400 Q360 380 420 410', { fill: 'none', stroke: C.sandDark, strokeWidth: 3, strokeLinecap: 'round', opacity: 0.7 });
  // hole for the parasol + beach ball
  s += ellipse(594, 224, 10, 4, { fill: C.sandDark });
  s += circle(622, 222, 18, { fill: C.white, stroke: '#4a6ab0', strokeWidth: 3 }) + path('M606 214 Q622 226 638 214 M606 228 Q622 240 638 228', { fill: 'none', stroke: '#4a6ab0', strokeWidth: 4 });
  s += beachChair();
  return s;
}

/** parasol: t 0 closed … 1 open; pole from the sand (594,222) to the tip (624,40) */
function parasol(t: number): string {
  const bx = 594, by = 222, tx = 624, ty = 40;
  const ux = (tx - bx) / Math.hypot(tx - bx, ty - by), uy = (ty - by) / Math.hypot(tx - bx, ty - by);
  const px = -uy, py = ux; // perpendicular
  const down = 140 - 95 * t; // distance of the rim from the tip along the pole
  const half = 14 + 140 * t;
  const cx = tx - ux * down, cy = ty - uy * down;
  const n = 10;
  let s = path(`M${bx} ${by} L${tx + ux * 8} ${ty + uy * 8}`, { stroke: '#a8783a', strokeWidth: 7, strokeLinecap: 'round' }) + path(`M${bx} ${by} L${tx + ux * 8} ${ty + uy * 8}`, { stroke: '#e8c080', strokeWidth: 3, strokeLinecap: 'round' });
  // canopy wedges (rim seen as a flattened ellipse)
  const rim = (i: number): [number, number] => {
    const a = (i / n) * Math.PI;
    const o = Math.cos(a) * half, d = Math.sin(a) * half * 0.22 * t;
    return [cx + px * o + ux * d * 0, cy + py * o + d + 6 * (1 - t)];
  };
  for (let i = 0; i < n; i++) {
    const p0 = rim(i), p1 = rim(i + 1);
    s += path(`M${r2(tx)} ${r2(ty)} L${r2(p0[0])} ${r2(p0[1])} Q${r2((p0[0] + p1[0]) / 2)} ${r2((p0[1] + p1[1]) / 2 + 8 * t)} ${r2(p1[0])} ${r2(p1[1])} Z`,
      { fill: i % 2 ? C.white : '#f0602a', stroke: '#a83a1a', strokeWidth: 2.5, strokeLinejoin: 'round' });
  }
  return s + circle(tx, ty, 4, { fill: '#a8783a' });
}

export default defineMovie({
  Headline: (m, w, h) => headline('Am Strand', w, h),
  Hintergrund: (m, w, h) => background(w, h),
  'Schirm-*': (m) => inScene(m, parasol(((m.frame ?? 1) - 1) / 5)),
  OS025: (m, w, h) => itemArt('OI025', w, h),
});
