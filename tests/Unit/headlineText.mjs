import assert from 'node:assert/strict';
import { test } from 'node:test';

export function headlineTextTests(render, inlineCode, h) {
    const actor = { type: 'user', id: '1', label: '`Ada`', url: '/ada' };
    const object = { type: 'project', id: '2', label: '`Project`', url: '/project' };
    const base = { template: null, verb: null, entities: { actor, object } };
    const clean = html => html.replace(/<!--.*?-->/g, '');

    test('headline text defaults stay escaped, including the authored fallback', async () => {
        for (const props of [{ template: ':actor released `<b>` & :object' }, { headline: 'Released `<b>` &' }]) {
            const html = clean(await render({ ...base, ...props }));
            assert.match(html, /released `&lt;b&gt;` &amp;|Released `&lt;b&gt;` &amp;/);
            assert.doesNotMatch(html, /<code|<b>/);
            assert.equal(html, clean(await render({ ...base, ...props }, text => text)));
        }
    });

    test('headline seam sees only authored text, not entities, lists, counts or You', async () => {
        const seen = [];
        const formatter = text => { seen.push(text); return h('em', null, text); };
        for (const role of [':actor', ':actors']) {
            seen.length = 0;
            const html = clean(await render({
                ...base, template: `${role} released :count builds, :others on :object`,
                aggregate: role === ':actors', count: 7,
                sample: { actors: [actor, { ...actor, id: '3', label: '`Kim`' }] },
                distinct: { actors: 4 },
            }, formatter, 'user:1'));
            assert.deepEqual(seen, [' released ', ' builds, ', ' on ']);
            assert.match(html, />You<\/span>/);
            assert.match(html, />`Project`<\/a>/);
            assert.match(html, /<\/em>7<em>/);
            assert.match(html, /2 others/);
            if (role === ':actors') assert.match(html, />`Kim`<\/a> and 2 more/);
        }
        seen.length = 0;
        assert.match(clean(await render({ ...base, headline: 'Fallback `x`' }, formatter)), /<em>Fallback `x`<\/em>/);
        assert.deepEqual(seen, ['Fallback `x`']);
        seen.length = 0;
        await render({ ...base, verb: 'released' }, formatter);
        await render({ ...base, aggregate: true, count: 7 }, formatter);
        assert.deepEqual(seen, []);
    });

    test('inlineCode safely renders balanced spans and preserves unmatched backticks', async () => {
        for (const props of [
            { template: ':actor released `<b>` & `x` then `<i> :object' },
            { headline: 'Released `<b>` & `x` then `<i>' },
        ]) {
            const html = clean(await render({ ...base, ...props }, inlineCode));
            assert.match(html, /<code class="[^"]*font-mono[^"]*text-\[0\.875em\][^"]*">&lt;b&gt;<\/code>/);
            assert.match(html, /<\/code> &amp; <code[^>]*>x<\/code> then `&lt;i&gt;/);
            assert.doesNotMatch(html, /<b>|<i>|<code[^>]*>Project/);
        }
        for (const headline of ['`unmatched', 'empty `` ticks', '``double``']) {
            const html = clean(await render({ ...base, headline }, inlineCode));
            assert.ok(html.includes(headline));
            assert.doesNotMatch(html, /<code/);
        }
        const omitted = clean(await render({ ...base, headline: 'hidden' }, () => null));
        assert.doesNotMatch(omitted, /hidden/);
    });
}
