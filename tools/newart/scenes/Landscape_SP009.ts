// SP009 "An der alten Villa" – the old villa (top view) in a hedged garden, its door at point 1
// (AS009-01); a cobbled forecourt and a path running south (points 2, 3); pavilion in the garden.
import { defineMovie } from '../lib/api';
import { bench, boardDefs, boardPts, gazeboTop, guideMarks, hedge, pointFn, sunflower } from '../lib/island1';
import { bush, fence, flowers, road, roofTop, tufts } from '../lib/nature';
import { rect } from '../lib/svg';
import { headline } from '../lib/ui';

const PTS = boardPts('SP009');
const P = pointFn('SP009');

function background(w: number, h: number): string {
  let s = boardDefs(9) + rect(0, 0, w, h, { fill: 'url(#gr)' }) + tufts(0, 0, 800, 448, 70, 'sp9t');
  // garden: hedge beds left and right of the villa, wrought fence around
  s += rect(80, 20, 420, 200, { rx: 10, fill: '#7ccc6a', opacity: 0.5 });
  s += hedge(95, 32, 110, 140, 'sp9h1') + hedge(445, 32, 50, 170, 'sp9h2');
  s += fence(80, 20, 500, 20, '#4a4a55') + fence(80, 20, 80, 230, '#4a4a55') + fence(500, 20, 500, 230, '#4a4a55');
  // forecourt + path south
  s += road([[130, 228], [520, 228]], 52, 'url(#cob)');
  s += road([P(1), P(3), [P(3)[0], 480]], 56, 'url(#cob)');
  // villa (door + steps at the bottom centre, above point 1)
  s += roofTop(225, 25, 200, 165, { col: '#b0603a', chimney: [380, 45] });
  s += rect(250, 60, 14, 12, { fill: '#e8e0d0', stroke: '#6a5a4a', strokeWidth: 2 });
  s += rect(300, 190, 50, 14, { rx: 2, fill: '#c9c0b0', stroke: '#8a8070', strokeWidth: 2 }) + rect(306, 182, 38, 10, { fill: '#7a3f18', stroke: '#4a2a10', strokeWidth: 2 });
  s += gazeboTop(170, 205, 46);
  s += bench(230, 330, 90);
  s += sunflower(680, 230) + sunflower(705, 250, 10) + sunflower(650, 262, 9);
  s += bush(620, 80, 28, 'sp9b1') + bush(760, 380, 30, 'sp9b2', '#3f9a4a') + bush(80, 380, 26, 'sp9b3');
  s += flowers(560, 380, 5, 'sp9f1') + flowers(720, 60, 4, 'sp9f2', '#e88fb4');
  return s + guideMarks(PTS);
}

export default defineMovie({
  Headline: (m, w, h) => headline('An der alten Villa', w, h),
  'SP009-Board': (m, w, h) => background(w, h),
});
