// Top-down board figures (Shared_Graphic-2 JmpXxx-1..20) for all 9 characters.
//
// The runtime (boardOrig.ts) rotates the sprite around its registration point ((dir-1)*90°, facing up
// = direction 1) and swaps the member every frame of a hop: 1 = standing, 2 = crouch, 3..17 airborne
// (the figure comes closer to the camera → bigger, shadow drifts away), 18..19 landing squash, 20 settle.
// Every figure is drawn in "unit" coordinates centred on the pivot, facing up (-y).

import { C, circle, dk, ellipse, g, lt, path, r2, rect, svgDoc } from './svg';

export type JmpId = 'Bingo' | 'Puck' | 'Reeling' | 'Alfred' | 'Magnus' | 'Ben' | 'Arnold' | 'Tim' | 'Rocco';

/** NPC looks (replacement characters of the approved character sheet) */
export const NPC = {
  Reeling: { name: "Käpt'n Reling", role: 'Kapitän', body: '#2e4c8a', dark: '#16264a', accent: C.gold },
  Alfred: { name: 'Alfons', role: 'Schiffskoch', body: '#f4f4f4', dark: '#8f8a9e', accent: C.red },
  Magnus: { name: 'Mats', role: 'Steuermann', body: '#8fcf6b', dark: '#3d7d22', accent: '#e8483f' },
  Ben: { name: 'Bert', role: 'Ausguck', body: '#e88fb4', dark: '#a2346a', accent: '#c9a03a' },
  Arnold: { name: 'Arno', role: 'Kraftprotz', body: '#e8964a', dark: '#8a4a12', accent: '#d63a2f' },
  Tim: { name: 'Tom', role: 'Matrose', body: '#58b7c9', dark: '#1d6f82', accent: '#2f6fd8' },
  Rocco: { name: 'Rocko', role: 'Pirat', body: '#5b5f6b', dark: '#2a2c33', accent: '#c0392b' },
} as const;

interface FrameState {
  /** height above ground 0..1 */
  hgt: number;
  /** squash 0..1 (crouch / landing) */
  sq: number;
  /** arm swing 0 (down) .. 1 (forward/up) */
  arm: number;
}

export function jumpState(f: number): FrameState {
  const hgt = f >= 3 && f <= 17 ? Math.sin((Math.PI * (f - 2)) / 16) : 0;
  const sq = f === 2 ? 1 : f === 18 ? 1 : f === 19 ? 0.6 : f === 20 ? 0.2 : 0;
  const arm = f === 2 ? 0.2 : f >= 3 && f <= 17 ? Math.min(1, 0.4 + hgt) : f === 18 ? 0.3 : 0;
  return { hgt, sq, arm };
}

const SW = 2.4; // outline width in unit coordinates

function arms(span: number, y: number, a: number, fill: string, dark: string, hand: string, handR = 5, thick = 6): string {
  // shoulders at (±span*0.55, y); hands move from the sides (down) to the front (up) with a
  const out: string[] = [];
  for (const s of [-1, 1]) {
    const sx = s * span * 0.5, sy = y;
    const hx = s * (span - 4 * a), hy = y + 4 - 16 * a;
    const d = `M${r2(sx)} ${r2(sy)} Q${r2(s * span * 0.9)} ${r2(sy + 2 - 6 * a)} ${r2(hx)} ${r2(hy)}`;
    out.push(path(d, { fill: 'none', stroke: dark, strokeWidth: thick + SW * 1.2, strokeLinecap: 'round' }));
    out.push(path(d, { fill: 'none', stroke: fill, strokeWidth: thick - SW * 0.4, strokeLinecap: 'round' }));
    out.push(circle(hx, hy, handR, { fill: hand, stroke: dark, strokeWidth: SW }));
  }
  return out.join('');
}

function feet(dx: number, y: number, rx: number, ry: number, fill: string, dark: string, a: number): string {
  // feet trail behind (+y) and tuck in while airborne
  const yy = y + 2 * a;
  return [-1, 1].map((s) => ellipse(s * dx, yy, rx, ry, { fill, stroke: dark, strokeWidth: SW })).join('');
}

function eyesTop(dx: number, y: number, r: number, iris: string): string {
  return [-1, 1].map((s) => ellipse(s * dx, y, r, r * 0.8, { fill: C.white, stroke: C.ink, strokeWidth: SW * 0.8 }) +
    circle(s * dx, y - r * 0.35, r * 0.48, { fill: iris })).join('');
}

