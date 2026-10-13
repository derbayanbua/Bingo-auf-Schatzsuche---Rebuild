// Original look of the Landscape movies (SPxxx) inside the SVG board of ui/boardView.ts.
// Optional: everything returns null/false without public/orig, the board then keeps its own vector art.
//
// Ported from the Landscape scores + Shared_Lingo behaviours:
//   ch 10      SPxxx-Board bitmap (800x448 at stage y=45)
//   ch 11..50  Spielfeldpunkt (BS34): pointBlue/pointRed/pointJoke-0 (blend 50), -1 = reachable target
//              under the mouse, -2 = other point under the mouse
//   ch 51..59  Character im Schauplatz (BS33): JmpXxx-1..20, rotation (direction-1)*90, turn in 30° steps,
//              jump = 20 frames, frames 3..17 move 5 px (= 75 px = one field), update every 30 ms (turbo 5 ms)
//   ch 60..74  decoration above the figures (trees, houses, palms) incl. animations (Storch + Shadow,
//              Movie-Loop, Random Two-State Animation) and Obstacles (BS41: Schranke/Felsen, pPointToBlock)
//   ch 75      mood bubble Gut/Neutral/Schlecht (shown 1 s after the mouse entered a figure)
// Board coordinates are stage coordinates (the original point data uses them: y = 70..445).

import type { CharId } from '../game/types';
import { gfxIndex, gfxUrl, hasOriginalGfx } from './gfx';
import { loadMovie, preload, type Behavior, type ScoreSprite } from './stage';

const NS = 'http://www.w3.org/2000/svg';
const G2 = 'Shared_Graphic-2';

export interface Mem { url: string; w: number; h: number; regX: number; regY: number; name: string }

/** Character channel member base (pCharacterID of the score sprites 51..59, identical in all 33 Landscape movies). */
export const JMP: Record<CharId, string> = {
  CH1: 'JmpBingo', CH2: 'JmpPuck', CH3: 'JmpReeling', CH4: 'JmpAlfred', CH5: 'JmpMagnus',
  CH6: 'JmpBen', CH7: 'JmpArnold', CH8: 'JmpTim', CH9: 'JmpRocco',
};

/** Obstacles (BS41) per board: pPointToBlock of the Schranke/Felsen sprites in the Landscape scores. */
export const OBSTACLE_POINTS: Record<string, number[]> = {
  SP001: [11], SP012: [6], SP032: [19], SP034: [6], SP043: [15],
};

const memCache = new Map<string, Mem | null>();

/** member by name in a cast dump dir ('Shared_Graphic-2', 'Landscape_SP001', …) */
export function mem(dir: string, name: string): Mem | null {
  const key = `${dir}|${name}`;
  const hit = memCache.get(key);
  if (hit !== undefined) return hit;
  let res: Mem | null = null;
  const lib = gfxIndex()?.[dir];
  if (lib) {
    for (const [m, info] of Object.entries(lib)) {
      if (info[4] === name) {
        res = { url: gfxUrl(dir, +m), w: info[0], h: info[1], regX: info[2], regY: info[3], name };
        break;
      }
    }
  }
  if (gfxIndex()) memCache.set(key, res);
  return res;
}

/** true if the original Landscape movie of this board is installed */
export function hasOrigBoard(board: string): boolean {
  return hasOriginalGfx() && !!mem(`Landscape_${board}`, `${board}-Board`);
}

function imageTag(m: Mem, x: number, y: number, extra = ''): string {
  return `<image href="${m.url}" x="${x - m.regX}" y="${y - m.regY}" width="${m.w}" height="${m.h}"${extra}/>`;
}

export function setImage(el: SVGImageElement, m: Mem, x: number, y: number) {
  if (el.getAttribute('href') !== m.url) el.setAttribute('href', m.url);
  el.setAttribute('x', String(x - m.regX));
  el.setAttribute('y', String(y - m.regY));
  el.setAttribute('width', String(m.w));
  el.setAttribute('height', String(m.h));
}

/** ch 10: the board bitmap (loc 400/269 = 800x448 at stage y 45) */
export function origBackground(board: string): string {
  const m = mem(`Landscape_${board}`, `${board}-Board`);
  return m ? `<rect x="0" y="45" width="800" height="448" fill="#000"/>${imageTag(m, 400, 269, ' class="obg"')}` : '';
}

