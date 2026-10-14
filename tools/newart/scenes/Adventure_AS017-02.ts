// AS017-02 "In der Höhle" – end of chapter 1: the wreck has been raised, everybody is gathered on the rock ledge
// to repair it (hotspot over the wreck → chapter 2). Arm crops of the painting: ReelingArmRechts 175,278 ·
// ArnoldArmLinks 261,287 · BenArmLinks 356,251 · TimArmLinks 311,348 · BingoArmLinks 387,335 · AlfredHandRechts 615,347 ·
// PuckHandLinks 623,378 · MagnusArmLinks 636,263 (6 frames each).
import { defineMovie, Member } from '../lib/api';
import { bongo, pucki } from '../lib/characters';
import { npcRig } from '../lib/npcrig';
import { inScene } from '../lib/stageloc';
import { blob, defs, g, linGrad, path, r2 } from '../lib/svg';
import { headline } from '../lib/ui';
import { caveBack, wreckShip } from '../lib/wreck';

type St = Record<string, number>;
const tt = (f: number | undefined, n = 6) => ((f ?? 1) - 1) / (n - 1);

function world(st: St = {}): string {
  let s = caveBack('cv2', 172);
  s += defs(linGrad('wat2', [[0, '#3aa88a'], [1, '#1a6a5a']]));
  s += path('M0 250 Q300 240 800 270 V448 H0 Z', { fill: 'url(#wat2)' });
  s += wreckShip(330, 262, 0.8, -4);
  // rock ledge
  s += path('M0 448 V370 Q120 330 300 340 Q520 330 800 360 V448 Z', { fill: '#8a7a64', stroke: '#4a3e30', strokeWidth: 4 });
  s += path(blob(60, 400, 110, 60, 'lr', 0.15), { fill: '#7a6a54', stroke: '#4a3e30', strokeWidth: 4 });
  // back row
  {
    const a = tt(st.BenArmLinks);
    s += npcRig('Ben', 385, 345, 0.55, { mouth: 3, armL: { hand: [372 - 4 * a, 290 - 26 * a], rot: -20 - 30 * a }, armR: { hand: [418, 330], rot: 10 } });
  }
  {
    const a = tt(st.MagnusArmLinks);
    s += npcRig('Magnus', 690, 360, 0.7, { mouth: 2, eyes: 'left', armL: { hand: [664 - 14 * a, 316 - 40 * a], elbow: [650, 320 - 10 * a], rot: -30 - 30 * a }, armR: { hand: [732, 340], rot: 20 } });
  }
  {
    const a = tt(st.ArnoldArmLinks);
    s += npcRig('Arnold', 225, 353, 0.6, { mouth: 3, armR: { hand: [322 + 12 * a, 312 - 8 * a], elbow: [300, 318], rot: 60 + 20 * a }, armL: { hand: [180, 340], rot: -10 } });
  }
  {
    const a = tt(st.ReelingArmRechts);
    s += npcRig('Reeling', 140, 395, 0.7, { mouth: 2, eyes: 'right', armR: { hand: [208 + 4 * a, 318 - 22 * a], elbow: [200, 334], rot: 20 + 30 * a }, armL: { hand: [100, 380], rot: -10 } });
  }
  {
    const a = tt(st.AlfredHandRechts);
    s += npcRig('Alfred', 560, 400, 0.7, { mouth: 3, armR: { hand: [634, 366 - 6 * a], rot: 60 + 30 * Math.sin(a * Math.PI * 2) }, armL: { hand: [520, 380], rot: -10 } });
  }
  // front row
  {
    const a = tt(st.TimArmLinks);
    s += npcRig('Tim', 300, 412, 0.7, { mouth: 3, armR: { hand: [344 + 3 * a, 376 - 18 * a], rot: 20 + 40 * a }, armL: { hand: [262, 396], rot: -10 } });
  }
  s += g({ transform: 'translate(370.5 378) scale(0.75)' }, bongo(0.75, { full: true, mouth: 3, armL: st.BingoArmLinks ?? 1 }));
  const pf = 1 + Math.round(((st.PuckHandLinks ?? 1) - 1) * 3 / 5);
  s += g({ transform: 'translate(602 395) scale(0.8)' }, pucki(0.8, { full: true, mouth: 3, armL: pf }));
  return s;
}

const part = (key: string) => (m: Member) => inScene(m, world({ [key]: m.frame ?? 1 }));

export default defineMovie({
  Headline: (m, w, h) => headline('In der Höhle', w, h),
  Background: () => world(),
  'AlfredHandRechts-*': part('AlfredHandRechts'),
  'ArnoldArmLinks-*': part('ArnoldArmLinks'),
  'BenArmLinks-*': part('BenArmLinks'),
  'BingoArmLinks-*': part('BingoArmLinks'),
  'PuckHandLinks-*': part('PuckHandLinks'),
  'ReelingArmRechts-*': part('ReelingArmRechts'),
  'TimArmLinks-*': part('TimArmLinks'),
  'MagnusArmLinks-*': part('MagnusArmLinks'),
});
void r2;
