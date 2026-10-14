// SP010 "Park" – dirt path from the north (x 700) bending west along y 175 and south at x 550; a cobble
// path joins from the west along y 250. Big trees, benches, bushes.
import { defineMovie } from '../lib/api';
import { bench, boardDefs, boardPts, guideMarks, pointFn } from '../lib/island1';
import { bush, flowers, road, treeTop, tufts } from '../lib/nature';
import { rect } from '../lib/svg';
import { headline } from '../lib/ui';

const PTS = boardPts('SP010');
const P = pointFn('SP010');

function background(w: number, h: number): string {
  let s = boardDefs(10) + rect(0, 0, w, h, { fill: 'url(#gr)' }) + tufts(0, 0, 800, 448, 80, 'sp10t');
  s += road([[170, P(6)[1]], [P(10)[0], P(10)[1]]], 52, 'url(#cob)');
  s += road([[P(1)[0], -30], P(5), P(3), P(12), [P(12)[0], 480]], 52, 'url(#dirt)');
  s += bench(610, 60, 90) + bench(225, 165, 80) + bench(470, 330, 0);
  s += treeTop(140, 95, 100, 'sp10tr1') + treeTop(215, 380, 80, 'sp10tr2', { base: '#7cc04a', light: '#b4e070' }) + treeTop(760, 390, 70, 'sp10tr3', { base: '#3f9a4a' });
  s += bush(400, 140, 22, 'sp10b1') + bush(60, 300, 26, 'sp10b2') + bush(640, 280, 24, 'sp10b3');
  s += flowers(380, 50, 5, 'sp10f1') + flowers(640, 430, 5, 'sp10f2') + flowers(780, 120, 4, 'sp10f3', '#e88fb4') + flowers(330, 350, 4, 'sp10f4');
  return s + guideMarks(PTS);
}

export default defineMovie({
  Headline: (m, w, h) => headline('Park', w, h),
  'SP010-Board': (m, w, h) => background(w, h),
});
