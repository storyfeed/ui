// Mounts the built kits page (workbench/readme/kits) in Chromium and keeps the
// markup the Vue and React kits render, for the showcase's closing frame and
// for Tailwind to scan.
import { chromium } from 'playwright';
import { readFile, writeFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';

const browser = await chromium.launch();
try {
    const page = await browser.newPage();
    await page.route('http://kits.test/**', async route => {
        const path = new URL(route.request().url()).pathname.slice(1) || 'index.html';
        try {
            await route.fulfill({ body: await readFile(resolve('build/readme/kits', path)), contentType: { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' }[extname(path)] ?? 'application/octet-stream' });
        } catch {
            await route.fulfill({ status: 404 });
        }
    });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://kits.test/index.html');
    await page.waitForFunction(() => document.querySelector('#vue .sf-feed') && document.querySelector('#react .sf-feed'));
    if (errors.length) throw new Error(errors.join('\n'));
    const kits = await page.evaluate(() => ({ vue: document.getElementById('vue').innerHTML, react: document.getElementById('react').innerHTML }));
    await writeFile('build/readme/kits.json', JSON.stringify(kits));
    await writeFile('build/readme/kits-classes.txt', await page.evaluate(() => [...document.querySelectorAll('[class]')].map(element => element.getAttribute('class')).join('\n')));
} finally {
    await browser.close();
}
