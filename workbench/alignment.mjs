import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import assert from 'node:assert/strict';

// ui#58: the headline's first line box centres on the rail's disc, for every
// row kind, disc size and type size. Run after `npm run workbench`.
const pages = { blade: 'workbench/parity.html', vue: 'vue/index.html', react: 'react/index.html' };
const scales = [
    { name: 'default', vars: {} },
    { name: 'disc 2.5rem, text 0.875rem', vars: { '--sf-disc': '2.5rem', '--sf-font-size': '0.875rem' } },
    { name: 'disc 2.5rem, text 1.125rem', vars: { '--sf-disc': '2.5rem', '--sf-font-size': '1.125rem' } },
];
const tolerance = 0.5;
const output = process.env.STORYFEED_SCREENSHOTS;
if (output) await mkdir(output, { recursive: true });

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

const failures = [];
try {
    for (const [kit, path] of Object.entries(pages)) for (const scale of scales) for (const width of [1512, 390]) {
        const page = await browser.newPage({ viewport: { width, height: 1000 }, timezoneId: 'UTC' });
        await page.goto(`http://127.0.0.1:${server.address().port}/${path}?theme=light`);
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
        await page.close();
    }
    // A disc smaller than the line clamps the padding at zero rather than pulling the text up.
    for (const [kit, path] of Object.entries(pages)) {
        const page = await browser.newPage({ viewport: { width: 1512, height: 1000 }, timezoneId: 'UTC' });
        await page.goto(`http://127.0.0.1:${server.address().port}/${path}?theme=light`);
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
assert.deepEqual(failures, [], `headline first line off the disc centre by more than ${tolerance}px:\n${failures.join('\n')}`);
