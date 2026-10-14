// SP006 "Alfons’ Ecke" (cook's corner) – dirt road from the west (points 2–7) turning into cobbles at
// point 8, east to the edge and south (13, 14). Alfons' house (member Haus, drawn above the board,
// scene 218..653 × 0..240, roof 218..527 × 0..172) north of the road; entrance AS006-01 at point 1.
import { defineMovie } from '../lib/api';
import { boardDefs, boardPts, crate, guideMarks, pointFn } from '../lib/island1';
import { bush, flowers, road, treeTop, tufts } from '../lib/nature';
import { C, dk, g, line, lt, path, rect } from '../lib/svg';
import { headline } from '../lib/ui';

const PTS = boardPts('SP006');
const P = pointFn('SP006');

function background(w: number, h: number): string {
  let s = boardDefs(6) + rect(0, 0, w, h, { fill: 'url(#gr)' }) + tufts(0, 0, 800, 448, 70, 'sp6t');
  // yard in front of the house + path to the kitchen door (point 1)
  s += road([[380, 185], [P(1)[0], 200], P(1)], 40, 'url(#sand)', '#c9a24e66');
  s += road([[-30, P(2)[1]], P(7), [P(8)[0] - 20, P(8)[1]]], 54, 'url(#dirt)');
  s += road([P(8), [830, P(12)[1]]], 58, 'url(#cob)');
  s += road([P(8), P(14), [P(14)[0], 480]], 58, 'url(#cob)');
  s += crate(600, 160, 22, 10) + crate(622, 182, 18, -15);
  s += treeTop(690, 70, 85, 'sp6tr1') + treeTop(200, 390, 75, 'sp6tr2', { base: '#3f9a4a' });
  s += bush(560, 350, 24, 'sp6b1') + bush(40, 390, 24, 'sp6b2') + bush(770, 360, 26, 'sp6b3');
  s += flowers(60, 60, 5, 'sp6f1') + flowers(720, 410, 4, 'sp6f2') + flowers(140, 180, 4, 'sp6f3', '#e88fb4');
  return s + guideMarks(PTS);
}

/** Alfons' house from above: shingle roof, chimney, porch roof over the door at the bottom */
function house(w: number, h: number): string {
  const col = '#c9b49a', x = 0, y = 0, W = 309, H = 172;
  let s = path(`M${x + W} ${y + 10} l60 40 v${H - 10} h${-W + 30} l-40 -30 z`, { fill: '#000', opacity: 0.22 });
  s += rect(x + 2, y + 2, W - 4, H / 2, { fill: lt(col, 0.05), stroke: dk(col, 0.5), strokeWidth: 3.5 });
  s += rect(x + 2, y + H / 2, W - 4, H / 2 - 2, { fill: dk(col, 0.1), stroke: dk(col, 0.5), strokeWidth: 3.5 });
  for (let yy = y + 12; yy < H - 6; yy += 11) {
    s += line(x + 4, yy, W - 4, yy, { stroke: dk(col, 0.3), strokeWidth: 1.6, opacity: 0.7 });
    for (let xx = x + 8 + ((yy / 11) % 2) * 9; xx < W - 6; xx += 18) s += line(xx, yy, xx, yy + 11, { stroke: dk(col, 0.25), strokeWidth: 1, opacity: 0.6 });
  }
  s += line(x + 2, H / 2, W - 2, H / 2, { stroke: dk(col, 0.55), strokeWidth: 4.5 });
  // chimney with a wisp of steam (it's a cook's house)
  s += rect(60, 30, 22, 20, { fill: '#8a5a3a', stroke: '#4a2a10', strokeWidth: 2.5 }) + rect(64, 34, 14, 12, { fill: '#2a1a10' });
  s += path('M71 28 q-10 -10 0 -18 q10 -8 2 -16', { fill: 'none', stroke: C.white, strokeWidth: 5, strokeLinecap: 'round', opacity: 0.7 });
  // porch roof (grey, pyramidal) over the door
  const px = 155, py = 150, pw = 70, ph = 50;
  s += rect(px - pw / 2 + 10, py + 6, pw, ph, { fill: '#000', opacity: 0.22 });
  s += path(`M${px - pw / 2} ${py} h${pw} v${ph} h${-pw} z`, { fill: '#b9b4ae', stroke: '#5a5650', strokeWidth: 3 });
  s += path(`M${px - pw / 2} ${py} L${px} ${py + ph / 2} L${px + pw / 2} ${py} M${px - pw / 2} ${py + ph} L${px} ${py + ph / 2} L${px + pw / 2} ${py + ph}`, { fill: 'none', stroke: '#7a7670', strokeWidth: 2 });
  s += path(`M${px - pw / 2} ${py} L${px} ${py + ph / 2} L${px - pw / 2} ${py + ph} z`, { fill: '#d6d2cc', opacity: 0.8 });
  s += rect(px - 24, py + ph, 48, 8, { fill: '#c08a52', stroke: '#6b3e18', strokeWidth: 2 });
  return g({}, s) + `<!-- ${w}x${h} -->`;
}

export default defineMovie({
  Headline: (m, w, h) => headline('Alfons’ Ecke', w, h),
  'SP006-Board': (m, w, h) => background(w, h),
  Haus: (m, w, h) => house(w, h),
});
