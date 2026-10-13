// Lightweight Director-like sprite stage for the original graphics.
//
//   const movie = await loadMovie('AS001-01');          // null without public/orig/gfx
//   const stage = new Stage({ originY: 45 });            // 800x448 scene area of the 800x600 stage
//   host.append(stage.el);
//   await stage.loadFrame(movie, 1, (s) => s.ch < 80);   // score sprites of frame 1
//   stage.on(13, 'mouseUp', (sp) => stage.playSequence(13, 'Door-1', 'Door-7', 25));
//
// Rendering: absolutely positioned <img> elements inside an 800xH box that is scaled with a CSS
// transform to fit its host (crisp, cheap, no canvas redraw). Hit testing respects the alpha
// channel of the member bitmap (like Director's matte ink), so clicks fall through transparent
// pixels to lower channels. Higher channel = drawn on top (z-index = channel).

import { cursorCss, gfxBase, gfxIndex, gfxUrl, loadGfxIndex, movieDir } from './gfx';

// ------------------------------------------------------------------ movie / score data

export interface Behavior {
  name: string;
  params: Record<string, any>;
}

/** Score sprite row: [ch, castLib, member, left, top, w, h, ink, blend, behaviors, name] */
type RawSprite = [number, number, number, number, number, number, number, string, number, Behavior[], string];

export interface ScoreSprite {
  ch: number;
  castLib: number;
  member: number;
  left: number;
  top: number;
  width: number;
  height: number;
  ink: string;
  blend: number;
  behaviors: Behavior[];
  name: string;
}

export interface Frame {
  /** frame numbers covered by this distinct frame */
  numbers: number[];
  script?: string;
  tempo?: number;
  sprites: ScoreSprite[];
}

export interface MemberRef {
  /** cast dump dir, e.g. 'Adventure_AS001-01' or 'Shared_Graphic-1' */
  dir: string;
  castLib: number;
  num: number;
  name: string;
  w: number;
  h: number;
  regX: number;
  regY: number;
  /** URL of the bitmap; null for non-bitmap members (shapes, scripts, sounds) */
  url: string | null;
}

interface RawScore {
  movie: string;
  frameCount: number;
  libs: (string | null)[];
  libNames: string[];
  labels: { frame: number; name: string }[];
  frames: { frames: (number | string)[]; script?: string; tempo?: number; sprites: RawSprite[] }[];
}

export class Movie {
  readonly id: string;
  readonly dir: string;
  readonly frameCount: number;
  readonly libs: (string | null)[];
  readonly labels: { frame: number; name: string }[];
  readonly frames: Frame[];
  private byFrame = new Map<number, Frame>();
  private nameCache = new Map<string, MemberRef | null>();

  constructor(raw: RawScore) {
    this.dir = raw.movie;
    this.id = raw.movie.replace(/^[A-Za-z]+_/, '');
    this.frameCount = raw.frameCount;
    this.libs = raw.libs;
    this.labels = raw.labels;
    this.frames = raw.frames.map((f) => {
      const numbers: number[] = [];
      for (const r of f.frames) {
        const [a, b] = String(r).split('-').map(Number);
        for (let i = a; i <= (b || a); i++) numbers.push(i);
      }
      const fr: Frame = {
        numbers, script: f.script, tempo: f.tempo,
        sprites: f.sprites.map(([ch, castLib, member, left, top, width, height, ink, blend, behaviors, name]) =>
          ({ ch, castLib, member, left, top, width, height, ink, blend, behaviors, name })),
      };
      for (const n of numbers) this.byFrame.set(n, fr);
      return fr;
    });
  }

  /** Score frame by number or label (Director `go to frame "x"`). */
  frame(f: number | string = 1): Frame | null {
    if (typeof f === 'string') {
      const want = f.toLowerCase();
      const l = this.labels.find((x) => x.name.toLowerCase() === want);
      if (!l) return null;
      f = l.frame;
    }
    return this.byFrame.get(f) ?? null;
  }

  labelFrame(label: string): number | null {
    return this.labels.find((x) => x.name.toLowerCase() === label.toLowerCase())?.frame ?? null;
  }

