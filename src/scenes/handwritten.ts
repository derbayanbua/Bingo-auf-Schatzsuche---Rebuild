// Hand-ported scene-specific logic (local Lingo scripts of the individual movies).
// Each patch extends the generic definition generated from the original score.

import type { SceneDef, SceneObject } from './engine';
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

export function registerHandwrittenScenes() {
  SCENE_PATCHES['AS001-02'] = patchAS001_02;
  // Witzomat AS006/AS048: ported with the original graphics in src/orig/scenes/witzomat.ts
}

export { obj };
