import { Fragment } from 'react';
import type { ReactNode } from 'react';
import type {
    FeedEntities,
    FeedEntity,
    FeedRole,
    FeedSingularRole,
} from '../shared/types';
import EntityLink from './EntityLink';
export function EntityList({
    entities,
    overflow = 0,
}: {
    entities: FeedEntity[];
    overflow?: number;
}) {
    return (
        <>
            {entities.map((entity, i) => (
                <Fragment key={`${entity.type}:${entity.id}:${i}`}>
                    <EntityLink entity={entity} />
                    {overflow === 0 && i === entities.length - 2
                        ? ' and '
                        : i < entities.length - 1
                          ? ', '
                          : ''}
                </Fragment>
            ))}
            {overflow > 0 ? ` and ${overflow} more` : ''}
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
    let content: ReactNode;
    if (template)
        content = template
            .split(/(:[a-z_]+)/g)
            .filter(Boolean)
            .map((segment, i) => {
                const role = segment.slice(1);
                let part: ReactNode = segment;
                if (segment.startsWith(':') && roles.includes(role))
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
                            overflow={Math.max(
                                0,
                                (distinct[role as FeedRole] ?? 0) - list.length,
                            )}
                        />
                    );
                } else if (segment === ':count') part = count;
                else if (segment === ':others')
                    part = `${Math.max(0, (distinct.actors ?? 0) - (sample.actors ?? []).length)} others`;
                return <Fragment key={i}>{part}</Fragment>;
            });
    else
        content =
            headline ||
            (aggregate ? (
                ` ${count} activities `
            ) : (
                <>
                    <EntityLink
                        entity={entities.actor ?? null}
                        fallback="Someone"
                    />
                    {' ' + verb}
                    {entities.object && (
                        <>
                            {' '}
                            <EntityLink entity={entities.object} />
                        </>
                    )}
                </>
            ));
    return (
        <span className="sf-headline leading-[1.6] text-muted-foreground">
            {content}
        </span>
    );
}