  /** member n of castLib c */
  memberAt(castLib: number, num: number): MemberRef | null {
    const dir = this.libs[castLib - 1];
    if (!dir) return null;
    const info = gfxIndex()?.[dir]?.[String(num)];
    if (!info) return { dir, castLib, num, name: '', w: 0, h: 0, regX: 0, regY: 0, url: null };
    return { dir, castLib, num, name: info[4], w: info[0], h: info[1], regX: info[2], regY: info[3], url: gfxUrl(dir, num) };
  }

  /** member("Name") / member("Name", castLib): searches the cast libraries in order like Director. */
  member(name: string, castLib?: number): MemberRef | null {
    const key = `${castLib ?? ''}|${name}`;
    if (this.nameCache.has(key)) return this.nameCache.get(key)!;
    const idx = gfxIndex();
    let res: MemberRef | null = null;
    const lower = name.toLowerCase();
    for (let i = 0; i < this.libs.length && !res; i++) {
      if (castLib && castLib !== i + 1) continue;
      const dir = this.libs[i];
      const lib = dir ? idx?.[dir] : null;
      if (!lib) continue;
      for (const [m, info] of Object.entries(lib)) {
        if (info[4].toLowerCase() === lower) {
          res = this.memberAt(i + 1, +m);
          break;
        }
      }
    }
    this.nameCache.set(key, res);
    return res;
  }

  /** Members Base-first .. Base-last (Director animation naming), skipping missing ones. */
  sequence(first: string | MemberRef, last: string | MemberRef): MemberRef[] {
    const a = typeof first === 'string' ? this.member(first) : first;
    const b = typeof last === 'string' ? this.member(last) : last;
    if (!a || !b) return [];
    const ma = /^(.*)-(\d+)$/.exec(a.name);
    const mb = /^(.*)-(\d+)$/.exec(b.name);
    if (!ma || !mb) return [a, b];
    const base = mb[1];
    const i0 = +ma[2];
    const i1 = +mb[2];
    const out: MemberRef[] = [];
    const step = i1 >= i0 ? 1 : -1;
    for (let i = i0; step > 0 ? i <= i1 : i >= i1; i += step) {
      const m = this.member(`${base}-${i}`);
      if (m) out.push(m);
    }
    return out;
  }
}

const movieCache = new Map<string, Promise<Movie | null>>();

/** Load the runtime score of a movie ('AS001-01', 'GS016-01', 'SP001', 'Adventure_AS001-01' …). */
export function loadMovie(id: string): Promise<Movie | null> {
  const dir = movieDir(id);
  let p = movieCache.get(dir);
  if (!p) {
    p = loadGfxIndex().then(async (idx) => {
      if (!idx || !idx[dir]) return null;
      try {
        const r = await fetch(`${gfxBase()}score/${dir}.json`);
        if (!r.ok) return null;
        return new Movie((await r.json()) as RawScore);
      } catch {
        return null;
      }
    });
    movieCache.set(dir, p);
  }
  return p;
}

// ------------------------------------------------------------------ image cache + alpha masks

const imgCache = new Map<string, Promise<HTMLImageElement>>();
const alphaCache = new Map<string, { w: number; h: number; a: Uint8Array } | null>();

export function preload(url: string): Promise<HTMLImageElement> {
  let p = imgCache.get(url);
  if (!p) {
    p = new Promise<HTMLImageElement>((res) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => res(img);
      img.onerror = () => res(img);
      img.src = url;
    });
    imgCache.set(url, p);
  }
  return p;
}

function alphaOf(url: string): { w: number; h: number; a: Uint8Array } | null | undefined {
  if (alphaCache.has(url)) return alphaCache.get(url);
  // computed lazily once the image is loaded
  void preload(url).then((img) => {
    if (alphaCache.has(url)) return;
    try {
      const w = img.naturalWidth, h = img.naturalHeight;
      if (!w || !h) return alphaCache.set(url, null);
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const g = c.getContext('2d', { willReadFrequently: true });
      if (!g) return alphaCache.set(url, null);
      g.drawImage(img, 0, 0);
      const d = g.getImageData(0, 0, w, h).data;
      const a = new Uint8Array(w * h);
      for (let i = 0; i < a.length; i++) a[i] = d[i * 4 + 3];
      alphaCache.set(url, { w, h, a });
    } catch {
      alphaCache.set(url, null);
    }
  });
  return undefined;
}

// ------------------------------------------------------------------ sprites

