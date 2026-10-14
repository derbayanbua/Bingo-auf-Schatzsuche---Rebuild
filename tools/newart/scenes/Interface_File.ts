// Interface_File: save / load / delete – plank table, 8 slot lines (hit bars + free/used labels),
// big choice pictures (save: figures → disk, load: disk → figures, delete: wastepaper basket), confirmation.
import { defineMovie } from '../lib/api';
import { C, dk, ellipse, g, path, rect } from '../lib/svg';
import { bongoAt, fatArrow, floppy, goldText, planks, puckiAt, roundButton, slotMembers } from '../lib/menus';
import { headline, pill } from '../lib/ui';

const figures = (x: number, y: number, k: number) => bongoAt(x, y, k, { armL: 6, mouth: 3 }) + puckiAt(x + 20 * k / 0.4, y + 25 * k / 0.4, k * 1.05, { mouth: 3 });

function bin(w: number, h: number): string {
  const cx = w / 2;
  let s = ellipse(cx + 4, 108, 52, 8, { fill: '#000', opacity: 0.25 });
  s += path(`M${cx - 50} 12 L${cx - 40} 106 Q${cx} 114 ${cx + 40} 106 L${cx + 50} 12 Z`, { fill: C.green, stroke: C.greenDark, strokeWidth: 3.5, strokeLinejoin: 'round' });
  for (let i = -3; i <= 3; i++) s += path(`M${cx + i * 13} 18 L${cx + i * 10.5} 104`, { stroke: dk(C.green, 0.35), strokeWidth: 3 });
  for (let y = 34; y < 104; y += 16) s += path(`M${cx - 48 + (y - 12) * 0.1} ${y} H${cx + 48 - (y - 12) * 0.1}`, { stroke: dk(C.green, 0.35), strokeWidth: 2.5 });
  s += ellipse(cx, 12, 50, 9, { fill: dk(C.green, 0.4), stroke: C.greenDark, strokeWidth: 3.5 });
  s += g({ transform: `rotate(-8 ${cx - 14} 40)` }, rect(cx - 36, 30, 46, 20, { rx: 3, fill: '#fdf6e3', stroke: '#8a7040', strokeWidth: 2 }), goldText('Papier', cx - 13, 41, 40, 13, 'middle', '#6a4a10').replace(/stroke="[^"]+"/, 'stroke="none"'));
  return s;
}

export default defineMovie({
  Headline: (m, w, h) => headline('Speichern & Laden', w, h),
  Background: (m, w, h) => planks(w, h, 'file', { seed: 'planks' }),
  ...slotMembers(),
  Save: (m, w, h) => figures(56, 72, 0.34) + fatArrow(152, 82, 46) + floppy(212, 82, 62) + goldText('Spielstand speichern', w / 2, h - 14, w - 6, 22),
  Load: (m, w, h) => floppy(42, 82, 62) + fatArrow(104, 82, 46) + figures(170, 72, 0.34) + goldText('Spielstand laden', w / 2, h - 14, w - 6, 22),
  Delete: (m, w, h) => bin(w, h) + goldText('Spielstand löschen', w / 2, h - 12, w - 4, 20),
  'Message-1': (m, w, h) => goldText('Möchtest du diesen Spielstand wirklich überschreiben?', w / 2, h / 2 + 1, w - 4, 22),
  'Message-2': (m, w, h) => goldText('Möchtest du diesen Spielstand wirklich laden?', w / 2, h / 2 + 1, w - 4, 22),
  'Message-3': (m, w, h) => goldText('Möchtest du diesen Spielstand wirklich löschen?', w / 2, h / 2 + 1, w - 4, 22),
  Yes: (m, w, h) => roundButton('JA', w, h, true),
  No: (m, w, h) => roundButton('NEIN', w, h, false),
  Back: (m, w, h) => pill('Zurück', w, h),
});
