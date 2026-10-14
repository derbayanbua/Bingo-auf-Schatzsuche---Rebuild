// Exchange – the trading screen: soft-focus backdrop (Background-1 meadow, Background-2 jungle), two
// thought bubbles for the offered items, the pocket captions, the "Münzen" drop field and the four trading
// NPCs (Mats, Tom, Alfons, Arno) with separate blink (…-Augen) and talk (…Mund-1..3) members.
// The NPCs come from the NPC kit; each one is mapped with its own (slightly non-uniform) scale so that
// the kit's eyes and mouth land inside the original part rectangles (stage coords from the score).
import { defineMovie, type Member } from '../lib/api';
import { blossoms } from '../lib/island1';
import { treeTop } from '../lib/nature';
import { npcEyes, npcFigure, npcMouth, type NpcId } from '../lib/npcs';
import { C, blob, circle, defs, dk, ellipse, g, line, linGrad, lt, path, r2, rect, rng } from '../lib/svg';
import { fitText, headline, pill } from '../lib/ui';

// --- NPCs --------------------------------------------------------------------------------------------
/** kit geometry needed for the mapping (mirrors SPEC in lib/npcs.ts: legH, bodyH, faceY) */
const GEO: Record<string, { legH: number; bodyH: number; faceY: number }> = {
  Magnus: { legH: 22, bodyH: 120, faceY: 0.36 },
  Tim: { legH: 20, bodyH: 96, faceY: 0.4 },
  Alfred: { legH: 22, bodyH: 140, faceY: 0.33 },
  Arnold: { legH: 22, bodyH: 128, faceY: 0.3 },
};
const mouthYOf = (id: string) => {
  const s = GEO[id];
  return -(s.legH + s.bodyH - 8) + s.bodyH * s.faceY + 38;
};
/** stage position of the kit mouth + scale per NPC; body/part members' stage left/top from the score */
const MAP: Record<string, { cx: number; cy: number; sx: number; sy: number; body: [number, number]; eyes: [number, number]; mouth: [number, number] }> = {
  Magnus: { cx: 663, cy: 401, sx: 0.58, sy: 0.8, body: [583, 299], eyes: [589, 364], mouth: [646, 396] },
  Tim: { cx: 652, cy: 416, sx: 0.6, sy: 0.6, body: [580, 334], eyes: [637, 388], mouth: [638, 412] },
  Alfred: { cx: 650.5, cy: 385, sx: 0.72, sy: 1.1, body: [581, 184], eyes: [628, 313], mouth: [621, 372] },
  Arnold: { cx: 673, cy: 394, sx: 0.8, sy: 1.2, body: [559, 259], eyes: [633, 312], mouth: [637, 383] },
};

function placed(id: string, at: [number, number], body: string): string {
  const M = MAP[id];
  return g({ transform: `translate(${r2(M.cx - at[0])} ${r2(M.cy - at[1])}) scale(${M.sx} ${M.sy}) translate(0 ${r2(-mouthYOf(id))})` }, body);
}
const npcBody = (id: string) => placed(id, MAP[id].body, npcFigure(id as NpcId, { mouth: 1 }));
const npcBlink = (id: string) => placed(id, MAP[id].eyes, npcEyes(id as NpcId, 'closed'));
const npcTalk = (id: string, f: number) => placed(id, MAP[id].mouth, npcMouth(id as NpcId, [1, 3, 5][Math.max(0, Math.min(2, f - 1))], true));

// --- backgrounds -------------------------------------------------------------------------------------
const BLUR = '<filter id="dof" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="3.5"/></filter>';

