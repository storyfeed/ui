import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { serve, pages, bare } from './host.mjs';

// The host seams: `--sf-body-pt`, `--sf-body-leading`, `--sf-body-color`,
// `--sf-row-gap`, `--sf-rail-line-offset` and `--sf-rail-line-width`. With
// nothing set, every row measures what the kit drew before the seams existed;
// set on any ancestor, each one lands, in every kit.
// Run after `npm run workbench`; STORYFEED_HOST=bare runs it in a bare host.
const { server, origin } = await serve();
const browser = await chromium.launch();

const measure = () => {
    const px = (el, value) => {
        const probe = document.createElement('div');
        probe.style.width = value;
        el.append(probe);
        const width = parseFloat(getComputedStyle(probe).width);
        probe.remove();
        return width;
    };
    const lines = [...document.querySelectorAll('.sf-rail__line')];
    return {
        dividerWidths: lines.filter(el => el.closest('.sf-divider')).map(el => parseFloat(getComputedStyle(el).width)),
        bodies: [...document.querySelectorAll('.sf-body')].map(el => {
            const style = getComputedStyle(el);
            const parent = getComputedStyle(el.parentElement);
            const lh = parseFloat(style.lineHeight);
            return {
                spaced: el.classList.contains('sf-body--spaced'),
                pt: parseFloat(style.paddingTop), pb: parseFloat(style.paddingBottom),
                lh, color: style.color, parentLh: parseFloat(parent.lineHeight), parentColor: parent.color,
                wantPt: Math.max(0, (px(el, 'var(--sf-disc-v)') - lh) / 2), spacing: px(el, 'var(--spacing)'),
            };
        }),
        lines: [...document.querySelectorAll('.sf-rail__line')].filter(el => !el.closest('.sf-divider')).map(el => {
            const style = getComputedStyle(el);
            return { width: parseFloat(style.width), mt: parseFloat(style.marginTop), spacing: px(el.parentElement, 'var(--spacing)') };
        }),
    };
};
const near = (a, b, message) => assert.ok(Math.abs(a - b) < 0.02, `${message}: ${a} ≠ ${b}`);

try {
    for (const [kit, path] of Object.entries(pages)) {
        const page = await browser.newPage({ viewport: { width: 1512, height: 1000 }, timezoneId: 'UTC' });
        await page.goto(`${origin}/${path}`);
        await page.locator('.sf-feed').first().waitFor();

        const plain = await page.evaluate(measure);
        assert.ok(plain.bodies.some(b => b.spaced) && plain.lines.length, `${kit}: rows and rail lines on the page`);
        for (const b of plain.bodies) {
            near(b.pt, b.wantPt, `${kit}: default body top padding`);
            near(b.lh, b.parentLh, `${kit}: default body line height is the row's`);
            assert.equal(b.color, b.parentColor, `${kit}: default body colour is the row's`);
            if (b.spaced) near(b.pb, b.spacing * 5, `${kit}: default row gap`);
        }
        for (const width of plain.dividerWidths) near(width, 1, `${kit}: default divider line width`);
        for (const line of plain.lines) {
            near(line.width, 1, `${kit}: default rail line width`);
            near(line.mt, line.spacing, `${kit}: default rail line offset`);
        }
        if (bare) {
            console.log(`${kit} bare host: ${plain.bodies.length} bodies and ${plain.lines.length} rail lines at their defaults`);
            await page.close();
            continue;
        }

        await page.evaluate(() => Object.entries({
            '--sf-body-pt': '7px', '--sf-body-leading': '30px', '--sf-body-color': 'rgb(1, 2, 3)',
            '--sf-row-gap': '11px', '--sf-rail-line-offset': '9px', '--sf-rail-line-width': '3px',
        }).forEach(([name, value]) => document.documentElement.style.setProperty(name, value)));
        const tuned = await page.evaluate(measure);
        for (const b of tuned.bodies) {
            near(b.pt, 7, `${kit}: --sf-body-pt`);
            near(b.lh, 30, `${kit}: --sf-body-leading`);
            assert.equal(b.color, 'rgb(1, 2, 3)', `${kit}: --sf-body-color`);
            if (b.spaced) near(b.pb, 11, `${kit}: --sf-row-gap`);
        }
        for (const width of tuned.dividerWidths) near(width, 3, `${kit}: --sf-rail-line-width on a divider`);
        for (const line of tuned.lines) {
            near(line.width, 3, `${kit}: --sf-rail-line-width`);
            near(line.mt, 9, `${kit}: --sf-rail-line-offset`);
        }
        console.log(`${kit}: ${plain.bodies.length} bodies and ${plain.lines.length} rail lines at their defaults and tuned`);
        await page.close();
    }
} finally {
    await browser.close();
    server.close();
}
