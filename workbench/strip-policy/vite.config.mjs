import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'node:path';

// Exploration page for the group strip policy (scratchpad 680). Not part of CI.
export default defineConfig({
    root: resolve('workbench/strip-policy'),
    publicDir: resolve('build/strip-policy-public'),
    plugins: [vue()],
    server: { host: '127.0.0.1' },
    build: { outDir: resolve('build/strip-policy'), emptyOutDir: true },
});
