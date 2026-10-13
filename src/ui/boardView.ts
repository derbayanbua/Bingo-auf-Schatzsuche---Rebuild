// SVG board renderer: procedural terrain + roads generated from the original point graph,
// point markers, character tokens and jump animations. With the original graphics installed
// (public/orig) the board is drawn like the original Landscape movie instead (src/orig/boardOrig.ts).
//
// Coordinates: the original point data uses stage coordinates (board area = y 45..493 of the 800x600
// stage), so the SVG viewBox is "0 45 800 448" and all points are drawn at their original x/y.

import { BOARDS, getPoint, pointId, splitPoint } from '../game/data';
import { checkPointTyp, pointState } from '../game/logic';
import type { CharId, GameState } from '../game/types';
import { ALL_CHARS } from '../game/types';
import { OBSTACLE_POINTS, OrigBoardDecor, hasOrigBoard, moodMember, origBackground, origHop, origPoint, origToken, preloadBoardMembers, setImage } from '../orig/boardOrig';
import { LOOKS, tokenSVG } from './art';

export const BOARD_W = 800;
export const BOARD_H = 448;
/** stage y of the board's top edge */
export const BOARD_Y = 45;
const NS = 'http://www.w3.org/2000/svg';

const GROUND = {
  0: { fill: '#c7a46a', edge: '#8d6c37' },
  1: { fill: '#9b958a', edge: '#6d675c' }, // stone
  2: { fill: '#ead29a', edge: '#b99a58' }, // sand
  3: { fill: '#a77447', edge: '#6f4723' }, // dirt
  4: { fill: '#9fd77f', edge: '#5f9f45' }, // grass path
} as Record<number, { fill: string; edge: string }>;

function hash(str: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 13), 0x5bd1e995);
    h ^= h >>> 15;
    return (h >>> 0) / 4294967296;
  };
}

function islandOf(board: string): 1 | 2 {
  return parseInt(board.slice(2), 10) >= 31 ? 2 : 1;
}

/** Off-board position one field (75 px) beyond a point in direction d (0..3) – Character im Schauplatz. */
function beyond(x: number, y: number, d: number, k = 1): [number, number] {
  return [x + [0, 75, 0, -75][d] * k, y + [-75, 0, 75, 0][d] * k];
}

interface Seg { x1: number; y1: number; x2: number; y2: number; g: number }

function segments(board: string): Seg[] {
  const segs: Seg[] = [];
  for (const p of BOARDS[board]) {
    if (p.x === 0 && p.y === 0) continue;
    p.nb.forEach((nb, d) => {
      if (!nb) return;
      const [b2] = splitPoint(nb);
      if (b2 === board) {
        const q = getPoint(nb)!;
        if (nb > pointId(board, p.n)) segs.push({ x1: p.x, y1: p.y, x2: q.x, y2: q.y, g: p.g });
      } else {
        const [ex, ey] = beyond(p.x, p.y, d);
        segs.push({ x1: p.x, y1: p.y, x2: ex, y2: ey, g: p.g });
      }
    });
  }
  return segs;
}

