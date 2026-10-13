// Builds scene definitions from data/scenes.json (generated from the original scores by
// tools/gen_scenes.py): every generic behaviour becomes an interactive object at its original
// position. Backdrops are drawn procedurally (own artwork).

import raw from '../data/scenes.json';
import { itemSVG, portraitSVG } from '../ui/art';
import { registerScene, getScene, type SceneCtx, type SceneDef, type SceneObject } from './engine';
import { sceneTheme, sceneTitle, type Theme } from './meta';

/** Hand-ported scene logic hooks (see handwritten.ts), applied on top of the generic definition. */
export const SCENE_PATCHES: Record<string, (def: SceneDef, raw: RawScene) => void> = {};

interface RawObj {
  ch: number; x: number; y: number; w: number; h: number; label: string; kind: string; key: string;
  item?: string; to?: string; back?: string; board?: { board: string; pos: number; dir: number };
  handling?: string; hides?: string; lockItem?: string; link?: { screen: string; key: string };
  remote?: boolean; invLink?: { screen: string; key: string }; clickable?: boolean;
}
export interface RawScene {
  objects: RawObj[];
  custom: { ch: number; behavior: string; label: string; x: number; y: number; w: number; h: number }[];
  chars: Record<string, { x: number; y: number; w: number; h: number }>;
}
export const RAW_SCENES = raw as unknown as Record<string, RawScene>;

const LABELS: Record<string, string> = {
  Window: 'Fenster', Door: 'Tür', Tuer: 'Tür', Klappe: 'Klappe', Luke: 'Luke', Ofen: 'Ofen',
};
function niceLabel(o: RawObj): string {
  const base = LABELS[o.label] ?? o.label;
  switch (o.kind) {
    case 'exit': return /^(Window|Door|Fenster|Tür)$/.test(o.label) ? `Durch ${base === 'Fenster' ? 'das Fenster' : 'die Tür'} gehen` : `Weiter: ${base || 'Ausgang'}`;
    case 'game': return `Spiel: ${o.to ? sceneTitle(o.to) : base}`;
    case 'boardExit': return 'Zurück aufs Spielfeld';
    default: return base || 'Objekt';
  }
}

// ------------------------------------------------------------------ backdrops

const PAL: Record<Theme, { sky: string; wall: string; floor: string; accent: string }> = {
  house: { sky: '#f6e3a8', wall: '#f3d98b', floor: '#b07a45', accent: '#c0392b' },
  outdoor: { sky: '#9fd6f5', wall: '#7cc05a', floor: '#cfb27c', accent: '#d9534f' },
  pub: { sky: '#6b3f22', wall: '#8a5631', floor: '#5a3418', accent: '#f4c542' },
  lighthouse: { sky: '#dfe9f2', wall: '#e9e2d4', floor: '#8c8577', accent: '#c0392b' },
  cellar: { sky: '#3a3f4a', wall: '#565c69', floor: '#3b3530', accent: '#f4a742' },
  villa: { sky: '#f3e6f0', wall: '#e6c9dc', floor: '#9a6b8a', accent: '#d4af37' },
  beach: { sky: '#8fd3f7', wall: '#2f9fd6', floor: '#f1dc9f', accent: '#ff7f50' },
  sea: { sky: '#0f4d7a', wall: '#14608f', floor: '#c9b77a', accent: '#5fd1c1' },
  ship: { sky: '#a8dcf7', wall: '#2f86c5', floor: '#a8743e', accent: '#f4f4f4' },
  cabin: { sky: '#7a4f2a', wall: '#9a6638', floor: '#6e4422', accent: '#f4c542' },
  jungle: { sky: '#bfe8c5', wall: '#3f8f3a', floor: '#7a5a2a', accent: '#f08a24' },
  desert: { sky: '#ffd99a', wall: '#e8b864', floor: '#e3c27a', accent: '#c0392b' },
  cave: { sky: '#2c2a33', wall: '#4b4552', floor: '#6b5a48', accent: '#7fd3ff' },
  treasure: { sky: '#2b1d3a', wall: '#4b2f63', floor: '#6b4a2a', accent: '#ffd23f' },
  game: { sky: '#203a6b', wall: '#2c4f8f', floor: '#16284d', accent: '#ffd23f' },
};

