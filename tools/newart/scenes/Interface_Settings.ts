// Interface_Settings: settings board – glass pills with gold labels painted into the background,
// volume sliders (Drag1Left/Middle/Right at the three audio rows), check boxes (Checker-0/1).
import { defineMovie } from '../lib/api';
import { C, circle, dk, g, path, rect } from '../lib/svg';
import { glassPill, planks } from '../lib/menus';
import { headline, pill } from '../lib/ui';

const COL = [[110, 120], [270, 120], [412, 280]] as const;
const ROWS: [number, string, string, string][] = [
  [62, 'Audio', 'Sprache', ''], [102, '', 'Effekte', ''], [142, '', 'Musik', ''], [182, '', 'Untertitel', 'Untertitel anzeigen'],
  [262, 'Video', 'Anzeige', 'Vollbild'],
  [342, 'Sonstiges', 'Tempo', 'Turbo-Sprung'], [382, '', 'Grafik', 'Optische Extras'],
];

function wrench(): string {
  return g({ transform: 'translate(110 140) rotate(-40)' },
    rect(-9, -10, 18, 92, { rx: 8, fill: '#8a8f9a', stroke: '#3a3f4a', strokeWidth: 3.5 }),
    rect(-8, 30, 16, 50, { rx: 7, fill: C.red, stroke: C.redDark, strokeWidth: 3 }),
    path('M-24 -40 a26 26 0 1 0 48 0 l-10 0 l-4 14 h-16 l-4 -14 z', { fill: '#c8ccd6', stroke: '#3a3f4a', strokeWidth: 3.5, strokeLinejoin: 'round' }),
    path('M-14 -22 q8 8 20 2', { fill: 'none', stroke: '#fff', strokeWidth: 3, strokeLinecap: 'round', opacity: 0.7 }));
}

function background(w: number, h: number): string {
  let s = planks(w, h, 'set', { seed: 'planks' }) + wrench();
  for (const [y, a, b, c] of ROWS) {
    [a, b, c].forEach((t, i) => {
      if (!t) return;
      const [x, pw] = COL[i];
      s += g({ transform: `translate(${x} ${y - 16})` }, glassPill(t, pw, 32));
    });
  }
  // slider grooves for the three volume rows
  for (const y of [62, 102, 142]) s += rect(412, y - 12, 280, 24, { rx: 12, fill: 'rgba(0,0,0,0.25)', stroke: 'rgba(255,255,255,0.5)', strokeWidth: 2 });
  return s;
}

export default defineMovie({
  Headline: (m, w, h) => headline('Einstellungen', w, h),
  Background: (m, w, h) => background(w, h),
  Drag1Left: (m, w, h) => path(`M${w} ${h / 2 - 8} h-6 a8 8 0 0 0 0 16 h6 z`, { fill: C.yellow, stroke: dk(C.yellow, 0.5), strokeWidth: 2 }),
  Drag1Middle: (m, w, h) => rect(-2, h / 2 - 8, w + 4, 16, { fill: C.yellow }) + path(`M0 ${h / 2 - 8} H${w} M0 ${h / 2 + 8} H${w}`, { stroke: dk(C.yellow, 0.5), strokeWidth: 2 }) +
    path(`M0 ${h / 2 - 4} H${w}`, { stroke: '#fff', strokeWidth: 2, opacity: 0.6 }),
  Drag1Right: (m, w, h) => rect(0, h / 2 - 8, 12, 16, { fill: C.yellow }) + path(`M0 ${h / 2 - 8} H12 M0 ${h / 2 + 8} H12`, { stroke: dk(C.yellow, 0.5), strokeWidth: 2 }) +
    circle(w - 21, h / 2, 16, { fill: '#fdf6e3', stroke: C.uiDark, strokeWidth: 3 }) + path(`M${w - 27} ${h / 2} l-5 0 M${w - 15} ${h / 2} l5 0`, { stroke: C.uiDark, strokeWidth: 2.5, strokeLinecap: 'round' }) +
    path(`M${w - 25} ${h / 2 - 5} l-5 5 l5 5 M${w - 17} ${h / 2 - 5} l5 5 l-5 5`, { fill: 'none', stroke: C.uiLight, strokeWidth: 2.5, strokeLinecap: 'round', strokeLinejoin: 'round' }),
  'Checker-*': (m, w, h) => circle(w / 2, h / 2, w / 2 - 2, { fill: '#fdf6e3', stroke: '#6a6070', strokeWidth: 2.5 }) +
    (m.frame === 1 ? path(`M${w * 0.26} ${h * 0.52} l${w * 0.18} ${h * 0.18} l${w * 0.32} ${-h * 0.38}`, { fill: 'none', stroke: '#e0a000', strokeWidth: 4, strokeLinecap: 'round', strokeLinejoin: 'round' }) : ''),
  Back: (m, w, h) => pill('Zurück', w, h),
});
