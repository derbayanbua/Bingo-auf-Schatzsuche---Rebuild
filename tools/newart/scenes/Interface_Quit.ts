// Interface_Quit: goodbye / credits screen (800x540) – night sky, title, rebuild credits, palm fringe.
import { defineMovie } from '../lib/api';
import { C, circle, defs, linGrad, rect, rng } from '../lib/svg';
import { bongoAt, goldText, palmFringe, puckiAt } from '../lib/menus';
import { fitText, star } from '../lib/ui';

function quit(w: number, h: number): string {
  const R = rng('quit');
  let s = defs(linGrad('qsky', [[0, '#1a1150'], [0.6, C.uiDark], [1, C.uiLight]])) + rect(0, 0, w, h, { fill: 'url(#qsky)' });
  for (let i = 0; i < 60; i++) s += circle(R() * w, R() * h * 0.8, 0.8 + R() * 1.8, { fill: '#fff', opacity: 0.3 + R() * 0.5 });
  s += star(660, 70, 10, C.yellow, C.yellowDark, 2) + star(140, 110, 7, C.yellow, C.yellowDark, 1.5);
  s += bongoAt(250, 170, 0.36, { armL: 6, mouth: 3 }) + puckiAt(510, 182, 0.42, { mouth: 3, armL: 3 }, true);
  s += goldText('Tschüss und bis bald!', w / 2, 120, 300, 30);
  s += goldText('Bongo auf Schatzsuche – Rebuild (Fan-Projekt)', w / 2, 270, 640, 28);
  s += fitText('nach dem Original von Outline Multimedia / more software (2001)', w / 2, 310, 600, 19, { fill: '#fff', anchor: 'middle', font: 'body' });
  s += fitText('Grafik & Code: mit KI (Claude) erstellt', w / 2, 340, 600, 19, { fill: '#fff', anchor: 'middle', font: 'body' });
  s += palmFringe(w, h, 'quit', { top: false });
  return s;
}

export default defineMovie({
  Background: (m, w, h) => quit(w, h),
});
