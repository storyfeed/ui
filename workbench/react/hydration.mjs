import { chromium } from 'playwright';
import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import assert from 'node:assert/strict';
const server = await createServer({
    configFile: false,
    appType: 'custom',
    optimizeDeps: {
        noDiscovery: true,
        include: [
            'react',
            'react-dom/client',
            'react/jsx-runtime',
            'react/jsx-dev-runtime',
            'lucide-react',
            'micromark',
            'micromark-extension-gfm-autolink-literal',
            'micromark-extension-gfm-strikethrough',
            'micromark-extension-gfm-table',
            'micromark-extension-gfm-task-list-item',
            'sanitize-html',
        ],
    },
    esbuild: { jsx: 'automatic' },
    server: { host: '127.0.0.1', port: 0 },
    ssr: {
        external: [
            'react',
            'react/jsx-runtime',
            'react-dom/server',
            'lucide-react',
        ],
    },
});
const { default: Fixture } = await server.ssrLoadModule(
    '/workbench/react/HydrationFixture.tsx',
);
server.middlewares.use(async (req, res, next) => {
    if (!req.url.startsWith('/hydrate')) return next();
    const pinned = req.url.includes('pinned');
    const html = renderToString(createElement(Fixture, { pinned }));
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(
        await server.transformIndexHtml(
            req.url,
            `<!doctype html><html><head><meta charset="utf-8"><link rel="icon" href="data:,"></head><body><div id="app">${html}</div><script type="module" src="/workbench/react/hydration-client.tsx"></script></body></html>`,
        ),
    );
});
await server.listen();
const browser = await chromium.launch();
try {
    for (const pinned of [false, true]) {
        const page = await browser.newPage({ timezoneId: 'Pacific/Auckland' });
        page.setDefaultTimeout(15_000);
        const errors = [];
        page.on('pageerror', (e) => {
            errors.push(e.message);
            console.error(e.message);
        });
        page.on('console', (message) => {
            if (message.type() === 'error') {
                errors.push(message.text());
                console.error(message.text());
            }
        });
        await page.clock.install({ time: new Date('2026-10-07T12:00:10Z') });
        await page.addInitScript(() => {
            const pending = new Set();
            const start = window.setTimeout.bind(window),
                cancel = window.clearTimeout.bind(window);
            window.setTimeout = (fn, delay, ...args) => {
                const id = start(() => {
                    pending.delete(id);
                    fn(...args);
                }, delay);
                pending.add(id);
                return id;
            };
            window.clearTimeout = (id) => {
                pending.delete(id);
                cancel(id);
            };
            window.feedTimers = pending;
        });
        await page.goto(
            `http://127.0.0.1:${server.httpServer.address().port}/hydrate${pinned ? '?pinned' : ''}`,
        );
        await page.waitForFunction(
            () =>
                window.hydrationErrors &&
                document.querySelector('.sf-time')?.textContent === 'just now',
            null,
            { timeout: 15_000 },
        );
        assert.deepEqual(await page.evaluate(() => window.hydrationErrors), []);
        const disclosure = await page
            .locator('details:not([open])')
            .first()
            .elementHandle();
        await (await disclosure.$('summary')).focus();
        await page.keyboard.press('Enter');
        assert.equal(await disclosure.getAttribute('open'), '');
        await page.clock.fastForward(60_000);
        assert.equal(
            await page.locator('.sf-time').first().textContent(),
            pinned ? 'just now' : '1 minute ago',
        );
        assert.deepEqual(errors, []);
        await page.evaluate(() => window.unmountFeed());
        assert.equal(
            await page.evaluate(() => window.feedTimers.size),
            0,
            'clock timers cleaned up on unmount',
        );
        await page.close();
    }
    console.log(
        'Hydration: live/pinned clocks, different server/browser timezone, all supported fixtures, native keyboard disclosure and timer cleanup passed.',
    );
} finally {
    await browser.close();
    await server.close();
}