export type SpriteEvent = 'mouseDown' | 'mouseUp' | 'mouseEnter' | 'mouseLeave' | 'mouseWithin';
export type SpriteHandler = (sp: Sprite, e: PointerEvent, pt: { x: number; y: number }) => void;

export class Sprite {
  readonly ch: number;
  readonly el: HTMLImageElement | HTMLDivElement;
  member: MemberRef | null = null;
  /** registration point in stage coordinates (Director loc) */
  locH = 0;
  locV = 0;
  /** explicit size (stretched sprite); null = member size */
  width: number | null = null;
  height: number | null = null;
  ink = 'copy';
  behaviors: Behavior[] = [];
  /** name of the score member (for debugging) */
  name = '';
  /** free per-sprite data for ported Lingo behaviours */
  props: Record<string, unknown> = {};
  /** cursor shown while hovering: 'make' | 'take' | 'look' | 'walk' | 'talk' | CSS cursor | null */
  cursor: string | null = null;
  /** false = never receives pointer events (decoration) */
  hot = false;
  /** Lingo: blend 0 sprites are invisible but still get mouse events (drop spots, hidden buttons) */
  hitHidden = false;
  /** hit test by rectangle instead of the alpha mask (slots, fields) */
  hitRect = false;
  private _visible = true;
  private _blend = 100;
  private stage: Stage;

  constructor(stage: Stage, ch: number) {
    this.stage = stage;
    this.ch = ch;
    this.el = document.createElement('img');
    this.el.className = 'osp';
    (this.el as HTMLImageElement).alt = '';
    (this.el as HTMLImageElement).draggable = false;
    this.el.style.zIndex = String(ch);
  }

  get visible() {
    return this._visible;
  }
  set visible(v: boolean) {
    this._visible = v;
    this.el.style.display = v ? '' : 'none';
  }
  get blend() {
    return this._blend;
  }
  set blend(v: number) {
    this._blend = v;
    this.el.style.opacity = v >= 100 ? '' : String(Math.max(0, v) / 100);
  }
  get left() {
    return this.locH - this.regX();
  }
  get top() {
    return this.locV - this.regY();
  }
  get w() {
    return this.width ?? this.member?.w ?? 0;
  }
  get h() {
    return this.height ?? this.member?.h ?? 0;
  }
  private regX() {
    const m = this.member;
    if (!m) return 0;
    return this.width && m.w ? Math.round((m.regX * this.width) / m.w) : m.regX;
  }
  private regY() {
    const m = this.member;
    if (!m) return 0;
    return this.height && m.h ? Math.round((m.regY * this.height) / m.h) : m.regY;
  }

  /** sprite.member = member("Name") — keeps loc (registration point). */
  setMember(m: MemberRef | string | null): this {
    const ref = typeof m === 'string' ? this.stage.movie?.member(m) ?? null : m;
    this.member = ref;
    const img = this.el as HTMLImageElement;
    if (ref?.url) {
      if (img.getAttribute('src') !== ref.url) img.src = ref.url;
      img.style.visibility = '';
    } else {
      img.removeAttribute('src');
      img.style.visibility = 'hidden';
    }
    this.layout();
    return this;
  }

  /** sprite.loc = point(h, v) */
  setLoc(h: number, v: number): this {
    this.locH = h;
    this.locV = v;
    this.layout();
    return this;
  }

  /** move so that the sprite's rect starts at left/top (keeps registration offsets). */
  setRect(left: number, top: number, w?: number, h?: number): this {
    if (w !== undefined) this.width = w === this.member?.w ? null : w;
    if (h !== undefined) this.height = h === this.member?.h ? null : h;
    this.locH = left + this.regX();
    this.locV = top + this.regY();
    this.layout();
    return this;
  }

  layout() {
    const s = this.el.style;
    s.left = `${this.left}px`;
    s.top = `${this.top - this.stage.originY}px`;
    s.width = `${this.w}px`;
    s.height = `${this.h}px`;
  }

  rect() {
    return { left: this.left, top: this.top, right: this.left + this.w, bottom: this.top + this.h };
  }

  behavior(name: string): Behavior | undefined {
    return this.behaviors.find((b) => b.name === name);
  }

