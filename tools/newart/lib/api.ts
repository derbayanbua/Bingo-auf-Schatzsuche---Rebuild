// Public API for the art modules in tools/newart/scenes/<Dir>_<Movie>.ts.
//
//   import { defineMovie } from '../lib/api';
//   export default defineMovie({
//     Background: (m, w, h) => `<rect width="${w}" height="${h}" fill="#ffe9a8"/>`,
//     'Door-*': (m, w, h) => door(m.frame!, w, h),        // Door-1 .. Door-7
//     '#12': (m, w, h) => …,                               // by member number (duplicate names)
//   });
//
// A generator returns the SVG body in canvas pixels (0..w, 0..h) – it is wrapped into
// <svg width=w height=h> by the renderer – or a complete '<svg …>' document, or null (= no art yet,
// the renderer then writes the placeholder). The canvas is exactly the original member's size and the
// runtime places it with the original registration point (regX/regY), so `atReg()` lets you draw
// in "loc" coordinates (0,0 = registration point) instead.

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface Member {
  /** cast dump dir, e.g. 'Adventure_AS001-01' */
  dir: string;
  /** member number inside the cast */
  num: number;
  /** member name ('Door-3', 'Background', 'OI012' …) */
  name: string;
  w: number;
  h: number;
  regX: number;
  regY: number;
  /** name without the trailing -n ('Door' for 'Door-3'), else the full name */
  base: string;
  /** trailing frame number of 'Base-n' names, else null */
  frame: number | null;
}

export type ArtFn = (m: Member, w: number, h: number) => string | null | undefined;
export type MovieArt = Record<string, ArtFn>;

export function defineMovie(art: MovieArt): MovieArt {
  return art;
}

/** [w, h, regX, regY, name] per member number (same format as public/orig/gfx/index.json) */
export type IndexEntry = [number, number, number, number, string];
export type GfxIndex = Record<string, Record<string, IndexEntry>>;

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
export const PACK = join(ROOT, 'public', 'assets', 'gfx');

let idx: GfxIndex | null = null;
export function packIndex(): GfxIndex {
  if (!idx) idx = JSON.parse(readFileSync(join(PACK, 'index.json'), 'utf8')) as GfxIndex;
  return idx;
}

export function memberOf(dir: string, num: number, e: IndexEntry): Member {
  const mm = /^(.*)-(\d+)$/.exec(e[4]);
  return { dir, num, name: e[4], w: e[0], h: e[1], regX: e[2], regY: e[3], base: mm ? mm[1] : e[4], frame: mm ? +mm[2] : null };
}

/** all members of a cast dir (sorted by number) */
export function membersOf(dir: string): Member[] {
  const lib = packIndex()[dir] ?? {};
  return Object.entries(lib).map(([n, e]) => memberOf(dir, +n, e)).sort((a, b) => a.num - b.num);
}

/** member by name in a cast dir */
export function findMember(dir: string, name: string): Member | null {
  return membersOf(dir).find((m) => m.name === name) ?? null;
}

/** generator for a member: '#num' > exact name > 'Base-*' > '*' */
export function pickArt(art: MovieArt | null, m: Member): ArtFn | null {
  if (!art) return null;
  return art[`#${m.num}`] ?? art[m.name] ?? (m.frame !== null ? art[`${m.base}-*`] : undefined) ?? art['*'] ?? null;
}

/** translate so that (0,0) is the member's registration point (Director loc) */
export function atReg(m: Member, body: string): string {
  return `<g transform="translate(${m.regX} ${m.regY})">${body}</g>`;
}

const moduleCache = new Map<string, MovieArt | null>();
/** load tools/newart/scenes/<dir>.ts (null if there is none) */
export async function loadMovieArt(dir: string): Promise<MovieArt | null> {
  if (moduleCache.has(dir)) return moduleCache.get(dir)!;
  const file = join(ROOT, 'tools', 'newart', 'scenes', `${dir}.ts`);
  let art: MovieArt | null = null;
  if (existsSync(file)) {
    const mod = await import(pathToUrl(file));
    art = (mod.default ?? null) as MovieArt | null;
  }
  moduleCache.set(dir, art);
  return art;
}

function pathToUrl(p: string): string {
  return 'file:///' + p.replace(/\\/g, '/').replace(/^\/+/, '');
}
