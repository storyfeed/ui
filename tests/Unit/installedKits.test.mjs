import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { execFileSync } from 'node:child_process';
import { createServer } from 'vite';
import vue from '@vitejs/plugin-vue';
import { createSSRApp, h } from 'vue';
import { renderToString as renderVue } from 'vue/server-renderer';
import { createElement } from 'react';
import { renderToString as renderReact } from 'react-dom/server';
execFileSync(
    'vendor/bin/phpunit',
    [
        '--no-configuration',
        '--bootstrap',
        'vendor/autoload.php',
        'tests/Fixtures/InstallKitsTest.php',
    ],
    { stdio: 'inherit' },
);
const server = await createServer({
    configFile: false,
    plugins: [vue()],
    esbuild: { jsx: 'automatic' },
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, hmr: false },
    appType: 'custom',
    ssr: {
        external: [
            'vue',
            'vue/server-renderer',
            'lucide-vue-next',
            'react',
            'react/jsx-runtime',
            'lucide-react',
        ],
    },
});
after(() => server.close());
const item = {
    kind: 'activity',
    id: 'copied',
    verb: 'posted',
    published_at: '2026-10-07T12:00:00Z',
    headline_template: null,
    glyph: null,
    actor: null,
    object: {
        body: [
            {
                $body: 'Storyfeed/Body/Prose',
                content: '**Copied**',
                mediaType: 'text/markdown',
            },
        ],
    },
};
test('copied Vue kit imports only its own shared core and renders bodies', async () => {
    const { default: FeedStream } = await server.ssrLoadModule(
        '/build/installed-vue/FeedStream.vue',
    );
    assert.match(
        await renderVue(
            createSSRApp({ render: () => h(FeedStream, { items: [item] }) }),
        ),
        /<strong>Copied<\/strong>/,
    );
});
test('copied React kit imports only its own shared core and renders bodies', async () => {
    const { FeedStream } = await server.ssrLoadModule(
        '/build/installed-react/index.ts',
    );
    assert.match(
        renderReact(createElement(FeedStream, { items: [item] })),
        /<strong>Copied<\/strong>/,
    );
});