/** Spielfeldpunkt: inner markup of a point group (translated to the point). */
export function origPoint(state: string | undefined, typ: 'standard' | 'adventure' | 'game', isTarget: boolean): string {
  const base = state === 'JOK' ? 'pointJoke' : typ === 'standard' ? 'pointBlue' : 'pointRed';
  const m0 = mem(G2, `${base}-${isTarget ? 1 : 0}`);
  const m2 = mem(G2, `${base}-2`);
  if (!m0) return '';
  // targets keep the -1 look permanently (touch screens have no hover); others: -2 on hover
  return imageTag(m0, 0, 0, ` class="op op0${isTarget ? ' tgt' : ''}"`) + (m2 && !isTarget ? imageTag(m2, 0, 0, ' class="op op2"') : '');
}

export function jmpMember(ch: CharId, frame: number): Mem | null {
  return mem(G2, `${JMP[ch]}-${frame}`);
}

/** markup of a figure token (rotation group + JmpXxx-1) */
export function origToken(ch: CharId): string {
  const m = jmpMember(ch, 1);
  return m ? `<g class="rot">${imageTag(m, 0, 0, ' class="ochar"')}</g>` : '';
}

let preloaded = false;
/** preload all jump frames + point members (once) */
export function preloadBoardMembers() {
  if (preloaded || !hasOriginalGfx()) return;
  preloaded = true;
  for (const ch of Object.keys(JMP) as CharId[]) for (let f = 1; f <= 20; f++) { const m = jmpMember(ch, f); if (m) void preload(m.url); }
  for (const b of ['pointBlue', 'pointRed', 'pointJoke']) for (let k = 0; k < 3; k++) { const m = mem(G2, `${b}-${k}`); if (m) void preload(m.url); }
}

export function moodMember(mood: number): Mem | null {
  return mem(G2, mood <= 30 ? 'Schlecht' : mood <= 60 ? 'Neutral' : 'Gut');
}

// ------------------------------------------------------------------ figure jump (Character im Schauplatz)

const DX = [0, 0, 5, 0, -5];
const DY = [0, -5, 0, 5, 0];

function tick(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * One step of a figure: turnAndJump(p) + 20 jump frames. `tok` is the translated group (data: x, y, dir, rot),
 * its first child the rotation group with the <image>. `enter` = coming from another board (no turning,
 * rotation set directly like nextTrackPoint).
 */
export async function origHop(tok: SVGGElement, ch: CharId, x: number, y: number, p: number, frameMs: number, enter: boolean): Promise<void> {
  const rotG = tok.firstElementChild as SVGGElement;
  const img = rotG.querySelector('image') as SVGImageElement | null;
  if (!img) return;
  let rot = Number(tok.dataset.rot ?? 0);
  const cur = Number(tok.dataset.dir || 0) || p;
  const place = (px: number, py: number) => tok.setAttribute('transform', `translate(${px} ${py})`);
  const setRot = () => rotG.setAttribute('transform', `rotate(${rot})`);
  place(x, y);
  if (enter) {
    rot = (p - 1) * 90;
    setRot();
  } else {
    const diff = Math.abs(p - cur);
    let deg = 0, turn: 'right' | 'left' | 'none' = 'none';
    if (diff === 1) { deg = 90; turn = p > cur ? 'right' : 'left'; }
    if (diff === 2) { deg = 180; turn = 'right'; } // original: random(2) -> #right in both cases
    if (diff === 3) { deg = 90; turn = p > cur ? 'left' : 'right'; }
    const target = turn === 'right' ? rot + deg : turn === 'left' ? rot - deg : rot;
    while (rot !== target) {
      rot += turn === 'right' ? 30 : -30;
      setRot();
      await tick(frameMs);
    }
    rot = ((rot % 360) + 360) % 360;
    setRot();
  }
  tok.dataset.dir = String(p);
  for (let f = 2; f <= 20; f++) {
    const m = jmpMember(ch, f);
    if (m) setImage(img, m, 0, 0);
    if (f > 2 && f < 18) { x += DX[p]; y += DY[p]; place(x, y); }
    await tick(frameMs);
  }
  const m1 = jmpMember(ch, 1);
  if (m1) setImage(img, m1, 0, 0);
  tok.dataset.rot = String(rot);
  tok.dataset.x = String(x);
  tok.dataset.y = String(y);
}

// ------------------------------------------------------------------ decoration + obstacles (ch 60..74)

interface Anim { step(now: number): void }

function seq(dir: string, libs: (string | null)[], first: { member: number; castLib: number }, last: { member: number; castLib: number }): { base: string; a: number; b: number; dir: string } | null {
  const d = libs[first.castLib - 1] ?? dir;
  const idx = gfxIndex()?.[d];
  const n1 = idx?.[String(first.member)]?.[4], n2 = idx?.[String(last.member)]?.[4];
  const m1 = n1 && /^(.*)-(\d+)$/.exec(n1), m2 = n2 && /^(.*)-(\d+)$/.exec(n2);
  if (!m1 || !m2) return null;
  return { base: m2[1], a: +m1[2], b: +m2[2], dir: d };
}

const rnd = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));

