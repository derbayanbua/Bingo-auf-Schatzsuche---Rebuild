// NPC rig for scene paintings: the NPC kit look (lib/npcs.ts: soft body with the face on it, short legs,
// tube arms, one accessory) with *explicit* arm targets, so hands/arms can be placed into the sprite
// rectangles of the original part animations (hands waving, arms moving) and faces can talk/blink.
//
//   npcRig('Alfred', x, y, k, { mouth: 2, eyes: 'left', armR: { hand: [620, 250], rot: 20 } })
//     x/y = feet centre in scene coordinates, k = scale (1 ≈ 170 px tall)
//     arm targets are scene coordinates too (elbow optional), rot rotates the hand (wave)
//   rigFace(id, x, y, k) → { eye: [x,y], mouth: [x,y], eyeDx } in scene coordinates (layout helper)
//
// Extra id 'Butler' = the villa butler (pale-lilac head, slicked black hair, grey moustache, tailcoat, bow tie).
// Self-contained (no dependency on npcs.ts internals), keep the look in sync with npcs.ts by hand.

import { C, circle, dk, ellipse, g, lt, path, r2, rect } from './svg';

export type RigId = 'Reeling' | 'Alfred' | 'Magnus' | 'Ben' | 'Arnold' | 'Tim' | 'Rocco' | 'Butler' | 'Band';

export const RIG_LOOK: Record<RigId, { body: string; dark: string; accent: string }> = {
  Reeling: { body: '#2e4c8a', dark: '#16264a', accent: C.gold },
  Alfred: { body: '#f4f4f4', dark: '#8f8a9e', accent: C.red },
  Magnus: { body: '#8fcf6b', dark: '#3d7d22', accent: '#e8483f' },
  Ben: { body: '#e88fb4', dark: '#a2346a', accent: '#c9a03a' },
  Arnold: { body: '#e8964a', dark: '#8a4a12', accent: '#d63a2f' },
  Tim: { body: '#58b7c9', dark: '#1d6f82', accent: '#2f6fd8' },
  Rocco: { body: '#5b5f6b', dark: '#2a2c33', accent: '#c0392b' },
  Butler: { body: '#c9c3e0', dark: '#5b5480', accent: '#1d1b26' },
  Band: { body: '#f6d23a', dark: '#a07800', accent: '#c8302a' },
};

interface Spec { bodyW: number; bodyH: number; shape: 'egg' | 'pear' | 'bean' | 'barrel' | 'ball'; legH: number; shoe: string; faceY: number }

const SPEC: Record<RigId, Spec> = {
  Reeling: { bodyW: 120, bodyH: 150, shape: 'egg', legH: 26, shoe: '#222', faceY: 0.34 },
  Alfred: { bodyW: 126, bodyH: 140, shape: 'pear', legH: 22, shoe: '#333', faceY: 0.33 },
  Magnus: { bodyW: 108, bodyH: 120, shape: 'bean', legH: 22, shoe: '#5a3a20', faceY: 0.36 },
  Ben: { bodyW: 104, bodyH: 150, shape: 'egg', legH: 30, shoe: '#333', faceY: 0.32 },
  Arnold: { bodyW: 150, bodyH: 128, shape: 'barrel', legH: 22, shoe: '#333', faceY: 0.3 },
  Tim: { bodyW: 96, bodyH: 96, shape: 'ball', legH: 20, shoe: '#333', faceY: 0.4 },
  Rocco: { bodyW: 118, bodyH: 116, shape: 'ball', legH: 22, shoe: '#4a2a10', faceY: 0.38 },
  Butler: { bodyW: 100, bodyH: 170, shape: 'egg', legH: 26, shoe: '#111', faceY: 0.26 },
  Band: { bodyW: 96, bodyH: 136, shape: 'egg', legH: 24, shoe: '#222', faceY: 0.3 },
};

const SW = 4;

