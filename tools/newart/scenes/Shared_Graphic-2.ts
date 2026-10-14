// Shared_Graphic-2: board points, jump sprites of all 9 figures, trees, obstacles (Schranke/Felsen),
// mood bubbles.
import { defineMovie, findMember, type Member } from '../lib/api';
import { treeTop } from '../lib/nature';
import { C, circle, ellipse, g, path, r2, rect } from '../lib/svg';
import { jumpMember, type JmpId } from '../lib/topdown';
import { boardPoint, moodBubble } from '../lib/ui';

const DIR = 'Shared_Graphic-2';

function jmp(m: Member, w: number, h: number): string {
  const id = m.base.replace(/^Jmp/, '') as JmpId;
  const f1 = findMember(DIR, `${m.base}-1`) ?? m;
  return jumpMember(id, m.frame ?? 1, w, h, m.regX, m.regY, { w: f1.w, h: f1.h });
}

/** tree crown at the left, cast shadow to the right (like the original layout of Baum0x) */
function tree(seed: string, base: string, light: string, dark: string) {
  return (m: Member, w: number, h: number) => {
    const r = Math.min(w * 0.36, h * 0.44);
    return treeTop(w * 0.42, h * 0.46, r, seed, { base, light, dark });
  };
}

/** barrier boom: pivot at the registration point, 1 = closed (pointing down across the road) … 11 = open */
function schranke(m: Member, w: number, h: number): string {
  const t = ((m.frame ?? 1) - 1) / 10;
  const px = m.regX, py = m.regY;
  const len = (h - py - 6) - 16 * t;
  const ang = -58 * t;
  const segs = 6;
  let stripes = '';
  for (let i = 0; i < segs; i++) {
    const y0 = 8 + (i * (len - 8)) / segs;
    stripes += rect(-4.5, y0, 9, (len - 8) / segs, { fill: i % 2 ? C.white : C.red });
  }
  const boom = g({ transform: `translate(${px} ${py}) rotate(${r2(ang)})` },
    rect(-1.5 + 4, 6, 9, len - 4, { rx: 4.5, fill: '#000', opacity: 0.2 }),
    rect(-5.5, 4, 11, len - 2, { rx: 5, fill: C.white, stroke: C.redDark, strokeWidth: 2.5 }),
    stripes,
    rect(-5.5, 4, 11, len - 2, { rx: 5, fill: 'none', stroke: C.redDark, strokeWidth: 2.5 }),
    circle(0, len, 5, { fill: C.red, stroke: C.redDark, strokeWidth: 2 }));
  const post = circle(px + 3, py + 3, 10, { fill: '#000', opacity: 0.2 }) + circle(px, py, 9, { fill: '#7a808c', stroke: '#3a3f48', strokeWidth: 2.5 }) + circle(px - 2, py - 2, 3.5, { fill: '#c8ccd6' });
  return boom + post;
}

/** boulder: 1 = on the field (blocking) … 11 = rolled aside (down) */
function felsen(m: Member, w: number, h: number): string {
  const t = ((m.frame ?? 1) - 1) / 10;
  const e = t * t * (3 - 2 * t);
  const cx = 40 + 10 * e, cy = 46 + 72 * e, r = 30;
  const rot = 220 * e;
  return ellipse(cx + 9, cy + 10, r * 0.95, r * 0.8, { fill: '#000', opacity: 0.22 }) +
    g({ transform: `translate(${r2(cx)} ${r2(cy)}) rotate(${r2(rot)})` },
      path('M-28 4 q-4 -22 14 -30 q18 -6 32 6 q12 12 6 28 q-8 18 -28 18 q-20 -2 -24 -22 z', { fill: '#a39a8c', stroke: '#5a5248', strokeWidth: 3, strokeLinejoin: 'round' }),
      path('M-16 -14 q10 -8 22 -4', { fill: 'none', stroke: '#d6cfc2', strokeWidth: 5, strokeLinecap: 'round' }),
      path('M4 2 l10 10 M-10 8 l4 8', { fill: 'none', stroke: '#6e665a', strokeWidth: 2.5, strokeLinecap: 'round' }),
      circle(-6, -2, 2.5, { fill: '#6e665a' }));
}

export default defineMovie({
  'pointBlue-*': (m, w, h) => boardPoint('Blue', m.frame ?? 0, w, h),
  'pointRed-*': (m, w, h) => boardPoint('Red', m.frame ?? 0, w, h),
  'pointJoke-*': (m, w, h) => boardPoint('Joke', m.frame ?? 0, w, h),
  'JmpBingo-*': jmp, 'JmpPuck-*': jmp, 'JmpReeling-*': jmp, 'JmpMagnus-*': jmp, 'JmpArnold-*': jmp,
  'JmpBen-*': jmp, 'JmpTim-*': jmp, 'JmpRocco-*': jmp, 'JmpAlfred-*': jmp,
  Baum01: tree('baum01', '#5fb85a', '#a4dc72', '#2f7a3a'),
  Baum02: tree('baum02', '#3f9a4a', '#7fcf6a', '#22663a'),
  Baum04: tree('baum04', '#7cc25a', '#b8e88a', '#3d7d22'),
  Baum05: tree('baum05', '#2f8a4a', '#6fbf6a', '#1a5a32'),
  Baum06: tree('baum06', '#4fa64a', '#8fd46a', '#2f6a30'),
  'Schranke-*': schranke,
  'Felsen-*': felsen,
  Gut: (m, w, h) => moodBubble('Gut', w, h),
  Neutral: (m, w, h) => moodBubble('Neutral', w, h),
  Schlecht: (m, w, h) => moodBubble('Schlecht', w, h),
});