/** alpha masks of the obstacle members (matte ink: only opaque pixels are clickable) */
const alphaMasks = new Map<string, { w: number; h: number; a: Uint8Array } | null>();
function loadAlpha(url: string) {
  if (alphaMasks.has(url)) return;
  alphaMasks.set(url, null);
  void preload(url).then((img) => {
    try {
      const w = img.naturalWidth, h = img.naturalHeight;
      if (!w || !h) return;
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const g = c.getContext('2d', { willReadFrequently: true });
      if (!g) return;
      g.drawImage(img, 0, 0);
      const d = g.getImageData(0, 0, w, h).data;
      const a = new Uint8Array(w * h);
      for (let i = 0; i < a.length; i++) a[i] = d[i * 4 + 3];
      alphaMasks.set(url, { w, h, a });
    } catch {
      /* tainted / no canvas: bounding box */
    }
  });
}
function opaqueAt(el: SVGImageElement, x: number, y: number): boolean {
  const ix = x - Number(el.getAttribute('x')), iy = y - Number(el.getAttribute('y'));
  const w = Number(el.getAttribute('width')), h = Number(el.getAttribute('height'));
  if (ix < 0 || iy < 0 || ix >= w || iy >= h) return false;
  const m = alphaMasks.get(el.getAttribute('href') ?? '');
  if (!m) return true;
  const px = Math.floor((ix * m.w) / w), py = Math.floor((iy * m.h) / h);
  // a little tolerance for fingers: any opaque pixel within 4 px
  for (let dy = -4; dy <= 4; dy += 2) for (let dx = -4; dx <= 4; dx += 2) {
    const qx = px + dx, qy = py + dy;
    if (qx >= 0 && qy >= 0 && qx < m.w && qy < m.h && m.a[qy * m.w + qx] > 40) return true;
  }
  return false;
}

/**
 * Decoration layer of one board: loads the Landscape score and renders the sprites of channels 60..74
 * (drawn above the figures like in Director), runs their animations and the obstacle gates.
 */
export class OrigBoardDecor {
  private anims: Anim[] = [];
  private raf = 0;
  private obstacles = new Map<number, { img: SVGImageElement; loc: [number, number]; s: { base: string; a: number; b: number; dir: string }; frame: number; want: number; fps: number; last: number }>();
  alive = true;

  constructor(readonly board: string, private layer: SVGGElement, private onObstacle?: (board: string, n: number) => void) {}

  async load(blocked: (n: number) => boolean): Promise<void> {
    const movie = await loadMovie(this.board);
    if (!movie || !this.alive) return;
    const fr = movie.frame(1);
    if (!fr) return;
    const libs = movie.libs;
    const sprites = fr.sprites.filter((s) => s.ch >= 60 && s.ch < 75).sort((a, b) => a.ch - b.ch);
    const byCh = new Map<number, SVGImageElement>();
    const locs = new Map<number, [number, number]>();
    for (const sp of sprites) {
      const m = movie.memberAt(sp.castLib, sp.member);
      if (!m?.url) continue;
      const img = document.createElementNS(NS, 'image') as SVGImageElement;
      const loc: [number, number] = [sp.left + m.regX, sp.top + m.regY];
      setImage(img, { url: m.url, w: m.w, h: m.h, regX: m.regX, regY: m.regY, name: m.name }, loc[0], loc[1]);
      img.setAttribute('class', 'odecor');
      this.layer.appendChild(img);
      byCh.set(sp.ch, img);
      locs.set(sp.ch, loc);
    }
    for (const sp of sprites) {
      const img = byCh.get(sp.ch);
      if (!img) continue;
      for (const b of sp.behaviors) this.attach(b, sp, img, locs, byCh, libs, blocked);
    }
    if (this.anims.length || this.obstacles.size) this.loop();
  }

