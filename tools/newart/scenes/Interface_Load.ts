// Interface_Load: load a saved game from the start menu – palm backdrop, 8 slot lines.
import { defineMovie } from '../lib/api';
import { menuBackdrop, slotMembers } from '../lib/menus';
import { headline, pill } from '../lib/ui';

export default defineMovie({
  Headline: (m, w, h) => headline('Spielstand laden', w, h),
  Backdrop: (m, w, h) => menuBackdrop(w, h, 'load', { top: false }),
  ...slotMembers(),
  Start: (m, w, h) => pill('Zurück', w, h),
});
