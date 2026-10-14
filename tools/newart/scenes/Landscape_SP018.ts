// SP018 "Auf dem Strandweg" – meadow path (points 1–8) east of the beach; sand and the sea in the
// south-west corner with a boulder and ferns, a big tree in the north-east.
import { defineMovie } from '../lib/api';
import { boardDefs, boardPts, guideMarks, pebbles, region, waterArea } from '../lib/island1';
import { fern, flowers, rockTop, treeTop, tufts } from '../lib/nature';
import { rect } from '../lib/svg';
import { headline } from '../lib/ui';

const PTS = boardPts('SP018');

function background(w: number, h: number): string {
  let s = boardDefs(18) + rect(0, 0, w, h, { fill: 'url(#gr)' }) + tufts(300, 0, 500, 448, 60, 'sp18t');
  s += region([[-40, -40], [220, -40], [260, 80], [300, 200], [310, 300], [340, 480], [-40, 480]], 'url(#sand)', '#c9a24e66', 10);
  s += waterArea([[-40, -40], [40, -40], [80, 100], [110, 250], [140, 360], [170, 480], [-40, 480]], 'sp18w');
  s += rockTop(60, 400, 50, 40, 'sp18r') + fern(110, 430, 30, 'sp18fe1') + fern(25, 440, 24, 'sp18fe2');
  s += pebbles(120, 20, 120, 300, 10, 'sp18p');
  s += treeTop(705, 90, 95, 'sp18tr', { base: '#5aae46' });
  s += flowers(470, 60, 5, 'sp18f1') + flowers(700, 360, 5, 'sp18f2') + flowers(400, 380, 4, 'sp18f3', '#e88fb4');
  return s + guideMarks(PTS);
}

export default defineMovie({
  Headline: (m, w, h) => headline('Auf dem Strandweg', w, h),
  'SP018-Board': (m, w, h) => background(w, h),
});