  private memberOf(dir: string, name: string): Mem | null {
    return mem(dir, name);
  }

  private attach(b: Behavior, sp: ScoreSprite, img: SVGImageElement, locs: Map<number, [number, number]>, byCh: Map<number, SVGImageElement>,
    libs: (string | null)[], blocked: (n: number) => boolean) {
    const dirOf = (castLib: number) => libs[castLib - 1] ?? `Landscape_${this.board}`;
    const loc = locs.get(sp.ch)!;
    const P = b.params ?? {};
    if (b.name === 'Obstacles') {
      const s = seq(dirOf(sp.castLib), libs, P.pFirstMember, P.pLastMember);
      const n = Number(P.pPointToBlock);
      if (!s || !n) return;
      for (let f = s.a; f <= s.b; f++) { const m = this.memberOf(s.dir, `${s.base}-${f}`); if (m) { void preload(m.url); loadAlpha(m.url); } }
      const frame = blocked(n) ? s.a : s.b;
      const o = { img, loc, s, frame, want: frame, fps: Number(P.pFrameRate) || 25, last: 0 };
      this.obstacles.set(n, o);
      this.show(o);
      img.classList.add('obstacle');
      img.setAttribute('aria-label', `Hindernis an Feld ${n} ${frame === s.a ? 'öffnen' : 'schließen'}`);
      // keyboard / screen readers: an invisible button over the gate (clicks are hit-tested by alpha, see hitObstacle)
      const r = document.createElementNS(NS, 'rect');
      r.setAttribute('class', 'obstacle-key');
      r.setAttribute('x', String(loc[0] - 18));
      r.setAttribute('y', String(loc[1] - 18));
      r.setAttribute('width', '36');
      r.setAttribute('height', '36');
      r.setAttribute('fill', 'transparent');
      r.setAttribute('tabindex', '0');
      r.setAttribute('role', 'button');
      r.setAttribute('aria-label', `Hindernis an Feld ${n}`);
      r.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.onObstacle?.(this.board, n); }
      });
      this.layer.appendChild(r);
      return;
    }
    if (b.name === 'Movie-Loop') {
      const s = seq(dirOf(P.pFirstMember?.castLib ?? sp.castLib), libs, P.pFirstMember, P.pLastMember);
      if (!s) return;
      const wait = 1000 / (Number(P.pFrameRate) || 15);
      const back = P.pStartMode === '#backward';
      if (P.pStartMode === '#stopped') return;
      let f = back ? s.b : s.a, t = 0;
      this.anims.push({ step: (now) => {
        if (now < t + wait) return;
        t = now;
        f += back ? -1 : 1;
        if (f > s.b) f = s.a;
        if (f < s.a) f = s.b;
        const m = this.memberOf(s.dir, `${s.base}-${f}`);
        if (m) setImage(img, m, loc[0], loc[1]);
      } });
      return;
    }
    if (b.name === 'Random Two-State Animation') {
      const s = seq(dirOf(P.pFirstMember?.castLib ?? sp.castLib), libs, P.pFirstMember, P.pLastMember);
      if (!s) return;
      const wait = 1000 / (Number(P.pFrameRate) || 25);
      let f = s.a, mode: 0 | 1 | -1 = 0, t = 0;
      let next = performance.now() + rnd(P.pState1WaitMin ?? 0, P.pState1WaitMax ?? 5000);
      this.anims.push({ step: (now) => {
        if (now < t + wait) return;
        if (mode === 0) {
          if (now > next) mode = f === s.a ? 1 : -1;
          return;
        }
        f += mode;
        const m = this.memberOf(s.dir, `${s.base}-${f}`);
        if (m) setImage(img, m, loc[0], loc[1]);
        if (f === s.a || f === s.b) {
          mode = 0;
          next = now + (f === s.a ? rnd(P.pState1WaitMin ?? 0, P.pState1WaitMax ?? 5000) : rnd(P.pState2WaitMin ?? 0, P.pState2WaitMax ?? 5000));
          return;
        }
        t = now;
      } });
      return;
    }
    if (b.name === 'Storch') {
      // SP001 local behaviour: starts after 5..20 s at the bottom, flies up-left (-3/-5 px per 40 ms), frames 1..6 pendulum
      const dir = dirOf(sp.castLib);
      const st = { x: loc[0], y: loc[1], f: 1, d: 1, mode: 0 as 0 | 1, launch: performance.now() + rnd(5000, 20000), t: 0 };
      (img as any).__storch = st;
      this.anims.push({ step: (now) => {
        if (now < st.t) return;
        st.t = now + 40;
        if (st.mode === 0) {
          if (now > st.launch) st.mode = 1;
          return;
        }
        const m = this.memberOf(dir, `Storch-${st.f}`);
        if (m && st.y - m.regY + m.h < 0) {
          st.mode = 0;
          st.x = rnd(1, 800);
          st.y = 750;
          st.launch = now + rnd(5000, 20000);
        }
        st.f += st.d;
        if (st.f === 7) { st.f = 5; st.d = -1; }
        if (st.f === 0) { st.f = 2; st.d = 1; }
        st.x -= 3;
        st.y -= 5;
        const m2 = this.memberOf(dir, `Storch-${st.f}`);
        if (m2) setImage(img, m2, st.x, st.y);
      } });
      return;
    }
    if (b.name === 'Shadow') {
      // follows sprite ch+1 (the stork) at +80/+40, own frames 1..6 pendulum
      const dir = dirOf(sp.castLib);
      const st = { f: 1, d: 1, t: 0 };
      this.anims.push({ step: (now) => {
        if (now < st.t) return;
        st.t = now + 40;
        const leader = byCh.get(sp.ch + 1) as any;
        const ls = leader?.__storch;
        if (!ls) return;
        st.f += st.d;
        if (st.f === 7) { st.f = 5; st.d = -1; }
        if (st.f === 0) { st.f = 2; st.d = 1; }
        const m = this.memberOf(dir, `Shadow-${st.f}`);
        if (m) setImage(img, m, ls.x + 80, ls.y + 40);
      } });
      return;
    }
    // clickShield (SP038 Composing-1) and plain decoration: static, transparent for clicks
  }

  private show(o: { img: SVGImageElement; loc: [number, number]; s: { base: string; dir: string }; frame: number }) {
    const m = this.memberOf(o.s.dir, `${o.s.base}-${o.frame}`);
    if (m) setImage(o.img, m, o.loc[0], o.loc[1]);
  }

  /** bring the obstacle gates in line with the board state (animated like Obstacles.updateSprite) */
  syncObstacles(blocked: (n: number) => boolean) {
    for (const [n, o] of this.obstacles) {
      o.want = blocked(n) ? o.s.a : o.s.b;
      o.img.setAttribute('aria-label', `Hindernis an Feld ${n} ${o.want === o.s.a ? 'öffnen' : 'schließen'}`);
    }
    if (!this.raf) this.loop();
  }

  private loop() {
    if (!this.alive || this.raf) return;
    const run = (now: number) => {
      this.raf = 0;
      if (!this.alive || !this.layer.isConnected) return; // resumed by resume() when shown again
      for (const a of this.anims) a.step(now);
      for (const o of this.obstacles.values()) {
        if (o.frame === o.want || now < o.last + 1000 / o.fps) continue;
        o.last = now;
        o.frame += o.want > o.frame ? 1 : -1;
        this.show(o);
      }
      const busy = this.anims.length > 0 || [...this.obstacles.values()].some((o) => o.frame !== o.want);
      if (busy) this.raf = requestAnimationFrame(run);
    };
    this.raf = requestAnimationFrame(run);
  }

  /** obstacle point whose gate has an opaque pixel at stage position x/y (Director matte ink hit test) */
  hitObstacle(x: number, y: number): number | null {
    for (const [n, o] of this.obstacles) if (opaqueAt(o.img, x, y)) return n;
    return null;
  }

  /** restart the animation loop (after the board was re-attached to the document) */
  resume() {
    if (this.alive && !this.raf) this.loop();
  }

  destroy() {
    this.alive = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.layer.replaceChildren();
  }
}
