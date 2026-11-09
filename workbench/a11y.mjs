import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { serve, pages } from './host.mjs';

// Runs axe's list-structure rules over every feed in all three kits: a
// multi-day feed, a load-more cursor (shown with ?a11y) and a dateless (Steps) feed. Every
// direct child of role=list must be a listitem, and vice versa.
// Blade is skipped until #110: its role=feed may only own articles, and its
// day dividers sit directly inside it. Remove it from `skipped` once fixed.
// Run after `npm run workbench`.
const axe = await readFile(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
const skipped = { blade: 'https://github.com/storyfeed/ui/issues/110' };
const kits = Object.entries(pages).filter(([kit]) => !skipped[kit]);
const rules = ['aria-required-children', 'aria-required-parent'];
const { server, origin } = await serve();
const browser = await chromium.launch();
const failures = [];
try {
    for (const [kit, path] of kits) {
        const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
        await page.goto(`${origin}/${path}?a11y`);
        await page.addScriptTag({ content: axe });
        const found = await page.evaluate(async rules => {
            const feeds = [...document.querySelectorAll('.sf-feed')];
            const shapes = {
                multiDay: feeds.some(f => f.querySelectorAll('.sf-day').length > 1),
                dateless: feeds.some(f => f.querySelector('.sf-step') && !f.querySelector('.sf-day')),
                cursor: feeds.some(f => f.querySelector('.sf-more, a[rel=next]')),
            };
            const result = await window.axe.run({ include: [['.sf-feed']] }, { runOnly: { type: 'rule', values: rules } });
            return { shapes, violations: result.violations.map(v => `${v.id} (${v.nodes.length}): ${v.nodes[0].target.join(' ')}`) };
        }, rules);
        for (const [shape, present] of Object.entries(found.shapes)) if (!present) failures.push(`${kit}: no ${shape} feed on the page`);
        for (const violation of found.violations) failures.push(`${kit}: ${violation}`);
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
for (const [kit, issue] of Object.entries(skipped)) console.log(`a11y: skipped ${kit} (todo: ${issue})`);
console.log(`a11y: no ${rules.join(' or ')} violations in ${kits.map(([kit]) => kit).join(', ')}`);
