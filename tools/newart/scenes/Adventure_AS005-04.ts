// AS005-04 "Leuchtturm" gallery outside at sunset: telescope (hotspot GS005-01), lantern room (Lampe 342,214, 7 frames
// glow), doves flying by (Dove1 in front, Dove2 behind the roof), Composing-2 (roof + hill, in front of Dove2) and
// Composing-1 (front railing) are foreground crops of the same painting.
import { defineMovie, atReg } from '../lib/api';
import { inScene } from '../lib/stageloc';
import { brickLines, cloud, seaStrip } from '../lib/seaside';
import { C, circle, defs, dk, ellipse, g, linGrad, lt, path, r2, radGrad, rect } from '../lib/svg';
import { grassPattern } from '../lib/textures';
import { headline } from '../lib/ui';

function sky(): string {
  let s = defs(linGrad('ss', [[0, '#e8823a'], [0.6, '#f6b25a'], [1, '#ffd98a']]), radGrad('sun', [[0, '#fff6c0'], [0.5, '#ffd25a'], [1, '#ffd25a', 0]]));
  s += rect(0, 0, 800, 448, { fill: 'url(#ss)' });
  s += cloud(120, 90, 50, 'sc1', '#c8643a') + cloud(560, 40, 60, 'sc2', '#c8643a') + cloud(330, 130, 26, 'sc3', '#d8784a');
  s += circle(225, 296, 60, { fill: 'url(#sun)' }) + circle(225, 296, 24, { fill: '#fff0a0' });
  s += seaStrip('sea', 0, 296, 420, 448, 3, { top: '#5a7ab0', bottom: '#2a4a80' });
  s += path('M150 296 h150', { stroke: '#ffe58a', strokeWidth: 4, opacity: 0.7 });
  return s;
}

function hill(): string {
  return defs(grassPattern('gr', { base: '#4fa64a', seed: 4 })) +
    path('M240 448 Q260 360 420 330 Q560 240 800 30 V448 Z', { fill: 'url(#gr)', stroke: '#2f7a3a', strokeWidth: 4 });
}

/** lower tower + gallery deck (behind the front railing) */
function tower(): string {
  const tw = 'M300 448 L306 310 H494 L500 448 Z';
  return path(tw, { fill: '#f0ece2', stroke: '#9a968c', strokeWidth: 4 }) + `<clipPath id="tc"><path d="${tw}"/></clipPath>` +
    g({ clipPath: 'url(#tc)' }, brickLines(296, 314, 504, 448, 14, '#9a968c', 0.5)) +
    // gallery deck with brackets
    path('M250 312 H526 L520 328 H256 Z', { fill: '#b8783e', stroke: '#5a3418', strokeWidth: 4, strokeLinejoin: 'round' }) +
    ['M300 330 l-30 20 h10 l20 -12', 'M400 330 v26 l-8 -6', 'M500 330 l26 20 h-10 l-16 -12'].map((d) => path(d, { fill: '#7a4a20', stroke: '#3e2610', strokeWidth: 3 })).join('');
}

/** lantern room (glass) with the lamp; glow 0..1 */
function lantern(glow: number): string {
  let s = defs(radGrad('lg', [[0, '#ffffff', 0.95], [0.4, '#fff3a0', 0.8], [1, '#ffd25a', 0]]));
  s += rect(306, 230, 188, 82, { fill: '#7a8ab0', stroke: '#5a3418', strokeWidth: 4 });
  s += rect(306, 230, 188, 82, { fill: '#ffd98a', opacity: 0.35 });
  // lamp bulb on its stand
  s += rect(392, 280, 16, 32, { fill: '#3a3a3a', stroke: '#111', strokeWidth: 2 });
  s += circle(400, 266, 18, { fill: glow > 0.05 ? '#fff6c0' : '#d8d2c0', stroke: '#8a8070', strokeWidth: 3 });
  if (glow > 0) s += circle(400, 266, 26 + 34 * glow, { fill: 'url(#lg)', opacity: Math.min(1, glow * 1.2) });
  // window mullions
  for (const x of [306, 350, 400, 450, 494]) s += path(`M${x} 230 V312`, { stroke: '#c9822e', strokeWidth: 6 });
  s += path('M306 256 H494', { stroke: '#c9822e', strokeWidth: 4 });
  s += path('M300 228 H500', { stroke: '#5a4ab0', strokeWidth: 12 });
  return s;
}

