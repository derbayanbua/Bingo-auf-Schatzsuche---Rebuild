// GS005-02 "Zahlenschloss" – six digit wheels (sprites 12,15,18,21,24,27 at stage x 84/198/311/424/536/649, top 159,
// 68x220) with Oben (ch-1, top 134) / Unten (ch+1, top 388) buttons. Digit d shows on Ziffern-(d*7+1); frames
// 1..71 turn the wheel forward by 1/7 digit each (71 = 0 again). Oben/Unten-0 = raised, -1 = pressed.
import { defineMovie } from '../lib/api';
import { introScreen } from '../lib/gs005a';
import { C, defs, g, linGrad, lt, path, poly, rect } from '../lib/svg';
import { headline } from '../lib/ui';

const WHEEL_X = [84, 198, 311, 424, 536, 649];
const WHEEL_TOP = 159 - 45;

/** digit wheel; off = digit at the centre (may be fractional) */
function wheel(id: string, off: number, w: number, h: number): string {
  const R = 100, cy = h / 2;
  let s = defs(linGrad(`${id}-c`, [[0, '#6b5a10'], [0.18, '#d9b81e'], [0.5, '#ffe45a'], [0.82, '#d9b81e'], [1, '#5a4a08']]),
    linGrad(`${id}-sh`, [[0, '#000', 0.75], [0.25, '#000', 0], [0.75, '#000', 0], [1, '#000', 0.8]]));
  s += rect(0, 0, w, h, { fill: `url(#${id}-c)` });
  for (let k = Math.floor(off) - 3; k <= Math.ceil(off) + 3; k++) {
    const phi = ((k - off) * 36 * Math.PI) / 180;
    const c = Math.cos(phi);
    if (c <= 0.05 || Math.abs(phi) > Math.PI / 2) continue;
    const y = cy + R * Math.sin(phi);
    const d = ((k % 10) + 10) % 10;
    s += `<text x="${w / 2}" y="0" transform="translate(0 ${y.toFixed(2)}) scale(1 ${c.toFixed(3)})" font-family="'Baloo 2'" font-weight="800" font-size="64" fill="${C.ink}" text-anchor="middle" dominant-baseline="central">${d}</text>`;
    // ridge between digits
    const yr = cy + R * Math.sin(phi + (18 * Math.PI) / 180);
    if (Math.cos(phi + (18 * Math.PI) / 180) > 0.05) s += path(`M0 ${yr.toFixed(2)} H${w}`, { stroke: '#8a7208', strokeWidth: 2 * Math.cos(phi), opacity: 0.6 });
  }
  s += rect(0, 0, w, h, { fill: `url(#${id}-sh)` });
  s += path(`M8 20 V${h - 20}`, { stroke: C.white, strokeWidth: 4, strokeLinecap: 'round', opacity: 0.35 });
  s += rect(1.5, 1.5, w - 3, h - 3, { fill: 'none', stroke: '#3a3008', strokeWidth: 3 });
  return s;
}

function button(dir: 'up' | 'down', pressed: boolean, w: number, h: number): string {
  const fill = pressed ? '#d23a30' : C.red;
  const tri: [number, number][] = dir === 'up' ? [[w / 2, 3], [w - 3, h - 3], [3, h - 3]] : [[3, 3], [w - 3, 3], [w / 2, h - 3]];
  return poly(tri, { fill, stroke: C.redDark, strokeWidth: 3, strokeLinejoin: 'round' }) +
    (pressed ? '' : path(dir === 'up' ? `M${w / 2 - 2} 7 L${w * 0.28} ${h - 6}` : `M6 5 H${w * 0.6}`, { stroke: lt(C.red, 0.55), strokeWidth: 2.5, strokeLinecap: 'round' }));
}

function background(w: number, h: number): string {
  // lighthouse stone wall
  let s = rect(0, 0, w, h, { fill: '#d8cdb8' });
  for (let row = 0; row < 15; row++) {
    const y = row * 32, off = row % 2 ? -50 : 0;
    for (let x = off; x < w; x += 100) s += rect(x + 3, y + 3, 94, 26, { rx: 5, fill: row % 3 ? C.stone : lt(C.stone, 0.12), stroke: C.stoneDark, strokeWidth: 2.5 });
  }
  // lock body
  s += defs(linGrad('lk-body', [[0, '#5a5a66'], [0.5, '#3a3a44'], [1, '#22222a']]));
  s += rect(66, 78, 676, 302, { rx: 22, fill: '#000', opacity: 0.25 });
  s += rect(58, 70, 676, 302, { rx: 22, fill: 'url(#lk-body)', stroke: '#16161c', strokeWidth: 5 });
  s += path('M80 80 H712', { stroke: '#8a8a96', strokeWidth: 4, strokeLinecap: 'round' });
  for (const [x, y] of [[76, 88], [716, 88], [76, 354], [716, 354]]) s += g({}, `<circle cx="${x}" cy="${y}" r="6" fill="#9a9aa6" stroke="#16161c" stroke-width="2"/>`, path(`M${x - 4} ${y} h8`, { stroke: '#16161c', strokeWidth: 2 }));
  for (const x of WHEEL_X) {
    // window around the wheel + button sockets
    s += rect(x - 8, WHEEL_TOP - 8, 84, 236, { rx: 8, fill: '#111116', stroke: '#6a6a76', strokeWidth: 3 });
    s += rect(x + 7, 134 - 45 - 3, 54, 27, { rx: 7, fill: '#22222a', stroke: '#6a6a76', strokeWidth: 2 });
    s += rect(x + 7, 388 - 45 - 3, 54, 27, { rx: 7, fill: '#22222a', stroke: '#6a6a76', strokeWidth: 2 });
  }
  // centre marker
  s += path(`M58 ${WHEEL_TOP + 110} l12 -9 v18 z M734 ${WHEEL_TOP + 110} l-12 -9 v18 z`, { fill: C.yellow, stroke: C.yellowDark, strokeWidth: 2 });
  return s;
}

function introPicture(): string {
  let s = rect(0, 0, 320, 190, { fill: '#d8cdb8' }) + rect(10, 22, 300, 146, { rx: 12, fill: '#3a3a44', stroke: '#16161c', strokeWidth: 4 });
  for (let i = 0; i < 6; i++) {
    const x = 22 + i * 48;
    s += g({ transform: `translate(${x} 40) scale(${36 / 68} ${110 / 220})` }, wheel(`ip${i}`, 0, 68, 220));
    s += poly([[x + 18, 30], [x + 26, 37], [x + 10, 37]], { fill: C.red }) + poly([[x + 10, 154], [x + 26, 154], [x + 18, 161]], { fill: C.red });
  }
  return s;
}

export default defineMovie({
  Headline: (m, w, h) => headline('Zahlenschloss', w, h),
  Intro: () => introScreen({
    id: 'gs52', device: 'mouse', picture: introPicture(),
    lines: [
      'Die Zahlen auf diesem Schloss lassen sich verstellen: Klick einfach auf den Taster',
      'über oder unter dem passenden Rädchen.',
      'Weißt du, welche Kombination das Schloss öffnet?',
    ],
  }),
  Background: (m, w, h) => background(w, h),
  'Ziffern-*': (m, w, h) => wheel(`z${m.frame}`, ((m.frame ?? 1) - 1) / 7, w, h),
  'Oben-*': (m, w, h) => button('up', m.frame === 1, w, h),
  'Unten-*': (m, w, h) => button('down', m.frame === 1, w, h),
});
