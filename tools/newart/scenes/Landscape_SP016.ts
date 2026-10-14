// SP016 "Angeln erlaubt!" – sand in the west (points 1–3, fishing game GS016-01 at point 3), the sea in
// the east with a small jetty, a bait bucket and an overhanging tree in the north.
import { defineMovie } from '../lib/api';
import { boardDefs, boardPts, dock, guideMarks, pebbles, waterArea } from '../lib/island1';
import { treeTop } from '../lib/nature';
import { C, circle, ellipse, line, rect } from '../lib/svg';
import { headline } from '../lib/ui';

const PTS = boardPts('SP016');

function background(w: number, h: number): string {
  let s = boardDefs(16) + rect(0, 0, w, h, { fill: 'url(#sand)' });
  s += waterArea([[330, -40], [860, -40], [860, 480], [330, 480], [310, 380], [300, 260], [320, 160], [300, 60]], 'sp16w');
  s += dock(300, 70, 440, 175, 54);
  // bait bucket + rod
  s += circle(300, 195, 18, { fill: '#000', opacity: 0.2 }) + circle(292, 188, 16, { fill: '#8a93a6', stroke: '#3a4050', strokeWidth: 2.5 }) + circle(292, 188, 11, { fill: '#5a6a80' });
  s += line(250, 220, 330, 245, { stroke: '#6b3410', strokeWidth: 3.5, strokeLinecap: 'round' }) + ellipse(262, 224, 5, 4, { fill: C.red, stroke: C.redDark, strokeWidth: 1.5 });
  s += treeTop(210, 40, 105, 'sp16tr', { base: '#5aae46' });
  s += pebbles(40, 330, 220, 100, 9, 'sp16p');
  return s + guideMarks(PTS);
}

export default defineMovie({
  Headline: (m, w, h) => headline('Angeln erlaubt!', w, h),
  'SP016-Board': (m, w, h) => background(w, h),
});
