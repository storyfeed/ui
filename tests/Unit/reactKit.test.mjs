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

test('avatars prefer declared media initials and colour, with contrasting text', () => {
    const legacy = { initials: 'OLD', avatar_color: '#123456' };
    const faint = raw('EntityAvatar', {
        entity: { ...entity, media: { icon: null, initials: 'AC', color: '#e6f2f3' }, data: legacy },
    });
    assert.match(faint, /background-color:#e6f2f3/);
    assert.match(faint, /class="[^"]*\btext-black\b/);
    assert.match(faint, />AC</);
    assert.doesNotMatch(faint, /OLD|text-white/);
    assert.match(
        raw('EntityAvatar', { entity: { ...entity, media: { icon: null, initials: 'AC', color: '#1e3a40' } } }),
        /class="[^"]*\btext-white\b/,
    );
    const fallback = raw('EntityAvatar', {
        entity: { ...entity, media: { icon: null, initials: '', color: 'teal' }, data: legacy },
    });
    assert.match(fallback, /background-color:#123456/);
    assert.match(fallback, />OLD</);
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
test('registered body renderers draw app types, override core types and merge across providers', () => {
    const renderer = (Tag) => ({ payload, entityUrl }) =>
        h(Tag, { className: 'sf-app-body' }, `${payload.carrier ?? payload.content} ${entityUrl}`);
    const item = (body) => ({
        kind: 'activity', id: 'shipment', verb: 'ship', published_at: '2026-10-07T12:00:00Z', headline: 'Shipped',
        actor: null, object: { label: 'Order', url: '/orders/1', body: [body] },
    });
    const shipment = { $body: 'Acme/Shipment', $v: 1, carrier: 'UPS' };
    const draw = (body, options = {}) => raw('FeedItem', { item: item(body) }, options);
    const registered = { FEED_BODIES: { 'Acme/Shipment': renderer('em') } };

    assert.doesNotMatch(draw(shipment), /sf-app-body|sf-body-form/);
    assert.match(draw(shipment, registered), /<em class="sf-app-body">UPS \/orders\/1<\/em>/);
    const nested = renderToString(
        h(kit.FeedProvider, registered, h(kit.FeedProvider, { FEED_BODIES: { 'Acme/Invoice': renderer('b') } },
            h(kit.FeedItem, { item: item(shipment) }), h(kit.FeedItem, { item: item({ $body: 'Acme/Invoice', carrier: 'DHL' }) }))),
    );
    assert.match(nested, /<em class="sf-app-body">UPS/);
    assert.match(nested, /<b class="sf-app-body">DHL/);
    const prose = { $body: 'Storyfeed/Body/Prose', content: 'Words' };
    assert.match(draw(prose), /sf-prose/);
    const replaced = draw(prose, { FEED_BODIES: { 'Storyfeed/Body/Prose': renderer('i') } });
    assert.match(replaced, /<i class="sf-app-body">Words/);
    assert.doesNotMatch(replaced, /sf-prose/);
    for (const name of ['toString', '__proto__', 'Acme/Unknown'])
        assert.doesNotMatch(draw({ $body: name }, registered), /sf-body-form/);
});
test('a body with no renderer draws its escaped fallback line; a renderer wins', () => {
    const draw = (body, options = {}) =>
        render('FeedItem', { item: { kind: 'activity', id: 'f', published_at: '2026-10-07T12:00:00Z', headline: 'F', actor: null, object: { label: 'Order', body: [body] } } }, options);
    assert.match(draw({ $body: 'Acme/Invoice', $fallback: '<b>Invoice</b> due' }), /<div class="sf-body-form"><p class="sf-body-fallback">&lt;b&gt;Invoice&lt;\/b&gt; due<\/p><\/div>/);
    for (const fallback of [undefined, '', '   ', 42, { text: 'x' }])
        assert.doesNotMatch(draw({ $body: 'Acme/Invoice', $fallback: fallback }), /sf-body-form/);
    const registered = draw({ $body: 'Acme/Invoice', $fallback: 'Fallback' }, { FEED_BODIES: { 'Acme/Invoice': () => h('em', null, 'Drawn') } });
    assert.match(registered, /<em[^>]*>Drawn<\/em>/);
    assert.doesNotMatch(registered, /Fallback/);
    assert.doesNotMatch(draw({ $body: 'Storyfeed/Body/Prose', content: '', $fallback: 'Fallback' }), /Fallback/);
});
test('time ranges format day-first, collapse a shared month or day, and read open ends', async () => {
    const { formatRange } = await server.ssrLoadModule('/resources/js/shared/range.ts');
    const node = (starts_at, ends_at) => ({ kind: 'activity', starts_at, ends_at });
    for (const [start, end, expected] of [
        ['2026-09-30T12:00:00Z', '2026-10-09T12:00:00Z', '30 Sep – 9 Oct 2026'],
        ['2026-10-01T12:00:00Z', '2026-10-09T12:00:00Z', '1 – 9 Oct 2026'],
        ['2026-10-09T09:00:00Z', '2026-10-09T17:00:00Z', '9 Oct 2026'],
        ['2025-12-30T12:00:00Z', '2026-01-02T12:00:00Z', '30 Dec 2025 – 2 Jan 2026'],
        ['2026-10-09T12:00:00Z', null, 'from 9 Oct 2026'],
        [null, '2026-10-31T12:00:00Z', 'until 31 Oct 2026'],
        [null, null, null],
        ['not a date', '', null],
    ]) assert.equal(formatRange(node(start, end), true, 'en-US'), expected);
    assert.equal(formatRange({ kind: 'group', starts_at: '2026-10-09T12:00:00Z' }, true), null);
    const html = render('FeedItem', { item: { ...activity, starts_at: '2026-09-30T12:00:00Z', ends_at: '2026-10-09T12:00:00Z' } });
    assert.match(html, /<\/time> · <span class="sf-meta__range">30 Sep – 9 Oct 2026<\/span>/);
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
test('group strips sample only the featured objects, never the actor, deduplicate and cap at three', () => {
    assert.match(raw('FeedGroup', { item: { ...group, sample: { objects: [photo('/picture')] } } }), /src="\/picture"/);
    for (const role of ['actors', 'targets', 'contexts', 'origins', 'results', 'instruments', 'locations', 'generators'])
        assert.doesNotMatch(raw('FeedGroup', { item: { ...group, sample: { [role]: [photo('/picture')] } } }), /src="\/picture"|class="sf-media-strip/, role);
    const html = raw('FeedGroup', {
        item: { ...group, sample: { objects: [photo('/a'), photo('/b'), photo('/a'), photo('/c'), photo('/d')] } },
    });
    assert.deepEqual(
        [...html.matchAll(/<img[^>]+src="([^"]+)"/g)].map((m) => m[1]),
        ['/a', '/b', '/c'],
    );
});
test('a group draws its featured objects as an avatar row, only from declared avatars', () => {
    const declared = (id, media) => ({ ...person(id), label: `Person ${id}`, url: `/people/${id}`, media });
    const ben = declared('ben', { icon: { src: '/ben.svg' } });
    const cara = declared('cara', { initials: 'CL', color: '#f2c94c' });
    const row = (sample, distinct = {}, extra = {}, props = {}) => {
        const html = raw('FeedGroup', { item: { ...group, sample, distinct, ...extra }, ...props });
        const section = html.split('class="sf-avatar-row ')[1]?.split('</div>')[0] ?? null;

        return section && { labels: [...section.matchAll(/aria-label="([^"]+)"/g)].map((m) => m[1]), hrefs: [...section.matchAll(/href="([^"]+)"/g)].map((m) => m[1]) };
    };

    assert.deepEqual(row({ actors: [activity.actor], objects: [ben, cara, declared('dev', { initials: 'DP', color: '#1e3a8a' })] }, { objects: 5 }),
        { labels: ['Person ben', 'Person cara', 'Person dev', '2 more'], hrefs: ['/people/ben', '/people/cara', '/people/dev'] });
    assert.deepEqual(row({ objects: [ben, cara] }, { objects: 2 }), { labels: ['Person ben', 'Person cara'], hrefs: ['/people/ben', '/people/cara'] });
    assert.equal(row({ actors: [ben, cara], objects: [declared('brief', { initials: 'BR', color: '#e11d48' })] }, { actors: 4, objects: 1 }), null);
    assert.equal(row({ objects: [ben, declared('plain', null), declared('half', { initials: 'HA' })] }), null);
    assert.equal(row({ objects: [ben, declared('ben2', { icon: { src: '/ben.svg' } })] }), null);
    assert.equal(row({ objects: [ben, { ...cara, tombstone: { formerType: 'person' } }] }), null);
    assert.equal(row({ objects: [{ ...photo('/photo'), media: { ...photo('/photo').media, icon: { src: '/i.svg' } } }, ben, cara] }), null);
    // An open static group shows its members, so no row; an interactive one hides it with CSS.
    assert.equal(row({ objects: [ben, cara] }, {}, {}, { interactive: false, collapsed: false }), null);
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

const gfmSource = '| a | b |\n|:--|--:|\n| 1 | 2 |\n\n~~gone~~ ~one~ www.example.com\n\n- [x] done\n- [ ] todo';
const gfmExpected = [
    '<table> <thead> <tr> <th align="left">a</th> <th align="right">b</th> </tr> </thead> <tbody> <tr> <td align="left">1</td> <td align="right">2</td> </tr> </tbody> </table>',
    '<p><del>gone</del> <del>one</del> <a href="http://www.example.com">www.example.com</a></p>',
    '<ul> <li><input type="checkbox" disabled checked /> done</li> <li><input type="checkbox" disabled /> todo</li> </ul>',
];
const serverTasks = '<ul>\n<li><input checked="" disabled="" type="checkbox"> shipped</li>\n<li><input disabled="" type="checkbox"> next</li>\n</ul>\n<p><input type="checkbox"> <input type="text" value="x"> <input type="checkbox" checked></p>';
test('Prose Markdown renders GitHub-flavoured Markdown, identical to Blade', () => {
    const payload = { content: gfmSource, mediaType: 'text/markdown' };
    const html = (raw('Prose', { payload })).replace(/\s+/g, ' ');
    for (const expected of gfmExpected) assert.ok(html.includes(expected), expected);
});
test('server-rendered task lists keep only their disabled checkboxes', () => {
    const payload = { content: serverTasks, mediaType: 'text/html' };
    const html = (raw('Prose', { payload })).replace(/\s+/g, ' ');
    assert.ok(html.includes('<li><input type="checkbox" disabled checked /> shipped</li> <li><input type="checkbox" disabled /> next</li>'));
    assert.equal(html.match(/<input/g).length, 2);
});
test('rich prose and ItemList render inside Typography prose at the feed size', () => {
    for (const [name, payload] of [
        ['Prose', { content: '- One', mediaType: 'text/markdown' }],
        ['ItemList', { items: ['One'] }],
    ]) {
        const html = raw(name, { payload });
        assert.match(html, /class="[^"]*\bprose max-w-none text-\[length:inherit\][^"]*"/);
        assert.doesNotMatch(html, /\bprose-(sm|base|lg|xl|2xl)\b/);
    }
});
test('a slim Excerpt v2 without truncated is truncated; v1 without it is whole', () => {
    assert.match(raw('Excerpt', { payload: { $v: 2, text: 'Part' } }), /aria-hidden="true">…/);
    assert.doesNotMatch(raw('Excerpt', { payload: { $v: 2, text: 'Whole', truncated: false } }), /…/);
    assert.doesNotMatch(raw('Excerpt', { payload: { $v: 1, text: 'Hand-written' } }), /…/);
    assert.doesNotMatch(raw('Excerpt', { payload: { text: 'Unversioned' } }), /…/);
});
test('Table draws inside prose with a tfoot, escaped cells that keep line breaks, links and an empty mark', () => {
    const payload = { $body: 'Storyfeed/Body/Table', title: 'Order <1042>', headers: ['Item', 'Price'],
        rows: [['Delivery to\n12 Harbour Street', '<b>$0</b>'], [{ label: 'Seats', href: '/seats' }, null], [{ label: 'Owned', href: null }], 'not a row'],
        footer: [['Total', 49.5]] };
    assert.match(raw('Table', { payload, entityUrl: '/orders/1' }), /class="sf-table__prose [^"]*\bprose max-w-none text-\[length:inherit\][^"]*\[&amp;_:is\(th,td\)\]:whitespace-pre-line/);
    const html = render('Table', { payload, entityUrl: '/orders/1' });
    for (const expected of [
        '<figcaption class="sf-table__title">Order &lt;1042&gt;</figcaption>',
        '<thead><tr><th>Item</th><th>Price</th></tr></thead>',
        '<tr><td>Delivery to\n12 Harbour Street</td><td>&lt;b&gt;$0&lt;/b&gt;</td></tr>',
        '<tr><td><a href="/seats" class="sf-entity">Seats</a></td><td><span class="sf-table__empty">—</span></td></tr>',
        '<tr><td><a href="/orders/1" class="sf-entity">Owned</a></td>',
        '<tfoot><tr><td>Total</td><td>49.5</td></tr></tfoot>',
    ]) assert.ok(html.includes(expected), expected);
    const slim = render('Table', { payload: { rows: [['a', 'b'], ['c']] } });
    assert.ok(slim.includes('<tbody><tr><td>a</td><td>b</td></tr><tr><td>c</td><td><span class="sf-table__empty">—</span></td></tr></tbody>'), slim);
    assert.doesNotMatch(slim, /<thead|<tfoot|<figcaption/);
    assert.equal(render('Table', { payload: { headers: ['A'] } }), '');
});
test('a call to action draws one button; modal reaches a host link, attributes are filtered, href-less goes to the entity', () => {
    const action = (href, extra = {}) => ({ label: 'See <it>', link: { href, modal: false, attributes: {}, ...extra } });
    const draw = (payload, options = {}) => render('CallToAction', { payload, entityUrl: '/roadmap' }, options);
    assert.equal(draw({ subject: 'The countdown', content: 'Five milestones.', action: action('/next', { modal: true, attributes: { target: '_blank', onclick: 'x' } }) }),
        '<div class="sf-cta"><p class="sf-cta__subject">The countdown</p><p class="sf-cta__content">Five milestones.</p><a target="_blank" href="/next" class="sf-cta__action">See &lt;it&gt;<span aria-hidden="true">→</span></a></div>');
    assert.equal(draw({ action: action('/next') }), '<a href="/next" class="sf-cta__action">See &lt;it&gt;<span aria-hidden="true">→</span></a>');
    assert.match(draw({ content: 'Mine', action: action(null) }), /href="\/roadmap"/);
    assert.equal(draw({ subject: 'Heading', action: { link: { href: '/x' } } }), '<div class="sf-cta"><p class="sf-cta__subject">Heading</p></div>');
    assert.equal(draw({ action: { label: 'No link' } }), '');
    const HostLink = ({ href, modal, children }) => h('a', { href, 'data-modal': String(modal ?? false) }, children);
    assert.match(draw({ action: action('/next', { modal: true }) }, { FEED_LINK: HostLink }), /data-modal="true"/);
    assert.match(draw({ action: action('/next') }, { FEED_LINK: HostLink }), /data-modal="false"/);
});
test('links read core 0.17\'s `link` and core 0.16\'s keys; modal reaches a host link only', async () => {
    const links = await server.ssrLoadModule('/resources/js/shared/link.ts');
    const fresh = { ...entity, url: undefined, modal: undefined, link: { href: '/orders/1', modal: true, attributes: { target: '_blank', onclick: 'x' } } };
    const legacy = { ...entity, url: '/orders/1', modal: true, attributes: { target: '_blank', onclick: 'x' } };
    const HostLink = ({ href, modal, children }) => h('a', { href, 'data-modal': String(modal) }, children);
    for (const shape of [fresh, legacy]) {
        const plain = raw('EntityLink', { entity: shape });
        assert.match(plain, /<a target="_blank" href="\/orders\/1"/);
        assert.doesNotMatch(plain, /modal|onclick/);
        assert.match(raw('EntityLink', { entity: shape }, { FEED_LINK: HostLink }), /data-modal="true"/);
        // An href-less body link is the entity's own and adds its attributes.
        const list = raw('ItemList', { payload: { items: [{ label: 'Own', href: null, modal: false, attributes: { rel: 'x' } }] }, entityLink: links.entityLink(shape) });
        assert.match(list, /href="\/orders\/1"/);
    }
});
test('flowing text is never capped; only code and verbatim blocks scroll at --sf-prose-max-h', () => {
    const cap = 'max-h-[var(--sf-prose-max-h,--spacing(96))]';
    assert.ok(raw('Prose', { payload: { content: 'code', verbatim: true } }).includes(`sf-verbatim m-0 ${cap} overflow-auto`));
    const rich = raw('Prose', { payload: { content: '**Rich**', mediaType: 'text/markdown' } });
    assert.ok(rich.includes(`[&amp;_pre]:${cap}`));
    assert.ok(!rich.includes(`sf-rich-text ${cap}`));
    assert.ok(!raw('Prose', { payload: { content: 'Plain' } }).includes(cap));
    const table = raw('Table', { payload: { rows: [['a']] } });
    assert.ok(!table.includes(cap) && table.includes('overflow-x-auto'));
});

test('a body\'s maximum height sets its wrapper: a length caps any body, none lifts the block cap too', () => {
    const draw = (body) => raw('FeedItem', { item: { kind: 'activity', id: 'm', published_at: '2026-10-07T12:00:00Z', headline: 'M', actor: null, object: { label: 'O', body: [body] } } }).match(/<div class="sf-body-form[^"]*"[^>]*>/)[0];
    const list = { $body: 'Storyfeed/Body/ItemList', items: ['One'] };
    const prose = { $body: 'Storyfeed/Body/Prose', content: 'Words' };
    assert.doesNotMatch(draw(list), /style=|max-h-\(--sf-body-max-h\)/);
    const capped = draw({ ...prose, $meta: { maxHeight: '10rem' } });
    assert.match(capped, /max-h-\(--sf-body-max-h\) overflow-y-auto/);
    assert.match(capped, /style="--sf-prose-max-h:none;--sf-body-max-h:10rem"/);
    assert.match(capped, /tabindex="0"/i);
    const none = draw({ ...prose, $meta: { maxHeight: 'none' } });
    assert.match(none, /style="--sf-prose-max-h:none"/);
    assert.doesNotMatch(none, /overflow-y-auto/);
    assert.match(draw({ ...list, $meta: { maxHeight: '8rem', other: 'x' } }), /--sf-body-max-h:8rem/);
    assert.doesNotMatch(draw({ ...list, $maxHeight: '6rem' }), /style=/);
    assert.doesNotMatch(draw({ ...prose, $meta: { other: 'x' } }), /style=/);
    for (const invalid of ['10rem;background:red', 'expression(alert(1))', 'NONE', '', 42])
        assert.doesNotMatch(draw({ ...prose, $meta: { maxHeight: invalid } }), /style=/);
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
test('a card picture keeps its shape: clamped declared ratio, whole when undeclared, square icon', () => {
    const draw = (slot, image) => raw('MediaObject', { payload: { subject: 'Post', image: slot }, entityMedia: { [slot]: { src: '/p', ...image } } });
    const frame = (html) => html.match(/<div class="(sf-media-object__image[^"]*)"(?: style="([^"]*)")?/).slice(1);
    for (const [image, ratio] of [[{ width: 1200, height: 630 }, '1.9048'], [{ width: 800, height: 800 }, '1'], [{ width: 600, height: 1200 }, '1'], [{ width: 3000, height: 1000 }, '2']]) {
        const [classes, style] = frame(draw('preview', image));
        assert.match(classes, /\bh-16\b/);
        assert.equal(style, `--sf-picture-ratio:${ratio}`);
    }
    const free = draw('preview', {});
    assert.match(frame(free)[0], /\bw-24\b/);
    assert.match(free, /\[&amp;_img\]:object-contain!/);
    const icon = frame(draw('icon', { width: 1200, height: 630 }));
    assert.match(icon[0], /\bw-16\b/);
    assert.ok(!icon[1]);
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

test('an Image body naming the icon slot draws as the linked thumbnail through host link and media seams', () => {
    const object = { ...entity, url: '/dishes/7', media: { icon: { src: '/dal-icon.jpg', width: 64, height: 64 } }, attributes: { target: '_blank', 'data-route': 'dish', href: '/wrong', onClick: 'bad()', 'bad name': 'bad', nested: {} }, body: [{ $body: 'Storyfeed/Body/Image', image: 'icon', alt: 'Dal' }, { $body: 'Storyfeed/Body/KeyValue', items: [{ key: 'Status', value: 'Ready' }] }] };
    const item = { ...activity, object };
    const props = { items: [item], grouped: false };
    const html = raw('FeedStream', props, { FEED_LINK: props => h('a', { ...props, 'data-router': 'host' }) });
    const frame = html.split('sf-object-media')[1];
    assert.match(frame, /href="\/dishes\/7"/);
    assert.match(frame, /target="_blank"/);
    assert.match(frame, /data-route="dish"/);
    assert.match(frame, /data-router="host"/);
    assert.match(frame, /alt="Dal"/);
    assert.ok(frame.indexOf('dal-icon.jpg') < frame.indexOf('Status'), 'the other bodies sit beside the thumbnail');
    assert.doesNotMatch(frame, /\/wrong|onClick|bad name|nested|sf-image/);
    let received;
    assert.match(raw('FeedStream', props, { FEED_MEDIA: props => { received = props; return h('button', { className: props.className }, 'Lightbox'); } }), /Lightbox/);
    assert.equal(received.href, '/dishes/7');
    assert.equal(received.image.src, '/dal-icon.jpg');
    assert.deepEqual(received.linkAttributes, { target: '_blank', 'data-route': 'dish' });
    assert.match(received.className, /size-10!/);
    const unlinked = raw('FeedItem', { item: { ...item, object: { ...object, url: null } } });
    assert.doesNotMatch(unlinked.split('sf-object-media')[1], /<a|target="_blank"/);
});

test('a row shows no picture its bodies did not ask for', () => {
    const icon = { src: '/dal-icon.jpg', width: 64, height: 64 };
    const object = { ...entity, url: '/dishes/7', media: { icon, preview: { src: '/dal.jpg' } }, body: [{ $body: 'Storyfeed/Body/KeyValue', items: [{ key: 'Status', value: 'Ready' }] }] };
    for (const node of [activity, group]) {
        const html = raw('FeedStream', { items: [{ ...node, object }], grouped: false });
        assert.doesNotMatch(html, /sf-object-media|<img/);
        if (node === activity) assert.match(html, /Status/);
    }
    const preview = raw('FeedItem', { item: { ...activity, object: { ...object, body: [{ $body: 'Storyfeed/Body/Image', image: 'preview' }] } } });
    assert.match(preview, /sf-image/);
    assert.doesNotMatch(preview, /sf-object-media/);
    const own = raw('FeedItem', { item: { ...activity, object: { ...object, body: [{ $body: 'Storyfeed/Body/Image', image: 'icon' }] } } }, { FEED_BODIES: { 'Storyfeed/Body/Image': () => h('p', null, 'App image') } });
    assert.match(own, /App image/);
    assert.doesNotMatch(own, /sf-object-media/);
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


test('MediaObject footnotes stand alone, resolve links and keep strings unlinked', () => {
    for (const [footnote, entityUrl, href] of [
        [{ label: 'See full discussion', href: '/discussion' }, '/current', '/discussion'],
        [{ label: 'See full discussion', href: null }, '/current', '/current'],
        [{ label: 'See full discussion', href: null }, null, null],
        ['See full discussion', '/current', null],
    ]) {
        const html = raw('MediaObject', { payload: { footnote }, entityUrl });
        assert.match(html, /<p class="sf-media-object__footnote mt-0.5 mb-0 text-sm leading-\[1.6\] text-muted-foreground">/);
        assert.match(html, /See full discussion/);
        assert.doesNotMatch(html, /<div|border-border|bg-muted|p-3/);
        if (href) assert.ok(html.includes(`href="${href}"`));
        else assert.doesNotMatch(html, /<a/);
    }
    assert.equal(raw('MediaObject', { payload: {} }), '');
    const html = raw('MediaObject', { payload: { content: 'Discussion summary', footnote: { label: 'Read more', href: '/discussion' } } });
    assert.match(html, /<div class="sf-media-object mt-1.5 flex min-w-0 max-w-128 flex-wrap items-start gap-3 rounded-lg border border-border bg-muted p-3">/);
    assert.match(html, /sf-media-object__content[^>]*>Discussion summary/);
    assert.match(html, /sf-media-object__footnote[^>]*><a href="\/discussion">Read more<\/a><\/p>/);
});

test('a long headline wraps inside its column instead of running off a narrow feed', () => {
    const html = raw('FeedItem', { item: { ...activity, headline_template: null, headline: 'IMG_20260814_120000_HDR_PANORAMA_KITCHEN.jpg' } });
    assert.match(html, /class="sf-headline[^"]*\[overflow-wrap:anywhere\]/);
});

test("an Image body draws its own picture, else the slot it names, custom slots included", async () => {
    const media = { icon: { src: '/icon.svg' }, preview: { src: '/preview.jpg', width: 160, height: 100 }, slots: { sparkline: { src: 'data:image/svg+xml,%3Csvg%2F%3E', width: 120, height: 24 } } };
    const draw = (body, entityMedia = media) => raw('Image', { payload: { $body: 'Storyfeed/Body/Image', ...body }, entityMedia });
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

test("a stored or custom-slot Image stands for its entity in a group's strip", () => {
    const photo = (id, body, media = null) => ({ type: 'document', id, label: id, url: '/' + id, body: [{ $body: 'Storyfeed/Body/Image', $v: 3, ...body }], media });
    const item = { ...group, children: [], count: 2, sample: { actors: group.sample.actors, objects: [photo('a', { src: '/own.jpg' }), photo('b', { image: 'slots.chart' }, { slots: { chart: { src: '/chart.svg' } } })] } };
    const html = raw('FeedStream', { items: [item], grouped: false });
    assert.match(html, /src="\/own\.jpg"/);
    assert.match(html, /src="\/chart\.svg"/);
});
