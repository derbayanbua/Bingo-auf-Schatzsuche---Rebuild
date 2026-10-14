// AS001-01 "Bongos Wohnzimmer" – reference scene for the look (approved Stube design).
// Sprite rectangles (scene coordinates = stage y - 45): Door 169,71 143x265 · Window 512,56 183x142 ·
// Pendel 400,120 25x86 · Bodenvase 130,292 · Teller 490,249 · Eintrittskarte 519,257 · Karte 661,242 ·
// Composing 295,288 236x74 (in front of Bongo/Pucki) · GS001-01 hotspot 574,204 32x39 (ship in a bottle).
import { defineMovie } from '../lib/api';
import { chair, doorFrames, pendulum, picture, table, windowFrames } from '../lib/house';
import { itemShape } from '../lib/items';
import { C, circle, defs, dk, ellipse, g, line, linGrad, path, rect } from '../lib/svg';
import { woodPattern } from '../lib/textures';
import { headline } from '../lib/ui';

function background(w: number, h: number): string {
  let s = defs(linGrad('wall', [[0, C.wall], [1, C.wallDark]]), woodPattern('floor', { base: C.floor, dark: C.floorDark, plank: 26 }));
  s += rect(0, 0, w, h, { fill: 'url(#wall)' });
  // timber framing
  s += g({ stroke: C.beam, strokeWidth: 12, opacity: 0.55, strokeLinecap: 'round' },
    line(0, 34, 800, 34), line(100, 34, 100, 330), line(350, 34, 350, 330), line(470, 34, 470, 330), line(745, 34, 745, 330),
    line(0, 200, 160, 200), line(320, 200, 370, 200), line(455, 210, 505, 210), line(100, 120, 160, 60), line(745, 120, 800, 70));
  // floor
  s += rect(0, 330, w, h - 330, { fill: 'url(#floor)' });
  s += rect(0, 322, w, 12, { fill: C.woodMid }) + line(0, 334, 800, 334, { stroke: C.woodDeep, strokeWidth: 2 });
  // rug
  s += ellipse(420, 400, 230, 32, { fill: '#2f6fd8', opacity: 0.9 }) + ellipse(420, 400, 210, 24, { fill: 'none', stroke: C.yellow, strokeWidth: 4, strokeDasharray: '10 8' });
  // grandfather clock (pendulum sprite at 400,120 25x86)
  s += rect(372, 22, 82, 300, { rx: 16, fill: '#c0392b', stroke: '#6e1a12', strokeWidth: 5 }) +
    path('M372 52 q41 -40 82 0', { fill: '#a32e22', stroke: '#6e1a12', strokeWidth: 4 }) +
    circle(413, 72, 26, { fill: '#fff6dc', stroke: '#6e1a12', strokeWidth: 4 }) +
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => {
      const a = (i * Math.PI) / 6;
      return circle(413 + Math.sin(a) * 20, 72 - Math.cos(a) * 20, 1.8, { fill: C.ink });
    }).join('') +
    line(413, 72, 413, 56, { stroke: C.ink, strokeWidth: 4, strokeLinecap: 'round' }) + line(413, 72, 425, 78, { stroke: C.ink, strokeWidth: 4, strokeLinecap: 'round' }) +
    rect(390, 108, 46, 194, { rx: 10, fill: '#5e1710', stroke: '#4a120c', strokeWidth: 3 }) +
    rect(380, 306, 66, 16, { rx: 4, fill: '#a32e22', stroke: '#6e1a12', strokeWidth: 3 });
  // dresser left of the door
  s += rect(18, 214, 86, 112, { rx: 6, fill: '#e9d9b0', stroke: '#8a7a50', strokeWidth: 4 }) +
    [236, 268, 300].map((y) => rect(26, y - 8, 70, 26, { rx: 4, fill: '#f5ead0', stroke: '#8a7a50', strokeWidth: 2.5 }) + circle(61, y + 5, 3.5, { fill: '#8a7a50' })).join('') +
    rect(12, 206, 98, 12, { rx: 4, fill: '#d9c48f', stroke: '#8a7a50', strokeWidth: 3 }) +
    path('M40 206 q-6 -20 6 -34 h8 q12 14 6 34 z', { fill: C.red, stroke: C.redDark, strokeWidth: 3 });
  // framed picture + wall shelf for the map (Karte 661,242)
  s += picture(690, 110, 48, 40, 'pic1') + picture(190 - 160, 70, 56, 44, 'pic2');
  s += rect(648, 262, 80, 10, { rx: 3, fill: C.woodMid, stroke: C.woodDeep, strokeWidth: 2.5 }) + path('M660 272 l8 10 M716 272 l-8 10', { stroke: C.woodDeep, strokeWidth: 3 });
  // table with chairs (Teller/Eintrittskarte lie on it)
  s += chair(712, 300, 0.85, '#d98a3a');
  s += table(470, 282, 230, 90);
  s += chair(458, 300, 0.85, '#d98a3a');
  // ship in a bottle (GS001-01 hotspot 574,204 32x39)
  s += g({ transform: 'translate(578 214) rotate(-24)' },
    rect(0, 0, 22, 60, { rx: 9, fill: '#bfe8d0', stroke: C.greenDark, strokeWidth: 3, opacity: 0.95 }),
    rect(6, -12, 10, 14, { rx: 3, fill: '#b07a3e', stroke: C.woodDeep, strokeWidth: 2 }),
    path('M5 40 h12 l-2 6 h-8 z', { fill: C.woodMid }), path('M11 40 v-18 l7 12 z', { fill: C.white, stroke: '#9aa4b5', strokeWidth: 1 }));
  // lamp
  s += line(560, 0, 560, 30, { stroke: C.ink, strokeWidth: 2 }) + path('M538 46 q22 -26 44 0 z', { fill: C.yellow, stroke: C.yellowDark, strokeWidth: 3 });
  return s;
}