/** figure in unit coordinates (facing up) */
function figure(id: JmpId, st: FrameState): { body: string; box: [number, number] } {
  const a = st.arm;
  switch (id) {
    case 'Bingo': {
      const body = [
        feet(10, 18, 7, 6, C.boot, C.bootDark, a),
        arms(44, 2, a, C.orange, C.orangeDark, C.orange, 5.5),
        path('M-21 -17 h42 q6 0 6 6 v26 q0 6 -6 6 h-42 q-6 0 -6 -6 v-26 q0 -6 6 -6 z', { fill: C.orange, stroke: C.orangeDark, strokeWidth: SW }),
        path('M-19 -14 h38 q4 0 4 4 v20 q0 4 -4 4 h-38 q-4 0 -4 -4 v-20 q0 -4 4 -4 z', { fill: C.bandana, stroke: C.bandanaDark, strokeWidth: SW * 0.8 }),
        ...[[-12, -6], [0, -9], [12, -5], [-6, 4], [7, 5], [-15, 6], [15, 8]].map(([x, y]) => circle(x, y, 2, { fill: C.white })),
        path('M21 6 l11 3 l-2 7 z M21 6 l10 -4 l1 8 z', { fill: C.bandana, stroke: C.bandanaDark, strokeWidth: SW * 0.8, strokeLinejoin: 'round' }),
        circle(22, 6, 3, { fill: C.bandana, stroke: C.bandanaDark, strokeWidth: SW * 0.8 }),
        eyesTop(7, -18, 4.5, C.eyeBlue),
      ].join('');
      return { body, box: [96, 46] };
    }
    case 'Puck': {
      const body = [
        feet(9, 17, 7, 5.5, C.shoe, C.shoeDark, a),
        arms(30, 4, a, C.mint, C.mintDark, C.mint, 5, 5.5),
        circle(0, 0, 21, { fill: C.mint, stroke: C.mintDark, strokeWidth: SW }),
        path('M-12 -8 q4 -9 14 -10', { fill: 'none', stroke: C.mintLight, strokeWidth: 4, strokeLinecap: 'round' }),
        path('M0 2 q-6 -8 2 -11 q8 -2 7 6 q-1 5 -6 4 q-4 -1 -2 -4', { fill: 'none', stroke: C.mintDark, strokeWidth: 3.2, strokeLinecap: 'round' }),
        eyesTop(7, -18, 4.6, C.ink),
      ].join('');
      return { body, box: [70, 62] };
    }
    case 'Reeling': {
      const L = NPC.Reeling;
      const body = [
        feet(10, 22, 7, 6, '#222', '#000', a),
        arms(36, 6, a, L.body, L.dark, '#f2d2b8', 5.5, 7),
        circle(0, 4, 24, { fill: L.body, stroke: L.dark, strokeWidth: SW }),
        ...[-6, 6].map((x) => circle(x, 20, 2, { fill: L.accent })),
        // captain's cap from above: white crown, navy band, brim + gold badge at the front
        path('M-15 -16 q15 -12 30 0 l2 6 h-34 z', { fill: '#1b2d55', stroke: '#0d1830', strokeWidth: SW }),
        circle(0, -2, 15, { fill: C.white, stroke: '#9aa4b5', strokeWidth: SW }),
        circle(0, -2, 9, { fill: '#eef1f6' }),
        path('M-4 -14 l4 -4 l4 4 l-4 4 z', { fill: L.accent, stroke: C.goldDark, strokeWidth: 1 }),
      ].join('');
      return { body, box: [80, 74] };
    }
    case 'Alfred': {
      const L = NPC.Alfred;
      const body = [
        feet(9, 22, 6.5, 5.5, '#333', '#111', a),
        arms(32, 8, a, L.body, L.dark, '#f2d2b8', 5, 7),
        circle(0, 6, 22, { fill: L.body, stroke: L.dark, strokeWidth: SW }),
        path('M-10 -12 q10 6 20 0', { fill: 'none', stroke: L.accent, strokeWidth: 5, strokeLinecap: 'round' }),
        // puffy chef toque
        path('M-14 -2 q-8 -10 2 -16 q4 -10 12 -6 q8 -6 12 4 q10 6 2 18 q-14 6 -28 0 z', { fill: C.white, stroke: '#a8a2b8', strokeWidth: SW }),
        path('M-6 -10 q6 -4 12 0 M-2 -2 q5 -3 10 0', { fill: 'none', stroke: '#d8d4e2', strokeWidth: 2, strokeLinecap: 'round' }),
      ].join('');
      return { body, box: [66, 76] };
    }
    case 'Magnus': {
      const L = NPC.Magnus;
      const body = [
        feet(8, 19, 6, 5, '#5a3a20', '#2a1a10', a),
        arms(29, 4, a, L.body, L.dark, '#f2d2b8', 4.5, 6),
        circle(0, 2, 19, { fill: L.body, stroke: L.dark, strokeWidth: SW }),
        // knitted cap with stripes + pompom
        circle(0, -2, 13, { fill: L.accent, stroke: dk(L.accent), strokeWidth: SW }),
        path('M-12 -6 h24 M-13 0 h26', { fill: 'none', stroke: C.white, strokeWidth: 3 }),
        circle(0, -3, 4.5, { fill: C.white, stroke: '#bbb', strokeWidth: 1.2 }),
        eyesTop(6, -16, 3.6, C.ink),
      ].join('');
      return { body, box: [62, 54] };
    }
    case 'Ben': {
      const L = NPC.Ben;
      const body = [
        feet(9, 19, 6, 5, '#333', '#111', a),
        arms(31, 2, Math.max(a, 0.5), L.body, L.dark, '#f2d2b8', 5, 6),
        circle(0, 3, 21, { fill: L.body, stroke: L.dark, strokeWidth: SW }),
        // spyglass held in front
        rect(-3.5, -34 + 6 * (1 - a), 7, 22, { rx: 2, fill: L.accent, stroke: dk(L.accent), strokeWidth: SW * 0.8 }),
        rect(-5, -36 + 6 * (1 - a), 10, 5, { rx: 1.5, fill: '#e3c45a', stroke: dk(L.accent), strokeWidth: SW * 0.8 }),
        // striped bandana
        circle(0, 0, 11, { fill: C.white, stroke: L.dark, strokeWidth: SW * 0.8 }),
        path('M-10 -4 h20 M-11 2 h22', { fill: 'none', stroke: L.dark, strokeWidth: 2.2 }),
        eyesTop(7, -16, 4, C.ink),
      ].join('');
      return { body, box: [76, 62] };
    }
    case 'Arnold': {
      const L = NPC.Arnold;
      const body = [
        feet(10, 20, 7, 6, '#333', '#111', a),
        arms(34, 4, a, L.body, L.dark, L.body, 7, 9),
        ellipse(0, 3, 27, 19, { fill: L.body, stroke: L.dark, strokeWidth: SW }),
        circle(0, -2, 12, { fill: lt(L.body, 0.1), stroke: L.dark, strokeWidth: SW }),
        path('M-12 -4 q12 -6 24 0', { fill: 'none', stroke: L.accent, strokeWidth: 4.5, strokeLinecap: 'round' }),
        path('M11 -4 l6 3 l-1 5', { fill: 'none', stroke: L.accent, strokeWidth: 3, strokeLinecap: 'round' }),
        eyesTop(5, -13, 3.4, C.ink),
      ].join('');
      return { body, box: [72, 58] };
    }
    case 'Tim': {
      const L = NPC.Tim;
      const body = [
        feet(7, 15, 5, 4.5, '#333', '#111', a),
        arms(23, 3, a, L.body, L.dark, '#f2d2b8', 4, 5),
        circle(0, 2, 15, { fill: L.body, stroke: L.dark, strokeWidth: SW }),
        path('M-9 10 l9 6 l9 -6', { fill: 'none', stroke: C.white, strokeWidth: 2.5 }),
        // sailor cap (white ring + crown, blue band)
        circle(0, -1, 10, { fill: C.white, stroke: '#9aa4b5', strokeWidth: SW }),
        circle(0, -1, 6, { fill: '#eef1f6', stroke: L.accent, strokeWidth: 2 }),
        eyesTop(5, -12, 3.2, C.ink),
      ].join('');
      return { body, box: [50, 42] };
    }
    case 'Rocco': {
      const L = NPC.Rocco;
      const body = [
        feet(9, 19, 6.5, 5.5, '#4a2a10', '#2a1a10', a),
        arms(36, 4, a, L.body, L.dark, '#d9b48f', 5.5, 7),
        circle(0, 3, 21, { fill: L.body, stroke: L.dark, strokeWidth: SW }),
        path('M-21 8 q21 10 42 0', { fill: 'none', stroke: L.accent, strokeWidth: 5 }),
        // tricorn from above
        path('M0 -20 L20 8 Q0 2 -20 8 Z', { fill: '#1d1d22', stroke: '#000', strokeWidth: SW, strokeLinejoin: 'round' }),
        circle(0, -2, 3.2, { fill: C.white }),
        path('M-2 2 l4 0', { stroke: C.white, strokeWidth: 1.5 }),
      ].join('');
      return { body, box: [80, 58] };
    }
  }
}

