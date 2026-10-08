import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { createServer } from 'vite';
import { createElement as h } from 'react';
import { renderToString } from 'react-dom/server';
process.env.TZ = 'UTC';
const server = await createServer({
    configFile: false,
    esbuild: { jsx: 'automatic' },
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, hmr: false },
    appType: 'custom',
    ssr: {
        external: [
            'react',
            'react/jsx-runtime',
            'react-dom/server',
            'lucide-react',
        ],
    },
});
after(() => server.close());
const kit = await server.ssrLoadModule('/resources/js/react/index.ts');
const bodies = await server.ssrLoadModule('/resources/js/react/body/index.tsx');
const shared = await server.ssrLoadModule('/resources/js/shared/body.ts');
const { formatTimestamp } = await server.ssrLoadModule(
    '/resources/js/shared/timestamp.ts',
);
const raw = (name, props, options = {}) =>
    renderToString(
        h(kit.FeedProvider, options, h(kit[name] ?? bodies[name], props)),
    );
const render = (name, props, options) =>
    raw(name, props, options)
        .replace(
            / class="([^"]*)"/g,
            (_, c) =>
                ` class="${c
                    .split(/\s+/)
                    .filter((c) => /^sf-[\w-]+$/.test(c))
                    .join(' ')}"`,
        )
        .replace(/<!--.*?-->/g, '');
const text = (html) =>
    html
        .replace(/<[^>]*>/g, '')
        .replace(/\s+/g, ' ')
        .trim();
const entity = {
    type: 'user',
    id: '1',
    label: 'Ada Lovelace',
    url: '/ada',
    modal: false,
    media: { icon: { src: '/ada.svg', alt: 'Ada' } },
};
const person = (label) => ({
    ...entity,
    id: label,
    label,
    url: `/${label}`,
    media: null,
});
const activity = {
    kind: 'activity',
    id: 'child',
    verb: 'post',
    published_at: '2026-10-07T12:00:00Z',
    headline_template: ':actor posted',
    actor: { ...entity, media: null },
    glyph: 'file-up',
    object: null,
    target: null,
    context: null,
};
const group = {
    ...activity,
    kind: 'group',
    id: 'group',
    axis: 'repeat',
    count: 36,
    children: [activity],
    sample: { actors: [activity.actor] },
    distinct: { actors: 1 },
    children_truncated: true,
};
const photo = (src) => ({
    ...person(src),
    body: [{ $body: 'Storyfeed/Body/Image', image: 'preview' }],
    media: { preview: { src, width: 200, height: 100 } },
});

