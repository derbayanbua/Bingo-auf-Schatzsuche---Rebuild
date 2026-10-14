// SP013 "Unter Bäumen" – meadow with big shady trees in the west, the sand path (points 1–7) in the east.
import { defineMovie } from '../lib/api';
import { bench, boardDefs, boardPts, guideMarks, region } from '../lib/island1';
import { bush, fern, flowers, treeTop, tufts } from '../lib/nature';
import { rect } from '../lib/svg';
import { headline } from '../lib/ui';

const PTS = boardPts('SP013');

function background(w: number, h: number): string {
  let s = boardDefs(13) + rect(0, 0, w, h, { fill: 'url(#gr)' }) + tufts(0, 0, 450, 448, 50, 'sp13t');
  s += region([[860, -40], [470, -40], [440, 60], [420, 160], [470, 250], [430, 340], [410, 480], [860, 480]], 'url(#sand)', '#c9a24e66', 10);
  s += treeTop(250, 120, 110, 'sp13tr1', { base: '#5aae46' }) + treeTop(110, 320, 105, 'sp13tr2', { base: '#2f7a3a', light: '#5fb85a', dark: '#1d4f26' });
  s += bench(345, 280, 75);
  s += bush(60, 70, 24, 'sp13b1') + fern(300, 300, 26, 'sp13fe');
  s += flowers(40, 160, 5, 'sp13f1') + flowers(330, 420, 4, 'sp13f2');
  return s + guideMarks(PTS);
}

export default defineMovie({
  Headline: (m, w, h) => headline('Unter Bäumen', w, h),
  'SP013-Board': (m, w, h) => background(w, h),
});