function bodyPath(sp: Spec, top: number): string {
  const w = sp.bodyW, h = sp.bodyH, x = -w / 2, b = top + h;
  switch (sp.shape) {
    case 'egg': return `M0 ${top} C${w * 0.42} ${top} ${w / 2} ${top + h * 0.45} ${w / 2} ${top + h * 0.66} C${w / 2} ${b - h * 0.08} ${w * 0.3} ${b} 0 ${b} C${-w * 0.3} ${b} ${x} ${b - h * 0.08} ${x} ${top + h * 0.66} C${x} ${top + h * 0.45} ${-w * 0.42} ${top} 0 ${top} Z`;
    case 'pear': return `M0 ${top} C${w * 0.34} ${top} ${w * 0.34} ${top + h * 0.38} ${w * 0.44} ${top + h * 0.56} C${w * 0.56} ${top + h * 0.78} ${w * 0.4} ${b} 0 ${b} C${-w * 0.4} ${b} ${-w * 0.56} ${top + h * 0.78} ${-w * 0.44} ${top + h * 0.56} C${-w * 0.34} ${top + h * 0.38} ${-w * 0.34} ${top} 0 ${top} Z`;
    case 'bean': return `M${-w * 0.1} ${top} C${w * 0.4} ${top - 4} ${w / 2} ${top + h * 0.4} ${w * 0.46} ${top + h * 0.7} C${w * 0.42} ${b} ${-w * 0.2} ${b + 4} ${-w * 0.44} ${top + h * 0.78} C${-w * 0.56} ${top + h * 0.5} ${-w * 0.5} ${top + 2} ${-w * 0.1} ${top} Z`;
    case 'barrel': return `M${x + 18} ${top} H${w / 2 - 18} Q${w / 2} ${top} ${w / 2} ${top + 22} V${b - 26} Q${w / 2 - 4} ${b} ${w / 2 - 30} ${b} H${x + 30} Q${x + 4} ${b} ${x} ${b - 26} V${top + 22} Q${x} ${top} ${x + 18} ${top} Z`;
    case 'ball': return `M0 ${top} A${w / 2} ${h / 2} 0 1 1 0 ${b} A${w / 2} ${h / 2} 0 1 1 0 ${top} Z`;
  }
}

function geo(id: RigId) {
  const sp = SPEC[id];
  const top = -(sp.legH + sp.bodyH - 8);
  const eyeY = top + sp.bodyH * sp.faceY;
  const eyeDx = Math.min(20, sp.bodyW * 0.16);
  const mouthY = eyeY + 38;
  return { sp, top, eyeY, eyeDx, mouthY, shY: top + sp.bodyH * 0.55 };
}

export type RigEyes = 'open' | 'closed' | 'left' | 'right' | 'up' | 'down';

function eyes(id: RigId, mode: RigEyes, eyeY: number, eyeDx: number, ek = 1): string {
  return g({ transform: `translate(0 ${r2(eyeY)}) scale(${r2(ek)}) translate(0 ${r2(-eyeY)})` }, eyesRaw(id, mode, eyeY, eyeDx / ek));
}

function eyesRaw(id: RigId, mode: RigEyes, eyeY: number, eyeDx: number): string {
  const L = RIG_LOOK[id];
  const rx = 11.5, ry = 14;
  return [-eyeDx, eyeDx].map((x) => {
    if (id === 'Rocco' && x < 0) return ellipse(x, eyeY, rx + 1, ry - 1, { fill: '#1d1d22' }) + path(`M${x - 30} ${eyeY - 22} L${x + 50} ${eyeY - 10}`, { stroke: '#1d1d22', strokeWidth: 3 });
    if (mode === 'closed')
      return ellipse(x, eyeY, rx, ry, { fill: dk(L.body, 0.12), stroke: C.ink, strokeWidth: SW * 0.8 }) +
        path(`M${x - rx + 2} ${eyeY + 3} q${rx - 2} 7 ${2 * rx - 4} 0`, { fill: 'none', stroke: C.ink, strokeWidth: SW * 0.8, strokeLinecap: 'round' });
    const [dx, dy] = mode === 'left' ? [-4.5, 1] : mode === 'right' ? [4.5, 1] : mode === 'up' ? [0, -5] : mode === 'down' ? [0, 5] : [0, 1.5];
    return ellipse(x, eyeY, rx, ry, { fill: C.white, stroke: C.ink, strokeWidth: SW * 0.8 }) +
      circle(x + dx, eyeY + dy, 5.2, { fill: C.ink }) + circle(x + dx + 1.6, eyeY + dy - 2, 1.8, { fill: C.white });
  }).join('');
}

