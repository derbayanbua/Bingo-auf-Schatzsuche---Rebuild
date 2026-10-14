// Chapter_Chapter-1: chapter card "Kapitel 1" – plank table with faded sepia sketches (house, lighthouse,
// Bongo, Pucki, Rocko), title and subtitle in gold.
import { defineMovie } from '../lib/api';
import { C, g, path, rect } from '../lib/svg';
import { bongoAt, goldText, planks, puckiAt } from '../lib/menus';
import { npcFitted } from '../lib/npcs';
import { headline, pill } from '../lib/ui';

const SEPIA = '<filter id="sep"><feColorMatrix type="matrix" values="0.39 0.77 0.19 0 0  0.35 0.69 0.17 0 0  0.27 0.53 0.13 0 0  0 0 0 1 0"/></filter>';

function house(x: number, y: number): string {
  return g({ transform: `translate(${x} ${y})` },
    rect(0, 60, 200, 150, { fill: C.wall, stroke: C.woodDeep, strokeWidth: 5 }),
    path('M-20 64 L100 -10 L220 64 Z', { fill: C.roof, stroke: C.roofDark, strokeWidth: 5, strokeLinejoin: 'round' }),
    path('M30 210 v-70 a25 25 0 0 1 50 0 v70', { fill: C.wood, stroke: C.woodDeep, strokeWidth: 4 }),
    rect(110, 110, 60, 50, { fill: C.sky, stroke: C.woodDeep, strokeWidth: 4 }), path('M140 110 v50 M110 135 h60', { stroke: C.woodDeep, strokeWidth: 3 }));
}

function lighthouse(x: number, y: number): string {
  return g({ transform: `translate(${x} ${y})` },
    path('M20 260 L40 40 H100 L120 260 Z', { fill: '#fff', stroke: '#4a4a52', strokeWidth: 5, strokeLinejoin: 'round' }),
    path('M30 150 H110 L114 190 H26 Z M36 80 H104 L106 110 H34 Z', { fill: C.red, stroke: '#4a4a52', strokeWidth: 3 }),
    rect(36, 0, 68, 40, { fill: C.yellow, stroke: '#4a4a52', strokeWidth: 5 }), path('M30 0 L70 -30 L110 0 Z', { fill: C.red, stroke: '#4a4a52', strokeWidth: 5, strokeLinejoin: 'round' }),
    path('M0 40 H140', { stroke: '#4a4a52', strokeWidth: 6 }));
}

function card(w: number, h: number): string {
  const sketches = g({ filter: 'url(#sep)', opacity: 0.38 },
    house(150, 0), lighthouse(600, 200), bongoAt(70, 330, 0.55, { armL: 6, mouth: 3 }), puckiAt(140, 260, 0.6, { mouth: 3 }),
    g({ transform: 'translate(590 -10)' }, npcFitted('Rocco', 200, 190, { mouth: 3, eyes: 'left' })));
  return `<defs>${SEPIA}</defs>` + planks(w, h, 'ch1', { seed: 'planks', base: '#a07040' }) + sketches +
    goldText('Kapitel 1', w / 2, 140, 400, 64) +
    goldText('„Piraten, Partys und ein schlauer', w / 2, 215, 600, 36) +
    goldText('Leuchtturmwärter!“', w / 2, 258, 600, 36);
}

export default defineMovie({
  Headline: (m, w, h) => headline('Kapitel 1', w, h),
  Background: (m, w, h) => card(w, h),
  Next: (m, w, h) => pill('Weiter', w, h),
  Filmstop: (m, w, h) => pill('Film überspringen', w, h),
});
