import { defineConfig } from 'vite';

// base './' keeps every asset URL relative, so the build works from any sub-directory.
export default defineConfig({
  base: './',
  build: { target: 'es2019', assetsInlineLimit: 0 },
  test: { environment: 'jsdom' },
} as any);
