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

test('avatars prefer declared media initials and colour, with contrasting text', async () => {
    const path = '/resources/js/vue/EntityAvatar.vue';
    const legacy = { initials: 'OLD', avatar_color: '#123456' };
    const faint = await renderRaw(path, {
        entity: { ...entity, media: { icon: null, initials: 'AC', color: '#e6f2f3' }, data: legacy },
    });
    assert.match(faint, /background-color:#e6f2f3/);
    assert.match(faint, /class="[^"]*\btext-black\b/);
    assert.match(faint, />AC</);
    assert.doesNotMatch(faint, /OLD|text-white/);

    const deep = await renderRaw(path, { entity: { ...entity, media: { icon: null, initials: 'AC', color: '#1e3a40' } } });
    assert.match(deep, /class="[^"]*\btext-white\b/);

    const badge = await renderRaw(path, { entity: { ...entity, media: { icon: null, initials: 'AC', color: null } }, size: 'badge' });
    assert.match(badge.replace(/<!--.*?-->/g, ''), />A<\/span>/);

    const fallback = await renderRaw(path, { entity: { ...entity, media: { icon: null, initials: '', color: 'teal' }, data: legacy } });
    assert.match(fallback, /background-color:#123456/);
    assert.match(fallback, />OLD</);
    assert.match(fallback, /class="[^"]*\btext-white\b/);
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

const gfmSource = '| a | b |\n|:--|--:|\n| 1 | 2 |\n\n~~gone~~ ~one~ www.example.com\n\n- [x] done\n- [ ] todo';
const gfmExpected = [
    '<table> <thead> <tr> <th align="left">a</th> <th align="right">b</th> </tr> </thead> <tbody> <tr> <td align="left">1</td> <td align="right">2</td> </tr> </tbody> </table>',
    '<p><del>gone</del> <del>one</del> <a href="http://www.example.com">www.example.com</a></p>',
    '<ul> <li><input type="checkbox" disabled checked /> done</li> <li><input type="checkbox" disabled /> todo</li> </ul>',
];
const serverTasks = '<ul>\n<li><input checked="" disabled="" type="checkbox"> shipped</li>\n<li><input disabled="" type="checkbox"> next</li>\n</ul>\n<p><input type="checkbox"> <input type="text" value="x"> <input type="checkbox" checked></p>';
test('Prose Markdown renders GitHub-flavoured Markdown, identical to Blade', async () => {
    const payload = { content: gfmSource, mediaType: 'text/markdown' };
    const html = (await render('/resources/js/vue/body/Prose.vue', { payload })).replace(/\s+/g, ' ');
    for (const expected of gfmExpected) assert.ok(html.includes(expected), expected);
});
test('server-rendered task lists keep only their disabled checkboxes', async () => {
    const payload = { content: serverTasks, mediaType: 'text/html' };
    const html = (await render('/resources/js/vue/body/Prose.vue', { payload })).replace(/\s+/g, ' ');
    assert.ok(html.includes('<li><input type="checkbox" disabled checked /> shipped</li> <li><input type="checkbox" disabled /> next</li>'));
    assert.equal(html.match(/<input/g).length, 2);
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

test('registered body renderers draw app types and override core types', async () => {
    const { FEED_BODIES } = await server.ssrLoadModule('/resources/js/vue/keys.ts');
    const { feedBodies } = await server.ssrLoadModule('/resources/js/vue/body/index.ts');
    const { default: FeedItem } = await server.ssrLoadModule('/resources/js/vue/FeedItem.vue');
    const renderer = (tag) => ({
        props: ['payload', 'entityLabel', 'entityUrl', 'entityMedia'],
        render() {
            return h(tag, { class: 'sf-app-body' }, `${this.payload.carrier ?? this.payload.content} ${this.entityUrl}`);
        },
    });
    const item = (body) => ({
        kind: 'activity', id: 'shipment', verb: 'ship', published_at: '2026-10-07T12:00:00Z', headline: 'Shipped',
        actor: null, object: { label: 'Order', url: '/orders/1', body: [body] },
    });
    const draw = async (body, install) => {
        const app = createSSRApp({ render: () => h(FeedItem, { item: item(body) }) });
        install?.(app);

        return renderToString(app);
    };
    const shipment = { $body: 'Acme/Shipment', $v: 1, carrier: 'UPS' };

    assert.doesNotMatch(await draw(shipment), /sf-app-body|sf-body-form/);
    assert.match(await draw(shipment, app => app.use(feedBodies({ 'Acme/Shipment': renderer('em') }))), /<em class="sf-app-body">UPS \/orders\/1<\/em>/);
    assert.match(await draw(shipment, app => app.provide(FEED_BODIES, { 'Acme/Shipment': renderer('em') })), /<em class="sf-app-body">UPS/);
    // Each plugin install merges into what is registered.
    const both = app => app.use(feedBodies({ 'Acme/Shipment': renderer('em') })).use(feedBodies({ 'Acme/Invoice': renderer('b') }));
    assert.match(await draw(shipment, both), /<em class="sf-app-body">UPS/);
    assert.match(await draw({ $body: 'Acme/Invoice', carrier: 'DHL' }, both), /<b class="sf-app-body">DHL/);
    // A registered core type replaces the kit's renderer.
    const prose = { $body: 'Storyfeed/Body/Prose', content: 'Words' };
    assert.match(await draw(prose), /sf-prose/);
    const replaced = await draw(prose, app => app.use(feedBodies({ 'Storyfeed/Body/Prose': renderer('i') })));
    assert.match(replaced, /<i class="sf-app-body">Words/);
    assert.doesNotMatch(replaced, /sf-prose/);
    for (const name of ['toString', '__proto__', 'Acme/Unknown'])
        assert.doesNotMatch(await draw({ $body: name }, app => app.use(feedBodies({ 'Acme/Shipment': renderer('em') }))), /sf-body-form/);
});

test('a body with no renderer draws its escaped fallback line; a renderer wins', async () => {
    const { feedBodies } = await server.ssrLoadModule('/resources/js/vue/body/index.ts');
    const { default: FeedItem } = await server.ssrLoadModule('/resources/js/vue/FeedItem.vue');
    const draw = async (body, install) => {
        const app = createSSRApp({ render: () => h(FeedItem, { item: { kind: 'activity', id: 'f', published_at: '2026-10-07T12:00:00Z', headline: 'F', actor: null, object: { label: 'Order', body: [body] }, data: null } }) });
        install?.(app);

        return structural(await renderToString(app)).replace(/<!--[\s\S]*?-->/g, '');
    };
    assert.match(await draw({ $body: 'Acme/Invoice', $fallback: '<b>Invoice</b> due' }), /<div class="sf-body-form"><p class="sf-body-fallback">&lt;b&gt;Invoice&lt;\/b&gt; due<\/p><\/div>/);
    for (const fallback of [undefined, '', '   ', 42, { text: 'x' }])
        assert.doesNotMatch(await draw({ $body: 'Acme/Invoice', $fallback: fallback }), /sf-body-form/);
    const registered = await draw({ $body: 'Acme/Invoice', $fallback: 'Fallback' }, app => app.use(feedBodies({ 'Acme/Invoice': { props: ['payload'], render: () => h('em', 'Drawn') } })));
    assert.match(registered, /<em[^>]*>Drawn<\/em>/);
    assert.doesNotMatch(registered, /Fallback/);
    // A core type keeps its own renderer, even when it draws nothing.
    assert.doesNotMatch(await draw({ $body: 'Storyfeed/Body/Prose', content: '', $fallback: 'Fallback' }), /Fallback/);
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
        // A stack keeps its verb badge; a face badge never stands for several actors.
        assert.equal(railFor(configured, { actors: 3, glyph: true }).badge, configured.secondary === 'activity' ? 'activity' : 'none');
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

test('group strips sample only the featured objects, never the actor, deduplicate and cap at three', async () => {
    assert.match(await render('/resources/js/vue/FeedGroup.vue', { item: { ...group, sample: { objects: [photoEntity('/picture')] } } }), /src="\/picture"/);
    for (const role of ['actors', 'targets', 'contexts', 'origins', 'results', 'instruments', 'locations', 'generators']) {
        const html = await render('/resources/js/vue/FeedGroup.vue', { item: { ...group, sample: { [role]: [photoEntity('/picture')] } } });
        assert.doesNotMatch(html, /src="\/picture"|class="sf-media-strip/, role);
    }
    const html = await render('/resources/js/vue/FeedGroup.vue', { item: { ...group, sample: {
        objects: [photoEntity('/a'), photoEntity('/b'), photoEntity('/a'), photoEntity('/c'), photoEntity('/d')],
    } } });
    assert.deepEqual([...html.matchAll(/<img[^>]+src="([^"]+)"/g)].map(match => match[1]), ['/a', '/b', '/c']);
    assert.match(html, /href="\/art\/\/c"/);
});

test('a group draws its featured objects as an avatar row, only from declared avatars', async () => {
    const declared = (id, media) => ({ ...activity.actor, id, label: `Person ${id}`, url: `/people/${id}`, media });
    const ben = declared('ben', { icon: { src: '/ben.svg' } });
    const cara = declared('cara', { initials: 'CL', color: '#f2c94c' });
    const row = async (sample, distinct = {}, extra = {}) => {
        const html = await render('/resources/js/vue/FeedGroup.vue', { item: { ...group, sample, distinct, ...extra } });
        const section = html.split('class="sf-avatar-row"')[1]?.split('class="sf-toggle"')[0] ?? null;

        return section && { labels: [...section.matchAll(/aria-label="([^"]+)"/g)].map(m => m[1]), hrefs: [...section.matchAll(/href="([^"]+)"/g)].map(m => m[1]) };
    };

    assert.deepEqual(await row({ actors: [activity.actor], objects: [ben, cara, declared('dev', { initials: 'DP', color: '#1e3a8a' })] }, { objects: 5 }),
        { labels: ['Person ben', 'Person cara', 'Person dev', '2 more'], hrefs: ['/people/ben', '/people/cara', '/people/dev'] });
    assert.deepEqual(await row({ objects: [ben, cara] }, { objects: 2 }), { labels: ['Person ben', 'Person cara'], hrefs: ['/people/ben', '/people/cara'] });
    // Never the actors: one object and several commenters draw no row.
    assert.equal(await row({ actors: [ben, cara], objects: [declared('brief', { initials: 'BR', color: '#e11d48' })] }, { actors: 4, objects: 1 }), null);
    // Fewer than two declared avatars, identical pictures, deleted or undeclared entities add nothing.
    assert.equal(await row({ objects: [ben, declared('plain', null), declared('half', { initials: 'HA' })] }), null);
    assert.equal(await row({ objects: [ben, declared('ben2', { icon: { src: '/ben.svg' } })] }), null);
    assert.equal(await row({ objects: [ben, { ...cara, tombstone: { formerType: 'person' } }] }), null);
    // Photographs take the strip instead; an open group keeps its row (ui#26).
    assert.equal(await row({ objects: [{ ...photoEntity('/photo'), media: { ...photoEntity('/photo').media, icon: { src: '/i.svg' } } }, ben, cara] }), null);
    assert.deepEqual((await row({ objects: [ben, cara] }, {}, { headline_template: null }))?.labels, ['Person ben', 'Person cara']);
});
test('expanding a group keeps its rail faces and sampled media in place', async () => {
    const item = { ...group, sample: { actors: [activity.actor, { ...activity.actor, id: '2' }], objects: [photoEntity('/kept')] } };
    const expanded = await render('/resources/js/vue/FeedGroup.vue', { item: { ...item, headline_template: null }, rail: 'actor' });
    assert.match(expanded, /Show less/);
    const head = expanded.split('class="sf-children"')[0];
    assert.match(head, /\/kept/);
    assert.match(head, /sf-media-strip/);
    assert.equal((head.match(/sf-avatar--pair/g) ?? []).length, 2);
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

test('rich prose and ItemList render inside Typography prose at the feed size', async () => {
    for (const [path, payload] of [
        ['/resources/js/vue/body/Prose.vue', { content: '- One', mediaType: 'text/markdown' }],
        ['/resources/js/vue/body/ItemList.vue', { items: ['One'] }],
    ]) {
        const html = await renderRaw(path, { payload });
        assert.match(html, /class="[^"]*\bprose max-w-none text-\[length:inherit\][^"]*"/);
        assert.doesNotMatch(html, /\bprose-(sm|base|lg|xl|2xl)\b/);
    }
});

test('a slim Excerpt v2 without truncated is truncated; v1 without it is whole', async () => {
    const path = '/resources/js/vue/body/Excerpt.vue';
    assert.match(await render(path, { payload: { $v: 2, text: 'Part' } }), /aria-hidden="true">…/);
    assert.doesNotMatch(await render(path, { payload: { $v: 2, text: 'Whole', truncated: false } }), /…/);
    assert.doesNotMatch(await render(path, { payload: { $v: 1, text: 'Hand-written' } }), /…/);
    assert.doesNotMatch(await render(path, { payload: { text: 'Unversioned' } }), /…/);
});

test('Table draws inside prose with a tfoot, escaped cells that keep line breaks, links and an empty mark', async () => {
    const path = '/resources/js/vue/body/Table.vue';
    const payload = { $body: 'Storyfeed/Body/Table', title: 'Order <1042>', headers: ['Item', 'Price'],
        rows: [['Delivery to\n12 Harbour Street', '<b>$0</b>'], [{ label: 'Seats', href: '/seats' }, null], [{ label: 'Owned', href: null }], 'not a row'],
        footer: [['Total', 49.5]] };
    const raw = await renderRaw(path, { payload, entityUrl: '/orders/1' });
    assert.match(raw, /class="sf-table__prose [^"]*\bprose max-w-none text-\[length:inherit\][^"]*\[&amp;_:is\(th,td\)\]:whitespace-pre-line/);
    const html = (await render(path, { payload, entityUrl: '/orders/1' })).replace(/<!--[\s\S]*?-->/g, '');
    for (const expected of [
        '<figcaption class="sf-table__title">Order &lt;1042&gt;</figcaption>',
        '<thead><tr><th>Item</th><th>Price</th></tr></thead>',
        '<tr><td>Delivery to\n12 Harbour Street</td><td>&lt;b&gt;$0&lt;/b&gt;</td></tr>',
        '<tr><td><a href="/seats" class="sf-entity">Seats</a></td><td><span class="sf-table__empty">—</span></td></tr>',
        '<tr><td><a href="/orders/1" class="sf-entity">Owned</a></td>',
        '<tfoot><tr><td>Total</td><td>49.5</td></tr></tfoot>',
    ]) assert.ok(html.includes(expected), expected);
    const slim = (await render(path, { payload: { rows: [['a', 'b'], ['c']] } })).replace(/<!--[\s\S]*?-->/g, '');
    assert.ok(slim.includes('<tbody><tr><td>a</td><td>b</td></tr><tr><td>c</td><td><span class="sf-table__empty">—</span></td></tr></tbody>'));
    assert.doesNotMatch(slim, /<thead|<tfoot|<figcaption/);
    assert.equal((await render(path, { payload: { headers: ['A'] } })).replace(/<!--[\s\S]*?-->/g, ''), '');
});

test('activity rows draw their time range after the time; groups never do', async () => {
    const html = await render('/resources/js/vue/FeedItem.vue', { item: { ...activity, starts_at: '2026-10-01T12:00:00Z', ends_at: '2026-10-09T12:00:00Z' } });
    assert.match(html.replace(/<!--[\s\S]*?-->/g, ''), /<\/time> · <span class="sf-meta__range">1 – 9 Oct 2026<\/span>/);
    assert.doesNotMatch(await render('/resources/js/vue/FeedItem.vue', { item: activity }), /sf-meta__range/);
    assert.doesNotMatch(await render('/resources/js/vue/FeedGroup.vue', { item: { ...group, starts_at: '2026-10-01T12:00:00Z' } }), /sf-meta__range/);
});

test('a call to action draws one button; modal reaches a host link, attributes are filtered, href-less goes to the entity', async () => {
    const { FEED_LINK } = await server.ssrLoadModule('/resources/js/vue/keys.ts');
    const { default: CallToAction } = await server.ssrLoadModule('/resources/js/vue/body/CallToAction.vue');
    const action = (href, extra = {}) => ({ label: 'See <it>', link: { href, modal: false, attributes: {}, ...extra } });
    const draw = async (payload, link) => {
        const app = createSSRApp({ render: () => h(CallToAction, { payload, entityUrl: '/roadmap' }) });
        if (link) app.provide(FEED_LINK, link);
        return structural(await renderToString(app)).replace(/<!--[\s\S]*?-->/g, '');
    };
    assert.equal(await draw({ subject: 'The countdown', content: 'Five milestones.', action: action('/next', { modal: true, attributes: { target: '_blank', onclick: 'x' } }) }),
        '<div class="sf-cta"><p class="sf-cta__subject">The countdown</p><p class="sf-cta__content">Five milestones.</p><a target="_blank" href="/next" class="sf-cta__action">See &lt;it&gt;<span aria-hidden="true">→</span></a></div>');
    assert.equal(await draw({ action: action('/next') }), '<a href="/next" class="sf-cta__action">See &lt;it&gt;<span aria-hidden="true">→</span></a>');
    assert.match(await draw({ content: 'Mine', action: action(null) }), /href="\/roadmap"/);
    assert.equal(await draw({ subject: 'Heading', action: { link: { href: '/x' } } }), '<div class="sf-cta"><p class="sf-cta__subject">Heading</p></div>');
    assert.equal(await draw({ action: { label: 'No link' } }), '');
    const HostLink = { props: ['href', 'modal'], render() { return h('a', { href: this.href, 'data-modal': String(this.modal ?? false) }, this.$slots.default?.()); } };
    assert.match(await draw({ action: action('/next', { modal: true }) }, HostLink), /data-modal="true"/);
    assert.match(await draw({ action: action('/next') }, HostLink), /data-modal="false"/);
});

test('links read core 0.17\'s `link` and core 0.16\'s keys; modal reaches a host link only', async () => {
    const { FEED_LINK } = await server.ssrLoadModule('/resources/js/vue/keys.ts');
    const { entityLink, bodyLink } = await server.ssrLoadModule('/resources/js/shared/link.ts');
    const fresh = { ...entity, url: undefined, modal: undefined, link: { href: '/orders/1', modal: true, attributes: { target: '_blank', onclick: 'x' } } };
    const legacy = { ...entity, url: '/orders/1', modal: true, attributes: { target: '_blank', onclick: 'x' } };
    for (const shape of [fresh, legacy]) {
        const own = entityLink(shape);
        assert.deepEqual(own, { href: '/orders/1', modal: true, attributes: { target: '_blank' } });
        assert.deepEqual(bodyLink({ label: 'Own', href: null, attributes: { rel: 'x' } }, own), { href: '/orders/1', modal: true, attributes: { target: '_blank', rel: 'x' } });
        assert.deepEqual(bodyLink({ label: 'There', href: '/there' }, own), { href: '/there', modal: false, attributes: {} });
    }
    assert.equal(entityLink({ ...entity, url: undefined, link: null }), null);
    assert.equal(entityLink({ ...fresh, tombstone: { formerType: 'order' } }), null);
    const { default: EntityLink } = await server.ssrLoadModule('/resources/js/vue/EntityLink.vue');
    const draw = async (link) => {
        const app = createSSRApp({ render: () => h(EntityLink, { entity: fresh }) });
        if (link) app.provide(FEED_LINK, link);
        return renderToString(app);
    };
    const plain = await draw();
    assert.match(plain, /<a target="_blank" href="\/orders\/1"/);
    assert.doesNotMatch(plain, /modal|onclick/);
    assert.match(await draw({ props: ['href', 'modal'], render() { return h('a', { href: this.href, 'data-modal': String(this.modal) }, this.$slots.default?.()); } }), /data-modal="true"/);
});

test('flowing text is never capped; only code and verbatim blocks scroll at --sf-prose-max-h', async () => {
    const cap = 'max-h-[var(--sf-prose-max-h,--spacing(96))]';
    const draw = (path, payload) => renderRaw(path, { payload });
    assert.ok((await draw('/resources/js/vue/body/Prose.vue', { content: 'code', verbatim: true })).includes(`sf-verbatim m-0 ${cap} overflow-auto`));
    const rich = await draw('/resources/js/vue/body/Prose.vue', { content: '**Rich**', mediaType: 'text/markdown' });
    assert.ok(rich.includes(`[&amp;_pre]:${cap}`));
    assert.ok(!rich.includes(`sf-rich-text ${cap}`));
    assert.ok(!(await draw('/resources/js/vue/body/Prose.vue', { content: 'Plain' })).includes(cap));
    const table = await draw('/resources/js/vue/body/Table.vue', { rows: [['a']] });
    assert.ok(!table.includes(cap) && table.includes('overflow-x-auto'));
});

test('a body\'s maximum height sets its wrapper: a length caps any body, none lifts the block cap too', async () => {
    const { default: FeedItem } = await server.ssrLoadModule('/resources/js/vue/FeedItem.vue');
    const draw = async (body) => {
        const html = await renderToString(createSSRApp({ render: () => h(FeedItem, { item: { kind: 'activity', id: 'm', published_at: '2026-10-07T12:00:00Z', headline: 'M', actor: null, object: { label: 'O', body: [body] } } }) }));
        return html.match(/<div class="sf-body-form[^"]*"[^>]*>/)[0];
    };
    const list = { $body: 'Storyfeed/Body/ItemList', items: ['One'] };
    const prose = { $body: 'Storyfeed/Body/Prose', content: 'Words' };
    assert.doesNotMatch(await draw(list), /style=|max-h-\(--sf-body-max-h\)/);
    const capped = await draw({ ...prose, $meta: { maxHeight: '10rem' } });
    assert.match(capped, /max-h-\(--sf-body-max-h\) overflow-y-auto/);
    assert.match(capped, /style="--sf-prose-max-h:none;--sf-body-max-h:10rem;"/);
    assert.match(capped, /tabindex="0"/);
    const none = await draw({ ...prose, $meta: { maxHeight: 'none' } });
    assert.match(none, /style="--sf-prose-max-h:none;"/);
    assert.doesNotMatch(none, /overflow-y-auto/);
    assert.match(await draw({ ...list, $meta: { maxHeight: '8rem', other: 'x' } }), /--sf-body-max-h:8rem/);
    assert.doesNotMatch(await draw({ ...list, $maxHeight: '6rem' }), /style=/);
    assert.doesNotMatch(await draw({ ...prose, $meta: { other: 'x' } }), /style=/);
    for (const invalid of ['10rem;background:red', 'expression(alert(1))', 'NONE', '', 42])
        assert.doesNotMatch(await draw({ ...prose, $meta: { maxHeight: invalid } }), /style=/);
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

test('a card picture keeps its shape: clamped declared ratio, whole when undeclared, square icon', async () => {
    const path = '/resources/js/vue/body/MediaObject.vue';
    const draw = (slot, image) => renderRaw(path, { payload: { subject: 'Post', image: slot }, entityMedia: { [slot]: { src: '/p', ...image } } });
    const frame = html => html.match(/<div class="(sf-media-object__image[^"]*)"(?: style="([^"]*)")?/).slice(1);
    for (const [image, ratio] of [[{ width: 1200, height: 630 }, '1.9048'], [{ width: 800, height: 800 }, '1'], [{ width: 600, height: 1200 }, '1'], [{ width: 3000, height: 1000 }, '2']]) {
        const [classes, style] = frame(await draw('preview', image));
        assert.match(classes, /\bh-16\b/);
        assert.equal(style, `--sf-picture-ratio:${ratio};`);
    }
    const free = await draw('preview', {});
    assert.match(frame(free)[0], /\bw-24\b/);
    assert.match(free, /\[&amp;_img\]:object-contain!/);
    const icon = frame(await draw('icon', { width: 1200, height: 630 }));
    assert.match(icon[0], /\bw-16\b/);
    assert.ok(!icon[1]);
});

test('actor rails show glyph badges and childRail independently selects glyph-only children', async () => {
    assert.match(await render('/resources/js/vue/FeedItem.vue', { item: activity, rail: 'actor' }), /sf-badge/);
    const item = { ...group, headline_template: null };
    const html = await render('/resources/js/vue/FeedStream.vue', { items: [item], rail: 'actor', childRail: 'activity-only' });
    const children = html.split('class="sf-children"')[1];
    assert.match(children, /sf-icon/);
    assert.doesNotMatch(children, /sf-avatar|sf-badge/);
    const crowd = await render('/resources/js/vue/FeedGroup.vue', { item: { ...group, sample: { actors: [activity.actor, { ...activity.actor, id: '2' }, { ...activity.actor, id: '3' }] } }, rail: 'actor' });
    // At most two faces, the first actor in front at the bottom-right (ui#25).
    const pairFaces = [...crowd.split('class="sf-avatars"')[1].split('class="sf-badge"')[0].matchAll(/class="sf-avatars__face"><span[^>]*aria-label="([^"]+)"[^>]*class="sf-avatar sf-avatar--pair"/g)];
    assert.equal(pairFaces.length, 2);
    // The front face keeps its verb badge, exactly once; a face badge never stands for the crowd.
    assert.equal((crowd.match(/sf-badge/g) ?? []).length, 1);
    assert.doesNotMatch(crowd, /sf-avatar--badge|padding-right/);
    const pair = { ...group, sample: { actors: [activity.actor, { ...activity.actor, id: '2' }] } };
    const front = (await renderRaw('/resources/js/vue/FeedGroup.vue', { item: pair, rail: 'actor' })).split('sf-avatars__face')[1];
    assert.match(front, /right-0 bottom-0 z-10/);
    assert.match(front, /size-\[calc\(var\(--sf-disc\)\*2\/3\)\]/);
    assert.doesNotMatch(await renderRaw('/resources/js/vue/FeedGroup.vue', { item: pair, rail: 'activity' }), /sf-avatar--badge/);
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

test('an Image body naming the icon slot draws as the linked thumbnail through host link and media seams', async () => {
    const { FEED_LINK, FEED_MEDIA } = await server.ssrLoadModule('/resources/js/vue/keys.ts');
    const { default: Component } = await server.ssrLoadModule('/resources/js/vue/FeedStream.vue');
    const object = { ...entity, url: '/dishes/7', media: { icon: { src: '/dal-icon.jpg', width: 64, height: 64 } }, attributes: { target: '_blank', 'data-route': 'dish', href: '/wrong', onClick: 'bad()', 'bad name': 'bad', nested: {} }, body: [{ $body: 'Storyfeed/Body/Image', image: 'icon', alt: 'Dal' }, { $body: 'Storyfeed/Body/KeyValue', items: [{ key: 'Status', value: 'Ready' }] }] };
    const item = { ...activity, object };
    const props = { items: [item], grouped: false };
    const app = createSSRApp({ render: () => h(Component, props) });
    app.provide(FEED_LINK, { render() { return h('a', { ...this.$attrs, 'data-router': 'host' }, this.$slots.default?.()); } });
    const html = await renderToString(app);
    const frame = html.split('sf-object-media')[1];
    assert.match(frame, /href="\/dishes\/7"/);
    assert.match(frame, /target="_blank"/);
    assert.match(frame, /data-route="dish"/);
    assert.match(frame, /data-router="host"/);
    assert.match(frame, /alt="Dal"/);
    assert.match(frame, /size-10!/);
    assert.ok(frame.indexOf('dal-icon.jpg') < frame.indexOf('Status'), 'the other bodies sit beside the thumbnail');
    assert.doesNotMatch(frame, /\/wrong|onClick|bad name|nested|sf-image/);
    let received;
    const host = createSSRApp({ render: () => h(Component, props) });
    host.provide(FEED_MEDIA, { props: ['image', 'href', 'linkAttributes'], setup(props) { received = props; return () => h('button', 'Lightbox'); } });
    assert.match(await renderToString(host), /Lightbox/);
    assert.equal(received.href, '/dishes/7');
    assert.equal(received.image.src, '/dal-icon.jpg');
    assert.deepEqual(received.linkAttributes, { target: '_blank', 'data-route': 'dish' });
    const unlinked = await renderRaw('/resources/js/vue/FeedItem.vue', { item: { ...item, object: { ...object, url: null } } });
    assert.doesNotMatch(unlinked.split('sf-object-media')[1], /<a|target="_blank"/);
});

test('a row shows no picture its bodies did not ask for', async () => {
    const icon = { src: '/dal-icon.jpg', width: 64, height: 64 };
    const object = { ...entity, url: '/dishes/7', media: { icon, preview: { src: '/dal.jpg' } }, body: [{ $body: 'Storyfeed/Body/KeyValue', items: [{ key: 'Status', value: 'Ready' }] }] };
    for (const node of [activity, group]) {
        const html = await renderRaw('/resources/js/vue/FeedStream.vue', { items: [{ ...node, object }], grouped: false });
        assert.doesNotMatch(html, /sf-object-media|<img/);
        if (node === activity) assert.match(html, /Status/);
    }
    const preview = await renderRaw('/resources/js/vue/FeedItem.vue', { item: { ...activity, object: { ...object, body: [{ $body: 'Storyfeed/Body/Image', image: 'preview' }] } } });
    assert.match(preview, /sf-image/);
    assert.doesNotMatch(preview, /sf-object-media/);
    const { FEED_BODIES } = await server.ssrLoadModule('/resources/js/vue/keys.ts');
    const { default: Item } = await server.ssrLoadModule('/resources/js/vue/FeedItem.vue');
    const app = createSSRApp({ render: () => h(Item, { item: { ...activity, object: { ...object, body: [{ $body: 'Storyfeed/Body/Image', image: 'icon' }] } } }) });
    app.provide(FEED_BODIES, { 'Storyfeed/Body/Image': { render: () => h('p', 'App image') } });
    const own = await renderToString(app);
    assert.match(own, /App image/);
    assert.doesNotMatch(own, /sf-object-media/);
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
        assert.match(html, /<p class="sf-media-object__footnote mt-0.5 mb-0 text-sm leading-\[1.6\] text-muted-foreground">/);
        assert.match(html, /See full discussion/);
        assert.doesNotMatch(html, /<div|border-border|bg-muted|p-3/);
        if (href) assert.ok(html.includes(`href="${href}"`));
        else assert.doesNotMatch(html, /<a/);
    }
    assert.equal((await renderRaw(path, { payload: {} })).replace(/<!--.*?-->/g, ''), '');
    const html = await renderRaw(path, { payload: { content: 'Discussion summary', footnote: { label: 'Read more', href: '/discussion' } } });
    assert.match(html, /<div class="sf-media-object mt-1.5 flex min-w-0 max-w-128 flex-wrap items-start gap-3 rounded-lg border border-border bg-muted p-3">/);
    assert.match(html, /sf-media-object__content[^>]*>Discussion summary/);
    assert.match(html, /sf-media-object__footnote[^>]*><a href="\/discussion">Read more<\/a><\/p>/);
});

test('a long headline wraps inside its column instead of running off a narrow feed', async () => {
    const html = await renderRaw('/resources/js/vue/FeedItem.vue', { item: { ...activity, headline_template: null, headline: 'IMG_20260814_120000_HDR_PANORAMA_KITCHEN.jpg' } });
    assert.match(html, /class="sf-headline[^"]*\[overflow-wrap:anywhere\]/);
});

test("an Image body draws its own picture, else the slot it names, custom slots included", async () => {
    const media = { icon: { src: '/icon.svg' }, preview: { src: '/preview.jpg', width: 160, height: 100 }, slots: { sparkline: { src: 'data:image/svg+xml,%3Csvg%2F%3E', width: 120, height: 24 } } };
    const draw = (body, entityMedia = media) => renderRaw('/resources/js/vue/body/Image.vue', { payload: { $body: 'Storyfeed/Body/Image', ...body }, entityMedia });
    // Its own picture, at its declared size, needing no entity; it wins over a slot.
    const own = { $v: 3, src: 'https://cdn.example.com/day-3.jpg', width: 1200, height: 800, alt: 'Cabinets installed', caption: 'Day 3' };
    const html = await draw(own, null);
    for (const part of ['src="https://cdn.example.com/day-3.jpg"', 'width="1200"', 'height="800"', 'alt="Cabinets installed"', 'Day 3']) assert.ok(html.includes(part), part);
    assert.doesNotMatch(await draw({ ...own, image: 'preview' }), /\/preview\.jpg/);
    // A slot: built in, or custom under media.slots.
    assert.match(await draw({ $v: 3, image: 'preview' }), /src="\/preview\.jpg"[^>]*width="160"|width="160"[^>]*src="\/preview\.jpg"/);
    const custom = await draw({ $v: 3, image: 'slots.sparkline' });
    for (const part of ['src="data:image/svg+xml,%3Csvg%2F%3E"', 'width="120"', 'height="24"']) assert.ok(custom.includes(part), part);
    // v1 and v2 rows naming nothing still show the preview; v3 names its slot always.
    assert.match(await draw({}), /\/preview\.jpg/);
    assert.match(await draw({ $v: 2 }), /\/preview\.jpg/);
    for (const body of [{ $v: 3 }, { $v: 3, image: 'slots.missing' }, { $v: 3, image: 'slots.bad name' }, { image: 'url' }]) assert.doesNotMatch(await draw(body), /<img/, JSON.stringify(body));
    // Before v3 a body stored no picture of its own: a stray src is not read.
    assert.doesNotMatch(await draw({ $v: 2, src: '/not-yet.jpg' }), /not-yet/);
});

test("a stored or custom-slot Image stands for its entity in a group's strip", async () => {
    const photo = (id, body, media = null) => ({ type: 'document', id, label: id, url: '/' + id, body: [{ $body: 'Storyfeed/Body/Image', $v: 3, ...body }], media });
    const item = { ...group, children: [], count: 2, sample: { actors: group.sample.actors, objects: [photo('a', { src: '/own.jpg' }), photo('b', { image: 'slots.chart' }, { slots: { chart: { src: '/chart.svg' } } })] } };
    const html = await renderRaw('/resources/js/vue/FeedStream.vue', { items: [item], grouped: false });
    assert.match(html, /src="\/own\.jpg"/);
    assert.match(html, /src="\/chart\.svg"/);
});
