// The game's own vector artwork (used without a sprite pack and for menus/dialogs).
// Character designs = approved character sheet of the rebuild ("neue Grafik", tools/newart):
// Bongo = orange block with a blue white-dotted bandana and brown boots, Pucki = mint-green ball with
// a curl, freckles and yellow sneakers; NPCs Käpt'n Reling, Alfons, Mats, Bert, Arno, Tom, Rocko.

import { DISPLAY_NAMES } from '../game/names';
import type { CharId } from '../game/types';
import { itemImageUrl } from '../orig/gfx';

export interface CharLook {
  name: string;
  body: string;
  accent: string;
  shape: 'block' | 'ball' | 'round';
  hat?: 'pirate' | 'cook' | 'knit' | 'captain' | 'sailor' | 'band' | 'stripes';
}

/** CHn ids as in the original data (Landscape scores: CH3 JmpReeling, CH4 JmpAlfred, CH5 JmpMagnus,
 *  CH6 JmpBen, CH7 JmpArnold, CH8 JmpTim, CH9 JmpRocco) with the rebuild's own names (game/names.ts). */
export const LOOKS: Record<CharId, CharLook> = {
  CH1: { name: DISPLAY_NAMES.Bingo, body: '#ff9447', accent: '#8a5428', shape: 'block' },
  CH2: { name: DISPLAY_NAMES.Puck, body: '#7ed6a5', accent: '#ffd23f', shape: 'ball' },
  CH3: { name: DISPLAY_NAMES.Reeling, body: '#2e4c8a', accent: '#16264a', shape: 'round', hat: 'captain' },
  CH4: { name: DISPLAY_NAMES.Alfred, body: '#f4f4f4', accent: '#8f8a9e', shape: 'round', hat: 'cook' },
  CH5: { name: DISPLAY_NAMES.Magnus, body: '#8fcf6b', accent: '#3d7d22', shape: 'round', hat: 'knit' },
  CH6: { name: DISPLAY_NAMES.Ben, body: '#e88fb4', accent: '#a2346a', shape: 'round', hat: 'stripes' },
  CH7: { name: DISPLAY_NAMES.Arnold, body: '#e8964a', accent: '#8a4a12', shape: 'round', hat: 'band' },
  CH8: { name: DISPLAY_NAMES.Tim, body: '#58b7c9', accent: '#1d6f82', shape: 'round', hat: 'sailor' },
  CH9: { name: DISPLAY_NAMES.Rocco, body: '#5b5f6b', accent: '#2a2c33', shape: 'round', hat: 'pirate' },
};

export function setLookName(ch: CharId, name: string) {
  LOOKS[ch].name = name;
}

const INK = '#2a2140';

function hatTop(l: CharLook): string {
  switch (l.hat) {
    case 'pirate': return `<path d="M0 -20 L18 6 Q0 0 -18 6 Z" fill="#1d1d22" stroke="#000" stroke-width="1.5"/><circle cx="0" cy="-4" r="2.5" fill="#fff"/>`;
    case 'cook': return `<path d="M-12 0 q-7 -9 1 -14 q4 -9 11 -5 q7 -5 11 4 q8 6 1 15 q-12 5 -24 0z" fill="#fff" stroke="#a8a2b8" stroke-width="1.5"/>`;
    case 'knit': return `<circle cx="0" cy="-2" r="11" fill="#e8483f" stroke="#9a2620" stroke-width="1.5"/><path d="M-10 -5 h20 M-11 0 h22" stroke="#fff" stroke-width="2.5"/><circle cx="0" cy="-3" r="3.5" fill="#fff"/>`;
    case 'captain': return `<circle cx="0" cy="-2" r="12" fill="#fff" stroke="#9aa4b5" stroke-width="1.5"/><path d="M-12 -13 q12 -10 24 0 l2 5 h-28z" fill="#1b2d55"/><path d="M-3 -12 l3 -3 l3 3 l-3 3z" fill="#f4c542"/>`;
    case 'sailor': return `<circle cx="0" cy="-1" r="9" fill="#fff" stroke="#9aa4b5" stroke-width="1.5"/><circle cx="0" cy="-1" r="5" fill="#eef1f6" stroke="#2f6fd8" stroke-width="1.6"/>`;
    case 'band': return `<path d="M-14 -6 q14 -6 28 0" fill="none" stroke="#d63a2f" stroke-width="4" stroke-linecap="round"/>`;
    case 'stripes': return `<circle cx="0" cy="0" r="9" fill="#fff" stroke="${l.accent}" stroke-width="1.5"/><path d="M-8 -3 h16 M-9 2 h18" stroke="${l.accent}" stroke-width="2"/>`;
  }
  return '';
}

