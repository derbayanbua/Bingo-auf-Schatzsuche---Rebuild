// GS016-01 "Angeln". Scene coordinates (stage y - 45):
// Figure loc 407,112 (Bingo-n / Puck-n, n = round(hookX / 40) + 1 → rod points towards the hook) on the rock,
// Haken loc = rope end (Seil = 1 px shape drawn by code from above the scene), Kiste 76,122 158x91 (front of the
// chest, shown over the hook when it is lowered into the chest), drift items enter from the right at y ≈ 320.
import { defineMovie, type Member } from '../lib/api';
import { bongo, bongoBoots, pucki, puckiCurl, puckiShoes } from '../lib/characters';
import { itemArt, itemShape } from '../lib/items';
import { C, circle, defs, ellipse, g, linGrad, lt, path, r2, rect, rng } from '../lib/svg';
import { sandPattern, waterPattern, woodPattern } from '../lib/textures';
import { coinIcon, fitText, headline } from '../lib/ui';

const FIG = { x: 407, y: 112 };

// ------------------------------------------------------------------ chest (front = member Kiste)
const CHEST = { x: 76, y: 122, w: 158, h: 91 };

function chestFront(ox: number, oy: number): string {
  const { w, h } = CHEST;
  const x = ox, y = oy;
  let s = rect(x + 3, y + 3, w - 6, h - 6, { rx: 8, fill: '#b8682e', stroke: C.woodDeep, strokeWidth: 4 });
  for (let i = 1; i < 4; i++) s += path(`M${x + 6} ${y + 3 + (i * (h - 6)) / 4} h${w - 12}`, { stroke: C.woodDark, strokeWidth: 2, opacity: 0.55 });
  s += path(`M${x + 12} ${y + 12} h${w - 50}`, { stroke: lt('#b8682e', 0.4), strokeWidth: 3, strokeLinecap: 'round', opacity: 0.8 });
  // metal bands + corners
  for (const bx of [x + 22, x + w - 32]) s += rect(bx, y + 3, 10, h - 6, { fill: '#9aa4ad', stroke: '#4d5560', strokeWidth: 2.5 }) + circle(bx + 5, y + 16, 2, { fill: '#4d5560' }) + circle(bx + 5, y + h - 16, 2, { fill: '#4d5560' });
  // lock plate + handle
  s += rect(x + w / 2 - 13, y + 8, 26, 30, { rx: 4, fill: C.gold, stroke: C.goldDark, strokeWidth: 2.5 }) + path(`M${x + w / 2} ${y + 20} v8`, { stroke: C.goldDark, strokeWidth: 4, strokeLinecap: 'round' });
  s += path(`M${x + w / 2 - 20} ${y + 58} q20 18 40 0`, { fill: 'none', stroke: '#4d5560', strokeWidth: 4, strokeLinecap: 'round' });
  return s;
}

function chestBack(): string {
  const { x, y, w } = CHEST;
  // open lid leaning back + dark inside visible above the front wall
  let s = path(`M${x + 6} ${y + 6} L${x - 20} ${y - 62} L${w + x - 40} ${y - 72} L${x + w - 6} ${y + 2} Z`, { fill: '#a85e28', stroke: C.woodDeep, strokeWidth: 4, strokeLinejoin: 'round' });
  s += path(`M${x - 6} ${y - 26} L${x + w - 22} ${y - 34} M${x - 14} ${y - 46} L${x + w - 32} ${y - 54}`, { stroke: C.woodDark, strokeWidth: 2, opacity: 0.6 });
  s += path(`M${x + 2} ${y + 10} L${x + 18} ${y - 14} H${x + w - 8} L${x + w - 2} ${y + 8} Z`, { fill: '#3a1d0a', stroke: C.woodDeep, strokeWidth: 3 });
  return s;
}

