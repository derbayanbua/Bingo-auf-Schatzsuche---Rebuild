// CHARACTER KIT – Bongo (replaces "Bingo") and Pucki (replaces "Puck"), front view.
//
// Geometry is defined once at 100 % in Director "loc" coordinates: (0,0) = registration point of the
// original body member (Bingo100 / Puck100). All part members of the original share the body's loc,
// so every part below is drawn in the same coordinate system and simply cropped by its own canvas
// (w×h at -regX/-regY). That keeps the existing part animations (eyes, lids, mouth, arms, shoes, hair)
// working with the original registration points at every scale (10/25/50/75/90/100).
//
// Layer order in the original scores: Bongo body < eyes < lid < mouth < ArmLinks < ArmRechts < Schuh,
// Pucki ArmLinks (behind!) < body < eyes < lid < mouth < Haare < Schuh. With parts present (25..100) the
// body therefore omits the animated limbs (arms, boots / shoes, curl) – `full: true` draws a complete
// figure (members Bingo10 / Puck10, portraits, other scenes).

import { C, circle, ellipse, g, path, r2, rect, svgDoc } from './svg';

export type Who = 'Bongo' | 'Pucki';

export interface Pose {
  /** pupils: Bongo 1..2, Pucki 1..4 (1 = straight) */
  eyes?: number;
  /** eyes closed (blink lid) */
  lid?: boolean;
  /** mouth 1..3 (1 = closed smile) */
  mouth?: number;
  /** viewer-right arm (member ArmLinks) frame 1..6 (Pucki 1..4) */
  armL?: number;
  /** viewer-left arm (member ArmRechts) frame 1..6 – Bongo only */
  armR?: number;
  /** shoe tapping frame 1..4 */
  shoe?: number;
  /** Pucki curl frame 1..6 */
  hair?: number;
}

/** outline width at 100 % (scaled with the figure, but never thinner than ~1.1 px on screen) */
function swFor(k: number, base = 4): number {
  return Math.max(1.15, base * k) / k;
}

// =================================================================== Bongo (orange block)

const B = {
  block: { x: -54, y: -110, w: 110, h: 176, rx: 26 },
  eyeL: [-5, -58] as const, eyeR: [22, -58] as const, eyeRx: 13.5, eyeRy: 17,
  iris: 7, pupilY: -53,
  nose: [9, -30] as const,
  mouth: [10.5, 6] as const,
  shoulderR: [-50, 0] as const, // viewer-left arm (ArmRechts)
  shoulderL: [52, -4] as const, // viewer-right arm (ArmLinks)
  legs: [-32, 0] as const,
  boots: [-30, 2] as const,
};

function bongoBlock(sw: number): string {
  const b = B.block;
  return [
    rect(b.x, b.y, b.w, b.h, { rx: b.rx, fill: C.orange, stroke: C.orangeDark, strokeWidth: sw * 1.25 }),
    // soft highlight + bottom shade (kept away from the eye / mouth part zones)
    path(`M${b.x + 9} ${b.y + 40} v110 q0 10 8 12`, { fill: 'none', stroke: C.orangeLight, strokeWidth: sw * 2.2, strokeLinecap: 'round', opacity: 0.7 }),
    path(`M${b.x + 14} ${b.y + b.h - 10} q41 10 82 0`, { fill: 'none', stroke: C.orangeDark, strokeWidth: sw * 1.4, strokeLinecap: 'round', opacity: 0.25 }),
  ].join('');
}

