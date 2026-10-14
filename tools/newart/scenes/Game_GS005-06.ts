// GS005-06 "Tauchgang" – diving from the lock (Screen-1, right) to the left and up to the surface (Screen-8),
// side cave Screen-X below Screen-5 (chest + oxygen bottles).
// Collision: sprite 9 (matte) = Collision-3/4/5/X at scene x -71/-59/-28/-35, y 0; the game reads its alpha
// (> 24 = blocked). Those members are re-rendered 1:1 from the original 1-bit geometry (lib/diveMasks.ts) and the
// visible rocks of Screen-3/4/5/X are drawn exactly over the same geometry. Screens 1/2/6/7/8 have no mask
// (only the borders in the code) – their scenery stays at the edges.
import { defineMovie } from '../lib/api';
import { DIVE_MASKS } from '../lib/diveMasks';
import { barrel, bubble, chest, coin, coral, diverMember, diverSide, farRocks, kelp, maskRock, seabed, water } from '../lib/dive';
import { itemArt } from '../lib/items';
import { minigameIntro } from '../lib/minigameIntro';
import { C, circle, dk, g, path, rect, rng } from '../lib/svg';
import { fitText, headline } from '../lib/ui';

const MASK_X: Record<string, number> = { '3': -71, '4': -59, '5': -28, X: -35 };

function rocks(key: string): string {
  const m = DIVE_MASKS[`Collision-${key}`];
  return maskRock(`r${key}`, m.d, MASK_X[key], 0, m.w, m.h, key.charCodeAt(0));
}

function lockHatch(x: number, y: number): string {
  // round steel hatch of the diving lock, set in a stone wall at the right edge
  return path(`M${x - 40} 0 H800 V${y + 230} H${x - 20} Q${x - 70} ${y + 120} ${x - 40} 0 Z`, { fill: '#4f7f80', stroke: '#24484a', strokeWidth: 4 }) +
    circle(x + 70, y + 110, 92, { fill: '#7a8a96', stroke: '#2f3a44', strokeWidth: 5 }) +
    circle(x + 70, y + 110, 74, { fill: '#9aaab6', stroke: '#2f3a44', strokeWidth: 4 }) +
    Array.from({ length: 12 }, (_, i) => circle(x + 70 + Math.cos((i * Math.PI) / 6) * 83, y + 110 + Math.sin((i * Math.PI) / 6) * 83, 3.5, { fill: '#2f3a44' })).join('') +
    circle(x + 70, y + 110, 30, { fill: 'none', stroke: C.red, strokeWidth: 9 }) +
    path(`M${x + 40} ${y + 110} h60 M${x + 70} ${y + 80} v60`, { stroke: C.red, strokeWidth: 7, strokeLinecap: 'round' }) +
    circle(x + 70, y + 110, 8, { fill: C.redDark }) +
    path(`M${x + 10} ${y + 60} q30 -40 80 -36`, { fill: 'none', stroke: '#fff', strokeWidth: 6, strokeLinecap: 'round', strokeOpacity: 0.4 });
}

function weeds(xs: number[], y: number, seed: number, maxLen = 160): string {
  const R = rng(seed);
  return xs.map((x, i) => kelp(x, y, 60 + R() * (maxLen - 60), 14 + R() * 18, seed + i, i % 2 ? '#3f9e5a' : '#2f8a6a')).join('');
}

function screen(n: string, w: number, h: number): string {
  const id = `s${n}`;
  switch (n) {
    case '1':
      return water(id, w, h, 0.85, 11) + farRocks(w, 250, 3) + weeds([40, 120, 300, 420, 520], 330, 4, 200) + seabed(w, h, 320, 5) + lockHatch(620, 40) +
        coral(470, 360, 0.9, '#e86a8a', 1) + coral(250, 400, 0.7, '#f0a040', 2);
    case '2':
      return water(id, w, h, 0.8, 12) + farRocks(w, 240, 6) + weeds([90, 260, 380, 640, 720], 340, 7, 220) + seabed(w, h, 335, 8) + coral(150, 390, 1, '#e86a8a', 3) + coral(600, 380, 0.8, '#9a6ae8', 4);
    case '3':
      return water(id, w, h, 0.7, 13) + farRocks(w, 200, 9) + rocks('3') + coral(760, 290, 0.8, '#4fc6d8', 5);
    case '4':
      return water(id, w, h, 0.6, 14) + farRocks(w, 180, 10) + rocks('4');
    case '5':
      return water(id, w, h, 0.5, 15) + farRocks(w, 160, 11) + rocks('5');
    case 'X':
      return water(id, w, h, 0.95, 16) + farRocks(w, 260, 12, '#173f4f') + seabed(w, h, 400, 13) + rocks('X') + weeds([60, 220, 560, 760], 410, 14, 120) + coral(140, 430, 0.8, '#e86a8a', 6);
    case '6':
      return water(id, w, h, 0.4, 17) + farRocks(w, 300, 15) + weeds([60, 240, 700], 448, 18, 180);
    case '7':
      return water(id, w, h, 0.22, 19) + farRocks(w, 380, 20, '#2f7f8f');
    case '8': {
      // just below the surface: bright shimmer band at the top
      let s = water(id, w, h, 0.05, 21);
      const R = rng(22);
      s += rect(0, 0, w, 26, { fill: '#bff0ff', fillOpacity: 0.55 });
      for (let x = 0; x < w; x += 40) s += path(`M${x} ${26 + R() * 6} q20 ${-10 - R() * 6} 40 0`, { fill: 'none', stroke: '#fff', strokeWidth: 3, strokeOpacity: 0.6 });
      return s;
    }
  }
  return '';
}

