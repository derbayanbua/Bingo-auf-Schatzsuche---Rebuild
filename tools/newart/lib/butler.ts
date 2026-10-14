// The villa butler (own design): tall pale-lilac head, slicked black hair with a side parting,
// grey walrus moustache, white collar, black bow tie and tailcoat.
// Drawn in local coordinates: (0,0) = chin centre, head extends up to y ≈ -96, shoulders down to y ≈ +60.
import { C, circle, ellipse, g, path, r2 } from './svg';

export const BUTLER = { skin: '#c9c3e0', skinDark: '#5b5480', hair: '#2a2433', coat: '#2c2a38', coatLight: '#4a4760' };

export interface ButlerPose {
  /** pupil offset (-1..1 x, -1..1 y) */
  look?: [number, number];
  /** head turn towards the viewer's right, 0..1 (shifts the face) */
  turn?: number;
  /** eyelids half closed */
  bored?: boolean;
  /** mouth: 0 closed, 1 open */
  mouth?: number;
}

/** head + shoulders bust of the butler */
export function butlerBust(p: ButlerPose = {}): string {
  const B = BUTLER;
  const t = p.turn ?? 0;
  const fx = 14 * t; // face shift when turning
  const [lx, ly] = p.look ?? [0, 0];
  let s = '';
  // tailcoat shoulders
  s += path('M-58 60 q2 -44 30 -52 h56 q28 8 30 52 z', { fill: B.coat, stroke: '#14121c', strokeWidth: 4, strokeLinejoin: 'round' });
  s += path('M-26 10 l18 40 M26 10 l-18 40', { stroke: B.coatLight, strokeWidth: 3, strokeLinecap: 'round' });
  // shirt + collar
  s += path('M-20 6 h40 l-12 46 h-16 z', { fill: C.white, stroke: '#8a8aa0', strokeWidth: 2.5, strokeLinejoin: 'round' });
  // head (tall rounded)
  s += path(`M-34 4 q-8 -50 2 -84 q${r2(32 + fx * 0.3)} -26 ${r2(64 - fx * 0.2)} 0 q10 34 2 84 q-34 14 -68 0 z`, { fill: B.skin, stroke: B.skinDark, strokeWidth: 4, strokeLinejoin: 'round' });
  s += path('M-24 -64 q6 -12 18 -16', { fill: 'none', stroke: '#ece8f8', strokeWidth: 5, strokeLinecap: 'round', strokeOpacity: 0.8 });
  // hair: slicked cap with side parting
  s += path('M-35 -50 q-2 -30 16 -38 q22 -10 44 2 q12 8 10 34 q-8 -20 -24 -24 l-4 6 q-18 -8 -42 20 z', { fill: B.hair, stroke: '#120f18', strokeWidth: 2.5, strokeLinejoin: 'round' });
  s += path('M4 -84 q-6 10 -4 22', { fill: 'none', stroke: '#5a5266', strokeWidth: 2, strokeLinecap: 'round' });
  // eyes
  const eye = (ex: number) => {
    let e = ellipse(ex + fx, -40, 10, 12, { fill: C.white, stroke: C.ink, strokeWidth: 3 }) +
      circle(ex + fx + lx * 4 + t * 3, -40 + ly * 5, 4.6, { fill: C.ink }) +
      circle(ex + fx + lx * 4 + t * 3 - 1.6, -41.8 + ly * 5, 1.5, { fill: C.white });
    if (p.bored) e += path(`M${ex + fx - 11} -41 q11 -14 22 0 z`, { fill: B.skin, stroke: C.ink, strokeWidth: 2.5, strokeLinejoin: 'round' });
    return e;
  };
  s += eye(-13) + eye(13);
  s += path(`M${-24 + fx} -56 q8 -5 16 -1 M${6 + fx} -57 q8 -4 16 1`, { fill: 'none', stroke: B.hair, strokeWidth: 3.5, strokeLinecap: 'round' });
  // nose
  s += path(`M${fx - 2} -32 q${10 + t * 6} 4 ${8 + t * 6} 14 q-6 4 -12 0`, { fill: '#b2a9d2', stroke: B.skinDark, strokeWidth: 2.5, strokeLinejoin: 'round' });
  // moustache + mouth
  if ((p.mouth ?? 0) > 0) s += ellipse(fx + 1, -6, 7, 5, { fill: C.mouth, stroke: C.ink, strokeWidth: 2 });
  s += path(`M${fx - 22} -10 q10 -12 22 -6 q12 -6 22 6 q-10 4 -22 -1 q-12 5 -22 1 z`, { fill: '#9a96a8', stroke: '#55506a', strokeWidth: 2.5, strokeLinejoin: 'round' });
  // bow tie
  s += path('M0 12 l-15 -8 v16 z M0 12 l15 -8 v16 z', { fill: '#14121c', stroke: '#000', strokeWidth: 1.5, strokeLinejoin: 'round' }) + circle(0, 12, 4, { fill: '#2a2433' });
  return s;
}

/** bust placed at (x, y) with scale k */
export function butlerAt(x: number, y: number, k: number, p: ButlerPose = {}): string {
  return g({ transform: `translate(${r2(x)} ${r2(y)}) scale(${r2(k)})` }, butlerBust(p));
}