/** Top-down board token, centred on 0,0, facing up (rotate the group for direction). */
export function tokenSVG(ch: CharId): string {
  const l = LOOKS[ch];
  let body: string;
  if (ch === 'CH1') {
    body = `<ellipse cx="-8" cy="17" rx="6" ry="5" fill="#8a5428" stroke="#4a2a10" stroke-width="1.5"/><ellipse cx="8" cy="17" rx="6" ry="5" fill="#8a5428" stroke="#4a2a10" stroke-width="1.5"/>
      <rect x="-17" y="-15" width="34" height="30" rx="7" fill="#ff9447" stroke="#a84a00" stroke-width="2"/>
      <rect x="-15" y="-13" width="30" height="24" rx="5" fill="#2f6fd8" stroke="#173f86" stroke-width="1.5"/>
      <circle cx="-8" cy="-6" r="1.8" fill="#fff"/><circle cx="2" cy="-8" r="1.8" fill="#fff"/><circle cx="9" cy="-3" r="1.8" fill="#fff"/><circle cx="-4" cy="3" r="1.8" fill="#fff"/><circle cx="7" cy="5" r="1.8" fill="#fff"/>
      <path d="M17 4 l8 3 l-2 6 z M17 4 l8 -4 l1 7 z" fill="#2f6fd8" stroke="#173f86" stroke-width="1.2"/>
      <ellipse cx="-6" cy="-16" rx="4" ry="3.2" fill="#fff" stroke="${INK}" stroke-width="1"/><ellipse cx="6" cy="-16" rx="4" ry="3.2" fill="#fff" stroke="${INK}" stroke-width="1"/>
      <circle cx="-6" cy="-17" r="1.8" fill="#1d5fa8"/><circle cx="6" cy="-17" r="1.8" fill="#1d5fa8"/>`;
  } else if (ch === 'CH2') {
    body = `<ellipse cx="-8" cy="16" rx="6" ry="4.5" fill="#ffd23f" stroke="#8a6d00" stroke-width="1.5"/><ellipse cx="8" cy="16" rx="6" ry="4.5" fill="#ffd23f" stroke="#8a6d00" stroke-width="1.5"/>
      <circle r="17" fill="#7ed6a5" stroke="#1f6b5a" stroke-width="2"/>
      <path d="M0 2 q-6 -8 2 -11 q8 -2 7 6 q-1 5 -6 4 q-4 -1 -2 -4" fill="none" stroke="#1f6b5a" stroke-width="2.5" stroke-linecap="round"/>
      <ellipse cx="-6" cy="-15" rx="4" ry="3.2" fill="#fff" stroke="${INK}" stroke-width="1"/><ellipse cx="6" cy="-15" rx="4" ry="3.2" fill="#fff" stroke="${INK}" stroke-width="1"/>
      <circle cx="-6" cy="-16" r="1.8" fill="${INK}"/><circle cx="6" cy="-16" r="1.8" fill="${INK}"/>`;
  } else {
    body = `<ellipse cx="-7" cy="16" rx="5.5" ry="4.5" fill="#333" stroke="#111" stroke-width="1"/><ellipse cx="7" cy="16" rx="5.5" ry="4.5" fill="#333" stroke="#111" stroke-width="1"/>
      <circle r="17" fill="${l.body}" stroke="${l.accent}" stroke-width="2"/>
      <ellipse cx="-6" cy="-14" rx="4" ry="3.2" fill="#fff" stroke="${INK}" stroke-width="1"/><ellipse cx="6" cy="-14" rx="4" ry="3.2" fill="#fff" stroke="${INK}" stroke-width="1"/>
      <circle cx="-6" cy="-15" r="1.8" fill="${INK}"/><circle cx="6" cy="-15" r="1.8" fill="${INK}"/>${hatTop(l)}`;
  }
  return `<g class="tok"><ellipse cx="3" cy="5" rx="19" ry="17" fill="rgba(0,0,0,.2)"/>${body}</g>`;
}