// ------------------------------------------------------------------ background
function background(w: number, h: number): string {
  const R = rng('gs016');
  let s = defs(
    sandPattern('gs16sand', 16),
    waterPattern('gs16water', { base: '#3a9ad8', seed: 16, size: 160 }),
    woodPattern('gs16pier', { base: '#c99a5e', dark: '#8a5a2e', plank: 18, seed: 4 }),
    linGrad('gs16deep', [[0, '#5ab4e8'], [1, '#2a78c0']]),
  );
  s += rect(0, 0, w, 215, { fill: 'url(#gs16sand)' });
  // dunes
  s += path('M0 60 q120 -40 240 -6 q140 40 300 -10 q140 -40 260 4 V0 H0 Z', { fill: lt(C.sand, 0.25) });
  s += path('M0 150 q160 -30 320 -4 q200 30 480 -14 V215 H0 Z', { fill: C.sandDark, opacity: 0.35 });
  for (let i = 0; i < 6; i++) s += path(`M${r2(260 + R() * 500)} ${r2(30 + R() * 140)} q6 -10 12 0 q6 -10 12 0`, { fill: 'none', stroke: '#5a9a3a', strokeWidth: 3, strokeLinecap: 'round' });
  // shells
  s += ellipse(70, 200, 8, 5, { fill: '#f6c6b8', stroke: '#c07a68', strokeWidth: 2 }) + ellipse(300, 190, 6, 4, { fill: C.white, stroke: C.stoneDark, strokeWidth: 2 });
  // chest on the sand (front = member Kiste, painted here too)
  s += ellipse(CHEST.x + CHEST.w / 2 + 10, CHEST.y + CHEST.h - 2, 92, 12, { fill: '#000', opacity: 0.18 });
  s += chestBack() + chestFront(CHEST.x, CHEST.y);
  // water
  s += rect(0, 205, w, h - 205, { fill: 'url(#gs16deep)' });
  s += rect(0, 205, w, h - 205, { fill: 'url(#gs16water)', opacity: 0.55 });
  s += path(`M0 207 ${Array.from({ length: 21 }, (_, i) => `q20 ${i % 2 ? 6 : -6} 40 0`).join(' ')} V215 H0 Z`, { fill: lt('#3a9ad8', 0.5), opacity: 0.8 });
  for (let i = 0; i < 26; i++) {
    const x = R() * w, y = 230 + R() * 210, l = 14 + R() * 26;
    s += path(`M${r2(x)} ${r2(y)} q${r2(l / 4)} -4 ${r2(l / 2)} 0 t${r2(l / 2)} 0`, { fill: 'none', stroke: C.white, strokeWidth: 2.5, strokeLinecap: 'round', opacity: 0.5 });
  }
  // pier on the right (posts in the water)
  for (const [px, top, bot] of [[560, 150, 240], [650, 160, 262], [760, 170, 284], [480, 118, 195], [590, 108, 175], [700, 100, 165]] as const) {
    s += rect(px - 9, top, 18, bot - top, { rx: 3, fill: '#9a6a3a', stroke: C.woodDeep, strokeWidth: 3 });
    if (bot > 200) s += ellipse(px, bot, 16, 4, { fill: lt('#3a9ad8', 0.5), opacity: 0.8 }) + rect(px - 8, bot + 2, 16, 20, { fill: '#9a6a3a', opacity: 0.3 });
  }
  s += path('M420 82 L800 60 V140 L540 160 L420 112 Z', { fill: 'url(#gs16pier)', stroke: C.woodDeep, strokeWidth: 4, strokeLinejoin: 'round' });
  s += path('M540 160 L800 140 V160 L540 182 Z', { fill: '#8a5a2e', stroke: C.woodDeep, strokeWidth: 4, strokeLinejoin: 'round' });
  s += path('M420 112 L540 160 V182 L420 128 Z', { fill: '#7a4a20', stroke: C.woodDeep, strokeWidth: 4, strokeLinejoin: 'round' });
  // railing posts + rope
  const rail: [number, number][] = [[460, 74], [530, 70], [600, 66], [670, 62], [740, 58], [800, 55]];
  s += path(`M${rail.map(([x, y]) => `${x} ${y - 26}`).join(' L')}`, { fill: 'none', stroke: '#e0c890', strokeWidth: 4 });
  for (const [x, y] of rail) s += rect(x - 4, y - 34, 8, 40, { rx: 3, fill: C.gold, stroke: C.goldDark, strokeWidth: 2.5 });
  // rock in the water (figure stands on it)
  s += ellipse(432, 236, 108, 14, { fill: '#1d5fa8', opacity: 0.35 });
  s += path('M332 238 q-6 -40 30 -56 q40 -18 84 -12 q52 6 70 34 q12 18 6 34 Z', { fill: C.stone, stroke: C.stoneDark, strokeWidth: 4, strokeLinejoin: 'round' });
  s += path('M352 196 q34 -18 80 -16', { fill: 'none', stroke: C.stoneLight, strokeWidth: 6, strokeLinecap: 'round' });
  s += circle(470, 210, 5, { fill: C.stoneDark, opacity: 0.4 }) + circle(390, 220, 4, { fill: C.stoneDark, opacity: 0.4 }) + circle(500, 222, 3, { fill: C.stoneDark, opacity: 0.4 });
  s += path(`M328 236 ${Array.from({ length: 6 }, (_, i) => `q8 ${i % 2 ? 4 : -4} 32 0`).join(' ')}`, { fill: 'none', stroke: C.white, strokeWidth: 3, strokeLinecap: 'round', opacity: 0.8 });
  return s;
}

