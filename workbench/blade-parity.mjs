import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import assert from 'node:assert/strict';
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
        for (const width of [1512, 500]) for (const theme of ['light', 'dark']) {
            const page = await browser.newPage({ viewport: { width: width * renderers.length, height: 1000 }, timezoneId: 'UTC' });
            const errors = []; page.on('pageerror', e => errors.push(e.message));
            await page.goto(`http://127.0.0.1:${server.address().port}/?width=${width}&theme=${theme}&renderers=${renderers.join(',')}`);
            const frames = page.frames().slice(1);
            await Promise.all(frames.map(async frame => {
                await frame.locator('.sf-feed').first().waitFor();
                await frame.evaluate(theme => {
                    document.documentElement.classList.toggle('dark', theme === 'dark');
                }, theme);
                await frame.evaluate(() => Promise.all([...document.images].map(img => { img.loading = 'eager'; return img.decode().catch(() => {}); })));
            }));
            // Wait for React's post-hydration local clock and day grouping.
            await Promise.all(frames.map(f => f.waitForFunction(() => !document.querySelector('.sf-time')?.textContent.includes('T15:'))));
            for (const state of ['collapsed', 'expanded']) {
                if (state === 'expanded') {
                    await frames[0].locator('.sf-toggle').evaluateAll(buttons => buttons.forEach(button => { if (button.getAttribute('aria-expanded') === 'false') button.click(); }));
                    for (const frame of frames.slice(1)) await frame.locator('details').evaluateAll(nodes => nodes.forEach(node => node.open = true));
                }
                // A stack starts on the same rail as a single face, then grows inward.
                for (let i = 0; i < frames.length; i++) {
                    const fixture = frames[i].locator('.example:has(>h2:text-is("Stacked actors and truncated members"))');
                    const joints = await fixture.evaluate(section => {
                        const rows = [...section.querySelectorAll('.sf-row')].filter(row => !row.closest('.sf-children') && row.querySelector(':scope > .sf-body > .sf-head'));
                        return rows.map(row => {
                            const rail = row.querySelector(':scope > .sf-rail');
                            const faces = [...rail.querySelectorAll('.sf-avatar')].map(e => e.getBoundingClientRect());
                            const line = rail.querySelector('.sf-rail__line')?.getBoundingClientRect();
                            const head = row.querySelector('.sf-head').getBoundingClientRect();
                            return { faces: faces.map(r => ({ x: r.x, w: r.width })),
                                line: line ? line.x + line.width / 2 : null, head: head.x,
                                badge: rail.querySelectorAll('.sf-badge').length };
                        });
                    });
                    assert.equal(joints.length, 4);
                    const first = joints[0].faces[0];
                    for (const [index, count] of [[1, 2], [2, 3]]) {
                        const joint = joints[index];
                        assert.equal(joint.faces.length, count);
                        assert.equal(joint.faces[0].x, first.x, `${renderers[i]}: first stacked face left edge`);
                        assert.equal(joint.faces[0].w, first.w);
                        assert.equal(joint.line, first.x + first.w / 2, `${renderers[i]}: rail through first face`);
                        assert.equal(joint.badge, 0);
                        joint.faces.slice(1).forEach((face, j) => {
                            assert.equal(face.x, joint.faces[j].x + face.w - 12, 'retain 12px overlap');
                        });
                        const last = joint.faces.at(-1);
                        assert.ok(last.x + last.w < joint.head, 'stack clears headline');
                    }
                    assert.ok(joints[0].badge > 0, 'single actor retains activity badge');
                    await fixture.screenshot({ path: `${output}/k1-${renderers[i]}-${state}-${theme}-${width}.png` });
                    if (state === 'collapsed') {
                        await fixture.scrollIntoViewIfNeeded();
                        const box = await fixture.boundingBox();
                        const scroll = await page.evaluate(() => ({ x: scrollX, y: scrollY }));
                        const session = await page.context().newCDPSession(page);
                        const capture = await session.send('Page.captureScreenshot', {
                            format: 'png', captureBeyondViewport: true,
                            clip: { x: box.x + scroll.x, y: box.y + scroll.y + 32, width: 240, height: box.height - 32, scale: 3 },
                        });
                        await writeFile(`${output}/k1-zoom-${renderers[i]}-${theme}-${width}.png`, Buffer.from(capture.data, 'base64'));
                        await session.detach();
                    }
                }
                const geometry = await Promise.all(frames.map(frame => frame.evaluate(() => {
                    const selectors = ['.sf-feed', '.sf-row', '.sf-head', '.sf-meta', '.sf-body-form', '.sf-avatar', '.sf-rail__disc', '.sf-badge', '.sf-rail__line', '.sf-rail__node', '.sf-rail__branch', '.sf-day', '.sf-toggle', '.sf-children', '.sf-media-strip', '.sf-media-object', '.sf-media-object__image', '.sf-media-object__body', '.sf-object-media', '.sf-object-media > .sf-media'];
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
                    report.push({ suite: renderers.length === 3 ? 'kits' : 'vue-blade', pair: `${renderers[a]}/${renderers[b]}`, width, theme, state, count, max, differences });
                }
                if (renderers.length === 3) for (let i = 0; i < frames.length; i++) {
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
                    await page.locator('iframe').nth(i).screenshot({ path: `${output}/r1-${renderers.length === 3 ? 'kits' : 'legacy'}-${renderers[i]}-${state}-${theme}-${width}.png` });
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
            if (renderers.length === 3) {
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