function meadow(w: number, h: number): string {
  let s = defs(linGrad('sky', [[0, C.sky], [1, C.skyLight]]), BLUR);
  let b = rect(0, 0, w, h, { fill: 'url(#sky)' });
  b += ellipse(160, 70, 60, 18, { fill: C.white, opacity: 0.8 }) + ellipse(560, 50, 80, 20, { fill: C.white, opacity: 0.7 });
  b += path('M-20 250 Q200 170 420 220 T820 190 V448 H-20 Z', { fill: '#8fcf7a' });
  b += path('M-20 300 Q260 250 520 290 T820 270 V448 H-20 Z', { fill: '#6cc060' });
  b += path('M440 255 l40 -26 l40 26 v26 h-80 z', { fill: '#e8c9a0', stroke: '#8a6a4a', strokeWidth: 3 }) + path('M432 258 l48 -34 l48 34', { fill: 'none', stroke: C.roof, strokeWidth: 8, strokeLinejoin: 'round' });
  // trees: dark green left, red-blossom tree in the middle
  b += rect(20, 120, 26, 220, { fill: '#6b4a2a', rx: 8 }) + treeTop(60, 120, 120, 'exl', { shadow: false, base: '#3f8f45' });
  b += path('M600 400 Q610 300 590 200 M598 300 Q640 240 700 210 M594 250 Q550 200 520 170', { fill: 'none', stroke: '#8a8090', strokeWidth: 16, strokeLinecap: 'round' });
  b += treeTop(560, 110, 110, 'exr', { shadow: false, base: '#d8434a', light: '#ff8a8a', dark: '#8a1f2a' }) + treeTop(730, 170, 80, 'exr2', { shadow: false, base: '#d8434a', light: '#ff8a8a', dark: '#8a1f2a' });
  b += blossoms(560, 110, 100, 30, 'exbl', '#ffd0dc');
  b += treeTop(260, 200, 60, 'exm', { shadow: false, base: '#c8434a', light: '#ff8a8a', dark: '#8a1f2a' });
  const R = rng('exfl');
  for (let i = 0; i < 26; i++) b += circle(R() * 800, 330 + R() * 110, 4 + R() * 3, { fill: R() > 0.5 ? C.white : '#ffe9a8', opacity: 0.9 });
  s += g({ filter: 'url(#dof)' }, b);
  return s;
}

function jungle(w: number, h: number): string {
  let s = defs(BLUR);
  let b = rect(0, 0, w, h, { fill: '#4a9a3a' });
  b += rect(0, 0, w, 120, { fill: '#2f7a2a' });
  // rocks in the middle distance
  b += path(blob(400, 170, 70, 80, 'exr1', 0.2), { fill: '#bdb7a0', stroke: '#7a7460', strokeWidth: 4 });
  b += path(blob(330, 270, 80, 40, 'exr2', 0.2), { fill: '#c9c3aa', stroke: '#7a7460', strokeWidth: 4 });
  b += path(blob(620, 260, 120, 50, 'exr3', 0.2), { fill: '#b5af98', stroke: '#7a7460', strokeWidth: 4 });
  b += path(blob(520, 160, 50, 60, 'exr4', 0.2), { fill: '#8fc06a' });
  b += path('M-20 330 Q300 300 820 320 V448 H-20 Z', { fill: '#5fb85a' });
  // big fronds sweeping in from the corners
  const R = rng('exfr');
  const frond = (x: number, y: number, ang: number, len: number, col: string) => {
    const a = (ang * Math.PI) / 180, ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len;
    const nx = -Math.sin(a) * len * 0.16, ny = Math.cos(a) * len * 0.16;
    const mx = (x + ex) / 2, my = (y + ey) / 2;
    return path(`M${r2(x)} ${r2(y)} Q${r2(mx + nx)} ${r2(my + ny)} ${r2(ex)} ${r2(ey)} Q${r2(mx - nx * 0.3)} ${r2(my - ny * 0.3)} ${r2(x)} ${r2(y)} Z`, { fill: col, stroke: dk(col, 0.35), strokeWidth: 3 }) +
      line(x, y, ex, ey, { stroke: lt(col, 0.3), strokeWidth: 3, opacity: 0.8 });
  };
  for (let i = 0; i < 14; i++) b += frond(-20, 460, -80 + i * 6 + R() * 4, 300 + R() * 200, i % 2 ? '#3fae4a' : '#2f8f3a');
  for (let i = 0; i < 10; i++) b += frond(820, 0, 100 + i * 7 + R() * 4, 220 + R() * 160, i % 2 ? '#4fc04a' : '#2f8f3a');
  for (let i = 0; i < 8; i++) b += frond(820, 460, 200 + i * 6, 200 + R() * 120, '#3f9a4a');
  s += g({ filter: 'url(#dof)' }, b);
  return s;
}

