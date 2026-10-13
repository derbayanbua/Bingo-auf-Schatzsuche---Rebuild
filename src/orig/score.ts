// Simple Director score playback on a Stage: go to a frame (number or label) and/or play frames
// at a tempo, applying the runtime score's sprites per frame (channel spans, positions, members).
//
//   const p = new ScorePlayer(stage, movie, { filter });
//   p.onSpriteBegin = (sp) => { ...attach behaviours...; return () => cleanup };   // beginSprite/endSprite
//   p.onEnterFrame((n) => { if (n === 69) return waitForVoice(); });              // frame scripts
//   await p.gotoFrame(1);                    // like `go to frame 1` (+ Director "stays" there)
//   await p.play({ to: 250, fps: 15 });      // run the playhead, resolves at frame 250 or on stop()
//
// Puppeted channels (p.puppet(ch)) are not touched by the score any more (Director puppetSprite).

import { preload, type Movie, type ScoreSprite, type Sprite, type Stage } from './stage';

type FrameHook = (frame: number) => void | Promise<unknown>;

export class ScorePlayer {
  readonly stage: Stage;
  readonly movie: Movie;
  /** current frame number (0 before the first gotoFrame) */
  frame = 0;
  /** sprite filter (e.g. drop interface channels); applied to every frame */
  filter: ((s: ScoreSprite) => boolean) | undefined;
  /** called when a sprite span starts in a channel (new channel or new behaviour set); return endSprite cleanup */
  onSpriteBegin: ((sp: Sprite, s: ScoreSprite) => void | (() => void)) | null = null;
  private puppets = new Set<number>();
  private spans = new Map<number, { sig: string; end?: () => void }>();
  private enterHooks = new Set<FrameHook>();
  private exitHooks = new Set<FrameHook>();
  private playToken = 0;
  private lastFrameObj: unknown = null;

  constructor(stage: Stage, movie: Movie, opts: { filter?: (s: ScoreSprite) => boolean } = {}) {
    this.stage = stage;
    this.movie = movie;
    this.filter = opts.filter;
    stage.movie = movie;
  }

  /** puppetSprite(ch, TRUE/FALSE): score changes no longer apply to the channel */
  puppet(ch: number, on = true): void {
    if (on) this.puppets.add(ch);
    else this.puppets.delete(ch);
  }

  /** frame script on enter (frame number); a returned promise pauses play() until resolved */
  onEnterFrame(fn: FrameHook): () => void {
    this.enterHooks.add(fn);
    return () => this.enterHooks.delete(fn);
  }

  /** exitFrame hook; a returned promise pauses play() */
  onExitFrame(fn: FrameHook): () => void {
    this.exitHooks.add(fn);
    return () => this.exitHooks.delete(fn);
  }

  /** resolve a label or number to a frame number (null if unknown) */
  resolve(f: number | string): number | null {
    if (typeof f === 'number') return f >= 1 && f <= Math.max(1, this.movie.frameCount) ? f : null;
    return this.movie.labelFrame(f);
  }

  /**
   * go to frame (number or label): apply that frame's sprites (only if the distinct score frame
   * changes), run the enter hooks. Returns false for unknown frames.
   */
  async gotoFrame(f: number | string): Promise<boolean> {
    const n = this.resolve(f);
    if (n === null) return false;
    await this.apply(n);
    await this.runHooks(this.enterHooks, n);
    return true;
  }

  private async apply(n: number): Promise<void> {
    this.frame = n;
    const fr = this.movie.frame(n);
    if (!fr || fr === this.lastFrameObj) return;
    this.lastFrameObj = fr;
    const seen = new Set<number>();
    const loads: Promise<unknown>[] = [];
    for (const s of fr.sprites) {
      if (this.filter && !this.filter(s)) continue;
      seen.add(s.ch);
      if (this.puppets.has(s.ch)) continue;
      const sig = `${s.castLib}:${JSON.stringify(s.behaviors)}`;
      const span = this.spans.get(s.ch);
      const sp = this.stage.sprite(s.ch);
      const m = this.movie.memberAt(s.castLib, s.member);
      const isNew = !span || span.sig !== sig;
      sp.name = s.name;
      sp.ink = s.ink;
      sp.behaviors = s.behaviors;
      if (isNew) sp.blend = s.blend;
      // keep members set by behaviours (animations) inside a span; only the position follows the score
      const memberChanged = this.scoreMemberChanged(s);
      if (isNew || !sp.member || memberChanged) sp.setMember(m);
      sp.setRect(s.left, s.top, s.width, s.height);
      if (m?.url) loads.push(preload(m.url));
      if (isNew) {
        span?.end?.();
        const end = this.onSpriteBegin?.(sp, s);
        this.spans.set(s.ch, { sig, end: typeof end === 'function' ? end : undefined });
      }
    }
    for (const [ch, span] of [...this.spans]) {
      if (seen.has(ch) || this.puppets.has(ch)) continue;
      span.end?.();
      this.spans.delete(ch);
      this.stage.removeSprite(ch);
    }
    await Promise.all(loads);
  }

  private prevMember = new Map<number, string>();
  private scoreMemberChanged(s: ScoreSprite): boolean {
    const k = `${s.castLib}:${s.member}`;
    const changed = this.prevMember.get(s.ch) !== k;
    this.prevMember.set(s.ch, k);
    return changed;
  }

  private async runHooks(hooks: Set<FrameHook>, n: number): Promise<void> {
    for (const fn of [...hooks]) {
      try {
        const r = fn(n);
        if (r && typeof (r as Promise<unknown>).then === 'function') await r;
      } catch (e) {
        console.error(e);
      }
    }
  }

  /**
   * Run the playhead from the current frame (or `from`) to `to` (default last frame) at `fps`
   * (default 15). `loop` restarts at `from`. Resolves at the end or when stop()/another play() runs.
   */
  async play(opts: { from?: number | string; to?: number | string; fps?: number; loop?: boolean } = {}): Promise<void> {
    const token = ++this.playToken;
    const from = opts.from !== undefined ? this.resolve(opts.from) ?? 1 : Math.max(1, this.frame || 1);
    const to = opts.to !== undefined ? this.resolve(opts.to) ?? this.movie.frameCount : this.movie.frameCount;
    const step = 1000 / Math.max(1, opts.fps ?? 15);
    let n = from;
    if (this.frame !== n) await this.gotoFrame(n);
    for (;;) {
      await this.stage.wait(step);
      if (token !== this.playToken || !this.stage.alive) return;
      await this.runHooks(this.exitHooks, n);
      if (token !== this.playToken || !this.stage.alive) return;
      if (n >= to) {
        if (!opts.loop) return;
        n = from;
      } else n++;
      await this.gotoFrame(n);
      if (token !== this.playToken) return;
    }
  }

  /** stop a running play() (the playhead stays on the current frame) */
  stop(): void {
    this.playToken++;
  }

  /** end all sprite spans (call on destroy) */
  destroy(): void {
    this.stop();
    for (const s of this.spans.values()) s.end?.();
    this.spans.clear();
    this.enterHooks.clear();
    this.exitHooks.clear();
  }
}
