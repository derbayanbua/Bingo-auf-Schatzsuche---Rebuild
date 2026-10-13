import './styles.css';
import { App } from './app';
import { loadGfxIndex } from './orig/gfx';
import { registerHandwrittenScenes } from './scenes/handwritten';
import { registerGenericScenes } from './scenes/generic';

registerHandwrittenScenes();
registerGenericScenes();

const root = document.getElementById('app')!;
// optional original graphics (public/orig/gfx, private use); the game works without them
void loadGfxIndex().finally(() => {
  (window as any).bingo = new App(root);
});
