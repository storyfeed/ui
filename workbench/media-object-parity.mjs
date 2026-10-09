import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';

export async function checkMediaObject({ frames, renderers, width, theme, output }) {
    const geometry = [];
    for (let i = 0; i < frames.length; i++) {
        const fixture = frames[i].locator('.example:has(>h2:text-is("MediaObject footnotes"))');
        const rows = fixture.locator('.sf-row');
        assert.equal(await rows.count(), 6);
        for (const [index, href] of [[0, '/discussion'], [1, '/current-discussion'], [2, null], [3, null]]) {
            const row = rows.nth(index);
            assert.equal(await row.locator('.sf-media-object').count(), 0, `${renderers[i]}: footnote has no card`);
            const footnote = row.locator('.sf-media-object__footnote');
            assert.equal(await footnote.count(), 1);
            if (href) assert.equal(await footnote.locator('a').getAttribute('href'), href);
            else assert.equal(await footnote.locator('a').count(), 0);
            const measured = await row.evaluate(row => {
                const line = row.querySelector('.sf-media-object__footnote');
                const head = row.querySelector('.sf-head');
                const style = getComputedStyle(line);
                const r = line.getBoundingClientRect();
                const origin = row.getBoundingClientRect();
                return {
                    x: r.x - origin.x, y: r.y - origin.y, width: r.width, height: r.height,
                    headX: head.getBoundingClientRect().x - origin.x,
                    border: style.borderTopWidth, padding: style.padding, background: style.backgroundColor,
                    fontSize: style.fontSize, lineHeight: style.lineHeight,
                    linkColor: line.querySelector('a') ? getComputedStyle(line.querySelector('a')).color : null,
                    linkWeight: line.querySelector('a') ? getComputedStyle(line.querySelector('a')).fontWeight : null,
                };
            });
            assert.equal(measured.x, measured.headX, `${renderers[i]}: footnote aligns with headline`);
            assert.equal(measured.border, '0px');
            assert.equal(measured.padding, '0px');
            assert.equal(measured.background, 'rgba(0, 0, 0, 0)');
            assert.equal(measured.fontSize, '14px');
            geometry[i] ??= [];
            geometry[i].push(measured);
        }
        assert.equal(await rows.nth(4).locator('.sf-media-object .sf-media-object__content').count(), 1);
        assert.equal(await rows.nth(4).locator('.sf-media-object .sf-media-object__footnote').count(), 1);
        assert.equal(await rows.nth(5).locator('.sf-media-object, .sf-media-object__footnote').count(), 0);
        if ([1440, 390].includes(width)) {
            await fixture.screenshot({ path: `${output}/k5-${renderers[i]}-${theme}-${width}.png` });
        }
    }
    for (let i = 1; i < geometry.length; i++) {
        assert.deepEqual(geometry[i], geometry[0], `MediaObject footnotes: 0px ${renderers[0]}/${renderers[i]} parity`);
    }
    await writeFile(`${output}/k5-geometry-${theme}-${width}.json`, JSON.stringify({ maxDelta: 0, geometry }, null, 2));
}
