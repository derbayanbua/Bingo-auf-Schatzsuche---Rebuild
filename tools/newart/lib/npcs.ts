// NPC kit (front view): Käpt'n Reling (CH3), Alfons (CH4), Mats (CH5), Bert (CH6), Arno (CH7),
// Tom (CH8), Rocko (CH9). Same construction as Bongo/Pucki: soft body shape with the face on it,
// short legs, tube arms, one accessory each.
//
//   npcFigure('Alfred', { mouth: 3, armR: 1 })   → SVG group, origin = feet centre (0,0), up = -y
//   npcBounds('Alfred')                          → { x, y, w, h } of the full figure
//   npcFitted('Alfred', w, h, pose)              → body fitted into a w×h canvas (portraits, members)
//   npcMouth('Alfred', n) / npcEyes(...)         → single parts at the same coordinates (talk animations)
//
// Keys are the original ids (as in JmpXxx member names); display names in NPC (topdown.ts).

import { C, circle, dk, ellipse, g, lt, path, r2, rect } from './svg';
import { NPC } from './topdown';

export type NpcId = keyof typeof NPC;

export interface NpcPose {
  /** 1 closed smile, 2 small open, 3 open, 4 wide "a", 5 round "o" */
  mouth?: number;
  eyes?: 'open' | 'closed' | 'left' | 'right' | 'up';
  /** arm raise 0 (down) .. 1 (up), viewer-left / viewer-right */
  armL?: number;
  armR?: number;
}

interface Spec {
  bodyW: number; bodyH: number; shape: 'egg' | 'pear' | 'bean' | 'barrel' | 'ball';
  legH: number; shoe: string;
  skin?: string;
  faceY: number; // eye line relative to body top (0..1)
}

const SPEC: Record<NpcId, Spec> = {
  Reeling: { bodyW: 120, bodyH: 150, shape: 'egg', legH: 26, shoe: '#222', faceY: 0.34 },
  Alfred: { bodyW: 126, bodyH: 140, shape: 'pear', legH: 22, shoe: '#333', faceY: 0.33 },
  Magnus: { bodyW: 108, bodyH: 120, shape: 'bean', legH: 22, shoe: '#5a3a20', faceY: 0.36 },
  Ben: { bodyW: 104, bodyH: 150, shape: 'egg', legH: 30, shoe: '#333', faceY: 0.32 },
  Arnold: { bodyW: 150, bodyH: 128, shape: 'barrel', legH: 22, shoe: '#333', faceY: 0.3 },
  Tim: { bodyW: 96, bodyH: 96, shape: 'ball', legH: 20, shoe: '#333', faceY: 0.4 },
  Rocco: { bodyW: 118, bodyH: 116, shape: 'ball', legH: 22, shoe: '#4a2a10', faceY: 0.38 },
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

function geometry(id: NpcId) {
  const sp = SPEC[id];
  const top = -(sp.legH + sp.bodyH - 8);
  const eyeY = top + sp.bodyH * sp.faceY;
  const eyeDx = Math.min(20, sp.bodyW * 0.16);
  const mouthY = eyeY + 38;
  return { sp, top, eyeY, eyeDx, mouthY };
}

export function npcEyes(id: NpcId, mode: NpcPose['eyes'] = 'open'): string {
  const { eyeY, eyeDx } = geometry(id);
  const L = NPC[id];
  const rx = 11.5, ry = 14;
  return [-eyeDx, eyeDx].map((x) => {
    if (mode === 'closed')
      return ellipse(x, eyeY, rx, ry, { fill: dk(L.body, 0.12), stroke: C.ink, strokeWidth: SW * 0.8 }) +
        path(`M${x - rx + 2} ${eyeY + 3} q${rx - 2} 7 ${2 * rx - 4} 0`, { fill: 'none', stroke: C.ink, strokeWidth: SW * 0.8, strokeLinecap: 'round' });
    const [dx, dy] = mode === 'left' ? [-4, 1] : mode === 'right' ? [4, 1] : mode === 'up' ? [0, -4] : [0, 1.5];
    const patch = id === 'Rocco' && x < 0;
    if (patch) return ellipse(x, eyeY, rx + 1, ry - 1, { fill: '#1d1d22' }) + path(`M${x - 30} ${eyeY - 22} L${x + 50} ${eyeY - 10}`, { stroke: '#1d1d22', strokeWidth: 3 });
    return ellipse(x, eyeY, rx, ry, { fill: C.white, stroke: C.ink, strokeWidth: SW * 0.8 }) +
      circle(x + dx, eyeY + dy, 5.2, { fill: C.ink }) + circle(x + dx + 1.6, eyeY + dy - 2, 1.8, { fill: C.white });
  }).join('');
}

export function npcMouth(id: NpcId, n = 1, patch = false): string {
  const { mouthY } = geometry(id);
  const L = NPC[id];
  const cx = 0, cy = mouthY;
  const p = patch ? ellipse(cx, cy + 4, 26, 16, { fill: L.body }) : '';
  let m = '';
  switch (Math.max(1, Math.min(5, n))) {
    case 1: m = path(`M${cx - 18} ${cy - 2} q18 16 36 0 q-18 6 -36 0 z`, { fill: C.mouth, stroke: C.ink, strokeWidth: SW * 0.8, strokeLinejoin: 'round' }); break;
    case 2: m = path(`M${cx - 16} ${cy - 3} q16 4 32 0 q-4 13 -16 13 q-12 0 -16 -13 z`, { fill: C.mouth, stroke: C.ink, strokeWidth: SW * 0.8, strokeLinejoin: 'round' }) + ellipse(cx, cy + 6, 6, 2.5, { fill: C.tongue }); break;
    case 3: m = path(`M${cx - 17} ${cy - 5} q17 4 34 0 q-3 20 -17 20 q-14 0 -17 -20 z`, { fill: C.mouth, stroke: C.ink, strokeWidth: SW * 0.8, strokeLinejoin: 'round' }) + path(`M${cx - 8} ${cy - 3.5} h16 v3.5 q-8 2 -16 0 z`, { fill: C.white }) + ellipse(cx, cy + 10, 7, 3.5, { fill: C.tongue }); break;
    case 4: m = path(`M${cx - 20} ${cy - 6} q20 2 40 0 q-2 24 -20 24 q-18 0 -20 -24 z`, { fill: C.mouth, stroke: C.ink, strokeWidth: SW * 0.8, strokeLinejoin: 'round' }) + path(`M${cx - 10} ${cy - 5} h20 v4 q-10 2 -20 0 z`, { fill: C.white }) + ellipse(cx, cy + 12, 9, 4.5, { fill: C.tongue }); break;
    case 5: m = ellipse(cx, cy + 4, 9, 11, { fill: C.mouth, stroke: C.ink, strokeWidth: SW * 0.8 }) + ellipse(cx, cy + 9, 5, 3, { fill: C.tongue }); break;
  }
  return p + m;
}

function arm(sx: number, sy: number, side: -1 | 1, raise: number, fill: string, dark: string, hand: string, thick = 13): string {
  const hx = sx + side * (22 + 10 * raise), hy = sy + 52 - 86 * raise;
  const ex = sx + side * (30 + 8 * raise), ey = sy + 22 - 30 * raise;
  const d = `M${r2(sx)} ${r2(sy)} Q${r2(ex)} ${r2(ey)} ${r2(hx)} ${r2(hy)}`;
  return path(d, { fill: 'none', stroke: dark, strokeWidth: thick + SW, strokeLinecap: 'round' }) +
    path(d, { fill: 'none', stroke: fill, strokeWidth: thick - 2, strokeLinecap: 'round' }) +
    circle(hx, hy, thick * 0.8, { fill: hand, stroke: dark, strokeWidth: SW * 0.8 });
}

function hat(id: NpcId, top: number, w: number): string {
  const L = NPC[id];
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
  }
}

