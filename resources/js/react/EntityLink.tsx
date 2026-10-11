import type { FeedEntity } from '../shared/types';
import { useFeedOptions } from './context';
import { entityLink, linkProps } from '../shared/link';
export default function EntityLink({
    entity,
    fallback,
}: {
    entity: FeedEntity | null;
    /** Rendered for a null entity: an anonymous actor's "Someone", drawn as an actor. */
    fallback?: string;
}) {
    const { FEED_LINK: Link = 'a' } = useFeedOptions();
    const tombstone = entity?.tombstone;
    const noun = tombstone
        ? `removed ${tombstone.formerType.replace(/[._-]/g, ' ')}`
        : '';
    const label = !entity
        ? (fallback ?? 'something')
        : tombstone
          ? (entity.label ?? `${/^[aeiou]/i.test(noun) ? 'an' : 'a'} ${noun}`)
          : (entity.label ?? 'Something');
    const classes =
        'sf-entity font-medium text-foreground no-underline underline-offset-2 hover:underline';
    // Core 0.17's `link`, or 0.16's `url`, `modal` and `attributes`.
    const link = entityLink(entity);
    if (link) {
        // `modal` belongs to a host router component, rather than the native anchor.
        return (
            <Link {...linkProps(link, Link)} className={classes}>
                {label}
            </Link>
        );
    }
    return (
        <span
            className={`${classes}${tombstone ? ' sf-entity--tombstone text-muted-foreground font-normal' : !entity && fallback ? ' sf-entity--anonymous text-muted-foreground' : !entity?.label ? ' sf-entity--unknown italic text-muted-foreground font-normal' : ''}`}
        >
            {label}
        </span>
    );
}
