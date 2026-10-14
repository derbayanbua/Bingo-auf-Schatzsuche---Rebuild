// SP015 "Im Sandkasten" – meadow in the west with a huge round shrub, a wide sand bay in the east
// (points 1–4) with a little sandcastle and spade.
import { defineMovie } from '../lib/api';
import { boardDefs, boardPts, guideMarks, region } from '../lib/island1';
import { flowers, tufts } from '../lib/nature';
import { C, blob, circle, dk, line, lt, path, rect, rng } from '../lib/svg';
import { headline } from '../lib/ui';

const PTS = boardPts('SP015');

/** big round shrub with radiating leaves */
function shrub(cx: number, cy: number, r: number): string {
  const R = rng('sp15s');
  let s = path(blob(cx + 40, cy + 34, r * 1.05, r, 'sp15sh', 0.12, 12), { fill: '#000', opacity: 0.22 });
  s += circle(cx, cy, r, { fill: '#2f8f3a', stroke: '#1d5a24', strokeWidth: 3 });
  for (let i = 0; i < 70; i++) {
    const a = R() * Math.PI * 2, d0 = R() * r * 0.3, d1 = r * (0.7 + R() * 0.28);
    s += line(cx + Math.cos(a) * d0, cy + Math.sin(a) * d0, cx + Math.cos(a) * d1, cy + Math.sin(a) * d1, { stroke: R() > 0.4 ? '#4fc04a' : lt('#4fc04a', 0.3), strokeWidth: 3, strokeLinecap: 'round' });
  }
  return s + circle(cx, cy, r * 0.12, { fill: dk('#2f8f3a', 0.3) });
}

function background(w: number, h: number): string {
  let s = boardDefs(15) + rect(0, 0, w, h, { fill: 'url(#gr)' }) + tufts(0, 0, 450, 448, 60, 'sp15t');
  s += region([[860, -40], [520, -40], [420, 60], [470, 140], [360, 230], [400, 320], [560, 380], [580, 480], [860, 480]], 'url(#sand)', '#c9a24e66', 10);
  s += shrub(170, 130, 95);
  // sandcastle + spade
  s += path(blob(560, 200, 30, 24, 'sp15c', 0.12), { fill: C.sandDark, stroke: dk(C.sandDark, 0.35), strokeWidth: 2.5 });
  for (const [x, y] of [[548, 190], [572, 192], [560, 210]] as const) s += rect(x - 7, y - 7, 14, 14, { fill: lt(C.sandDark, 0.25), stroke: dk(C.sandDark, 0.35), strokeWidth: 2, rx: 2 });
  s += line(600, 230, 630, 250, { stroke: '#e8483f', strokeWidth: 4, strokeLinecap: 'round' }) + path('M626 244 l14 4 l-4 14 l-14 -4 z', { fill: '#e8483f', stroke: C.redDark, strokeWidth: 2 });
  s += flowers(440, 30, 5, 'sp15f1') + flowers(60, 380, 5, 'sp15f2') + flowers(300, 300, 4, 'sp15f3', '#e88fb4');
  return s + guideMarks(PTS);
}

export default defineMovie({
  Headline: (m, w, h) => headline('Im Sandkasten', w, h),
  'SP015-Board': (m, w, h) => background(w, h),
});
