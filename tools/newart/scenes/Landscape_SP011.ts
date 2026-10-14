// SP011 "Südliche Küste" – beach: meadow in the north, a dirt track from the north (x 550) onto the sand,
// the sea along the south. Parasol, towel and ball in the west next to AS011-01 (point 10).
import { defineMovie } from '../lib/api';
import { ball, boardDefs, boardPts, guideMarks, parasol, pointFn, region, towel, waterArea } from '../lib/island1';
import { flowers, road, tufts } from '../lib/nature';
import { rect } from '../lib/svg';
import { headline } from '../lib/ui';

const PTS = boardPts('SP011');
const P = pointFn('SP011');

function background(w: number, h: number): string {
  let s = boardDefs(11) + rect(0, 0, w, h, { fill: 'url(#sand)' });
  s += region([[-40, -40], [860, -40], [860, 40], [700, 70], [600, 110], [520, 120], [420, 95], [300, 70], [150, 55], [-40, 60]], 'url(#gr)', '#3f8f4555', 8);
  s += tufts(0, 0, 800, 60, 25, 'sp11t');
  s += road([[P(1)[0], -30], P(2), [P(6)[0], P(6)[1] + 10]], 46, 'url(#dirt)');
  // points 6 is a little grass island on the beach
  s += region([[515, 150], [585, 145], [600, 190], [560, 210], [510, 195]], 'url(#gr)', '#3f8f4555', 6);
  s += waterArea([[-40, 360], [120, 345], [300, 320], [480, 290], [650, 260], [860, 250], [860, 480], [-40, 480]], 'sp11w');
  s += parasol(65, 150, 62) + towel(205, 150, 40, 70, -25, '#e8483f') + ball(108, 240, 9);
  s += flowers(70, 25, 4, 'sp11f1') + flowers(300, 35, 5, 'sp11f2');
  return s + guideMarks(PTS);
}

export default defineMovie({
  Headline: (m, w, h) => headline('Südliche Küste', w, h),
  'SP011-Board': (m, w, h) => background(w, h),
});
