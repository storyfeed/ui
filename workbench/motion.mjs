import { chromium } from 'playwright';
import { mkdir, readdir, rename, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { serve, pages } from './host.mjs';

// ui#30: expanding a group morphs. Each picture tile flies to the member row
// that draws the same picture and back again, in 200 ms eased out, while the
// head row stays put. Reduced motion and a browser without the View
// Transitions API swap instantly, as before. Run after `npm run workbench`.
// STORYFEED_RECORDINGS=<dir> also records each kit expanding and collapsing,
// light and dark, at full speed and at a quarter speed, as MP4 when ffmpeg is
// on the PATH (WebM otherwise).
const recordings = process.env.STORYFEED_RECORDINGS;
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
                .map(animation => ({ pseudo: animation.effect.pseudoElement, ...animation.effect.getTiming() }));
        }));
        return transition;
    };
};

const groupOf = page => page.locator('.sf-row').filter({ has: page.locator('.sf-head', { hasText: GROUP }) }).first();
const settled = page => page.waitForFunction(() => !document.querySelector('[data-sf-morph]') && !document.querySelector('[data-sf-vt]'));
const membersShown = group => group.locator(':scope > .sf-body .sf-children').evaluate(element => element.checkVisibility());
const headBox = group => group.locator(':scope > .sf-body > .sf-head').evaluate(element => { const r = element.getBoundingClientRect(); return [r.x, r.y, r.width, r.height].map(Math.round).join(','); });

async function open(kit, path, { theme = 'light', reducedMotion = 'no-preference', api = true, video = null } = {}) {
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
    await group.evaluate(element => element.scrollIntoView({ block: 'start' }));
    await page.evaluate(() => window.scrollBy(0, -24));
    return { context, page, group, errors };
}

// The nth transition this page started, once its animations run; null if it never started.
async function morphAt(page, n) {
    if ((await page.evaluate(() => window.__morphs.length)) <= n) return null;
    await page.waitForFunction(n => window.__morphs[n].animations, n, { timeout: 5000 });
    return page.evaluate(n => window.__morphs[n], n);
}

const summaryOf = group => group.locator(':scope > .sf-body .sf-toggle').first();

const failures = [];
const check = (label, fn) => { try { fn(); } catch (error) { failures.push(`${label}: ${error.message}`); } };

try {
    for (const [kit, path] of Object.entries(pages)) {
        // The morph: tiles out of the strip into the member rows, and back.
        {
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
        for (const variant of [{ reducedMotion: 'reduce' }, { api: false }]) {
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

        if (recordings) {
            for (const theme of ['light', 'dark']) for (const speed of [1, 0.25]) {
                const dir = join(recordings, `.${kit}-${theme}-${speed}`);
                const { context, page, group } = await open(kit, path, { theme, video: dir });
                if (speed !== 1) {
                    const cdp = await context.newCDPSession(page);
                    await cdp.send('Animation.enable');
                    await cdp.send('Animation.setPlaybackRate', { playbackRate: speed });
                }
                const pause = ms => page.waitForTimeout(ms);
                await pause(600);
                await summaryOf(group).click();
                await settled(page);
                await pause(900);
                await summaryOf(group).click();
                await settled(page);
                await pause(900);
                await context.close();
                const [webm] = (await readdir(dir)).filter(file => file.endsWith('.webm'));
                const name = `ui30-morph-${kit}-${theme}${speed === 1 ? '' : '-quarter-speed'}`;
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
console.log(`motion: the expand morph flies, times and settles in ${Object.keys(pages).join(', ')}; reduced motion and no API swap instantly${recordings ? `; recordings in ${recordings}` : ''}`);
