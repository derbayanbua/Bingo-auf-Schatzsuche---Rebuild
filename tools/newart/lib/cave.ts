// Rock / cave surfaces for the secret passage and the cave scenes (AS005-07..10, AS017-xx).
//   rockFill(x, y, w, h, seed, o) → flat rock area with cracks and stone patches
//   rockTunnel(seed)              → 800x448 tunnel looking into the dark

import { blob, dk, lt, path, r2, rect, rng } from './svg';

export function rockFill(x: number, y: number, w: number, h: number, seed: number, o: { base?: string; n?: number } = {}): string {
  const base = o.base ?? '#c8a878';
  const r = rng(seed);
  let s = rect(x, y, w, h, { fill: base });
  const n = o.n ?? Math.round((w * h) / 9000);
  for (let i = 0; i < n; i++) {
    const cx = x + r() * w, cy = y + r() * h, rx = 20 + r() * 50, ry = 14 + r() * 30;
    const c = r() < 0.5 ? dk(base, 0.12 + r() * 0.12) : lt(base, 0.1 + r() * 0.15);
    s += path(blob(cx, cy, rx, ry, `${seed}-${i}`, 0.25), { fill: c, stroke: dk(base, 0.35), strokeWidth: 2, strokeOpacity: 0.5 });
  }
  let cracks = '';
  for (let i = 0; i < n / 2; i++) {
    let cx = x + r() * w, cy = y + r() * h;
    cracks += `M${r2(cx)} ${r2(cy)} `;
    for (let k = 0; k < 3; k++) { cx += (r() - 0.5) * 40; cy += 8 + r() * 18; cracks += `L${r2(cx)} ${r2(cy)} `; }
  }
  s += path(cracks, { fill: 'none', stroke: dk(base, 0.5), strokeWidth: 2, strokeLinecap: 'round', strokeOpacity: 0.6 });
  return s;
}

/** tunnel: rock walls, darker passage towards a vanishing point vx,vy */
export function rockTunnel(seed: number, vx = 400, vy = 210, base = '#c8a878'): string {
  let s = rockFill(0, 0, 800, 448, seed, { base, n: 34 });
  s += path(`M${vx - 150} 448 Q${vx - 120} ${vy - 40} ${vx} ${vy - 120} Q${vx + 120} ${vy - 40} ${vx + 150} 448 Z`, { fill: dk(base, 0.3), stroke: dk(base, 0.5), strokeWidth: 4 });
  s += path(`M${vx - 80} 448 Q${vx - 60} ${vy} ${vx} ${vy - 50} Q${vx + 60} ${vy} ${vx + 80} 448 Z`, { fill: dk(base, 0.55) });
  s += path(`M${vx - 40} ${vy + 120} Q${vx} ${vy + 20} ${vx + 40} ${vy + 120} Z`, { fill: dk(base, 0.75) });
  // floor
  s += path(`M0 448 Q200 330 ${vx - 90} ${vy + 120} H${vx + 90} Q600 330 800 448 Z`, { fill: dk(base, 0.08), stroke: dk(base, 0.4), strokeWidth: 3 });
  return s;
}
