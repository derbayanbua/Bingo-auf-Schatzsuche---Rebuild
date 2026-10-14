// Interface_Lesson3: "Reden & Geben" – soft-focus park, Alfons (Alfred100 + mouth/eye parts on a common loc),
// thought bubbles left/right, pocket captions.
import { atReg, defineMovie, type Member } from '../lib/api';
import { C, circle, defs, ellipse, g, linGrad, path, rect, rng } from '../lib/svg';
import { exitStrip, pocketCaption } from '../lib/menus';
import { npcEyes, npcFigure, npcMouth } from '../lib/npcs';
import { headline } from '../lib/ui';

// Alfons in loc coordinates: face slightly right of the loc, eyes at y -11
const K = 1.1, FX = 16, FY = -11 + (154 - 46.2) * K;
const place = (m: Member, body: string) => atReg(m, g({ transform: `translate(${FX} ${FY.toFixed(2)}) scale(${K})` }, body));

function park(w: number, h: number): string {
  const R = rng('park');
  let s = defs(linGrad('pk', [[0, '#8fc8f0'], [1, '#e0f2ff']]), '<filter id="pblur" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="3"/></filter>');
  let b = rect(0, 0, w, h, { fill: 'url(#pk)' });
  b += ellipse(150, 60, 70, 18, { fill: '#fff', opacity: 0.8 }) + ellipse(520, 40, 90, 20, { fill: '#fff', opacity: 0.8 });
  b += path('M0 300 Q200 240 420 270 T800 230 V448 H0 Z', { fill: C.grassLight }) + path('M0 340 Q300 300 800 330 V448 H0 Z', { fill: C.grass });
  b += path('M380 300 q30 -20 60 0', { fill: 'none', stroke: '#e8dcc0', strokeWidth: 30, opacity: 0.8 });
  // bench
  b += rect(470, 290, 80, 12, { rx: 3, fill: C.wood, stroke: C.woodDeep, strokeWidth: 3 }) + rect(470, 270, 80, 12, { rx: 3, fill: C.wood, stroke: C.woodDeep, strokeWidth: 3 }) + rect(476, 300, 6, 22, { fill: C.woodDeep }) + rect(538, 300, 6, 22, { fill: C.woodDeep });
  // trees: green left, blossom tree right
  b += rect(0, 120, 22, 240, { fill: '#6b4a30' }) + circle(80, 90, 120, { fill: '#3f8f45' }) + circle(200, 160, 90, { fill: '#4fa64a' }) + circle(20, 220, 70, { fill: '#2f7a3a' });
  b += path('M660 360 q-10 -120 30 -220 M690 200 q-60 -40 -150 -60 M680 250 q50 -40 120 -40', { fill: 'none', stroke: '#8a8070', strokeWidth: 18, strokeLinecap: 'round' });
  for (let i = 0; i < 26; i++) b += circle(420 + R() * 380, 20 + R() * 260, 18 + R() * 26, { fill: i % 3 ? '#e8483f' : '#c0302a' });
  for (let i = 0; i < 9; i++) b += circle(240 + R() * 150, 100 + R() * 120, 18 + R() * 20, { fill: '#e8483f' });
  for (let i = 0; i < 10; i++) b += circle(R() * w, 330 + R() * 110, 5, { fill: '#fff' }) ;
  s += g({ filter: 'url(#pblur)' }, b);
  return s;
}

function thought(w: number, h: number, flip: boolean): string {
  const bub = [[0.08, 0.86, 0.06], [0.3, 0.68, 0.13], [0.7, 0.36, 0.3]] as const;
  return g(flip ? { transform: `translate(${w} 0) scale(-1 1)` } : {}, ...bub.map(([x, y, r]) => {
    const rr = r * w;
    return circle(x * w, y * h, rr, { fill: '#fff', opacity: 0.85, stroke: '#6a6070', strokeWidth: 3 }) + path(`M${x * w - rr * 0.55} ${y * h - rr * 0.3} q${rr * 0.3} ${-rr * 0.4} ${rr * 0.7} ${-rr * 0.35}`, { fill: 'none', stroke: '#fff', strokeWidth: 3, strokeLinecap: 'round' });
  }));
}

export default defineMovie({
  Headline: (m, w, h) => headline('Lektion 3: Reden & Geben', w, h),
  Background: (m, w, h) => park(w, h),
  Beschriftung: (m, w, h) => pocketCaption(80, 9, 160) + pocketCaption(w - 80, 9, 160),
  'Blase-Links': (m, w, h) => thought(w, h, false),
  'Blase-Rechts': (m, w, h) => thought(w, h, true),
  Alfred100: (m, w, h) => place(m, npcFigure('Alfred', { mouth: 1 })),
  'Alfred100Mund-*': (m, w, h) => place(m, npcMouth('Alfred', [1, 3, 4][(m.frame ?? 1) - 1] ?? 1, true)),
  'Alfred100-Augen': (m, w, h) => place(m, npcEyes('Alfred', 'open')),
  'Exit-Left': (m, w, h) => exitStrip(w, h, true),
  'Exit-Right': (m, w, h) => exitStrip(w, h, false),
});