export function backdrop(id: string): string {
  const t = sceneTheme(id);
  const p = PAL[t];
  const indoor = ['house', 'pub', 'lighthouse', 'cellar', 'villa', 'cabin', 'game', 'treasure'].includes(t);
  if (indoor) {
    const planks = Array.from({ length: 12 }, (_, i) => `<line x1="${i * 70}" y1="330" x2="${i * 70 - 60}" y2="448" stroke="rgba(0,0,0,.18)" stroke-width="3"/>`).join('');
    return `<defs><linearGradient id="wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.sky}"/><stop offset="1" stop-color="${p.wall}"/></linearGradient>
      <radialGradient id="glow" cx=".5" cy=".3" r=".7"><stop offset="0" stop-color="rgba(255,255,220,.35)"/><stop offset="1" stop-color="rgba(0,0,0,0)"/></radialGradient></defs>
      <rect width="800" height="448" fill="url(#wall)"/>
      <rect y="330" width="800" height="118" fill="${p.floor}"/>${planks}
      <rect y="322" width="800" height="10" fill="rgba(0,0,0,.18)"/>
      ${t === 'house' || t === 'pub' || t === 'cabin' ? Array.from({ length: 9 }, (_, i) => `<rect x="${i * 92 + 10}" y="0" width="12" height="322" fill="rgba(90,50,20,.25)"/>`).join('') : ''}
      ${t === 'cellar' || t === 'cave' ? Array.from({ length: 40 }, (_, i) => `<ellipse cx="${(i * 97) % 800}" cy="${(i * 53) % 320}" rx="30" ry="14" fill="rgba(255,255,255,.05)"/>`).join('') : ''}
      ${t === 'treasure' ? Array.from({ length: 30 }, (_, i) => `<circle cx="${(i * 131) % 800}" cy="${(i * 71) % 300}" r="2" fill="#ffd23f" opacity=".6"/>`).join('') : ''}
      <rect width="800" height="448" fill="url(#glow)"/>`;
  }
  // outdoor themes: sky, horizon, ground
  const horizon = t === 'beach' || t === 'ship' ? 210 : t === 'sea' ? 0 : 240;
  const extras =
    t === 'beach' || t === 'ship'
      ? `<rect y="${horizon - 40}" width="800" height="60" fill="${p.wall}"/>${Array.from({ length: 8 }, (_, i) => `<path d="M${i * 110} ${horizon} q25 -10 50 0 t50 0" fill="none" stroke="#fff" stroke-width="3" opacity=".6"/>`).join('')}`
      : t === 'jungle'
        ? Array.from({ length: 14 }, (_, i) => `<g transform="translate(${i * 60 + 10} ${horizon - 20})">${[0, 50, 100, 150, 200, 250, 300].map((a) => `<path d="M0 0 Q14 -24 0 -60 Q-14 -24 0 0" transform="rotate(${a})" fill="#2f7a35" opacity=".85"/>`).join('')}</g>`).join('')
        : t === 'desert'
          ? `<path d="M0 ${horizon} q200 -60 400 0 t400 0 v40 h-800z" fill="#d9a854"/>`
          : t === 'sea'
            ? Array.from({ length: 20 }, (_, i) => `<circle cx="${(i * 89) % 800}" cy="${(i * 47) % 400}" r="${4 + (i % 4)}" fill="none" stroke="#bfefff" opacity=".4"/>`).join('')
            : `<circle cx="680" cy="70" r="40" fill="#fff3a6"/><ellipse cx="200" cy="80" rx="80" ry="22" fill="#fff" opacity=".8"/><ellipse cx="420" cy="50" rx="60" ry="16" fill="#fff" opacity=".7"/>`;
  return `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.sky}"/><stop offset="1" stop-color="#ffffff"/></linearGradient></defs>
    <rect width="800" height="448" fill="url(#sky)"/>
    ${extras}
    <rect y="${horizon}" width="800" height="${448 - horizon}" fill="${t === 'sea' ? 'rgba(0,0,0,0)' : p.floor}"/>
    ${t === 'ship' ? Array.from({ length: 10 }, (_, i) => `<line x1="0" y1="${horizon + 20 + i * 24}" x2="800" y2="${horizon + 20 + i * 24}" stroke="rgba(0,0,0,.15)" stroke-width="2"/>`).join('') : ''}
    ${t === 'sea' ? `<rect y="380" width="800" height="68" fill="${p.floor}"/>` : ''}`;
}