// ------------------------------------------------------------------ fishing figures
function armTube(sx: number, sy: number, ex: number, ey: number, hx: number, hy: number, fill: string, dark: string, hand: number): string {
  const d = `M${r2(sx)} ${r2(sy)} Q${r2(ex)} ${r2(ey)} ${r2(hx)} ${r2(hy)}`;
  return path(d, { fill: 'none', stroke: dark, strokeWidth: 9, strokeLinecap: 'round' }) +
    path(d, { fill: 'none', stroke: fill, strokeWidth: 5, strokeLinecap: 'round' }) +
    circle(hx, hy, hand, { fill, stroke: dark, strokeWidth: 2.4 });
}

function rodAndTip(m: Member, gx: number, gy: number): { rod: string; dx: number; dy: number } {
  const t = (Math.max(1, Math.min(21, m.frame ?? 1)) - 1) / 20;
  const tipX = -m.regX + 5 + t * (m.w - 10), tipY = -m.regY + 4;
  const len = Math.hypot(tipX - gx, tipY - gy);
  const dx = (tipX - gx) / len, dy = (tipY - gy) / len;
  const bx = gx - dx * 26, by = gy - dy * 26;
  const d = `M${r2(bx)} ${r2(by)} L${r2(tipX)} ${r2(tipY)}`;
  let rod = path(d, { stroke: '#3a1d0a', strokeWidth: 6.5, strokeLinecap: 'round' }) + path(d, { stroke: '#b8682e', strokeWidth: 3, strokeLinecap: 'round' });
  // handle + reel + rings
  rod += path(`M${r2(bx)} ${r2(by)} L${r2(gx + dx * 4)} ${r2(gy + dy * 4)}`, { stroke: '#2a2140', strokeWidth: 8, strokeLinecap: 'round' });
  const rx = gx - dx * 12 - dy * 7, ry = gy - dy * 12 + dx * 7;
  rod += circle(rx, ry, 6, { fill: '#c8ccd6', stroke: '#4d5560', strokeWidth: 2 }) + circle(rx, ry, 2, { fill: '#4d5560' });
  for (const f of [0.45, 0.75]) rod += circle(gx + (tipX - gx) * f, gy + (tipY - gy) * f, 2.2, { fill: '#c8ccd6', stroke: '#4d5560', strokeWidth: 1.2 });
  rod += circle(tipX, tipY, 2.4, { fill: C.red, stroke: C.redDark, strokeWidth: 1.2 });
  return { rod, dx, dy };
}

function fishingBongo(m: Member): string {
  const k = 0.6, tx = 12 - k, ty = 16;
  const toLoc = (x: number, y: number): [number, number] => [tx + x * k, ty + y * k];
  const sw = 4;
  const body = g({ transform: `translate(${r2(tx)} ${ty}) scale(${k})` }, bongo(k, { full: false, mouth: 2 }), bongoBoots(1, sw));
  const gx = 14, gy = 30;
  const { rod, dx, dy } = rodAndTip(m, gx, gy);
  const [s1x, s1y] = toLoc(-50, 0), [s2x, s2y] = toLoc(52, -4);
  const h2x = gx + dx * 16, h2y = gy + dy * 16;
  return body + rod +
    armTube(s2x, s2y, s2x + 10, s2y + 22, gx, gy, C.orange, C.orangeDark, 6) +
    armTube(s1x, s1y, s1x - 4, s1y + 24, h2x, h2y, C.orange, C.orangeDark, 6);
}

function fishingPucki(m: Member): string {
  const k = 0.72, tx = 12 - 35 * k, ty = -1;
  const toLoc = (x: number, y: number): [number, number] => [tx + x * k, ty + y * k];
  const sw = 4;
  const body = g({ transform: `translate(${r2(tx)} ${ty}) scale(${k})` }, pucki(k, { full: false, mouth: 2, eyes: 4 }), puckiCurl(2, sw), puckiShoes(1, sw));
  const gx = 18, gy = 34;
  const { rod } = rodAndTip(m, gx, gy);
  const [sx, sy] = toLoc(70, 20);
  return body + rod + armTube(sx, sy, sx + 10, sy + 16, gx, gy, C.mint, C.mintDark, 6);
}

