// SP002 "Puckis Haus" – cobble road from the north (x 475) with a branch east (y 100) and a bend to the
// south-west (points 9–12); Pucki's house (top view) on the left, garden fences, sunflowers.
import { defineMovie } from '../lib/api';
import { boardDefs, boardPts, guideMarks, pointFn, sunflower } from '../lib/island1';
import { bush, fence, flowers, road, roofTop, tufts } from '../lib/nature';
import { rect } from '../lib/svg';
import { headline } from '../lib/ui';

const PTS = boardPts('SP002');
const P = pointFn('SP002');

function background(w: number, h: number): string {
  let s = boardDefs(2) + rect(0, 0, w, h, { fill: 'url(#gr)' }) + tufts(0, 0, 800, 448, 70, 'sp2t');
  // garden in front of the house, slab path to the road
  s += rect(60, 70, 250, 300, { rx: 18, fill: '#7ccc6a', opacity: 0.55 });
  s += road([[300, 160], [440, 160]], 34, '#b59a8a', '#00000030');
  for (let x = 312; x < 440; x += 22) s += rect(x, 146, 18, 28, { rx: 3, fill: '#c9b0a0', stroke: '#8a6a5a', strokeWidth: 1.5 });
  // roads
  s += road([[P(1)[0], -30],P(2), P(8), P(11), P(9), [P(12)[0], 480]], 60, 'url(#cob)');
  s += road([P(2), [830, P(6)[1]]], 56, 'url(#cob)');
  // fences: east field along the branch, west garden border
  s += fence(530, 158, 800, 158, '#e8e0d0') + fence(250, 260, 250, 448, '#e8e0d0') + fence(60, 260, 250, 260, '#e8e0d0');
  // house (door faces the slab path)
  s += roofTop(85, 80, 190, 150, { chimney: [130, 96] });
  s += rect(275, 146, 12, 30, { rx: 3, fill: '#7a3f18', stroke: '#4a2a10', strokeWidth: 2 });
  // plants
  s += sunflower(320, 80) + sunflower(345, 92, 10) + sunflower(330, 112, 8);
  s += bush(390, 230, 24, 'sp2b1') + bush(700, 330, 30, 'sp2b2') + bush(610, 420, 22, 'sp2b3', '#3f9a4a');
  s += flowers(100, 285, 5, 'sp2f1') + flowers(200, 400, 4, 'sp2f2') + flowers(650, 230, 5, 'sp2f3') + flowers(760, 420, 4, 'sp2f4', '#e88fb4');
  return s + guideMarks(PTS);
}

export default defineMovie({
  Headline: (m, w, h) => headline('Puckis Haus', w, h),
  'SP002-Board': (m, w, h) => background(w, h),
});
