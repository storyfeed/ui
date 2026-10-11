import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { serve, pages, bare } from './host.mjs';

// ui#58: the headline's first line box centres on the rail's disc, for every
// row kind, disc size and type size. Run after `npm run workbench`.
// ui#28: with STORYFEED_HOST=bare it runs in a host that sets nothing, at the
// default size only, and in either host every text-shaped body keeps a measure
// and every row the default rail, gap and spacing.
const scales = bare ? [{ name: 'bare host', vars: {} }] : [
    { name: 'default', vars: {} },
    { name: 'disc 2.5rem, text 0.875rem', vars: { '--sf-disc': '2.5rem', '--sf-font-size': '0.875rem' } },
    { name: 'disc 2.5rem, text 1.125rem', vars: { '--sf-disc': '2.5rem', '--sf-font-size': '1.125rem' } },
];
const tolerance = 0.5;
// Each body's measure at the default size: the wrapper 44rem, text 36rem, cards 32rem.
const measures = { '.sf-body-form': 704, '.sf-prose-block': 576, '.sf-list-block': 576, '.sf-table-block': 576, '.sf-media-object': 512, '.sf-facts': 512, '.sf-cta': 512 };
// A row's rail is the 2rem disc, its body 0.75rem off it, 1.25rem below it but for the feed's last.
const spacing = { rail: '32px', offset: 44, below: ['20px', '0px'] };
const output = process.env.STORYFEED_SCREENSHOTS;
if (output) await mkdir(output, { recursive: true });

const { server, origin } = await serve();
const browser = await chromium.launch();

// Every row's disc centre against its headline's first line-box centre.
const measure = () => [...document.querySelectorAll('.sf-row')].flatMap(row => {
    const disc = row.querySelector(':scope > .sf-rail > .sf-rail__disc');
    const head = row.querySelector(':scope > .sf-body > .sf-head > :first-child, :scope > .sf-body > .sf-disclosure > summary .sf-head > :first-child');
    if (!disc || !head || !row.checkVisibility()) return [];
    const d = disc.getBoundingClientRect();
    const h = head.getBoundingClientRect();
    const lh = parseFloat(getComputedStyle(head).lineHeight);
    return [{
        kind: row.parentElement.closest('.sf-children') ? 'member' : row.querySelector(':scope > .sf-body .sf-toggle, :scope > .sf-body .sf-children') ? 'group' : 'activity',
        text: head.textContent.trim().slice(0, 60),
        disc: d.height,
        lines: Math.round(h.height / lh),
        delta: Math.round(((h.top + lh / 2) - (d.top + d.height / 2)) * 100) / 100,
    }];
});

// Every measured body's max-width and width, and every row's rail, offset and space below.
const layout = selectors => ({
    bodies: selectors.flatMap(selector => [...document.querySelectorAll(selector)].filter(el => el.checkVisibility()).map(el => ({
        selector, max: getComputedStyle(el).maxWidth, width: el.getBoundingClientRect().width,
    }))),
    rows: [...document.querySelectorAll('.sf-row')].flatMap(row => {
        const rail = row.querySelector(':scope > .sf-rail');
        const body = row.querySelector(':scope > .sf-body');
        if (!rail || !body || !row.checkVisibility()) return [];
        return [{ rail: getComputedStyle(rail).width, offset: Math.round((body.getBoundingClientRect().left - rail.getBoundingClientRect().left) * 100) / 100, below: getComputedStyle(body).paddingBottom }];
    }),
    head: getComputedStyle(document.querySelector('.sf-head > :first-child')).fontSize,
    meta: getComputedStyle(document.querySelector('.sf-meta')).fontSize,
});

