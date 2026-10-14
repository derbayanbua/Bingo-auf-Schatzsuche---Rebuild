import { defineConfig, type Plugin } from 'vite';
import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * Copies the Windows importer for the original media (tools/) next to index.html in the build, so dist/ is the
 * complete home-play package (it then writes into <dist>/orig). Skipped for the public web deployment
 * (BINGO_OHNE_IMPORTER=1, see .github/workflows/pages.yml).
 */
function importerPlugin(): Plugin {
  let outDir = 'dist';
  return {
    name: 'bingo-importer',
    apply: 'build',
    configResolved(c) { outDir = resolve(c.root, c.build.outDir); },
    closeBundle() {
      if (process.env.BINGO_OHNE_IMPORTER === '1') return;
      const tools = resolve(__dirname, 'tools');
      for (const f of ['Originaldateien importieren.cmd', 'Originaldateien-importieren.ps1', 'LIESMICH.txt']) {
        copyFileSync(join(tools, f), join(outDir, f));
      }
      const py = join(tools, 'originalimport');
      const dst = join(outDir, 'originalimport');
      if (!existsSync(dst)) mkdirSync(dst, { recursive: true });
      for (const f of readdirSync(py)) if (f.endsWith('.py')) copyFileSync(join(py, f), join(dst, f));
    },
  };
}

// base './' keeps every asset URL relative, so the build works from any sub-directory.
export default defineConfig({
  base: './',
  build: { target: 'es2019', assetsInlineLimit: 0 },
  plugins: [importerPlugin()],
  test: { environment: 'jsdom' },
} as any);