/** mouth 1 closed smile, 2 small open, 3 open, 4 wide, 5 round */
function mouth(n: number, cy: number): string {
  const cx = 0;
  const o = { fill: C.mouth, stroke: C.ink, strokeWidth: SW * 0.8, strokeLinejoin: 'round' as const };
  switch (Math.max(1, Math.min(5, n))) {
    case 1: return path(`M${cx - 18} ${cy - 2} q18 16 36 0 q-18 6 -36 0 z`, o);
    case 2: return path(`M${cx - 16} ${cy - 3} q16 4 32 0 q-4 13 -16 13 q-12 0 -16 -13 z`, o) + ellipse(cx, cy + 6, 6, 2.5, { fill: C.tongue });
    case 3: return path(`M${cx - 17} ${cy - 5} q17 4 34 0 q-3 20 -17 20 q-14 0 -17 -20 z`, o) + path(`M${cx - 8} ${cy - 3.5} h16 v3.5 q-8 2 -16 0 z`, { fill: C.white }) + ellipse(cx, cy + 10, 7, 3.5, { fill: C.tongue });
    case 4: return path(`M${cx - 20} ${cy - 6} q20 2 40 0 q-2 24 -20 24 q-18 0 -20 -24 z`, o) + path(`M${cx - 10} ${cy - 5} h20 v4 q-10 2 -20 0 z`, { fill: C.white }) + ellipse(cx, cy + 12, 9, 4.5, { fill: C.tongue });
    default: return ellipse(cx, cy + 4, 9, 11, o) + ellipse(cx, cy + 9, 5, 3, { fill: C.tongue });
  }
}

