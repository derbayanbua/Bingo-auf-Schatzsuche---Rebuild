// Visual checks without the browser (output in tools/.cache/newart-preview/, gitignored):
//   npm run art:frame -- Adventure_AS001-01 [frame]   composes a score frame like the runtime does
//                                                      (sprites by channel, left/top/w/h, blend; blend 0 skipped)
//   npm run art:sheet -- Shared_Graphic-1 [regex]     contact sheet of the rendered members on a checkerboard
// Run `npm run art` first – both read the rendered webp files of the pack.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { PACK, ROOT, membersOf, packIndex } from './lib/api';
import { svgToPng } from './lib/raster';
import { esc, svgDoc } from './lib/svg';

const OUT = join(ROOT, 'tools', '.cache', 'newart-preview');
mkdirSync(OUT, { recursive: true });

async function dataUrl(file: string): Promise<string | null> {
  if (!existsSync(file)) return null;
  const png = await sharp(readFileSync(file)).png().toBuffer();
  return `data:image/png;base64,${png.toString('base64')}`;
}

type RawSprite = [number, number, number, number, number, number, number, string, number, unknown[], string];

async function frame(dir: string, n: number) {
  const s = JSON.parse(readFileSync(join(PACK, 'score', `${dir}.json`), 'utf8')) as { libs: (string | null)[]; frames: { frames: (number | string)[]; sprites: RawSprite[] }[] };
  const fr = s.frames.find((f) => f.frames.some((r) => {
    const [a, b] = String(r).split('-').map(Number);
    return n >= a && n <= (b || a);
  })) ?? s.frames[0];
  const idx = packIndex();
  let body = '<rect width="800" height="600" fill="#222"/>';
  for (const [ch, lib, mem, left, top, w, h, , blend] of [...fr.sprites].sort((a, b) => a[0] - b[0])) {
    const d = s.libs[lib - 1];
    // blink lids are hidden most of the time (Animation Random Visible)
    if (!d || !idx[d]?.[String(mem)] || blend <= 0 || ch >= 110 || /-Lid$/.test(idx[d][String(mem)][4])) continue;
    const url = await dataUrl(join(PACK, d, `${mem}.webp`));
    if (!url) continue;
    body += `<image href="${url}" x="${left}" y="${top}" width="${w}" height="${h}" preserveAspectRatio="none"${blend < 100 ? ` opacity="${blend / 100}"` : ''}/>`;
  }
  // boards: the runtime places the points itself (score sprites sit off-stage) – draw them like boardOrig.ts
  const board = /^Landscape_(SP\d+)$/.exec(dir)?.[1];
  if (board) {
    const boards = JSON.parse(readFileSync(join(ROOT, 'src', 'data', 'boards.json'), 'utf8')).boards as Record<string, { x: number; y: number; t: string | null; s: string }[]>;
    const g2 = idx['Shared_Graphic-2'];
    const num = (name: string) => Object.entries(g2).find(([, e]) => e[4] === name)?.[0];
    for (const p of boards[board] ?? []) {
      const n = num(p.s === 'JOK' ? 'pointJoke-0' : p.t ? 'pointRed-0' : 'pointBlue-0');
      const url = n ? await dataUrl(join(PACK, 'Shared_Graphic-2', `${n}.webp`)) : null;
      if (url) body += `<image href="${url}" x="${p.x - 25}" y="${p.y - 25}" width="50" height="50" opacity="0.5"/>`;
    }
  }
  // optional crop "x,y,w,h" (stage coordinates) rendered 3x
  const crop = process.argv[5]?.split(',').map(Number);
  const file = join(OUT, `${dir}-f${n}${crop ? '-crop' : ''}.png`);
  if (crop && crop.length === 4) {
    const [cx, cy, cw, ch] = crop;
    writeFileSync(file, svgToPng(svgDoc(cw * 3, ch * 3, body, `${cx} ${cy} ${cw} ${ch}`), cw * 3, ch * 3));
  } else writeFileSync(file, svgToPng(svgDoc(800, 600, body), 800, 600));
  console.log(file);
}

async function sheet(dir: string, re?: string) {
  const rx = re ? new RegExp(re) : null;
  const ms = membersOf(dir).filter((m) => !rx || rx.test(m.name));
  const W = 1400;
  let x = 8, y = 8, rowH = 0, body = '';
  const maxS = 1;
  for (const m of ms) {
    const k = Math.min(maxS, 400 / Math.max(m.w, m.h));
    const w = Math.max(1, Math.round(m.w * k)), h = Math.max(1, Math.round(m.h * k));
    const cw = Math.max(w, 70);
    if (x + cw > W - 8) { x = 8; y += rowH + 22; rowH = 0; }
    const url = await dataUrl(join(PACK, dir, `${m.num}.webp`));
    body += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#chk)"/>`;
    if (url) body += `<image href="${url}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="none"/>`;
    body += `<text x="${x}" y="${y + h + 13}" font-family="Nunito" font-weight="700" font-size="10" fill="#333">${esc(`${m.num} ${m.name}`.slice(0, 22))}</text>`;
    x += cw + 10;
    rowH = Math.max(rowH, h);
  }
  const H = y + rowH + 24;
  const defsS = '<defs><pattern id="chk" patternUnits="userSpaceOnUse" width="16" height="16"><rect width="16" height="16" fill="#fff"/><rect width="8" height="8" fill="#e6e6e6"/><rect x="8" y="8" width="8" height="8" fill="#e6e6e6"/></pattern></defs>';
  const file = join(OUT, `${dir}-sheet.png`);
  writeFileSync(file, svgToPng(svgDoc(W, H, defsS + `<rect width="${W}" height="${H}" fill="#f7f4ec"/>` + body), W, H));
  console.log(file, ms.length, 'members');
}

/** render a single member large (zoom) straight from its generator – fast iteration without `npm run art` */
async function zoom(dir: string, name: string, z = 4) {
  const { memberSvg } = await import('./render');
  const m = membersOf(dir).find((x) => x.name === name || `#${x.num}` === name);
  if (!m) return console.log('no member', name);
  const { svg } = await memberSvg(m);
  const W = Math.round(m.w * z), H = Math.round(m.h * z);
  const inner = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  const doc = svgDoc(W, H, `<rect width="${W}" height="${H}" fill="#ddd"/><image href="${inner}" width="${W}" height="${H}"/>`);
  const file = join(OUT, `${dir}-${m.num}-zoom.png`);
  writeFileSync(file, svgToPng(doc, W, H));
  console.log(file);
}

const [mode, dir, extra, extra2] = process.argv.slice(2);
if (mode === 'frame') void frame(dir, extra ? +extra : 1);
else if (mode === 'sheet') void sheet(dir, extra);
else if (mode === 'zoom') void zoom(dir, extra, extra2 ? +extra2 : 4);
else console.log('usage: preview.ts frame <dir> [n] | sheet <dir> [regex] | zoom <dir> <name|#num> [factor]');