function portraitHat(l: CharLook): string {
  switch (l.hat) {
    case 'pirate': return `<path d="M-50 -26 Q0 -90 50 -26 Q0 -40 -50 -26 Z" fill="#1d1d22" stroke="#000" stroke-width="2"/><circle cx="0" cy="-48" r="6" fill="#fff"/><path d="M-36 -18 L36 -6" stroke="#1d1d22" stroke-width="3"/><ellipse cx="-14" cy="-12" rx="11" ry="9" fill="#1d1d22"/>`;
    case 'cook': return `<path d="M-26 -36 h52 v-10 q10 -24 -14 -20 q-12 -20 -26 0 q-24 -4 -12 20z" fill="#fff" stroke="#a8a2b8" stroke-width="2"/><path d="M-16 20 q8 -6 16 0 q8 -6 16 0" fill="#5a3a20"/>`;
    case 'knit': return `<path d="M-40 -24 Q0 -80 40 -24 Z" fill="#e8483f" stroke="#9a2620" stroke-width="2"/><path d="M-38 -32 h76 M-30 -44 h60" stroke="#fff" stroke-width="5"/><circle cx="0" cy="-60" r="8" fill="#fff" stroke="#bbb"/>`;
    case 'captain': return `<path d="M-42 -28 q42 -18 84 0 l-4 9 h-76 z" fill="#1b2d55"/><path d="M-36 -34 Q0 -76 36 -34 z" fill="#fff" stroke="#8a93a6" stroke-width="2"/><path d="M-8 -42 l8 -8 l8 8 l-8 8 z" fill="#f4c542"/><path d="M-30 14 q-4 26 30 32 q34 -6 30 -32 q-10 18 -30 18 q-20 0 -30 -18 z" fill="#f4f4f4" stroke="#9aa4b5" stroke-width="1.5"/>`;
    case 'sailor': return `<path d="M-34 -32 Q0 -70 34 -32 z" fill="#fff" stroke="#8a93a6" stroke-width="2"/><path d="M-36 -32 h72" stroke="#2f6fd8" stroke-width="6" stroke-linecap="round"/>`;
    case 'band': return `<path d="M-42 -30 q42 -14 84 0" fill="none" stroke="#d63a2f" stroke-width="9" stroke-linecap="round"/>`;
    case 'stripes': return `<path d="M-40 -28 q40 -40 80 0 q-40 8 -80 0 z" fill="#fff" stroke="${l.accent}" stroke-width="2"/><path d="M-34 -36 q34 -10 68 0" fill="none" stroke="${l.accent}" stroke-width="3"/>`;
  }
  return '';
}

