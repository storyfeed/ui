import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import vue from '@vitejs/plugin-vue';
import { createServer } from 'vite';
import { createSSRApp, h } from 'vue';
import { renderToString } from 'vue/server-renderer';

const server = await createServer({
    configFile: false,
    plugins: [vue()],
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true },
    appType: 'custom',
    ssr: { external: ['vue', 'vue/server-renderer', 'lucide-vue-next'] },
});
after(() => server.close());
const structural = html => html.replace(/ class="([^"]*)"/g, (_, classes) => {
    const hooks = classes.split(/\s+/).filter(value => /^sf-[\w-]+$/.test(value));
    return hooks.length ? ` class="${hooks.join(' ')}"` : '';
});
const renderRaw = async (path, props) => {
    const { default: component } = await server.ssrLoadModule(path);

    return renderToString(createSSRApp({ render: () => h(component, props) }));
};
const render = async (path, props) => structural(await renderRaw(path, props));
const entity = {
    type: 'user',
    id: '1',
    label: 'Ada Lovelace',
    url: '/ada',
    modal: false,
    media: { icon: { src: '/ada.svg', alt: 'Ada' } },
};

test('avatars show icons and deleted entities remain muted and unlinked', async () => {
    assert.match(
        await render('/resources/js/vue/EntityAvatar.vue', { entity }),
        /src="\/ada.svg"/,
    );
    const deleted = { ...entity, tombstone: { formerType: 'user' } };
    const avatar = await render('/resources/js/vue/EntityAvatar.vue', {
        entity: deleted,
    });
    assert.doesNotMatch(avatar, /<img/);
    assert.doesNotMatch(avatar, /background-color/);
    assert.doesNotMatch(
        await render('/resources/js/vue/EntityLink.vue', { entity: deleted }),
        /<a/,
    );
    const badge = await render('/resources/js/vue/EntityAvatar.vue', {
        entity: { ...entity, media: null },
        size: 'badge',
    });
    assert.match(badge.replace(/<!--.*?-->/g, ''), />A<\/span>/);
});

