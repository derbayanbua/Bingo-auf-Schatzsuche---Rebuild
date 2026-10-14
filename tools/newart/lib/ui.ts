// Interface elements: headlines, buttons/pills, board points, mood bubbles, dice, shaker, cursors,
// slot sockets, arrows. All return SVG bodies in canvas pixels (0..w, 0..h).

import { C, FONT_HEAD, circle, dk, ellipse, esc, g, line, linGrad, lt, path, r2, rect } from './svg';
import { figureSvg } from './characters';

/** estimated text width (Baloo 2 ExtraBold ≈ 0.5 em per char, Nunito Bold ≈ 0.55 em) */
export function textWidth(s: string, size: number, font: 'head' | 'body' = 'head'): number {
  return s.length * size * (font === 'head' ? 0.56 : 0.56);
}

/** text that never overflows maxW (shrinks the font size) */
export function fitText(s: string, x: number, y: number, maxW: number, size: number, a: { fill?: string; anchor?: 'start' | 'middle' | 'end'; font?: 'head' | 'body'; weight?: number; stroke?: string; sw?: number } = {}): string {
  const font = a.font ?? 'head';
  const fsz = Math.min(size, (maxW / Math.max(1, textWidth(s, 1, font))) * 0.98);
  const fam = font === 'head' ? FONT_HEAD : 'Nunito';
  const stroke = a.stroke ? ` stroke="${a.stroke}" stroke-width="${a.sw ?? 3}" stroke-linejoin="round" paint-order="stroke"` : '';
  return `<text x="${r2(x)}" y="${r2(y)}" font-family="${fam}" font-weight="${a.weight ?? 800}" font-size="${r2(fsz)}" fill="${a.fill ?? C.uiText}" text-anchor="${a.anchor ?? 'start'}" dominant-baseline="central"${stroke}>${esc(s)}</text>`;
}

/** compass-rose sun icon of the headlines */
export function badgeIcon(cx: number, cy: number, r: number): string {
  const rays = Array.from({ length: 8 }, (_, i) => {
    const a = (i * Math.PI) / 4;
    return `M${r2(cx + Math.cos(a) * r * 0.62)} ${r2(cy + Math.sin(a) * r * 0.62)} L${r2(cx + Math.cos(a) * r)} ${r2(cy + Math.sin(a) * r)}`;
  }).join(' ');
  return path(rays, { stroke: C.uiAccent, strokeWidth: r * 0.22, strokeLinecap: 'round', fill: 'none' }) +
    circle(cx, cy, r * 0.5, { fill: C.uiAccent, stroke: dk(C.uiAccent, 0.4), strokeWidth: r * 0.12 }) +
    circle(cx - r * 0.12, cy - r * 0.12, r * 0.16, { fill: C.white, opacity: 0.7 });
}

/** Headline member (scene title in the top banner, transparent background) */
export function headline(text: string, w: number, h: number): string {
  const r = Math.min(h * 0.38, 13);
  return badgeIcon(r + 3, h / 2, r) + fitText(text, r * 2 + 10, h / 2 + 1, w - r * 2 - 12, Math.min(26, h * 0.72), { fill: C.white, stroke: C.uiDark, sw: 3 });
}

/** rounded pill button with label (Help, Quit, Münzen, Witzkarten …) */
export function pill(label: string, w: number, h: number, o: { fill?: string; text?: string; icon?: string; ghost?: boolean } = {}): string {
  const fill = o.fill ?? C.uiAccent;
  const bg = o.ghost
    ? rect(1.5, 1.5, w - 3, h - 3, { rx: (h - 3) / 2, fill: 'rgba(255,255,255,0.14)', stroke: 'rgba(255,255,255,0.35)', strokeWidth: 2 })
    : rect(1.5, 1.5, w - 3, h - 3, { rx: (h - 3) / 2, fill, stroke: dk(fill, 0.45), strokeWidth: 3 }) + path(`M${h / 2} 6 h${w - h}`, { stroke: lt(fill, 0.5), strokeWidth: 3, strokeLinecap: 'round', opacity: 0.8 });
  const ix = o.icon ? h * 0.9 : 0;
  return bg + (o.icon ?? '') + fitText(label, (w + ix) / 2, h / 2 + 1, w - h - ix, h * 0.55, { fill: o.text ?? (o.ghost ? C.white : '#2a1a00'), anchor: 'middle' });
}

