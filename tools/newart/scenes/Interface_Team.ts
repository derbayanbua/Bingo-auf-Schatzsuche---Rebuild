// Interface_Team: cast & credits – nine character bubbles (Icon-n), picture card (Image-n) and caption (Text-n)
// per character, music track lists left/right (Track1-4/5-8 + hit bars Button-n), rebuild credits on plaques.
import { defineMovie } from '../lib/api';
import { C, circle, defs, ellipse, g, linGrad, path, rect, rng } from '../lib/svg';
import { CAST9, NAME9, bongoAt, goldText, hitBar, palmFringe, planks, plate, portrait, puckiAt, type Who9 } from '../lib/menus';
import { npcFitted } from '../lib/npcs';
import { fitText, headline, pill } from '../lib/ui';

const ROLE: Record<Who9, string> = {
  Bingo: 'der Held', Puck: 'der beste Freund', Reeling: 'der Seebär', Alfred: 'der Koch', Magnus: 'der Bastler',
  Ben: 'der Ausguck', Arnold: 'der Starke', Tim: 'der Matrose', Rocco: 'der Pirat',
};
const SCENE: Record<Who9, [string, string]> = {
  Bingo: [C.sky, C.grass], Puck: [C.skyLight, C.grassLight], Reeling: ['#9fd4f7', C.water], Alfred: [C.wall, C.floor], Magnus: [C.sky, C.sand],
  Ben: ['#ffd9a0', C.water], Arnold: [C.sky, C.grass], Tim: ['#bfe6f7', C.water], Rocco: ['#4a3aa0', '#3a2a6a'],
};
const BG: Record<Who9, string> = { Bingo: '#ffe0c0', Puck: '#d8f5e4', Reeling: '#dde6ff', Alfred: '#ffffff', Magnus: '#e0f5d0', Ben: '#ffe0ee', Arnold: '#ffe4cc', Tim: '#d6f4f0', Rocco: '#e4e4e4' };

function plaque(x: number, y: number, w: number, h: number, lines: string[]): string {
  return rect(x + 4, y + 5, w, h, { rx: 12, fill: '#000', opacity: 0.25 }) + rect(x, y, w, h, { rx: 12, fill: '#fdf0c8', stroke: C.woodDeep, strokeWidth: 3.5 }) +
    circle(x + 10, y + 10, 3, { fill: C.woodDeep }) + circle(x + w - 10, y + 10, 3, { fill: C.woodDeep }) +
    lines.map((l, i) => fitText(l, x + w / 2, y + 22 + i * 22, w - 20, 16, { fill: C.woodDeep, anchor: 'middle', font: 'body' })).join('');
}

function background(w: number, h: number): string {
  return planks(w, h, 'team', { seed: 'planks' }) + palmFringe(w, h, 'team', { bottom: false }) +
    plaque(20, 296, 210, 100, ['nach dem Original von', 'Outline Multimedia /', 'more software (2001)']) +
    plaque(570, 296, 210, 100, ['Grafik & Code:', 'mit KI (Claude)', 'erstellt']) +
    goldText('Bongo auf Schatzsuche – Rebuild (Fan-Projekt)', w / 2, 425, 560, 22);
}

function card(who: Who9, w: number, h: number): string {
  const [sky, ground] = SCENE[who];
  const R = rng(`team${who}`);
  let s = defs(linGrad(`tc${who}`, [[0, sky], [1, '#ffffff']])) + rect(0, 0, w, h, { fill: `url(#tc${who})` });
  for (let i = 0; i < 3; i++) s += ellipse(30 + R() * 240, 20 + R() * 40, 26, 9, { fill: '#fff', opacity: 0.7 });
  s += path(`M0 ${h - 50} Q${w / 2} ${h - 70} ${w} ${h - 48} V${h} H0 Z`, { fill: ground, stroke: 'rgba(0,0,0,0.25)', strokeWidth: 3 });
  s += ellipse(w / 2, h - 18, 52, 9, { fill: '#000', opacity: 0.2 });
  if (who === 'Bingo') s += bongoAt(w / 2, h - 80, 0.5, { armL: 6, mouth: 3 });
  else if (who === 'Puck') s += puckiAt(w / 2 - 26, h - 70, 0.75, { mouth: 3, armL: 3 });
  else s += g({ transform: `translate(${w / 2 - 80} 6)` }, npcFitted(who, 160, h - 14, { mouth: 3, armR: 1 }));
  return s + rect(1.5, 1.5, w - 3, h - 3, { rx: 10, fill: 'none', stroke: '#fff', strokeWidth: 3 });
}

const art: Parameters<typeof defineMovie>[0] = {
  Headline: (m, w, h) => headline('Das Team', w, h),
  Background: (m, w, h) => background(w, h),
  'Icon-*': (m, w, h) => { const who = CAST9[(m.frame ?? 1) - 1]; return plate(w / 2, h / 2, w / 2 - 4, `ti${who}`, portrait(who, w / 2, h / 2, w / 2 - 4), BG[who]); },
  'Image-*': (m, w, h) => card(CAST9[(m.frame ?? 1) - 1], w, h),
  'Text-*': (m, w, h) => { const who = CAST9[(m.frame ?? 1) - 1]; return goldText(`${NAME9[who]} (…${ROLE[who]})`, w / 2, h / 2 + 1, w - 4, 24); },
  'Track1-4': (m, w, h) => [1, 2, 3, 4].map((n, i) => goldText(`Musik ${n}`, w / 2, 10 + i * 28, w - 2, 20)).join(''),
  'Track5-8': (m, w, h) => [5, 6, 7, 8].map((n, i) => goldText(`Musik ${n}`, w / 2, 10 + i * 28, w - 2, 20)).join(''),
  'Button-*': (m, w, h) => hitBar(w, h),
  Main: (m, w, h) => pill('Hauptauswahl', w, h),
};

export default defineMovie(art);
