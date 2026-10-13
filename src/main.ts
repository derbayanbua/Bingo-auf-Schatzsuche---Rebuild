import './styles.css';
import { App } from './app';
import { registerHandwrittenScenes } from './scenes/handwritten';
import { registerGenericScenes } from './scenes/generic';

registerHandwrittenScenes();
registerGenericScenes();

const root = document.getElementById('app')!;
(window as any).bingo = new App(root);
