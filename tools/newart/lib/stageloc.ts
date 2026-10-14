// Stage locations from the runtime score (scene coordinates = stage y - 45).
//
//   locOf(m)            → [x, y] Director loc of the member's sprite (also for animation frames / same-base
//                         siblings that are never placed in the score themselves), or null
//   inScene(m, body)    → draws `body` given in scene coordinates (0..800 × 0..448) into the member canvas
//
// Typical use: draw one function `world(state)` for a whole scene and crop every part member from it
// (opaque crops line up with the background exactly – the original part bitmaps are crops as well), or draw a
// single transparent object in scene coordinates.

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Member, PACK, membersOf } from './api';

type Sprite = [number, number, number, number, number, number, number, string, number, { name: string; params: Record<string, unknown> }[] | null, string];
interface Score { libs: string[]; frames: { sprites: Sprite[] }[] }

const cache = new Map<string, Map<number, [number, number]>>();

function locs(dir: string): Map<number, [number, number]> {
  let res = cache.get(dir);
  if (res) return res;
  res = new Map();
  cache.set(dir, res);
  const f = join(PACK, 'score', `${dir}.json`);
  const mem = membersOf(dir);
  const byNum = new Map(mem.map((m) => [m.num, m]));
  if (existsSync(f)) {
    const sc = JSON.parse(readFileSync(f, 'utf8')) as Score;
    for (const fr of sc.frames) {
      for (const sp of fr.sprites) {
        const [, lib, num, left, top] = sp;
        if (sc.libs[lib - 1] !== dir) continue;
        const m = byNum.get(num);
        if (!m || res.has(num)) continue;
        res.set(num, [left + m.regX, top - 45 + m.regY]);
        // animation ranges of this sprite share its loc
        for (const b of sp[9] ?? []) {
          const a = b.params?.pFirstMember as { member: number } | undefined;
          const z = b.params?.pLastMember as { member: number } | undefined;
          if (a && z) for (let n = a.member; n <= z.member; n++) if (!res.has(n)) res.set(n, res.get(num)!);
        }
      }
    }
  }
  // members never placed: take the loc of a placed member with the same base name
  for (const m of mem) {
    if (res.has(m.num)) continue;
    const sib = mem.find((o) => o.base === m.base && (o.frame === null) === (m.frame === null) && res!.has(o.num)) ??
      mem.find((o) => o.base === m.base && res!.has(o.num));
    if (sib) res.set(m.num, res.get(sib.num)!);
  }
  return res;
}

export function locOf(m: Member): [number, number] | null {
  return locs(m.dir).get(m.num) ?? null;
}

/** top-left of the member canvas in scene coordinates */
export function originOf(m: Member): [number, number] | null {
  const l = locOf(m);
  return l ? [l[0] - m.regX, l[1] - m.regY] : null;
}

/** body in scene coordinates, shifted into the member canvas (null when the member has no stage position) */
export function inScene(m: Member, body: string): string | null {
  const o = originOf(m);
  if (!o) return null;
  return `<g transform="translate(${-o[0]} ${-o[1]})">${safeOpacity(body)}</g>`;
}

/** like inScene, with an explicit loc (for members whose sprite is moved by a behaviour) */
export function atLoc(m: Member, loc: [number, number], body: string): string {
  return `<g transform="translate(${m.regX - loc[0]} ${m.regY - loc[1]})">${safeOpacity(body)}</g>`;
}

/**
 * resvg panics on `opacity` layers whose content lies completely outside the canvas (common in crops).
 * Group/element opacity is therefore turned into fill-/stroke-opacity (visually equivalent for flat art).
 */
export function safeOpacity(body: string): string {
  return body.replace(/ opacity="([^"]*)"/g, ' fill-opacity="$1" stroke-opacity="$1"');
}