/** Larger portrait (front view) for dialogs/exchange/menu. viewBox -60 -72 120 140 */
export function portraitSVG(ch: CharId, extra = ''): string {
  const l = LOOKS[ch];
  if (ch === 'CH1') {
    return `<svg viewBox="-60 -72 120 140" class="portrait" aria-hidden="true">
    <ellipse cx="0" cy="62" rx="40" ry="6" fill="rgba(0,0,0,.18)"/>
    <rect x="-22" y="34" width="8" height="18" rx="3" fill="#5a3a20"/><rect x="6" y="34" width="8" height="18" rx="3" fill="#5a3a20"/>
    <path d="M-34 62 v-8 q0 -6 8 -6 h12 q6 0 7 6 v8 z M0 62 v-8 q1 -6 8 -6 h12 q8 0 8 6 v8 z" fill="#8a5428" stroke="#4a2a10" stroke-width="2.5"/>
    <path d="M-40 6 q-14 4 -16 22 M40 6 q14 -4 16 -20" fill="none" stroke="#a84a00" stroke-width="7" stroke-linecap="round"/>
    <path d="M-40 6 q-14 4 -16 22 M40 6 q14 -4 16 -20" fill="none" stroke="#ff9447" stroke-width="4" stroke-linecap="round"/>
    <rect x="-40" y="-58" width="80" height="96" rx="20" fill="#ff9447" stroke="#a84a00" stroke-width="3"/>
    <path d="M-41 -34 v-4 q0 -21 21 -21 h40 q21 0 21 21 v4 q-41 7 -82 0z" fill="#2f6fd8" stroke="#173f86" stroke-width="2.5"/>
    <circle cx="-26" cy="-46" r="3" fill="#fff"/><circle cx="-6" cy="-50" r="3" fill="#fff"/><circle cx="14" cy="-48" r="3" fill="#fff"/><circle cx="30" cy="-44" r="2.5" fill="#fff"/><circle cx="-16" cy="-38" r="2.5" fill="#fff"/><circle cx="6" cy="-39" r="2.5" fill="#fff"/>
    <path d="M38 -46 l16 -9 l-3 13 l11 5 l-17 4 z" fill="#2f6fd8" stroke="#173f86" stroke-width="2.5" stroke-linejoin="round"/>
    <ellipse cx="-13" cy="-16" rx="11" ry="13" fill="#fff" stroke="${INK}" stroke-width="2.5"/><ellipse cx="13" cy="-16" rx="11" ry="13" fill="#fff" stroke="${INK}" stroke-width="2.5"/>
    <circle cx="-10" cy="-13" r="5" fill="#1d5fa8"/><circle cx="16" cy="-13" r="5" fill="#1d5fa8"/><circle cx="-9" cy="-15" r="1.8" fill="#fff"/><circle cx="17" cy="-15" r="1.8" fill="#fff"/>
    <ellipse cx="2" cy="2" rx="7" ry="6" fill="#ff9a3c" stroke="#a84a00" stroke-width="2"/>
    <path d="M-18 13 q20 20 40 0 q-20 6 -40 0z" fill="#7a1f1f" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/><path d="M-6 16 h14 v4 q-7 2 -14 0z" fill="#fff"/>
    ${extra}</svg>`;
  }
  if (ch === 'CH2') {
    return `<svg viewBox="-60 -72 120 140" class="portrait" aria-hidden="true">
    <ellipse cx="0" cy="62" rx="38" ry="6" fill="rgba(0,0,0,.18)"/>
    <rect x="-16" y="30" width="8" height="24" rx="3" fill="#1f6b5a"/><rect x="8" y="30" width="8" height="24" rx="3" fill="#1f6b5a"/>
    <path d="M-30 62 q0 -12 16 -12 q8 0 9 12 z M2 62 q1 -12 14 -12 q16 0 16 12 z" fill="#ffd23f" stroke="#8a6d00" stroke-width="2.5"/><path d="M-28 60 h22 M4 60 h26" stroke="#fff" stroke-width="2.5"/>
    <path d="M-44 8 q-12 10 -10 24 M44 8 q12 10 10 24" fill="none" stroke="#1f6b5a" stroke-width="7" stroke-linecap="round"/>
    <path d="M-44 8 q-12 10 -10 24 M44 8 q12 10 10 24" fill="none" stroke="#7ed6a5" stroke-width="4" stroke-linecap="round"/>
    <circle cx="0" cy="-6" r="46" fill="#7ed6a5" stroke="#1f6b5a" stroke-width="3"/>
    <path d="M0 -52 q-3 -16 10 -19 q11 -1 10 10 q-1 7 -8 6 q-6 -1 -4 -6" fill="none" stroke="#1f6b5a" stroke-width="4.5" stroke-linecap="round"/>
    <g fill="#e07a5f"><circle cx="-24" cy="4" r="2.2"/><circle cx="-29" cy="-1" r="1.9"/><circle cx="-20" cy="-1" r="1.9"/><circle cx="24" cy="4" r="2.2"/><circle cx="29" cy="-1" r="1.9"/><circle cx="20" cy="-1" r="1.9"/></g>
    <ellipse cx="-12" cy="-16" rx="10" ry="12" fill="#fff" stroke="${INK}" stroke-width="2.5"/><ellipse cx="12" cy="-16" rx="10" ry="12" fill="#fff" stroke="${INK}" stroke-width="2.5"/>
    <circle cx="-10" cy="-14" r="4.6" fill="${INK}"/><circle cx="14" cy="-14" r="4.6" fill="${INK}"/><circle cx="-9" cy="-16" r="1.6" fill="#fff"/><circle cx="15" cy="-16" r="1.6" fill="#fff"/>
    <ellipse cx="1" cy="0" rx="5.5" ry="4.5" fill="#f2a32a"/>
    <path d="M-17 10 q18 18 36 0 q-18 6 -36 0z" fill="#7a1f1f" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/><path d="M-6 13 h13 v3.5 q-6.5 2 -13 0z" fill="#fff"/>
    ${extra}</svg>`;
  }
  return `<svg viewBox="-60 -72 120 140" class="portrait" aria-hidden="true">
    <ellipse cx="0" cy="60" rx="40" ry="7" fill="rgba(0,0,0,.18)"/>
    <path d="M-12 40 v14 M12 40 v14" stroke="${l.accent}" stroke-width="6"/>
    <path d="M-30 60 q0 -10 14 -10 q10 0 12 10 z M4 60 q1 -10 14 -10 q12 0 14 10 z" fill="#333" stroke="#111" stroke-width="2"/>
    <circle cx="0" cy="-2" r="44" fill="${l.body}" stroke="${l.accent}" stroke-width="3"/>
    <ellipse cx="-14" cy="-12" rx="10.5" ry="12.5" fill="#fff" stroke="${INK}" stroke-width="2.2"/><ellipse cx="14" cy="-12" rx="10.5" ry="12.5" fill="#fff" stroke="${INK}" stroke-width="2.2"/>
    <circle cx="-12" cy="-10" r="4.8" fill="${INK}"/><circle cx="16" cy="-10" r="4.8" fill="${INK}"/><circle cx="-11" cy="-12" r="1.6" fill="#fff"/><circle cx="17" cy="-12" r="1.6" fill="#fff"/>
    <ellipse cx="1" cy="5" rx="7" ry="6" fill="rgba(0,0,0,.12)" stroke="${l.accent}" stroke-width="2"/>
    <path d="M-16 18 q17 16 34 0 q-17 6 -34 0z" fill="#7a1f1f" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>
    ${portraitHat(l)}${extra}
  </svg>`;
}

