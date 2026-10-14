// SP019 "Zick-Zack" – a meadow square (points 1–6) with boulders and a bench, the blossom tree (member
// Baum, above the board, crown ≈ scene 167,156) over it; sand in the south-west (AS019-01 at point 7,
// 15, 16), a dirt road from the east (y 250) turning south at x 400.
import { defineMovie } from '../lib/api';
import { bench, blossoms, boardDefs, boardPts, guideMarks, pointFn, region } from '../lib/island1';
import { bush, flowers, road, rockTop, treeTop, tufts } from '../lib/nature';
import { rect } from '../lib/svg';
import { headline } from '../lib/ui';

const PTS = boardPts('SP019');
const P = pointFn('SP019');

function background(w: number, h: number): string {
  let s = boardDefs(19) + rect(0, 0, w, h, { fill: 'url(#gr)' }) + tufts(0, 0, 800, 448, 70, 'sp19t');
  s += region([[-40, 300], [120, 290], [220, 230], [290, 240], [270, 300], [220, 380], [240, 480], [-40, 480]], 'url(#sand)', '#c9a24e66', 10);
  s += road([[830, P(14)[1]], P(9), P(18), [P(18)[0], 480]], 56, 'url(#dirt)');
  s += rockTop(170, 160, 34, 26, 'sp19r1') + rockTop(190, 385, 30, 26, 'sp19r2');
  s += bench(170, 215, 90);
  s += treeTop(560, 40, 110, 'sp19tr', { base: '#7cc04a', light: '#b4e070' });
  s += bush(700, 400, 26, 'sp19b1');
  s += flowers(520, 320, 5, 'sp19f1') + flowers(680, 380, 4, 'sp19f2') + flowers(150, 370, 3, 'sp19f3');
  return s + guideMarks(PTS);
}

/** blossom tree crown (red/pink), top-left of the member, shadow to the lower right */
function tree(): string {
  return treeTop(75, 80, 68, 'sp19baum', { base: '#d8434a', light: '#ff8a8a', dark: '#8a1f2a' }) + blossoms(75, 80, 62, 26, 'sp19bl', '#ffd0dc');
}

export default defineMovie({
  Headline: (m, w, h) => headline('Zick-Zack', w, h),
  'SP019-Board': (m, w, h) => background(w, h),
  Baum: () => tree(),
});