/** coin icon (centre, radius) */
export function coinIcon(cx: number, cy: number, r: number, label = ''): string {
  return circle(cx, cy, r, { fill: C.gold, stroke: C.goldDark, strokeWidth: Math.max(1.2, r * 0.14) }) +
    circle(cx, cy, r * 0.72, { fill: 'none', stroke: lt(C.gold, 0.45), strokeWidth: Math.max(1, r * 0.1) }) +
    (label ? fitText(label, cx, cy + r * 0.05, r * 1.3, r * 1.05, { fill: dk(C.gold, 0.55), anchor: 'middle' }) : star(cx, cy, r * 0.48, lt(C.gold, 0.55), dk(C.gold, 0.35), Math.max(0.8, r * 0.07)));
}

/** five-pointed star */
export function star(cx: number, cy: number, r: number, fill: string, stroke: string, sw = 1.5): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r;
    pts.push(`${r2(cx + Math.cos(a) * rr)},${r2(cy + Math.sin(a) * rr)}`);
  }
  return `<polygon points="${pts.join(' ')}" fill="${fill}" stroke="${stroke}" stroke-width="${r2(sw)}" stroke-linejoin="round"/>`;
}

/** counter field of the status bar (icon + label left, room for the number on the right) */
export function counterField(label: string, w: number, h: number, icon: string): string {
  return rect(1.5, 1.5, w - 3, h - 3, { rx: (h - 3) / 2, fill: 'rgba(255,255,255,0.14)', stroke: 'rgba(255,255,255,0.35)', strokeWidth: 2 }) +
    icon + fitText(label, h * 1.15, h / 2 + 1, w * 0.45, h * 0.5, { fill: C.white });
}

/** joke card icon */
export function jokeCardIcon(cx: number, cy: number, w: number, h: number): string {
  const x = cx - w / 2, y = cy - h / 2;
  return rect(x, y, w, h, { rx: w * 0.16, fill: C.white, stroke: C.blue, strokeWidth: Math.max(1.2, w * 0.08) }) +
    circle(cx, cy - h * 0.08, w * 0.28, { fill: C.yellow, stroke: C.yellowDark, strokeWidth: Math.max(1, w * 0.05) }) +
    circle(cx - w * 0.1, cy - h * 0.13, w * 0.04, { fill: C.ink }) + circle(cx + w * 0.1, cy - h * 0.13, w * 0.04, { fill: C.ink }) +
    path(`M${r2(cx - w * 0.14)} ${r2(cy - h * 0.02)} q${r2(w * 0.14)} ${r2(h * 0.12)} ${r2(w * 0.28)} 0`, { fill: 'none', stroke: C.ink, strokeWidth: Math.max(1, w * 0.05), strokeLinecap: 'round' }) +
    path(`M${r2(x + w * 0.2)} ${r2(y + h * 0.8)} h${r2(w * 0.6)}`, { stroke: '#9aa4b5', strokeWidth: Math.max(1, w * 0.05), strokeLinecap: 'round' });
}

// ------------------------------------------------------------------ board points (50x50, drawn at blend 50)

/** pointBlue/pointRed/pointJoke-0..2: 0 = normal, 1 = reachable target, 2 = hover */
export function boardPoint(kind: 'Blue' | 'Red' | 'Joke', state: number, w: number, h: number): string {
  const cx = w / 2, cy = h / 2;
  const base = kind === 'Red' ? C.red : C.blue;
  const dark = dk(base, 0.4);
  let s = '';
  if (state === 1) s += circle(cx, cy, 23, { fill: C.yellow, opacity: 0.9 }) + circle(cx, cy, 23, { fill: 'none', stroke: C.white, strokeWidth: 2.5 });
  if (state === 2) s += circle(cx, cy, 23, { fill: C.white, opacity: 0.85 });
  s += circle(cx, cy, 17, { fill: state === 1 ? lt(base, 0.15) : base, stroke: dark, strokeWidth: 3.5 });
  s += path(`M${cx - 9} ${cy - 7} q6 -7 14 -5`, { fill: 'none', stroke: lt(base, 0.55), strokeWidth: 3.5, strokeLinecap: 'round' });
  if (kind === 'Joke') s += jokeCardIcon(cx, cy + 1, 15, 19);
  else s += circle(cx, cy, 5, { fill: lt(base, 0.6), opacity: 0.8 });
  return s;
}

