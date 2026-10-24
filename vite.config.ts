import { defineConfig } from 'vite';

// base './' so the built dist/ folder works from any static host or sub-path
// (GitHub Pages, an S3 bucket, an IIS virtual directory, or a file share).
export default defineConfig({
  base: './',
  build: { outDir: 'dist', sourcemap: true },
  test: { globals: true, environment: 'node', include: ['tests/**/*.test.ts', 'src/**/*.test.ts'] },
});
