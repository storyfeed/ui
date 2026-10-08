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
    server: { middlewareMode: true, hmr: false },
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
    test('redundant activity uses its missing grammar', async () => {
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

const activity = {
    kind: 'activity', id: 'u5-child', verb: 'post',
    published_at: '2026-10-07T12:00:00Z', headline_template: ':actor posted',
    actor: { ...entity, media: null }, glyph: 'file-up', object: null, target: null, context: null,
};
const group = {
    ...activity, kind: 'group', id: 'u5-group', axis: 'repeat', count: 36,
    children: [activity], sample: { actors: [activity.actor] }, distinct: { actors: 1 },
    children_truncated: true,
};
const textOf = html => html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

test('group singular slots use pins even when distinct=1 or samples disagree', async () => {
    for (const role of ['actor', 'object', 'target', 'context', 'instrument', 'origin', 'result', 'location', 'generator']) {
        const item = {
            ...group, actor: null, headline_template: `:${role}`,
            sample: { [`${role}s`]: [{ ...activity.actor, label: 'Exemplar' }] },
            distinct: { [`${role}s`]: 1 },
        };
        const absent = await render('/resources/js/vue/FeedGroup.vue', { item });
        assert.doesNotMatch(absent.split('class="sf-head"')[1].split('class="sf-meta"')[0], /Exemplar/);
        const pinned = await render('/resources/js/vue/FeedGroup.vue', { item: { ...item, [role]: { ...activity.actor, label: 'Pinned' } } });
        assert.match(textOf(pinned), /Pinned/);
    }
});

const photoEntity = src => ({
    ...activity.actor, id: src, label: 'Artwork', url: `/art/${src}`,
    body: [{ $body: 'Storyfeed/Body/Image', image: 'preview' }],
    media: { preview: { src, width: 200, height: 100 } },
});

test('group strips sample all roles, objects first, deduplicate by source and cap at three', async () => {
    for (const role of ['objects', 'actors', 'targets', 'contexts', 'origins', 'results', 'instruments', 'locations', 'generators']) {
        const html = await render('/resources/js/vue/FeedGroup.vue', { item: { ...group, sample: { [role]: [photoEntity('/picture')] } } });
        assert.match(html, /src="\/picture"/);
    }
    const html = await render('/resources/js/vue/FeedGroup.vue', { item: { ...group, sample: {
        objects: [photoEntity('/a'), photoEntity('/b')],
        targets: [photoEntity('/a'), photoEntity('/c'), photoEntity('/d')],
    } } });
    assert.deepEqual([...html.matchAll(/<img[^>]+src="([^"]+)"/g)].map(match => match[1]), ['/a', '/b', '/c']);
    assert.match(html, /href="\/art\/\/c"/);
});

test('expanded groups suppress sampled media', async () => {
    const item = { ...group, sample: { actors: [activity.actor], objects: [photoEntity('/suppressed')] } };
    const expanded = await render('/resources/js/vue/FeedGroup.vue', { item: { ...item, headline_template: null } });
    assert.match(expanded, /Show less/);
    assert.doesNotMatch(expanded, /\/suppressed|sf-media-strip/);
});

test('files retain names, decimal sizes and MIME labels without extension guesses', async () => {
    const path = '/resources/js/vue/body/FileAttachment.vue';
    for (const [size, expected] of [[21_000_000, '21 MB'], [76_000, '76 KB'], [2_516_582, '2.5 MB'], [0, '0 bytes']]) {
        const html = await render(path, { payload: { name: 'report.csv', size, mediaType: 'text/csv' }, entityLabel: 'report.csv' });
        assert.match(textOf(html), new RegExp(`report.csv Spreadsheet \\(CSV\\) · ${expected}`));
    }
    assert.equal(textOf(await render(path, { payload: { name: 'design.fig' } })), 'design.fig');
    assert.match(textOf(await render(path, { payload: { mediaType: 'application/x-host' } })), /application\/x-host/);
});

test('host file labeller overrides MIME labels, null falls back, and its text is escaped', async () => {
    const { FEED_FILE_LABELLER } = await server.ssrLoadModule('/resources/js/vue/keys.ts');
    const { default: Component } = await server.ssrLoadModule('/resources/js/vue/FeedItem.vue');
    let received;
    const renderLabel = async label => {
        const app = createSSRApp({ render: () => h(Component, { item: { ...activity, object: {
            ...activity.actor, body: [{ $body: 'Storyfeed/Body/FileAttachment', name: 'design.fig', mediaType: 'application/pdf' }],
        } } }) });
        app.provide(FEED_FILE_LABELLER, file => { received = file; return label; });
        return renderToString(app);
    };
    assert.match(await renderLabel('<Figma file>'), /design.fig &lt;Figma file&gt;/);
    assert.deepEqual(received, { name: 'design.fig', mediaType: 'application/pdf' });
    assert.match(await renderLabel(null), /design.fig PDF/);
});

test('ItemList states the conjunction before overflow', async () => {
    const html = await render('/resources/js/vue/body/ItemList.vue', { payload: { items: ['First'], totalItems: 3 } });
    assert.match(textOf(html), /Firstand 2 more/);
});

test('MediaObject below placement draws the full picture after prose; beside stays compact', async () => {
    const path = '/resources/js/vue/body/MediaObject.vue';
    const props = { payload: { subject: 'Post', content: 'Words', image: 'preview' }, entityMedia: photoEntity('/photo').media };
    const below = await renderRaw(path, { ...props, imagePlacement: 'below' });
    assert.ok(below.indexOf('Words') < below.indexOf('src="/photo"'));
    assert.doesNotMatch(below, /size-16|sf-media-object__image/);
    const beside = await renderRaw(path, props);
    assert.match(beside, /sf-media-object__image|size-16/);
    assert.ok(beside.indexOf('src="/photo"') < beside.indexOf('Words'));
});

test('actor rails show glyph badges and childRail independently selects glyph-only children', async () => {
    assert.match(await render('/resources/js/vue/FeedItem.vue', { item: activity, rail: 'actor' }), /sf-badge/);
    const item = { ...group, headline_template: null };
    const html = await render('/resources/js/vue/FeedStream.vue', { items: [item], rail: 'actor', childRail: 'activity-only' });
    const children = html.split('class="sf-children"')[1];
    assert.match(children, /sf-icon/);
    assert.doesNotMatch(children, /sf-avatar|sf-badge/);
    const crowd = await render('/resources/js/vue/FeedGroup.vue', { item: { ...group, sample: { actors: [activity.actor, { ...activity.actor, id: '2' }, { ...activity.actor, id: '3' }] } }, rail: 'actor' });
    assert.equal((crowd.split('sf-avatars')[1].split('</div>')[0].match(/sf-avatar--md/g) ?? []).length, 3);
    assert.doesNotMatch(crowd, /sf-badge|padding-right/);
});

test('hosts can choose below placement for automatic MediaObject bodies', async () => {
    const { FEED_MEDIA_OBJECT_PLACEMENT } = await server.ssrLoadModule('/resources/js/vue/keys.ts');
    const { default: Component } = await server.ssrLoadModule('/resources/js/vue/FeedItem.vue');
    const app = createSSRApp({ render: () => h(Component, { item: { ...activity, object: {
        ...photoEntity('/automatic'), body: [{ $body: 'Storyfeed/Body/MediaObject', content: 'Full photograph', image: 'preview' }],
    } } }) });
    app.provide(FEED_MEDIA_OBJECT_PLACEMENT, 'below');
    const html = await renderToString(app);
    assert.ok(html.indexOf('Full photograph') < html.indexOf('src="/automatic"'));
    assert.doesNotMatch(html, /size-16/);
});

test('object icons retain entity links and filtered attributes through host link and media seams', async () => {
    const { FEED_LINK, FEED_MEDIA } = await server.ssrLoadModule('/resources/js/vue/keys.ts');
    for (const node of [activity, group]) {
        const item = { ...node, object: { ...entity, url: '/dishes/7', attributes: { target: '_blank', 'data-route': 'dish', href: '/wrong', onClick: 'bad()', 'bad name': 'bad', nested: {} } } };
        const { default: Component } = await server.ssrLoadModule('/resources/js/vue/FeedStream.vue');
        const props = { items: [item], grouped: false, objectIcon: node => node.object ? ({ src: '/dal-icon.jpg', width: 64, height: 64 }) : null };
        const app = createSSRApp({ render: () => h(Component, props) });
        app.provide(FEED_LINK, { render() { return h('a', { ...this.$attrs, 'data-router': 'host' }, this.$slots.default?.()); } });
        const html = await renderToString(app);
        const frame = html.split('sf-object-media')[1].split('sf-annotations')[0];
        assert.match(frame, /href="\/dishes\/7"/);
        assert.match(frame, /target="_blank"/);
        assert.match(frame, /data-route="dish"/);
        assert.match(frame, /data-router="host"/);
        assert.doesNotMatch(frame, /\/wrong|onClick|bad name|nested/);
        let received;
        const host = createSSRApp({ render: () => h(Component, props) });
        host.provide(FEED_MEDIA, { props: ['image', 'href', 'linkAttributes'], setup(props) { received = props; return () => h('button', 'Lightbox'); } });
        assert.match(await renderToString(host), /Lightbox/);
        assert.equal(received.href, '/dishes/7');
        assert.deepEqual(received.linkAttributes, { target: '_blank', 'data-route': 'dish' });
        const unlinked = await renderRaw('/resources/js/vue/FeedItem.vue', { item: { ...activity, object: { ...item.object, url: null } }, objectIcon: props.objectIcon });
        assert.doesNotMatch(unlinked.split('sf-object-media')[1], /<a|target="_blank"/);
    }
});

test('feed retains collapsed members for print and static groups never show a toggle', async () => {
    for (const interactive of [false, true]) {
        const html = await renderRaw('/resources/js/vue/FeedStream.vue', { items: [group], grouped: false, interactive, collapsed: true });
        assert.match(html, /class="(?=[^"]*sf-children)(?=[^"]*hidden print:block)/);
        assert.match(html.split('sf-children')[1], /Ada Lovelace/);
        if (interactive) assert.match(html, /aria-expanded="false"/);
        else assert.doesNotMatch(html, /sf-toggle|<details|<summary/);
    }
    const open = await renderRaw('/resources/js/vue/FeedStream.vue', { items: [group], interactive: false });
    assert.doesNotMatch(open, /hidden print:block|sf-toggle/);
});

test('groups render without retired fields and ignore unknown extra keys', async () => {
    for (const headline of [{ headline_template: ':count updates' }, { headline_template: null, headline: 'Updates' }, { headline_template: null }]) {
        const item = { ...group, ...headline };
        for (const key of ['phrases', 'phrases_truncated', 'period']) assert.equal(Object.hasOwn(item, key), false);
        const html = await render('/resources/js/vue/FeedGroup.vue', { item });
        assert.match(textOf(html), /35 more not shown/);
        assert.equal(await render('/resources/js/vue/FeedGroup.vue', { item: {
            ...item, phrases: [{ headline_template: 'Retired sentence', count: 36 }],
            phrases_truncated: true, period: 'day', future_field: { unknown: true },
        } }), html);
    }
});


test('MediaObject footnotes stand alone, resolve links and keep strings unlinked', async () => {
    const path = '/resources/js/vue/body/MediaObject.vue';
    for (const [footnote, entityUrl, href] of [
        [{ label: 'See full discussion', href: '/discussion' }, '/current', '/discussion'],
        [{ label: 'See full discussion', href: null }, '/current', '/current'],
        [{ label: 'See full discussion', href: null }, null, null],
        ['See full discussion', '/current', null],
    ]) {
        const html = await renderRaw(path, { payload: { footnote }, entityUrl });
        assert.match(html, /<p class="sf-media-object__footnote mt-0.5 mb-0 text-xs leading-\[1.6\] text-muted-foreground">/);
        assert.match(html, /See full discussion/);
        assert.doesNotMatch(html, /<div|border-border|bg-muted|p-3/);
        if (href) assert.ok(html.includes(`href="${href}"`));
        else assert.doesNotMatch(html, /<a/);
    }
    assert.equal((await renderRaw(path, { payload: {} })).replace(/<!--.*?-->/g, ''), '');
    const html = await renderRaw(path, { payload: { content: 'Discussion summary', footnote: { label: 'Read more', href: '/discussion' } } });
    assert.match(html, /<div class="sf-media-object mt-1.5 flex min-w-0 max-w-lg items-start gap-3 rounded-lg border border-border bg-muted p-3">/);
    assert.match(html, /sf-media-object__content[^>]*>Discussion summary/);
    assert.match(html, /sf-media-object__footnote[^>]*><a href="\/discussion">Read more<\/a><\/p>/);
});