test('avatars show icons, deterministic colours and one-letter badges; tombstones are muted', () => {
    assert.match(raw('EntityAvatar', { entity }), /src="\/ada.svg"/);
    assert.match(
        raw('EntityAvatar', { entity: { ...entity, media: null } }),
        /background-color:#6366f1/,
    );
    assert.match(
        raw('EntityAvatar', {
            entity: { ...entity, data: { avatar_color: '#FAF6EF' } },
        }),
        /background-color:#FAF6EF/,
    );
    assert.match(
        render('EntityAvatar', {
            entity: { ...entity, media: null },
            size: 'badge',
        }),
        />A<\/span>/,
    );
    const deleted = { ...entity, tombstone: { formerType: 'user' } };
    assert.doesNotMatch(
        raw('EntityAvatar', { entity: deleted }),
        /<img|background-color/,
    );
    assert.doesNotMatch(raw('EntityLink', { entity: deleted }), /<a/);
    assert.match(
        text(raw('EntityLink', { entity: { ...deleted, label: null } })),
        /a removed user/,
    );
});
test('headlines retain unknown tokens, lists, totals, closure grammar and fallback', () => {
    assert.match(
        text(
            raw('FeedHeadline', {
                template: ':actors :count :others :future',
                entities: {},
                sample: { actors: [person('Ada'), person('Grace')] },
                distinct: { actors: 4 },
                count: 7,
            }),
        ),
        /Ada, Grace and 2 more 7 2 others :future/,
    );
    assert.match(
        text(
            raw('FeedHeadline', {
                template: null,
                headline: 'Closure',
                entities: {},
                verb: null,
            }),
        ),
        /Closure/,
    );
    assert.match(
        text(
            raw('FeedHeadline', {
                template: null,
                entities: {},
                verb: null,
                aggregate: true,
                count: 5,
            }),
        ),
        /5 activities/,
    );
    assert.match(
        text(
            raw('FeedHeadline', {
                template: null,
                entities: {},
                verb: 'posted',
            }),
        ),
        /Someone posted/,
    );
});
for (const kind of ['activity', 'group']) {
    const node = {
        ...(kind === 'group' ? group : activity),
        instrument: person('Tool'),
    };
    test(`${kind} puts time after headline and renders ordered leftover roles`, () => {
        const html = render(kind === 'group' ? 'FeedGroup' : 'FeedItem', {
            item: {
                ...node,
                origin: person('Backlog'),
                result: person('Report'),
                context: person('Sprint'),
                location: person('Toronto'),
                generator: person('Importer'),
            },
        });
        assert.match(
            html,
            /class="sf-head">[\s\S]*?<\/div><div class="sf-meta"><time dateTime=/,
        );
        assert.match(html, /title="2026-10-07T12:00:00Z"/);
        assert.match(
            text(html),
            /via Tool · from Backlog · to Report · at Toronto · from Importer/,
        );
        assert.doesNotMatch(html.split('class="sf-meta"')[1], /Sprint/);
        assert.match(
            raw(kind === 'group' ? 'FeedGroup' : 'FeedItem', {
                item: node,
                time: () => 'October 2026',
            }),
            /October 2026/,
        );
    });
    test(`${kind} only consumes exact role tokens from the displayed grammar`, () => {
        const name = kind === 'group' ? 'FeedGroup' : 'FeedItem';
        const html = render(name, {
            item: {
                ...node,
                headline_template: ':actor posted via :instrument in :context',
                context: person('Sprint'),
            },
        });
        assert.doesNotMatch(html.split('class="sf-meta"')[1], /Tool|Sprint/);
        assert.match(
            render(name, {
                item: { ...node, headline_template: ':instrumental' },
            }),
            /sf-meta__role">via /,
        );
    });
}
test('plural meta roles preserve distinct remainder without repetition', () => {
    const item = {
        ...group,
        sample: {
            actors: [activity.actor],
            instruments: [person('Tool'), person('Other')],
        },
        distinct: { actors: 1, instruments: 4 },
    };
    assert.match(
        text(raw('FeedGroup', { item })),
        /via Tool, Other and 2 more/,
    );
    assert.doesNotMatch(
        render('FeedGroup', {
            item: { ...item, headline_template: ':instruments posted' },
        })
            .split('class="sf-meta"')[1]
            .split('<details')[0],
        /Tool|Other/,
    );
});
test('redundant activities use missing grammar to decide leftover roles', () => {
    assert.match(
        render('FeedItem', {
            item: {
                ...activity,
                instrument: person('Tool'),
                headline_template: ':instrument posted',
                redundant: true,
                missing_headline_template: ':actor posted',
            },
        }),
        /sf-meta__role">via /,
    );
});
test('calendar ladder covers midnight, year and older rungs', () => {
    const now = Date.parse('2026-10-07T00:01:00Z');
    assert.equal(
        formatTimestamp('2026-10-07T00:00:50Z', now, 'en-US'),
        'just now',
    );
    assert.match(
        formatTimestamp('2026-10-06T23:59:00Z', now, 'en-US'),
        /Yesterday/,
    );
    assert.match(formatTimestamp('2025-10-01T12:00:00Z', now, 'en-US'), /2025/);
});
test('SSR output has no clock or timezone dependence and starts no timers', () => {
    const original = Date.now;
    Date.now = () => {
        throw Error('SSR must not read the clock');
    };
    try {
        assert.match(raw('FeedStream', { items: [activity] }), /2026-10-07/);
    } finally {
        Date.now = original;
    }
});
test('Component registry forwards props, escapes text, rejects unknown and prototype names', () => {
    const options = {
        FEED_COMPONENTS: {
            'App/Message': ({ message }) => h('strong', null, message),
        },
    };
    assert.equal(
        raw(
            'ComponentBody',
            {
                payload: {
                    name: 'App/Message',
                    props: { message: '<Mapped>' },
                },
            },
            options,
        ),
        '<strong>&lt;Mapped&gt;</strong>',
    );
    for (const name of ['Unknown', 'toString', '__proto__'])
        assert.equal(raw('ComponentBody', { payload: { name } }, options), '');
});
test('custom link component receives href, modal and attributes', () => {
    let received;
    raw(
        'EntityLink',
        {
            entity: {
                ...entity,
                modal: true,
                attributes: { 'data-owner': 'app' },
            },
        },
        {
            FEED_LINK: (props) => {
                received = props;
                return h('a', { href: props.href }, props.children);
            },
        },
    );
    assert.equal(received.href, '/ada');
    assert.equal(received.modal, true);
    assert.equal(received['data-owner'], 'app');
});
test('dot and branch dividers render before the named row', () => {
    const props = { items: [activity], dividers: { child: 'History' } };
    const dot = raw('FeedStream', props);
    assert.equal((dot.match(/sf-rail__node/g) ?? []).length, 2);
    const branch = raw('FeedStream', { ...props, dividerStyle: 'branch' });
    assert.equal((branch.match(/sf-rail__branch/g) ?? []).length, 2);
    assert.doesNotMatch(branch, /sf-rail__node/);
    assert.ok(branch.indexOf('History') < branch.indexOf('Ada Lovelace'));
});
test('empty state, loading pager and unknown node kinds remain safe', () => {
    assert.match(raw('FeedStream', { items: [] }), /No activity yet/);
    const html = raw('FeedStream', {
        items: [{ ...activity, kind: 'future' }],
        nextCursor: 'cursor',
        loadingMore: true,
    });
    assert.match(html, /disabled="">Loading…/);
    assert.doesNotMatch(html, /Someone/);
});
test('all rail configurations preserve fallback and dense/crowd badge suppression', () => {
    for (const name of kit.RAIL_NAMES) {
        assert.deepEqual(
            kit.railFor(kit.rail(name), { actors: 0, glyph: false }),
            { disc: 'none', badge: 'none' },
        );
        assert.equal(
            kit.railFor(kit.rail(name), { actors: 3, glyph: true }).badge,
            'none',
        );
    }
    assert.deepEqual(
        kit.railFor(kit.rail('actor'), { actors: 0, glyph: true }),
        { disc: 'activity', badge: 'none' },
    );
    assert.match(
        raw('FeedItem', {
            item: { ...activity, glyph_intent: 'app-defined' },
            rail: 'activity',
        }),
        /data-sf-intent="app-defined"/,
    );
    assert.doesNotMatch(
        raw('FeedItem', { item: activity, rail: 'activity', dense: true }),
        /sf-avatar--badge|sf-badge absolute/,
    );
    const html = raw('FeedGroup', {
        item: {
            ...group,
            sample: { actors: [person('A'), person('B'), person('C')] },
        },
        rail: 'actor',
    });
    assert.equal((html.split('sf-avatars')[1].split('</div>')[0].match(/sf-avatar--md/g) ?? []).length, 3);
    assert.doesNotMatch(html, /padding-right/);
    assert.doesNotMatch(html, /sf-badge absolute/);
});
test('body discovery handles current/historical names, depth bounds and unknown tokens', () => {
    const form = { $body: 'Storyfeed/Body/File', name: 'old.pdf' };
    assert.equal(bodies.resolve([form]).length, 1);
    assert.equal(bodies.formsIn({ appKey: { nested: form } }).length, 1);
    assert.equal(
        shared.resolve([{ $body: 'toString' }, { $body: 'Unknown' }]).length,
        0,
    );
    assert.equal(
        shared.formsIn({ a: { b: { c: { d: { e: form } } } } }).length,
        0,
    );
    assert.equal(shared.imageOf({ media: { preview: {} } }), null);
});
test('group singular slots use explicit pins even when distinct=1', () => {
    for (const role of [
        'actor',
        'object',
        'target',
        'context',
        'instrument',
        'origin',
        'result',
        'location',
        'generator',
    ]) {
        const item = {
            ...group,
            actor: null,
            headline_template: `:${role}`,
            sample: { [`${role}s`]: [person('Exemplar')] },
            distinct: { [`${role}s`]: 1 },
        };
        assert.doesNotMatch(
            render('FeedGroup', { item })
                .split('class="sf-head"')[1]
                .split('class="sf-meta"')[0],
            /Exemplar/,
        );
        assert.match(
            text(
                raw('FeedGroup', {
                    item: { ...item, [role]: person('Pinned') },
                }),
            ),
            /Pinned/,
        );
    }
});
test('group strips sample all roles, objects first, deduplicate and cap at three', () => {
    for (const role of [
        'objects',
        'actors',
        'targets',
        'contexts',
        'origins',
        'results',
        'instruments',
        'locations',
        'generators',
    ])
        assert.match(
            raw('FeedGroup', {
                item: { ...group, sample: { [role]: [photo('/picture')] } },
            }),
            /src="\/picture"/,
        );
    const html = raw('FeedGroup', {
        item: {
            ...group,
            sample: {
                objects: [photo('/a'), photo('/b')],
                targets: [photo('/a'), photo('/c'), photo('/d')],
            },
        },
    });
    assert.deepEqual(
        [...html.matchAll(/<img[^>]+src="([^"]+)"/g)].map((m) => m[1]),
        ['/a', '/b', '/c'],
    );
});
test('native details open unnamed groups, preserve truncated totals and independent child rails', () => {
    const html = raw('FeedGroup', {
        item: { ...group, headline_template: null },
        rail: 'actor',
        childRail: 'activity-only',
    });
    assert.match(html, /<details[^>]+open=""/);
    assert.match(
        text(html).replace(/<!--.*?-->/g, ''),
        /…and 35 more not shown/,
    );
    const child = html.split('sf-children mt-3')[1];
    assert.match(child, /sf-icon/);
    assert.doesNotMatch(child, /sf-avatar|sf-badge absolute/);
});
test('files retain names, decimal sizes and MIME labels without guessing extensions', () => {
    for (const [size, expected] of [
        [21_000_000, '21 MB'],
        [76_000, '76 KB'],
        [2_516_582, '2.5 MB'],
        [0, '0 bytes'],
    ])
        assert.ok(
            text(
                raw('FileAttachment', {
                    payload: {
                        name: 'report.csv',
                        size,
                        mediaType: 'text/csv',
                    },
                }),
            ).includes(`report.csv Spreadsheet (CSV) · ${expected}`),
        );
    assert.equal(
        text(raw('FileAttachment', { payload: { name: 'design.fig' } })),
        'design.fig',
    );
    assert.match(
        raw(
            'FileAttachment',
            { payload: { name: 'design.fig', mediaType: 'application/pdf' } },
            { FEED_FILE_LABELLER: () => '<Figma>' },
        ),
        /&lt;Figma&gt;/,
    );
    assert.match(
        raw(
            'FileAttachment',
            { payload: { mediaType: 'application/pdf' } },
            { FEED_FILE_LABELLER: () => null },
        ),
        /PDF/,
    );
});
test('rich prose shares sanitizer and verbatim escapes all source', () => {
    const content =
        '<script>alert(1)</script><a href="javascript:alert(1)">link</a><strong>safe</strong>';
    const html = raw('Prose', { payload: { content, mediaType: 'text/html' } });
    assert.doesNotMatch(html, /<script|javascript:/);
    assert.match(html, /<strong>safe<\/strong>/);
    assert.match(
        raw('Prose', { payload: { content, verbatim: true } }),
        /&lt;script&gt;/,
    );
});
test('ItemList states overflow conjunction and owning URL fallback', () => {
    assert.match(
        text(raw('ItemList', { payload: { items: ['First'], totalItems: 3 } })),
        /Firstand 2 more/,
    );
    assert.match(
        raw('ItemList', {
            payload: { items: [{ label: 'Owned' }] },
            entityUrl: '/owner',
        }),
        /href="\/owner"/,
    );
});
test('MediaObject below follows prose; host placement applies to automatic bodies', () => {
    const props = {
        payload: { subject: 'Post', content: 'Words', image: 'preview' },
        entityMedia: photo('/photo').media,
    };
    const below = raw('MediaObject', { ...props, imagePlacement: 'below' });
    assert.ok(below.indexOf('Words') < below.indexOf('src="/photo"'));
    assert.doesNotMatch(below, /sf-media-object__image/);
    assert.match(raw('MediaObject', props), /sf-media-object__image/);
    const auto = raw(
        'FeedItem',
        {
            item: {
                ...activity,
                object: {
                    ...photo('/automatic'),
                    body: [
                        {
                            $body: 'Storyfeed/Body/MediaObject',
                            ...props.payload,
                        },
                    ],
                },
            },
        },
        { FEED_MEDIA_OBJECT_PLACEMENT: 'below' },
    );
    assert.doesNotMatch(auto, /sf-media-object__image/);
});
test('body and annotation render props receive activities and groups', () => {
    for (const item of [activity, group]) {
        const html = raw('FeedStream', {
            items: [item],
            body: ({ node }) => h('b', null, `Body ${node.id}`),
            annotations: ({ node }) => h('i', null, `Note ${node.id}`),
        });
        assert.match(html, new RegExp(`Body ${item.id}`));
        assert.match(html, new RegExp(`Note ${item.id}`));
    }
});
for (const file of ['sample-payload', 'body-payload', 'cases']) {
    const data = JSON.parse(
        await readFile(`workbench/vue/${file}.json`, 'utf8'),
    );
    const cases =
        file === 'cases'
            ? data
            : [{ name: file, items: Array.isArray(data) ? data : data.items }];
    for (const example of cases)
        test(`SSR fixture: ${example.name}`, () => {
            assert.match(
                raw(
                    'FeedStream',
                    {
                        items: example.items,
                        rail: example.rail,
                        childRail: example.childRail,
                        grouped: example.grouped ?? false,
                    },
                    { FEED_NOW: 1 },
                ),
                /sf-feed/,
            );
        });
}

