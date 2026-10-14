// AS005-07 "Leuchtturm" secret passage: fuse box on the left wall with three fuses (OS018 ×3, items),
// call button (Ruftaster 204,201), lift basket coming down (Aufzug, loc 423,-5), pipe end in front (Composing 532,3).
import { defineMovie } from '../lib/api';
import { itemShape } from '../lib/items';
import { callButton, liftBasket } from '../lib/lift';
import { rockTunnel } from '../lib/cave';
import { inScene } from '../lib/stageloc';
import { circle, ellipse, g, path, r2, rect } from '../lib/svg';
import { headline } from '../lib/ui';

const PIPE = '#e0c060', PIPE_D = '#8a7020';

function pipe(x0: number, y0: number, x1: number, y1: number, r: number): string {
  return path(`M${x0} ${y0} L${x1} ${y1}`, { stroke: PIPE_D, strokeWidth: 2 * r + 6, strokeLinecap: 'butt' }) +
    path(`M${x0} ${y0} L${x1} ${y1}`, { stroke: PIPE, strokeWidth: 2 * r, strokeLinecap: 'butt' }) +
    path(`M${x0} ${y0 - r * 0.45} L${x1} ${y1 - r * 0.45}`, { stroke: '#fff0b0', strokeWidth: r * 0.35, opacity: 0.7 });
}
const flange = (x: number, y: number, rx: number, ry: number) => ellipse(x, y, rx, ry, { fill: '#c8ccd2', stroke: '#5a5f68', strokeWidth: 4 }) +
  [0, 1, 2, 3, 4, 5].map((i) => circle(x + Math.cos(i * 1.05) * rx * 0.8, y + Math.sin(i * 1.05) * ry * 0.8, 3, { fill: '#5a5f68' })).join('');

function background(): string {
  let s = rockTunnel(71, 420, 220);
  // fuse box with three sockets (fuses are items)
  s += rect(18, 186, 104, 64, { rx: 6, fill: '#8a8f99', stroke: '#2a2c33', strokeWidth: 4 });
  for (const x of [54, 82, 106]) s += circle(x, 220, 12, { fill: '#2a2c33' });
  s += path('M70 250 C70 300 40 330 60 448', { fill: 'none', stroke: '#3a3d44', strokeWidth: 5 }) + path('M226 222 C240 280 290 300 300 340', { fill: 'none', stroke: '#3a3d44', strokeWidth: 3 });
  // pipes (upper right); the lower end flange in front of the lift is the Composing sprite
  s += pipe(566, 168, 800, 30, 32) + flange(566, 168, 34, 44);
  s += pipe(620, 250, 800, 270, 26) + flange(612, 250, 26, 36);
  return s;
}

const fuse = (w: number, h: number) => g({ transform: `translate(${w / 2} ${h / 2}) scale(${r2(w / 52)})` }, itemShape('OI018'));

export default defineMovie({
  Headline: (m, w, h) => headline('Leuchtturm', w, h),
  Background: () => background(),
  '#3': (m, w, h) => fuse(w, h), '#4': (m, w, h) => fuse(w, h), '#5': (m, w, h) => fuse(w, h),
  Ruftaster: (m, w, h) => callButton(w, h),
  Aufzug: (m, w, h) => liftBasket(w, h, { basketH: 110 }),
  Composing: (m) => inScene(m, pipe(566, 168, 640, 124, 32) + flange(566, 168, 34, 44)),
});
