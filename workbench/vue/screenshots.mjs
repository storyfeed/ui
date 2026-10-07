import { chromium } from 'playwright';
import { createServer } from 'vite';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const output = process.env.VUEKIT_SCREENSHOTS ?? '/private/tmp/claude-501/-Users-jasper-Dev-projects-storyfeed/2b79c0b9-803e-4825-b1bd-040d9078ad01/scratchpad/vuekit';
await mkdir(output, { recursive: true });
execFileSync(resolve('node_modules/.bin/tailwindcss'), ['-i', 'workbench/vue/app.css', '-o', 'build/vue-tokens.css', '--minify'], { stdio: 'inherit' });
const server = await createServer({ configFile: resolve('workbench/vue/vite.config.mjs'), mode: 'parity', server: { port: 0 } });
await server.listen();
const browser = await chromium.launch();
const measurements = [];
const errors = [];
try {
    for (const width of [1512, 500]) {
        // Each pane has the requested width, so mobile is checked at 500, not 250.
        const page = await browser.newPage({ viewport: { width: width * 2, height: 1000 }, deviceScaleFactor: 1 });
        page.on('pageerror', error => errors.push(error.message));
        for (const theme of ['light', 'dark']) {
            await page.goto(`${server.resolvedUrls.local[0]}?theme=${theme}`, { waitUntil: 'networkidle' });
            await page.evaluate(() => document.fonts.ready);
            assert.equal(await page.locator('.pane').count(), 2);
            const filename = `${theme}-${width}-side-by-side.png`;
            await page.screenshot({ path: resolve(output, filename), fullPage: true });
            for (const name of ['reference', 'converted']) {
                await page.locator(`.pane.${name}`).screenshot({ path: resolve(output, `${theme}-${width}-${name}.png`) });
            }
            const geometry = await page.evaluate(() => {
                const measure = name => {
                    const pane = document.querySelector(`.pane.${name}`);
                    return [...pane.querySelectorAll('.sf-row, .sf-head, .sf-meta, .sf-body-form, .sf-media-object, .sf-rail__disc')].map(el => {
                        const r = el.getBoundingClientRect(), p = pane.getBoundingClientRect();
                        return { hook: el.classList[0], x: r.x - p.x, y: r.y - p.y, width: r.width, height: r.height };
                    });
                };
                return { reference: measure('reference'), converted: measure('converted') };
            });
            measurements.push({ width, theme, ...geometry });
            // The final branch example is the only additional section in the new pane.
            const common = geometry.converted.slice(0, geometry.reference.length);
            for (let i = 0; i < common.length; i++) {
                assert.equal(common[i].hook, geometry.reference[i].hook);
                for (const axis of ['x', 'y', 'width', 'height']) {
                    assert.ok(Math.abs(common[i][axis] - geometry.reference[i][axis]) <= 0.05,
                        `${theme} ${width} ${common[i].hook}[${i}].${axis}: ${common[i][axis]} vs ${geometry.reference[i][axis]}`);
                }
            }
            assert.equal(await page.locator('.converted').evaluate(el => el.scrollWidth > el.clientWidth), false, 'No converted-pane overflow');
            const refToggle = page.locator('.reference .sf-toggle').first();
            const newToggle = page.locator('.converted .sf-toggle').first();
            await refToggle.click();
            await newToggle.focus();
            await page.keyboard.press('Enter');
            assert.equal(await newToggle.getAttribute('aria-expanded'), 'true');
            assert.equal(await refToggle.getAttribute('aria-expanded'), 'true');
            await page.screenshot({ path: resolve(output, `${theme}-${width}-expanded.png`), fullPage: true });
            assert.equal(await page.locator('.converted .sf-children .sf-row').count(), await page.locator('.reference .sf-children .sf-row').count());
            console.log(`${theme} ${width}: paired screenshots, keyboard disclosure and overflow checked`);
        }
        await page.close();
    }
    assert.deepEqual(errors, []);
    await writeFile(resolve(output, 'geometry.json'), JSON.stringify(measurements, null, 2));
} finally {
    await browser.close();
    await server.close();
}
