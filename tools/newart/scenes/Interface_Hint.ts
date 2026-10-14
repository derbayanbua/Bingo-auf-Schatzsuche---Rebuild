// Interface_Hint: tip book – open notebook on the plank table (text sprite at stage 263,271 437x90),
// round up/down buttons to leaf through the tips.
import { defineMovie } from '../lib/api';
import { C, defs, line, linGrad, path, rect } from '../lib/svg';
import { goldText, planks } from '../lib/menus';
import { headline, pill, roundArrow } from '../lib/ui';

function book(w: number, h: number): string {
  let s = planks(w, h, 'hint', { seed: 'planks' });
  s += defs(linGrad('hpage', [[0, '#fff8de'], [1, '#f1e2b0']], 0, 0, 1, 1));
  // cover + page block
  s += path('M196 52 Q460 30 790 52 V460 H196 Z', { fill: '#000', opacity: 0.25, transform: 'translate(8 8)' });
  s += path('M196 50 Q460 28 800 50 V460 H196 Z', { fill: '#7a3a2a', stroke: '#3a1a10', strokeWidth: 4 });
  s += rect(198, 60, 16, 400, { fill: '#e9d9a8', stroke: '#8a7040', strokeWidth: 2 });
  s += path('M214 46 Q470 26 728 52 V460 H214 Z', { fill: 'url(#hpage)', stroke: '#8a7040', strokeWidth: 3 });
  s += path('M736 54 Q770 50 800 54 V460 H736 Z', { fill: '#fff8de', stroke: '#8a7040', strokeWidth: 3 });
  s += path('M728 52 Q732 250 736 460', { fill: 'none', stroke: '#8a7040', strokeWidth: 4 });
  for (let y = 120; y < 440; y += 26) s += line(250, y, 700, y, { stroke: '#9ec4e8', strokeWidth: 1.5, opacity: 0.7 });
  s += line(244, 70, 244, 450, { stroke: '#e88f8f', strokeWidth: 2 });
  // bookmark ribbon
  s += path('M660 40 v70 l-10 -10 l-10 10 v-70 z', { fill: C.red, stroke: C.redDark, strokeWidth: 2.5, strokeLinejoin: 'round' });
  s += goldText('Tipps', 470, 92, 300, 34, 'middle', '#c0392b').replace(/stroke="[^"]+"/, 'stroke="#fff8de"');
  return s;
}

export default defineMovie({
  Headline: (m, w, h) => headline('Tipps', w, h),
  Background: (m, w, h) => book(w, h),
  Previous: (m, w, h) => roundArrow('up', w, h),
  Next: (m, w, h) => roundArrow('down', w, h),
  Back: (m, w, h) => pill('Zurück', w, h),
});
