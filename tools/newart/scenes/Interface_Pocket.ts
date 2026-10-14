// Interface_Pocket: overview of all pockets – portrait bubble + name per character, three glass sockets each
// (items are runtime sprites), trousers bottom right.
import { defineMovie } from '../lib/api';
import { goldText, glassBubble, NAME9, plate, planks, portrait, trousers, type Who9 } from '../lib/menus';
import { headline, pill } from '../lib/ui';

const LEFT: Who9[] = ['Bingo', 'Puck', 'Magnus', 'Alfred', 'Ben'];
const RIGHT: (Who9 | null)[] = ['Reeling', 'Tim', 'Arnold', null, 'Rocco'];
const BG: Record<string, string> = { Bingo: '#ffe0c0', Puck: '#d8f5e4', Reeling: '#dde6ff', Alfred: '#ffffff', Magnus: '#e0f5d0', Ben: '#ffe0ee', Arnold: '#ffe4cc', Tim: '#d6f4f0', Rocco: '#e4e4e4' };

function background(w: number, h: number): string {
  let s = planks(w, h, 'pocket', { seed: 'planks' });
  const row = (who: Who9 | null, x: number, y: number, k: string) => {
    let r = '';
    for (let i = 1; i <= 3; i++) r += glassBubble(x + i * 80 + 32, y, 31, `pk${k}${i}`);
    if (who) r += plate(x, y, 31, `pp${k}`, portrait(who, x, y, 31), BG[who]) + goldText(NAME9[who], x, y + 42, 110, 16);
    return r;
  };
  LEFT.forEach((who, i) => (s += row(who, 55, 45 + i * 87, `l${i}`)));
  RIGHT.forEach((who, i) => (s += who ? row(who, 468, 45 + i * 87, `r${i}`) : ''));
  s += trousers(660, 302, 92);
  return s;
}

export default defineMovie({
  Headline: (m, w, h) => headline('Hosentaschenübersicht', w, h),
  Background: (m, w, h) => background(w, h),
  Back: (m, w, h) => pill('Zurück', w, h),
});