/** foreground: foot end of Bongo's bed with the dotted blanket (covers the feet like in the original) */
function composing(w: number, h: number): string {
  let dots = '';
  for (let i = 0; i < 14; i++) dots += circle(20 + i * 15 + (i % 2) * 5, 14 + (i % 3) * 8, 3.2, { fill: C.white });
  return path(`M6 ${h} V24 q0 -10 10 -10 h${w - 32} q10 0 10 10 V${h} z`, { fill: C.woodMid, stroke: C.woodDeep, strokeWidth: 4 }) +
    path(`M0 30 q${w / 2} -40 ${w} 0 v16 q-${w / 2} -20 -${w} 0 z`, { fill: C.bandana, stroke: C.bandanaDark, strokeWidth: 3 }) +
    path(`M0 10 q${w / 2} -18 ${w} 0 v24 q-${w / 2} -20 -${w} 0 z`, { fill: C.bandana, stroke: C.bandanaDark, strokeWidth: 3 }) + dots +
    rect(18, 44, w - 36, 10, { rx: 4, fill: dk(C.woodMid, 0.15) }) +
    circle(12, 22, 9, { fill: C.wood, stroke: C.woodDeep, strokeWidth: 3 }) + circle(w - 12, 22, 9, { fill: C.wood, stroke: C.woodDeep, strokeWidth: 3 });
}

export default defineMovie({
  Headline: (m, w, h) => headline('Bongos Wohnzimmer', w, h),
  Background: (m, w, h) => background(w, h),
  Composing: (m, w, h) => composing(w, h),
  'Window-*': (m, w, h) => windowFrames(m.frame ?? 1, 6, w, h, { id: `w${m.frame}` }),
  'Door-*': (m, w, h) => doorFrames(m.frame ?? 1, 7, w, h, { hinge: 'left', id: `d${m.frame}` }),
  // 21 frames played as a pendulum: -1 … 21 = -9° … +9°
  'Pendel-*': (m, w, h) => pendulum(w, h, -9 + (18 * ((m.frame ?? 1) - 1)) / 20),
  Bodenvase: (m, w, h) => g({ transform: `translate(${w / 2} ${h / 2 + 2}) scale(${w / 62} ${h / 62})` }, itemShape('OI001')),
  Teller: (m, w, h) => ellipse(w / 2, h / 2 + 2, w / 2 - 3, h / 2 - 5, { fill: C.white, stroke: '#8a93a6', strokeWidth: 3 }) + ellipse(w / 2, h / 2, w / 2 - 22, h / 2 - 12, { fill: '#e9eef6', stroke: '#b9c2d2', strokeWidth: 2 }) + path(`M10 ${h / 2 + 2} q${w / 2 - 10} 14 ${w - 20} 0`, { fill: 'none', stroke: C.blue, strokeWidth: 2 }),
  Eintrittskarte: (m, w, h) => g({ transform: `translate(${w / 2} ${h / 2}) scale(1.05 0.62)` }, itemShape('OI002')),
  Karte: (m, w, h) => rect(2, 3, w - 4, h - 6, { rx: 3, fill: '#f3e2b0', stroke: '#a0782a', strokeWidth: 2 }) + path(`M8 ${h / 2} q${w / 4} -6 ${w / 2} 0 t${w / 2 - 16} 0`, { fill: 'none', stroke: '#a0322a', strokeWidth: 1.6, strokeDasharray: '3 2' }) + ellipse(5, h / 2, 4, h / 2 - 3, { fill: '#e2cd96', stroke: '#a0782a', strokeWidth: 1.5 }),
});
