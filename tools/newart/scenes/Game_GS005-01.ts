// GS005-01 "Fernrohr" – telescope on the lighthouse gallery.
// Panorama (ch 5) and Zoom (ch 6) lie BEHIND the Background (ch 10); they are seen through the eyepiece window
// (Linse, ch 11, scene rect 305,151 134x118 = transparent hole in the Background).
// Panorama loc ranges of the game code (stage): zoom1 570..630/110..170, zoom2 520..580/70..130, zoom3 140..200/70..130
// -> panorama points in the window centre: sailboat ≈ (172,339), rock spire ≈ (222,379), islet ≈ (602,379).
// Combination hint (GS005-02 = 3 8 7 1 9 2): digits on the grate of the rock spire, read column by column.
import { defineMovie } from '../lib/api';
import { SUNSET, cloud, introScreen, shimmer } from '../lib/gs005a';
import { C, circle, defs, dk, el, ellipse, g, line, linGrad, lt, path, poly, radGrad, rect } from '../lib/svg';
import { headline } from '../lib/ui';

const HOLE = { x: 305, y: 151, w: 134, h: 118 };

function sky(id: string, w: number, h: number, horizon: number): string {
  return defs(linGrad(id, SUNSET.map(([o, c]) => [o, c] as [number, string]))) + rect(0, 0, w, horizon, { fill: `url(#${id})` });
}

function sea(id: string, w: number, h: number, top: number, seed: string): string {
  return defs(linGrad(id, [[0, '#d9a07a'], [0.25, '#4f8fc8'], [1, '#1d5fa8']])) + rect(0, top, w, h - top, { fill: `url(#${id})` }) +
    shimmer(seed, 0, top + 2, w, h - top, '#ffe2a8', Math.round(w / 8));
}

function sailboat(x: number, y: number, s: number, number = ''): string {
  const t = `translate(${x} ${y}) scale(${s})`;
  return g({ transform: t },
    path('M-60 0 h120 l-14 22 h-92 z', { fill: C.wood, stroke: C.woodDeep, strokeWidth: 4, strokeLinejoin: 'round' }),
    path('M-56 6 h112', { stroke: lt(C.wood, 0.4), strokeWidth: 3 }),
    line(-4, 0, -4, -196, { stroke: C.woodDeep, strokeWidth: 6, strokeLinecap: 'round' }),
    path('M0 -186 L62 -8 H0 z', { fill: C.cream, stroke: '#b89a6a', strokeWidth: 4, strokeLinejoin: 'round' }),
    path('M-9 -176 L-58 -8 H-9 z', { fill: C.cream, stroke: '#b89a6a', strokeWidth: 4, strokeLinejoin: 'round' }),
    path('M-2 -196 l34 10 l-34 10 z', { fill: C.red, stroke: C.redDark, strokeWidth: 3, strokeLinejoin: 'round' }),
    number ? g({ transform: 'translate(30 -52) rotate(62) scale(-1 1)' },
      `<text x="0" y="0" font-family="'Baloo 2'" font-weight="800" font-size="24" fill="${C.ink}" text-anchor="middle">${number}</text>`) : '');
}

function rockSpire(x: number, y: number, s: number, grate: boolean): string {
  const rock = '#6f8a3a';
  let r = g({ transform: `translate(${x} ${y}) scale(${s})` },
    path('M-150 0 q20 -50 60 -40 q20 -10 40 4 z', { fill: dk(rock, 0.1), stroke: dk(rock, 0.5), strokeWidth: 4 }),
    path('M80 0 q30 -60 70 -36 q30 -30 50 10 v26 z', { fill: dk(rock, 0.1), stroke: dk(rock, 0.5), strokeWidth: 4 }),
    path('M-110 0 q40 -120 60 -230 q14 -80 34 -84 q22 -2 36 70 q30 120 70 244 z', { fill: rock, stroke: dk(rock, 0.5), strokeWidth: 5, strokeLinejoin: 'round' }),
    path('M-40 -250 q-14 120 -48 236', { fill: 'none', stroke: lt(rock, 0.35), strokeWidth: 6, strokeLinecap: 'round', opacity: 0.8 }),
    path('M40 -200 q14 90 50 190', { fill: 'none', stroke: dk(rock, 0.3), strokeWidth: 5, strokeLinecap: 'round', opacity: 0.7 }),
    path('M-50 0 q12 -20 30 -14 q14 4 18 14 z', { fill: dk(rock, 0.2), stroke: dk(rock, 0.5), strokeWidth: 3 }));
  if (grate) {
    // cave entrance with an orange grate; digits read column by column: 3 8 | 7 | 1 | 9 2
    const gx = -22, gy = -122, gw = 52, gh = 74;
    let bars = '';
    for (let i = 0; i < 4; i++) bars += rect(gx + 4 + i * 12.5, gy + 2, 6, gh - 4, { fill: '#e8862a', stroke: '#7a3a08', strokeWidth: 1.6 });
    const dig = (col: number, row: number, d: string) =>
      `<text x="${gx + 7 + col * 12.5}" y="${gy + 14 + row * 26}" font-family="'Baloo 2'" font-weight="800" font-size="13" fill="${C.white}" stroke="${C.ink}" stroke-width="2.5" paint-order="stroke" text-anchor="middle">${d}</text>`;
    r += g({ transform: `translate(${x} ${y}) scale(${s})` },
      rect(gx - 4, gy - 4, gw + 8, gh + 8, { rx: 6, fill: '#2a2018', stroke: dk(rock, 0.6), strokeWidth: 3 }), bars,
      line(gx, gy + 4, gx + gw, gy + 4, { stroke: '#7a3a08', strokeWidth: 3 }), line(gx, gy + gh - 4, gx + gw, gy + gh - 4, { stroke: '#7a3a08', strokeWidth: 3 }),
      dig(0, 1, '3'), dig(0, 2, '8'), dig(1, 1, '7'), dig(2, 0, '1'), dig(3, 0, '9'), dig(3, 2, '2'));
  }
  return r;
}