function hat(id: RigId, top: number, w: number): string {
  const L = RIG_LOOK[id];
  switch (id) {
    case 'Reeling': return path(`M${-w * 0.42} ${top + 18} q${w * 0.42} -18 ${w * 0.84} 0 l-4 10 h${-w * 0.84 + 8} z`, { fill: '#1b2d55', stroke: '#0d1830', strokeWidth: SW }) +
      path(`M${-w * 0.36} ${top + 10} q${w * 0.36} -40 ${w * 0.72} 0 z`, { fill: C.white, stroke: '#8a93a6', strokeWidth: SW }) +
      path(`M-9 ${top + 2} l9 -9 l9 9 l-9 9 z`, { fill: L.accent, stroke: C.goldDark, strokeWidth: 2 });
    case 'Alfred': return rect(-w * 0.3, top - 6, w * 0.6, 18, { rx: 4, fill: C.white, stroke: '#a8a2b8', strokeWidth: SW }) +
      path(`M${-w * 0.3} ${top - 4} q-18 -26 6 -34 q6 -22 24 -12 q14 -16 28 2 q24 4 10 44 z`, { fill: C.white, stroke: '#a8a2b8', strokeWidth: SW, strokeLinejoin: 'round' });
    case 'Magnus': return path(`M${-w * 0.36} ${top + 16} q0 -30 ${w * 0.36} -32 q${w * 0.36} 2 ${w * 0.36} 32 z`, { fill: L.accent, stroke: dk(L.accent), strokeWidth: SW }) +
      path(`M${-w * 0.34} ${top + 6} h${w * 0.68} M${-w * 0.3} ${top - 4} h${w * 0.6}`, { stroke: C.white, strokeWidth: 5 }) + circle(0, top - 18, 9, { fill: C.white, stroke: '#bbb', strokeWidth: 2 });
    case 'Ben': return path(`M${-w * 0.4} ${top + 16} q${w * 0.4} -34 ${w * 0.8} 0 q-${w * 0.4} 8 ${-w * 0.8} 0 z`, { fill: C.white, stroke: L.dark, strokeWidth: SW }) +
      path(`M${-w * 0.36} ${top + 8} q${w * 0.36} -8 ${w * 0.72} 0`, { fill: 'none', stroke: L.dark, strokeWidth: 4 });
    case 'Arnold': return path(`M${-w * 0.42} ${top + 18} q${w * 0.42} -12 ${w * 0.84} 0`, { fill: 'none', stroke: L.accent, strokeWidth: 12, strokeLinecap: 'round' }) +
      path(`M${w * 0.4} ${top + 16} l16 10 l-6 12 M${w * 0.4} ${top + 16} l20 -2`, { fill: 'none', stroke: L.accent, strokeWidth: 6, strokeLinecap: 'round' });
    case 'Tim': return path(`M${-w * 0.34} ${top + 10} q${w * 0.34} -30 ${w * 0.68} 0 z`, { fill: C.white, stroke: '#8a93a6', strokeWidth: SW }) +
      path(`M${-w * 0.36} ${top + 10} h${w * 0.72}`, { stroke: L.accent, strokeWidth: 7, strokeLinecap: 'round' });
    case 'Rocco': return path(`M${-w * 0.56} ${top + 14} Q0 ${top - 50} ${w * 0.56} ${top + 14} Q0 ${top} ${-w * 0.56} ${top + 14} Z`, { fill: '#1d1d22', stroke: '#000', strokeWidth: SW, strokeLinejoin: 'round' }) +
      circle(0, top - 6, 7, { fill: C.white }) + path(`M-6 ${top + 4} l12 0`, { stroke: C.white, strokeWidth: 2.5 });
    case 'Band': return path(`M${-w * 0.22} ${top + 8} q${w * 0.2} -30 ${w * 0.34} -2 q-${w * 0.12} -6 ${-w * 0.34} 2 z`, { fill: '#5a3a1a', stroke: '#2a1a08', strokeWidth: SW, strokeLinejoin: 'round' });
    case 'Butler': return path(`M${-w * 0.4} ${top + 26} q-2 -30 ${w * 0.4} -30 q${w * 0.42} 0 ${w * 0.4} 30 q-${w * 0.2} -18 ${-w * 0.3} -16 q-${w * 0.2} 2 ${-w * 0.5} 16 z`, { fill: '#2a2433', stroke: '#110e16', strokeWidth: SW, strokeLinejoin: 'round' }) +
      path(`M${-w * 0.1} ${top - 2} q${w * 0.14} 4 ${w * 0.3} 16`, { fill: 'none', stroke: '#4a4458', strokeWidth: 3, strokeLinecap: 'round' });
  }
}