function extras(id: NpcId, top: number, sp: Spec, mouthY: number): string {
  const L = NPC[id];
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
  }
}

/** complete NPC, origin = feet centre */
export function npcFigure(id: NpcId, pose: NpcPose = {}): string {
  const { sp, top, mouthY } = geometry(id);
  const L = NPC[id];
  const skin = sp.skin ?? L.body;
  const bodyW = sp.bodyW;
  const legX = bodyW * 0.18;
  const legs = [-legX, legX].map((x) => rect(x - 6, -sp.legH - 10, 12, sp.legH + 4, { rx: 5, fill: dk(L.body, 0.35), stroke: dk(L.body, 0.6), strokeWidth: 2.5 }) +
    path(`M${x - 14} 0 q0 -14 14 -14 q16 0 18 14 z`, { fill: sp.shoe, stroke: '#000', strokeWidth: 3, strokeLinejoin: 'round' })).join('');
  const shY = top + sp.bodyH * 0.55;
  const armThick = id === 'Arnold' ? 20 : 13;
  const handCol = id === 'Arnold' ? L.body : '#f2d2b8';
  const armsS = arm(-bodyW * 0.44, shY, -1, pose.armL ?? 0, skin, L.dark, handCol, armThick) + arm(bodyW * 0.44, shY, 1, pose.armR ?? 0, skin, L.dark, handCol, armThick);
  const body = path(bodyPath(sp, top), { fill: skin, stroke: L.dark, strokeWidth: SW * 1.1, strokeLinejoin: 'round' }) +
    path(`M${-bodyW * 0.3} ${top + sp.bodyH * 0.3} q-6 ${sp.bodyH * 0.3} 6 ${sp.bodyH * 0.5}`, { fill: 'none', stroke: lt(skin, 0.35), strokeWidth: 7, strokeLinecap: 'round', opacity: 0.6 });
  const nose = ellipse(0, geometry(id).eyeY + 20, id === 'Rocco' ? 10 : 8, 7, { fill: dk(skin, 0.12), stroke: L.dark, strokeWidth: 2.5 });
  return legs + body + armsS + extras(id, top, sp, mouthY) + npcEyes(id, pose.eyes ?? 'open') + nose + npcMouth(id, pose.mouth ?? 1) + hat(id, top, bodyW);
}

export function npcBounds(id: NpcId): { x: number; y: number; w: number; h: number } {
  const { sp, top } = geometry(id);
  const extraTop = id === 'Alfred' ? 46 : id === 'Rocco' ? 34 : 24;
  const wide = sp.bodyW + 90;
  return { x: -wide / 2, y: top - extraTop, w: wide, h: -top + extraTop + 2 };
}

/** NPC fitted into w×h (bottom-centred), as SVG body */
export function npcFitted(id: NpcId, w: number, h: number, pose: NpcPose = {}): string {
  const b = npcBounds(id);
  const k = Math.min(w / b.w, h / b.h);
  return g({ transform: `translate(${r2(w / 2)} ${r2(h - (h - b.h * k) / 2 + 0)}) scale(${r2(k)}) translate(0 ${r2(-(b.y + b.h))})` }, npcFigure(id, pose));
}