function islet(x: number, y: number, s: number): string {
  return g({ transform: `translate(${x} ${y}) scale(${s})` },
    path('M-200 0 q60 -50 200 -52 q140 2 200 52 z', { fill: C.sand, stroke: C.sandDark, strokeWidth: 4 }),
    path('M-120 -30 q40 -8 80 -6', { fill: 'none', stroke: lt(C.sand, 0.5), strokeWidth: 4, strokeLinecap: 'round' }),
    // palm
    path('M10 -50 q-10 -80 22 -150', { fill: 'none', stroke: '#8a5428', strokeWidth: 10, strokeLinecap: 'round' }),
    path('M24 -48 q6 -70 34 -130', { fill: 'none', stroke: '#6b3410', strokeWidth: 8, strokeLinecap: 'round' }),
    ...[[-70, -30], [-30, -60], [20, -70], [60, -40], [80, 0], [-60, 20]].map(([dx, dy]) =>
      path(`M32 -200 q${dx * 0.5} ${dy - 20} ${dx} ${dy + 30}`, { fill: 'none', stroke: C.grass, strokeWidth: 14, strokeLinecap: 'round' }) +
      path(`M32 -200 q${dx * 0.5} ${dy - 20} ${dx} ${dy + 30}`, { fill: 'none', stroke: C.grassDark, strokeWidth: 3, strokeLinecap: 'round' })),
    // outhouse with a heart
    rect(110, -150, 66, 110, { fill: C.woodMid, stroke: C.woodDeep, strokeWidth: 4 }),
    path('M104 -148 l38 -22 l40 22 z', { fill: C.woodDark, stroke: C.woodDeep, strokeWidth: 4, strokeLinejoin: 'round' }),
    line(126, -146, 126, -42, { stroke: C.woodDeep, strokeWidth: 2 }), line(160, -146, 160, -42, { stroke: C.woodDeep, strokeWidth: 2 }),
    path('M143 -122 c-8 -10 -18 0 0 14 c18 -14 8 -24 0 -14 z', { fill: C.red, stroke: C.redDark, strokeWidth: 2 }),
    circle(118, -96, 3.5, { fill: C.ink }),
    // bench
    rect(-90, -30, 70, 8, { rx: 2, fill: C.wood, stroke: C.woodDeep, strokeWidth: 3 }),
    line(-82, -22, -82, -4, { stroke: C.woodDeep, strokeWidth: 4 }), line(-28, -22, -28, -4, { stroke: C.woodDeep, strokeWidth: 4 }),
    rect(-88, -58, 6, 30, { fill: C.wood, stroke: C.woodDeep, strokeWidth: 2.5 }));
}

