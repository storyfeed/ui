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
    assert.match(html, /--sf-avatar-color:#FAF6EF/);
    assert.match(html, /class="[^"]*\btext-white\b/);

    const background = html => html.match(/--sf-avatar-color:([^;"\s]+)/)?.[1];
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
    assert.match(faint, /--sf-avatar-color:#e6f2f3/);
    assert.match(faint, /class="[^"]*\btext-black\b/);
    assert.match(faint, />AC</);
    assert.doesNotMatch(faint, /OLD|text-white/);

    const deep = await renderRaw(path, { entity: { ...entity, media: { icon: null, initials: 'AC', color: '#1e3a40' } } });
    assert.match(deep, /class="[^"]*\btext-white\b/);

    const badge = await renderRaw(path, { entity: { ...entity, media: { icon: null, initials: 'AC', color: null } }, size: 'badge' });
    assert.match(badge.replace(/<!--.*?-->/g, ''), />A<\/span>/);

    const fallback = await renderRaw(path, { entity: { ...entity, media: { icon: null, initials: '', color: 'teal' }, data: legacy } });
    assert.match(fallback, /--sf-avatar-color:#123456/);
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
    assert.match(html.slice(at), /sf-rail__branch[\s\S]*?>Timeline</);
    assert.ok(at > html.indexOf('data-node-id') || html.indexOf('Ada') < at);
    assert.equal(html.match(/sf-divider /g).length, 1);
});

test('dividers branch off the rail by default, for days and per-item labels; dot on request', async () => {
    const item = { kind: 'activity', id: 'first', verb: 'posted', published_at: '2026-10-07T12:00:00Z', headline_template: ':actor posted', actor: entity, object: null, target: null, context: null };
    const html = await render('/resources/js/vue/FeedStream.vue', {
        items: [item], dividers: { first: 'History' },
    });
    assert.equal(html.match(/class="sf-rail__branch"/g).length, 2);
    assert.doesNotMatch(html, /sf-rail__node/);
    assert.ok(html.indexOf('History') < html.indexOf('Ada Lovelace'));
    const dot = await render('/resources/js/vue/FeedStream.vue', {
        items: [item], dividers: { first: 'History' }, dividerStyle: 'dot',
    });
    assert.equal(dot.match(/sf-rail__node/g).length, 2);
    assert.doesNotMatch(dot, /sf-rail__branch/);
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

const stripMember = (n, object) => ({ ...activity, id: `member-${n}`, object });
const stripPhoto = (n) => ({ type: 'photo', id: String(n), label: `IMG_${n}.jpg`, url: `/photos/${n}`, body: [{ $body: 'Storyfeed/Body/Image', image: 'preview' }], media: { preview: { src: `/p${n}.jpg`, width: 192, height: 144 } } });
const stripAna = { type: 'person', id: 'ana', label: 'Ana Silva', url: '/people/ana', media: { icon: { src: '/ana.jpg' } } };
const stripBen = { type: 'person', id: 'ben', label: 'Ben Okafor', url: '/people/ben', media: { icon: null, initials: 'BO', color: '#438d98' } };
const stripGone = { type: 'person', id: 'cara', label: null, url: null, media: { icon: null, initials: '?', color: '#6b7280' }, tombstone: { formerType: 'person' } };
const stripDee = { type: 'person', id: 'dee', label: 'Dee Ford', url: '/people/dee', media: null };
/** A group's strip in order (a src, `name:<label>`, `tile:<initials>` or `+N`) and its links, or null when there is none. */
const stripTiles = (html) => {
    const section = html.replace(/<!--.*?-->/g, '').split('sf-media-strip ')[1]?.split(/sf-toggle|sf-children/)[0];
    if (section === undefined) return null;
    const tiles = [...section.matchAll(/<img[^>]+src="([^"]+)"|class="[^"]*sf-avatar--tile[^"]*"[^>]*>([^<]*)<|class="[^"]*sf-media-strip__name[^"]*"[^>]*><span[^>]*>([^<]*)<|sf-media-strip__more[^>]*>\+(\d+)</g)]
        .map((m) => m[1] ?? (m[2] !== undefined ? `tile:${m[2].trim()}` : m[3] !== undefined ? `name:${m[3].trim()}` : `+${m[4]}`));
    return { tiles, hrefs: [...section.matchAll(/href="([^"]+)"/g)].map((m) => m[1]) };
};
test('a group strip previews what its members\' rows show: a picture they draw, else a name tile (ui#47)', async () => {
    const draw = async (objects, count = objects.length) => stripTiles(await renderRaw('/resources/js/vue/FeedGroup.vue', { item: { ...group, count, children: objects.map((object, n) => stripMember(n, object)), children_truncated: false, sample: { actors: group.sample.actors } } }));
    // A picture only from an Image body the row draws; a declared icon alone is a name tile. Past four tiles, three and "+N" from the count.
    assert.deepEqual(await draw([stripPhoto(1), stripAna, stripBen, stripPhoto(2), stripPhoto(3), stripPhoto(4)]),
        { tiles: ['/p1.jpg', 'name:Ana Silva', 'name:Ben Okafor', '+3'], hrefs: ['/photos/1', '/people/ana', '/people/ben'] });
    assert.deepEqual((await draw([stripPhoto(1), stripAna, stripBen, stripPhoto(2)])).tiles, ['/p1.jpg', 'name:Ana Silva', 'name:Ben Okafor', '/p2.jpg']);
    // Members the server didn't ship still count.
    assert.deepEqual((await draw([stripPhoto(1), stripBen], 9)).tiles, ['/p1.jpg', 'name:Ben Okafor', '+7']);
    // Jasper: Erica's orders read "Order #2033 / #2032 / #2031", never three "O2" initials.
    const order = (n) => ({ type: 'order', id: String(n), label: `Order #${n}`, url: `/orders/${n}`, media: { icon: null, initials: 'O2', color: '#438d98' } });
    const orders = await draw([order(2033), order(2032), order(2031)]);
    assert.deepEqual(orders, { tiles: ['name:Order #2033', 'name:Order #2032', 'name:Order #2031'], hrefs: ['/orders/2033', '/orders/2032', '/orders/2031'] });
    assert.doesNotMatch((await renderRaw('/resources/js/vue/FeedGroup.vue', { item: { ...group, count: 3, children: [order(2033), order(2032), order(2031)].map((object, n) => stripMember(n, object)), sample: { actors: group.sample.actors } } })).split('sf-children')[0], /sf-avatar--tile/);
    // An Image body naming the icon slot is drawn by the row, so its icon is a picture tile.
    const iconed = (id) => ({ type: 'product', id, label: id, url: `/products/${id}`, body: [{ $body: 'Storyfeed/Body/Image', image: 'icon' }], media: { icon: { src: `/${id}.svg` } } });
    assert.deepEqual((await draw([iconed('mug'), iconed('tote')])).tiles, ['/mug.svg', '/tote.svg']);
    // A deleted entity keeps its label, unlinked; one with no label has nothing to preview, so "+N" counts it.
    const removed = { ...stripGone, label: 'Cara Diaz' };
    assert.deepEqual(await draw([stripBen, removed, stripDee]), { tiles: ['name:Ben Okafor', 'name:Cara Diaz', 'name:Dee Ford'], hrefs: ['/people/ben', '/people/dee'] });
    assert.deepEqual(await draw([stripBen, stripGone, stripDee]), { tiles: ['name:Ben Okafor', 'name:Dee Ford', '+1'], hrefs: ['/people/ben', '/people/dee'] });
    // A member that features nothing has no tile, but is counted.
    assert.deepEqual((await draw([stripBen, stripPhoto(1), null])).tiles, ['name:Ben Okafor', '/p1.jpg', '+1']);
    // Identical tiles, or nothing featured (never the actor), draw no strip.
    assert.equal(await draw([stripBen, stripBen, stripBen]), null);
    assert.equal(await draw([null, null]), null);
    // Several actors featuring one entity draw no strip: the headline names them and the rail shows them.
    const fair = { type: 'place', id: 'fair', label: 'Fun Fair', url: '/fair' };
    assert.equal(stripTiles(await renderRaw('/resources/js/vue/FeedGroup.vue', { item: { ...group, count: 3, children: [0, 1, 2].map((n) => ({ ...stripMember(n, fair), actor: { ...activity.actor, id: `a${n}` } })), sample: { actors: [stripAna, stripBen, stripDee], featured: [fair, fair, fair] }, distinct: { actors: 3, featured: 3 } } })), null);
    // Jasper (ui#27): "+N" opens the group like "Show all N"; a static group keeps a plain tile.
    const six = { ...group, count: 6, children: [stripPhoto(1), stripAna, stripBen, stripPhoto(2), stripPhoto(3), stripPhoto(4)].map((object, n) => stripMember(n, object)), children_truncated: false, sample: { actors: group.sample.actors } };
    const live = await renderRaw('/resources/js/vue/FeedGroup.vue', { item: six });
    const button = live.match(/<button[^>]*sf-media-strip__more[^>]*>|<button[^>]*aria-label="Show all 6"[^>]*>/)[0];
    assert.match(button, /aria-label="Show all 6"/);
    assert.match(button, /aria-expanded="false"/);
    const controls = button.match(/aria-controls="([^"]+)"/)[1];
    assert.ok(live.includes(`id="${controls}"`), 'the +N tile controls the members');
    assert.doesNotMatch(await renderRaw('/resources/js/vue/FeedGroup.vue', { item: six, interactive: false }), /<button[^>]*sf-media-strip__more/);
});

test('expanding a group hides its strip and keeps its rail faces in place (ui#47)', async () => {
    const item = { ...group, count: 2, headline_template: null, children: [stripMember(1, stripPhoto(1)), stripMember(2, stripPhoto(2))], sample: { actors: [activity.actor, { ...activity.actor, id: '2' }] } };
    for (const interactive of [true, false]) {
        const expanded = await render('/resources/js/vue/FeedGroup.vue', { item, rail: 'actor', interactive });
        const head = expanded.split('class="sf-children')[0];
        assert.doesNotMatch(head, /sf-media-strip/);
        assert.equal((head.match(/sf-avatar--pair/g) ?? []).length, 2);
        assert.match(expanded, /\/p1\.jpg/, 'the members still draw their pictures');
    }
    assert.match(await render('/resources/js/vue/FeedGroup.vue', { item, rail: 'actor', collapsed: true }), /sf-media-strip/);
});

/** A crowd group: `members` rows, each a different person, from a group of `total` actors. */
const crowd = (total, members = Math.min(total, 25)) => ({
    ...group, id: `crowd-${total}`, count: total, headline_template: ':actors checked in', verb: 'check-in',
    children: Array.from({ length: members }, (_, n) => ({ ...activity, id: `visit-${n}`, actor: { type: 'person', id: `p${n}`, label: `Person ${n}`, url: `/people/${n}`, media: null } })),
    children_truncated: total > members, sample: { actors: [] }, distinct: { actors: total },
});
/** A group's actor strip as face labels then `+N`, or null when there is none. */
const actorFaces = (html) => {
    const section = html.split('sf-actor-strip ')[1]?.split('</div>')[0];
    if (!section) return null;
    return [...section.matchAll(/aria-label="([^"]+)"[^>]*class="sf-avatar |>\+(\d+)</g)].map((m) => m[1] ?? `+${m[2]}`);
};

test('a group with several actors draws every face, newest first, eight before "+N" (ui#48)', async () => {
    const draw = async (item, props = {}) => actorFaces(await renderRaw('/resources/js/vue/FeedGroup.vue', { item, ...props }));
    // Jasper: "always, 8 faces, 24px". 35 actors, 25 members shipped: eight faces and "+27" from the true count.
    const big = await draw(crowd(35));
    assert.deepEqual(big, [...Array.from({ length: 8 }, (_, n) => `Person ${n}`), '+27']);
    // Eight actors or fewer: every one shows, no chip.
    assert.deepEqual(await draw(crowd(5)), ['Person 0', 'Person 1', 'Person 2', 'Person 3', 'Person 4']);
    assert.deepEqual(await draw(crowd(8)), Array.from({ length: 8 }, (_, n) => `Person ${n}`));
    // One actor draws no strip, however many members.
    assert.equal(await draw({ ...crowd(4), children: crowd(4).children.map((child) => ({ ...child, actor: activity.actor })), distinct: { actors: 1 } }), null);
    // A repeat actor shows once, and an anonymous member adds no face.
    const repeat = crowd(3);
    repeat.children = [repeat.children[0], { ...repeat.children[1], actor: repeat.children[0].actor }, { ...repeat.children[2], actor: null }, ...crowd(3).children.slice(1)];
    assert.deepEqual(await draw(repeat), ['Person 0', 'Person 1', 'Person 2']);
    // Faces are 24px avatars.
    assert.match((await renderRaw('/resources/js/vue/FeedGroup.vue', { item: crowd(5) })).split('sf-actor-strip ')[1], /sf-avatar--sm size-6/);
    // Each face sits above the one to its right, so its ring cuts into that face's edge, never its initials.
    const zs = [...(await renderRaw('/resources/js/vue/FeedGroup.vue', { item: crowd(35) })).split('sf-actor-strip ')[1].split('</div>')[0].matchAll(/class="(?=[^"]*sf-actor-strip__face)[^"]*\bz-(\d+)\b[^"]*"/g)].map((m) => Number(m[1]));
    assert.deepEqual(zs, [8, 7, 6, 5, 4, 3, 2, 1]);
    // "+N" opens the group like "Show all N"; a static group keeps a plain chip.
    const live = await renderRaw('/resources/js/vue/FeedGroup.vue', { item: crowd(35) });
    const button = live.match(/<button[^>]*sf-actor-strip__more[^>]*>/)[0];
    assert.match(button, /aria-label="Show all 35"/);
    assert.match(button, /aria-expanded="false"/);
    assert.ok(live.includes(`id="${button.match(/aria-controls="([^"]+)"/)[1]}"`), 'the +N chip controls the members');
    assert.doesNotMatch(await renderRaw('/resources/js/vue/FeedGroup.vue', { item: crowd(35), interactive: false, collapsed: true }), /<button[^>]*sf-actor-strip__more/);
});

test('expanding a group hides its actor strip, and every face is a member row\'s face (ui#48)', async () => {
    const collapsed = await renderRaw('/resources/js/vue/FeedGroup.vue', { item: crowd(35), rail: 'actor' });
    const members = collapsed.split('sf-children')[1];
    for (const face of actorFaces(collapsed).filter((face) => !face.startsWith('+'))) {
        assert.match(members, new RegExp(`aria-label="${face}"[^>]*class="sf-avatar `), `${face} is a member row's face`);
    }
    for (const interactive of [true, false]) {
        const head = (await renderRaw('/resources/js/vue/FeedGroup.vue', { item: crowd(35), rail: 'actor', interactive, collapsed: false })).split('sf-children')[0];
        assert.doesNotMatch(head, /sf-actor-strip/);
    }
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
    assert.match(textOf(await renderLabel('<Figma file>')), /design.fig &lt;Figma file&gt;/);
    assert.deepEqual(received, { name: 'design.fig', mediaType: 'application/pdf' });
    assert.match(textOf(await renderLabel(null)), /design.fig PDF/);
});

test('rich prose and ItemList render inside Typography prose at the feed size', async () => {
    for (const [path, payload] of [
        ['/resources/js/vue/body/Prose.vue', { content: '- One', mediaType: 'text/markdown' }],
        ['/resources/js/vue/body/ItemList.vue', { items: ['One'] }],
    ]) {
        const html = await renderRaw(path, { payload });
        assert.match(html, /class="[^"]*\bprose max-w-none text-\[length:var\(--text-sm\)\][^"]*"/);
        assert.doesNotMatch(html, /\bprose-(sm|base|lg|xl|2xl)\b/);
    }
});

test('only a slim Excerpt v2 without truncated is truncated; v1 and v3 without it are whole', async () => {
    const path = '/resources/js/vue/body/Excerpt.vue';
    assert.match(await render(path, { payload: { $v: 2, text: 'Part' } }), /aria-hidden="true">…/);
    assert.doesNotMatch(await render(path, { payload: { $v: 2, text: 'Whole', truncated: false } }), /…/);
    assert.doesNotMatch(await render(path, { payload: { $v: 1, text: 'Hand-written' } }), /…/);
    assert.doesNotMatch(await render(path, { payload: { $v: 3, text: 'Whole' } }), /…/);
    assert.match(await render(path, { payload: { $v: 3, text: 'Part', truncated: true } }), /aria-hidden="true">…/);
    assert.doesNotMatch(await render(path, { payload: { text: 'Unversioned' } }), /…/);
});

test('Table draws inside prose with a tfoot, escaped cells that keep line breaks, links and an empty mark', async () => {
    const path = '/resources/js/vue/body/Table.vue';
    const payload = { $body: 'Storyfeed/Body/Table', title: 'Order <1042>', headers: ['Item', 'Price'],
        rows: [['Delivery to\n12 Harbour Street', '<b>$0</b>'], [{ label: 'Seats', href: '/seats' }, null], [{ label: 'Owned', href: null }], 'not a row'],
        footer: [['Total', 49.5]] };
    const raw = await renderRaw(path, { payload, entityUrl: '/orders/1' });
    assert.match(raw, /class="sf-table__prose [^"]*\bprose [^"]*max-w-none text-\[length:var\(--text-sm\)\][^"]*\[&amp;_:is\(th,td\)\]:whitespace-pre-line/);
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

test('MediaObject draws an inline image as given; an empty src draws no img', async () => {
    const draw = (payload) => renderRaw('/resources/js/vue/body/MediaObject.vue', { payload });
    const html = await draw({ subject: 'Storyfeed', image: { src: '/share.png', alt: 'The share card', width: 1200, height: 630 } });
    assert.match(html, /src="\/share\.png"/);
    assert.match(html, /alt="The share card"/);
    assert.match(html, /width="1200"/);
    assert.match(html, /height="630"/);
    assert.match(html, /--sf-picture-ratio:1\.9048;/);
    assert.match(await draw({ subject: 'Storyfeed', image: { src: '/share.png' } }), /alt(=""|[ >])/);
    for (const image of [{ src: '' }, { alt: 'Nothing to draw' }, { src: null }]) {
        const empty = await draw({ subject: 'Storyfeed', image });
        assert.match(empty, /Storyfeed/);
        assert.doesNotMatch(empty, /<img|sf-media-object__image/);
    }
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
    assert.match(front, /size-\[calc\(var\(--sf-disc-v\)\*2\/3\)\]/);
    // A pair's verb badge is smaller, in the same place (ui#25 (a)).
    assert.match(await renderRaw('/resources/js/vue/FeedGroup.vue', { item: pair, rail: 'actor' }), /\[&amp;:has\(&gt;\.sf-avatars\)&gt;\.sf-badge\]:\[--sf-badge-v:calc\(var\(--sf-badge,--spacing\(3\.5\)\)\*11\/14\)\] \[&amp;:has\(&gt;\.sf-avatars\)&gt;\.sf-badge\]:\[--sf-badge-anchor-v:--spacing\(2\.75\)\]/);
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
    assert.doesNotMatch(frame, /\/wrong|onClick|bad name|nested|\bsf-image(?:\s|")/);
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
        assert.match(html, /<p class="sf-media-object__footnote mt-0.5 mb-0 text-xs leading-\[1.6\] text-muted-foreground">/);
        assert.match(html, /See full discussion/);
        assert.doesNotMatch(html, /<div|border-border|bg-muted|p-3/);
        if (href) assert.ok(html.includes(`href="${href}"`));
        else assert.doesNotMatch(html, /<a/);
    }
    assert.equal((await renderRaw(path, { payload: {} })).replace(/<!--.*?-->/g, ''), '');
    const html = await renderRaw(path, { payload: { content: 'Discussion summary', footnote: { label: 'Read more', href: '/discussion' } } });
    assert.ok(html.includes('<div class="sf-media-object mt-1.5 flex min-w-0 max-w-128 flex-wrap items-start gap-3 rounded-lg border border-[var(--sf-well-border,color-mix(in_oklab,var(--color-foreground)_8%,transparent))] bg-[var(--sf-well,color-mix(in_oklab,var(--color-card)_55%,transparent))] dark:bg-[var(--sf-well,color-mix(in_oklab,var(--color-foreground)_3%,transparent))] p-3">'));
    assert.match(html, /sf-media-object__content[^>]*>Discussion summary/);
    assert.match(html, /sf-media-object__footnote[^>]*><a href="\/discussion"[^>]*>Read more<\/a><\/p>/);
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

test("an Image body naming a slot takes the slot's alt when it has none of its own", async () => {
    const media = { image: { src: '/card.png', alt: 'The share card' } };
    const draw = (body) => renderRaw('/resources/js/vue/body/Image.vue', { payload: { $body: 'Storyfeed/Body/Image', $v: 3, image: 'image', ...body }, entityMedia: media });
    assert.match(await draw({}), /alt="The share card"/);
    assert.match(await draw({ alt: 'Its own' }), /alt="Its own"/);
    assert.match(await draw({ caption: 'Captioned' }), /alt="Captioned"/);
    assert.doesNotMatch(await draw({ caption: 'Captioned' }), /The share card/);
});

test("a stored or custom-slot Image stands for its entity in a group's strip", async () => {
    const photo = (id, body, media = null) => ({ type: 'document', id, label: id, url: '/' + id, body: [{ $body: 'Storyfeed/Body/Image', $v: 3, ...body }], media });
    const objects = [photo('a', { src: '/own.jpg' }), photo('b', { image: 'slots.chart' }, { slots: { chart: { src: '/chart.svg' } } })];
    const item = { ...group, count: 2, children: objects.map((object, n) => ({ ...activity, id: `m${n}`, object })), sample: { actors: group.sample.actors } };
    const html = await renderRaw('/resources/js/vue/FeedStream.vue', { items: [item], grouped: false });
    assert.match(html, /src="\/own\.jpg"/);
    assert.match(html, /src="\/chart\.svg"/);
});

test('FeedStream reads a whole page: core #95 JSON under data, the older items envelope, or a plain list', async () => {
    const { readPage } = await server.ssrLoadModule('/resources/js/shared/page.ts');
    const nodes = [activity, { ...activity, id: 'second' }];
    assert.deepEqual(readPage({ data: nodes, next_cursor: 'next' }), { items: nodes, nextCursor: 'next' });
    assert.deepEqual(readPage({ payload_version: 1, items: nodes, next_cursor: null, sync_token: null }), { items: nodes, nextCursor: null });
    assert.deepEqual(readPage(nodes), { items: nodes, nextCursor: null });
    assert.deepEqual(readPage(null), { items: [], nextCursor: null });
    const html = await renderRaw('/resources/js/vue/FeedStream.vue', { page: { data: nodes, next_cursor: 'next' } });
    assert.equal((html.match(/role="listitem"/g) ?? []).length, 2, 'both nodes from data');
    assert.match(html, /sf-more/, 'the next cursor offers more');
    assert.doesNotMatch(await renderRaw('/resources/js/vue/FeedStream.vue', { page: { items: nodes, next_cursor: null } }), /sf-more/, 'no cursor, no more');
    assert.match(await renderRaw('/resources/js/vue/FeedStream.vue', { page: { items: nodes, next_cursor: null } }), /Ada Lovelace/);
});

test('a group strip reads core #93\'s sample.featured, else each member\'s featured role', async () => {
    const draw = async (item) => stripTiles(await renderRaw('/resources/js/vue/FeedGroup.vue', { item }));
    const members = [stripPhoto(1), stripPhoto(2), stripPhoto(3), stripPhoto(4), stripPhoto(5)].map((object, n) => stripMember(n, object));
    // sample.featured wins over the members' objects, and distinct.featured counts the +N.
    assert.deepEqual((await draw({ ...group, count: 9, children: members, sample: { actors: group.sample.actors, featured: [stripAna, stripBen, stripPhoto(7)] }, distinct: { actors: 1, featured: 7 } })).tiles, ['name:Ana Silva', 'name:Ben Okafor', '/p7.jpg', '+4']);
    // Without it, each member's featured role (storyfeed/storyfeed#76): its target here, nothing when null.
    const featuring = [{ ...stripMember(0, stripPhoto(1)), featured: 'target', target: stripBen }, { ...stripMember(1, stripPhoto(2)), featured: null }, stripMember(2, stripPhoto(3))];
    assert.deepEqual((await draw({ ...group, count: 3, children: featuring, sample: { actors: group.sample.actors } })).tiles, ['name:Ben Okafor', '/p3.jpg', '+1']);
});

test('rail size variables set around a feed or a lone row reach the rail', async () => {
    // A row or feed that redeclared --sf-gutter and friends would shadow anything set higher up; each reads them with its own default instead.
    for (const [path, props] of [['/resources/js/vue/FeedStream.vue', { items: [activity, group] }], ['/resources/js/vue/FeedItem.vue', { item: activity }], ['/resources/js/vue/FeedGroup.vue', { item: group }]]) {
        const root = (await renderRaw(path, props)).match(/class="([^"]*)"/)[1];
        for (const [name, size] of [['gutter', 8], ['gap', 3], ['disc', 8], ['badge', 3.5], ['badge-face', 4.5]]) {
            assert.ok(root.includes(`[--sf-${name}-v:var(--sf-${name},--spacing(${size}))]`), `${path}: --sf-${name} falls back to ${size} steps`);
        }
        assert.doesNotMatch(await renderRaw(path, props), /\[--sf-(gutter|gap|disc|badge|badge-face):/, `${path}: no element redeclares a public size variable`);
    }
});

test('initials and icons size from their own circle, and a badge grows outward from its corner', async () => {
    const attr = text => text.replaceAll('&', '&amp;').replaceAll('>', '&gt;');
    const actor = await renderRaw('/resources/js/vue/FeedItem.vue', { item: activity, rail: 'actor' });
    const disc = await renderRaw('/resources/js/vue/FeedItem.vue', { item: activity, rail: 'activity' });
    // ui#41: each glyph is a fraction of the circle it sits in, matching the default sizes exactly (3/8 of a 2rem disc is text-xs).
    for (const [html, classes] of [
        [actor, ['sf-avatar--md size-[var(--sf-disc,--spacing(8))] text-[length:calc(var(--sf-disc,--spacing(8))*3/8)] leading-(--text-xs--line-height)', '[&_svg]:size-[calc(var(--sf-badge-v)*5/7)]', 'sf-badge absolute z-30 [--sf-badge-anchor-v:--spacing(3.5)] ']],
        [disc, ['[&_svg]:size-[calc(var(--sf-disc,--spacing(8))*7/16)]', 'text-[length:calc(var(--sf-badge-v)/2)]', '[--sf-badge-v:var(--sf-badge-face-v)] [--sf-badge-anchor-v:--spacing(4.5)] absolute ']],
    ]) {
        for (const name of classes) assert.ok(html.includes(attr(name)), name);
        // A badge's centre stays where its default size puts it, so a larger badge grows outward instead of over the face.
        assert.ok(html.includes(attr('top-[calc(var(--sf-disc-v)+--spacing(0.5)-(var(--sf-badge-anchor-v)+var(--sf-badge-v))/2)] left-[calc(50%+var(--sf-disc-v)/2-(var(--sf-badge-anchor-v)+var(--sf-badge-v))/2)]')));
        for (const fixed of ['[&_svg]:size-3.5', '[&_svg]:size-2.5', 'text-[length:--spacing(2.25)]']) assert.ok(!html.includes(attr(fixed)), fixed);
    }
});

test('a dateless entry draws no time, no tooltip and no day of its own (storyfeed/storyfeed#127)', async () => {
    const dateless = { ...activity, id: 'dateless', published_at: null };
    for (const [path, props] of [['/resources/js/vue/FeedItem.vue', { item: dateless }], ['/resources/js/vue/FeedGroup.vue', { item: { ...group, published_at: null } }]]) {
        const html = await renderRaw(path, props);
        assert.match(html, /Ada Lovelace/, path);
        assert.doesNotMatch(html, /<time|sf-time|Invalid Date|NaN|1970/, path);
    }
    const days = async items => (await render('/resources/js/vue/FeedStream.vue', { items })).match(/class="sf-day"/g)?.length ?? 0;
    const at = (id, published_at) => ({ ...activity, id, published_at });
    // Like feed.blade.php: a dateless entry neither starts a day nor ends one, so the next dated entry on that day draws no second heading.
    assert.equal(await days([at('a', '2026-10-07T12:00:00Z'), at('b', null), at('c', '2026-10-07T10:00:00Z'), at('d', '2026-10-05T10:00:00Z')]), 2);
    const leading = await render('/resources/js/vue/FeedStream.vue', { items: [at('b', null), at('a', '2026-10-07T12:00:00Z')] });
    assert.equal(leading.match(/class="sf-day"/g).length, 1);
    assert.equal(await days([at('b', null)]), 0);
    const { feedDays } = await server.ssrLoadModule('/resources/js/shared/days.ts');
    assert.deepEqual(feedDays([at('b', null), at('a', '2026-10-07T12:00:00Z'), at('c', null)], Date.parse('2026-10-07T13:00:00Z')).map(day => [day.label, day.items.map(item => item.id)]), [[null, ['b']], ['Today', ['a', 'c']]]);
});

test('a null verb is left out of the fallback headline (storyfeed/storyfeed#127)', async () => {
    const item = { ...activity, verb: null, headline_template: null, headline: null, actor: null, object: { ...entity, id: '2', label: 'Order #1001', media: null } };
    const text = async props => (await renderRaw('/resources/js/vue/FeedHeadline.vue', { entities: item, template: null, headline: null, ...props })).replace(/<!--.*?-->/g, '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    assert.equal(await text({ verb: null }), 'Someone Order #1001');
    // The verb, when there is one, keeps a space on both sides.
    assert.equal(await text({ verb: 'shipped' }), 'Someone shipped Order #1001');
    const row = await renderRaw('/resources/js/vue/FeedItem.vue', { item });
    assert.doesNotMatch(row, /null/);
    assert.match(await renderRaw('/resources/js/vue/FeedItem.vue', { item: { ...item, headline: 'Imported from the archive' } }), /Imported from the archive/);
});

test('a row draws its featured role\'s body: the object by default, none when featured is null', async () => {
    const talk = { type: 'event', id: 'talk', label: 'GPUG talk', url: '/talks/gpug', body: [{ $body: 'Storyfeed/Body/Excerpt', text: 'Live at the talk' }, { $body: 'Storyfeed/Body/Image', image: 'icon' }], media: { icon: { src: '/talk.svg' } } };
    const item = { ...activity, object: { ...activity.object, body: [{ $body: 'Storyfeed/Body/Excerpt', text: 'The package itself' }] }, location: talk };
    const draw = (node) => renderRaw('/resources/js/vue/FeedItem.vue', { item: node });
    // Before core sent the field, and with it naming the object, the object's body.
    for (const node of [item, { ...item, featured: 'object' }]) {
        const html = await draw(node);
        assert.match(html, /The package itself/);
        assert.doesNotMatch(html, /Live at the talk/);
    }
    // A featured location draws its body, and its icon thumbnail links to it.
    const located = await draw({ ...item, featured: 'location' });
    assert.match(located, /Live at the talk/);
    assert.doesNotMatch(located, /The package itself/);
    assert.match(located, /<a href="\/talks\/gpug" class="sf-media[^>]*>(?:<!--[^]*?-->)?<img[^>]*src="\/talk\.svg"/);
    // null draws no entity body; a featured role the payload left empty draws none either, and the row stays.
    for (const node of [{ ...item, featured: null }, { ...item, featured: 'target', target: null }]) {
        const html = await draw(node);
        assert.doesNotMatch(html, /The package itself|Live at the talk/);
        assert.match(html, /sf-row/);
    }
});

test('a strip tile shows the picture its member\'s row draws, whichever role that member features', async () => {
    const located = { ...stripMember(0, stripBen), featured: 'location', location: stripPhoto(1) };
    const members = [located, stripMember(1, stripPhoto(2)), { ...stripMember(2, stripPhoto(3)), featured: 'actor', actor: stripBen }];
    const { tiles } = stripTiles(await renderRaw('/resources/js/vue/FeedGroup.vue', { item: { ...group, count: 3, children: members, sample: { actors: group.sample.actors } } }));
    assert.deepEqual(tiles, ['/p1.jpg', '/p2.jpg', 'name:Ben Okafor']);
    for (const [member, src] of [[located, '/p1.jpg'], [members[1], '/p2.jpg']]) {
        assert.match(await renderRaw('/resources/js/vue/FeedItem.vue', { item: member }), new RegExp(`src="${src}"`), `the row draws ${src}`);
    }
    assert.doesNotMatch(await renderRaw('/resources/js/vue/FeedItem.vue', { item: members[2] }), /<img/, 'a name tile\'s row draws no picture');
});

test('an anonymous actor draws as an actor, muted and never italic; an unlabelled entity stays a placeholder', async () => {
    const someone = await renderRaw('/resources/js/vue/EntityLink.vue', { entity: null, fallback: 'Someone' });
    assert.match(someone, /class="[^"]*sf-entity--anonymous[^"]*"/);
    assert.match(someone, /class="[^"]*font-medium[^"]*text-muted-foreground[^"]*"[^>]*>\s*Someone/);
    assert.doesNotMatch(someone, /italic/);
    const degraded = await renderRaw('/resources/js/vue/EntityLink.vue', { entity: { type: 'order', id: '9', label: null } });
    assert.match(degraded, /sf-entity--unknown italic/);
});

test('the page viewer reads as You, at any position and in lists (ui#75)', async () => {
    const { FEED_VIEWER } = await server.ssrLoadModule('/resources/js/vue/keys.ts');
    const { default: FeedHeadline } = await server.ssrLoadModule('/resources/js/vue/FeedHeadline.vue');
    const headline = async (props, viewer) => {
        const app = createSSRApp({ render: () => h(FeedHeadline, props) });
        if (viewer !== undefined) app.provide(FEED_VIEWER, viewer);
        return (await renderToString(app)).replace(/<!--[\s\S]*?-->/g, '').replace(/ class="[^"]*"/g, '');
    };
    const object = { type: 'order', id: '7', label: 'Order #7', url: '/orders/7' };
    const ravi = { ...entity, id: '2', label: 'Ravi', url: '/ravi' };
    const placed = { template: ':actor placed :object', entities: { actor: entity, object }, verb: 'place' };

    assert.match(await headline(placed, 'user:1'), /<span><span>You<\/span> placed <a[^>]*>Order #7<\/a><\/span>/);
    assert.match(await headline(placed, { type: 'user', id: 1 }), /<span><span>You<\/span> placed/);
    assert.match(await headline({ template: ':object was assigned to :target', entities: { object, target: entity }, verb: 'assign' }, 'user:1'), /was assigned to <span>you<\/span><\/span>/);
    assert.match(await headline({ template: ':actors joined :object', entities: { object }, sample: { actors: [entity, ravi] }, distinct: { actors: 4 }, verb: 'join', aggregate: true }, 'user:1'), /<span><span>You<\/span>, <a[^>]*>Ravi<\/a> and 2 more joined/);
    assert.match(await headline(placed, 'user:2'), /Ada Lovelace<\/a> placed/);
    assert.equal(await headline(placed), await headline(placed, null));
});

test('Image sizes override the inherited feed choice, including explicit full', async () => {
    const lengths = { thumbnail: ['6rem', '6rem'], inline: ['16rem', '12rem'], card: ['24rem', '18rem'], feature: ['36rem', '27rem'], full: ['100%', 'none'] };
    for (const size of ['thumbnail', 'inline', 'card', 'feature', 'full']) {
        const [width, height] = lengths[size];
        const payload = { $body: 'Storyfeed/Body/Image', $v: 3, src: '/fair.jpg', $meta: { size } };
        const html = await renderRaw('/resources/js/vue/body/Image.vue', { payload });
        assert.ok(html.includes(`[--sf-image-width:var(--sf-image-size-${size},${width})]`));
        assert.ok(html.includes(`[--sf-image-height:var(--sf-image-size-${size}-height,${height})]`));
        assert.doesNotMatch(html, /style=/);
    }
    const payload = { $body: 'Storyfeed/Body/Image', $v: 3, src: '/fair.jpg' };
    assert.doesNotMatch(await renderRaw('/resources/js/vue/body/Image.vue', { payload }), /\[--sf-image-width:|style=/);
    const item = { kind: 'activity', id: '1', published_at: null, headline_template: null, headline: 'Updated Maple Fair', object: { type: 'project', id: '1', label: 'Maple Fair', body: [payload] } };
    assert.ok((await renderRaw('/resources/js/vue/FeedStream.vue', { items: [item], imageSize: 'card', grouped: false })).includes('--sf-image-size-card,24rem)'));
    payload.$meta = { size: 'full' };
    const both = await renderRaw('/resources/js/vue/FeedStream.vue', { items: [item], imageSize: 'card', grouped: false });
    assert.ok(both.includes('--sf-image-size-card,24rem)') && both.includes('--sf-image-size-full,100%)'));
    payload.$meta = { size: 'bad);color:red' };
    assert.doesNotMatch(await renderRaw('/resources/js/vue/body/Image.vue', { payload }), /\[--sf-image-width:|style=|color:red/);
});

test('custom Image renderers reuse FeedMedia sizing and retain their links (ui#88)', async () => {
    const { default: Feed } = await server.ssrLoadModule('/resources/js/vue/FeedStream.vue');
    const { default: Media } = await server.ssrLoadModule('/resources/js/vue/FeedMedia.vue');
    const { FEED_BODIES } = await server.ssrLoadModule('/resources/js/vue/keys.ts');
    const { pictureOf } = await server.ssrLoadModule('/resources/js/shared/body.ts');
    const LinkedImage = {
        props: ['payload', 'entityMedia', 'entityUrl'],
        setup: props => () => h(Media, { image: pictureOf(props.payload, props.entityMedia), payload: props.payload, href: props.entityUrl }),
    };
    for (const size of [undefined, 'thumbnail', 'inline', 'card', 'feature', 'full', 'unknown']) {
        const payload = { $body: 'Storyfeed/Body/Image', $v: 3, src: '/fair.jpg', width: 800, height: 1200, $meta: { size } };
        const item = { kind: 'activity', id: '1', published_at: null, headline: 'Maple Fair', object: { type: 'project', id: '1', url: '/project', body: [payload] } };
        const app = createSSRApp({ render: () => h(Feed, { items: [item], imageSize: 'card', grouped: false }) });
        app.provide(FEED_BODIES, { 'Storyfeed/Body/Image': LinkedImage });
        const html = await renderToString(app);
        assert.match(html, /<a[^>]*href="\/project"[^>]*class="sf-media/);
        assert.ok(html.includes('--sf-image-size-card,24rem)'));
        if (size && size !== 'unknown') assert.ok(html.includes(`--sf-image-size-${size},`), size);
        assert.ok(html.includes('max-h-[var(--sf-image-height,none)]'));
        assert.doesNotMatch(html, /aspect-ratio|bg-muted|payload=/);
    }
});


test('image avatars use neutral ring utilities and bind only their colour variable', async () => {
    const html = await renderRaw('/resources/js/vue/EntityAvatar.vue', { entity });
    for (const utility of ['has-[&gt;img:not([hidden])]:bg-transparent', 'has-[&gt;img:not([hidden])]:border', 'has-[&gt;img:not([hidden])]:border-border', 'bg-(--sf-avatar-color)', 'ring-2 ring-background']) assert.ok(html.includes(utility), utility);
    assert.match(html, /--sf-avatar-color:/);
    assert.doesNotMatch(html, /background-color/);
});
