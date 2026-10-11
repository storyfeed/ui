import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import assert from 'node:assert/strict';

// ui#62: every well-shaped body draws the same light fill and hairline edge,
// derived from the host's tokens, and `--sf-well` / `--sf-well-border` set on
// any ancestor replace both, in every kit and theme. Run after `npm run workbench`.
const pages = { blade: 'workbench/parity.html', vue: 'vue/index.html', react: 'react/index.html' };
const wells = ['.sf-media-object', '.sf-prose-block:not(.sf-prose-block--verbatim)', '.sf-list-block', '.sf-table-block', '.sf-facts', '.sf-cta'];
const defaults = {
    light: { fill: 'color-mix(in oklab, var(--color-card) 55%, transparent)', edge: 'color-mix(in oklab, var(--color-foreground) 8%, transparent)' },
    dark: { fill: 'color-mix(in oklab, var(--color-foreground) 3%, transparent)', edge: 'color-mix(in oklab, var(--color-foreground) 8%, transparent)' },
};

const server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    try {
        const path = resolve('build', url.pathname.startsWith('/assets/') ? 'vue' + url.pathname : url.pathname.slice(1));
        res.setHeader('Content-Type', ({ '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml' })[extname(path)] ?? 'text/plain');
        res.end(await readFile(path));
    } catch { res.writeHead(404).end(); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch();

// Each well's computed fill and edge, and what a probe resolves the expected colours to.
const read = ({ wells, expected }) => {
    const probe = document.createElement('div');
    document.querySelector('.sf-feed').append(probe);
    probe.style.background = expected.fill;
    probe.style.borderColor = expected.edge;
    const want = { fill: getComputedStyle(probe).backgroundColor, edge: getComputedStyle(probe).borderTopColor };
    probe.remove();
    return {
        want,
        got: wells.flatMap(selector => [...document.querySelectorAll(selector)].map(el => {
            const style = getComputedStyle(el);
            return { selector, fill: style.backgroundColor, edge: style.borderTopColor, width: style.borderTopWidth };
        })),
    };
};

try {
    for (const [kit, path] of Object.entries(pages)) for (const theme of ['light', 'dark']) {
        const page = await browser.newPage({ viewport: { width: 1512, height: 1000 }, timezoneId: 'UTC' });
        await page.goto(`http://127.0.0.1:${server.address().port}/${path}?theme=${theme}`);
        await page.locator('.sf-feed').first().waitFor();
        await page.evaluate(dark => document.documentElement.classList.toggle('dark', dark), theme === 'dark');

        const plain = await page.evaluate(read, { wells, expected: defaults[theme] });
        const found = new Set(plain.got.map(well => well.selector));
        assert.deepEqual(wells.filter(selector => !found.has(selector)), [], `${kit} ${theme}: every well-shaped body is on the page`);
        for (const well of plain.got) {
            assert.equal(well.fill, plain.want.fill, `${kit} ${theme} ${well.selector}: default fill`);
            assert.equal(well.edge, plain.want.edge, `${kit} ${theme} ${well.selector}: default edge`);
            assert.equal(well.width, '1px', `${kit} ${theme} ${well.selector}: hairline`);
        }

        // Set on the page root, an ancestor of every feed: both replace the defaults.
        await page.evaluate(() => {
            document.documentElement.style.setProperty('--sf-well', 'rgb(1, 2, 3)');
            document.documentElement.style.setProperty('--sf-well-border', 'rgb(4, 5, 6)');
        });
        const tuned = await page.evaluate(read, { wells, expected: { fill: 'rgb(1, 2, 3)', edge: 'rgb(4, 5, 6)' } });
        for (const well of tuned.got) {
            assert.equal(well.fill, 'rgb(1, 2, 3)', `${kit} ${theme} ${well.selector}: --sf-well from an ancestor`);
            assert.equal(well.edge, 'rgb(4, 5, 6)', `${kit} ${theme} ${well.selector}: --sf-well-border from an ancestor`);
        }
        console.log(`${kit} ${theme}: ${plain.got.length} wells`);
        await page.close();
    }
} finally {
    await browser.close();
    server.close();
}
