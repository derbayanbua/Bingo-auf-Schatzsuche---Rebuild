// AS009-01 "An der alten Villa" at night: stairs with a red carpet up to the front door (Door 457,154 196x175,
// 12 frames: door opens, the butler stands inside with a tray), ButlerMund 557,255 (talking, crop of the open-door
// painting), bell (hotspot 431,242), loose fence slat (Zaunlatte 700,343, item OI010). Exit left to the board.
import { defineMovie } from '../lib/api';
import { npcRig, rigAtEye } from '../lib/npcrig';
import { cloud } from '../lib/seaside';
import { inScene } from '../lib/stageloc';
import { C, blob, circle, defs, dk, ellipse, g, linGrad, lt, path, r2, rect, rng } from '../lib/svg';
import { cobblePattern, grassPattern } from '../lib/textures';
import { headline } from '../lib/ui';

const BUTLER_K = 0.55;

function stars(): string {
  const r = rng(91);
  let s = '';
  for (let i = 0; i < 40; i++) s += circle(r() * 800, r() * 200, 1 + r() * 1.6, { fill: '#fff6c0', opacity: 0.6 + r() * 0.4 });
  return s;
}

function interior(): string {
  // lit hall behind the door: striped wallpaper, wall lamp, floor
  let s = rect(470, 168, 166, 160, { fill: '#e8d060' });
  for (let x = 478; x < 636; x += 16) s += rect(x, 168, 7, 160, { fill: '#c8a830' });
  s += rect(470, 300, 166, 28, { fill: '#a8402a' });
  s += path('M500 214 h8 v-10 h-8 z', { fill: '#3a3a3a' }) + path('M496 214 q8 -26 16 0 z', { fill: '#fff6c0', stroke: '#8a8a8a', strokeWidth: 2 });
  return s;
}

function butler(mouth = 1, tray = 0): string {
  const [x, y] = rigAtEye('Butler', [571.5, 0], BUTLER_K);
  const yy = y + 316.5 - (y - 0); // feet at 316.5
  const fy = 316.5;
  void yy;
  const glasses = [0, 1, 2].map((i) => path(`M${504 + i * 10} 248 l4 -14 h-8 z M${508 + i * 10} 248 v6`, { fill: '#e8f4fa', stroke: '#8a93a6', strokeWidth: 1.5 })).join('');
  return npcRig('Butler', x, fy, BUTLER_K, {
    mouth, face: { mouthK: 0.8 },
    armL: { hand: [526, 262], rot: -60 },
    armR: { hand: [600, 290], rot: 20 },
  }) + g({ transform: `rotate(${tray * -4} 516 256)` }, ellipse(516, 258, 30, 6, { fill: '#e8a040', stroke: '#8a5a10', strokeWidth: 2.5 }), glasses);
}

/** door 1 closed … 12 open (butler visible from frame 5) */
function door(f: number, mouth = 1): string {
  const t = Math.min(1, (f - 1) / 6);
  let s = interior();
  if (f >= 5) s += butler(mouth, f >= 9 ? 1 : 0);
  // right leaf (hinge right) – glazed door
  const k = Math.cos(t * Math.PI * 0.47);
  const xr = 636, w = 166 * 0.5;
  const leaf = (x0: number, hingeRight: boolean, kk: number) => {
    const ww = w * kk;
    const xa = hingeRight ? xr - ww : x0;
    const grow = 10 * (1 - kk);
    const ox = hingeRight ? xa : xa + ww;
    return path(`M${r2(xa)} ${r2(168 - (hingeRight ? grow : 0))} L${r2(xa + ww)} ${r2(168 - (hingeRight ? 0 : grow))} V${r2(328 + (hingeRight ? 0 : grow))} L${r2(xa)} ${r2(328 + (hingeRight ? grow : 0))} Z`, { fill: '#f4f4f6', stroke: '#6a6a72', strokeWidth: 4, strokeLinejoin: 'round' }) +
      (kk > 0.3 ? rect(xa + 8 * kk, 180, ww - 16 * kk, 130, { fill: '#9ac8e8', opacity: 0.85, stroke: '#c8ccd2', strokeWidth: 3 }) +
        path(`M${r2(xa + ww / 2)} 180 V310 M${r2(xa + 8 * kk)} 230 H${r2(xa + ww - 8 * kk)} M${r2(xa + 8 * kk)} 270 H${r2(xa + ww - 8 * kk)}`, { stroke: '#c8ccd2', strokeWidth: 3 }) : '') +
      circle(ox + (hingeRight ? 10 : -10) * kk, 252, 4, { fill: C.gold });
  };
  s += leaf(470, false, Math.cos(t * Math.PI * 0.4)) + leaf(553, true, k);
  return s;
}