function extras(id: RigId, top: number, sp: Spec, mouthY: number, cid: string): string {
  const L = RIG_LOOK[id];
  const b = top + sp.bodyH;
  switch (id) {
    case 'Reeling': return [-14, 14].map((x) => circle(x, b - 34, 4.5, { fill: L.accent, stroke: C.goldDark, strokeWidth: 1.5 })).join('') +
      path(`M-34 ${mouthY - 12} q-6 30 34 38 q40 -8 34 -38 q-10 22 -34 22 q-24 0 -34 -22 z`, { fill: '#f4f4f4', stroke: '#9aa4b5', strokeWidth: 3, strokeLinejoin: 'round' });
    case 'Alfred': return path(`M-22 ${mouthY - 10} q11 -10 22 0 q11 -10 22 0 q-11 6 -22 0 q-11 6 -22 0 z`, { fill: '#5a3a20', stroke: '#2a1a10', strokeWidth: 2 }) +
      path(`M-30 ${b - 50} q30 16 60 0 l-10 18 q-20 8 -40 0 z`, { fill: L.accent, stroke: dk(L.accent), strokeWidth: 3 });
    case 'Magnus': return path(`M-30 ${b - 30} q30 14 60 0`, { fill: 'none', stroke: '#3a5aa0', strokeWidth: 6, strokeLinecap: 'round' });
    case 'Ben': return path(`M-40 ${b - 60} h80 M-44 ${b - 40} h88 M-40 ${b - 20} h80`, { stroke: C.white, strokeWidth: 7, opacity: 0.8 });
    case 'Arnold': return path(`M-18 ${b - 46} l18 -12 l18 12 M0 ${b - 58} v30 M-10 ${b - 34} q10 10 20 0`, { fill: 'none', stroke: '#2f5aa0', strokeWidth: 3.5, strokeLinecap: 'round' });
    case 'Tim': return path(`M-30 ${b - 40} l30 18 l30 -18 v14 l-30 14 l-30 -14 z`, { fill: L.accent, stroke: dk(L.accent), strokeWidth: 3, strokeLinejoin: 'round' });
    case 'Rocco': return path(`M-50 ${b - 40} q50 22 100 0 l-4 14 q-46 20 -92 0 z`, { fill: L.accent, stroke: dk(L.accent), strokeWidth: 3 }) +
      path(`M-20 ${mouthY - 9} q20 -12 40 0`, { fill: 'none', stroke: '#1d1d22', strokeWidth: 5, strokeLinecap: 'round' });
    case 'Band': return path(`M-16 ${b - 66} l-10 -9 v18 z M16 ${b - 66} l10 -9 v18 z`, { fill: L.accent, stroke: '#000', strokeWidth: 2 }) + circle(0, b - 66, 4.5, { fill: L.accent }) +
      path(`M-36 ${b - 40} h72 M-40 ${b - 24} h80`, { stroke: C.white, strokeWidth: 6, opacity: 0.7 });
    case 'Butler': {
      const w = sp.bodyW, y0 = top + sp.bodyH * 0.56;
      // tailcoat = gradient fill of the body (no clipPath: resvg panics on clip paths outside crops),
      // white shirt front, bow tie, moustache
      void w;
      return path(`M-16 ${y0 - 2} h32 l-8 ${sp.bodyH * 0.43} h-16 z`, { fill: C.white }) +
        path(`M-24 ${y0} l10 40 M24 ${y0} l-10 40`, { stroke: '#4a4760', strokeWidth: 3 }) +
        [0, 1, 2].map((i) => circle(0, y0 + 18 + i * 16, 2.6, { fill: '#2c2a38' })).join('') +
        path(`M-16 ${y0 - 4} l-6 -10 v20 z M16 ${y0 - 4} l6 -10 v20 z`, { fill: L.accent, stroke: '#000', strokeWidth: 2, strokeLinejoin: 'round' }) + circle(0, y0 - 4, 5, { fill: L.accent }) +
        path(`M-26 ${mouthY - 8} q13 -12 26 -2 q13 -10 26 2 q-8 8 -26 2 q-18 6 -26 -2 z`, { fill: '#9a96a6', stroke: '#5e5a6a', strokeWidth: 2 });
    }
  }
}

export interface RigArm {
  /** hand centre (scene coordinates) */
  hand: [number, number];
  /** optional elbow (scene coordinates); otherwise a soft curve */
  elbow?: [number, number];
  /** hand rotation in degrees (0 = thumb up) */
  rot?: number;
  /** draw the arm behind the body */
  behind?: boolean;
}

export interface RigPose {
  mouth?: number;
  eyes?: RigEyes;
  armL?: RigArm | null;
  armR?: RigArm | null;
  /** hide legs + shoes (figure sits behind something) */
  noLegs?: boolean;
  /** draw only one layer (separate sprites): body (no arms), arms, armsBehind, armsFront, eyes, mouth (with body patch) */
  layer?: 'body' | 'arms' | 'armsBehind' | 'armsFront' | 'eyes' | 'mouth';
  /** leg swing in degrees (viewer-left, viewer-right), pivot at the hip */
  legs?: [number, number];
  /** face layout tweaks (local units at k = 1): eye size factor, eye half-distance, mouth size factor, extra mouth drop */
  face?: { eyeK?: number; gap?: number; mouthK?: number; mouthDy?: number };
}

