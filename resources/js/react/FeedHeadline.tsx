import { Fragment, useLayoutEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import type {
    FeedEntities,
    FeedEntity,
    FeedRole,
    FeedSingularRole,
} from '../shared/types';
import EntityLink from './EntityLink';
import { fadeChanged } from '../shared/motion';
import { useFeedOptions } from './context';
import { isViewer, you, VIEWER_CLASSES } from '../shared/viewer';
import type { FeedViewer } from '../shared/viewer';
export function EntityList({
    entities,
    overflow = 0,
    viewer = null,
    first = false,
}: {
    entities: FeedEntity[];
    overflow?: number;
    /** The page's reader, named "You" (ui#75). */
    viewer?: FeedViewer | null;
    /** Whether the list opens the sentence. */
    first?: boolean;
}) {
    return (
        <>
            {entities.map((entity, i) => (
                <Fragment key={`${entity.type}:${entity.id}:${i}`}>
                    {isViewer(viewer, entity) ? (
                        <span className={VIEWER_CLASSES}>{you(first && i === 0)}</span>
                    ) : (
                        <EntityLink entity={entity} />
                    )}
                    {overflow === 0 && i === entities.length - 2
                        ? ' and '
                        : i < entities.length - 1
                          ? ', '
                          : ''}
                </Fragment>
            ))}
            {overflow > 0 ? <> and <span data-sf-part="more">{overflow}</span> more</> : ''}
        </>
    );
}
export interface HeadlineProps {
    template: string | null;
    headline?: string | null;
    entities: FeedEntities;
    sample?: Partial<Record<FeedRole, FeedEntity[]>>;
    distinct?: Partial<Record<FeedRole, number>>;
    count?: number;
    verb: string | null;
    aggregate?: boolean;
}
const roles = [
    'actor',
    'object',
    'target',
    'context',
    'instrument',
    'origin',
    'result',
    'location',
    'generator',
];
export default function FeedHeadline({
    template,
    headline,
    entities,
    sample = {},
    distinct = {},
    count = 0,
    verb,
    aggregate,
}: HeadlineProps) {
    const { FEED_VIEWER: viewer = null, headlineText = (text: string) => text } = useFeedOptions();
    let content: ReactNode;
    if (template)
        content = template
            .split(/(:[a-z_]+)/g)
            .filter(Boolean)
            .map((segment, i) => {
                const role = segment.slice(1);
                let part: ReactNode = segment;
                if (
                    segment.startsWith(':') &&
                    roles.includes(role) &&
                    isViewer(viewer, entities[role as FeedSingularRole])
                )
                    part = <span className={VIEWER_CLASSES}>{you(i === 0)}</span>;
                else if (segment.startsWith(':') && roles.includes(role))
                    part = (
                        <EntityLink
                            entity={entities[role as FeedSingularRole] ?? null}
                            fallback={role === 'actor' ? 'Someone' : undefined}
                        />
                    );
                else if (
                    segment.startsWith(':') &&
                    roles.some((r) => `${r}s` === role)
                ) {
                    const list = sample[role as FeedRole] ?? [];
                    part = (
                        <EntityList
                            entities={list}
                            viewer={viewer}
                            first={i === 0}
                            overflow={Math.max(
                                0,
                                (distinct[role as FeedRole] ?? 0) - list.length,
                            )}
                        />
                    );
                } else if (segment === ':count') part = <span data-sf-part="count">{count}</span>;
                else if (segment === ':others')
                    part = <><span data-sf-part="others">{Math.max(0, (distinct.actors ?? 0) - (sample.actors ?? []).length)}</span> others</>;
                else part = headlineText(segment);
                return <Fragment key={i}>{part}</Fragment>;
            });
    else if (headline) content = headlineText(headline);
    else
        content =
            (aggregate ? (
                <> <span data-sf-part="count">{count}</span> activities </>
            ) : (
                <>
                    {isViewer(viewer, entities.actor) ? (
                        <span className={VIEWER_CLASSES}>{you(true)}</span>
                    ) : (
                        <EntityLink
                            entity={entities.actor ?? null}
                            fallback="Someone"
                        />
                    )}
                    {verb && ' ' + verb}
                    {entities.object && (
                        <>
                            {' '}
                            <EntityLink entity={entities.object} />
                        </>
                    )}
                </>
            ));
    // A number that changes in place fades in on its own (ui#30).
    const root = useRef<HTMLSpanElement>(null);
    useLayoutEffect(() => fadeChanged(root.current));
    return (
        <span ref={root} className="sf-headline leading-[1.6] text-pretty text-muted-foreground [overflow-wrap:anywhere]">
            {content}
        </span>
    );
}
