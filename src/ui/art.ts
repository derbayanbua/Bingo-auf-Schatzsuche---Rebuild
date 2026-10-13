// Original vector artwork for the remake (no original bitmaps are shipped).
// Character designs follow the published look: Bingo = yellow block with orange hair and a green shoe,
// Puck = yellow ball with a blue shoe.

import type { CharId } from '../game/types';

export interface CharLook {
  name: string;
  body: string;
  accent: string;
  shape: 'block' | 'ball' | 'round';
  hat?: 'pirate' | 'cook' | 'cap' | 'captain';
}

/** Names proven by the original scripts: CH4 Alfred, CH7 Arnold, CH9 Rocco. Others [Prüfung erforderlich]. */
export const LOOKS: Record<CharId, CharLook> = {
  CH1: { name: 'Bingo', body: '#f7c531', accent: '#3aa845', shape: 'block' },
  CH2: { name: 'Puck', body: '#f9d648', accent: '#2f73d8', shape: 'ball' },
  CH3: { name: 'Figur 3', body: '#9b7fd1', accent: '#5b3fa0', shape: 'round' },
  CH4: { name: 'Alfred', body: '#f2f2f2', accent: '#d9534f', shape: 'round', hat: 'cook' },
  CH5: { name: 'Figur 5', body: '#58b7c9', accent: '#1d6f82', shape: 'round', hat: 'cap' },
  CH6: { name: 'Figur 6', body: '#e88fb4', accent: '#a2346a', shape: 'round' },
  CH7: { name: 'Arnold', body: '#e8964a', accent: '#8a4a12', shape: 'round' },
  CH8: { name: 'Figur 8', body: '#8fcf6b', accent: '#3d7d22', shape: 'round', hat: 'captain' },
  CH9: { name: 'Rocco', body: '#5b5f6b', accent: '#c0392b', shape: 'round', hat: 'pirate' },
};

export function setLookName(ch: CharId, name: string) {
  LOOKS[ch].name = name;
}

/** Top-down-ish board token, centred on 0,0, facing up (rotate the group for direction). */
export function tokenSVG(ch: CharId): string {
  const l = LOOKS[ch];
  const body =
    l.shape === 'block'
      ? `<rect x="-15" y="-17" width="30" height="34" rx="8" fill="${l.body}" stroke="#7a5a00" stroke-width="2"/>
         <path d="M-6 -17 q4 -9 8 -2 q3 -8 7 0" fill="none" stroke="#f07a1a" stroke-width="3" stroke-linecap="round"/>`
      : `<circle r="17" fill="${l.body}" stroke="${l.shape === 'ball' ? '#7a5a00' : l.accent}" stroke-width="2"/>`;
  const hat =
    l.hat === 'pirate'
      ? `<path d="M-17 -8 Q0 -26 17 -8 Z" fill="#222"/><circle cx="0" cy="-14" r="2.5" fill="#fff"/>`
      : l.hat === 'cook'
        ? `<ellipse cx="0" cy="-15" rx="12" ry="7" fill="#fff" stroke="#bbb"/>`
        : l.hat === 'cap'
          ? `<path d="M-13 -9 Q0 -24 13 -9 Z" fill="${l.accent}"/>`
          : l.hat === 'captain'
            ? `<path d="M-14 -9 Q0 -22 14 -9 Z" fill="#203a6b"/><rect x="-3" y="-17" width="6" height="3" fill="#f4c542"/>`
            : '';
  const patch = l.hat === 'pirate' ? `<path d="M-14 -4 L10 2" stroke="#222" stroke-width="2"/><circle cx="-6" cy="-1" r="4" fill="#222"/>` : '';
  return `<g class="tok">
    <ellipse cx="0" cy="20" rx="15" ry="5" fill="rgba(0,0,0,.25)"/>
    <ellipse cx="${l.shape === 'block' ? 8 : 9}" cy="18" rx="8" ry="5" fill="${l.accent}" stroke="rgba(0,0,0,.3)"/>
    ${body}
    <circle cx="-6" cy="-3" r="5" fill="#fff" stroke="#333" stroke-width="1"/><circle cx="6" cy="-3" r="5" fill="#fff" stroke="#333" stroke-width="1"/>
    <circle cx="-5" cy="-4" r="2.2" fill="#222"/><circle cx="7" cy="-4" r="2.2" fill="#222"/>
    <path d="M-7 7 Q0 13 7 7" fill="none" stroke="#5a2a00" stroke-width="2" stroke-linecap="round"/>
    ${patch}${hat}
  </g>`;
}