function handShape(x: number, y: number, r: number, rot: number, fill: string, dark: string, sw: number): string {
  return g({ transform: `translate(${r2(x)} ${r2(y)}) rotate(${r2(rot)})` },
    ellipse(-r * 0.15, -r * 0.95, r * 0.36, r * 0.55, { fill, stroke: dark, strokeWidth: sw, transform: `rotate(-25 ${r2(-r * 0.15)} ${r2(-r * 0.95)})` }),
    ellipse(0, 0, r, r * 0.86, { fill, stroke: dark, strokeWidth: sw }),
    path(`M${r2(-r * 0.35)} ${r2(r * 0.25)} h${r2(r * 0.7)} M${r2(-r * 0.3)} ${r2(-r * 0.15)} h${r2(r * 0.6)}`, { stroke: dk(fill, 0.25), strokeWidth: sw * 0.5, strokeLinecap: 'round' }));
}

let rigCount = 0;

/** NPC with explicit arms; x/y feet centre in scene coordinates, k scale */
export function npcRig(id: RigId, x: number, y: number, k: number, pose: RigPose = {}): string {
  const gg = geo(id);
  const { sp, top, eyeY, shY } = gg;
  const fc = pose.face ?? {};
  const eyeDx = fc.gap ?? gg.eyeDx;
  const mouthY = gg.mouthY + (fc.mouthDy ?? 0);
  const L = RIG_LOOK[id];
  const skin = L.body;
  const cid = `rigc${id}${++rigCount}`;
  const legX = sp.bodyW * 0.18;
  const sw = pose.legs ?? [0, 0];
  const legs = pose.noLegs ? '' : [-legX, legX].map((lx, i) => g({ transform: `rotate(${r2(sw[i])} ${r2(lx)} ${r2(-sp.legH - 8)})` },
    rect(lx - 6, -sp.legH - 10, 12, sp.legH + 4, { rx: 5, fill: dk(L.body, 0.35), stroke: dk(L.body, 0.6), strokeWidth: 2.5 }),
    path(`M${lx - 14} 0 q0 -14 14 -14 q16 0 18 14 z`, { fill: sp.shoe, stroke: '#000', strokeWidth: 3, strokeLinejoin: 'round' }))).join('');
  const coat = id === 'Butler' ? `<defs><linearGradient id="${cid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0.56" stop-color="${skin}"/><stop offset="0.56" stop-color="#2c2a38"/></linearGradient></defs>` : '';
  const body = coat + path(bodyPath(sp, top), { fill: coat ? `url(#${cid})` : skin, stroke: L.dark, strokeWidth: SW * 1.1, strokeLinejoin: 'round' }) +
    path(`M${-sp.bodyW * 0.3} ${top + sp.bodyH * 0.3} q-6 ${sp.bodyH * 0.3} 6 ${sp.bodyH * 0.5}`, { fill: 'none', stroke: lt(skin, 0.35), strokeWidth: 7, strokeLinecap: 'round', opacity: 0.6 });
  const nose = ellipse(0, eyeY + 20, id === 'Rocco' ? 10 : id === 'Butler' ? 9 : 8, 7, { fill: dk(skin, 0.12), stroke: L.dark, strokeWidth: 2.5 });
  const mk = fc.mouthK ?? 1;
  const mouthSvg = g({ transform: `translate(0 ${r2(mouthY)}) scale(${r2(mk)}) translate(0 ${r2(-mouthY)})` }, mouth(pose.mouth ?? 1, mouthY));
  const local = g({}, legs, body, extras(id, top, sp, mouthY, cid), eyes(id, pose.eyes ?? 'open', eyeY, eyeDx, fc.eyeK ?? 1), nose, mouthSvg, hat(id, top, sp.bodyW));
  // arms in scene coordinates
  const thick = (id === 'Arnold' ? 20 : 13) * k;
  const handCol = id === 'Arnold' ? L.body : id === 'Butler' ? C.white : '#f2d2b8';
  const armSvg = (a: RigArm | null | undefined, side: -1 | 1) => {
    if (!a) return '';
    const sx = x + side * sp.bodyW * 0.44 * k, sy = y + shY * k;
    const [hx, hy] = a.hand;
    const d = a.elbow ? `M${r2(sx)} ${r2(sy)} Q${r2(a.elbow[0])} ${r2(a.elbow[1])} ${r2(hx)} ${r2(hy)}`
      : `M${r2(sx)} ${r2(sy)} Q${r2(sx + side * 14 * k + (hx - sx) * 0.4)} ${r2(sy + (hy - sy) * 0.8 + 6 * k)} ${r2(hx)} ${r2(hy)}`;
    const sleeve = id === 'Butler' ? '#2c2a38' : skin;
    const sleeveDark = id === 'Butler' ? '#14121c' : L.dark;
    return path(d, { fill: 'none', stroke: sleeveDark, strokeWidth: thick + SW * k, strokeLinecap: 'round' }) +
      path(d, { fill: 'none', stroke: sleeve, strokeWidth: thick - 2 * k, strokeLinecap: 'round' }) +
      handShape(hx, hy, thick * 0.85, a.rot ?? 0, handCol, id === 'Butler' ? '#8a8aa0' : L.dark, SW * 0.8 * k);
  };
  const behind = armSvg(pose.armL?.behind ? pose.armL : null, -1) + armSvg(pose.armR?.behind ? pose.armR : null, 1);
  const front = armSvg(pose.armL && !pose.armL.behind ? pose.armL : null, -1) + armSvg(pose.armR && !pose.armR.behind ? pose.armR : null, 1);
  const tr = `translate(${r2(x)} ${r2(y)}) scale(${r2(k)})`;
  switch (pose.layer) {
    case 'body': return g({ transform: tr }, local);
    case 'arms': return behind + front;
    case 'armsBehind': return behind;
    case 'armsFront': return front;
    case 'eyes': return g({ transform: tr }, eyes(id, pose.eyes ?? 'open', eyeY, eyeDx, fc.eyeK ?? 1));
    case 'mouth': return g({ transform: tr }, ellipse(0, mouthY + 6, 24 * mk, 12 * mk, { fill: skin }), mouthSvg);
    default: return behind + g({ transform: tr }, local) + front;
  }
}