// ------------------------------------------------------------------ object art

function twoStateArt(o: RawObj, st?: string): string {
  const { x, y, w, h } = o;
  const open = st === 'state2';
  const locked = st === 'blocked';
  if (/Door|Tür|Tuer/i.test(o.label)) {
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="#3b2412"/>
      ${open
        ? `<path d="M${x} ${y} l${w * 0.35} ${h * 0.06} v${h * 0.88} l${-w * 0.35} ${h * 0.06}z" fill="#9a6034" stroke="#5a3418" stroke-width="3"/><rect x="${x + 4}" y="${y + 4}" width="${w - 8}" height="${h - 4}" fill="rgba(255,240,180,.25)"/>`
        : `<rect x="${x + 3}" y="${y + 3}" width="${w - 6}" height="${h - 3}" rx="5" fill="#a8693a" stroke="#5a3418" stroke-width="3"/><rect x="${x + w * 0.15}" y="${y + h * 0.1}" width="${w * 0.7}" height="${h * 0.3}" rx="4" fill="none" stroke="#5a3418" stroke-width="2"/><rect x="${x + w * 0.15}" y="${y + h * 0.5}" width="${w * 0.7}" height="${h * 0.35}" rx="4" fill="none" stroke="#5a3418" stroke-width="2"/><circle cx="${x + w * 0.82}" cy="${y + h * 0.5}" r="5" fill="#f4c542"/>`}
      ${locked ? `<g transform="translate(${x + w * 0.82} ${y + h * 0.5 + 18})"><rect x="-8" y="-2" width="16" height="13" rx="2" fill="#f4c542"/><path d="M-5 -2 v-5 a5 5 0 0 1 10 0 v5" fill="none" stroke="#f4c542" stroke-width="3"/></g>` : ''}`;
  }
  if (/Window|Fenster/i.test(o.label)) {
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="${open ? '#bfe6ff' : '#7fbfe8'}" stroke="#6b4518" stroke-width="6"/>
      ${open
        ? `<path d="M${x} ${y} l${-w * 0.18} ${h * 0.1} v${h * 0.8} l${w * 0.18} ${h * 0.1}z M${x + w} ${y} l${w * 0.18} ${h * 0.1} v${h * 0.8} l${-w * 0.18} ${h * 0.1}z" fill="#9fd3f5" stroke="#6b4518" stroke-width="4"/>`
        : `<line x1="${x + w / 2}" y1="${y}" x2="${x + w / 2}" y2="${y + h}" stroke="#6b4518" stroke-width="5"/><line x1="${x}" y1="${y + h / 2}" x2="${x + w}" y2="${y + h / 2}" stroke="#6b4518" stroke-width="4"/>`}`;
  }
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="${open ? 'rgba(255,255,255,.35)' : 'rgba(120,80,40,.55)'}" stroke="#5a3418" stroke-width="3"/>
    <text x="${x + w / 2}" y="${y + h / 2 + 6}" text-anchor="middle" font-size="16" fill="#fff">${open ? 'offen' : locked ? '🔒' : 'zu'}</text>`;
}

function charsArt(ctx: SceneCtx, id: string, sc: RawScene): string {
  let out = '';
  for (const ch of ['CH1', 'CH2'] as const) {
    if (ctx.s.chars[ch].screen !== id) continue;
    const r = sc.chars[ch] ?? { x: ch === 'CH1' ? 250 : 420, y: 200, w: 130, h: 200 };
    const svg = portraitSVG(ch).replace('<svg ', `<svg x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" `);
    out += `<g class="scene-char${ctx.ch === ch ? ' active' : ''}">${svg}</g>`;
  }
  return out;
}

