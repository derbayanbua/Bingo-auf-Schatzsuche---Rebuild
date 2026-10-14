// Interface_Lesson1: "Das Spielbrett" – uses the island centre board (SP001) as map, exit strips, pocket caption.
import { defineMovie, findMember } from '../lib/api';
import { exitStrip, pocketCaption } from '../lib/menus';
import { headline } from '../lib/ui';
import sp001 from './Landscape_SP001';

export default defineMovie({
  Headline: (m, w, h) => headline('Lektion 1: Das Spielbrett', w, h),
  Map: (m, w, h) => sp001['SP001-Board']({ ...findMember('Landscape_SP001', 'SP001-Board')! }, w, h) ?? null,
  Beschriftung: (m, w, h) => pocketCaption(84, 9, 160),
  'Exit-Left': (m, w, h) => exitStrip(w, h, true),
  'Exit-Right': (m, w, h) => exitStrip(w, h, false),
});
