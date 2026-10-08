import { defineConfig } from 'vite';
import { resolve } from 'node:path';
export default defineConfig({
    root: resolve('workbench/react'),
    base: './',
    esbuild: { jsx: 'automatic' },
    build: { outDir: resolve('build/react'), emptyOutDir: true },
});
