// Shared_Interface: top banner, status bar + labels, pocket slots, coin/joke pills, Bongo/Pucki switch,
// arrows, dice cup + dice, cursors, help/instruction buttons, game buttons.
import { defineMovie, type Member } from '../lib/api';
import { C, circle, dk, g, linGrad, lt, rect, rng } from '../lib/svg';
import { arrowShape, coinIcon, counterField, cursorArt, dieFace, fitText, gameButton, jokeCardIcon, pill, roundArrow, shaker, slotSocket, switchButton } from '../lib/ui';

/** purple night-sky band (Banner 800x45, Status 800x107) */
function band(w: number, h: number, seed: string, top = false): string {
  const R = rng(seed);
  let stars = '';
  for (let i = 0; i < Math.round(w / 40); i++) stars += circle(R() * w, 6 + R() * (h - 12), 0.8 + R() * 1.4, { fill: C.white, opacity: 0.25 + R() * 0.35 });
  const id = `bg${seed}`;
  return `<defs>${linGrad(id, [[0, top ? C.uiDark : C.ui], [1, top ? C.ui : C.uiDark]])}</defs>` +
    rect(0, 0, w, h, { fill: `url(#${id})` }) + stars +
    (top ? rect(0, h - 4, w, 4, { fill: C.uiLight }) : rect(0, 0, w, 4, { fill: C.uiLight }));
}

/** labels above the status bar sprites (stage positions minus the member's top-left 37,502) */
function beschriftung(m: Member, w: number, h: number): string {
  const ox = 37, oy = 502;
  const lab = (text: string, cx: number, maxW: number) => fitText(text, cx - ox, 509 - oy, maxW, 13, { fill: C.uiAccent, anchor: 'middle', font: 'head' });
  // compass sockets of the map arrows (Pfeil Oben/Rechts/Unten/Links)
  const sock = [[667.5, 535.5], [689.5, 557.5], [668, 580], [647, 557.5]].map(([x, y]) => circle(x - ox, y - oy, 13, { fill: 'rgba(0,0,0,0.25)', stroke: 'rgba(255,255,255,0.35)', strokeWidth: 2 })).join('');
  return lab('Hosentasche', 120, 150) + lab('Bongo', 460, 70) + lab('Pucki', 580, 70) + lab('Landkarte', 668, 76) + sock +
    circle(668 - ox, 557.5 - oy, 6, { fill: C.uiAccent, stroke: dk(C.uiAccent, 0.5), strokeWidth: 1.5 });
}

export default defineMovie({
  Banner: (m, w, h) => band(w, h, 'banner', true),
  Status: (m, w, h) => band(w, h, 'status'),
  Help: (m, w, h) => pill('Hilfe & Menü', w, h),
  Instruction: (m, w, h) => pill('Hilfe & Neustart', w, h),
  'Beschriftung SP/AS': beschriftung,
  'Beschriftung GS': (m, w, h) => fitText('Hosentasche', w / 2, h / 2, w - 4, h - 2, { fill: C.uiAccent, anchor: 'middle' }),
  'Inventar Drop 1': (m, w, h) => slotSocket(w, h),
  'Inventar Drop 2': (m, w, h) => slotSocket(w, h),
  'Inventar Drop 3': (m, w, h) => slotSocket(w, h),
  // the number is a text sprite at x+87 (Coins/Jokes field) – label stays on the left half
  'Drop Coins': (m, w, h) => counterField('Münzen', w, h, coinIcon(h * 0.6, h / 2, h * 0.32)),
  'Drop Jokes': (m, w, h) => counterField('Witze', w, h, jokeCardIcon(h * 0.6, h / 2, h * 0.46, h * 0.62)),
  'Bingo Switch': (m, w, h) => switchButton('Bongo', w, h),
  'Puck Switch': (m, w, h) => switchButton('Pucki', w, h),
  'Pfeil-O': (m, w, h) => arrowShape('up', w, h, C.white),
  'Pfeil-L': (m, w, h) => arrowShape('left', w, h, C.white),
  'Pfeil-R': (m, w, h) => arrowShape('right', w, h, C.white),
  'Pfeil Oben': (m, w, h) => roundArrow('up', w, h),
  'Pfeil Rechts': (m, w, h) => roundArrow('right', w, h),
  'Pfeil Unten': (m, w, h) => roundArrow('down', w, h),
  'Pfeil Links': (m, w, h) => roundArrow('left', w, h),
  'Moving Cubes': (m, w, h) => g({ transform: `rotate(-12 ${w / 2} ${h / 2})` }, g({ transform: 'translate(2 4)' }, dieFace(5, 22, 22)), g({ transform: 'translate(14 28)' }, dieFace(3, 22, 22))),
  'Shaker-1': (m, w, h) => shaker('Würfeln', w, h),
  'Shaker-2': (m, w, h) => shaker('Aussetzen', w, h, true),
  'Cube-1-*': (m, w, h) => dieFace(m.frame ?? 1, w, h),
  'Cube-2-*': (m, w, h) => dieFace(m.frame ?? 1, w, h, lt(C.yellow, 0.6)),
  Make: (m, w, h) => cursorArt('Make', w, h, m.regX, m.regY),
  Take: (m, w, h) => cursorArt('Take', w, h, m.regX, m.regY),
  Grab: (m, w, h) => cursorArt('Grab', w, h, m.regX, m.regY),
  Talk: (m, w, h) => cursorArt('Talk', w, h, m.regX, m.regY),
  Wait: (m, w, h) => cursorArt('Wait', w, h, m.regX, m.regY),
  Look: (m, w, h) => cursorArt('Look', w, h, m.regX, m.regY),
  WalkBingo: (m, w, h) => cursorArt('WalkBingo', w, h, m.regX, m.regY),
  WalkPuck: (m, w, h) => cursorArt('WalkPuck', w, h, m.regX, m.regY),
  'Game-Back': (m, w, h) => gameButton('Back', w, h),
  'Game-Start': (m, w, h) => gameButton('Start', w, h),
  'Game-Ready': (m, w, h) => gameButton('Ready', w, h),
  'Game-Stop': (m, w, h) => gameButton('Stop', w, h),
});
