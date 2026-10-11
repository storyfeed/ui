import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import assert from 'node:assert/strict';

// ui#29: a link that stands alone in a body (WCAG 2.5.8's inline exception
// doesn't cover it) has a 24×24 target, and growing it moves nothing: every
// box and the link's own text sit where they would without the reach.
// Run after `npm run workbench`.
const pages = { blade: 'workbench/parity.html', vue: 'vue/index.html', react: 'react/index.html' };
const scales = [
    { name: 'default', vars: {} },
    { name: 'text 0.875rem', vars: { '--sf-font-size': '0.875rem' } },
    { name: 'text 1.125rem', vars: { '--sf-font-size': '1.125rem' } },
];
const standalone = ['.sf-media-object__subject a', '.sf-file a', '.sf-media-object__footnote a', '.sf-list__item a', '.sf-list__more a', '.sf-table td a'];
const buttons = ['.sf-cta__action'];
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

// The target is what a pointer hits: every point 12px either side of the
// link's centre, across and down, lands on the link itself.
const measure = ([standalone, buttons]) => {
    const round = v => Math.round(v * 100) / 100;
    const hits = (a, x, y) => document.elementFromPoint(x, y)?.closest('a') === a;
    const targets = [...document.querySelectorAll([...standalone, ...buttons].join(','))].filter(a => a.checkVisibility());
    return targets.map(a => {
        a.scrollIntoView({ block: 'center' });
        const r = a.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const offsets = Array.from({ length: 24 }, (_, i) => i - 11.5);
        const reach = offsets.filter(d => hits(a, cx, cy + d)).length;
        const across = offsets.filter(d => hits(a, cx + d, cy)).length;
        return { selector: [...standalone, ...buttons].find(s => a.matches(s)), text: a.textContent.trim().slice(0, 40), height: round(r.height), width: round(r.width), reach, across };
    });
};

// Every box on the page and every standalone link's text, with and without the reach.
const layout = standalone => {
    const round = v => Math.round(v * 100) / 100;
    const boxes = () => [...document.querySelectorAll('body *')].filter(e => !e.matches(standalone.join(','))).map(e => {
        const r = e.getBoundingClientRect();
        return [r.x, r.y, r.width, r.height].map(round).join(',');
    });
    const texts = () => [...document.querySelectorAll(standalone.join(','))].flatMap(a => {
        const range = document.createRange();
        range.selectNodeContents(a);
        return [...range.getClientRects()].map(r => [r.x, r.y, r.width, r.height].map(round).join(','));
    });
    const reached = { boxes: boxes(), texts: texts() };
    const style = document.createElement('style');
    style.textContent = `${standalone.join(',')} { display: inline !important; padding-block: 0 !important; margin-block: 0 !important; }`;
    document.head.append(style);
    const bare = { boxes: boxes(), texts: texts() };
    style.remove();
    const moved = (a, b) => a.flatMap((v, i) => (v === b[i] ? [] : [`${i}: ${b[i]} → ${v}`]));
    return { boxes: reached.boxes.length, texts: reached.texts.length, movedBoxes: moved(reached.boxes, bare.boxes), movedTexts: moved(reached.texts, bare.texts) };
};

const failures = [];
try {
    for (const [kit, path] of Object.entries(pages)) for (const scale of scales) for (const width of [1512, 390]) {
        const page = await browser.newPage({ viewport: { width, height: 1000 }, timezoneId: 'UTC' });
        await page.goto(`http://127.0.0.1:${server.address().port}/${path}?theme=light`);
        await page.locator('.sf-feed').first().waitFor();
        await page.evaluate(vars => Object.entries(vars).forEach(([k, v]) => document.documentElement.style.setProperty(k, v)), scale.vars);
        const label = `${kit} ${width}px ${scale.name}`;

        const targets = await page.evaluate(measure, [standalone, buttons]);
        const seen = new Set(targets.map(t => t.selector));
        for (const selector of [...standalone, ...buttons]) assert.ok(seen.has(selector), `${label}: no ${selector} measured`);
        for (const t of targets) {
            if (t.reach < 24) failures.push(`${label} ${t.selector} "${t.text}": ${t.reach}px of 24 reachable down (box ${t.height}px)`);
            if (t.across < 24) failures.push(`${label} ${t.selector} "${t.text}": ${t.across}px of 24 reachable across (box ${t.width}px)`);
        }

        const moved = await page.evaluate(layout, standalone);
        assert.ok(moved.boxes > 0 && moved.texts > 0, `${label}: nothing measured`);
        for (const m of moved.movedBoxes.slice(0, 5)) failures.push(`${label}: box moved ${m}`);
        for (const m of moved.movedTexts.slice(0, 5)) failures.push(`${label}: link text moved ${m}`);
        console.log(`${label}: ${targets.length} targets, smallest ${Math.min(...targets.map(t => t.reach))}×${Math.min(...targets.map(t => t.across))}; ${moved.boxes} boxes and ${moved.texts} text lines, ${moved.movedBoxes.length + moved.movedTexts.length} moved`);

        if (output && scale.name === 'default' && width === 1512) {
            // The hit area outlined, for the screenshot only.
            await page.addStyleTag({ content: `${standalone.join(',')}, ${buttons.join(',')} { outline: 1px solid red !important; outline-offset: 0 !important; }` });
            for (const [name, selector] of Object.entries({ 'media-object': '.sf-media-object:has(.sf-file a)', 'item-list': '.sf-list-block:has(.sf-list__more a)', table: '.sf-table:has(td a)' }))
                await page.locator(selector).first().screenshot({ path: `${output}/targets-${kit}-${name}.png` });
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
