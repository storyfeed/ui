import { FeedProvider, FeedStream } from '../../resources/js/react';
import payload from '../vue/sample-payload.json';
import bodies from '../vue/body-payload.json';
import cases from '../vue/cases.json';
import type { FeedNode } from '../../resources/js/shared/types';
export default function HydrationFixture({
    pinned = false,
}: {
    pinned?: boolean;
}) {
    const item = {
        ...payload.items[0],
        published_at: '2026-10-07T12:00:05Z',
    } as FeedNode;
    return (
        <FeedProvider
            FEED_NOW={pinned ? Date.parse('2026-10-07T12:00:10Z') : undefined}
            FEED_COMPONENTS={{
                'App/Message': ({ message }) => <strong>{message}</strong>,
            }}
        >
            <FeedStream
                items={
                    [
                        item,
                        ...bodies,
                        ...cases
                            .filter(
                                (example) =>
                                    !example.items.some(
                                        (item) => item.axis === 'summary',
                                    ),
                            )
                            .flatMap((example) => example.items),
                    ].map((node, index) => ({
                        ...node,
                        id: `hydration-${index}`,
                    })) as FeedNode[]
                }
            />
        </FeedProvider>
    );
}