test('null time render prop omits empty metadata but preserves leftover roles', () => {
    for (const item of [activity, group]) {
        const name = item.kind === 'activity' ? 'FeedItem' : 'FeedGroup';
        const html = render(name, { item, time: () => null });
        assert.doesNotMatch(html.split('<details')[0], /sf-meta/);
        assert.match(
            render(name, {
                item: { ...item, instrument: person('Tool') },
                time: () => null,
            }),
            /sf-meta__role/,
        );
    }
});

test('time render props preserve zero and suppress whitespace/empty fragments', () => {
    assert.match(render('FeedItem', { item: activity, time: () => 0 }), /sf-meta">0/);
    assert.doesNotMatch(render('FeedItem', { item: activity, time: () => '   ' }), /sf-meta/);
});

test('object icons retain entity URLs and filtered attributes through host link and media seams', () => {
    for (const node of [activity, group]) {
        const item = { ...node, object: { ...entity, url: '/dishes/7', attributes: { target: '_blank', 'data-route': 'dish', href: '/wrong', onClick: 'bad()', 'bad name': 'bad', nested: {} } } };
        const props = { items: [item], grouped: false, objectIcon: node => node.object ? ({ src: '/dal-icon.jpg', width: 64, height: 64 }) : null };
        const html = raw('FeedStream', props, { FEED_LINK: props => h('a', { ...props, 'data-router': 'host' }) });
        const frame = html.split('sf-object-media')[1];
        assert.match(frame, /href="\/dishes\/7"/);
        assert.match(frame, /target="_blank"/);
        assert.match(frame, /data-route="dish"/);
        assert.match(frame, /data-router="host"/);
        assert.doesNotMatch(frame, /\/wrong|onClick|bad name|nested/);
        let received;
        assert.match(raw('FeedStream', props, { FEED_MEDIA: props => { received = props; return h('button', { className: props.className }, 'Lightbox'); } }), /Lightbox/);
        assert.equal(received.href, '/dishes/7');
        assert.deepEqual(received.linkAttributes, { target: '_blank', 'data-route': 'dish' });
        assert.match(received.className, /size-10!/);
        const unlinked = raw('FeedItem', { item: { ...activity, object: { ...item.object, url: null } }, objectIcon: props.objectIcon });
        assert.doesNotMatch(unlinked.split('sf-object-media')[1], /<a|target="_blank"/);
    }
});

test('feed retains static collapsed members for print and preserves native interactive print rules', () => {
    const html = raw('FeedStream', { items: [group], interactive: false, collapsed: true });
    assert.match(html, /class="(?=[^"]*sf-children)(?=[^"]*hidden print:block)/);
    assert.match(html.split('sf-children')[1], /Ada Lovelace/);
    assert.doesNotMatch(html, /<details|<summary/);
    const open = raw('FeedStream', { items: [group], interactive: false });
    assert.doesNotMatch(open, /hidden print:block|<summary/);
    const interactive = raw('FeedStream', { items: [group], collapsed: true });
    assert.match(interactive, /<details/);
    assert.match(interactive, /print:\[&amp;::details-content\]:block/);
    assert.match(interactive.split('sf-children')[1], /Ada Lovelace/);
});

test('groups render without retired fields and ignore unknown extra keys', () => {
    for (const headline of [{ headline_template: ':count updates' }, { headline_template: null, headline: 'Updates' }, { headline_template: null }]) {
        const item = { ...group, ...headline };
        for (const key of ['phrases', 'phrases_truncated', 'period']) assert.equal(Object.hasOwn(item, key), false);
        const html = raw('FeedStream', { items: [item], grouped: false });
        assert.match(html, /sf-head|sf-children/);
        assert.equal(raw('FeedStream', { items: [{
            ...item, phrases: [{ headline_template: 'Retired sentence', count: 36 }],
            phrases_truncated: true, period: 'day', future_field: { unknown: true },
        }], grouped: false }), html);
    }
});
