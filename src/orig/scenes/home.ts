// AS001-01 / AS001-02 – Bingos Haus (start of chapter 1).
// AS001-01: no scene-specific Lingo besides showInventar/SmackClose; window + door (Two-State
// Handling with links to AS001-02), Blocker OI009, items, Hotspot-GS -> GS001-01 (Flaschenpost-
// Puzzle, back AS001-01) and the Karte OS20 (Inventar-Link GS001-01/OS30) are generic behaviours.
// AS001-02 startMovie: the window closes once (state handled in scenes/handwritten.ts onEnter);
// the original plays quickSound("Global-Window-2") – the window's own Two-State Audio parameters
// are member refs (c6 m3/m4) the generic view cannot play, so the sound is played here.

import { registerOrigScene } from '../sceneView';

registerOrigScene('AS001-02', (scene) => {
  const chars = scene.ctx.s.chars;
  if (
    (scene.state.get('PLAYER') ?? '').toLowerCase() === 'windowclosing' &&
    chars.CH1.screen !== 'AS001-01' &&
    chars.CH2.screen !== 'AS001-01' &&
    (scene.state.get('OH1') ?? 'state1') === 'state2'
  ) {
    void scene.sound('Global-Window-2', 100);
  }
});
