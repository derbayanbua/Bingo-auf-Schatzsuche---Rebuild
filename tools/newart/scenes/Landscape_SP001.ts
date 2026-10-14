// SP001 "Inselzentrum" – reference board (top-down). Point coordinates come from src/data/boards.json
// (stage coords; the board bitmap starts at stage y 45 → scene y = y - 45). Ground types of the points:
// 1 stone (cobble road), 2 sand, 3 dirt, 4 grass. Above the board the runtime draws Baum01 (Shared_Graphic-2,
// crown around 508,215 scene), the Schranke at point 11 and the flying stork (Storch/Shadow below).
import { defineMovie } from '../lib/api';
import { fence, fern, flowers, roofTop, rockTop, road, tufts, bush } from '../lib/nature';
import { C, defs, dk, ellipse, g, path, r2, rect } from '../lib/svg';
import { cobblePattern, dirtPattern, grassPattern, sandPattern } from '../lib/textures';
import { headline } from '../lib/ui';
import boards from '../../../src/data/boards.json';

type Pt = { n: number; x: number; y: number; g: number };
const PTS = ((boards as unknown as { boards: Record<string, Pt[]> }).boards.SP001).map((p) => ({ ...p, y: p.y - 45 }));
const P = (n: number): [number, number] => {
  const p = PTS.find((q) => q.n === n)!;
  return [p.x, p.y];
};

function background(w: number, h: number): string {
  let s = defs(grassPattern('gr', { base: '#6cc060', seed: 4 }), cobblePattern('cob', { seed: 8 }), dirtPattern('dirt', 3), sandPattern('sand', 5));
  s += rect(0, 0, w, h, { fill: 'url(#gr)' });
  s += tufts(0, 0, 800, 448, 80, 'sp1t');
  // house garden (left), fence + flowers
  s += rect(120, 150, 250, 270, { rx: 18, fill: '#7ccc6a', opacity: 0.6 });
  s += fence(120, 150, 120, 420) + fence(120, 420, 300, 420) + fence(370, 150, 370, 330);
  s += flowers(100, 240, 5, 'sp1a') + flowers(60, 300, 5, 'sp1b') + flowers(470, 275, 5, 'sp1c') + flowers(90, 420, 4, 'sp1d', '#e88fb4');
  // roads: cobble main road (y 100) + north branch, grass path to the house, dirt → sand path south-east
  const [, ry] = P(2);
  s += road([[-20, ry], [820, ry]], 60, 'url(#cob)');
  s += road([[P(1)[0], -20], [P(7)[0], ry]], 56, 'url(#cob)');
  s += road([[P(5)[0], ry + 20], P(13)], 30, '#9fd27c', '#00000022');
  s += road([P(10), P(14), P(15)], 50, 'url(#dirt)');
  s += road([P(15), P(16), P(17), P(18), [P(18)[0], 470]], 54, 'url(#sand)');
  // road edges: a few stones
  for (let x = 30; x < 800; x += 70) s += ellipse(x, ry - 34, 5, 3, { fill: C.stoneDark, opacity: 0.5 }) + ellipse(x + 35, ry + 34, 5, 3, { fill: C.stoneDark, opacity: 0.5 });
  // Bongo's house (top view), the door at the grass path (point 13)
  const [hx, hy] = P(13);
  s += roofTop(hx - 85, hy + 18, 180, 170, { chimney: [hx + 40, hy + 50] });
  s += rect(hx - 14, hy + 10, 28, 12, { rx: 3, fill: '#7a3f18', stroke: C.woodDeep, strokeWidth: 2 });
  // rock + fern next to the house garden, bushes
  s += rockTop(455, 335, 34, 28, 'rk1') + fern(440, 300, 30, 'fe1');
  s += bush(40, 190, 22, 'sp1bu1') + bush(770, 260, 26, 'sp1bu2') + bush(560, 410, 20, 'sp1bu3') + bush(770, 180, 18, 'sp1bu4', '#3f9a4a');
  // dashed guide marks between the fields (like painted road markings)
  for (const p of PTS) {
    for (const q of PTS) {
      if (q.n <= p.n || Math.hypot(q.x - p.x, q.y - p.y) > 76) continue;
      const mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2;
      const horiz = Math.abs(q.x - p.x) > Math.abs(q.y - p.y);
      s += path(horiz ? `M${r2(mx - 8)} ${r2(my)} h16` : `M${r2(mx)} ${r2(my - 8)} v16`, { stroke: dk('#8a7a60', 0.2), strokeWidth: 4, strokeLinecap: 'round', opacity: 0.45 });
    }
  }
  return s;
}

/** stork from above, flying up-left; wings flap with the frame (1..6) */
function stork(f: number, w: number, h: number, sh = false): string {
  const t = (f - 1) / 5;
  const span = 26 + 14 * Math.cos(t * Math.PI);
  const col = sh ? '#000' : C.white;
  const dark = sh ? '#000' : '#2a2140';
  const body = g({ transform: `translate(${w / 2} ${h / 2}) rotate(-30)` },
    path(`M0 -6 C ${-span} ${-14 + 8 * t} ${-span - 6} ${4} ${-span + 2} ${8} L -4 8 Z`, { fill: col, stroke: sh ? 'none' : '#8a93a6', strokeWidth: 1.5 }),
    path(`M0 -6 C ${span} ${-14 + 8 * t} ${span + 6} ${4} ${span - 2} ${8} L 4 8 Z`, { fill: col, stroke: sh ? 'none' : '#8a93a6', strokeWidth: 1.5 }),
    sh ? '' : path(`M${-span + 2} 8 l-6 -6 l8 -2 z M${span - 2} 8 l6 -6 l-8 -2 z`, { fill: dark }),
    ellipse(0, 4, 6, 15, { fill: col, stroke: sh ? 'none' : '#8a93a6', strokeWidth: 1.5 }),
    sh ? ellipse(0, -14, 3.5, 4, { fill: col }) : ellipse(0, -14, 4, 4.5, { fill: C.white, stroke: '#8a93a6', strokeWidth: 1.5 }),
    sh ? '' : path('M0 -18 l-1.5 -12 l3 0 z', { fill: C.red }),
    sh ? '' : path('M-2 19 l-2 10 M2 19 l2 10', { stroke: C.red, strokeWidth: 2, strokeLinecap: 'round' }));
  return sh ? g({ opacity: 0.25 }, body) : body;
}

export default defineMovie({
  Headline: (m, w, h) => headline('Inselzentrum', w, h),
  'SP001-Board': (m, w, h) => background(w, h),
  'Storch-*': (m, w, h) => stork(m.frame ?? 1, w, h),
  'Shadow-*': (m, w, h) => stork(m.frame ?? 1, w, h, true),
});
