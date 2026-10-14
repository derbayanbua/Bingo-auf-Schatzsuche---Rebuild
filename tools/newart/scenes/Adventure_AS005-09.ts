// AS005-09 "Leuchtturm" lift ride: rock wall of the shaft, the basket with Bongo (Lift-Bingo) or Pucki (Lift-Puck)
// moves through the screen; Bingo-Augen / Puck-Augen are blink overlays relative to the basket loc (top centre).
import { atReg, defineMovie } from '../lib/api';
import { rockFill } from '../lib/cave';
import { bongo, bongoLid, pucki, puckiLid } from '../lib/characters';
import { liftBasket } from '../lib/lift';
import { g, path, rect } from '../lib/svg';
import { headline } from '../lib/ui';

// figure placement relative to the basket loc (0,0 = rope point, basket canvas 144x182, reg 72,0)
const BONGO = { x: 12.3, y: 117.9, k: 0.55 };
const PUCKI = { x: -55.6, y: 109, k: 0.75 };

const place = (p: { x: number; y: number; k: number }, body: string) => g({ transform: `translate(${p.x} ${p.y}) scale(${p.k})` }, body);

function background(): string {
  let s = rockFill(0, 0, 800, 448, 91, { base: '#cbbca4', n: 46 });
  s += path('M0 120 Q300 160 520 60 Q640 20 800 40 M0 330 Q260 300 420 360 Q600 420 800 380', { fill: 'none', stroke: '#7a6a52', strokeWidth: 5, strokeLinecap: 'round' });
  s += rect(0, 0, 800, 448, { fill: '#000', opacity: 0.08 });
  return s;
}

export default defineMovie({
  Headline: (m, w, h) => headline('Leuchtturm', w, h),
  HintergrundAufzugFahrt: () => background(),
  'Lift-Bingo': (m, w, h) => liftBasket(w, h, { pulley: true, basketH: 60, inner: () => atReg(m, place(BONGO, bongo(1, { full: true, armL: 3 }))) }),
  'Lift-Puck': (m, w, h) => liftBasket(w, h, { pulley: true, basketH: 60, inner: () => atReg(m, place(PUCKI, pucki(1, { full: true, armL: 2 }))) }),
  'Bingo-Augen': (m) => atReg(m, place(BONGO, bongoLid(4))),
  'Puck-Augen': (m) => atReg(m, place(PUCKI, puckiLid(4))),
  Seil: (m, w, h) => path(`M${w / 2} 0 V${h}`, { stroke: '#2a2a2e', strokeWidth: 4 }),
});
