// SP012 "Südliche Küste" (east) – open beach, the sea along the south and east; a cluster of boulders with
// a fern at the water's edge east of AS012-01 (point 10).
import { defineMovie } from '../lib/api';
import { boardDefs, boardPts, guideMarks, pebbles, waterArea } from '../lib/island1';
import { fern, rockTop } from '../lib/nature';
import { rect } from '../lib/svg';
import { headline } from '../lib/ui';

const PTS = boardPts('SP012');

function background(w: number, h: number): string {
  let s = boardDefs(12) + rect(0, 0, w, h, { fill: 'url(#sand)' });
  s += waterArea([[-40, 270], [150, 255], [330, 250], [480, 270], [600, 330], [700, 300], [770, 200], [790, 60], [800, -40], [860, -40], [860, 480], [-40, 480]], 'sp12w');
  s += rockTop(640, 210, 62, 52, 'sp12r1') + rockTop(570, 255, 46, 40, 'sp12r2') + rockTop(560, 175, 32, 28, 'sp12r3');
  s += fern(540, 220, 32, 'sp12fe');
  s += pebbles(100, 200, 300, 40, 10, 'sp12p') + pebbles(620, 60, 120, 60, 6, 'sp12p2');
  return s + guideMarks(PTS);
}

export default defineMovie({
  Headline: (m, w, h) => headline('Südliche Küste', w, h),
  'SP012-Board': (m, w, h) => background(w, h),
});
