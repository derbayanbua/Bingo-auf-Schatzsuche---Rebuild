// Interface_Security: "really quit to the main menu?" – palm backdrop with a worried Bongo, two message lines, JA/NEIN.
import { defineMovie } from '../lib/api';
import { shadow } from '../lib/svg';
import { bongoAt, goldText, menuBackdrop, roundButton } from '../lib/menus';
import { headline, pill } from '../lib/ui';

export default defineMovie({
  Headline: (m, w, h) => headline('Spiel beenden?', w, h),
  Bingo: (m, w, h) => menuBackdrop(w, h, 'security') + shadow(402, 226, 46, 8, 0.25) + bongoAt(400, 170, 0.48, { armL: 3, armR: 6, mouth: 2, eyes: 2 }),
  'Message-1': (m, w, h) => goldText('Möchtest du das laufende Spiel wirklich beenden und zur Hauptauswahl wechseln?', w / 2, h / 2 + 1, w - 4, 22),
  'Message-2': (m, w, h) => goldText('Was du nicht gespeichert hast, geht dabei verloren!', w / 2, h / 2 + 1, w - 4, 22),
  Yes: (m, w, h) => roundButton('JA', w, h, true),
  No: (m, w, h) => roundButton('NEIN', w, h, false),
  Back: (m, w, h) => pill('Zurück zum Spiel', w, h),
});
