// Hand-ported scene-specific logic (local Lingo scripts of the individual movies).
// Each patch extends the generic definition generated from the original score.

import type { SceneCtx, SceneDef, SceneObject } from './engine';
import { SCENE_PATCHES } from './generic';

function obj(def: SceneDef, key: string): SceneObject | undefined {
  return def.objects.find((o) => o.key === key);
}

/** AS001-02 startMovie: the window closes once nobody is inside the house any more. */
function patchAS001_02(def: SceneDef) {
  def.reconstructed = true;
  def.onEnter = (ctx) => {
    if (ctx.get('PLAYER') !== 'windowClosing') return;
    if (ctx.s.chars.CH1.screen === 'AS001-01' || ctx.s.chars.CH2.screen === 'AS001-01') return;
    if ((ctx.get('OH1') ?? 'state1') === 'state2') {
      ctx.set('OH1', 'state1');
      ctx.set('OH1', 'state1', 'AS001-01');
      ctx.set('PLAYER', 'none');
      ctx.say('Huch – der Wind hat das Fenster zugeschlagen!');
      ctx.rerender();
    }
  };
  // Glocke (One-State Handling): decorative bell
  const bell = def.objects.find((o) => o.label.startsWith('Glocke'));
  if (bell) {
    bell.label = 'Türglocke';
    bell.onClick = (ctx) => (ctx.say('Ding-dong!'), true);
    bell.draw = () => `<g transform="translate(${bell.x + bell.w / 2} ${bell.y + 30})"><path d="M-18 30 q0 -34 18 -34 q18 0 18 34z" fill="#e0b42c" stroke="#8a6d00" stroke-width="3"/><circle cy="34" r="5" fill="#8a6d00"/></g>`;
  }
}

/**
 * Witzomat (AS006-02 / AS048-02): pull the lever -> the flap opens -> click the flap -> a joke card
 * comes out and can be taken. Disabled ("Message") when getJokes(#CH1)+getJokes(#CH2) >= 10.
 * original: getJokes() ignores its argument and reads the current character twice, so the machine
 * stops at 5 jokes of the current character. This quirk is kept.
 */
function patchWitzomat(def: SceneDef) {
  def.reconstructed = true;
  const jokesBlocked = (ctx: SceneCtx) => ctx.s.chars[ctx.ch].jokes * 2 >= 10;
  let flap: 'closed' | 'ready' | 'card' = 'closed';
  def.onEnter = () => {
    flap = 'closed';
  };
  def.objects.push(
    {
      key: 'HEBEL', kind: 'deco', x: 688, y: 12, w: 60, h: 213, label: 'Hebel ziehen',
      draw: (ctx) => `<g><rect x="706" y="20" width="14" height="200" rx="7" fill="#7a7f8a"/><circle cx="713" cy="${flap === 'closed' ? 30 : 120}" r="22" fill="#d9534f" stroke="#7a1010" stroke-width="3"/></g>`,
      onClick: (ctx) => {
        if (jokesBlocked(ctx)) {
          ctx.say('Der Witzomat ist leer. Erst mal ein paar Witze verbrauchen!');
          return true;
        }
        if (flap === 'closed') flap = 'ready';
        return true;
      },
    },
    {
      key: 'KLAPPE', kind: 'deco', x: 603, y: 296, w: 66, h: 94, label: 'Kartenschacht',
      draw: () => `<g><rect x="603" y="296" width="66" height="94" rx="8" fill="#3b4b6b" stroke="#1d2840" stroke-width="3"/>
        <rect x="611" y="${flap === 'closed' ? 304 : 330}" width="50" height="${flap === 'closed' ? 78 : 52}" rx="4" fill="${flap === 'closed' ? '#6b7da3' : '#1d2840'}"/>
        ${flap === 'card' ? `<rect x="618" y="318" width="36" height="46" rx="5" fill="#fff" stroke="#2f73d8" stroke-width="3"/><text x="636" y="348" text-anchor="middle" font-size="20">😄</text>` : ''}</g>`,
      onClick: (ctx) => {
        if (flap === 'ready') {
          flap = 'card';
          return true;
        }
        if (flap === 'card') {
          ctx.addJokes(1);
          flap = 'closed';
          ctx.say('Eine neue Witzkarte!');
          return true;
        }
        ctx.say('Die Klappe ist zu. Vielleicht muss man am Hebel ziehen?');
        return true;
      },
    },
    {
      key: 'MESSAGE', kind: 'deco', x: 481, y: 6, w: 109, h: 37, label: 'Anzeige',
      visible: jokesBlocked,
      draw: () => `<g><rect x="470" y="6" width="130" height="37" rx="8" fill="#c0392b"/><text x="535" y="31" text-anchor="middle" font-size="16" font-weight="700" fill="#fff">LEER</text></g>`,
    },
  );
  const old = def.backdrop;
  def.backdrop = (ctx) => old(ctx) + `<g><rect x="560" y="0" width="210" height="400" rx="20" fill="#f08a24" stroke="#8a4a12" stroke-width="5"/><text x="665" y="70" text-anchor="middle" font-size="26" font-weight="800" fill="#fff">WITZ-</text><text x="665" y="100" text-anchor="middle" font-size="26" font-weight="800" fill="#fff">OMAT</text><circle cx="665" cy="190" r="50" fill="#ffd23f" stroke="#8a4a12" stroke-width="4"/><text x="665" y="205" text-anchor="middle" font-size="44">😄</text></g>`;
}

/** Witzomat outside: the hotspot opens the machine (Hotspot Witzomat). */
function patchWitzomatOutside(target: string) {
  return (def: SceneDef) => {
    def.reconstructed = true;
    def.objects.push({
      key: 'HS1', kind: 'exit', x: 210, y: 300, w: 70, h: 70, label: 'Zum Witzomaten', to: target,
      draw: () => `<g transform="translate(245 300)"><rect x="-40" y="-120" width="80" height="150" rx="14" fill="#f08a24" stroke="#8a4a12" stroke-width="4"/><text y="-60" text-anchor="middle" font-size="34">😄</text><text y="-20" text-anchor="middle" font-size="13" font-weight="800" fill="#fff">WITZOMAT</text></g>`,
    });
  };
}

export function registerHandwrittenScenes() {
  SCENE_PATCHES['AS001-02'] = patchAS001_02;
  SCENE_PATCHES['AS006-02'] = patchWitzomat;
  SCENE_PATCHES['AS048-02'] = patchWitzomat;
  SCENE_PATCHES['AS006-01'] = patchWitzomatOutside('AS006-02');
  SCENE_PATCHES['AS048-01'] = patchWitzomatOutside('AS048-02');
}

export { obj };