/** Larger portrait (front view) for dialogs/exchange/menu. viewBox -60 -70 120 140 */
export function portraitSVG(ch: CharId, extra = ''): string {
  const l = LOOKS[ch];
  const body =
    l.shape === 'block'
      ? `<rect x="-38" y="-50" width="76" height="92" rx="16" fill="${l.body}" stroke="#a07800" stroke-width="3"/>
         <path d="M-10 -50 q6 -22 14 -6 q6 -18 14 -2 q6 -12 10 2" fill="none" stroke="#f07a1a" stroke-width="6" stroke-linecap="round"/>`
      : `<circle cx="0" cy="-2" r="44" fill="${l.body}" stroke="${l.shape === 'ball' ? '#a07800' : l.accent}" stroke-width="3"/>`;
  const hat =
    l.hat === 'pirate'
      ? `<path d="M-46 -26 Q0 -84 46 -26 Z" fill="#1d1d1d"/><path d="M-8 -48 l8 -8 l8 8 l-8 8z" fill="#fff"/>`
      : l.hat === 'cook'
        ? `<path d="M-26 -36 h52 v-10 q10 -24 -14 -20 q-12 -20 -26 0 q-24 -4 -12 20z" fill="#fff" stroke="#ccc" stroke-width="2"/>`
        : l.hat === 'cap'
          ? `<path d="M-40 -24 Q0 -76 40 -24 Z" fill="${l.accent}"/><rect x="10" y="-30" width="38" height="8" rx="4" fill="${l.accent}"/>`
          : l.hat === 'captain'
            ? `<path d="M-40 -26 Q0 -70 40 -26 Z" fill="#203a6b"/><rect x="-40" y="-30" width="80" height="8" rx="3" fill="#152a50"/><circle cx="0" cy="-44" r="6" fill="#f4c542"/>`
            : '';
  const patch = l.hat === 'pirate' ? `<path d="M-40 -18 L36 -4" stroke="#1d1d1d" stroke-width="4"/><ellipse cx="-14" cy="-12" rx="11" ry="9" fill="#1d1d1d"/>` : '';
  return `<svg viewBox="-60 -72 120 140" class="portrait" aria-hidden="true">
    <ellipse cx="0" cy="60" rx="40" ry="7" fill="rgba(0,0,0,.18)"/>
    <path d="M-12 40 v14 M12 40 v14" stroke="#c0392b" stroke-width="5"/>
    <ellipse cx="-14" cy="56" rx="16" ry="8" fill="${l.accent}"/><ellipse cx="18" cy="56" rx="16" ry="8" fill="${l.accent}"/>
    ${body}
    <ellipse cx="-14" cy="-12" rx="11" ry="13" fill="#fff" stroke="#333" stroke-width="1.5"/><ellipse cx="14" cy="-12" rx="11" ry="13" fill="#fff" stroke="#333" stroke-width="1.5"/>
    <circle cx="-11" cy="-10" r="5" fill="#2a6bd1"/><circle cx="17" cy="-10" r="5" fill="#2a6bd1"/>
    <circle cx="-11" cy="-10" r="2.2" fill="#000"/><circle cx="17" cy="-10" r="2.2" fill="#000"/>
    <ellipse cx="2" cy="4" rx="7" ry="6" fill="${l.shape === 'block' ? '#f5a623' : '#e8a020'}"/>
    <path d="M-18 16 Q2 34 22 16" fill="#7a1f1f" stroke="#5a1010" stroke-width="2"/>
    <path d="M-10 18 h8 v5 h-8z M2 18 h8 v5 h-8z" fill="#fff"/>
    ${patch}${hat}${extra}
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
  return `<svg viewBox="-32 -32 64 64" class="item" role="img" aria-label="${itemName(id)}"><title>${itemName(id)}</title>${iconFor(id)}</svg>`;
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