test('avatar colours prefer snapshot data, retain the source hash and mute tombstones', async () => {
    const path = '/resources/js/vue/EntityAvatar.vue';
    const provided = { ...entity, media: null, data: { avatar_color: '#FAF6EF' } };
    const html = await renderRaw(path, { entity: provided });
    assert.match(html, /background-color:#FAF6EF/);
    assert.match(html, /class="[^"]*\btext-white\b/);

    const background = html => html.match(/background-color:([^;"\s]+)/)?.[1];
    const first = await renderRaw(path, { entity: { ...entity, media: null } });
    const repeated = await renderRaw(path, { entity: { ...entity, media: null } });
    // Source palette index for user:1; label changes do not change identity colour.
    assert.equal(background(first), '#6366f1');
    assert.equal(background(repeated), background(first));
    assert.equal(background(await renderRaw(path, { entity: { ...entity, media: null, label: 'Ada' } })), background(first));
    assert.equal(background(await renderRaw(path, { entity: { ...entity, media: null, data: { avatar_color: '' } } })), background(first));

    const deleted = await renderRaw(path, {
        entity: { ...provided, media: entity.media, tombstone: { formerType: 'user' } },
    });
    assert.match(deleted, /class="[^"]*\bbg-muted\b/);
    assert.doesNotMatch(deleted, /background-color|#FAF6EF|<img/);
});

test('summary phrases render while truncated member totals stay visible', async () => {
    const sample = { actors: [entity], objects: [], targets: [], contexts: [] };
    const html = await render('/resources/js/vue/FeedGroup.vue', {
        item: {
            kind: 'group',
            id: 'group',
            verb: null,
            axis: 'actor',
            published_at: '2026-10-06T12:00:00Z',
            headline_template: null,
            glyph: null,
            actor: entity,
            object: null,
            target: null,
            context: null,
            sample,
            distinct: { actors: 1 },
            count: 5,
            children: [
                {
                    kind: 'activity',
                    id: 'child',
                    verb: 'visit',
                    published_at: '2026-10-06T12:00:00Z',
                    headline_template: ':actor visited the fair',
                    glyph: null,
                    actor: entity,
                    object: null,
                    target: null,
                    context: null,
                },
            ],
            children_truncated: true,
            phrases: [
                {
                    verb: 'visit',
                    count: 5,
                    headline_template: 'visited the fair',
                    glyph: null,
                    sample,
                    distinct: {},
                },
            ],
        },
    });
    assert.match(html, /visited the fair/);
    assert.match(html, /Show all 5/);
});

test('rich prose strips unsafe HTML and verbatim keeps escaped source', async () => {
    const content =
        '<script>alert(1)</script><a href="javascript:alert(1)">link</a><strong>safe</strong>';
    const html = await render('/resources/js/vue/body/Prose.vue', {
        payload: { content, mediaType: 'text/html' },
    });
    assert.doesNotMatch(html, /<script|javascript:/);
    assert.match(html, /<strong>safe<\/strong>/);
    assert.match(
        await render('/resources/js/vue/body/Prose.vue', {
            payload: { content, verbatim: true },
        }),
        /&lt;script&gt;/,
    );
});

{
    const base = '/resources/js/vue';
    const { formatTimestamp } = await server.ssrLoadModule(
        `${base}/timestamp.ts`,
    );
    const entity = (label) => ({
        type: 'person',
        id: label,
        label,
        url: `/${label}`,
        media: null,
    });
    const item = {
        kind: 'activity',
        id: 'a',
        verb: 'posted',
        published_at: '2026-10-07T12:00:00Z',
        headline_template: ':actor posted',
        actor: entity('Ada'),
        object: null,
        target: null,
        context: null,
        instrument: entity('Claude'),
    };
    async function render(node, slot) {
        const { default: Component } = await server.ssrLoadModule(
            `${base}/${node.kind === 'group' ? 'FeedGroup' : 'FeedItem'}.vue`,
        );

        return structural(
            await renderToString(
                createSSRApp({
                    render: () =>
                        h(
                            Component,
                            { item: node },
                            slot ? { time: () => slot } : undefined,
                        ),
                }),
            )
        ).replace(/<!--[\s\S]*?-->/g, '');
    }

    for (const kind of ['activity', 'group']) {
        const node =
            kind === 'activity'
                ? item
                : {
                      ...item,
                      kind,
                      count: 2,
                      children: [],
                      sample: { actors: [item.actor] },
                      distinct: { actors: 1 },
                      axis: 'actor',
                  };
        test(`${kind} puts time after the headline and links leftover instrument`, async () => {
            const html = await render(node);
            assert.match(
                html,
                /class="sf-head">[\s\S]*?<\/div>\s*<div class="sf-meta"><time datetime=/,
            );
            assert.doesNotMatch(
                html.match(/class="sf-head">([\s\S]*?)<\/div>/)[1],
                /<time/,
            );
            assert.match(
                html,
                / · <span class="sf-meta__role">via <a[^>]*href="\/Claude"[^>]*>Claude<\/a>/,
            );
            assert.match(html, /<time[^>]*title="[^"]+"/);
            assert.match(await render(node, 'October 2026'), /October 2026/);
        });
        test(`${kind} consumes singular instrument and context tokens`, async () => {
            const html = await render({
                ...node,
                headline_template: ':actor posted via :instrument in :context',
                context: entity('Sprint'),
            });
            assert.match(html, /Claude/);
            assert.doesNotMatch(
                html.split('class="sf-meta"')[1],
                /Claude|Sprint/,
            );
        });
    }

    test('plural group roles join and preserve sample remainder without repetition', async () => {
        const node = {
            ...item,
            kind: 'group',
            instrument: null,
            count: 4,
            children: [],
            sample: {
                actors: [item.actor],
                instruments: [entity('Claude'), entity('Codex')],
            },
            distinct: { actors: 1, instruments: 4 },
        };
        assert.match(
            await render(node),
            /Claude<\/a>, <a[^>]*>Codex<\/a> and 2 more/,
        );
        const html = await render({
            ...node,
            headline_template: ':instruments posted',
        });
        assert.match(html, /Claude/);
        assert.doesNotMatch(html.split('class="sf-meta"')[1], /Claude|Codex/);
    });
    test('digest consumes only displayed phrase tokens; redundant activity uses its missing grammar', async () => {
        const node = {
            ...item,
            kind: 'group',
            headline_template: null,
            count: 2,
            children: [],
            sample: { actors: [item.actor] },
            distinct: { actors: 1 },
            phrases: [
                {
                    verb: 'post',
                    count: 2,
                    headline_template: 'posted via :instrument',
                    sample: { instruments: [item.instrument] },
                    distinct: { instruments: 1 },
                },
            ],
        };
        assert.doesNotMatch(
            (await render(node)).split('class="sf-meta"')[1],
            /Claude/,
        );
        assert.match(
            await render({
                ...item,
                headline_template: ':instrument posted',
                redundant: true,
                missing_headline_template: ':actor posted',
            }),
            /sf-meta__role">via /,
        );
    });
    test('fixed role order, context never on the meta line, absent roles, and token boundaries', async () => {
        const html = await render({
            ...item,
            headline_template: ':actor posted :instrumental',
            origin: entity('Backlog'),
            result: entity('Report'),
            context: entity('Sprint'),
            location: entity('Toronto'),
            generator: entity('Bot'),
        });
        const meta = html.split('class="sf-meta"')[1];

        for (const [before, next] of [
            ['Claude', 'Backlog'],
            ['Backlog', 'Report'],
            ['Report', 'Toronto'],
            ['Toronto', 'Bot'],
        ]) {
            assert.ok(meta.indexOf(before) < meta.indexOf(next));
        }

        assert.doesNotMatch(meta, /Sprint/);
        assert.doesNotMatch(
            (await render({ ...item, instrument: null })).split(
                'class="sf-meta"',
            )[1],
            /via /,
        );
    });
    test('calendar ladder covers today, yesterday across midnight, this year, older and year boundary', () => {
        const now = new Date(2026, 9, 7, 15, 42).getTime();
        const format = (year, month, day, hour = 15) =>
            formatTimestamp(
                new Date(year, month, day, hour, 42).toISOString(),
                now,
                'en-US',
            );
        assert.equal(format(2026, 9, 7, 13), '2 hours ago');
        assert.equal(format(2026, 9, 7), 'just now');
        assert.equal(format(2026, 9, 6), 'Yesterday, 3:42 PM');
        assert.equal(format(2026, 9, 5), 'Mon 5 Oct, 3:42 PM');
        assert.equal(format(2025, 9, 6), '6 Oct 2025, 3:42 PM');
        assert.equal(
            formatTimestamp(
                new Date(2025, 11, 31, 23, 59).toISOString(),
                new Date(2026, 0, 1, 0, 1).getTime(),
                'en-US',
            ),
            'Yesterday, 11:59 PM',
        );
    });
}

test('Component registry forwards props and ignores unknown names', async () => {
    const { FEED_COMPONENTS } = await server.ssrLoadModule(
        '/resources/js/vue/keys.ts',
    );
    const { default: ComponentBody } = await server.ssrLoadModule(
        '/resources/js/vue/body/ComponentBody.vue',
    );
    const mapped = {
        props: ['message'],
        render() {
            return h('strong', this.message);
        },
    };
    const renderBody = async (name, register = true) => {
        const app = createSSRApp({
            render: () =>
                h(ComponentBody, {
                    payload: { name, props: { message: 'Mapped props' } },
                }),
        });

        if (register) {
            app.provide(FEED_COMPONENTS, { 'App/Message': mapped });
        }

        return structural(await renderToString(app)).replace(/<!--[\s\S]*?-->/g, '');
    };
    assert.equal(
        await renderBody('App/Message'),
        '<strong>Mapped props</strong>',
    );
    assert.equal(await renderBody('Unknown'), '');
    assert.equal(await renderBody('toString'), '');
    assert.equal(await renderBody('App/Message', false), '');
});

test('dividers draw a labelled node on the rail before the named item', async () => {
    const node = (id) => ({
        kind: 'activity',
        id,
        verb: 'posted',
        published_at: '2026-10-07T12:00:00Z',
        headline_template: ':actor posted',
        actor: {
            type: 'person',
            id: 'Ada',
            label: 'Ada',
            url: '/Ada',
            media: null,
        },
        object: null,
        target: null,
        context: null,
    });
    const html = await render('/resources/js/vue/FeedStream.vue', {
        items: [node('intro'), node('first')],
        grouped: false,
        dividers: { first: 'Timeline' },
    });
    const at = html.indexOf('sf-divider');
    assert.ok(at > 0, 'divider rendered');
    assert.match(html.slice(at), /sf-rail__node[\s\S]*?>Timeline</);
    assert.ok(at > html.indexOf('data-node-id') || html.indexOf('Ada') < at);
    assert.equal(html.match(/sf-divider /g).length, 1);
});

test('branch dividers use the rail curve for days and per-item labels', async () => {
    const item = { kind: 'activity', id: 'first', verb: 'posted', published_at: '2026-10-07T12:00:00Z', headline_template: ':actor posted', actor: entity, object: null, target: null, context: null };
    const html = await render('/resources/js/vue/FeedStream.vue', {
        items: [item], dividers: { first: 'History' }, dividerStyle: 'branch',
    });
    assert.equal(html.match(/class="sf-rail__branch"/g).length, 2);
    assert.match(html, /d="M0.75 22 V14 Q0.75 6 8.75 6 H15"/);
    assert.doesNotMatch(html, /sf-rail__node/);
    assert.ok(html.indexOf('History') < html.indexOf('Ada Lovelace'));
});

test('empty state, loading pager and future node kinds remain safe', async () => {
    const empty = await render('/resources/js/vue/FeedStream.vue', { items: [] });
    assert.match(empty, /No activity yet/);
    assert.doesNotMatch(empty, /role="list"/);
    const html = await render('/resources/js/vue/FeedStream.vue', {
        items: [{ kind: 'future', id: 'next', published_at: '2026-10-07T12:00:00Z' }],
        nextCursor: 'cursor', loadingMore: true,
    });
    assert.match(html, /disabled[^>]*>Loading…/);
    assert.doesNotMatch(html, /Someone/);
});

test('all rail configurations retain honest fallback and badge suppression', async () => {
    const { rail, railFor, withoutSecondary } = await server.ssrLoadModule('/resources/js/vue/rail.ts');
    for (const name of ['actor', 'activity', 'actor-only', 'activity-only']) {
        const configured = rail(name);
        assert.deepEqual(railFor(configured, { actors: 0, glyph: false }), { disc: 'none', badge: 'none' });
        assert.equal(railFor(withoutSecondary(configured), { actors: 1, glyph: true }).badge, 'none');
        assert.equal(railFor(configured, { actors: 3, glyph: true }).badge, 'none');
    }
    assert.deepEqual(railFor(rail('actor'), { actors: 0, glyph: true }), { disc: 'activity', badge: 'none' });
    assert.deepEqual(railFor(rail('activity'), { actors: 1, glyph: false }), { disc: 'actor', badge: 'none' });
    const item = { kind: 'activity', id: 'first', verb: 'posted', published_at: '2026-10-07T12:00:00Z', headline_template: ':actor posted', actor: entity, glyph: 'file-up', glyph_intent: 'app-defined', object: null, target: null, context: null };
    const disc = await render('/resources/js/vue/FeedItem.vue', { item, rail: 'activity' });
    assert.match(disc, /data-sf-intent="app-defined"/);
    assert.match(disc, /sf-avatar--badge/);
    const dense = await render('/resources/js/vue/FeedItem.vue', { item, rail: 'activity', dense: true });
    assert.doesNotMatch(dense, /sf-avatar--badge|sf-badge/);
});

test('generic bodies resolve current and historical forms and reject unknown names', async () => {
    const { resolve, formsIn, imageOf } = await server.ssrLoadModule('/resources/js/vue/body/index.ts');
    const form = { $body: 'Storyfeed/Body/File', name: 'old.pdf' };
    assert.equal(resolve([form]).length, 1);
    assert.equal(formsIn({ appKey: { nested: form } }).length, 1);
    assert.equal(resolve([{ $body: 'App/Unknown' }, { $body: 'toString' }]).length, 0);
    assert.equal(formsIn({ $body: 'toString' }).length, 0);
    assert.equal(formsIn({ a: { b: { c: { d: { e: form } } } } }).length, 0);
    const photo = { src: '/photo.svg' };
    assert.equal(imageOf({ media: { preview: photo } }), null);
    assert.deepEqual(imageOf({ media: { preview: photo }, body: [{ $body: 'Storyfeed/Body/Image', alt: 'Photo' }] }), { ...photo, alt: 'Photo' });
});