// ------------------------------------------------------------------ hook + drift items
function hook(w: number, h: number): string {
  const d = `M${w / 2} 4 V${h - 9} q0 6 -4 6 q-4 0 -4 -6`;
  return circle(w / 2, 3, 2.4, { fill: 'none', stroke: '#4d5560', strokeWidth: 1.8 }) +
    path(d, { fill: 'none', stroke: '#4d5560', strokeWidth: 3.6, strokeLinecap: 'round' }) +
    path(d, { fill: 'none', stroke: '#d9dde4', strokeWidth: 1.6, strokeLinecap: 'round' }) +
    path(`M${w / 2 - 8} ${h - 10} l-1.5 -4 l3.5 2 z`, { fill: '#d9dde4', stroke: '#4d5560', strokeWidth: 1.2 });
}

function fitted(body: string, bw: number, bh: number, w: number, h: number, rot = 0): string {
  const k = Math.min((w - 4) / bw, (h - 4) / bh);
  return g({ transform: `translate(${r2(w / 2)} ${r2(h / 2)}) rotate(${rot}) scale(${r2(k)})` }, body);
}

function barrel(): string {
  return path('M-22 -28 q-8 28 0 56 h44 q8 -28 0 -56 z', { fill: '#a86a32', stroke: C.woodDeep, strokeWidth: 3.5 }) +
    path('M-8 -28 q-3 28 0 56 M8 -28 q3 28 0 56', { fill: 'none', stroke: C.woodDark, strokeWidth: 2 }) +
    path('M-26 -14 h52 M-26 14 h52', { stroke: '#4d5560', strokeWidth: 4.5 }) +
    ellipse(0, -28, 22, 5, { fill: '#7a4a20', stroke: C.woodDeep, strokeWidth: 3 }) +
    path('M-16 -20 q-4 18 0 36', { fill: 'none', stroke: lt('#a86a32', 0.4), strokeWidth: 3, strokeLinecap: 'round' });
}

function pot(): string {
  return path('M-24 -10 h48 v18 q0 16 -16 16 h-16 q-16 0 -16 -16 z', { fill: '#5a5f6a', stroke: '#2a2d34', strokeWidth: 3.5 }) +
    ellipse(0, -10, 24, 6, { fill: '#3a3d44', stroke: '#2a2d34', strokeWidth: 3 }) +
    path('M-24 -4 h-8 M24 -4 h8', { stroke: '#2a2d34', strokeWidth: 5, strokeLinecap: 'round' }) +
    path('M-17 -2 v14', { stroke: '#8a909c', strokeWidth: 3, strokeLinecap: 'round' }) +
    circle(10, 8, 3, { fill: '#a0662a', opacity: 0.8 }) + circle(-4, 16, 2.4, { fill: '#a0662a', opacity: 0.8 });
}

function sock(): string {
  const d = 'M-10 -26 h20 v30 q0 4 4 6 l12 6 q8 6 2 14 q-4 6 -12 2 l-22 -10 q-6 -4 -4 -12 z';
  return path(d, { fill: '#f2f2f6', stroke: '#7a808c', strokeWidth: 3, strokeLinejoin: 'round' }) +
    path('M-10 -18 h20 M-10 -10 h20', { stroke: C.red, strokeWidth: 4 }) +
    circle(18, 22, 4, { fill: '#c8a090' });
}

function moneySack(): string {
  return path('M-8 -18 q-24 6 -22 26 q2 16 30 16 q28 0 30 -16 q2 -20 -22 -26 z', { fill: '#c9a46a', stroke: '#6b4a20', strokeWidth: 3.5, strokeLinejoin: 'round' }) +
    path('M-10 -18 l-6 -8 h32 l-6 8 z', { fill: '#c9a46a', stroke: '#6b4a20', strokeWidth: 3, strokeLinejoin: 'round' }) +
    path('M-10 -18 h20', { stroke: C.red, strokeWidth: 4, strokeLinecap: 'round' }) +
    coinIcon(0, 8, 9) +
    path('M-16 -6 q-4 8 -2 16', { fill: 'none', stroke: lt('#c9a46a', 0.5), strokeWidth: 3, strokeLinecap: 'round' });
}

function oldShoe(): string {
  return path('M-24 10 v-14 q0 -6 8 -8 l8 -2 q4 8 12 8 q14 0 20 8 q6 6 2 10 z', { fill: '#6a4a2e', stroke: '#2e1c0c', strokeWidth: 3, strokeLinejoin: 'round' }) +
    path('M-26 10 h54', { stroke: '#2e1c0c', strokeWidth: 4, strokeLinecap: 'round' }) +
    path('M-4 0 l4 -4 M2 2 l4 -4', { stroke: C.cream, strokeWidth: 2, strokeLinecap: 'round' }) +
    path('M18 4 q4 -2 6 2', { fill: 'none', stroke: '#2e1c0c', strokeWidth: 2 });
}

