// SP008 "Am Marktplatz" – a big cobbled square: road from the north (x 325), the market row along y 250,
// branch south at x 400. Market stalls in the south-west, a café table, a hand cart, a big tree in the
// north-west, a shed in the north-east and the shop building (GS008-01 at point 10) in the east.
import { defineMovie } from '../lib/api';
import { boardDefs, boardPts, cart, crate, flatRoof, guideMarks, region, stall, tableTop } from '../lib/island1';
import { bush, flowers, roofTop, treeTop, tufts } from '../lib/nature';
import { rect } from '../lib/svg';
import { headline } from '../lib/ui';

const PTS = boardPts('SP008');

function background(w: number, h: number): string {
  let s = boardDefs(8) + rect(0, 0, w, h, { fill: 'url(#gr)' }) + tufts(0, 0, 800, 448, 50, 'sp8t');
  s += region([[10, 10], [290, -20], [360, -40], [420, 20], [600, 10], [780, 20], [800, 200], [790, 420], [600, 445], [460, 470], [340, 470], [300, 440], [60, 430], [5, 300], [-20, 180]], 'url(#cob)', '#00000033', 10);
  s += treeTop(100, 90, 95, 'sp8tr');
  s += stall(45, 305, 140, 60, '#e8483f') + stall(205, 305, 130, 60, '#2f6fd8');
  s += tableTop(480, 115, 20) + crate(400, 70, 20, 10) + crate(560, 60, 18, -20);
  s += cart(230, 175, -30);
  s += roofTop(615, 20, 150, 120, { col: '#d98a5a', chimney: [650, 40] });
  s += flatRoof(640, 290, 170, 130, -28);
  // awning in front of the shop door (towards point 10)
  s += rect(525, 245, 26, 60, { fill: '#ffd23f', stroke: '#8a6d00', strokeWidth: 2.5, rx: 2, transform: 'rotate(-28 538 275)' });
  s += bush(30, 420, 22, 'sp8b1') + bush(780, 430, 24, 'sp8b2');
  s += flowers(760, 170, 4, 'sp8f1') + flowers(290, 420, 4, 'sp8f2', '#e88fb4');
  return s + guideMarks(PTS);
}

export default defineMovie({
  Headline: (m, w, h) => headline('Am Marktplatz', w, h),
  'SP008-Board': (m, w, h) => background(w, h),
});