function world(f = 1, mouth = 1): string {
  let s = defs(linGrad('night', [[0, '#1a2a6a'], [1, '#3a4aa0']]), cobblePattern('stone', { base: '#9a9aa2', mortar: '#5a5a62', size: 30, seed: 93 }), grassPattern('lawn', { base: '#3a7a3a', seed: 94 }));
  s += rect(0, 0, 800, 448, { fill: 'url(#night)' }) + stars();
  s += cloud(720, 60, 24, 'nc', '#4a5ab0');
  s += path('M0 300 Q200 240 420 290 V448 H0 Z', { fill: 'url(#lawn)' }) + path('M560 300 Q700 250 800 270 V448 H560 Z', { fill: 'url(#lawn)' });
  // villa facade
  s += rect(250, 60, 430, 360, { fill: 'url(#stone)', stroke: '#4a4a52', strokeWidth: 4 });
  s += rect(250, 0, 430, 72, { fill: '#f0ece0', stroke: '#6a4a2a', strokeWidth: 4 });
  s += path('M250 0 V72 M330 0 V72 M430 0 V72 M520 0 V72 M600 0 V72 M680 0 V72 M250 72 H680', { stroke: '#6a4a2a', strokeWidth: 8 });
  for (const x of [282, 540]) s += rect(x, 6, 40, 60, { fill: C.red }) + path(`M${x} 14 l40 18 M${x} 34 l40 18 M${x} 54 l20 10`, { stroke: '#7a2a1a', strokeWidth: 6 });
  for (const x of [352, 452]) s += rect(x, 10, 54, 52, { fill: '#ffe58a', stroke: C.white, strokeWidth: 4 }) + path(`M${x + 27} 10 V62 M${x} 36 H${x + 54}`, { stroke: C.white, strokeWidth: 3 });
  for (let x = 260; x < 680; x += 46) s += rect(x, 74, 24, 18, { fill: '#8a5a2a' });
  // big arched window (lit)
  s += path('M292 316 V180 Q356 116 420 180 V316 Z', { fill: '#ffe58a', stroke: '#e8e8ee', strokeWidth: 8 });
  s += path('M356 130 V316 M292 222 H420 M292 268 H420 M320 150 L356 180 L392 150', { stroke: '#e8e8ee', strokeWidth: 4, fill: 'none' });
  // door arch + fanlight (door leaves are the sprite)
  s += path('M462 330 V164 H644 V330 Z', { fill: '#4a4a52' });
  s += path('M472 160 Q553 96 634 160 Z', { fill: '#ffe58a', stroke: '#e8e8ee', strokeWidth: 6 }) + path('M553 108 V160 M520 116 L536 160 M586 116 L570 160', { stroke: '#e8e8ee', strokeWidth: 3 });
  s += door(f, mouth);
  // diamond lamp + bell + name plate
  s += path('M432 170 l14 -22 l14 22 l-14 22 z', { fill: '#ffe24a', stroke: '#2a2a30', strokeWidth: 3 });
  s += rect(434, 244, 34, 16, { rx: 3, fill: '#c8ccd2', stroke: '#4a4e58', strokeWidth: 2 }) + circle(451, 252, 5, { fill: C.gold, stroke: C.goldDark, strokeWidth: 1.5 });
  // right tower side (dark)
  s += rect(680, 0, 100, 420, { fill: '#2a2a40', stroke: '#15151f', strokeWidth: 4 }) + path('M700 300 V160 Q728 120 756 160 V300 Z', { fill: '#ffe58a', opacity: 0.85 });
  // stairs with red carpet + railings
  for (let i = 0; i < 4; i++) {
    const y = 330 + i * 24, x0 = 440 - i * 10, x1 = 640 + i * 10;
    s += rect(x0, y, x1 - x0, 24, { fill: '#9a9aa2', stroke: '#4a4a52', strokeWidth: 3 }) + rect(x0 + 24, y, x1 - x0 - 48, 20, { fill: '#c8302a', stroke: '#7a1a14', strokeWidth: 2 });
  }
  s += path('M438 300 L412 420 M640 300 L664 420', { stroke: '#1a1a20', strokeWidth: 6 }) + path('M436 300 V430 M412 420 V448 M642 300 V430 M664 420 V448', { stroke: '#1a1a20', strokeWidth: 5 });
  // tree on the left
  s += path('M30 448 C40 320 30 240 60 160 M50 250 C80 200 120 190 170 170 M44 200 C20 160 10 130 0 120', { fill: 'none', stroke: '#6a6a66', strokeWidth: 14, strokeLinecap: 'round' });
  const crown: [number, number, number][] = [[70, 90, 70], [170, 120, 60], [10, 180, 50], [120, 200, 50], [190, 40, 50]];
  for (const [i, [x, y, r]] of crown.entries()) s += path(blob(x, y, r, r * 0.8, `vt${i}`, 0.22), { fill: i % 2 ? '#2f6a3a' : '#3a7a42', stroke: '#1a4a2a', strokeWidth: 3 });
  // fence
  s += path('M0 352 H420 M0 384 H420 M664 360 H800 M664 392 H800', { stroke: '#8a6a3a', strokeWidth: 8 });
  for (const x of [20, 80, 140, 200, 260, 320, 380, 760]) s += rect(x, 330, 12, 86, { rx: 2, fill: '#a8804a', stroke: '#5a3a1a', strokeWidth: 3 });
  // path / cobbles
  s += path('M0 448 V416 Q400 400 800 420 V448 Z', { fill: '#6a6a72', stroke: '#3a3a42', strokeWidth: 3 });
  return s;
}

export default defineMovie({
  Headline: (m, w, h) => headline('An der alten Villa', w, h),
  Background: () => world(1),
  'Door-*': (m) => inScene(m, world(m.frame ?? 1)),
  'ButlerMund-*': (m) => inScene(m, world(12, [1, 2, 3][(m.frame ?? 1) - 1])),
  Zaunlatte: (m, w, h) => rect(w / 2 - 7, 3, 14, h - 6, { rx: 2, fill: '#a8804a', stroke: '#5a3a1a', strokeWidth: 3 }) + path(`M${w / 2 - 7} 6 l7 -4 l7 4`, { fill: '#a8804a', stroke: '#5a3a1a', strokeWidth: 2 }) + circle(w / 2, 22, 2, { fill: '#3a3a3a' }) + circle(w / 2, h - 30, 2, { fill: '#3a3a3a' }),
});
