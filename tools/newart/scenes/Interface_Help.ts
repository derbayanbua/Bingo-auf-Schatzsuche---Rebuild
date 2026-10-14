// Interface_Help: in-game menu – plank table, decoration groups left/right (figures, disk, book, coins,
// trousers), gold menu lines (Menue) with nearly invisible hit bars on top.
import { defineMovie } from '../lib/api';
import { g } from '../lib/svg';
import { bongoAt, bookIcon, fatArrow, floppy, goldText, hitBar, menuBackdrop, puckiAt, trousers } from '../lib/menus';
import { coinIcon, headline, pill } from '../lib/ui';

function deco(x: number, flip: boolean): string {
  const f = (s: string) => (flip ? g({ transform: `translate(${2 * x + 180} 0) scale(-1 1)` }, s) : s);
  return f(
    [[40, 170, 11], [60, 182, 11], [30, 200, 10], [72, 210, 11], [50, 222, 10]].map(([cx, cy, r]) => coinIcon(x + cx - 10, cy - 10, r)).join('') +
    bongoAt(x + 115, 150, 0.2, { armL: 6, mouth: 3 }) + puckiAt(x + 130, 158, 0.22, { mouth: 3 }) +
    fatArrow(x + 172, 162, 26) + floppy(x + 200, 158, 36) +
    bookIcon(x + 150, 214, 40) + trousers(x + 64, 278, 66));
}

export default defineMovie({
  Headline: (m, w, h) => headline('Hilfe & Menü', w, h),
  Background: (m, w, h) => menuBackdrop(w, h, 'help') + deco(20, false) + deco(580, true),
  // stage top 182; lines at the hit bars (stage y 180/208/236/292/320 + 14)
  Menue: (m, w, h) => ['Speichern & Laden', 'Hosentaschenübersicht', 'Tipps für 5 Münzen kaufen', '', 'Einstellungen', 'Ende & Hauptauswahl']
    .map((s, i) => (s ? goldText(s, w / 2, 12 + i * 28, w - 4, 22) : '')).join(''),
  'Button Save-Load': (m, w, h) => hitBar(w, h),
  'Button Pocket': (m, w, h) => hitBar(w, h),
  'Button Hint': (m, w, h) => hitBar(w, h),
  'Button Settings': (m, w, h) => hitBar(w, h),
  'Button Main': (m, w, h) => hitBar(w, h),
  'Button Game': (m, w, h) => pill('Zurück zum Spiel', w, h),
});
