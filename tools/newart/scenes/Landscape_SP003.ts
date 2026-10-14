// SP003 "Käpt’n Relings Haus" – cobble road from the north (x 325) down to point 7, a sand track from the
// west (points 3–6) that opens into a wide sand area in the south-west; Reling's red-roofed house east
// of the road with a tree, a bench and a crate.
import { defineMovie } from '../lib/api';
import { bench, boardDefs, boardPts, crate, guideMarks, pointFn, sandArea } from '../lib/island1';
import { bush, flowers, road, roofTop, treeTop, tufts } from '../lib/nature';
import { rect } from '../lib/svg';
import { headline } from '../lib/ui';

const PTS = boardPts('SP003');
const P = pointFn('SP003');

function background(w: number, h: number): string {
  let s = boardDefs(3) + rect(0, 0, w, h, { fill: 'url(#gr)' }) + tufts(0, 0, 800, 448, 70, 'sp3t');
  // sand: track from the west, widening to the south-west corner and running out to the south
  s += sandArea([[-40, 140], [150, 145], [300, 150], [340, 205], [300, 250], [430, 300], [520, 390], [560, 480], [-40, 480]]);
  s += road([[P(1)[0], -30], P(2), P(7)], 60, 'url(#cob)');
  // house + tree + bench
  s += roofTop(410, 30, 170, 150, { col: '#d9553a', chimney: [450, 50] });
  s += rect(398, 95, 12, 30, { rx: 3, fill: '#7a3f18', stroke: '#4a2a10', strokeWidth: 2 });
  s += crate(372, 150, 22, 15) + bench(470, 245, 0);
  s += treeTop(540, 220, 70, 'sp3tr', { base: '#4fa64a' });
  s += bush(720, 110, 28, 'sp3b1') + bush(700, 400, 24, 'sp3b2', '#3f9a4a');
  s += flowers(70, 60, 5, 'sp3f1') + flowers(270, 300, 4, 'sp3f2') + flowers(660, 260, 5, 'sp3f3') + flowers(470, 20, 4, 'sp3f4', '#e88fb4');
  return s + guideMarks(PTS);
}

export default defineMovie({
  Headline: (m, w, h) => headline('Käpt’n Relings Haus', w, h),
  'SP003-Board': (m, w, h) => background(w, h),
});