// ------------------------------------------------------------------ mood bubble (52x30, reg bottom-left)

export function moodBubble(mood: 'Gut' | 'Neutral' | 'Schlecht', w: number, h: number): string {
  const col = mood === 'Gut' ? '#7ccf5a' : mood === 'Neutral' ? C.yellow : '#ef6a5a';
  const bx = 10, by = 1.5, bw = w - 12, bh = h - 9;
  const face = mood === 'Gut' ? 'M-6 2 q6 6 12 0' : mood === 'Neutral' ? 'M-6 3 h12' : 'M-6 5 q6 -6 12 0';
  const cx = bx + bw / 2, cy = by + bh / 2;
  return path(`M${bx + 6} ${by + bh - 1} L2 ${h - 1.5} L${bx + 14} ${by + bh - 1} Z`, { fill: C.white, stroke: C.ink, strokeWidth: 1.8, strokeLinejoin: 'round' }) +
    rect(bx, by, bw, bh, { rx: bh / 2, fill: C.white, stroke: C.ink, strokeWidth: 1.8 }) +
    path(`M${bx + 7} ${by + bh - 2.5} h7`, { stroke: C.white, strokeWidth: 3 }) +
    g({ transform: `translate(${cx} ${cy})` },
      circle(0, 0, 9, { fill: col, stroke: dk(col, 0.45), strokeWidth: 1.6 }),
      circle(-3.2, -2.2, 1.4, { fill: C.ink }), circle(3.2, -2.2, 1.4, { fill: C.ink }),
      path(face, { fill: 'none', stroke: C.ink, strokeWidth: 1.6, strokeLinecap: 'round' }));
}

// ------------------------------------------------------------------ dice / shaker

export function dieFace(v: number, w: number, h: number, tint = C.white): string {
  const s = Math.min(w, h) - 2, x = (w - s) / 2, y = (h - s) / 2;
  const q = s / 4.2;
  const P: Record<number, [number, number][]> = {
    1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
    5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]],
  };
  return rect(x, y, s, s, { rx: s * 0.22, fill: tint, stroke: C.ink, strokeWidth: Math.max(1.2, s * 0.07) }) +
    (P[v] ?? []).map(([a, b]) => circle(w / 2 + a * q, h / 2 + b * q, s * 0.09, { fill: v === 1 ? C.red : C.ink })).join('');
}

/** dice cup (Shaker-1 'Würfeln' / Shaker-2 'Aussetzen') */
export function shaker(label: string, w: number, h: number, tipped = false): string {
  const id = `cup${tipped ? 2 : 1}`;
  const cx = w / 2;
  const top = 26, bot = h - 6;
  const cup = path(`M${cx - 26} ${top} h52 l-7 ${bot - top} q-19 6 -38 0 z`, { fill: `url(#${id})`, stroke: C.woodDeep, strokeWidth: 3, strokeLinejoin: 'round' }) +
    ellipse(cx, top, 26, 7, { fill: C.woodDark, stroke: C.woodDeep, strokeWidth: 3 }) +
    path(`M${cx - 22} ${top + 22} h44 M${cx - 20} ${top + 46} h40`, { stroke: C.yellow, strokeWidth: 4, strokeLinecap: 'round' }) +
    path(`M${cx - 18} ${top + 10} v${bot - top - 22}`, { stroke: lt(C.wood, 0.45), strokeWidth: 4, strokeLinecap: 'round', opacity: 0.7 });
  return `<defs>${linGrad(id, [[0, '#c97a3a'], [0.5, C.wood], [1, C.woodMid]], 0, 0, 1, 0)}</defs>` +
    (tipped ? g({ transform: `rotate(-18 ${cx} ${bot})` }, cup) : cup) +
    pill(label, w - 2, 22, { fill: C.uiAccent }).replace(/^/, `<g transform="translate(1 0)">`) + '</g>';
}

// ------------------------------------------------------------------ cursors (hotspot = regX/regY)

