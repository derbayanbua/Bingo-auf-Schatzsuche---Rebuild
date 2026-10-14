// Interface_Play: "Spielen" sub menu – plank table with palm fringes, three choices (new / continue / load).
import { defineMovie } from '../lib/api';
import { g } from '../lib/svg';
import { choice, chest, floppy, menuBackdrop } from '../lib/menus';
import { dieFace, headline, pill } from '../lib/ui';

export default defineMovie({
  Headline: (m, w, h) => headline('Spielen', w, h),
  Backdrop: (m, w, h) => menuBackdrop(w, h, 'play'),
  New: (m, w, h) => choice(w, h, 'new', ['Neues Spiel beginnen'], (cx, cy, r) => chest(cx, cy + r * 0.15, r * 0.55, true), '#ffe9a8'),
  Restore: (m, w, h) => choice(w, h, 'res', ['Laufendes Spiel fortsetzen'], (cx, cy, r) =>
    g({ transform: `translate(${cx - r * 0.6} ${cy - r * 0.55}) rotate(-12 ${r * 0.3} ${r * 0.3})` }, dieFace(4, r * 0.7, r * 0.7)) +
    g({ transform: `translate(${cx - r * 0.05} ${cy - r * 0.1}) rotate(10 ${r * 0.3} ${r * 0.3})` }, dieFace(6, r * 0.62, r * 0.62))),
  Old: (m, w, h) => choice(w, h, 'old', ['Spielstand laden'], (cx, cy, r) => floppy(cx, cy, r * 1.05), '#d6f0ff'),
  Main: (m, w, h) => pill('Hauptauswahl', w, h),
});