// ---------------------------------------------------------------- inventory items

/** Item names (German) derived from the original item graphics (names are descriptive, see CLAUDE.md). */
export const ITEM_NAMES: Record<string, string> = {
  OI001: 'Blaue Vase', OI002: 'Tube', OI003: 'Teller', OI004: 'Blumentopf', OI005: 'Kreide', OI006: 'Witzkarte',
  OI007: 'Münze', OI008: 'Krug', OI009: 'Schwarzer Schlüssel', OI010: 'Holzstück', OI012: 'Haken', OI013: 'Grüne Flasche',
  OI014: 'Power-Riegel', OI015: 'Gitter', OI016: 'Stange', OI017: 'Schraubenschlüssel', OI018: 'Mütze', OI021: 'Taucherbrille',
  OI022: 'Gasflaschen', OI023: 'Grüne Zange', OI025: 'Muschel', OI026: 'Schlüssel', OI027: 'Streichholzschachtel', OI028: 'Stein',
  OI032: 'Flaschenpost', OI034: 'Messer', OI035: 'Putzlappen', OI036: 'Flamme', OI037: 'Handspiegel', OI038: 'Rezept',
  OI039: 'Flaschenpost', OI040: 'Schatzkarte', OI041: 'Rotes Glas', OI042: 'Blaues Glas', OI043: 'Rosa Glas', OI045: 'Salzstreuer',
  OI049: 'Holzstück', OI050: 'Holzstück', OI051: 'Holzstück', OI052: 'Schaufel', OI054: 'Nagel', OI055: 'Zündkasten',
  OI056: 'Kartenstück 1', OI057: 'Kartenstück 2', OI058: 'Kartenstück 3', OI059: 'Kartenstück 4', OI060: 'Kartenstück 5',
  OI061: 'Kartenstück 6', OI062: 'Kartenstück 7', OI063: 'Eimer', OI064: 'Brief', OI065: 'Eintrittskarte', OI066: 'Dynamit',
  OI068: 'Schlüssel', OI069: 'Schlüssel', OI070: 'Schlüssel', OI071: 'Eimer mit Wasser', OI073: 'Rechen', OI074: 'Verbeulter Eimer',
  OI075: 'Flaschenpost', OI076: 'Rotes Glas', OI077: 'Schaufel', OI078: 'Duschkopf', OI079: 'Käse', OI080: 'Gräte',
  OI081: '5 Münzen', OI082: '10 Münzen', OI083: '20 Münzen',
};