// ------------------------------------------------------------------ build

function buildObjects(id: string, sc: RawScene): SceneObject[] {
  return sc.objects
    .filter((o) => !(o.kind === 'twoState' && o.remote && !o.lockItem) || true)
    .map((o): SceneObject => {
      const base: SceneObject = {
        key: o.key, kind: (o.kind === 'pref' ? 'use' : o.kind) as SceneObject['kind'],
        x: o.x, y: o.y, w: Math.max(o.w, 30), h: Math.max(o.h, 30), label: niceLabel(o),
        item: o.item, to: o.to, board: o.board, handling: o.handling, hides: o.hides, lockItem: o.lockItem, link: o.link,
      };
      if (o.kind === 'twoState') {
        base.draw = (_c, st) => twoStateArt(o, st);
        if (o.remote) base.onClick = (ctx) => (ctx.say('Das bewegt sich nicht.'), true);
      }
      if (o.kind === 'game' && o.back) {
        const back = o.back;
        const to = o.to!;
        base.onClick = (ctx) => {
          ctx.set('_back', back, to);
          ctx.gotoScene(to);
          return true;
        };
      }
      if (o.kind === 'item' && o.invLink) {
        // Inventar-Link: the state is mirrored into the linked screen (engine `link`)
        base.link = o.invLink;
      }
      if (o.kind === 'pref') {
        // Inventar Game Preference: required item slot of a game screen (OS<ch>, missing = activ)
        base.label = `Benötigter Gegenstand: ${o.item ?? ''}`;
        const st = (ctx: SceneCtx) => (ctx.get(o.key) ?? 'activ').toLowerCase();
        base.draw = (ctx) => `<g transform="translate(${o.x + o.w / 2} ${o.y + o.h / 2})" opacity="${st(ctx) === 'passiv' ? 0.5 : 1}"><circle r="34" fill="rgba(255,255,255,.15)" stroke="#ffd23f" stroke-width="3" stroke-dasharray="6 5"/>${o.item ? itemSVG(o.item).replace('<svg ', '<svg x="-28" y="-28" width="56" height="56" ') : ''}</g>`;
        base.onUse = (ctx, item) => {
          // mouseUp: passiv + pId -> activ (#stayHere); anything else #aboutToReturn
          if (st(ctx) !== 'passiv' || item !== o.item) return false;
          ctx.set(o.key, 'activ');
          return true;
        };
        base.onClick = (ctx) => {
          // mouseDown on an active slot: the item goes back into the hand
          if (st(ctx) !== 'activ' || !o.item) return true;
          ctx.set(o.key, 'passiv');
          ctx.putInHand(o.item, { key: o.key, screen: id });
          return true;
        };
      }
      if (o.kind === 'box') {
        // Box (Shared 17) for the vector view; the original view has the full box (sceneView.ts)
        base.label = 'Kiste';
        base.onClick = (ctx) => {
          const st = ctx.get('BOX0') ?? 'state1';
          if (st === 'blocked') { ctx.say('Die Kiste klemmt.'); return true; }
          // take the first item out (into the hand; it returns to its place when not used)
          for (let i = 1; i <= 8; i++) {
            const it = ctx.get(`BOX${i}`) ?? 'OI000';
            if (it === 'OI000') continue;
            ctx.set(`BOX${i}`, 'OI000');
            ctx.putInHand(it, { key: `BOX${i}`, screen: id, value: it });
            return true;
          }
          ctx.say('Die Kiste ist leer.');
          return true;
        };
        base.onUse = (ctx, item) => {
          if ((ctx.get('BOX0') ?? 'state1') === 'blocked') {
            if (item === o.lockItem) {
              ctx.set('BOX0', 'state1');
              ctx.say('Krach! Die Kiste ist auf.');
            }
            return false;
          }
          // put it into the first free place
          for (let i = 1; i <= 8; i++) {
            if ((ctx.get(`BOX${i}`) ?? 'OI000') === 'OI000') {
              ctx.set(`BOX${i}`, item);
              return true;
            }
          }
          return false;
        };
        base.draw = () => `<rect x="${o.x}" y="${o.y}" width="${o.w}" height="${o.h}" rx="8" fill="#8a5a2b" stroke="#4a2a10" stroke-width="4"/><rect x="${o.x}" y="${o.y + o.h * 0.3}" width="${o.w}" height="8" fill="#c9a24a"/>`;
      }
      if (o.kind === 'deco' && o.clickable) {
        base.kind = 'deco';
      }
      return base;
    });
}