function bongoBandana(sw: number): string {
  const b = B.block;
  const top = b.y, l = b.x, r = b.x + b.w;
  const band = `M${l - 1} ${top + 34} v-8 q0 ${-b.rx - 1} ${b.rx + 1} ${-b.rx - 1} h${b.w - 2 * b.rx} q${b.rx + 1} 0 ${b.rx + 1} ${b.rx + 1} v8 q-${b.w / 2} 10 -${b.w + 2} 0 z`;
  const dots: [number, number, number][] = [[-36, -96, 4.5], [-12, -101, 4.5], [14, -98, 4.5], [38, -100, 4.5], [-24, -86, 3.5], [2, -87, 3.5], [28, -86, 3.5], [48, -88, 3]];
  return [
    path(band, { fill: C.bandana, stroke: C.bandanaDark, strokeWidth: sw }),
    ...dots.map(([x, y, rr]) => circle(x, y, rr, { fill: C.white })),
    // knot + tails on the viewer-right side
    path(`M${r - 4} ${top + 16} l22 -14 l-3 16 l15 4 l-20 10 z`, { fill: C.bandana, stroke: C.bandanaDark, strokeWidth: sw, strokeLinejoin: 'round' }),
    path(`M${r - 2} ${top + 20} l20 6 l-6 12 l-14 -6 z`, { fill: C.bandana, stroke: C.bandanaDark, strokeWidth: sw, strokeLinejoin: 'round' }),
    circle(r + 1, top + 19, 6.5, { fill: C.bandana, stroke: C.bandanaDark, strokeWidth: sw }),
    circle(r + 13, top + 7, 2.2, { fill: C.white }), circle(r + 10, top + 30, 2.2, { fill: C.white }),
  ].join('');
}

function bongoEyeWhites(sw: number): string {
  return [B.eyeL, B.eyeR].map(([x, y]) => ellipse(x, y, B.eyeRx, B.eyeRy, { fill: C.white, stroke: C.ink, strokeWidth: sw })).join('');
}

function bongoPupils(n: number): string {
  const dx = n === 2 ? -4 : 1; // 1 = straight / slightly right, 2 = looking to the viewer's left
  return [B.eyeL[0], B.eyeR[0]].map((x) => {
    const cx = x + dx;
    return circle(cx, B.pupilY, B.iris, { fill: C.eyeBlue }) + circle(cx, B.pupilY, 3.4, { fill: C.ink }) + circle(cx + 2.2, B.pupilY - 2.6, 2, { fill: C.white });
  }).join('');
}

/** eyes member: eye whites (redrawn identically to the body) + pupils */
export function bongoEyes(n: number, sw: number): string {
  return bongoEyeWhites(sw) + bongoPupils(n);
}

export function bongoLid(sw: number): string {
  return [B.eyeL, B.eyeR].map(([x, y]) =>
    ellipse(x, y, B.eyeRx, B.eyeRy, { fill: '#f0843a', stroke: C.ink, strokeWidth: sw }) +
    path(`M${x - B.eyeRx + 2} ${y + 3} q${B.eyeRx - 2} 8 ${2 * B.eyeRx - 4} 0`, { fill: 'none', stroke: C.ink, strokeWidth: sw, strokeLinecap: 'round' })).join('');
}

function bongoNose(sw: number): string {
  return ellipse(B.nose[0], B.nose[1], 11, 9, { fill: C.nose, stroke: C.orangeDark, strokeWidth: sw * 0.8 }) + ellipse(B.nose[0] - 3, B.nose[1] - 3, 3.5, 2.5, { fill: C.white, opacity: 0.6 });
}

/** mouth member 1..3 (with a body-coloured patch that hides the default mouth of the body) */
export function bongoMouth(n: number, sw: number, patch = true): string {
  const [cx, cy] = B.mouth;
  const p = patch ? rect(cx - 30, cy - 15, 60, 34, { rx: 12, fill: C.orange }) : '';
  let m = '';
  if (n <= 1) {
    m = path(`M${cx - 22} ${cy - 3} q22 22 44 0 q-22 8 -44 0 z`, { fill: C.mouth, stroke: C.ink, strokeWidth: sw, strokeLinejoin: 'round' }) +
      path(`M${cx - 8} ${cy + 0.5} h16 v3.5 q-8 2.5 -16 0 z`, { fill: C.white });
  } else if (n === 2) {
    m = path(`M${cx - 21} ${cy - 5} q21 6 42 0 q-6 22 -21 22 q-15 0 -21 -22 z`, { fill: C.mouth, stroke: C.ink, strokeWidth: sw, strokeLinejoin: 'round' }) +
      path(`M${cx - 9} ${cy - 2.5} h18 v4 q-9 2 -18 0 z`, { fill: C.white }) +
      ellipse(cx, cy + 12, 8, 4, { fill: C.tongue });
  } else {
    m = path(`M${cx - 17} ${cy - 8} q17 -4 34 0 q4 14 -3 22 q-14 9 -28 0 q-7 -8 -3 -22 z`, { fill: C.mouth, stroke: C.ink, strokeWidth: sw, strokeLinejoin: 'round' }) +
      path(`M${cx - 9} ${cy - 7} h18 v4.5 q-9 2 -18 0 z`, { fill: C.white }) +
      ellipse(cx, cy + 11, 9, 5, { fill: C.tongue });
  }
  return p + m;
}

