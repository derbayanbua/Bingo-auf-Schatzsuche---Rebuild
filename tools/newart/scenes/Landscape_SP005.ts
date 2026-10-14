// SP005 "Am Leuchtturm" – sea in the west, a broad sand beach diagonally across, a meadow strip in the
// north-east (points 3, 4). The lighthouse (member Leuchtturm, drawn above the board, top at scene
// ≈ 547,11) stands on a round stone base north of point 1 (entrance AS005-02).
import { defineMovie } from '../lib/api';
import { boardDefs, boardPts, grassArea, guideMarks, pebbles, pointFn, sandArea, waterArea } from '../lib/island1';
import { flowers, rockTop, tufts } from '../lib/nature';
import { C, circle, dk, g, line, lt, path, poly, r2, rect } from '../lib/svg';
import { headline } from '../lib/ui';

const PTS = boardPts('SP005');
const P = pointFn('SP005');

function background(w: number, h: number): string {
  let s = boardDefs(5) + rect(0, 0, w, h, { fill: 'url(#sand)' });
  s += grassArea([[630, -40], [860, -40], [860, 250], [760, 225], [650, 190], [660, 80]]);
  s += tufts(680, 0, 120, 200, 18, 'sp5t');
  s += waterArea([[-40, -40], [370, -40], [400, 80], [430, 200], [500, 320], [560, 400], [600, 480], [-40, 480]], 'sp5w');
  // lighthouse base: stone ring with path to point 1
  const [bx, by] = [547, 11];
  s += circle(bx + 10, by + 8, 84, { fill: '#000', opacity: 0.15 }) + circle(bx, by, 84, { fill: C.stone, stroke: C.stoneDark, strokeWidth: 4 });
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    s += line(bx + Math.cos(a) * 62, by + Math.sin(a) * 62, bx + Math.cos(a) * 84, by + Math.sin(a) * 84, { stroke: C.stoneDark, strokeWidth: 2 });
  }
  s += circle(bx, by, 62, { fill: lt(C.stone, 0.15), stroke: C.stoneDark, strokeWidth: 2 });
  s += rect(P(1)[0] - 18, by + 60, 36, P(1)[1] - by - 70, { rx: 6, fill: C.stoneLight, stroke: C.stoneDark, strokeWidth: 2 });
  s += rockTop(420, 130, 30, 22, 'sp5r1') + rockTop(470, 300, 22, 18, 'sp5r2') + pebbles(560, 180, 200, 250, 14, 'sp5p');
  s += flowers(760, 30, 4, 'sp5f1') + flowers(770, 140, 4, 'sp5f2', '#e88fb4');
  return s + guideMarks(PTS);
}

/** lighthouse top view: octagonal red lantern roof on the white tower, long shadow to the lower right */
function lighthouse(w: number, h: number): string {
  const cx = 62, cy = 56;
  const oct = (r: number, dx = 0, dy = 0): [number, number][] => Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    return [cx + dx + Math.cos(a) * r, cy + dy + Math.sin(a) * r];
  });
  // shadow: tower body thrown far to the lower right
  const sh = path(`M${cx - 40} ${cy + 20} L${cx + 120} ${cy + 110} Q${cx + 160} ${cy + 130} ${cx + 175} ${cy + 95} L${cx + 40} ${cy - 30} Z`, { fill: '#000', opacity: 0.22 });
  let s = sh;
  s += circle(cx, cy, 58, { fill: C.white, stroke: '#8a93a6', strokeWidth: 4 });
  s += poly(oct(52), { fill: '#3a3a4a', stroke: '#1a1a24', strokeWidth: 3 }); // gallery railing ring
  s += poly(oct(44), { fill: '#e8483f', stroke: C.redDark, strokeWidth: 3.5, strokeLinejoin: 'round' });
  for (const [x, y] of oct(44)) s += line(cx, cy, x, y, { stroke: dk('#e8483f', 0.3), strokeWidth: 2 });
  s += path(`M${cx - 30} ${cy - 18} L${cx - 6} ${cy - 4}`, { stroke: lt('#e8483f', 0.5), strokeWidth: 4, strokeLinecap: 'round', opacity: 0.8 });
  s += circle(cx, cy, 7, { fill: C.gold, stroke: C.goldDark, strokeWidth: 2 });
  return g({}, s, `<!-- ${r2(w)}x${r2(h)} -->`);
}

export default defineMovie({
  Headline: (m, w, h) => headline('Am Leuchtturm', w, h),
  'SP005-Board': (m, w, h) => background(w, h),
  Leuchtturm: (m, w, h) => lighthouse(w, h),
});
