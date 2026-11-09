import { useEffect, useState } from 'react';
import { FeedProvider, FeedStream } from '../../resources/js/react';
import { MediaObject } from '../../resources/js/react/body';
import type { FeedNode } from '../../resources/js/shared/types';
import Shipment from './Shipment';
import payload from '../vue/sample-payload.json';
import bodies from '../vue/body-payload.json';
import cases from '../vue/cases.json';
let copies = 0;
const copy = (node: any) => ({ ...node, id: `${node.id}-copy-${++copies}` }) as FeedNode;
const grown = (group: any) => ({ ...group, count: group.count + 1, distinct: { ...group.distinct, objects: group.distinct.objects + 1 } }) as FeedNode;
export default function App() {
    // The motion harness (ui#30) stands in for a host: a Live arrival at the
    // head, and a page of older activity under the rest.
    const [main, setMain] = useState(payload.items as FeedNode[]);
    useEffect(() => {
        (window as any).storyfeedWorkbench = {
            arrive: () => setMain((now) => [copy(payload.items[1]), ...now]),
            page: () => setMain((now) => [...now, ...payload.items.slice(2, 4).map(copy)]),
            // One more member in the first group: "and 4 more" becomes "and 5 more".
            grow: () => setMain((now) => now.map((node, i) => (i === now.findIndex((n) => n.kind === 'group') ? grown(node) : node))),
        };
    }, []);
    const bodyItems = bodies as FeedNode[];
    const post = bodies.find((item) =>
        item.object?.body?.some(
            (body) => body.$body === 'Storyfeed/Body/MediaObject',
        ),
    )!.object!;
    // The axe check's load-more case (workbench/a11y.mjs); off the parity pages, where Blade's pager differs by design.
    const a11y = new URLSearchParams(location.search).has('a11y');
    const feed = (items: any, props: any = {}) => (
        <FeedStream items={items} {...props} />
    );
    return (
        <FeedProvider
            FEED_NOW={Date.parse('2026-08-14T15:00:00Z')}
            FEED_COMPONENTS={{
                'App/Message': ({ message }) => <strong>{message}</strong>,
            }}
            FEED_BODIES={{ 'Acme/Shipment': Shipment }}
        >
            <main className="comparison single">
                <article className="pane converted">
                    <h1>React</h1>
                    {feed(main, { nextCursor: payload.next_cursor })}
                    <section className="example">
                        <h2>Generic body forms</h2>
                        {feed(bodyItems, { grouped: false })}
                    </section>
                    {(
                        [
                            'actor',
                            'activity',
                            'actor-only',
                            'activity-only',
                        ] as const
                    ).map((rail) => (
                        <section key={rail} className="example">
                            <h2>{rail}</h2>
                            {feed(bodyItems.slice(0, 1), {
                                grouped: false,
                                rail,
                            })}
                        </section>
                    ))}
                    {a11y && (
                        <section className="example">
                            <h2>Load more</h2>
                            {feed(bodyItems.slice(0, 1), {
                                grouped: false,
                                nextCursor: 'workbench-next-page',
                            })}
                        </section>
                    )}
                    <section className="example">
                        <h2>Per-item divider</h2>
                        {feed(bodyItems.slice(0, 1), {
                            grouped: false,
                            dividers: { 'body-0': 'Timeline' },
                        })}
                    </section>
                    <section className="example">
                        <h2>Dot divider (option)</h2>
                        {feed(bodyItems.slice(0, 1), {
                            grouped: false,
                            dividers: { 'body-0': 'Timeline' },
                            dividerStyle: 'dot',
                        })}
                    </section>
                    {cases.map((example) => (
                        <section key={example.name} className="example">
                            <h2>{example.name}</h2>
                            {feed(example.items, {
                                rail: example.rail,
                                childRail: example.childRail,
                                grouped: example.grouped ?? false,
                                interactive: example.interactive ?? true,
                                collapsed: example.collapsed ?? null,
                            })}
                        </section>
                    ))}
                    <section className="example">
                        <h2>Steps</h2>
                        {feed(bodyItems.slice(0, 3).map((node: any, i: number) => ({ ...node, id: `step-${i}`, published_at: null })), {
                            marker: ({ node, isLast }: any) => <span className="sf-step flex size-8 shrink-0 items-center justify-center rounded-full border border-border text-sm" data-last={String(isLast)}>{Number(node.id.slice(5)) + 1}</span>,
                            headline: ({ node }: any) => (node.id === 'step-1' ? null : `Step ${Number(node.id.slice(5)) + 1}`),
                        })}
                    </section>
                    <section className="example">
                        <h2>MediaObject below</h2>
                        <div className="sf-feed text-sm leading-[1.6] text-muted-foreground">
                            <MediaObject
                                payload={post.body![0]}
                                entityMedia={post.media}
                                entityUrl={post.url}
                                imagePlacement="below"
                            />
                        </div>
                    </section>
                </article>
            </main>
        </FeedProvider>
    );
}