export function itemName(id: string): string {
  return ITEM_NAMES[id] ?? `Gegenstand ${id.slice(2)}`;
}

const ICONS: Record<string, string> = {
  coin: `<circle r="22" fill="#f4c542" stroke="#b8860b" stroke-width="4"/><path d="M0 -12 l4 9 10 1 -8 6 3 10 -9 -6 -9 6 3 -10 -8 -6 10 -1z" fill="#fff6c8"/>`,
  card: `<rect x="-20" y="-26" width="40" height="52" rx="6" fill="#fff" stroke="#2f73d8" stroke-width="3"/><text y="9" text-anchor="middle" font-size="26">😄</text>`,
  bottle: `<path d="M-6 -30 h12 v10 q12 6 12 20 v24 q0 6 -6 6 h-24 q-6 0 -6 -6 v-24 q0 -14 12 -20z" fill="#3fae6a" stroke="#1f6b3c" stroke-width="3"/>`,
  key: `<circle cx="-12" cy="0" r="10" fill="none" stroke="#c49a1a" stroke-width="6"/><path d="M-2 0 h28 v8 M18 0 v8" stroke="#c49a1a" stroke-width="6" fill="none"/>`,
  map: `<path d="M-26 -20 l16 6 16 -6 16 6 v40 l-16 -6 -16 6 -16 -6z" fill="#f3e2b0" stroke="#a0782a" stroke-width="3"/><path d="M-6 0 l8 8 M2 0 l-8 8" stroke="#c0392b" stroke-width="3"/>`,
  bar: `<rect x="-26" y="-10" width="52" height="20" rx="5" fill="#7a3e12"/><rect x="-14" y="-12" width="28" height="24" fill="#e84b3c"/><text y="5" text-anchor="middle" font-size="11" fill="#fff" font-weight="700">POWER</text>`,
  shell: `<path d="M0 22 q-28 -10 -22 -30 q22 -22 44 0 q6 20 -22 30z" fill="#f6c6b8" stroke="#c07a68" stroke-width="3"/><path d="M0 20 v-34 M0 20 l-12 -30 M0 20 l12 -30" stroke="#c07a68" stroke-width="2"/>`,
  tool: `<path d="M-22 18 l30 -30 m-6 -6 q10 -10 18 0 q-6 4 -4 8 q4 2 8 -4 q10 8 0 18 q-8 0 -12 -4 l-30 30z" fill="#9aa4ad" stroke="#5a636b" stroke-width="3"/>`,
  paper: `<path d="M-18 -24 h28 l10 10 v38 h-38z" fill="#fff" stroke="#8a8a8a" stroke-width="3"/><path d="M-10 -6 h20 M-10 2 h20 M-10 10 h14" stroke="#888" stroke-width="2"/>`,
  wood: `<rect x="-26" y="-9" width="52" height="18" rx="4" fill="#b07a3e" stroke="#6b4518" stroke-width="3"/><path d="M-18 -2 h20 M-6 4 h22" stroke="#6b4518" stroke-width="2"/>`,
  jar: `<rect x="-16" y="-20" width="32" height="42" rx="8" fill="#e25a5a" stroke="#8a2a2a" stroke-width="3"/><rect x="-18" y="-26" width="36" height="8" rx="3" fill="#ccc"/>`,
  bucket: `<path d="M-20 -14 h40 l-6 36 h-28z" fill="#8fa3b5" stroke="#4d5f70" stroke-width="3"/><path d="M-20 -14 q20 -24 40 0" fill="none" stroke="#4d5f70" stroke-width="3"/>`,
  generic: `<rect x="-22" y="-22" width="44" height="44" rx="12" fill="#c9a76b" stroke="#7a5a2a" stroke-width="3"/><text y="8" text-anchor="middle" font-size="22">?</text>`,
};