function plant(n: number, w: number, h: number): string {
  switch (n) {
    case 1: return weeds([30, 64, 92], h - 4, 31, h - 30);
    case 2: return weeds([30, 90, 140, 190], h - 4, 32, h - 40);
    case 3: return kelp(40, 0, -(h - 20), 20, 33, '#3f9e5a') + kelp(110, 0, -(h - 110), 18, 34, '#2f8a6a');
    case 4: {
      const R = rng(35);
      let s = '';
      for (let i = 0; i < 9; i++) {
        const x = 20 + i * 13 + R() * 6, len = 50 + R() * 60, bend = (R() - 0.5) * 50;
        s += path(`M${x} ${h} q${bend * 0.3} ${-len * 0.6} ${bend} ${-len}`, { fill: 'none', stroke: '#1f6b3c', strokeWidth: 7, strokeLinecap: 'round' }) +
          path(`M${x} ${h} q${bend * 0.3} ${-len * 0.6} ${bend} ${-len}`, { fill: 'none', stroke: '#5fc06a', strokeWidth: 4, strokeLinecap: 'round' });
      }
      return s;
    }
    case 6: return kelp(40, 0, -170, 16, 36, '#3f9e5a') + kelp(300, 0, -110, 14, 37, '#2f8a6a') + kelp(570, 0, -200, 18, 38, '#3f9e5a');
    case 7: return weeds([60, 200, 330], h - 2, 39, 380);
  }
  return '';
}

function airDrop(w: number, h: number): string {
  return fitText('Sauerstoff', 6, 11, 110, 18, { fill: C.uiAccent, stroke: C.uiDark, sw: 3 }) +
    circle(37, 58, 32, { fill: 'rgba(255,255,255,0.12)', stroke: 'rgba(255,255,255,0.6)', strokeWidth: 3, strokeDasharray: '6 4' }) +
    rect(91, 45, 166, 20, { rx: 10, fill: C.uiDark, stroke: C.uiAccent, strokeWidth: 3 });
}

function intro(): string {
  let art = water('ia', 340, 200, 0.5, 41) + farRocks(340, 120, 42) + seabed(340, 200, 160, 43) + weeds([30, 300], 170, 44, 120);
  art += g({ transform: 'translate(250 160)' }, chest(1));
  art += g({ transform: 'translate(140 80) scale(1.3)' }, diverSide('Bingo', 0.6));
  art += bubble(100, 50, 8) + bubble(110, 30, 5) + bubble(96, 16, 4);
  return minigameIntro('i', art, 'Tauche durch die Höhlen nach oben zum Wrack! Pass auf die Felsen auf – jeder Stoß kostet Luft.', 'keys');
}

export default defineMovie({
  Headline: (m, w, h) => headline('Tauchgang', w, h),
  Intro: () => intro(),
  'Screen-*': (m, w, h) => screen(String(m.frame), w, h),
  'Screen-X': (m, w, h) => screen('X', w, h),
  // collision members: original 1-bit geometry, opaque = blocked
  'Collision-*': (m) => path(DIVE_MASKS[m.name].d, { fill: '#000' }),
  'Collision-X': (m) => path(DIVE_MASKS[m.name].d, { fill: '#000' }),
  'Plant-*': (m, w, h) => plant(m.frame!, w, h),
  Bubble: (m, w, h) => bubble(w / 2, h / 2, w / 2 - 2),
  'Coin-*': (m, w, h) => coin(m.regX, h / 2, Math.max(1, w / 2 - 1), h / 2 - 1),
  'Chest-*': (m, w, h) => g({ transform: `translate(${m.regX + 1} ${h - 2})` }, chest(((m.frame ?? 1) - 1) / 5)),
  'Barrel-*': (m, w, h) => {
    const a = (((m.frame ?? 1) - 1) % 10) * 36;
    const r = (a * Math.PI) / 180;
    const bw = Math.abs(44 * Math.cos(r)) + Math.abs(56 * Math.sin(r)), bh = Math.abs(44 * Math.sin(r)) + Math.abs(56 * Math.cos(r));
    const k = Math.min((w - 3) / bw, (h - 3) / bh);
    return g({ transform: `translate(${w / 2} ${h / 2}) scale(${k.toFixed(3)}) rotate(${a})` }, barrel());
  },
  '*': (m, w, h) => {
    const d = diverMember(m.name, m.regX, m.regY);
    if (d) return d;
    if (m.name === 'Sensor') return '<g/>';
    if (m.name === 'Air Drop') return airDrop(w, h);
    if (m.name === 'OI022') return itemArt('OI022', w, h);
    return null;
  },
});

void dk;
