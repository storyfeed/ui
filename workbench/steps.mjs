import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { serve, pages } from './host.mjs';

// A dateless numbered-steps feed drawn with the marker and headline hooks, in
// all three kits: the marker replaces the disc and centres on the rail's line,
// an empty headline draws no head row, and no row gets a day or a time.
// Run after `npm run workbench`.
const { server, origin } = await serve();
const browser = await chromium.launch();
const failures = [];
try {
    for (const [kit, path] of Object.entries(pages)) {
        const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
        await page.goto(`${origin}/${path}`);
        const found = await page.locator('section.example').filter({ has: page.locator('h2', { hasText: /^Steps$/ }) }).first().evaluate(section => {
            const rows = [...section.querySelectorAll('.sf-row')];
            return {
                days: section.querySelectorAll('.sf-day, .sf-divider').length,
                times: section.querySelectorAll('time').length,
                discs: section.querySelectorAll('.sf-rail__disc').length,
                markers: [...section.querySelectorAll('.sf-step')].map(m => [m.textContent.trim(), m.dataset.last]),
                heads: rows.map(row => row.querySelector(':scope > .sf-body > .sf-head')?.textContent.trim() ?? null),
                metas: rows.map(row => row.querySelector(':scope > .sf-body > .sf-meta')?.textContent.trim() ?? null),
                offsets: rows.map(row => {
                    const line = row.querySelector(':scope > .sf-rail > .sf-rail__line')?.getBoundingClientRect();
                    const marker = row.querySelector('.sf-step').getBoundingClientRect();
                    return line ? Math.abs((line.left + line.width / 2) - (marker.left + marker.width / 2)) : 0;
                }),
                sizes: [...section.querySelectorAll('.sf-step')].map(m => m.getBoundingClientRect().width),
                lines: section.querySelectorAll('.sf-rail__line').length,
                connector: section.querySelectorAll('[data-sf-connector]').length,
            };
        });
        try {
            assert.deepEqual(found.markers, [['1', 'false'], ['2', 'false'], ['3', 'true']]);
            assert.deepEqual(found.heads, ['Step 1', null, 'Step 3']);
            assert.deepEqual(found.sizes, [32, 32, 32]);
            assert.equal(found.discs, 0);
            assert.equal(found.days, 0);
            assert.equal(found.times, 0);
            assert.equal(found.lines, 2);
            assert.equal(found.connector, 0);
            for (const offset of found.offsets) assert.ok(offset <= 0.5, `marker off the line by ${offset}px`);
        } catch (error) {
            failures.push(`${kit}: ${error.message}`);
        }
        await page.close();
    }
} finally {
    await browser.close();
    server.close();
}
if (failures.length) {
    console.error(failures.join('\n'));
    process.exit(1);
}
console.log(`steps: marker and headline hooks pass in ${Object.keys(pages).join(', ')}`);