function roof(): string {
  return path('M196 222 Q300 196 330 120 Q380 90 400 92 Q420 90 470 120 Q500 196 588 222 Q400 236 196 222 Z', { fill: '#c8503a', stroke: '#7a2a1a', strokeWidth: 5, strokeLinejoin: 'round' }) +
    path('M260 210 Q330 160 350 112 M330 222 Q370 160 382 96 M470 222 Q430 160 418 96 M540 212 Q470 160 450 112', { fill: 'none', stroke: '#9a3a26', strokeWidth: 3, opacity: 0.6 }) +
    path('M300 200 Q360 150 372 110', { fill: 'none', stroke: lt('#c8503a', 0.35), strokeWidth: 5, strokeLinecap: 'round' }) +
    circle(400, 86, 14, { fill: '#5a8a3a', stroke: '#2f5a1a', strokeWidth: 3 }) + path('M400 72 V0', { stroke: '#6a8a4a', strokeWidth: 5 });
}

function telescope(): string {
  return g({},
    path('M280 300 l-12 18 M290 300 l10 18', { stroke: '#5a3418', strokeWidth: 5 }),
    g({ transform: 'rotate(-6 270 258)' },
      rect(236, 250, 80, 16, { rx: 6, fill: '#d9a050', stroke: '#6b4422', strokeWidth: 3 }),
      rect(226, 248, 18, 20, { rx: 5, fill: '#e8c070', stroke: '#6b4422', strokeWidth: 3 }),
      ellipse(228, 258, 4, 9, { fill: '#b8d8f0', stroke: '#6b4422', strokeWidth: 2 }),
      rect(300, 252, 20, 12, { rx: 3, fill: '#8a5428' })),
    rect(278, 270, 10, 34, { fill: '#5a3418' }));
}

function frontRailing(): string {
  const post = (x: number) => rect(x - 6, 272, 12, 46, { rx: 3, fill: '#8a5428', stroke: '#3e2610', strokeWidth: 3 });
  return path('M262 278 Q390 268 512 276', { fill: 'none', stroke: '#3e2610', strokeWidth: 7, strokeLinecap: 'round' }) +
    path('M262 278 Q390 268 512 276', { fill: 'none', stroke: '#8a5428', strokeWidth: 3, strokeLinecap: 'round' }) +
    post(296) + post(400) + post(496);
}

function world(glow = 0): string {
  return sky() + hill() + tower() + lantern(glow) + roof() + telescope() + frontRailing();
}

/** dove (side view, flying right) at loc 0,0 scale s; wing frame 1 (down) … 11 (up) */
function dove(f: number, s: number): string {
  const th = ((70 - (f - 1) * 14) * Math.PI) / 180;
  const shx = 2 * s, shy = 6 * s, L = 52 * s;
  const tx = shx - 14 * s, ty = shy + L * Math.sin(th);
  const o = { fill: C.white, stroke: '#7a8494', strokeWidth: Math.max(1.4, 2.6 * s), strokeLinejoin: 'round' as const };
  const wingBack = path(`M${r2(shx)} ${r2(shy)} Q${r2(tx + 20 * s)} ${r2((shy + ty) / 2)} ${r2(tx)} ${r2(ty)} Q${r2(tx - 6 * s)} ${r2((shy + ty) / 2)} ${r2(shx - 20 * s)} ${r2(shy + 2 * s)} Z`, { ...o, fill: '#dfe4ec' });
  return g({ transform: `translate(0 ${r2(7 * s)})` }, wingBack +
    path(`M${r2(-30 * s)} ${r2(4 * s)} L${r2(-18 * s)} ${r2(8 * s)} L${r2(-30 * s)} ${r2(13 * s)} Z`, o) +
    ellipse(4 * s, 8 * s, 24 * s, 8 * s, o) +
    circle(30 * s, 3 * s, 8 * s, o) + path(`M${r2(37 * s)} ${r2(2 * s)} l${r2(8 * s)} ${r2(2 * s)} l${r2(-8 * s)} ${r2(2 * s)} Z`, { fill: C.yellow, stroke: C.yellowDark, strokeWidth: 1 }) +
    circle(32 * s, 1.5 * s, 1.6 * s, { fill: C.ink }));
}

export default defineMovie({
  Headline: (m, w, h) => headline('Leuchtturm', w, h),
  Background: () => world(),
  'Composing-2': (m) => inScene(m, roof() + hill().replace(/id="gr"/, 'id="gr2"').replace(/url\(#gr\)/, 'url(#gr2)')),
  'Composing-1': (m) => inScene(m, frontRailing()),
  'Lampe-*': (m) => inScene(m, world([0, 1, 0.8, 0.6, 0.4, 0.2, 0.08][(m.frame ?? 1) - 1])),
  'Dove1-*': (m) => atReg(m, dove(m.frame ?? 1, 1)),
  'Dove2-*': (m) => atReg(m, dove(m.frame ?? 1, 0.5)),
});