// --- UI pieces ---------------------------------------------------------------------------------------
function bubble(cx: number, cy: number, r: number): string {
  return circle(cx + r * 0.12, cy + r * 0.14, r, { fill: '#000', opacity: 0.15 }) +
    circle(cx, cy, r, { fill: '#ffffff', opacity: 0.88, stroke: C.uiLight, strokeWidth: Math.max(2, r * 0.09) }) +
    path(`M${r2(cx - r * 0.65)} ${r2(cy - r * 0.15)} A${r * 0.7} ${r * 0.7} 0 0 1 ${r2(cx - r * 0.1)} ${r2(cy - r * 0.68)}`, { fill: 'none', stroke: lt(C.uiLight, 0.6), strokeWidth: Math.max(1.5, r * 0.1), strokeLinecap: 'round' });
}

function caption(text: string, x0: number, x1: number, h: number): string {
  const mid = (x0 + x1) / 2, tw = 92;
  const ln = (a: number, b: number) => path(`M${a} ${h - 3} V${h / 2 + 1} H${b}`,{ fill: 'none', stroke: C.uiAccent, strokeWidth: 2, strokeLinecap: 'round' });
  return ln(x0 + 1, mid - tw / 2 - 4) + ln(x1 - 1, mid + tw / 2 + 4) + fitText(text, mid, h / 2 + 1, tw, 16, { anchor: 'middle', fill: C.uiAccent, stroke: C.uiDark, sw: 2.5 });
}

const part = (fn: (id: string, m: Member) => string) => (m: Member) => {
  const id = (/^(Magnus|Tim|Alfred|Arnold)/.exec(m.name) ?? [])[1];
  return id ? fn(id, m) : null;
};

export default defineMovie({
  Headline: (m, w, h) => headline('Tauschen', w, h),
  'Background-1': (m, w, h) => meadow(w, h),
  'Background-2': (m, w, h) => jungle(w, h),
  Beschriftung: (m, w, h) => caption('Hosentasche', 0, 165, h) + caption('Hosentasche', w - 165, w, h),
  'Blase-Links': () => bubble(108, 37, 33) + bubble(49, 58, 17) + bubble(11, 79, 8.5),
  'Blase-Rechts': () => bubble(38, 36, 33) + bubble(93, 68, 16) + bubble(128, 95, 8.5),
  'Drop Coins': (m, w, h) => pill('Münzen', w, h),
  Magnus100: part((id) => npcBody(id)),
  Tim100: part((id) => npcBody(id)),
  Alfred100: part((id) => npcBody(id)),
  Arnold100: part((id) => npcBody(id)),
  'Magnus100-Augen': part((id) => npcBlink(id)),
  'Tim100-Augen': part((id) => npcBlink(id)),
  'Alfred100-Augen': part((id) => npcBlink(id)),
  'Arnold100-Augen': part((id) => npcBlink(id)),
  'Magnus100Mund-*': part((id, m) => npcTalk(id, m.frame ?? 1)),
  'Tim100Mund-*': part((id, m) => npcTalk(id, m.frame ?? 1)),
  'Alfred100Mund-*': part((id, m) => npcTalk(id, m.frame ?? 1)),
  'Arnold100Mund-*': part((id, m) => npcTalk(id, m.frame ?? 1)),
});
