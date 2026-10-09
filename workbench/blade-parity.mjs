import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import assert from 'node:assert/strict';
import { checkKeyValue } from './key-value-parity.mjs';
import { checkMediaObject } from './media-object-parity.mjs';
const bodyTexts = {
    'App body type': ['UPS · 1Z999AA10123456784'],
    // A fallback line, nothing without one, the registered renderer over its fallback, escaped text.
    // Header, rows with a link, a kept line break and an empty mark, footer rows; then a slim, headerless, ragged table.
    'Table body': [
        'Order #1042 Item Qty Price Starter plan 1 $9.00 Extra seats 4 $40.00 Delivery to 12 Harbour Street Wellington — $0.00 Subtotal $49.00 Total $49.00',
        'Carrier UPS Tracking 1Z999AA10123456784 Note —',
    ],
    'Body fallback': ['Invoice #1042 · $49.00 due Friday', 'UPS · 1Z999AA10123456784', '<b>Escaped</b>, never HTML'],
};
const output = process.env.STORYFEED_SCREENSHOTS ?? '/private/tmp/claude-501/-Users-jasper-Dev-projects-storyfeed/2b79c0b9-803e-4825-b1bd-040d9078ad01/scratchpad/kit-adopt';
await mkdir(output, { recursive: true });
const server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/') {
        const renderers = url.searchParams.get('renderers').split(',');
        res.setHeader('Content-Type', 'text/html');
        res.end(`<style>body{margin:0;display:flex}iframe{border:0;width:${Number(url.searchParams.get('width'))}px;height:6500px;flex-shrink:0}</style>` + renderers.map(name => `<iframe title="${name}" src="/${name === 'blade' ? 'workbench/parity.html' : name + '/index.html'}?theme=${url.searchParams.get('theme')}"></iframe>`).join(''));
        return;
    }
    try {
        const path = resolve('build', url.pathname.startsWith('/assets/') ? 'vue' + url.pathname : url.pathname.slice(1));
        res.setHeader('Content-Type', ({ '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml' })[extname(path)] ?? 'text/plain');
        res.end(await readFile(path));
    } catch { res.writeHead(404).end(); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch();
const report = [];
try {
    for (const renderers of [['vue', 'blade', 'react']]) {
        // Text sizes: the default, the browser's text at 200%, and the feed's own `--sf-font-size`.
        for (const width of [1512, 500, 1440, 390]) for (const theme of ['light', 'dark']) for (const text of [1512, 390].includes(width) ? ['default', '200%', '1.25rem'] : ['default']) {
            const suffix = text === 'default' ? '' : `-text-${text.replace('%', 'pct')}`;
            const page = await browser.newPage({ viewport: { width: width * renderers.length, height: 1000 }, timezoneId: 'UTC' });
            const errors = []; page.on('pageerror', e => errors.push(e.message));
            await page.goto(`http://127.0.0.1:${server.address().port}/?width=${width}&theme=${theme}&renderers=${renderers.join(',')}`);
            const frames = page.frames().slice(1);
            await Promise.all(frames.map(async frame => {
                await frame.locator('.sf-feed').first().waitFor();
                await frame.evaluate(([theme, text]) => {
                    document.documentElement.classList.toggle('dark', theme === 'dark');
                    if (text === '200%') document.documentElement.style.fontSize = '200%';
                    if (text === '1.25rem') document.body.style.setProperty('--sf-font-size', '1.25rem');
                }, [theme, text]);
                await frame.evaluate(() => Promise.all([...document.images].map(img => { img.loading = 'eager'; return img.decode().catch(() => {}); })));
            }));
            // Wait for React's post-hydration local clock and day grouping.
            await Promise.all(frames.map(f => f.waitForFunction(() => !document.querySelector('.sf-time')?.textContent.includes('T15:'))));
            // Stacked cards can extend beyond the initial iframe height.
            const fixtureHeights = await Promise.all(frames.map(frame => frame.evaluate(() => document.body.scrollHeight)));
            await page.locator('iframe').evaluateAll((nodes, height) => nodes.forEach(node => node.style.height = `${height + 2000}px`), Math.max(...fixtureHeights));
            // Text-shaped bodies inherit the feed's size: Typography sizes a table at 0.875em and a list at 1em of it.
            for (let i = 0; i < frames.length; i++) {
                const sizes = await frames[i].evaluate(() => {
                    const size = selector => parseFloat(getComputedStyle(document.querySelector(selector)).fontSize);
                    return { head: size('.sf-head'), table: size('.sf-rich-text table'), body: size('.sf-table'), list: size('.sf-list__item') };
                });
                assert.equal(sizes.table / sizes.head, 0.875, `${renderers[i]} ${text}: Prose table scales with the headline`);
                assert.equal(sizes.body / sizes.head, 0.875, `${renderers[i]} ${text}: Table body scales with the headline`);
                assert.equal(sizes.list / sizes.head, 1, `${renderers[i]} ${text}: ItemList scales with the headline`);
            }
            // These fixtures assert pixel geometry at the default text size.
            if (text === 'default') {
                await checkKeyValue({ frames, renderers, width, theme, output });
                await checkMediaObject({ frames, renderers, width, theme, output });
            }
            for (const state of ['collapsed', 'expanded']) {
                if (state === 'expanded') {
                    await frames[0].locator('.sf-toggle').evaluateAll(buttons => buttons.forEach(button => { if (button.getAttribute('aria-expanded') === 'false') button.click(); }));
                    for (const frame of frames.slice(1)) await frame.locator('details').evaluateAll(nodes => nodes.forEach(node => node.open = true));
                }
                // A stack starts on the same rail as a single face, then grows downward.
                if (text === 'default') for (let i = 0; i < frames.length; i++) {
                    const fixture = frames[i].locator('.example:has(>h2:text-is("Stacked actors and truncated members"))');
                    const joints = await fixture.evaluate(section => {
                        const rows = [...section.querySelectorAll('.sf-row')].filter(row => !row.closest('.sf-children') && row.querySelector(':scope > .sf-body > .sf-head'));
                        return rows.map(row => {
                            const rail = row.querySelector(':scope > .sf-rail');
                            const elements = [...rail.querySelectorAll('.sf-avatar')];
                            const faces = elements.map(e => e.getBoundingClientRect());
                            const overlapOwners = faces.slice(1).map((r, i) => {
                                const hit = document.elementFromPoint(r.x + r.width / 2, r.y + 6);
                                return hit?.closest('.sf-avatar') === elements[i];
                            });
                            const before = faces.map(r => [r.x, r.y, r.width, r.height]);
                            const savedZ = elements.map(e => e.style.zIndex);
                            elements.forEach(e => { e.style.zIndex = 'auto'; });
                            const withoutOrder = elements.map(e => {
                                const r = e.getBoundingClientRect();
                                return [r.x, r.y, r.width, r.height];
                            });
                            elements.forEach((e, i) => { e.style.zIndex = savedZ[i]; });
                            const line = rail.querySelector('.sf-rail__line')?.getBoundingClientRect();
                            const head = row.querySelector('.sf-head').getBoundingClientRect();
                            return { faces: faces.map((r, i) => ({ x: r.x, y: r.y, w: r.width, h: r.height, z: getComputedStyle(elements[i]).zIndex })),
                                line: line ? line.x + line.width / 2 : null, lineY: line?.y, head: head.x,
                                top: row.getBoundingClientRect().y, bottom: row.getBoundingClientRect().bottom,
                                left: rail.getBoundingClientRect().x, right: rail.getBoundingClientRect().right,
                                badge: rail.querySelectorAll('.sf-badge').length, overlapOwners, before, withoutOrder };
                        });
                    });
                    assert.equal(joints.length, 4);
                    const first = joints[0].faces[0];
                    for (const [index, count] of [[1, 2], [2, 3]]) {
                        const joint = joints[index];
                        assert.equal(joint.faces.length, count);
                        assert.equal(joint.faces[0].x, first.x, `${renderers[i]}: first stacked face left edge`);
                        assert.equal(joint.faces[0].w, first.w);
                        assert.equal(joint.faces[0].y - joint.top, first.y - joints[0].top, 'first face vertical position');
                        assert.equal(joint.head, joints[0].head, 'headline aligns with single actor');
                        assert.equal(joint.line, first.x + first.w / 2, `${renderers[i]}: rail through first face`);
                        assert.equal(joint.badge, 0);
                        assert.deepEqual(joint.before, joint.withoutOrder, 'paint order does not change geometry');
                        assert.ok(joint.overlapOwners.every(Boolean), 'upper face owns each visible overlap');
                        joint.faces.slice(1).forEach((face, j) => {
                            assert.equal(face.x, first.x, 'faces share the rail centre');
                            assert.equal(face.y, joint.faces[j].y + face.h - 12, 'retain 12px vertical overlap');
                            assert.ok(Number(joint.faces[j].z) > Number(face.z), 'earlier face paints above the next');
                        });
                        const last = joint.faces.at(-1);
                        assert.ok(joint.faces.every(face => face.x >= joint.left && face.x + face.w <= joint.right), 'stack fits gutter');
                        assert.ok(last.y + last.h <= joint.bottom, 'stack fits row height');
                        assert.equal(joint.lineY, last.y + last.h + 4, 'line continues below last face');
                    }
                    assert.ok(joints[0].badge > 0, 'single actor retains activity badge');
                    await fixture.screenshot({ path: `${output}/k2-${renderers[i]}-${state}-${theme}-${width}.png` });
                    if (state === 'collapsed') {
                        await fixture.scrollIntoViewIfNeeded();
                        const box = await fixture.boundingBox();
                        const scroll = await page.evaluate(() => ({ x: scrollX, y: scrollY }));
                        const session = await page.context().newCDPSession(page);
                        const capture = await session.send('Page.captureScreenshot', {
                            format: 'png', captureBeyondViewport: true,
                            clip: { x: box.x + scroll.x, y: box.y + scroll.y + 32, width: 240, height: box.height - 32, scale: 3 },
                        });
                        await writeFile(`${output}/k2-zoom-${renderers[i]}-${theme}-${width}.png`, Buffer.from(capture.data, 'base64'));
                        await session.detach();
                    }
                }
                const geometry = await Promise.all(frames.map(frame => frame.evaluate(() => {
                    const selectors = ['.sf-feed', '.sf-row', '.sf-head', '.sf-meta', '.sf-body-form', '.sf-avatar', '.sf-rail__disc', '.sf-badge', '.sf-rail__line', '.sf-rail__node', '.sf-rail__branch', '.sf-day', '.sf-toggle', '.sf-children', '.sf-media-strip', '.sf-media-object', '.sf-media-object__image', '.sf-media-object__body', '.sf-object-media', '.sf-object-media > .sf-media', '.sf-facts', '.sf-facts__row', '.sf-facts__label', '.sf-facts__value', '.sf-facts__value > span', '.sf-rich-text', '.sf-rich-text *', '.sf-list-block', '.sf-list__prose *', '.sf-avatar-row', '.sf-avatar-row > *', '.sf-avatar-row .sf-avatar', '.sf-table-block', '.sf-table__prose *'];
                    return Object.fromEntries(selectors.map(selector => [selector, [...document.querySelectorAll(selector)].filter(e => !e.closest('details:not([open]) .sf-children') && e.getClientRects().length && e.getBoundingClientRect().height > 0).map(e => {
                        const r = e.getBoundingClientRect();
                        return { x: r.x, y: r.y, w: r.width, h: r.height, text: e.textContent.trim().replace(/\s+/g, ' ') };
                    })]));
                })));
                for (let a = 0; a < frames.length; a++) for (let b = a + 1; b < frames.length; b++) {
                    const differences = []; let count = 0, max = 0;
                    for (const [selector, rects] of Object.entries(geometry[a])) {
                        const other = geometry[b][selector];
                        if (rects.length !== other.length) differences.push({ selector, count: [rects.length, other.length] });
                        for (let i = 0; i < Math.min(rects.length, other.length); i++) {
                            count++;
                            const delta = Math.max(...['x', 'y', 'w', 'h'].map(k => Math.abs(rects[i][k] - other[i][k])));
                            max = Math.max(max, delta);
                            if (delta > 0) differences.push({ selector, i, delta, [renderers[a]]: rects[i], [renderers[b]]: other[i] });
                        }
                    }
                    report.push({ suite: renderers.length === 3 ? 'kits' : 'vue-blade', pair: `${renderers[a]}/${renderers[b]}`, width, theme, text, state, count, max, differences });
                }
                // Fixtures whose bodies every kit must draw with the same text.
                if (text === 'default') for (const [section, expected] of Object.entries(bodyTexts)) for (let i = 0; i < frames.length; i++) {
                    const texts = await frames[i].locator(`.example:has(>h2:text-is("${section}")) .sf-body-form`).allTextContents();
                    // Kits differ only in whitespace between tags, which renders as nothing.
                    assert.deepEqual(texts.map(t => t.replace(/\s+/g, '')), expected.map(t => t.replace(/\s+/g, '')), `${renderers[i]}: ${section}`);
                }
                // A group's featured objects draw as an avatar row; the actor never feeds the row or the strip.
                if (text === 'default' && state === 'collapsed') for (let i = 0; i < frames.length; i++) {
                    const rows = await frames[i].locator('.example:has(>h2:text-is("Featured avatar row")) .sf-row:not(.sf-children .sf-row)').evaluateAll(rows => rows.map(row => ({
                        avatars: [...row.querySelectorAll('.sf-avatar-row .sf-avatar')].map(avatar => [avatar.getAttribute('aria-label'), avatar.closest('a')?.getAttribute('href') ?? null]),
                        more: row.querySelector('.sf-avatar-row__more')?.textContent.trim() ?? null,
                        strip: row.querySelectorAll('.sf-media-strip').length,
                    })));
                    assert.deepEqual(rows, [
                        { avatars: [['Ben Okafor', '#ben'], ['Cara Lindqvist', '#cara'], ['Dev Patel', '#dev']], more: '+2', strip: 0 },
                        { avatars: [['Ben Okafor', '#ben'], ['Cara Lindqvist', '#cara']], more: null, strip: 0 },
                        { avatars: [], more: null, strip: 0 },
                        { avatars: [], more: null, strip: 0 },
                        { avatars: [], more: null, strip: 0 },
                        { avatars: [], more: null, strip: 0 },
                    ], `${renderers[i]}: featured avatar rows`);
                }
                if (renderers.length === 3 && text === 'default') for (let i = 0; i < frames.length; i++) {
                    const icons = frames[i].locator('.example:has(>h2:text-is("Linked object icon frames")) .sf-object-media > a');
                    assert.equal(await icons.count(), 2, `${renderers[i]}: linked object icon frames`);
                    assert.equal(await icons.first().getAttribute('href'), '#ada');
                    assert.equal(await icons.first().getAttribute('data-route'), 'dish');
                    const history = frames[i].locator('.example:has(>h2:text-is("Static collapsed print history"))');
                    assert.equal(await history.locator('.sf-children').count(), 1);
                    assert.equal(await history.locator('.sf-children').isVisible(), false);
                    assert.equal(await history.locator('.sf-toggle').count(), 0);
                    for (const [label, name] of [['Linked object icon frames', 'icons'], ['Static collapsed print history', 'static']]) {
                        await frames[i].locator(`.example:has(>h2:text-is("${label}"))`).screenshot({ path: `${output}/b2-${renderers[i]}-${name}-${state}-${theme}-${width}.png` });
                    }
                }
                const heights = await Promise.all(frames.map(f => f.evaluate(() => document.body.scrollHeight)));
                await page.locator('iframe').evaluateAll((nodes, height) => nodes.forEach(node => node.style.height = height + 'px'), Math.max(...heights));
                for (let i = 0; i < frames.length; i++) {
                    await page.locator('iframe').nth(i).screenshot({ path: `${output}/r1-${renderers.length === 3 ? 'kits' : 'legacy'}-${renderers[i]}-${state}-${theme}-${width}${suffix}.png` });
                    if (renderers.length === 3 && width === 500 && state === 'expanded') {
                        // Screenshot actual joints at 3x device scale without changing layout, after geometry measurement.
                        const selectors = {
                            badge: '.example:has(>h2:text-is("actor")) .sf-row',
                            child: '.example:has(>h2:text-is("Actor parent with glyph-only children")) .sf-row',
                            dot: '.example:has(>h2:text-is("Per-item divider")) .sf-divider',
                            branch: '.example:has(>h2:text-is("Branch divider (extension)")) .sf-divider',
                        };
                        for (const [joint, selector] of Object.entries(selectors)) {
                            const target = frames[i].locator(selector).first();
                            await target.scrollIntoViewIfNeeded();
                            const box = await target.boundingBox();
                            const scroll = await page.evaluate(() => ({ x: scrollX, y: scrollY }));
                            const session = await page.context().newCDPSession(page);
                            const capture = await session.send('Page.captureScreenshot', {
                                format: 'png', captureBeyondViewport: true,
                                clip: { x: box.x + scroll.x, y: box.y + scroll.y, width: Math.min(box.width, 160), height: Math.min(box.height + 40, joint === 'child' ? 350 : 120), scale: 3 },
                            });
                            await writeFile(`${output}/r1-zoom-${renderers[i]}-${joint}-${theme}.png`, Buffer.from(capture.data, 'base64'));
                            await session.detach();
                        }
                    }
                }
            }
            if (renderers.length === 3 && text === 'default') {
                await page.emulateMedia({ media: 'print' });
                const printed = await Promise.all(frames.map(async (frame, i) => {
                    const history = frame.locator('.example:has(>h2:text-is("Static collapsed print history"))');
                    assert.equal(await history.locator('.sf-children').isVisible(), true, `${renderers[i]}: collapsed members print without a toggle`);
                    await history.screenshot({ path: `${output}/b2-${renderers[i]}-print-${theme}-${width}.png` });
                    return history.evaluate(section => {
                        const origin = section.getBoundingClientRect();
                        return ['.sf-feed', '.sf-row', '.sf-head', '.sf-meta', '.sf-children'].flatMap(selector => [...section.querySelectorAll(selector)].map(element => {
                            const r = element.getBoundingClientRect();
                            return { selector, x: r.x - origin.x, y: r.y - origin.y, w: r.width, h: r.height };
                        }));
                    });
                }));
                for (let a = 0; a < frames.length; a++) for (let b = a + 1; b < frames.length; b++) {
                    const differences = []; let max = 0;
                    assert.equal(printed[a].length, printed[b].length);
                    printed[a].forEach((rect, i) => {
                        const delta = Math.max(...['x', 'y', 'w', 'h'].map(k => Math.abs(rect[k] - printed[b][i][k])));
                        max = Math.max(max, delta);
                        if (delta > 0) differences.push({ i, delta, [renderers[a]]: rect, [renderers[b]]: printed[b][i] });
                    });
                    report.push({ suite: 'static-print', pair: `${renderers[a]}/${renderers[b]}`, width, theme, state: 'print', count: printed[a].length, max, differences });
                }
                await page.emulateMedia({ media: 'screen' });
            }
            for (let i = 0; i < frames.length; i++) assert.equal(await frames[i].evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${renderers[i]}: no horizontal overflow`);
            assert.deepEqual(errors, []);
            await page.close();
        }
    }
    await writeFile(`${output}/r1-geometry.json`, JSON.stringify(report, null, 2));
    console.log(report.map(({ differences, ...entry }) => ({ ...entry, differences: differences.length })));
    if (process.env.STORYFEED_STRICT_PARITY) assert.ok(report.every(entry => entry.differences.length === 0 && entry.max === 0), 'Vue/Blade/React geometry must match at 0px; see r1-geometry.json');
} finally { await browser.close(); server.close(); }
