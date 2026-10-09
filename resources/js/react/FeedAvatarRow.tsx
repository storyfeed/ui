import EntityAvatar from './EntityAvatar';
import { useFeedOptions } from './context';
import { linkAttributes } from '../shared/linkAttributes';
import type { FeedEntity } from '../shared/types';
/**
 * A group's featured entities, as a row of their avatars. Each avatar links to
 * its entity and is labelled with its name; the overflow disc counts the ones
 * not sampled.
 */
export default function FeedAvatarRow({
    entities,
    overflow = 0,
}: {
    entities: FeedEntity[];
    overflow?: number;
}) {
    const { FEED_LINK: Link = 'a' } = useFeedOptions();
    return (
        <div className="sf-avatar-row mt-2 flex items-center [&>*+*]:-ml-1">
            {entities.map((entity, i) =>
                entity.url && !entity.tombstone ? (
                    <Link
                        key={i}
                        {...linkAttributes(entity.attributes)}
                        href={entity.url}
                        className="sf-avatar-row__link flex shrink-0 rounded-full focus-visible:outline-2 focus-visible:outline-ring"
                    >
                        <EntityAvatar entity={entity} />
                    </Link>
                ) : (
                    <EntityAvatar key={i} entity={entity} />
                ),
            )}
            {!!overflow && (
                <span
                    role="img"
                    aria-label={`${overflow} more`}
                    className="sf-avatar-row__more flex size-[var(--sf-disc,--spacing(8))] shrink-0 items-center justify-center rounded-full bg-border text-xs font-semibold text-foreground select-none ring-2 ring-background"
                >
                    +{overflow}
                </span>
            )}
        </div>
    );
}
