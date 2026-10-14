// npm run art:sync – (re)creates the pack's layout data from an installed original export:
//   public/orig/gfx/index.json  → public/assets/gfx/index.json   ([w,h,regX,regY,name] per member)
//   public/orig/gfx/score/*.json → public/assets/gfx/score/        (runtime scores: positions/behaviours)
// Both are derived layout data (no artwork) and are committed, so the art agents and the published
// game do not need the originals. Only needed again if tools/export_graphics.py changes.

import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { PACK, ROOT } from './lib/api';

const ORIG = join(ROOT, 'public', 'orig', 'gfx');
if (!existsSync(join(ORIG, 'index.json'))) {
  console.error('public/orig/gfx/index.json not found – nothing to sync (the committed pack index stays as it is).');
  process.exit(1);
}
mkdirSync(join(PACK, 'score'), { recursive: true });
copyFileSync(join(ORIG, 'index.json'), join(PACK, 'index.json'));
let n = 0;
for (const f of readdirSync(join(ORIG, 'score'))) {
  if (!f.endsWith('.json')) continue;
  copyFileSync(join(ORIG, 'score', f), join(PACK, 'score', f));
  n++;
}
console.log(`index.json + ${n} scores copied to ${PACK}`);