const failures = [];
try {
    for (const [kit, path] of Object.entries(pages)) for (const scale of scales) for (const width of [1512, 390]) {
        const page = await browser.newPage({ viewport: { width, height: 1000 }, timezoneId: 'UTC' });
        await page.goto(`${origin}/${path}?theme=light`);
        await page.locator('.sf-feed').first().waitFor();
        await page.evaluate(vars => Object.entries(vars).forEach(([k, v]) => document.documentElement.style.setProperty(k, v)), scale.vars);
        // Open every disclosure so member rows are measured too.
        await page.evaluate(() => document.querySelectorAll('details.sf-disclosure').forEach(d => { d.open = true; }));
        await page.evaluate(() => document.querySelectorAll('button.sf-toggle[aria-expanded="false"]').forEach(b => b.click()));
        await page.waitForFunction(() => !document.querySelector('button.sf-toggle[aria-expanded="false"]'));
        const rows = await page.evaluate(measure);
        const kinds = new Set(rows.map(r => r.kind));
        assert.ok(rows.length > 0, `${kit} ${scale.name}: no rows measured`);
        assert.ok(kinds.has('activity') && kinds.has('group') && kinds.has('member'), `${kit} ${scale.name}: rows measured were ${[...kinds]}`);
        if (width === 390) assert.ok(rows.some(r => r.lines > 1), `${kit} ${scale.name}: no multi-line headline at 390px`);
        for (const row of rows) if (Math.abs(row.delta) > tolerance) failures.push(`${kit} ${width}px ${scale.name} ${row.kind} (${row.lines} line, disc ${row.disc}px) "${row.text}": ${row.delta}px`);
        console.log(`${kit} ${width}px ${scale.name}: ${rows.length} rows, worst ${Math.max(...rows.map(r => Math.abs(r.delta)))}px`);
        if (width === 1512 && !Object.keys(scale.vars).length) {
            const { bodies, rows: rails, head, meta } = await page.evaluate(layout, Object.keys(measures));
            const label = `${kit} ${scale.name}`;
            for (const selector of Object.keys(measures)) assert.ok(bodies.some(b => b.selector === selector), `${label}: no ${selector} measured`);
            for (const b of bodies) {
                if (b.max === 'none') failures.push(`${label} ${b.selector}: no measure (max-width none)`);
                else if (parseFloat(b.max) !== measures[b.selector]) failures.push(`${label} ${b.selector}: measure ${b.max}, not ${measures[b.selector]}px`);
                else if (b.width > measures[b.selector]) failures.push(`${label} ${b.selector}: ${b.width}px wide, past its ${b.max} measure`);
            }
            for (const r of rails) {
                if (r.rail !== spacing.rail || r.offset !== spacing.offset || !spacing.below.includes(r.below)) failures.push(`${label} row: rail ${r.rail}, body ${r.offset}px off it, ${r.below} below; want ${spacing.rail}, ${spacing.offset}px, ${spacing.below.join(' or ')}`);
            }
            assert.ok(rails.some(r => r.below === spacing.below[0]), `${label}: no row with space below it`);
            assert.deepEqual([head, meta], ['16px', '14px'], `${label}: headline 1rem, meta 0.875rem`);
            console.log(`${label}: ${bodies.length} bodies on their measure, ${rails.length} rows on the default rail`);
        }
        await page.close();
    }
    // A disc smaller than the line clamps the padding at zero rather than pulling the text up.
    for (const [kit, path] of Object.entries(bare ? {} : pages)) {
        const page = await browser.newPage({ viewport: { width: 1512, height: 1000 }, timezoneId: 'UTC' });
        await page.goto(`${origin}/${path}?theme=light`);
        await page.locator('.sf-feed').first().waitFor();
        const paddings = await page.evaluate(() => {
            document.documentElement.style.setProperty('--sf-disc', '1rem');
            return [...new Set([...document.querySelectorAll('.sf-body')].map(body => getComputedStyle(body).paddingTop))];
        });
        assert.deepEqual(paddings, ['0px'], `${kit}: a 1rem disc clamps the body's top padding at 0`);
        await page.close();
    }
} finally {
    await browser.close();
    server.close();
}
assert.deepEqual(failures, [], `off the disc centre by more than ${tolerance}px, off the measure, or off the default spacing:\n${failures.join('\n')}`);