function distToSeg(px: number, py: number, s: Seg): number {
  const dx = s.x2 - s.x1, dy = s.y2 - s.y1;
  const t = Math.max(0, Math.min(1, ((px - s.x1) * dx + (py - s.y1) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(px - (s.x1 + t * dx), py - (s.y1 + t * dy));
}

function decorations(board: string, segs: Seg[]): string {
  const rnd = hash(board);
  const island = islandOf(board);
  let out = '';
  for (let i = 0; i < 70; i++) {
    const x = rnd() * BOARD_W, y = BOARD_Y + rnd() * BOARD_H;
    if (segs.some((s) => distToSeg(x, y, s) < 46)) continue;
    const k = rnd();
    if (island === 1) {
      if (k < 0.25) {
        const r = 18 + rnd() * 16;
        out += `<g transform="translate(${x.toFixed(0)} ${y.toFixed(0)})"><circle r="${r + 4}" cx="6" cy="8" fill="rgba(0,40,0,.22)"/><circle r="${r}" fill="#3f8f3a"/><circle r="${r * 0.7}" cx="-4" cy="-4" fill="#56a94a"/><circle r="${r * 0.35}" cx="-7" cy="-8" fill="#6fc35d"/></g>`;
      } else if (k < 0.6) {
        out += `<g transform="translate(${x.toFixed(0)} ${y.toFixed(0)})">${[0, 72, 144, 216, 288].map((a) => `<ellipse rx="3" ry="6" transform="rotate(${a}) translate(0 -6)" fill="#fff"/>`).join('')}<circle r="3" fill="#f6c431"/></g>`;
      } else if (k < 0.72) {
        out += `<ellipse cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" rx="${10 + rnd() * 10}" ry="${7 + rnd() * 6}" fill="#a39d91" stroke="#6f6a60" stroke-width="2"/>`;
      }
    } else {
      if (k < 0.22) {
        // palm tree, top-down
        out += `<g transform="translate(${x.toFixed(0)} ${y.toFixed(0)}) rotate(${(rnd() * 90).toFixed(0)})"><circle r="26" cx="6" cy="8" fill="rgba(60,40,0,.2)"/>${[0, 60, 120, 180, 240, 300].map((a) => `<path d="M0 0 Q8 -14 0 -28 Q-8 -14 0 0" transform="rotate(${a})" fill="#3c9a48"/>`).join('')}<circle r="5" fill="#7a5426"/></g>`;
      } else if (k < 0.45) {
        out += `<g transform="translate(${x.toFixed(0)} ${y.toFixed(0)})"><path d="M-10 4 q4 -14 10 -4 q6 -12 10 2" fill="none" stroke="#5aa64c" stroke-width="3" stroke-linecap="round"/></g>`;
      } else if (k < 0.55) {
        out += `<ellipse cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" rx="${12 + rnd() * 12}" ry="${8 + rnd() * 6}" fill="#c9a77c" stroke="#8f7350" stroke-width="2"/>`;
      }
    }
  }
  return out;
}

/** Static part of a board (terrain + roads + decoration), cached per board. */
const staticCache = new Map<string, string>();
export function boardBackground(board: string): string {
  const hit = staticCache.get(board);
  if (hit) return hit;
  const segs = segments(board);
  const island = islandOf(board);
  const bg = island === 1
    ? `<linearGradient id="bg-${board}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7cc05a"/><stop offset="1" stop-color="#5aa344"/></linearGradient>`
    : `<linearGradient id="bg-${board}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e9d39a"/><stop offset="1" stop-color="#d8b874"/></linearGradient>`;
  const roadEdge = segs.map((s) => `<line x1="${s.x1}" y1="${s.y1}" x2="${s.x2}" y2="${s.y2}" stroke="${GROUND[s.g]?.edge ?? GROUND[0].edge}" stroke-width="44" stroke-linecap="round"/>`).join('');
  const roadFill = segs.map((s) => `<line x1="${s.x1}" y1="${s.y1}" x2="${s.x2}" y2="${s.y2}" stroke="${GROUND[s.g]?.fill ?? GROUND[0].fill}" stroke-width="36" stroke-linecap="round"/>`).join('');
  const stones = segs
    .filter((s) => s.g === 1)
    .map((s) => `<line x1="${s.x1}" y1="${s.y1}" x2="${s.x2}" y2="${s.y2}" stroke="#b7b1a5" stroke-width="30" stroke-dasharray="7 9" stroke-linecap="butt" opacity=".55"/>`)
    .join('');
  const svg = `<defs>${bg}</defs><rect y="${BOARD_Y}" width="${BOARD_W}" height="${BOARD_H}" fill="url(#bg-${board})"/>
    <g opacity=".25">${Array.from({ length: 6 }, (_, i) => `<ellipse cx="${(hash(board + i)() * 800).toFixed(0)}" cy="${(BOARD_Y + hash(board + 'y' + i)() * 448).toFixed(0)}" rx="160" ry="90" fill="${island === 1 ? '#a9df7a' : '#f5e3b2'}"/>`).join('')}</g>
    ${decorations(board, segs)}<g>${roadEdge}</g><g>${roadFill}</g><g>${stones}</g>`;
  staticCache.set(board, svg);
  return svg;
}

export interface BoardHandlers {
  onPoint(id: string): void;
  onCharacter(ch: CharId): void;
  onHoverCharacter?(ch: CharId | null, x: number, y: number): void;
  /** Obstacles (Schranke/Felsen): click on the gate of point n */
  onObstacle?(board: string, n: number): void;
}

export class BoardView {
  readonly svg: SVGSVGElement;
  private layerBg: SVGGElement;
  private layerPts: SVGGElement;
  private layerChars: SVGGElement;
  private layerDecor: SVGGElement;
  private layerTop: SVGGElement;
  private tokens = new Map<CharId, SVGGElement>();
  private decor: OrigBoardDecor | null = null;
  private moodTimer = 0;
  private state: GameState | null = null;
  /** true while the board is drawn with the original Landscape graphics */
  orig = false;
  board = '';
  targets: string[] = [];

  constructor(private handlers: BoardHandlers) {
    this.svg = document.createElementNS(NS, 'svg');
    this.svg.setAttribute('viewBox', `0 ${BOARD_Y} ${BOARD_W} ${BOARD_H}`);
    this.svg.setAttribute('class', 'board');
    this.svg.setAttribute('role', 'application');
    this.svg.setAttribute('aria-label', 'Spielfeld');
    const layer = () => document.createElementNS(NS, 'g');
    this.layerBg = layer();
    this.layerPts = layer();
    this.layerChars = layer();
    this.layerDecor = layer();
    this.layerDecor.setAttribute('class', 'odecor-layer');
    this.layerTop = layer();
    this.layerTop.setAttribute('class', 'otop-layer');
    this.svg.append(this.layerBg, this.layerPts, this.layerChars, this.layerDecor, this.layerTop);
    this.svg.addEventListener('click', (e) => {
      // obstacle sprites lie above points and figures (channels 61/62); hit test by alpha like matte ink
      const obs = this.decor && this.decor.hitObstacle(...this.toBoard(e));
      if (obs) return this.handlers.onObstacle?.(this.board, obs);
      const el = (e.target as Element).closest('[data-obs],[data-pt],[data-ch]') as HTMLElement | null;
      if (!el) return;
      if (el.dataset.obs) this.handlers.onObstacle?.(this.board, Number(el.dataset.obs));
      else if (el.dataset.ch) this.handlers.onCharacter(el.dataset.ch as CharId);
      else if (el.dataset.pt) this.handlers.onPoint(el.dataset.pt);
    });
    this.svg.addEventListener('pointermove', (e) => {
      if (this.decor && e.pointerType === 'mouse') this.svg.classList.toggle('over-obstacle', !!this.decor.hitObstacle(...this.toBoard(e)));
    });
    this.svg.addEventListener('pointerover', (e) => {
      const el = (e.target as Element).closest('[data-ch]') as HTMLElement | null;
      if (!el) return;
      if (this.orig) return this.moodLater(el.dataset.ch as CharId);
      if (this.handlers.onHoverCharacter) {
        const r = el.getBoundingClientRect();
        this.handlers.onHoverCharacter(el.dataset.ch as CharId, r.left + r.width / 2, r.top);
      }
    });
    this.svg.addEventListener('pointerout', (e) => {
      const el = (e.target as Element).closest('[data-ch]');
      if (!el) return;
      if (this.orig) return this.moodHide();
      if (this.handlers.onHoverCharacter) this.handlers.onHoverCharacter(null, 0, 0);
    });
  }

  show(s: GameState, board: string, targets: string[]) {
    this.state = s;
    const orig = hasOrigBoard(board);
    if (board !== this.board || orig !== this.orig) {
      this.board = board;
      this.orig = orig;
      this.svg.classList.toggle('orig', orig);
      this.decor?.destroy();
      this.decor = null;
      this.moodHide();
      for (const g of this.tokens.values()) g.remove();
      this.tokens.clear();
      if (orig) {
        preloadBoardMembers();
        this.layerBg.innerHTML = origBackground(board);
        this.decor = new OrigBoardDecor(board, this.layerDecor, (b, n) => this.handlers.onObstacle?.(b, n));
        void this.decor.load((n) => this.blocked(n));
      } else {
        this.layerBg.innerHTML = boardBackground(board);
      }
    } else {
      this.decor?.resume();
    }
    this.targets = targets;
    this.renderPoints(s);
    this.renderChars(s);
  }

  /** client position -> board (= original stage) coordinates */
  private toBoard(e: { clientX: number; clientY: number }): [number, number] {
    const m = this.svg.getScreenCTM();
    if (!m) return [-1, -1];
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    return [p.x, p.y];
  }

  private blocked(n: number): boolean {
    return !!this.state && pointState(this.state, pointId(this.board, n)) === 'BLK';
  }

  renderPoints(s: GameState) {
    this.state = s;
    const tset = new Set(this.targets);
    const obstacles = OBSTACLE_POINTS[this.board] ?? [];
    let html = '';
    for (const p of BOARDS[this.board]) {
      if (p.x === 0 && p.y === 0) continue;
      const id = pointId(this.board, p.n);
      const st = pointState(s, id);
      const typ = checkPointTyp(id);
      const isT = tset.has(id);
      let mark: string;
      let gate = '';
      if (this.orig) {
        // a blocked point is covered by its obstacle sprite (decor layer); the point itself stays like the original
        mark = origPoint(st, typ, isT);
      } else {
        if (st === 'BLK') {
          mark = `<rect x="-22" y="-7" width="44" height="14" rx="4" fill="#d33" stroke="#7a1010" stroke-width="2"/><path d="M-16 -7 l8 14 M0 -7 l8 14" stroke="#fff" stroke-width="4"/><circle cx="-22" r="5" fill="#555"/><circle cx="22" r="5" fill="#555"/>`;
        } else if (typ !== 'standard') {
          mark = `<circle r="17" fill="#e8483f" stroke="#fff" stroke-width="3"/><path d="M0 -9 l3 6 7 1 -5 5 1 7 -6 -3 -6 3 1 -7 -5 -5 7 -1z" fill="#ffe27a"/>`;
        } else if (st === 'JOK') {
          mark = `<circle r="15" fill="#3d7ee0" stroke="#fff" stroke-width="3"/><text y="6" text-anchor="middle" font-size="16">😄</text>`;
        } else {
          mark = `<circle r="11" fill="#3d7ee0" stroke="#fff" stroke-width="3"/>`;
        }
        if (obstacles.includes(p.n)) {
          // clickable gate post next to the point (Obstacles behaviour without the original sprites)
          const closed = st === 'BLK';
          gate = `<g class="gate" data-obs="${p.n}" transform="translate(${p.x + 30} ${p.y - 26})" role="button" tabindex="0" aria-label="Hindernis an Feld ${p.n} ${closed ? 'öffnen' : 'schließen'}">
            <circle r="16" fill="transparent"/><circle r="11" fill="${closed ? '#d33' : '#7a7a7a'}" stroke="#fff" stroke-width="2"/><path d="${closed ? 'M-5 -5 l10 10 M5 -5 l-10 10' : 'M-5 0 h10'}" stroke="#fff" stroke-width="3" stroke-linecap="round"/></g>`;
        }
      }
      const ring = isT && !this.orig ? `<circle r="22" class="target-ring"/>` : '';
      const label = typ !== 'standard' ? `${typ === 'game' ? 'Spiel' : 'Abenteuer'}feld` : st === 'JOK' ? 'Witzfeld' : 'Feld';
      html += `<g class="pt${isT ? ' is-target' : ''}" data-pt="${id}" transform="translate(${p.x} ${p.y})" role="button" aria-label="${label} ${p.n}${isT ? ' (erreichbar)' : ''}" tabindex="${isT ? 0 : -1}">
        <circle r="30" fill="transparent"/>${ring}${mark}</g>${gate}`;
    }
    this.layerPts.innerHTML = html;
    this.decor?.syncObstacles((n) => this.blocked(n));
  }

  private pos(s: GameState, ch: CharId): { x: number; y: number; rot: number; dir: number } | null {
    const c = s.chars[ch];
    if (c.screen !== this.board || c.position < 1) return null;
    const p = BOARDS[this.board][c.position - 1];
    return { x: p.x, y: p.y, rot: ((c.direction || 1) - 1) * 90, dir: c.direction || 1 };
  }

  private makeToken(ch: CharId): SVGGElement {
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('class', `char char-${ch}`);
    g.dataset.ch = ch;
    g.setAttribute('role', 'button');
    g.setAttribute('aria-label', LOOKS[ch].name);
    g.innerHTML = this.orig ? origToken(ch) || `<g class="rot">${tokenSVG(ch)}</g>` : `<g class="rot">${tokenSVG(ch)}</g>`;
    // Director channel order: CH1 (51) below … CH9 (59) on top
    const after = [...this.tokens.entries()].filter(([c]) => c > ch).map(([, el]) => el).sort((a, b) => (a.dataset.ch! < b.dataset.ch! ? -1 : 1))[0];
    this.layerChars.insertBefore(g, after ?? null);
    this.tokens.set(ch, g);
    return g;
  }

  renderChars(s: GameState) {
    for (const ch of ALL_CHARS) {
      const p = this.pos(s, ch);
      let g = this.tokens.get(ch);
      if (!p) {
        g?.remove();
        this.tokens.delete(ch);
        continue;
      }
      if (!g) g = this.makeToken(ch);
      g.style.opacity = '';
      g.classList.toggle('current', ch === s.currentCharacter);
      g.setAttribute('transform', `translate(${p.x} ${p.y})`);
      g.dataset.rot = String(p.rot);
      g.dataset.dir = String(p.dir);
      (g.firstElementChild as SVGGElement).setAttribute('transform', `rotate(${p.rot})`);
    }
  }

  /** Animate a token along a path (board-local points only; off-board steps are skipped). */
  async animatePath(ch: CharId, path: string[], stepMs: number, onStep?: (id: string, i: number) => void): Promise<void> {
    this.moodHide();
    let g = this.tokens.get(ch);
    if (!g) {
      g = this.makeToken(ch);
      g.style.opacity = '0';
    }
    const rot = g.firstElementChild as SVGGElement;
    // original timing: one update every 30 ms (turbo: 5 ms -> limited by the browser)
    const frameMs = stepMs >= 200 ? 30 : 8;
    for (let i = 1; i < path.length; i++) {
      const a = getPoint(path[i - 1])!, b = getPoint(path[i])!;
      const [ba] = splitPoint(path[i - 1]), [bb] = splitPoint(path[i]);
      const d = a.nb.indexOf(path[i]);
      if (ba !== this.board && bb !== this.board) continue;
      // entering from another board: start one field outside the edge (original: nextTrackPoint)
      let ax = a.x, ay = a.y;
      const enter = ba !== this.board;
      if (enter) {
        [ax, ay] = beyond(b.x, b.y, d, -1);
        g.style.opacity = '1';
      }
      let bx = b.x, by = b.y;
      if (bb !== this.board) [bx, by] = beyond(a.x, a.y, d);
      if (this.orig && rot.querySelector('image.ochar')) {
        await origHop(g, ch, ax, ay, d + 1, frameMs, enter);
        g.setAttribute('transform', `translate(${bx} ${by})`);
      } else {
        rot.setAttribute('transform', `rotate(${d * 90})`);
        await hop(g, ax, ay, bx, by, stepMs);
      }
      onStep?.(path[i], i);
      if (bb !== this.board) g.style.opacity = '0';
    }
  }

  pointCenterOnScreen(id: string): { x: number; y: number } | null {
    const el = this.layerPts.querySelector(`[data-pt="${id}"]`);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  // ---------------------------------------------------------------- mood bubble (sprite 75)

  private moodLater(ch: CharId) {
    clearTimeout(this.moodTimer);
    this.moodTimer = window.setTimeout(() => {
      const tok = this.tokens.get(ch);
      const s = this.state;
      if (!tok || !s || !tok.isConnected) return;
      const m = moodMember(s.chars[ch].mood);
      if (!m) return;
      const p = this.pos(s, ch);
      if (!p) return;
      let img = this.layerTop.querySelector('image.omood') as SVGImageElement | null;
      if (!img) {
        img = document.createElementNS(NS, 'image') as SVGImageElement;
        img.setAttribute('class', 'omood');
        this.layerTop.appendChild(img);
      }
      setImage(img, m, p.x, p.y);
      img.setAttribute('aria-label', `${LOOKS[ch].name}: Laune ${s.chars[ch].mood}`);
    }, 1000);
  }

  private moodHide() {
    clearTimeout(this.moodTimer);
    this.layerTop.querySelector('image.omood')?.remove();
  }
}

function hop(g: SVGGElement, x1: number, y1: number, x2: number, y2: number, ms: number): Promise<void> {
  return new Promise((resolve) => {
    const t0 = performance.now();
    const frame = (t: number) => {
      const k = Math.min(1, (t - t0) / ms);
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      const lift = Math.sin(k * Math.PI);
      const x = x1 + (x2 - x1) * e, y = y1 + (y2 - y1) * e;
      g.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${(1 + lift * 0.28).toFixed(3)})`);
      if (k < 1) requestAnimationFrame(frame);
      else resolve();
    };
    requestAnimationFrame(frame);
  });
}