/** where the face parts land in scene coordinates */
export function rigFace(id: RigId, x: number, y: number, k: number): { eye: [number, number]; mouth: [number, number]; eyeDx: number; shoulderL: [number, number]; shoulderR: [number, number]; top: number } {
  const { sp, top, eyeY, eyeDx, mouthY, shY } = geo(id);
  return {
    eye: [x, y + eyeY * k], mouth: [x, y + (mouthY + 4) * k], eyeDx: eyeDx * k,
    shoulderL: [x - sp.bodyW * 0.44 * k, y + shY * k], shoulderR: [x + sp.bodyW * 0.44 * k, y + shY * k], top: y + top * k,
  };
}

/** feet y so that the eye line lands on eye[1] at scale k → [x, y] */
export function rigAtEye(id: RigId, eye: [number, number], k: number): [number, number] {
  return [eye[0], eye[1] - geo(id).eyeY * k];
}

/** local mouthDy so that the mouth centre lands at mouthCy (scene) for a figure placed with rigAtEye */
export function rigMouthDy(id: RigId, eyeCy: number, mouthCy: number, k: number): number {
  const gg = geo(id);
  return (mouthCy - eyeCy) / k - (gg.mouthY + 4 - gg.eyeY);
}

/** feet position + scale so that eye centre and mouth centre hit the given points */
export function rigPlace(id: RigId, eye: [number, number], mouthC: [number, number]): { x: number; y: number; k: number } {
  const { eyeY, mouthY } = geo(id);
  const k = (mouthC[1] - eye[1]) / (mouthY + 4 - eyeY);
  return { x: (eye[0] + mouthC[0]) / 2, y: eye[1] - eyeY * k, k };
}