function panorama(w: number, h: number): string {
  const hz = 340;
  let s = sky('p-sky', w, h, hz + 2);
  s += defs(radGrad('p-sun', [[0, '#fff6c8'], [0.4, '#ffd27a', 0.9], [1, '#ff9a3c', 0]]));
  s += circle(284, hz, 90, { fill: 'url(#p-sun)' }) + circle(284, hz, 22, { fill: '#fff3b0', stroke: '#ffd23f', strokeWidth: 3 });
  s += cloud(10, 160, 3.4, '#a8505a') + cloud(300, 150, 3.2, '#b65a52') + cloud(560, 120, 2.8, '#a04a5c') + cloud(120, 60, 1.6, '#c06a5a') + cloud(620, 40, 1.4, '#c06a5a');
  s += sea('p-sea', w, h, hz, 'p-shim');
  // left green island
  s += path('M30 368 q24 -24 46 -14 q20 -14 44 14 z', { fill: '#4f8a3a', stroke: '#2a5a1e', strokeWidth: 3 });
  // far islands + small boats
  s += path('M500 344 q14 -12 26 -6 q14 -10 34 6 z', { fill: '#5a7a3a', stroke: '#2f4a1e', strokeWidth: 2.5 });
  s += path('M672 344 q14 -12 26 -6 q14 -10 34 6 z', { fill: '#5a7a3a', stroke: '#2f4a1e', strokeWidth: 2.5 });
  s += sailboat(410, 343, 0.06) + sailboat(507, 344, 0.05);
  // three targets
  s += sailboat(174, 352, 0.17);
  s += rockSpire(228, 388, 0.12, false);
  s += islet(604, 385, 0.1);
  return s;
}

function zoomSea(id: string, w: number, h: number, hz: number): string {
  return sky(`${id}-sky`, w, h, hz + 2) + cloud(20, 90, 2.2, '#a04a5c') + cloud(250, 60, 1.6, '#b65a52') + sea(`${id}-sea`, w, h, hz, `${id}-sh`);
}

function background(w: number, h: number): string {
  let s = defs(
    el('mask', { id: 'bg-hole' }, rect(0, 0, w, h, { fill: '#fff' }) + rect(HOLE.x, HOLE.y, HOLE.w, HOLE.h, { fill: '#000' })),
    linGrad('bg-tube', [[0, '#d98a4a'], [0.5, '#f0b070'], [1, '#a8602a']]),
    linGrad('bg-brass', [[0, '#fff1a8'], [0.5, C.gold], [1, C.goldDark]]),
  );
  let b = sky('bg-sky', w, h, h);
  b += cloud(-20, 150, 3.4, '#a8505a') + cloud(540, 110, 2.8, '#a04a5c') + cloud(620, 230, 2, '#b65a52') + cloud(20, 250, 2.2, '#b65a52');
  // stand + parapet
  b += rect(430, 330, 60, 50, { fill: '#e9dcc0', stroke: '#8a8070', strokeWidth: 4 });
  b += rect(360, 395, 230, 60, { fill: C.stoneDark, stroke: '#5a5040', strokeWidth: 4 });
  b += path('M0 384 L800 378 V412 L0 414 z', { fill: C.stone, stroke: '#5a5040', strokeWidth: 4, strokeLinejoin: 'round' });
  b += path('M0 386 L800 380', { stroke: C.stoneLight, strokeWidth: 4 });
  // tube segments (back to front)
  b += g({ transform: 'rotate(-6 560 240)' },
    rect(560, 120, 250, 250, { rx: 30, fill: 'url(#bg-brass)', stroke: C.goldDark, strokeWidth: 5 }),
    ellipse(690, 245, 80, 128, { fill: lt(C.gold, 0.3), stroke: C.goldDark, strokeWidth: 4 }),
    rect(500, 120, 150, 250, { fill: 'url(#bg-tube)', stroke: C.woodDeep, strokeWidth: 5 }),
    ellipse(650, 245, 26, 125, { fill: '#e9a060', stroke: C.woodDeep, strokeWidth: 4 }),
    rect(560, 118, 18, 254, { rx: 6, fill: 'url(#bg-brass)', stroke: C.goldDark, strokeWidth: 3 }),
    rect(440, 128, 120, 234, { fill: 'url(#bg-tube)', stroke: C.woodDeep, strokeWidth: 5 }),
    rect(500, 126, 16, 238, { rx: 6, fill: 'url(#bg-brass)', stroke: C.goldDark, strokeWidth: 3 }),
    path('M450 150 h120 M450 340 h120', { stroke: C.woodDeep, strokeWidth: 2, opacity: 0.35 }));
  // eyepiece (black ring around the view window)
  const cx = HOLE.x + HOLE.w / 2, cy = HOLE.y + HOLE.h / 2;
  b += ellipse(cx + 4, cy + 4, 140, 128, { fill: '#000', opacity: 0.25 });
  b += ellipse(cx, cy, 138, 126, { fill: '#2a2530', stroke: '#0e0b12', strokeWidth: 6 });
  b += ellipse(cx, cy, 116, 104, { fill: '#3a3442', stroke: '#16121a', strokeWidth: 4 });
  b += path(`M${cx - 110} ${cy - 40} q30 -70 110 -76`, { fill: 'none', stroke: '#8a8494', strokeWidth: 7, strokeLinecap: 'round', opacity: 0.8 });
  b += path(`M${cx + 96} ${cy + 60} q-30 46 -80 56`, { fill: 'none', stroke: '#5a5462', strokeWidth: 5, strokeLinecap: 'round' });
  b += rect(HOLE.x - 4, HOLE.y - 4, HOLE.w + 8, HOLE.h + 8, { rx: 10, fill: '#0e0b12' });
  s += g({ mask: 'url(#bg-hole)' }, b);
  return s;
}

