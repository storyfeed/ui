import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { serve, pages } from './host.mjs';

// Runs axe's list-structure rules over every feed in all three kits: a
// multi-day feed, a load-more cursor (shown with ?a11y) and a dateless (Steps) feed. Every
// direct child of role=list must be a listitem, and vice versa.
// Run after `npm run workbench`.
const axe = await readFile(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
const kits = Object.entries(pages);
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
        // Blade's pager is a <nav> after the list, not a list item, and its prerendered page has no ?a11y case.
        for (const [shape, present] of Object.entries(found.shapes)) if (!present && !(kit === 'blade' && shape === 'cursor')) failures.push(`${kit}: no ${shape} feed on the page`);
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
console.log(`a11y: no ${rules.join(' or ')} violations in ${kits.map(([kit]) => kit).join(', ')}`);