  /** point (stage coords) inside an opaque pixel; shapes / members without bitmap use their rect. */
  hit(x: number, y: number): boolean {
    if (!this._visible || (this._blend <= 0 && !this.hitHidden)) return false;
    const r = this.rect();
    if (x < r.left || y < r.top || x >= r.right || y >= r.bottom) return false;
    const url = this.member?.url;
    if (!url || this.hitRect) return true;
    const am = alphaOf(url);
    if (!am) return true; // not decoded yet / unreadable: rectangle
    const px = Math.floor(((x - r.left) * am.w) / this.w);
    const py = Math.floor(((y - r.top) * am.h) / this.h);
    return am.a[py * am.w + px] > 24;
  }
}

// ------------------------------------------------------------------ stage

export interface StageOptions {
  width?: number;
  height?: number;
  /** stage y that maps to the top of the view (45 for adventure/game scenes) */
  originY?: number;
  className?: string;
}

type TickFn = (now: number, dt: number) => void;

export class Stage {
  readonly el: HTMLDivElement;
  readonly inner: HTMLDivElement;
  readonly width: number;
  readonly height: number;
  readonly originY: number;
  movie: Movie | null = null;
  /** channel -> sprite */
  readonly sprites = new Map<number, Sprite>();
  private handlers = new Map<number, Map<SpriteEvent, SpriteHandler[]>>();
  private ticks = new Set<TickFn>();
  private raf = 0;
  private last = 0;
  private hover: Sprite | null = null;
  private down: Sprite | null = null;
  private ro: ResizeObserver | null = null;
  private destroyed = false;
  /** global cursor override (e.g. 'wait'); null = per-sprite */
  cursorOverride: string | null = null;
  /** character for #walk cursor */
  cursorCh: 'CH1' | 'CH2' = 'CH1';
  /** called for clicks that hit no hot sprite */
  onBackground: ((e: PointerEvent, pt: { x: number; y: number }) => void) | null = null;

