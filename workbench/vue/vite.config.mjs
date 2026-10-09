import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Reference is read-only and deliberately external. CI builds only the shipped kit.
const reference = process.env.STORYFEED_DOCS_FEED ?? '/Users/jasper/Dev/projects/storyfeed-docs/docs/.vitepress/theme/feed';
export default defineConfig(({ mode }) => {
    const parity = mode === 'parity';
    if (parity && !existsSync(`${reference}/feed.css`)) throw new Error('Set STORYFEED_DOCS_FEED to the unchanged reference kit.');
    return {
        root: resolve('workbench/vue'),
        plugins: [vue(), {
            name: 'read-only-reference-css',
            resolveId(id) { if (id === 'reference-css') return '\0reference-css'; },
            load(id) {
                if (id !== '\0reference-css') return;
                if (!parity) return 'export default ""';
                // Prefix selectors so the legacy CSS cannot style the new kit.
                const css = readFileSync(`${reference}/feed.css`, 'utf8')
                    .replace(/\/\*[\s\S]*?\*\//g, '')
                    .replace(/([^{}]+)\{/g, (_, selectors) => selectors.split(',').map(selector => {
                        const trimmed = selector.trim();
                        return trimmed.startsWith('.dark ') ? `.dark .reference ${trimmed.slice(6)}` : `.reference ${trimmed}`;
                    }).join(', ') + '{');
                return `export default ${JSON.stringify(css)}`;
            },
        }],
        define: { __PARITY__: JSON.stringify(parity) },
        resolve: { alias: {
            'reference-feed': parity ? `${reference}/FeedStream.vue` : resolve('resources/js/vue/FeedStream.vue'),
            'reference-keys': parity ? `${reference}/keys.ts` : resolve('resources/js/vue/keys.ts'),
            // Resolve reference imports against this worktree's installed dependencies.
            ...Object.fromEntries(['vue', 'lucide-vue-next', 'micromark', 'micromark-extension-gfm-autolink-literal', 'micromark-extension-gfm-strikethrough', 'micromark-extension-gfm-table', 'micromark-extension-gfm-task-list-item', 'sanitize-html'].map(name => [name, resolve(`node_modules/${name}`)])),
        }, dedupe: ['vue'] },
        server: { fs: { allow: [resolve('.'), reference] }, host: '127.0.0.1' },
        build: { outDir: resolve('build/vue'), emptyOutDir: true },
    };
});