/** arm tube + round hand */
function arm(sx: number, sy: number, ex: number, ey: number, hx: number, hy: number, sw: number, fill: string, dark: string, hand = 9.5): string {
  const d = `M${r2(sx)} ${r2(sy)} Q${r2(ex)} ${r2(ey)} ${r2(hx)} ${r2(hy)}`;
  return path(d, { fill: 'none', stroke: dark, strokeWidth: 9 + sw * 1.4, strokeLinecap: 'round' }) +
    path(d, { fill: 'none', stroke: fill, strokeWidth: 9 - sw * 0.6, strokeLinecap: 'round' }) +
    circle(hx, hy, hand, { fill, stroke: dark, strokeWidth: sw }) +
    path(`M${r2(hx - hand * 0.55)} ${r2(hy - hand * 0.15)} q${r2(hand * 0.3)} ${r2(-hand * 0.5)} ${r2(hand * 0.7)} ${r2(-hand * 0.45)}`, { fill: 'none', stroke: '#ffffff', strokeWidth: sw * 0.7, strokeLinecap: 'round', opacity: 0.55 });
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** viewer-left arm = member ArmRechts-1..6 (1 hanging … 6 raised / waving) */
export function bongoArmR(f: number, sw: number): string {
  const t = (Math.max(1, Math.min(6, f)) - 1) / 5;
  const [sx, sy] = B.shoulderR;
  const hx = lerp(-63, -69, t), hy = lerp(54, -13, t);
  const ex = lerp(-70, -82, t), ey = lerp(26, 26, t);
  return arm(sx, sy, ex, ey, hx, hy, sw, C.orange, C.orangeDark);
}

/** viewer-right arm = member ArmLinks-1..6 */
export function bongoArmL(f: number, sw: number): string {
  const t = (Math.max(1, Math.min(6, f)) - 1) / 5;
  const [sx, sy] = B.shoulderL;
  const hx = lerp(64, 73, t), hy = lerp(31, -17, t);
  const ex = lerp(70, 82, t), ey = lerp(12, 14, t);
  return arm(sx, sy, ex, ey, hx, hy, sw, C.orange, C.orangeDark, 8.5);
}

function bongoLegs(sw: number): string {
  return B.legs.map((x) => rect(x - 5.5, 58, 11, 40, { rx: 4, fill: C.leg, stroke: C.bootDark, strokeWidth: sw * 0.7 })).join('');
}

function boot(cx: number, sw: number, tilt = 0): string {
  // shaft + foot with rounded toe to the right
  const d = `M${cx - 12} 117 v-17 q0 -14 8 -14 h6 q6 0 6 8 v6 h2 q9 0 10 10 v7 z`;
  const body = path(d, { fill: C.boot, stroke: C.bootDark, strokeWidth: sw, strokeLinejoin: 'round' }) +
    path(`M${cx - 12} 112 h32`, { fill: 'none', stroke: C.bootDark, strokeWidth: sw * 0.9 }) +
    path(`M${cx - 9} 92 h10`, { fill: 'none', stroke: '#c58a50', strokeWidth: sw * 0.9, strokeLinecap: 'round' });
  return tilt ? g({ transform: `rotate(${r2(tilt)} ${cx - 12} 117)` }, body) : body;
}

/** boots member Schuh-1..4 (front boot taps) */
export function bongoBoots(f: number, sw: number): string {
  const tilt = [0, 0, -7, -13, -18][Math.max(1, Math.min(4, f))];
  return boot(B.boots[0], sw) + boot(B.boots[1], sw, tilt);
}

/** complete Bongo (or the body member without animated limbs) */
export function bongo(k = 1, pose: Pose & { full?: boolean } = {}): string {
  const sw = swFor(k);
  const full = pose.full ?? true;
  const out: string[] = [];
  out.push(bongoLegs(sw));
  out.push(bongoBlock(sw), bongoBandana(sw), bongoEyes(pose.eyes ?? 1, sw), bongoNose(sw), bongoMouth(pose.mouth ?? 1, sw, false));
  if (pose.lid) out.push(bongoLid(sw));
  if (full) out.push(bongoArmL(pose.armL ?? 1, sw), bongoArmR(pose.armR ?? 1, sw), bongoBoots(pose.shoe ?? 1, sw));
  return out.join('');
}

// =================================================================== Pucki (mint ball)

const P = {
  c: [35, 16] as const, r: 50,
  eyeL: [40, -4] as const, eyeR: [63, -4] as const, eyeRx: 10.5, eyeRy: 13,
  nose: [53, 13] as const,
  mouth: [50, 33] as const,
  curl: [33, -33] as const,
  legs: [4, 27] as const,
  shoes: [3, 28] as const,
};

function puckiBall(sw: number): string {
  const [cx, cy] = P.c;
  return [
    circle(cx, cy, P.r, { fill: C.mint, stroke: C.mintDark, strokeWidth: sw * 1.1 }),
    path(`M${cx - 38} ${cy - 6} q4 -30 30 -38`, { fill: 'none', stroke: C.mintLight, strokeWidth: sw * 2.4, strokeLinecap: 'round', opacity: 0.8 }),
    path(`M${cx - 30} ${cy + 36} q28 18 58 2`, { fill: 'none', stroke: C.mintDark, strokeWidth: sw * 1.3, strokeLinecap: 'round', opacity: 0.25 }),
  ].join('');
}

function puckiFreckles(): string {
  const f: [number, number, number][] = [[27, 12, 2.6], [22, 7, 2.2], [31, 6, 2.1], [72, 11, 2.6], [77, 5, 2.1], [68, 5, 2]];
  return f.map(([x, y, rr]) => circle(x, y, rr, { fill: C.freckle })).join('');
}

function puckiEyeWhites(sw: number): string {
  return [P.eyeL, P.eyeR].map(([x, y]) => ellipse(x, y, P.eyeRx, P.eyeRy, { fill: C.white, stroke: C.ink, strokeWidth: sw })).join('');
}

/** pupils 1..4: straight, left, right, up */
function puckiPupils(n: number): string {
  const [dx, dy] = ([[1, 1], [-3.5, 1], [4, 1], [0.5, -4]] as const)[Math.max(1, Math.min(4, n)) - 1];
  return [P.eyeL[0], P.eyeR[0]].map((x) => {
    const cx = x + dx, cy = P.eyeL[1] + dy;
    return circle(cx, cy, 5.6, { fill: C.ink }) + circle(cx + 1.6, cy - 2, 1.9, { fill: C.white });
  }).join('');
}

export function puckiEyes(n: number, sw: number): string {
  return puckiEyeWhites(sw) + puckiPupils(n);
}

export function puckiLid(sw: number): string {
  return [P.eyeL, P.eyeR].map(([x, y]) =>
    ellipse(x, y, P.eyeRx, P.eyeRy, { fill: '#6cc794', stroke: C.ink, strokeWidth: sw }) +
    path(`M${x - P.eyeRx + 2} ${y + 3} q${P.eyeRx - 2} 6 ${2 * P.eyeRx - 4} 0`, { fill: 'none', stroke: C.ink, strokeWidth: sw, strokeLinecap: 'round' })).join('');
}

function puckiNose(sw: number): string {
  return ellipse(P.nose[0], P.nose[1], 7, 6, { fill: C.puckNose, stroke: '#b5741a', strokeWidth: sw * 0.6 }) + ellipse(P.nose[0] - 2, P.nose[1] - 2, 2.2, 1.6, { fill: C.white, opacity: 0.6 });
}

export function puckiMouth(n: number, sw: number, patch = true): string {
  const [cx, cy] = P.mouth;
  const p = patch ? ellipse(cx, cy + 3, 22, 13, { fill: C.mint }) : '';
  let m = '';
  if (n <= 1) {
    m = path(`M${cx - 17} ${cy - 3} q17 17 34 0 q-17 6 -34 0 z`, { fill: C.mouth, stroke: C.ink, strokeWidth: sw, strokeLinejoin: 'round' }) +
      path(`M${cx - 6} ${cy - 0.5} h12 v3 q-6 2 -12 0 z`, { fill: C.white });
  } else if (n === 2) {
    m = path(`M${cx - 16} ${cy - 5} q16 5 32 0 q-4 17 -16 17 q-12 0 -16 -17 z`, { fill: C.mouth, stroke: C.ink, strokeWidth: sw, strokeLinejoin: 'round' }) +
      path(`M${cx - 7} ${cy - 3} h14 v3.5 q-7 2 -14 0 z`, { fill: C.white }) + ellipse(cx, cy + 8, 6, 3, { fill: C.tongue });
  } else {
    m = ellipse(cx, cy + 2, 12, 11, { fill: C.mouth, stroke: C.ink, strokeWidth: sw }) +
      path(`M${cx - 6.5} ${cy - 7} h13 v3 q-6.5 2 -13 0 z`, { fill: C.white }) + ellipse(cx, cy + 8, 6.5, 3.5, { fill: C.tongue });
  }
  return p + m;
}

/** curl on top, frame 1..6 (springs up a little) */
export function puckiCurl(f: number, sw: number): string {
  const t = (Math.max(1, Math.min(6, f)) - 1) / 5;
  const s = 1.02 + 0.14 * t, rot = -6 + 12 * t;
  const d = 'M0 4 q-2 -16 10 -19 q11 -1 10 10 q-1 7 -8 6 q-6 -1 -4 -6';
  const [x, y] = P.curl;
  return g({ transform: `translate(${x} ${y}) rotate(${r2(rot)}) scale(${r2(s)})` },
    path(d, { fill: 'none', stroke: C.mintDark, strokeWidth: (sw * 1.1 + 5) / s, strokeLinecap: 'round', strokeLinejoin: 'round' }),
    path(d, { fill: 'none', stroke: C.mint, strokeWidth: (5 - sw * 0.5) / s, strokeLinecap: 'round', strokeLinejoin: 'round' }));
}

/** curl stub inside the body member (hidden under the Haare member, avoids a gap at the base) */
function puckiCurlStub(sw: number): string {
  const [x, y] = P.curl;
  return path(`M${x} ${y + 4} v-9`, { fill: 'none', stroke: C.mintDark, strokeWidth: sw * 1.1 + 5, strokeLinecap: 'round' }) +
    path(`M${x} ${y + 4} v-9`, { fill: 'none', stroke: C.mint, strokeWidth: 5 - sw * 0.5, strokeLinecap: 'round' });
}

/** viewer-left arm (inside the body member, resting) */
function puckiArmBody(sw: number): string {
  return arm(-2, 30, -20, 34, -24, 50, sw, C.mint, C.mintDark, 8.5);
}

/** viewer-right arm = member ArmLinks-1..4 (drawn behind the ball) */
export function puckiArmL(f: number, sw: number): string {
  const t = (Math.max(1, Math.min(4, f)) - 1) / 3;
  return arm(70, 20, lerp(92, 100, t), lerp(26, 24, t), lerp(88, 97, t), lerp(48, 3, t), sw, C.mint, C.mintDark, 8);
}

function puckiLegs(sw: number): string {
  return P.legs.map((x) => rect(x - 5, 56, 10, 38, { rx: 4, fill: C.mintDark, stroke: '#123f35', strokeWidth: sw * 0.6 })).join('');
}

function sneaker(cx: number, sw: number, tilt = 0): string {
  const d = `M${cx - 11} 113 q0 -15 11 -16 q7 -1 8 5 q9 1 10 11 z`;
  const body = path(d, { fill: C.shoe, stroke: C.shoeDark, strokeWidth: sw, strokeLinejoin: 'round' }) +
    path(`M${cx - 11} 113 h29`, { fill: 'none', stroke: C.white, strokeWidth: sw * 1.4, strokeLinecap: 'round' }) +
    path(`M${cx - 4} 102 l4 7 M${cx + 2} 101 l4 8`, { fill: 'none', stroke: C.white, strokeWidth: sw * 1.1, strokeLinecap: 'round' });
  return tilt ? g({ transform: `rotate(${r2(tilt)} ${cx - 11} 113)` }, body) : body;
}

/** shoes member Schuh-1..4 */
export function puckiShoes(f: number, sw: number): string {
  const tilt = [0, 0, -7, -13, -18][Math.max(1, Math.min(4, f))];
  return sneaker(P.shoes[0], sw) + sneaker(P.shoes[1], sw, tilt);
}

/** complete Pucki (or the body member without animated limbs/curl) */
export function pucki(k = 1, pose: Pose & { full?: boolean } = {}): string {
  const sw = swFor(k);
  const full = pose.full ?? true;
  const out: string[] = [];
  if (full) out.push(puckiArmL(pose.armL ?? 1, sw));
  out.push(puckiLegs(sw), puckiArmBody(sw), puckiBall(sw), puckiCurlStub(sw), puckiFreckles(), puckiEyes(pose.eyes ?? 1, sw), puckiNose(sw), puckiMouth(pose.mouth ?? 1, sw, false));
  if (pose.lid) out.push(puckiLid(sw));
  if (full) out.push(puckiCurl(pose.hair ?? 1, sw), puckiShoes(pose.shoe ?? 1, sw));
  return out.join('');
}

// =================================================================== member generator

const PART_RE = /^(Bingo|Puck)(\d+)(?:(Augen|-Lid|Mund|ArmLinks|ArmRechts|Schuh|Haare)(?:-(\d+))?)?$/;

/** art for a Shared_Graphic-1 style member name ('Bingo90Mund-2', 'Puck25', …) or null */
export function characterMember(name: string, w: number, h: number, regX: number, regY: number): string | null {
  const m = PART_RE.exec(name);
  if (!m) return null;
  const who = m[1] === 'Bingo' ? 'Bongo' : 'Pucki';
  const pct = +m[2];
  const k = pct / 100;
  const part = m[3] ?? 'body';
  const f = m[4] ? +m[4] : 1;
  const sw = swFor(k);
  let body = '';
  if (who === 'Bongo') {
    switch (part) {
      case 'body': body = bongo(k, { full: pct <= 10 }); break;
      case 'Augen': body = bongoEyes(f, sw); break;
      case '-Lid': body = bongoLid(sw); break;
      case 'Mund': body = bongoMouth(f, sw); break;
      case 'ArmLinks': body = bongoArmL(f, sw); break;
      case 'ArmRechts': body = bongoArmR(f, sw); break;
      case 'Schuh': body = bongoBoots(f, sw); break;
      default: return null;
    }
  } else {
    switch (part) {
      case 'body': body = pucki(k, { full: pct <= 10 }); break;
      case 'Augen': body = puckiEyes(f, sw); break;
      case '-Lid': body = puckiLid(sw); break;
      case 'Mund': body = puckiMouth(f, sw); break;
      case 'ArmLinks': body = puckiArmL(f, sw); break;
      case 'Haare': body = puckiCurl(f, sw); break;
      case 'Schuh': body = puckiShoes(f, sw); break;
      default: return null;
    }
  }
  return svgDoc(w, h, g({ transform: `scale(${k})` }, body), `${-regX} ${-regY} ${w} ${h}`);
}

/** stand-alone figure document (e.g. for menus / docs): fits the full figure into w×h */
export function figureSvg(who: Who, w: number, h: number, pose: Pose = {}): string {
  // full-figure bounds at 100 % in loc coordinates
  const bb = who === 'Bongo' ? { x: -86, y: -122, w: 172, h: 245 } : { x: -40, y: -76, w: 150, h: 196 };
  const k = Math.min(w / bb.w, h / bb.h);
  const tx = (w - bb.w * k) / 2 - bb.x * k, ty = (h - bb.h * k) / 2 - bb.y * k;
  const fig = who === 'Bongo' ? bongo(k, { ...pose, full: true }) : pucki(k, { ...pose, full: true });
  return svgDoc(w, h, g({ transform: `translate(${r2(tx)} ${r2(ty)}) scale(${r2(k)})` }, fig));
}