export function cursorArt(kind: string, w: number, h: number, regX: number, regY: number): string | null {
  switch (kind) {
    case 'Make': // pointing hand, fingertip at the hotspot
      return g({ transform: `translate(${regX} ${regY})` },
        path('M0 0 l3 -1 q3 0 3 3 v12 l2 -2 q3 -2 5 1 l1 1 q3 -2 5 1 l1 1 q3 -1 4 2 v9 q0 8 -8 8 h-8 q-6 0 -9 -6 l-5 -9 q-2 -4 2 -5 q2 0 4 3 v-17 q0 -2 -2 -2 z', { fill: C.white, stroke: C.ink, strokeWidth: 2, strokeLinejoin: 'round' }));
    case 'Take': { // open hand
      const cx = w / 2, cy = h / 2 + 2;
      return path(`M${cx - 9} ${cy + 14} q-8 -6 -10 -14 q-1 -4 3 -4 q3 1 5 6 v-16 q0 -4 3 -4 q3 0 3 4 v10 v-14 q0 -4 3 -4 q3 0 3 4 v14 v-12 q0 -4 3 -4 q3 0 3 4 v14 v-8 q0 -3 3 -3 q3 0 3 3 v14 q0 10 -10 10 h-6 q-5 0 -8 -4 z`, { fill: C.white, stroke: C.ink, strokeWidth: 2, strokeLinejoin: 'round' });
    }
    case 'Grab': { // closed fist
      const cx = w / 2, cy = h / 2;
      return path(`M${cx - 11} ${cy - 2} q0 -6 5 -6 h14 q6 0 6 6 v8 q0 9 -10 9 h-6 q-9 0 -9 -9 z`, { fill: C.white, stroke: C.ink, strokeWidth: 2, strokeLinejoin: 'round' }) +
        path(`M${cx - 6} ${cy - 8} v5 M${cx} ${cy - 8} v5 M${cx + 6} ${cy - 8} v5`, { stroke: C.ink, strokeWidth: 1.6, strokeLinecap: 'round' });
    }
    case 'Talk': // speech bubble "Na?"
      return path(`M4 2 h${w - 8} q3 0 3 3 v${h - 13} q0 3 -3 3 h-${w - 22} l-8 6 l1 -6 h-1 q-3 0 -3 -3 v-${h - 13} q0 -3 3 -3 z`, { fill: C.white, stroke: C.ink, strokeWidth: 1.8, strokeLinejoin: 'round' }) +
        fitText('Na?', w / 2, (h - 7) / 2 + 1, w - 14, h * 0.5, { fill: C.ink, anchor: 'middle' });
    case 'Wait': // sleepy bubble
      return path(`M10 2 h${w - 14} q3 0 3 3 v${h - 13} q0 3 -3 3 h-${w - 14} q-3 0 -3 -3 v-${h - 13} q0 -3 3 -3 z`, { fill: C.white, stroke: C.ink, strokeWidth: 1.8 }) +
        circle(4, h - 4, 2.5, { fill: C.white, stroke: C.ink, strokeWidth: 1.4 }) +
        fitText('Zzz', 10 + (w - 14) / 2, (h - 7) / 2 + 1, w - 20, h * 0.5, { fill: C.blue, anchor: 'middle' });
    case 'Look': // magnifier, hotspot at the lens centre
      return circle(regX, regY, 8.5, { fill: C.glass, stroke: C.ink, strokeWidth: 2.6 }) +
        path(`M${regX - 4} ${regY - 3} q2 -3 6 -3`, { fill: 'none', stroke: C.white, strokeWidth: 2, strokeLinecap: 'round' }) +
        path(`M${regX + 6} ${regY + 6} l${w - regX - 9} ${h - regY - 9}`, { stroke: C.woodMid, strokeWidth: 5.5, strokeLinecap: 'round' });
    case 'WalkBingo': // brown boot
      return g({ transform: `translate(${w / 2} ${h / 2}) rotate(-10)` },
        path('M-16 12 v-10 q0 -14 9 -14 h7 q7 0 7 9 v5 h3 q12 0 13 10 v0 z', { fill: C.boot, stroke: C.bootDark, strokeWidth: 2.5, strokeLinejoin: 'round' }),
        path('M-16 12 h39', { stroke: C.bootDark, strokeWidth: 3 }));
    case 'WalkPuck': // yellow sneaker
      return g({ transform: `translate(${w / 2} ${h / 2}) rotate(-10)` },
        path('M-17 10 q0 -16 13 -17 q8 -1 9 6 q12 1 13 11 z', { fill: C.shoe, stroke: C.shoeDark, strokeWidth: 2.5, strokeLinejoin: 'round' }),
        path('M-17 10 h35', { stroke: C.white, strokeWidth: 3.5, strokeLinecap: 'round' }),
        path('M-6 -3 l4 7 M1 -4 l4 8', { stroke: C.white, strokeWidth: 2.2, strokeLinecap: 'round' }));
  }
  return null;
}

