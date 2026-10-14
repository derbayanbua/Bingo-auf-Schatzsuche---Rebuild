// Sea cave with the old shipwreck (AS017-01 under water / AS017-02 lifted and being repaired).
//   caveBack(id, seed)       → rock walls + ceiling, 800x448
//   wreckShip(x, y, s, tilt) → the wreck (hull, broken masts), local origin = keel middle

import { blob, defs, dk, g, linGrad, lt, path, r2, rect } from './svg';
import { rockFill } from './cave';

export function caveBack(id: string, seed: number): string {
  let s = rockFill(0, 0, 800, 448, seed, { base: '#9a8a74', n: 40 });
  s += defs(linGrad(`${id}l`, [[0, '#d8f0c8', 0.55], [1, '#d8f0c8', 0]], 0, 0, 1, 1));
  s += path('M0 0 H360 Q200 120 120 260 L0 300 Z', { fill: `url(#${id}l)` });
  s += path('M0 0 H800 V40 Q600 80 420 30 Q240 0 0 60 Z', { fill: dk('#9a8a74', 0.35) });
  return s;
}

export function wreckShip(x: number, y: number, sc: number, tilt: number, o: { broken?: boolean } = {}): string {
  const wood = '#b8783a', wd = '#5a3418', mast = '#d8c870';
  const hull = path('M-190 -40 Q-200 10 -160 40 H150 Q200 20 210 -50 L170 -40 Q0 -20 -150 -50 Z', { fill: wood, stroke: wd, strokeWidth: 5, strokeLinejoin: 'round' });
  let planks = '';
  for (let i = 0; i < 4; i++) planks += `M${-180 + i * 6} ${-30 + i * 16} Q0 ${-12 + i * 16} ${190 - i * 12} ${-38 + i * 18} `;
  let s = hull + path(planks, { fill: 'none', stroke: dk(wood, 0.3), strokeWidth: 3 });
  // deck house + railing
  s += rect(-150, -86, 90, 44, { fill: lt(wood, 0.1), stroke: wd, strokeWidth: 4 }) + rect(-136, -76, 20, 16, { fill: '#2a1a10' }) + rect(-100, -76, 20, 16, { fill: '#2a1a10' });
  s += path('M-60 -46 H170', { stroke: wd, strokeWidth: 5 });
  for (let xx = -50; xx < 170; xx += 22) s += path(`M${xx} -46 v-16`, { stroke: wd, strokeWidth: 4 });
  // masts (broken when lying in the water)
  const masts: [number, number, number][] = o.broken ? [[-40, 190, -14], [60, 160, 18], [130, 120, -30]] : [[-40, 230, -4], [60, 260, 4], [140, 180, 10]];
  for (const [mx, len, a] of masts) {
    s += g({ transform: `rotate(${a} ${mx} -40)` },
      path(`M${mx} -40 V${-40 - len}`, { stroke: dk(mast, 0.4), strokeWidth: 10, strokeLinecap: 'round' }),
      path(`M${mx} -40 V${-40 - len}`, { stroke: mast, strokeWidth: 5, strokeLinecap: 'round' }),
      path(`M${mx - 50} ${-40 - len * 0.7} H${mx + 50}`, { stroke: dk(mast, 0.3), strokeWidth: 6, strokeLinecap: 'round' }));
  }
  // holes
  s += path(blob(-60, 10, 26, 14, 'wh1', 0.3), { fill: '#2a1a10' }) + path(blob(90, 0, 18, 10, 'wh2', 0.3), { fill: '#2a1a10' });
  return g({ transform: `translate(${r2(x)} ${r2(y)}) rotate(${r2(tilt)}) scale(${r2(sc)})` }, s);
}
