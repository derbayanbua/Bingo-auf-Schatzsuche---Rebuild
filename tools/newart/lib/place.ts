// Score-based placement helpers: where a member sits in scene coordinates (stage y - 45).
//
//   placeOf(m)            → {x, y, ink} top-left of the member canvas in scene coords (or null if not in the score)
//   cropOf(m, scene)      → draws a full-scene SVG layer (0..800 × 0..448) cropped to the member canvas
//
// Animation members of one sprite (Movie-Loop / Two-State ranges pFirstMember..pLastMember) share the
// sprite's loc, so every frame can be drawn as a crop of a scene state – parts line up with the background.

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Member, PACK } from './api';
import { g } from './svg';

type Sprite = [number, number, number, number, number, number, number, string, number, { name: string; params: Record<string, unknown> }[], string];
interface Score { frames: { sprites: Sprite[] }[] }

const cache = new Map<string, Map<number, { x: number; y: number; ink: string }>>();

function load(dir: string): Map<number, { x: number; y: number; ink: string }> {
  let res = cache.get(dir);
  if (res) return res;
  res = new Map();
  cache.set(dir, res);
  const f = join(PACK, 'score', `${dir}.json`);
  if (!existsSync(f)) return res;
  const sc = JSON.parse(readFileSync(f, 'utf8')) as Score;
  const idx = (JSON.parse(readFileSync(join(PACK, 'index.json'), 'utf8')) as Record<string, Record<string, [number, number, number, number, string]>>)[dir] ?? {};
  for (const fr of sc.frames) {
    for (const sp of fr.sprites) {
      const [, lib, mem, left, top, , , ink] = sp;
      if (lib !== 1) continue;
      const e = idx[String(mem)];
      if (!e) continue;
      const locX = left + e[2], locY = top - 45 + e[3];
      const nums = new Set<number>([mem]);
      for (const b of sp[9] ?? []) {
        const a = b.params?.pFirstMember as { member: number; castLib: number } | undefined;
        const z = b.params?.pLastMember as { member: number; castLib: number } | undefined;
        if (a && z && a.castLib === 1) for (let n = a.member; n <= z.member; n++) nums.add(n);
      }
      for (const n of nums) {
        const en = idx[String(n)];
        if (!en || res.has(n)) continue;
        res.set(n, { x: locX - en[2], y: locY - en[3], ink });
      }
    }
  }
  return res;
}

export function placeOf(m: Member): { x: number; y: number; ink: string } | null {
  return load(m.dir).get(m.num) ?? null;
}

/** crop a scene-coordinate layer to the member canvas; fallback position (x,y) when the member is not in the score */
export function cropOf(m: Member, scene: string, fx = 0, fy = 0): string {
  const p = placeOf(m) ?? { x: fx, y: fy };
  return g({ transform: `translate(${-p.x} ${-p.y})` }, scene);
}
