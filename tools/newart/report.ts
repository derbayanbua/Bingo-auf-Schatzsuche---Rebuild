// npm run art:report [-- <filter>] [--all]
// Coverage per movie: members with new art vs. placeholders. Missing members are listed (grouped
// 'Base-1..n') for movies matching the filter, or for every movie with --all.

import { loadMovieArt, membersOf, packIndex, pickArt } from './lib/api';

const args = process.argv.slice(2);
const all = args.includes('--all');
const filters = args.filter((a) => !a.startsWith('--'));

function group(names: string[]): string[] {
  const out: string[] = [];
  const seq = new Map<string, number[]>();
  for (const n of names) {
    const m = /^(.*)-(\d+)$/.exec(n);
    if (m) seq.set(m[1], [...(seq.get(m[1]) ?? []), +m[2]]);
    else out.push(n);
  }
  for (const [b, nums] of seq) {
    nums.sort((a, c) => a - c);
    out.push(nums.length > 1 ? `${b}-${nums[0]}..${nums[nums.length - 1]}` : `${b}-${nums[0]}`);
  }
  return out;
}

async function main() {
  const rows: [string, number, number, string[]][] = [];
  for (const dir of Object.keys(packIndex()).sort()) {
    const art = await loadMovieArt(dir);
    const ms = membersOf(dir);
    const missing: string[] = [];
    let ok = 0;
    for (const m of ms) {
      const fn = pickArt(art, m);
      let body: unknown = null;
      try {
        body = fn ? fn(m, m.w, m.h) : null;
      } catch {
        body = null;
      }
      if (body) ok++;
      else missing.push(m.name);
    }
    rows.push([dir, ok, ms.length, missing]);
  }
  let a = 0, t = 0, done = 0;
  console.log('movie'.padEnd(26), 'art'.padStart(5), 'total'.padStart(6), '  status');
  for (const [dir, ok, tot, missing] of rows) {
    a += ok;
    t += tot;
    if (ok === tot) done++;
    const status = ok === tot ? 'complete' : ok ? 'partial' : '-';
    console.log(dir.padEnd(26), String(ok).padStart(5), String(tot).padStart(6), ' ', status);
    const show = all ? missing.length > 0 : filters.some((f) => dir.includes(f)) && missing.length > 0;
    if (show) console.log('    missing:', group(missing).join(', '));
  }
  console.log(`\n${done}/${rows.length} movies complete, ${a}/${t} members with new art (${((100 * a) / t).toFixed(1)} %)`);
}

void main();