// ------------------------------------------------------------------ intro (800x448)
function intro(w: number, h: number): string {
  let s = defs(
    woodPattern('gs16iwood', { base: '#8a5428', dark: '#5a3418', plank: 32, seed: 7 }),
    `<clipPath id="gs16ithumb"><rect x="34" y="24" width="352" height="197" rx="14"/></clipPath>`,
  );
  s += rect(0, 0, w, h, { fill: 'url(#gs16iwood)' });
  // scene thumbnail
  s += rect(28, 18, 364, 209, { rx: 18, fill: C.cream, stroke: C.woodDeep, strokeWidth: 4 });
  s += g({ 'clip-path': 'url(#gs16ithumb)' },
    g({ transform: 'translate(34 24) scale(0.44)' }, background(800, 448),
      g({ transform: `translate(${FIG.x} ${FIG.y})` }, fishingBongo({ dir: '', num: 0, name: 'Bingo-7', w: 119, h: 202, regX: 48, regY: 112, base: 'Bingo', frame: 7 })),
      path('M250 0 V330', { stroke: '#2a2140', strokeWidth: 2 }),
      g({ transform: 'translate(244 330)' }, hook(12, 24)),
      g({ transform: 'translate(560 330)' }, itemArt('OI007', 42, 43) ?? ''),
      g({ transform: 'translate(660 320) scale(0.9)' }, fitted(sock(), 40, 54, 38, 46))));
  // mouse
  s += g({},
    rect(600, 30, 120, 170, { rx: 58, fill: '#f2f2f6', stroke: '#4a4e5a', strokeWidth: 4 }),
    path('M600 100 h120 M660 30 v70', { stroke: '#4a4e5a', strokeWidth: 3 }),
    rect(653, 50, 14, 30, { rx: 7, fill: '#9aa4ad', stroke: '#4a4e5a', strokeWidth: 2.5 }),
    path('M612 116 q4 40 30 62', { fill: 'none', stroke: C.white, strokeWidth: 5, strokeLinecap: 'round' }),
    path('M660 30 q0 -20 30 -24', { fill: 'none', stroke: '#4a4e5a', strokeWidth: 4, strokeLinecap: 'round' }));
  s += fitText('Gespielt wird mit der Maus!', 520, 214, 340, 26, { anchor: 'middle', fill: C.yellow, stroke: C.woodDeep, sw: 4 });
  // text panel
  s += rect(30, 240, 740, 108, { rx: 16, fill: '#000', opacity: 0.28 });
  const lines = [
    'Angeln! Bewege den Haken mit der Maus und fische die Sachen',
    'aus dem Wasser. Lass sie über der Kiste hinein fallen – vielleicht',
    'ist etwas Brauchbares dabei! Kleiner Tipp: Wertvolles beißt',
    'nur an, wenn du ganz genau zielst.',
  ];
  lines.forEach((l, i) => (s += fitText(l, 400, 262 + i * 24, 710, 21, { anchor: 'middle', fill: C.cream, font: 'body', weight: 800 })));
  s += rect(0, 352, w, 22, { fill: '#000', opacity: 0.3 });
  s += fitText('Für dieses Spiel brauchst du folgende Sache – leg sie hier ab:', 400, 363, 700, 15, { anchor: 'middle', fill: C.yellow, font: 'body', weight: 800 });
  return s;
}

export default defineMovie({
  Headline: (m, w, h) => headline('Angeln', w, h),
  Intro: (m, w, h) => intro(w, h),
  Background: (m, w, h) => background(w, h),
  Kiste: () => chestFront(0, 0),
  'Bingo-*': (m) => g({ transform: `translate(${m.regX} ${m.regY})` }, fishingBongo(m)),
  'Puck-*': (m) => g({ transform: `translate(${m.regX} ${m.regY})` }, fishingPucki(m)),
  Haken: (m, w, h) => hook(w, h),
  Eimer: (m, w, h) => itemArt('OI074', w, h),
  Karaffe: (m, w, h) => itemArt('OI008', w, h),
  Muenze: (m, w, h) => itemArt('OI007', w, h),
  Witzkarte: (m, w, h) => fitted(itemShape('OI006'), 44, 56, w, h, -8),
  Fass: (m, w, h) => fitted(barrel(), 56, 64, w, h, -14),
  Topf: (m, w, h) => fitted(pot(), 68, 42, w, h, 8),
  Socke: (m, w, h) => fitted(sock(), 40, 56, w, h),
  Geldsack: (m, w, h) => fitted(moneySack(), 64, 54, w, h),
  Schuh: (m, w, h) => fitted(oldShoe(), 60, 30, w, h, -10),
});
