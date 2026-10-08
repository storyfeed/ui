import { FeedProvider, FeedStream } from '../../resources/js/react';
import { MediaObject } from '../../resources/js/react/body';
import type { FeedNode } from '../../resources/js/shared/types';
import payload from '../vue/sample-payload.json';
import bodies from '../vue/body-payload.json';
import cases from '../vue/cases.json';
export default function App() {
    const bodyItems = bodies as FeedNode[];
    const post = bodies.find((item) =>
        item.object?.body?.some(
            (body) => body.$body === 'Storyfeed/Body/MediaObject',
        ),
    )!.object!;
    const feed = (items: any, props: any = {}) => (
        <FeedStream items={items} {...props} />
    );
    return (
        <FeedProvider
            FEED_NOW={Date.parse('2026-08-14T15:00:00Z')}
            FEED_COMPONENTS={{
                'App/Message': ({ message }) => <strong>{message}</strong>,
            }}
        >
            <main className="comparison single">
                <article className="pane converted">
                    <h1>React</h1>
                    {feed(payload.items, { nextCursor: payload.next_cursor })}
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
                    <section className="example">
                        <h2>Per-item divider</h2>
                        {feed(bodyItems.slice(0, 1), {
                            grouped: false,
                            dividers: { 'body-0': 'Timeline' },
                        })}
                    </section>
                    <section className="example">
                        <h2>Branch divider (extension)</h2>
                        {feed(bodyItems.slice(0, 1), {
                            grouped: false,
                            dividers: { 'body-0': 'Timeline' },
                            dividerStyle: 'branch',
                        })}
                    </section>
                    {cases
                        .filter(
                            (example) =>
                                !example.items.some(
                                    (item) => item.axis === 'summary',
                                ),
                        )
                        .map((example) => (
                            <section key={example.name} className="example">
                                <h2>{example.name}</h2>
                                {feed(example.items, {
                                    rail: example.rail,
                                    childRail: example.childRail,
                                    grouped: example.grouped ?? false,
                                })}
                            </section>
                        ))}
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
