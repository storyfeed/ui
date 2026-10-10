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
    'Call to action': [
        'The countdown to 1.0 Five milestones to a stable release. See the roadmap→',
        'Open the changelog→',
        'Every milestone, newest first. View→',
        'Release notes Nothing to click here.',
        'Still a heading',
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
            // ui#23's type scale: every body draws one step below the headline (0.875em), tables and lists included, whatever the host's base size.
            for (let i = 0; i < frames.length; i++) {
                const sizes = await frames[i].evaluate(() => {
                    const size = selector => parseFloat(getComputedStyle(document.querySelector(selector)).fontSize);
                    return { head: size('.sf-head'), table: size('.sf-rich-text table'), body: size('.sf-table'), list: size('.sf-list__item') };
                });
                assert.equal(sizes.table / sizes.head, 0.875, `${renderers[i]} ${text}: Prose table scales with the headline`);
                assert.equal(sizes.body / sizes.head, 0.875, `${renderers[i]} ${text}: Table body scales with the headline`);
                assert.equal(sizes.list / sizes.head, 0.875, `${renderers[i]} ${text}: ItemList scales with the headline`);
                // ui#23's root cause: a row drawn outside a feed, in a host whose base is 14px (a Filament panel), still sizes from --sf-font-size: headline 1em, KeyValue one step below.
                const hosted = await frames[i].evaluate(() => {
                    const host = document.createElement('div');
                    host.style.fontSize = '14px';
                    host.append([...document.querySelectorAll('.example')].find(example => example.querySelector(':scope > h2')?.textContent === 'Type scale').querySelector('.sf-row').cloneNode(true));
                    document.body.append(host);
                    const size = selector => parseFloat(getComputedStyle(host.querySelector(selector)).fontSize);
                    const sizes = { headline: size('.sf-headline'), facts: size('.sf-facts'), meta: size('.sf-meta'), feed: parseFloat(getComputedStyle(document.querySelector('.sf-feed')).fontSize) };
                    host.remove();
                    return sizes;
                });
                assert.equal(hosted.headline, hosted.feed, `${renderers[i]} ${text}: a hosted row's headline ignores the host's base size`);
                assert.equal(hosted.facts / hosted.headline, 0.875, `${renderers[i]} ${text}: a hosted row's KeyValue sits one step below its headline`);
                assert.equal(hosted.meta / hosted.headline, 0.875, `${renderers[i]} ${text}: a hosted row's meta line sits one step below its headline`);
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
                // Several actors draw as a diagonal pair inside the single face's square (ui#25):
                // the first actor in front at the bottom-right with the badge, the second behind at the top-left.
                if (text === 'default') for (let i = 0; i < frames.length; i++) {
                    const fixture = frames[i].locator('.example:has(>h2:text-is("Stacked actors and truncated members"))');
                    const joints = await fixture.evaluate(section => {
                        const rows = [...section.querySelectorAll('.sf-row')].filter(row => !row.closest('.sf-children') && row.querySelector(':scope > .sf-body > .sf-head'));
                        return rows.map(row => {
                            const rail = row.querySelector(':scope > .sf-rail');
                            const elements = [...rail.querySelectorAll('.sf-avatar')];
                            const faces = elements.map(e => e.getBoundingClientRect());
                            // Where the two faces overlap, the front one (the first actor) is on top.
                            const overlap = faces.length === 2 ? document.elementFromPoint((faces[0].x + faces[1].right) / 2, (faces[0].y + faces[1].bottom) / 2)?.closest('.sf-avatar') === elements[0] : true;
                            const disc = rail.querySelector('.sf-rail__disc').getBoundingClientRect();
                            const line = rail.querySelector('.sf-rail__line')?.getBoundingClientRect();
                            const head = row.querySelector('.sf-head').getBoundingClientRect();
                            return { faces: faces.map(r => ({ x: r.x - disc.x, y: r.y - disc.y, w: r.width, h: r.height })), disc: { x: disc.x, y: disc.y - row.getBoundingClientRect().y, w: disc.width, h: disc.height },
                                labels: elements.map(e => [e.getAttribute('aria-label'), e.textContent.trim()]),
                                line: line ? line.x + line.width / 2 : null, lineY: line ? line.y - row.getBoundingClientRect().y : null, head: head.x,
                                badge: rail.querySelectorAll('.sf-badge').length, overlap,
                                badgeBox: (b => b && { right: b.right - disc.x, bottom: b.bottom - disc.y, w: b.width, h: b.height })(rail.querySelector('.sf-badge')?.getBoundingClientRect()) };
                        });
                    });
                    assert.equal(joints.length, 4);
                    const single = joints[0];
                    const near = (a, b, label) => assert.ok(Math.abs(a - b) < 0.02, `${renderers[i]}: ${label} (${a} vs ${b})`);
                    for (const index of [1, 2]) {
                        const joint = joints[index];
                        const d = single.faces[0].w;
                        assert.equal(joint.faces.length, 2, `${renderers[i]}: at most two faces`);
                        assert.deepEqual(joint.disc, single.disc, `${renderers[i]}: the pair fills the single face's square`);
                        const [front, back] = joint.faces;
                        for (const face of joint.faces) { near(face.w, d * 2 / 3, 'face is 2/3 of the disc'); near(face.h, d * 2 / 3, 'face is square'); }
                        near(front.x + front.w, d, 'front face at the right'); near(front.y + front.h, d, 'front face at the bottom');
                        near(back.x, 0, 'back face at the left'); near(back.y, 0, 'back face at the top');
                        assert.ok(joint.overlap, `${renderers[i]}: the front face paints above the back`);
                        assert.ok(joint.labels.every(([, text]) => text.length <= 1), `${renderers[i]}: one-letter initials`);
                        assert.equal(joint.head, single.head, 'headline aligns with single actor');
                        assert.equal(joint.line, single.line, `${renderers[i]}: the rail runs through the pair's centre`);
                        assert.equal(joint.lineY, single.lineY, `${renderers[i]}: the line starts where it does under one face`);
                        assert.equal(joint.badge, single.badge, `${renderers[i]}: the pair keeps the front face's badge`);
                        // Jasper's pick (ui#25 (a)): a smaller badge that balances the smaller faces, anchored where every other row's sits.
                        near(joint.badgeBox.w, d * 11 / 32, 'the pair badge is 11/32 of the disc'); near(joint.badgeBox.h, d * 11 / 32, 'the pair badge is round');
                        near(joint.badgeBox.right, single.badgeBox.right, 'the pair badge keeps the single badge\'s right edge');
                        near(joint.badgeBox.bottom, single.badgeBox.bottom, 'the pair badge keeps the single badge\'s bottom edge');
                        assert.ok(single.badgeBox.w > joint.badgeBox.w, `${renderers[i]}: a single actor's badge keeps its size`);
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
                    const selectors = ['.sf-feed', '.sf-row', '.sf-head', '.sf-meta', '.sf-body-form', '.sf-avatar', '.sf-rail__disc', '.sf-badge', '.sf-rail__line', '.sf-rail__node', '.sf-rail__branch', '.sf-day', '.sf-toggle', '.sf-children', '.sf-media-strip', '.sf-media-object', '.sf-media-object__image', '.sf-media-object__body', '.sf-object-media', '.sf-object-media > .sf-media', '.sf-facts', '.sf-facts__row', '.sf-facts__label', '.sf-facts__value', '.sf-facts__value > span', '.sf-rich-text', '.sf-rich-text *', '.sf-list-block', '.sf-list__prose *', '.sf-media-strip > *', '.sf-avatar--tile', '.sf-table-block', '.sf-table__prose *', '.sf-media-object__image img', '.sf-cta', '.sf-cta > *', '.sf-cta__action'];
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
                // Flowing text is never capped; code and verbatim blocks scroll at `--sf-prose-max-h` (24rem), which `none` lifts.
                if (state === 'collapsed' && text === 'default') for (let i = 0; i < frames.length; i++) {
                    const measure = () => frames[i].locator('.example:has(>h2:text-is("Long bodies")) .sf-body-form').evaluateAll(forms => forms.map(form => {
                        const block = form.querySelector('.sf-verbatim, .sf-rich-text pre');
                        const text = form.querySelector('.sf-rich-text, .sf-prose, .sf-table__prose');
                        const box = node => node && [getComputedStyle(node).maxHeight, node.scrollHeight > node.clientHeight + 1];
                        return { text: box(text), block: box(block) };
                    }));
                    const flowing = { text: ['none', false], block: null };
                    assert.deepEqual(await measure(), [flowing, flowing, { text: null, block: ['384px', true] }, flowing, { text: ['none', false], block: ['384px', true] }], `${renderers[i]}: only code and verbatim blocks scroll`);
                    await frames[i].evaluate(() => document.body.style.setProperty('--sf-prose-max-h', 'none'));
                    assert.deepEqual(await measure(), [flowing, flowing, { text: null, block: ['none', false] }, flowing, { text: ['none', false], block: ['none', false] }], `${renderers[i]}: none lifts the block cap`);
                    await frames[i].evaluate(() => document.body.style.removeProperty('--sf-prose-max-h'));
                }
                // A body's own maximum height: a length caps the whole body in its wrapper; unset, `none` or invalid leave it whole.
                if (state === 'collapsed' && text === 'default') for (let i = 0; i < frames.length; i++) {
                    const caps = await frames[i].locator('.example:has(>h2:text-is("Body max height")) .sf-body-form').evaluateAll(forms => forms.map(form => [getComputedStyle(form).maxHeight, form.scrollHeight > form.clientHeight + 1]));
                    assert.deepEqual(caps, [['none', false], ['none', false], ['160px', true], ['96px', true], ['none', false], ['none', false]], `${renderers[i]}: body max heights`);
                }
                // Core 0.17's `link` shape: entity links keep their safe attributes; an href-less body link takes the entity's and adds its own.
                if (state === 'collapsed' && text === 'default') for (let i = 0; i < frames.length; i++) {
                    const links = await frames[i].locator('.example:has(>h2:text-is("Entity links (core 0.17)")) a').evaluateAll(links => links.map(a => [a.textContent.trim(), a.getAttribute('href'), ...['target', 'rel', 'data-route', 'data-extra', 'onclick'].map(name => a.getAttribute(name))]));
                    assert.deepEqual(links, [
                        ['Ana Silva', '#ana', null, null, 'person', null, null],
                        ['Order #1042', '#order-1042', '_blank', null, null, null, null],
                        ['Tiramisu', '#tiramisu', null, 'nofollow', null, null, null],
                        ['This order', '#order-1042', '_blank', null, null, 'yes', null],
                        ['Dinner for two', '#order-1042', '_blank', null, null, null, null],
                        ['Receipt', '#receipt', null, null, null, null, null],
                        ['Ana Silva', '#ana', null, null, 'person', null, null],
                    ], `${renderers[i]}: core 0.17 links`);
                }
                // A call to action's button keeps its link and safe attributes; an href-less one goes to its entity.
                if (state === 'collapsed' && text === 'default') for (let i = 0; i < frames.length; i++) {
                    const actions = await frames[i].locator('.example:has(>h2:text-is("Call to action")) .sf-cta__action').evaluateAll(links => links.map(a => [a.getAttribute('href'), a.getAttribute('target'), a.hasAttribute('onclick')]));
                    assert.deepEqual(actions, [['#roadmap', '_blank', false], ['#changelog', null, false], ['#roadmap-page', null, false]], `${renderers[i]}: call to action links`);
                }
                // Time ranges on the meta line: collapsed by shared month or day, open ends, nothing without one.
                if (state === 'collapsed' && text === 'default') for (let i = 0; i < frames.length; i++) {
                    const ranges = await frames[i].locator('.example:has(>h2:text-is("Time ranges")) .sf-meta').evaluateAll(metas => metas.map(meta => meta.querySelector('.sf-meta__range')?.textContent ?? null));
                    assert.deepEqual(ranges, ['30 Sep – 9 Oct 2026', '1 – 9 Oct 2026', '9 Oct 2026', '30 Dec 2025 – 2 Jan 2026', 'from 9 Oct 2026', 'until 31 Oct 2026', null], `${renderers[i]}: time ranges`);
                }
                // Card pictures keep their shape: 1:1–2:1 at the card's height, whole when undeclared, square icons,
                // and the text column keeps a readable width (12em, or the whole card once the picture stacks above it).
                if (state === 'collapsed') for (let i = 0; i < frames.length; i++) {
                    const cards = await frames[i].locator('.example:has(>h2:text-is("Card pictures")) .sf-media-object').evaluateAll(cards => cards.map(card => {
                        const box = card.querySelector('.sf-media').getBoundingClientRect();
                        const body = card.querySelector('.sf-media-object__body');
                        const content = card.clientWidth - parseFloat(getComputedStyle(card).paddingLeft) - parseFloat(getComputedStyle(card).paddingRight);
                        return {
                            ratio: Math.round(box.width / box.height * 10) / 10,
                            fit: getComputedStyle(card.querySelector('.sf-media img')).objectFit,
                            readable: body.getBoundingClientRect().width >= Math.min(12 * parseFloat(getComputedStyle(body).fontSize), content) - 0.5,
                        };
                    }));
                    assert.deepEqual(cards, [[1.9, 'cover'], [1, 'cover'], [1, 'cover'], [1.9, 'contain'], [1, 'cover']].map(([ratio, fit]) => ({ ratio, fit, readable: true })), `${renderers[i]} ${width} ${text}: card pictures`);
                }
                // A group's strip: one uniform square tile per member activity, a picture or the entity's avatar, then "+N" (ui#27).
                if (text === 'default' && state === 'collapsed') for (let i = 0; i < frames.length; i++) {
                    const strips = await frames[i].locator('.example:has(>h2:text-matches("^Strip: ")) .sf-row:not(.sf-children .sf-row) .sf-media-strip').evaluateAll(strips => strips.map(strip => [...strip.children].map(tile => {
                        const box = tile.getBoundingClientRect();
                        const href = tile.getAttribute('href');
                        const kind = tile.classList.contains('sf-media-strip__more') ? tile.textContent.trim() : tile.querySelector('img') ? 'picture' : `avatar:${tile.querySelector('.sf-avatar')?.textContent.trim() ?? tile.textContent.trim()}`;
                        return { kind, href, w: Math.round(box.width * 100) / 100, h: Math.round(box.height * 100) / 100 };
                    })));
                    assert.deepEqual(strips.map(tiles => tiles.map(tile => tile.kind)), [
                        ['picture', 'avatar:IN', 'picture', '+3'],
                        ['picture', 'picture', 'picture', '+6'],
                        ['avatar:M', 'picture', 'picture'],
                        ['picture', 'picture'],
                    ], `${renderers[i]} ${width}: strip tiles`);
                    const sizes = strips.flat().map(tile => [tile.w, tile.h]);
                    assert.ok(sizes.every(([w, h]) => w === sizes[0][0] && h === sizes[0][0]), `${renderers[i]} ${width}: every strip tile is the same square`);
                    assert.ok(strips.flat().filter(tile => !tile.kind.startsWith('+')).every(tile => tile.href?.startsWith('/')), `${renderers[i]}: every tile links to its entity`);
                    // Jasper (ui#27): the "+N" tile opens and closes the group exactly like "Show all N", by click and by keyboard.
                    const album = frames[i].locator('.example:has(>h2:text-is("Strip: photos uploaded to an album")) .sf-row:not(.sf-children .sf-row)').first();
                    const more = album.locator('.sf-media-strip__more');
                    assert.equal(await more.evaluate(button => button.tagName), 'BUTTON', `${renderers[i]}: the +N tile is a button`);
                    assert.equal(await more.getAttribute('aria-label'), 'Show all 9', `${renderers[i]}: the +N tile's name`);
                    assert.equal(await more.getAttribute('aria-controls'), await album.locator('.sf-children').getAttribute('id'), `${renderers[i]}: the +N tile controls the members`);
                    const read = async () => ({ open: await album.locator('.sf-children').isVisible(), expanded: await more.getAttribute('aria-expanded') });
                    // A details element announces its toggle a task later, so wait for the state rather than reading it once.
                    const settle = async (want) => { for (let t = 0; t < 40; t++) { const now = await read(); if (now.open === want.open && now.expanded === want.expanded) return now; await new Promise(r => setTimeout(r, 50)); } return read(); };
                    assert.deepEqual(await settle({ open: false, expanded: 'false' }), { open: false, expanded: 'false' }, `${renderers[i]}: collapsed to start`);
                    await more.click();
                    assert.deepEqual(await settle({ open: true, expanded: 'true' }), { open: true, expanded: 'true' }, `${renderers[i]}: clicking +N opens the group`);
                    assert.match(await album.locator('.sf-toggle').innerText(), /Show less/, `${renderers[i]}: the toggle follows`);
                    await more.click();
                    assert.deepEqual(await settle({ open: false, expanded: 'false' }), { open: false, expanded: 'false' }, `${renderers[i]}: clicking +N again closes it`);
                    await more.focus();
                    await more.press('Enter');
                    assert.deepEqual(await settle({ open: true, expanded: 'true' }), { open: true, expanded: 'true' }, `${renderers[i]}: Enter opens the group`);
                    await more.press(' ');
                    assert.deepEqual(await settle({ open: false, expanded: 'false' }), { open: false, expanded: 'false' }, `${renderers[i]}: Space closes it`);
                    await album.locator('.sf-toggle').click();
                    assert.deepEqual(await settle({ open: true, expanded: 'true' }), { open: true, expanded: 'true' }, `${renderers[i]}: the +N tile follows the toggle`);
                    await album.locator('.sf-toggle').click();
                    assert.deepEqual(await settle({ open: false, expanded: 'false' }), { open: false, expanded: 'false' }, `${renderers[i]}: and closes with it`);
                }
                if (renderers.length === 3 && text === 'default') for (let i = 0; i < frames.length; i++) {
                    const icons = frames[i].locator('.example:has(>h2:text-is("Icon Image bodies")) .sf-object-media > a');
                    assert.equal(await icons.count(), 1, `${renderers[i]}: icon Image bodies draw the thumbnail`);
                    assert.equal(await frames[i].locator('.example:has(>h2:text-is("Icon Image bodies")) img').count(), 1, `${renderers[i]}: an icon without an Image body draws no picture`);
                    assert.equal(await icons.first().getAttribute('href'), '#ada');
                    assert.equal(await icons.first().getAttribute('data-route'), 'dish');
                    const history = frames[i].locator('.example:has(>h2:text-is("Static collapsed print history"))');
                    assert.equal(await history.locator('.sf-children').count(), 1);
                    assert.equal(await history.locator('.sf-children').isVisible(), false);
                    assert.equal(await history.locator('.sf-toggle').count(), 0);
                    for (const [label, name] of [['Icon Image bodies', 'icons'], ['Static collapsed print history', 'static']]) {
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
