import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'node:path';

// Exploration page for the actor strip (ui#48). Not part of CI.
export default defineConfig({
    root: resolve('workbench/actor-strip'),
    publicDir: resolve('build/actor-strip-public'),
    plugins: [vue()],
    server: { host: '127.0.0.1' },
    build: { outDir: resolve('build/actor-strip'), emptyOutDir: true },
});
