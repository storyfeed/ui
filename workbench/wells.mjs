import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { serve, pages, bare } from './host.mjs';

// ui#62: every well-shaped body draws the same light fill and hairline edge,
// derived from the host's tokens, and `--sf-well` / `--sf-well-border` set on
// any ancestor replace both, in every kit and theme. Every edge stands off the
// page it sits on, so a host that sets nothing still sees each card (ui#28).
// Run after `npm run workbench`; STORYFEED_HOST=bare runs it in a bare host.
const wells = ['.sf-media-object', '.sf-prose-block:not(.sf-prose-block--verbatim)', '.sf-list-block', '.sf-table-block', '.sf-facts', '.sf-cta'];
const defaults = {
    light: { fill: 'color-mix(in oklab, var(--color-card) 55%, transparent)', edge: 'color-mix(in oklab, var(--color-foreground) 8%, transparent)' },
    dark: { fill: 'color-mix(in oklab, var(--color-foreground) 3%, transparent)', edge: 'color-mix(in oklab, var(--color-foreground) 8%, transparent)' },
};

const { server, origin } = await serve();
const browser = await chromium.launch();

// The smallest contrast between a well's edge, laid over the page, and the page.
const visible = 1.1;
const output = process.env.STORYFEED_SCREENSHOTS;
if (output) await mkdir(output, { recursive: true });

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

// Contrast between each well's edge and the page under it: the canvas lays the
// edge over the page's background, whatever colour syntax either resolves to.
const contrast = wells => {
    const canvas = Object.assign(document.createElement('canvas'), { width: 1, height: 1 });
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const luminance = colours => {
        ctx.clearRect(0, 0, 1, 1);
        for (const colour of colours) { ctx.fillStyle = colour; ctx.fillRect(0, 0, 1, 1); }
        const channel = v => (v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
        const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
        return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
    };
    const page = getComputedStyle(document.body).backgroundColor;
    return wells.flatMap(selector => [...document.querySelectorAll(selector)].map(el => {
        const [a, b] = [luminance(['#fff', page]), luminance(['#fff', page, getComputedStyle(el).borderTopColor])];
        return { selector, ratio: Math.round((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) * 1000) / 1000 };
    }));
};

try {
    for (const [kit, path] of Object.entries(pages)) for (const theme of ['light', 'dark']) {
        const page = await browser.newPage({ viewport: { width: 1512, height: 1000 }, timezoneId: 'UTC' });
        await page.goto(`${origin}/${path}?theme=${theme}`);
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
        const edges = await page.evaluate(contrast, wells);
        for (const edge of edges) assert.ok(edge.ratio >= visible, `${kit} ${theme} ${edge.selector}: edge contrast ${edge.ratio}:1 against the page, under ${visible}:1`);
        if (bare) {
            if (output) await page.screenshot({ path: `${output}/bare-${kit}-${theme}.png` });
            console.log(`${kit} ${theme} (bare host): ${plain.got.length} wells, faintest edge ${Math.min(...edges.map(e => e.ratio))}:1`);
            await page.close();
            continue;
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
