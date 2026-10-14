// SP004 "Die Hafenkneipe" – harbour: sea in the west, a sand shore running diagonally to the south-east,
// meadow in the north-east (points 1, 3, 6). The pub stands on piles at the shore (entrance at point 2),
// a jetty leads into the water; the rowing boat (Boot-1..10, drawn above the board) bobs beside it.
import { defineMovie } from '../lib/api';
import { boardDefs, boardPts, crate, dock, grassArea, guideMarks, waterArea } from '../lib/island1';
import { bush, flowers, tufts } from '../lib/nature';
import { C, dk, g, line, lt, path, r2, rect } from '../lib/svg';
import { headline } from '../lib/ui';

const PTS = boardPts('SP004');

/** pub building seen from above: two weathered plank roofs at an angle, a terrace towards the jetty */
function pub(): string {
  const roof = (x: number, y: number, w: number, h: number, col: string) => {
    let s = rect(x + 22, y + 16, w, h, { fill: '#000', opacity: 0.22, rx: 3 });
    s += rect(x, y, w, h / 2, { fill: lt(col, 0.06), stroke: dk(col, 0.5), strokeWidth: 3 }) + rect(x, y + h / 2, w, h / 2, { fill: dk(col, 0.12), stroke: dk(col, 0.5), strokeWidth: 3 });
    for (let xx = x + 12; xx < x + w - 4; xx += 13) s += line(xx, y + 3, xx, y + h - 3, { stroke: dk(col, 0.35), strokeWidth: 1.6, opacity: 0.7 });
    return s + line(x, y + h / 2, x + w, y + h / 2, { stroke: dk(col, 0.55), strokeWidth: 4 });
  };
  const terrace = rect(-40, 40, 120, 80, { fill: '#c08a52', stroke: '#6b3e18', strokeWidth: 3 }) +
    Array.from({ length: 9 }, (_, i) => line(-40 + 12 * (i + 1), 42, -40 + 12 * (i + 1), 118, { stroke: '#7a4a20', strokeWidth: 1.6 })).join('');
  return g({ transform: 'translate(380 70) rotate(-28)' },
    terrace,
    roof(-10, -70, 170, 120, '#8a7a68'),
    roof(70, -10, 100, 90, '#9a8670'),
    rect(36, -46, 16, 14, { fill: '#6a5a4a', stroke: '#2a2018', strokeWidth: 2 }),
    path('M150 30 l20 4 l-4 16 z', { fill: C.red, stroke: C.redDark, strokeWidth: 2 }));
}

function background(w: number, h: number): string {
  let s = boardDefs(4) + rect(0, 0, w, h, { fill: 'url(#sand)' });
  s += grassArea([[340, -40], [860, -40], [860, 300], [760, 215], [670, 135], [600, 130], [580, 70], [500, 40], [430, 10]]);
  s += waterArea([[-40, -40], [225, -40], [215, 90], [300, 230], [410, 370], [510, 480], [-40, 480]], 'sp4w');
  s += dock(330, 190, 110, 410, 66);
  s += pub();
  s += crate(176, 330, 20, 40) + crate(150, 360, 18, 10);
  // mooring post + rope for the boat
  s += rect(280, 250, 10, 10, { rx: 3, fill: '#6b3e18', stroke: '#2a1808', strokeWidth: 2 }) + path(`M285 255 q10 6 8 ${r2(20)}`, { fill: 'none', stroke: '#e8d8a0', strokeWidth: 2 });
  s += bush(760, 60, 26, 'sp4b1') + flowers(700, 30, 5, 'sp4f1') + flowers(760, 150, 4, 'sp4f2', '#e88fb4');
  s += tufts(560, 0, 240, 200, 25, 'sp4t');
  return s + guideMarks(PTS);
}

/** rowing boat from above, bow up; gently rocking with the frame (1..10) */
function boat(m: { frame: number | null }, w: number, h: number): string {
  const t = ((m.frame ?? 1) - 1) / 10;
  const rot = 4 * Math.sin(t * Math.PI * 2), dy = 2 * Math.sin(t * Math.PI * 2 + 1);
  const cx = w / 2, cy = h / 2;
  const hull = `M${cx} 8 C${cx + 30} 24 ${cx + 38} 70 ${cx + 34} 118 Q${cx + 30} 138 ${cx} 138 Q${cx - 30} 138 ${cx - 34} 118 C${cx - 38} 70 ${cx - 30} 24 ${cx} 8 Z`;
  const oar = (side: number) => g({ transform: `rotate(${r2(side * (6 + 4 * Math.sin(t * Math.PI * 2)))} ${cx} 70)` },
    line(cx + side * 6, 40, cx + side * 14, 120, { stroke: '#7a4a20', strokeWidth: 6, strokeLinecap: 'round' }),
    line(cx + side * 6, 40, cx + side * 14, 120, { stroke: '#e0c48a', strokeWidth: 3.5, strokeLinecap: 'round' }),
    path(`M${cx + side * 12} 104 q${side * 8} 8 ${side * 4} 24 q${-side * 8} 2 ${-side * 10} -6 z`, { fill: '#e0c48a', stroke: '#7a4a20', strokeWidth: 2 }));
  return g({ transform: `translate(0 ${r2(dy)}) rotate(${r2(rot)} ${cx} ${cy})` },
    path(hull, { fill: '#000', opacity: 0.22, transform: 'translate(7 6)' }),
    path(hull, { fill: '#5a6ad8', stroke: '#2a2a80', strokeWidth: 4, strokeLinejoin: 'round' }),
    path(`M${cx} 18 C${cx + 22} 32 ${cx + 28} 72 ${cx + 25} 114 Q${cx + 22} 128 ${cx} 128 Q${cx - 22} 128 ${cx - 25} 114 C${cx - 28} 72 ${cx - 22} 32 ${cx} 18 Z`, { fill: '#c9a46e', stroke: '#7a5a30', strokeWidth: 2 }),
    rect(cx - 27, 52, 54, 11, { fill: '#e0c48a', stroke: '#7a5a30', strokeWidth: 2 }),
    rect(cx - 29, 92, 58, 11, { fill: '#e0c48a', stroke: '#7a5a30', strokeWidth: 2 }),
    oar(-1), oar(1),
    path(`M${cx} 4 a4 4 0 1 1 0.1 0`, { fill: 'none', stroke: '#2a2a2a', strokeWidth: 2 }));
}

export default defineMovie({
  Headline: (m, w, h) => headline('Die Hafenkneipe', w, h),
  'SP004-Board': (m, w, h) => background(w, h),
  'Boot-*': (m, w, h) => boat(m, w, h),
});