/** lens overlay: dark corners, round transparent glass with a rim and a glint */
function linse(w: number, h: number): string {
  const cx = w / 2, cy = h / 2, rx = w / 2 - 6, ry = h / 2 - 5;
  return defs(el('mask', { id: 'ln-m' }, rect(0, 0, w, h, { fill: '#fff' }) + ellipse(cx, cy, rx, ry, { fill: '#000' }))) +
    rect(0, 0, w, h, { rx: 10, fill: '#0e0b12', mask: 'url(#ln-m)' }) +
    ellipse(cx, cy, rx, ry, { fill: 'none', stroke: '#4a4452', strokeWidth: 5 }) +
    ellipse(cx, cy, rx - 4, ry - 4, { fill: '#cfe8f5', opacity: 0.1 }) +
    path(`M${cx - rx + 16} ${cy - 10} q8 -${ry - 22} ${rx - 6} -${ry - 12}`, { fill: 'none', stroke: C.white, strokeWidth: 5, strokeLinecap: 'round', opacity: 0.45 }) +
    ellipse(cx + 34, cy - 22, 9, 4, { fill: C.white, opacity: 0.5, transform: `rotate(-20 ${cx + 34} ${cy - 22})` });
}

function zoom1(w: number, h: number): string {
  return zoomSea('z1', w, h, 300) + sailboat(196, 392, 1.75, '123456');
}
function zoom2(w: number, h: number): string {
  return zoomSea('z2', w, h, 300) + rockSpire(214, 362, 1.05, true);
}
function zoom3(w: number, h: number): string {
  return zoomSea('z3', w, h, 300) + islet(214, 330, 1.0);
}

function introPicture(): string {
  // small telescope on the parapet against the sunset
  return sky('ip-sky', 320, 190, 190) + cloud(10, 70, 1.4, '#a8505a') + cloud(200, 40, 1.2, '#a04a5c') +
    rect(0, 150, 320, 40, { fill: C.stone, stroke: '#5a5040', strokeWidth: 3 }) +
    rect(130, 120, 26, 32, { fill: '#e9dcc0', stroke: '#8a8070', strokeWidth: 3 }) +
    g({ transform: 'rotate(-8 160 90)' },
      rect(150, 50, 140, 86, { rx: 14, fill: C.gold, stroke: C.goldDark, strokeWidth: 4 }),
      rect(110, 56, 80, 74, { fill: '#e0954e', stroke: C.woodDeep, strokeWidth: 4 }),
      rect(140, 54, 10, 78, { fill: C.gold, stroke: C.goldDark, strokeWidth: 2.5 })) +
    ellipse(100, 92, 50, 46, { fill: '#2a2530', stroke: '#0e0b12', strokeWidth: 4 }) +
    ellipse(100, 92, 26, 24, { fill: '#7fc8f5', stroke: '#4a4452', strokeWidth: 3 }) +
    poly([[94, 96], [104, 96], [100, 80]], { fill: C.cream }) + line(88, 99, 112, 99, { stroke: C.woodDark, strokeWidth: 3 });
}

export default defineMovie({
  Headline: (m, w, h) => headline('Fernrohr', w, h),
  Intro: () => introScreen({
    id: 'gs51', device: 'keys', picture: introPicture(),
    lines: [
      'Vom Leuchtturm aus kannst du mit dem Fernrohr weit über das Meer blicken.',
      'Mit den Pfeiltasten schwenkst du das Fernrohr. An einigen Stellen kannst du',
      'mit den Tasten „Plus +“ und „Minus –“ heranzoomen.',
      'Halte die Augen offen – hier gibt es wichtige Hinweise zu entdecken!',
    ],
  }),
  Background: (m, w, h) => background(w, h),
  Linse: (m, w, h) => linse(w, h),
  Panorama: (m, w, h) => panorama(w, h),
  Zoom1: (m, w, h) => zoom1(w, h),
  Zoom2: (m, w, h) => zoom2(w, h),
  Zoom3: (m, w, h) => zoom3(w, h),
});
