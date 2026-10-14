// SP014 "Immer am Sand lang" – a cobble road from the west (y 100) bending south-east down to point 15,
// the sand strip of the beach along the east edge (points 1, 10, 16, 18), meadow with a dark tree.
import { defineMovie } from '../lib/api';
import { boardDefs, boardPts, grassArea, guideMarks, pointFn, region } from '../lib/island1';
import { fern, flowers, road, treeTop, tufts } from '../lib/nature';
import { rect } from '../lib/svg';
import { headline } from '../lib/ui';

const PTS = boardPts('SP014');
const P = pointFn('SP014');

function background(w: number, h: number): string {
  let s = boardDefs(14) + rect(0, 0, w, h, { fill: 'url(#gr)' }) + tufts(0, 0, 650, 448, 60, 'sp14t');
  s += region([[860, -40], [660, -40], [665, 60], [650, 140], [660, 300], [660, 360], [665, 480], [860, 480]], 'url(#sand)', '#c9a24e66', 10);
  // meadow tongues reaching into the sand at points 13 and 17
  s += grassArea([[640, 140], [735, 150], [740, 200], [680, 210], [640, 200]]);
  s += grassArea([[640, 365], [665, 370], [660, 430], [630, 440]]);
  s += road([[-30, P(2)[1]], P(9), P(11), P(12), P(14), P(15)], 58, 'url(#cob)');
  s += treeTop(140, 320, 110, 'sp14tr', { base: '#2f7a3a', light: '#5fb85a', dark: '#1d4f26' });
  s += fern(110, 20, 26, 'sp14fe1') + fern(500, 230, 26, 'sp14fe2') + fern(470, 400, 28, 'sp14fe3');
  s += flowers(70, 175, 5, 'sp14f1') + flowers(390, 300, 5, 'sp14f2');
  return s + guideMarks(PTS);
}

export default defineMovie({
  Headline: (m, w, h) => headline('Immer am Sand lang', w, h),
  'SP014-Board': (m, w, h) => background(w, h),
});