function iconFor(id: string): string {
  const n = ITEM_NAMES[id] ?? '';
  if (/Münze/.test(n)) return ICONS.coin;
  if (id === 'OI006') return ICONS.card;
  if (/Flasche/.test(n)) return ICONS.bottle;
  if (/Schlüssel/.test(n) && !/Schraub/.test(n)) return ICONS.key;
  if (/Karte/.test(n)) return ICONS.map;
  if (/Riegel/.test(n)) return ICONS.bar;
  if (/Muschel/.test(n)) return ICONS.shell;
  if (/Schraub|Zange|Messer|Schaufel|Rechen|Haken|Nagel|Stange/.test(n)) return ICONS.tool;
  if (/Rezept|Brief/.test(n)) return ICONS.paper;
  if (/Holz/.test(n)) return ICONS.wood;
  if (/Glas|Vase|Krug|Topf/.test(n)) return ICONS.jar;
  if (/Eimer/.test(n)) return ICONS.bucket;
  return ICONS.generic;
}

export function itemSVG(id: string): string {
  if (id === 'OI000') return '';
  // original inventory icon (Shared_Inventar, 70x70) when public/orig is installed
  const orig = itemImageUrl(id);
  const body = orig ? `<image href="${orig}" x="-32" y="-32" width="64" height="64"/>` : iconFor(id);
  return `<svg viewBox="-32 -32 64 64" class="item${orig ? ' item-orig' : ''}" role="img" aria-label="${itemName(id)}"><title>${itemName(id)}</title>${body}</svg>`;
}

/** Die face (1..6) */
export function dieSVG(v: number): string {
  const pips: Record<number, [number, number][]> = {
    1: [[0, 0]], 2: [[-9, -9], [9, 9]], 3: [[-9, -9], [0, 0], [9, 9]], 4: [[-9, -9], [9, -9], [-9, 9], [9, 9]],
    5: [[-9, -9], [9, -9], [0, 0], [-9, 9], [9, 9]], 6: [[-9, -10], [9, -10], [-9, 0], [9, 0], [-9, 10], [9, 10]],
  };
  return `<svg viewBox="-20 -20 40 40" class="die"><rect x="-18" y="-18" width="36" height="36" rx="8" fill="#fff" stroke="#c9c9d6" stroke-width="2"/>${(pips[v] ?? [])
    .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.6" fill="#2b2b44"/>`)
    .join('')}</svg>`;
}
