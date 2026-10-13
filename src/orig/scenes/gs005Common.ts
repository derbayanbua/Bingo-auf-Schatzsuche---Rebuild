// Shared helpers for the GS005-05 / GS005-06 ports (Game screens of the lighthouse/diving part).
// Not a scene by itself (registers nothing).
//
// Original Interface behaviours ported locally (sprites 101-109 live in the status bar, which the
// scene view does not show):
//   * "Inventar Game Preference" (Shared/Lingo 82): slot OS<ch> passiv = blend 50; dropping item pId
//     -> activ (item consumed, #stayHere). Clicking an active slot takes the item out again
//     (original: into the hand; here: back into the pocket [Prüfung erforderlich: Hand-API fehlt]).
//   * "Taster Start" (Shared/Interface 50): Game-Start when all slots != passiv (go(#next)), else
//     Game-Back (back to gGameBackMovie). mouseDown "Splash".
//   * "Taster Stop" (53): mouseDown "Splash", mouseUp -> back to gGameBackMovie via
//     jumpToCurrentCharacter() (= gExitFlag, so the local frame scripts can intercept it).
//   * "Rollover Fader": blend 50 / 100 on hover.

import type { OrigScene } from '../sceneView';

export type GameButton = 'Game-Back' | 'Game-Start' | 'Game-Stop' | 'Game-Ready';

/** an absolutely positioned element in stage coordinates (800x448 scene space, y = stage y - 45) */
export function overlay(scene: OrigScene, tag: string, x: number, y: number, w: number, h: number, css = ''): HTMLElement {
  const el = document.createElement(tag);
  el.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;z-index:300;${css}`;
  // keep the stage hit test away from overlay controls
  for (const ev of ['pointerdown', 'pointerup', 'pointermove', 'click']) el.addEventListener(ev, (e) => e.stopPropagation());
  scene.stage.inner.append(el);
  return el;
}

/** hide the generic engine "Zurück" object of GS scenes (replaced by the original Taster) */
export function hideGenericBack(scene: OrigScene) {
  const st = document.createElement('style');
  st.textContent = '.ostage-svg [data-key="_exit"]{display:none}.ostage-a11y button[aria-label="Spiel verlassen"]{display:none}';
  scene.el.append(st);
  // the scene is ported: drop the app's "[Prüfung erforderlich] not implemented" note of this mount
  requestAnimationFrame(() => scene.el.parentElement?.querySelector(':scope > .scene-note')?.remove());
}

/**
 * Taster (sprite 109) drawn in the bottom right of the scene with the original member graphics.
 * onClick receives the member shown at click time.
 */
export function gameButton(scene: OrigScene, onClick: (m: GameButton) => void) {
  const img = overlay(scene, 'img', 712, 350, 80, 96, 'cursor:pointer;opacity:.5;transition:opacity .1s') as HTMLImageElement;
  img.draggable = false;
  img.setAttribute('role', 'button');
  img.tabIndex = 0;
  let cur: GameButton | null = null;
  const label: Record<GameButton, string> = { 'Game-Back': 'Zurück', 'Game-Start': 'Spiel starten', 'Game-Stop': 'Spiel beenden', 'Game-Ready': 'Fertig' };
  const set = (m: GameButton) => {
    if (m === cur) return;
    cur = m;
    const ref = scene.member(m);
    if (ref?.url) img.src = ref.url;
    img.alt = img.title = label[m];
    img.setAttribute('aria-label', label[m]);
  };
  img.addEventListener('pointerenter', () => (img.style.opacity = '1'));
  img.addEventListener('pointerleave', () => (img.style.opacity = '.5'));
  img.addEventListener('pointerdown', () => {
    if (!scene.busy) void scene.sound('Splash', 100);
  });
  const fire = () => {
    if (scene.busy || scene.hand || !cur) return;
    onClick(cur);
  };
  img.addEventListener('click', fire);
  img.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      void scene.sound('Splash', 100);
      fire();
    }
  });
  return {
    set,
    get member() {
      return cur;
    },
    el: img,
  };
}

/** Inventar Game Preference slots (101-107) on the Intro frame; returns checkPrefs() */
export function prefSlots(scene: OrigScene): () => boolean {
  const slots: { ch: number; id: string }[] = [];
  for (let ch = 101; ch <= 107; ch++) {
    if (!scene.stage.has(ch)) continue;
    const sp = scene.sprite(ch);
    const id = String(sp.behavior('Inventar Game Preference')?.params?.pId ?? sp.name);
    slots.push({ ch, id });
    const key = `OS${ch}`;
    // loadData: missing line -> activ
    if (scene.state.get(key) === undefined) scene.state.set(key, 'activ');
    const show = () => (sp.blend = scene.state.get(key) === 'passiv' ? 50 : 100);
    show();
    sp.hot = true;
    sp.cursor = 'take';
    scene.off(ch);
    scene.on(ch, 'mouseUp', () => {
      if (scene.busy) return;
      const st = scene.state.get(key);
      if (scene.hand) {
        if (st === 'passiv' && scene.hand === id) {
          scene.consumeHand();
          scene.state.set(key, 'activ');
          void scene.sound(`${id}-Sound`, 100); // inventarSound(#stayHere)
          show();
          scene.sync();
        }
        return;
      }
      if (st === 'activ') {
        // original: item goes into the hand (sprite 110); here back into the pocket
        if (scene.ctx.give(id)) {
          scene.state.set(key, 'passiv');
          show();
          scene.sync();
        }
      }
    });
  }
  return () => slots.every((s) => scene.state.get(`OS${s.ch}`) !== 'passiv');
}

export const rnd = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));
