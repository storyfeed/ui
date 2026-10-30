import { chromium } from 'playwright';
import { mkdir, readdir, rename, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { serve, pages } from './host.mjs';

// ui#30, three motions. The morph: expanding a group flies each picture tile
// to the member row that draws the same picture and back again, in 200 ms
// eased out, while the head row stays put. Arrivals: rows that join after the
// first render ease in at the head (Live) or fade in below (a new page), and
// the first page draws still. The pill (Vue and React): with the reader
// scrolled away from the top, Live rows wait behind "N new" and nothing moves
// until it's tapped. Updates (Vue and React): a group's headline number that
// changes in place fades in alone. Reduced motion, and a browser without the
// API, swap instantly, as before. Run after `npm run workbench`.
// STORYFEED_MOTIONS=morph,arrivals,pill,updates picks which to run (all by default).
// STORYFEED_RECORDINGS=<dir> also records each one per kit, as MP4 when
// ffmpeg is on the PATH (WebM otherwise).
const recordings = process.env.STORYFEED_RECORDINGS;
const motions = new Set((process.env.STORYFEED_MOTIONS ?? 'morph,arrivals,pill,updates').split(','));
const GROUP = 'uploaded 9 photos';

if (recordings) await mkdir(recordings, { recursive: true });

const { server, origin } = await serve();
const browser = await chromium.launch();

// Records every transition: the pictures named before and after the change,
// and the timing of every transition pseudo-element once it runs.
const instrument = () => {
    window.__morphs = [];
    const start = document.startViewTransition?.bind(document);
    if (!start) return;
    const marks = () => [...document.querySelectorAll('[data-sf-morph] [data-sf-vt]')].map(element => ({
        slot: element.dataset.sfVt,
        src: (element.matches('img') ? element : element.querySelector('img'))?.getAttribute('src'),
        side: element.closest('.sf-children') ? 'members' : element.closest('.sf-media-strip') ? 'strip' : 'elsewhere',
        name: getComputedStyle(element).viewTransitionName,
    }));
    document.startViewTransition = update => {
        const record = { before: marks(), after: null, animations: null };
        window.__morphs.push(record);
        const transition = start(async () => {
            await update();
            record.after = marks();
        });
        transition.ready.then(() => requestAnimationFrame(() => {
            record.animations = document.getAnimations()
                .filter(animation => animation.effect?.pseudoElement?.startsWith('::view-transition'))
                .map(animation => ({ pseudo: animation.effect.pseudoElement, state: animation.playState, ...animation.effect.getTiming() }));
        }));
        return transition;
    };
};

const groupOf = page => page.locator('.sf-row').filter({ has: page.locator('.sf-head', { hasText: GROUP }) }).first();
const settled = page => page.waitForFunction(() => !document.querySelector('[data-sf-morph]') && !document.querySelector('[data-sf-vt]'));
const membersShown = group => group.locator(':scope > .sf-body .sf-children').evaluate(element => element.checkVisibility());
const headBox = group => group.locator(':scope > .sf-body > .sf-head').evaluate(element => { const r = element.getBoundingClientRect(); return [r.x, r.y, r.width, r.height].map(Math.round).join(','); });

async function open(kit, path, { theme = 'light', reducedMotion = 'no-preference', api = true, video = null, top = false } = {}) {
    const context = await browser.newContext({
        viewport: { width: 900, height: 900 },
        timezoneId: 'UTC',
        reducedMotion,
        ...(video ? { recordVideo: { dir: video, size: { width: 900, height: 900 } } } : {}),
    });
    if (!api) await context.addInitScript(() => { delete Document.prototype.startViewTransition; });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${origin}/${path}?theme=${theme}`);
    await page.locator('.sf-feed').first().waitFor();
    await page.evaluate(theme => document.documentElement.classList.toggle('dark', theme === 'dark'), theme);
    await page.evaluate(() => Promise.all([...document.images].map(img => { img.loading = 'eager'; return img.decode().catch(() => {}); })));
    await page.evaluate(instrument);
    const group = groupOf(page);
    if (!top) {
        await group.evaluate(element => element.scrollIntoView({ block: 'start' }));
        await page.evaluate(() => window.scrollBy(0, -24));
    }
    return { context, page, group, errors };
}

// The nth transition this page started, once its animations run; null if it never started.
async function morphAt(page, n) {
    if ((await page.evaluate(() => window.__morphs.length)) <= n) return null;
    await page.waitForFunction(n => window.__morphs[n].animations, n, { timeout: 5000 });
    return page.evaluate(n => window.__morphs[n], n);
}

// A host adding rows to the first feed: the workbench's hooks in Vue and
// React, and in Blade a row inserted into the server-drawn feed, as Livewire
// or Turbo would.
const add = (kit, where) => kit === 'blade'
    ? page => page.evaluate(where => {
        const feed = document.querySelector('.sf-feed > [role="feed"]');
        const row = feed.querySelector(':scope > .sf-row:not(.sf-divider)').cloneNode(true);
        if (where === 'head') feed.prepend(row); else feed.append(row);
    }, where)
    : page => page.evaluate(where => window.storyfeedWorkbench[where === 'head' ? 'arrive' : 'page'](), where);

// Every row now carrying arrival classes, and the transitions it runs.
async function arrived(page) {
    await page.waitForFunction(() => document.querySelector('[class*="starting:opacity-0"]:not(.sf-new__pill)'), null, { timeout: 5000 }).catch(() => {});
    return page.evaluate(() => [...document.querySelectorAll('[class*="starting:opacity-0"]:not(.sf-new__pill)')].map(row => ({
        head: row.classList.contains('starting:h-0'),
        transitions: row.getAnimations().map(animation => animation.transitionProperty).sort(),
    })));
}
const marked = page => page.evaluate(() => document.querySelectorAll('[class*="starting:"]:not(.sf-new__pill)').length);
const unmarked = page => page.waitForFunction(() => !document.querySelector('[class*="starting:"]:not(.sf-new__pill)'), null, { timeout: 5000 }).then(() => true, () => false);
// Scroll the first feed's top out of view, and read what the reader sees.
const awayFromTop = page => page.evaluate(() => {
    const feed = document.querySelector('.sf-feed');
    window.scrollTo(0, feed.getBoundingClientRect().top + window.scrollY + 140);
});
const view = page => page.evaluate(() => {
    const feed = document.querySelector('.sf-feed');
    const rows = [...feed.querySelectorAll('[role="listitem"]')];
    const pill = feed.querySelector('.sf-new__pill');
    return {
        rows: rows.length,
        tops: rows.map(row => Math.round(row.getBoundingClientRect().top)).join(','),
        // Visible, and its own height: a zero-height row must not squash it.
        pill: pill ? { text: pill.textContent.trim(), visible: pill.getBoundingClientRect().top >= 0 && pill.getBoundingClientRect().bottom <= innerHeight, height: pill.getBoundingClientRect().height >= 24 } : null,
        feedTop: Math.round(feed.getBoundingClientRect().top),
    };
});
const endOfFirstFeed = page => page.evaluate(() => {
    const feed = document.querySelector('.sf-feed');
    window.scrollTo(0, feed.getBoundingClientRect().bottom + window.scrollY - innerHeight + 120);
});

const summaryOf = group => group.locator(':scope > .sf-body .sf-toggle').first();

const failures = [];
const check = (label, fn) => { try { fn(); } catch (error) { failures.push(`${label}: ${error.message}`); } };

try {
    for (const [kit, path] of Object.entries(pages)) {
        // The morph: tiles out of the strip into the member rows, and back.
        if (motions.has('morph')) {
            const { context, page, group, errors } = await open(kit, path);
            const srcs = await group.locator(':scope > .sf-body > .sf-media-strip img').evaluateAll(imgs => imgs.map(img => img.getAttribute('src')));
            assert.ok(srcs.length >= 2, `${kit}: the "${GROUP}" group draws picture tiles`);
            const head = await headBox(group);

            await summaryOf(group).click();
            await settled(page);
            const expanded = await membersShown(group);
            const headAfter = await headBox(group);
            const out = await morphAt(page, 0);

            check(`${kit} expand`, () => {
                assert.ok(out, 'a transition starts');
                assert.equal(expanded, true, 'the members show');
                assert.equal(headAfter, head, 'the head row never moves');
                assert.deepEqual(out.before.map(m => [m.slot, m.src, m.side]), srcs.map((src, i) => [String(i), src, 'strip']), 'each picture tile is named, in order, in the strip');
                assert.deepEqual(out.before.map(m => m.name), srcs.map((_, i) => `sf-vt-${i}`), 'the names come from the literal classes');
                assert.deepEqual(out.after.map(m => [m.slot, m.src, m.side]).sort(), srcs.map((src, i) => [String(i), src, 'members']).sort(), 'each name lands on the member row drawing the same picture');
                for (let i = 0; i < srcs.length; i++) assert.ok(out.animations.some(a => a.pseudo === `::view-transition-group(sf-vt-${i})`), `sf-vt-${i} flies`);
                for (const a of out.animations) {
                    if (a.pseudo.endsWith('(root)')) {
                        assert.equal(a.state, 'finished', `${a.pseudo} jumps: the page itself never fades`);
                        continue;
                    }
                    assert.equal(a.duration, 200, `${a.pseudo} runs 200 ms`);
                    assert.equal(a.easing, 'ease-out', `${a.pseudo} eases out`);
                }
            });

            await summaryOf(group).click();
            await settled(page);
            const collapsed = !(await membersShown(group));
            const back = await morphAt(page, 1);
            check(`${kit} collapse`, () => {
                assert.ok(back, 'a transition starts');
                assert.equal(collapsed, true, 'the members hide');
                assert.equal(back.before.every(m => m.side === 'members'), true, 'the pictures leave the member rows');
                assert.deepEqual(back.after.map(m => [m.src, m.side]).sort(), srcs.map(src => [src, 'strip']).sort(), 'and land on their tiles');
            });

            // The "+N" tile morphs exactly as the toggle does.
            await group.locator(':scope > .sf-body > .sf-media-strip > .sf-media-strip__more').click();
            await settled(page);
            const viaTile = await membersShown(group);
            const morphs = await page.evaluate(() => window.__morphs.length);
            check(`${kit} +N tile`, () => {
                assert.equal(viaTile, true, 'the "+N" tile opens the members');
                assert.equal(morphs, 3, 'through the same transition');
            });
            check(`${kit} errors`, () => assert.deepEqual(errors, []));
            await context.close();
        }

        // Reduced motion and a browser without the API: an instant swap.
        if (motions.has('morph')) for (const variant of [{ reducedMotion: 'reduce' }, { api: false }]) {
            const label = `${kit} ${variant.api === false ? 'without View Transitions' : 'reduced motion'}`;
            const { context, page, group, errors } = await open(kit, path, variant);
            await summaryOf(group).click();
            const shown = await membersShown(group);
            const state = await page.evaluate(() => ({ morphs: window.__morphs.length, marked: document.querySelectorAll('[data-sf-morph],[data-sf-vt]').length }));
            await summaryOf(group).click();
            const hidden = !(await membersShown(group));
            check(label, () => {
                assert.equal(shown, true, 'the members show at once');
                assert.equal(hidden, true, 'and hide at once');
                assert.deepEqual(state, { morphs: 0, marked: 0 }, 'no transition starts');
                assert.deepEqual(errors, []);
            });
            await context.close();
        }

        // Arrivals: a Live row eases in at the head, a page fades in below.
        if (motions.has('arrivals')) {
            const { context, page, errors } = await open(kit, path, { top: true });
            const still = await marked(page);
            await add(kit, 'head')(page);
            const head = await arrived(page);
            const headSettled = await unmarked(page);
            await add(kit, 'page')(page);
            const below = await arrived(page);
            const belowSettled = await unmarked(page);
            check(`${kit} arrivals`, () => {
                assert.equal(still, 0, 'the first page draws still');
                assert.deepEqual(head, [{ head: true, transitions: ['height', 'opacity', 'translate'] }], 'a Live row eases in at the head, growing from nothing');
                assert.equal(headSettled, true, 'and drops its arrival classes once it lands');
                assert.deepEqual(below, Array(kit === 'blade' ? 1 : 2).fill({ head: false, transitions: ['opacity'] }), 'a page fades in below');
                assert.equal(belowSettled, true, 'and drops its arrival classes once it lands');
                assert.deepEqual(errors, []);
            });
            await context.close();

            const reduced = await open(kit, path, { top: true, reducedMotion: 'reduce' });
            await add(kit, 'head')(reduced.page);
            const instant = await arrived(reduced.page);
            check(`${kit} arrivals with reduced motion`, () => assert.deepEqual(instant, [{ head: true, transitions: [] }], 'nothing transitions'));
            await reduced.context.close();
        }

        // The pill: scrolled away, Live rows wait and nothing moves until it's tapped.
        if (motions.has('pill') && kit !== 'blade') {
            const { context, page, errors } = await open(kit, path, { top: true });
            await awayFromTop(page);
            const before = await view(page);
            await add(kit, 'head')(page);
            await page.locator('.sf-new__pill').first().waitFor({ timeout: 5000 }).catch(() => {});
            const one = await view(page);
            await add(kit, 'head')(page);
            await page.waitForFunction(() => document.querySelector('.sf-new__pill')?.textContent.includes('2'), null, { timeout: 5000 }).catch(() => {});
            const two = await view(page);
            const pill = page.locator('.sf-new__pill').first();
            if (await pill.count()) await pill.click();
            const released = await arrived(page);
            const after = await view(page);
            check(`${kit} pill`, () => {
                assert.equal(before.pill, null, 'no pill before anything arrives');
                assert.deepEqual(one.pill, { text: '1 new', visible: true, height: true }, 'a Live row waits behind a visible "1 new"');
                assert.equal(one.tops, before.tops, 'and the rows being read stay put');
                assert.equal(one.rows, before.rows, 'the waiting row is not drawn');
                assert.equal(two.pill?.text, '2 new', 'a second arrival waits too');
                assert.equal(two.tops, before.tops, 'still nothing moves');
                assert.equal(after.pill, null, 'tapping the pill dismisses it');
                assert.equal(after.rows, before.rows + 2, 'and draws the waiting rows');
                assert.ok(Math.abs(after.feedTop) <= 1, `at the top of the feed (${after.feedTop}px)`);
                assert.deepEqual(released, Array(2).fill({ head: true, transitions: ['height', 'opacity', 'translate'] }), 'where they ease in');
                assert.deepEqual(errors, []);
            });
            await context.close();
        }

        // Updates: "and 4 more" becomes "and 5 more", and only the 5 fades in.
        if (motions.has('updates') && kit !== 'blade') {
            for (const reducedMotion of ['no-preference', 'reduce']) {
                const { context, page, errors } = await open(kit, path, { top: true, reducedMotion });
                const fading = () => page.evaluate(() => {
                    const headline = document.querySelector('.sf-feed .sf-headline');
                    const parts = [...headline.querySelectorAll('[data-sf-part]')];
                    return {
                        text: headline.textContent.replace(/\s+/g, ' ').trim(),
                        fading: parts.filter(part => part.getAnimations().length).map(part => `${part.dataset.sfPart}:${part.textContent}:${part.getAnimations()[0].effect.getTiming().duration}`),
                        // Anything else in the headline that animates.
                        others: [...headline.querySelectorAll('*')].filter(element => !element.matches('[data-sf-part]') && element.getAnimations().length).length,
                    };
                });
                const before = await fading(page);
                await page.evaluate(() => window.storyfeedWorkbench.grow());
                await page.waitForFunction(() => /and 5 more/.test(document.querySelector('.sf-feed .sf-headline').textContent), null, { timeout: 5000 }).catch(() => {});
                const after = await fading(page);
                check(`${kit} updates${reducedMotion === 'reduce' ? ' with reduced motion' : ''}`, () => {
                    assert.match(before.text, /and 4 more/);
                    assert.deepEqual(before.fading, [], 'the first render fades nothing');
                    assert.match(after.text, /and 5 more/, 'the count changes in place');
                    assert.deepEqual(after.fading, reducedMotion === 'reduce' ? [] : ['more:5:200'], 'only the changed number fades in, over 200 ms');
                    assert.equal(after.others, 0, 'and nothing else in the headline moves');
                    assert.deepEqual(errors, []);
                });
                await context.close();
            }
        }

        if (recordings) {
            const takes = [
                ...(motions.has('morph') ? ['light', 'dark'].flatMap(theme => [1, 0.25].map(speed => ({ motion: 'morph', theme, speed }))) : []),
                ...['arrivals', 'pill', 'updates'].filter(motion => motions.has(motion) && (motion === 'arrivals' || kit !== 'blade')).flatMap(motion => [{ motion, theme: 'light', speed: 1 }, { motion, theme: 'dark', speed: 1 }, { motion, theme: 'light', speed: 0.25 }]),
            ];
            for (const { motion, theme, speed } of takes) {
                const dir = join(recordings, `.${kit}-${motion}-${theme}-${speed}`);
                const { context, page, group } = await open(kit, path, { theme, video: dir, top: motion !== 'morph' });
                if (speed !== 1) {
                    const cdp = await context.newCDPSession(page);
                    await cdp.send('Animation.enable');
                    await cdp.send('Animation.setPlaybackRate', { playbackRate: speed });
                }
                const pause = ms => page.waitForTimeout(ms / speed ** 0.5);
                await pause(600);
                if (motion === 'morph') {
                    await summaryOf(group).click();
                    await settled(page);
                    await pause(900);
                    await summaryOf(group).click();
                    await settled(page);
                } else if (motion === 'updates') {
                    await page.evaluate(() => window.storyfeedWorkbench.grow());
                    await pause(900);
                    await page.evaluate(() => window.storyfeedWorkbench.grow());
                } else if (motion === 'pill') {
                    await awayFromTop(page);
                    await pause(600);
                    await add(kit, 'head')(page);
                    await pause(900);
                    await add(kit, 'head')(page);
                    await pause(1200);
                    await page.locator('.sf-new__pill').first().click();
                } else {
                    await add(kit, 'head')(page);
                    await pause(900);
                    await add(kit, 'head')(page);
                    await pause(900);
                    await endOfFirstFeed(page);
                    await pause(600);
                    await add(kit, 'page')(page);
                }
                await pause(900);
                await context.close();
                const [webm] = (await readdir(dir)).filter(file => file.endsWith('.webm'));
                const name = `ui30-${motion}-${kit}-${theme}${speed === 1 ? '' : '-quarter-speed'}`;
                try {
                    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', join(dir, webm), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', join(recordings, `${name}.mp4`)]);
                } catch {
                    await rename(join(dir, webm), join(recordings, `${name}.webm`));
                }
                await rm(dir, { recursive: true, force: true });
            }
        }
    }
} finally {
    await browser.close();
    server.close();
}

if (failures.length) {
    console.error(failures.join('\n'));
    process.exit(1);
}
console.log(`motion: ${[...motions].join(' and ')} pass in ${Object.keys(pages).join(', ')}, and swap instantly with reduced motion${recordings ? `; recordings in ${recordings}` : ''}`);
