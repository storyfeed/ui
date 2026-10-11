import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'node:path';

export default defineConfig({
    root: resolve('workbench/readme/kits'),
    base: './',
    plugins: [vue()],
    esbuild: { jsx: 'automatic' },
    resolve: { dedupe: ['vue', 'react', 'react-dom'] },
    build: { outDir: resolve('build/readme/kits'), emptyOutDir: true },
});