// ------------------------------------------------------------------ status bar parts

/** empty pocket slot (Inventar Drop n, 80x80) */
export function slotSocket(w: number, h: number): string {
  return rect(4, 4, w - 8, h - 8, { rx: 16, fill: 'rgba(255,255,255,0.10)', stroke: 'rgba(255,255,255,0.45)', strokeWidth: 3, strokeDasharray: '7 5' });
}

/** Bongo / Pucki switch button (80x80): rounded frame + portrait */
export function switchButton(who: 'Bongo' | 'Pucki', w: number, h: number): string {
  const fig = figureSvg(who, w - 14, h - 12).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
  return rect(3, 3, w - 6, h - 6, { rx: 18, fill: 'rgba(255,255,255,0.12)', stroke: who === 'Bongo' ? C.orange : C.mint, strokeWidth: 3 }) +
    g({ transform: `translate(7 7)` }, fig);
}

/** arrow (direction: 'up' | 'down' | 'left' | 'right') inside w×h */
export function arrowShape(dir: 'up' | 'down' | 'left' | 'right', w: number, h: number, fill = C.uiAccent): string {
  const rot = { up: 0, right: 90, down: 180, left: 270 }[dir];
  const s = Math.min(w, h);
  const along = dir === 'up' || dir === 'down' ? h : w;
  const k = along / s;
  return g({ transform: `translate(${w / 2} ${h / 2}) rotate(${rot}) scale(${r2(s / 40)} ${r2((s / 40) * k)})` },
    path('M0 -18 L16 0 H7 V17 H-7 V0 H-16 Z', { fill, stroke: dk(fill, 0.5), strokeWidth: 3, strokeLinejoin: 'round' }));
}

/** round arrow button (map navigation, 25x25) */
export function roundArrow(dir: 'up' | 'down' | 'left' | 'right', w: number, h: number): string {
  const r = Math.min(w, h) / 2 - 1;
  const rot = { up: 0, right: 90, down: 180, left: 270 }[dir];
  return circle(w / 2, h / 2, r, { fill: C.uiAccent, stroke: dk(C.uiAccent, 0.5), strokeWidth: 2 }) +
    g({ transform: `translate(${w / 2} ${h / 2}) rotate(${rot})` }, path(`M0 ${-r * 0.55} L${r * 0.5} ${r * 0.15} H-${r * 0.5} Z`, { fill: C.uiDark }));
}

/** big game button (Game-Back/Start/Ready/Stop, ~80x96): round plate + icon + label on top */
export function gameButton(kind: 'Back' | 'Start' | 'Ready' | 'Stop', w: number, h: number): string {
  const label = { Back: 'Zurück', Start: 'Start', Ready: 'Fertig', Stop: 'Stop' }[kind];
  const cx = w / 2, cy = h - 38, r = 34;
  const plate = circle(cx, cy, r, { fill: C.uiLight, stroke: C.uiDark, strokeWidth: 3.5 }) + circle(cx, cy, r - 7, { fill: lt(C.uiLight, 0.25) });
  let icon = '';
  if (kind === 'Back') icon = path(`M${cx + 12} ${cy - 14} L${cx - 10} ${cy} L${cx + 12} ${cy + 14} Z`, { fill: C.white, stroke: C.ink, strokeWidth: 3, strokeLinejoin: 'round' });
  else {
    const col = kind === 'Start' ? '#3fbf5a' : C.red;
    icon = line(cx - 12, cy - 20, cx - 12, cy + 20, { stroke: C.woodDeep, strokeWidth: 4, strokeLinecap: 'round' }) +
      path(`M${cx - 10} ${cy - 18} q10 -5 18 0 t16 0 v16 q-8 5 -16 0 t-18 0 z`, { fill: col, stroke: dk(col, 0.45), strokeWidth: 2.5, strokeLinejoin: 'round' });
    if (kind === 'Ready') icon += path(`M${cx - 4} ${cy - 10} l4 4 l8 -8`, { fill: 'none', stroke: C.white, strokeWidth: 3, strokeLinecap: 'round' });
  }
  return plate + icon + g({ transform: 'translate(0 0)' }, pill(label, w, 22, { fill: C.uiAccent }));
}