  constructor(opts: StageOptions = {}) {
    this.width = opts.width ?? 800;
    this.height = opts.height ?? 448;
    this.originY = opts.originY ?? 45;
    this.el = document.createElement('div');
    this.el.className = `ostage ${opts.className ?? ''}`.trim();
    this.el.style.aspectRatio = `${this.width} / ${this.height}`;
    this.inner = document.createElement('div');
    this.inner.className = 'ostage-inner';
    this.inner.style.width = `${this.width}px`;
    this.inner.style.height = `${this.height}px`;
    this.el.append(this.inner);
    const fit = () => {
      const w = this.el.clientWidth;
      if (w) this.inner.style.transform = `scale(${w / this.width})`;
    };
    if (typeof ResizeObserver !== 'undefined') {
      this.ro = new ResizeObserver(fit);
      this.ro.observe(this.el);
    }
    requestAnimationFrame(fit);
    this.el.addEventListener('pointermove', (e) => this.onMove(e));
    this.el.addEventListener('pointerdown', (e) => this.onDown(e));
    this.el.addEventListener('pointerup', (e) => this.onUp(e));
    this.el.addEventListener('pointerleave', () => this.setHover(null, null));
    const loop = (t: number) => {
      if (this.destroyed) return;
      const dt = this.last ? t - this.last : 0;
      this.last = t;
      for (const f of [...this.ticks]) {
        try {
          f(t, dt);
        } catch (err) {
          console.error(err);
        }
      }
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    this.ro?.disconnect();
    this.ticks.clear();
    this.handlers.clear();
    this.el.remove();
  }

  get alive() {
    return !this.destroyed;
  }

  /** sprite(ch); created empty on first access (puppet sprite). */
  sprite(ch: number): Sprite {
    let s = this.sprites.get(ch);
    if (!s) {
      s = new Sprite(this, ch);
      this.sprites.set(ch, s);
      this.inner.append(s.el);
    }
    return s;
  }

  has(ch: number) {
    return this.sprites.has(ch);
  }

  removeSprite(ch: number) {
    this.sprites.get(ch)?.el.remove();
    this.sprites.delete(ch);
    this.handlers.delete(ch);
  }

  /** Put the score sprites of a frame onto the stage (filter e.g. to drop interface channels). */
  async loadFrame(movie: Movie, frame: number | string = 1, filter?: (s: ScoreSprite) => boolean): Promise<Sprite[]> {
    this.movie = movie;
    const f = movie.frame(frame);
    if (!f) return [];
    const out: Sprite[] = [];
    const waits: Promise<unknown>[] = [];
    for (const s of f.sprites) {
      if (filter && !filter(s)) continue;
      const m = movie.memberAt(s.castLib, s.member);
      const sp = this.sprite(s.ch);
      sp.name = s.name;
      sp.ink = s.ink;
      sp.behaviors = s.behaviors;
      sp.blend = s.blend;
      sp.setMember(m);
      sp.setRect(s.left, s.top, s.width, s.height);
      if (m?.url) waits.push(preload(m.url));
      out.push(sp);
    }
    await Promise.all(waits);
    return out;
  }

  // ---------------------------------------------------------------- events

  on(ch: number, ev: SpriteEvent, fn: SpriteHandler): () => void {
    let m = this.handlers.get(ch);
    if (!m) this.handlers.set(ch, (m = new Map()));
    const list = m.get(ev) ?? [];
    list.push(fn);
    m.set(ev, list);
    this.sprite(ch).hot = true;
    return () => {
      const l = m!.get(ev);
      if (l) l.splice(l.indexOf(fn), 1);
    };
  }

  off(ch: number) {
    this.handlers.delete(ch);
    const s = this.sprites.get(ch);
    if (s) s.hot = false;
  }

  /** frame callback (prepareFrame); returns an unsubscribe function */
  onTick(fn: TickFn): () => void {
    this.ticks.add(fn);
    return () => this.ticks.delete(fn);
  }

  /** stage coordinates (Director: the mouseH / the mouseV incl. originY) of a pointer event */
  toStage(e: { clientX: number; clientY: number }): { x: number; y: number } {
    const r = this.el.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) * this.width) / (r.width || 1),
      y: ((e.clientY - r.top) * this.height) / (r.height || 1) + this.originY,
    };
  }

  /** topmost hot sprite with an opaque pixel at the point (rollover / clickOn) */
  hitTest(x: number, y: number, hotOnly = true): Sprite | null {
    let best: Sprite | null = null;
    for (const s of this.sprites.values()) {
      if (hotOnly && !s.hot) continue;
      if (best && s.ch < best.ch) continue;
      if (s.hit(x, y)) best = s;
    }
    return best;
  }

  private emit(s: Sprite | null, ev: SpriteEvent, e: PointerEvent, pt: { x: number; y: number }) {
    if (!s) return;
    for (const fn of [...(this.handlers.get(s.ch)?.get(ev) ?? [])]) fn(s, e, pt);
  }

  private setHover(s: Sprite | null, e: PointerEvent | null) {
    if (s === this.hover) return;
    const pt = e ? this.toStage(e) : { x: -1, y: -1 };
    if (this.hover && e) this.emit(this.hover, 'mouseLeave', e, pt);
    this.hover = s;
    if (s && e) this.emit(s, 'mouseEnter', e, pt);
    this.updateCursor();
  }

  updateCursor() {
    const c = this.cursorOverride ?? (this.hover ? this.hover.cursor ?? 'make' : null);
    this.el.style.cursor = !c ? 'default' : /^(make|take|grab|talk|look|wait|walk)$/.test(c) ? cursorCss(c, this.cursorCh) : c;
  }

  private onMove(e: PointerEvent) {
    const pt = this.toStage(e);
    const s = this.hitTest(pt.x, pt.y);
    this.setHover(s, e);
    if (s) this.emit(s, 'mouseWithin', e, pt);
  }

  private onDown(e: PointerEvent) {
    const pt = this.toStage(e);
    const s = this.hitTest(pt.x, pt.y);
    this.down = s;
    if (s) this.emit(s, 'mouseDown', e, pt);
  }

  /**
   * Deliver a pointer release at a client position (drag & drop from outside the stage): mouseUp of
   * the topmost hot sprite there, else onBackground. Returns the sprite or null (also when the point
   * lies outside the stage).
   */
  releaseAt(e: PointerEvent): Sprite | null {
    const r = this.el.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX >= r.right || e.clientY < r.top || e.clientY >= r.bottom) return null;
    const pt = this.toStage(e);
    const s = this.hitTest(pt.x, pt.y);
    if (s) this.emit(s, 'mouseUp', e, pt);
    else this.onBackground?.(e, pt);
    this.down = null;
    return s;
  }

  /** topmost hot sprite at a client position (null outside the stage) */
  spriteAtClient(clientX: number, clientY: number): Sprite | null {
    const r = this.el.getBoundingClientRect();
    if (clientX < r.left || clientX >= r.right || clientY < r.top || clientY >= r.bottom) return null;
    const pt = this.toStage({ clientX, clientY });
    return this.hitTest(pt.x, pt.y);
  }

  /** client rectangle of a stage rectangle (stage coordinates incl. originY) */
  clientRect(r: { left: number; top: number; right: number; bottom: number }): DOMRect {
    const b = this.el.getBoundingClientRect();
    const k = (b.width || 1) / this.width;
    return new DOMRect(b.left + r.left * k, b.top + (r.top - this.originY) * k, (r.right - r.left) * k, (r.bottom - r.top) * k);
  }

  private onUp(e: PointerEvent) {
    const pt = this.toStage(e);
    const s = this.hitTest(pt.x, pt.y);
    // Director: mouseUp goes to the sprite that got the mouseDown (touch: same sprite)
    if (s && (s === this.down || this.down === null || e.pointerType === 'mouse')) this.emit(s, 'mouseUp', e, pt);
    else if (!s) this.onBackground?.(e, pt);
    this.down = null;
    if (e.pointerType !== 'mouse') this.setHover(null, e);
  }

  // ---------------------------------------------------------------- animation helpers

  /** wait n ms using the stage clock (resolves immediately when the stage is destroyed) */
  wait(ms: number): Promise<void> {
    return new Promise((res) => {
      let t0 = -1;
      const off = this.onTick((now) => {
        if (t0 < 0) t0 = now;
        if (now - t0 >= ms || !this.alive) {
          off();
          res();
        }
      });
      if (!this.alive) res();
    });
  }

  /**
   * Play the member sequence Base-a .. Base-b on a channel at fps (backwards when a > b, or pass
   * the members reversed). Resolves when the last member is shown. Starting a new sequence on the
   * same channel cancels the running one.
   */
  playSequence(ch: number, first: string | MemberRef, last: string | MemberRef, fps = 25, opts: { loop?: boolean; pendulum?: boolean } = {}): Promise<void> {
    const movie = this.movie;
    if (!movie) return Promise.resolve();
    const seq = movie.sequence(first, last);
    return this.playMembers(ch, seq, fps, opts);
  }

  /**
   * Like playSequence with explicit members. opts.onEdge(i) fires whenever the first (0) or last
   * (seq.length-1) member is reached; opts.onTurn(dir) when a pendulum changes direction
   * (Two-State Animation's #soundState1/2 and #soundForward/#soundBackward hooks).
   */
  playMembers(ch: number, seq: MemberRef[], fps = 25, opts: { loop?: boolean; pendulum?: boolean; onEdge?: (i: number) => void; onTurn?: (dir: 1 | -1) => void } = {}): Promise<void> {
    const sp = this.sprite(ch);
    const token = {};
    sp.props.__seq = token;
    for (const m of seq) if (m.url) void preload(m.url);
    if (!seq.length) return Promise.resolve();
    return new Promise((res) => {
      let i = 0, dir = 1, acc = 0;
      sp.setMember(seq[0]);
      const step = 1000 / Math.max(1, fps);
      const off = this.onTick((_t, dt) => {
        if (sp.props.__seq !== token || !this.alive) {
          off();
          return res();
        }
        acc += dt;
        while (acc >= step) {
          acc -= step;
          let n = i + dir;
          if (n >= seq.length || n < 0) {
            if (opts.pendulum && seq.length > 1) {
              dir = -dir;
              n = i + dir;
              if (opts.loop || dir === -1) opts.onTurn?.(dir as 1 | -1);
              if (!opts.loop && dir === 1) n = -1;
            } else if (opts.loop) n = dir > 0 ? 0 : seq.length - 1;
            else n = -1;
          }
          if (n < 0 || n >= seq.length) {
            off();
            return res();
          }
          i = n;
          sp.setMember(seq[i]);
          if (i === 0 || i === seq.length - 1) opts.onEdge?.(i);
        }
      });
    });
  }

  /** stop a running playSequence on a channel */
  stopSequence(ch: number) {
    const s = this.sprites.get(ch);
    if (s) delete s.props.__seq;
  }
}
