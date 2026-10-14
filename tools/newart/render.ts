// npm run art [-- <filter> …] [--force]
// Renders every member of public/assets/gfx/index.json to public/assets/gfx/<Dir>_<Movie>/<num>.webp:
// new art from tools/newart/scenes/<dir>.ts where a generator exists, otherwise a neutral placeholder.
// Unchanged SVGs are skipped (hash cache in tools/.cache/newart-cache.json). Also writes
// public/assets/gfx/coverage.json ({dir: [members with art, total]}) for the runtime and the report.

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PACK, ROOT, loadMovieArt, membersOf, packIndex, pickArt, type Member } from './lib/api';
import { placeholderSvg } from './lib/placeholder';
import { pngToWebp, svgToPng } from './lib/raster';
import { svgDoc } from './lib/svg';

const args = process.argv.slice(2);
const force = args.includes('--force');
const filters = args.filter((a) => !a.startsWith('--'));
const CACHE = join(ROOT, 'tools', '.cache', 'newart-cache.json');
const RENDER_VERSION = 4; // bump to re-render everything after raster changes

/** SVG document for a member + whether it is new art (false = placeholder) */
export async function memberSvg(m: Member): Promise<{ svg: string; art: boolean }> {
  const art = await loadMovieArt(m.dir);
  const fn = pickArt(art, m);
  let body: string | null | undefined = null;
  if (fn) {
    try {
      body = fn(m, m.w, m.h);
    } catch (e) {
      console.error(`  ! ${m.dir}/${m.num} ${m.name}: ${(e as Error).message}`);
      body = null;
    }
  }
  if (!body) return { svg: placeholderSvg(m), art: false };
  return { svg: body.trimStart().startsWith('<svg') ? body : svgDoc(m.w, m.h, body), art: true };
}

async function main() {
  const idx = packIndex();
  const cache: Record<string, string> = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, 'utf8')) : {};
  const coverage: Record<string, [number, number]> = {};
  let rendered = 0, skipped = 0, failed = 0;
  const queue: (() => Promise<void>)[] = [];
  for (const dir of Object.keys(idx).sort()) {
    const sel = !filters.length || filters.some((f) => dir.includes(f));
    const ms = membersOf(dir);
    let withArt = 0;
    for (const m of ms) {
      const { svg, art } = await memberSvg(m);
      if (art) withArt++;
      if (!sel) continue;
      const key = `${dir}/${m.num}`;
      const out = join(PACK, dir, `${m.num}.webp`);
      const hash = createHash('sha1').update(`${RENDER_VERSION}|${m.w}x${m.h}|${svg}`).digest('hex');
      if (!force && cache[key] === hash && existsSync(out)) {
        skipped++;
        continue;
      }
      queue.push(async () => {
        try {
          const png = svgToPng(svg, m.w, m.h);
          const webp = await pngToWebp(png);
          mkdirSync(join(PACK, dir), { recursive: true });
          writeFileSync(out, webp);
          cache[key] = hash;
          rendered++;
        } catch (e) {
          failed++;
          console.error(`  ! ${key} ${m.name}: ${(e as Error).message}`);
        }
      });
    }
    coverage[dir] = [withArt, ms.length];
  }
  const N = 8;
  let i = 0;
  await Promise.all(Array.from({ length: N }, async () => {
    while (i < queue.length) {
      const job = queue[i++];
      await job();
      if ((rendered + failed) % 250 === 0 && rendered) process.stdout.write(`  ${rendered + failed}/${queue.length}\r`);
    }
  }));
  mkdirSync(join(ROOT, 'tools', '.cache'), { recursive: true });
  writeFileSync(CACHE, JSON.stringify(cache));
  writeFileSync(join(PACK, 'coverage.json'), JSON.stringify(coverage));
  const tot = Object.values(coverage).reduce((a, [x, y]) => [a[0] + x, a[1] + y], [0, 0]);
  console.log(`rendered ${rendered}, unchanged ${skipped}, failed ${failed} – new art ${tot[0]}/${tot[1]} members`);
  if (failed) process.exitCode = 1;
}

if (process.argv[1] && /render\.ts$/.test(process.argv[1])) void main();