/**
 * Art for member JmpXxx-f at canvas w×h with registration point (regX, regY).
 * baseBox = canvas size of frame 1 (keeps the figure size consistent over the 20 frames).
 */
export function jumpMember(id: JmpId, f: number, w: number, h: number, regX: number, regY: number, frame1: { w: number; h: number }): string {
  const st = jumpState(f);
  const { body, box } = figure(id, st);
  // size from frame 1, then grow with the height of the hop, clamp into this canvas around the pivot
  const base = Math.min((frame1.w - 4) / box[0], (frame1.h - 4) / box[1]);
  let k = base * (1 + 0.24 * st.hgt);
  const sx = 1 + 0.1 * st.sq, sy = 1 - 0.12 * st.sq;
  const halfW = (box[0] / 2) * sx, halfH = (box[1] / 2) * sy;
  const fit = Math.min(regX / halfW, (w - regX) / halfW, regY / halfH, (h - regY) / halfH) * 0.98;
  k = Math.min(k, Math.max(fit, base * 0.75));
  // shadow: drifts down/right and shrinks with the height
  const shOff = 3 + 10 * st.hgt;
  const sh = ellipse(shOff * 0.6, shOff, (box[0] / 2.4) * (1 - 0.25 * st.hgt), (box[1] / 2.6) * (1 - 0.25 * st.hgt), { fill: '#000', opacity: 0.22 - 0.08 * st.hgt });
  return svgDoc(w, h, g({ transform: `translate(${regX} ${regY}) scale(${r2(k * sx)} ${r2(k * sy)})` }, sh, body));
}