export function registerGenericScenes() {
  for (const [id, sc] of Object.entries(RAW_SCENES)) {
    if (getScene(id)) continue; // hand-written definitions win
    const objects = buildObjects(id, sc);
    const isGame = id.startsWith('GS');
    const def: SceneDef = {
      id,
      title: sceneTitle(id),
      // only generic behaviours -> nothing left to port
      reconstructed: sc.custom.length === 0,
      note: isGame
        ? 'Dieses Minispiel ist noch nicht umgesetzt. Ausgänge und benötigte Gegenstände sind aus dem Original übernommen.'
        : sc.custom.length
          ? `Szenenspezifische Abläufe (${[...new Set(sc.custom.map((c) => c.behavior))].slice(0, 4).join(', ')}) sind noch nicht portiert.`
          : undefined,
      backdrop: () => backdrop(id) + customPlaceholders(sc),
      overlay: (ctx) => charsArt(ctx, id, sc),
      objects: isGame ? [...objects, gameBackExit(id)] : objects,
    };
    SCENE_PATCHES[id]?.(def, sc);
    registerScene(def);
  }
}

function customPlaceholders(sc: RawScene): string {
  // show where original scene-specific actors/objects are (not yet interactive)
  return sc.custom
    .filter((c) => c.w > 20 && c.h > 20 && c.w < 700)
    .map((c) => `<g class="custom-ph"><rect x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}" rx="10"/><text x="${c.x + c.w / 2}" y="${c.y + c.h / 2 + 5}" text-anchor="middle">${escapeXml(c.label || c.behavior)}</text></g>`)
    .join('');
}

function gameBackExit(id: string): SceneObject {
  return {
    key: '_exit', kind: 'exit', x: 690, y: 380, w: 100, h: 56, label: 'Spiel verlassen',
    draw: () => `<g transform="translate(740 408)"><rect x="-50" y="-26" width="100" height="52" rx="14" fill="#ffd23f" stroke="#8a6d00" stroke-width="3"/><text y="6" text-anchor="middle" font-size="16" font-weight="700" fill="#3a2a00">Zurück</text></g><rect x="690" y="380" width="100" height="56" rx="10" class="hit"/>`,
    onClick: (ctx) => {
      const back = ctx.get('_back') ?? RAW_SCENES[id]?.objects.find((o) => o.kind === 'game')?.back;
      const from = back ?? Object.entries(RAW_SCENES).find(([, s]) => s.objects.some((o) => o.to === id))?.[0];
      if (from) ctx.gotoScene(from);
      return true;
    },
  };
}

function escapeXml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
}


