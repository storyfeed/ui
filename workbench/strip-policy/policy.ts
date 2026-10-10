import { imageOf } from '../../resources/js/shared/body';
import type { FeedEntity, GroupNode } from '../../resources/js/shared/types';

/**
 * Strip policies to compare (scratchpad 680). Each rewrites only the group's
 * `sample.featured` / `distinct.featured`, so the real, unchanged kit draws
 * the result: an empty list draws no strip.
 */
export type Variant = { key: string; title: string; rule: string; group: GroupNode };

const photo = (entity: FeedEntity) => Boolean(imageOf(entity));
const icon = (entity: FeedEntity) => Boolean(!entity.tombstone && (entity as any).media?.icon?.src);

function withStrip(group: GroupNode, featured: FeedEntity[], total?: number): GroupNode {
    const copy = structuredClone(group) as any;
    copy.sample = { ...copy.sample, featured };
    copy.distinct = { ...copy.distinct, featured: total ?? copy.count };

    return copy;
}

const none = (group: GroupNode) => withStrip(group, [], 0);

export function variants(group: GroupNode): Variant[] {
    const current: Variant = { key: 'current', title: 'Current', rule: 'One tile per member: its picture, else its initials.', group };
    const actors = group.distinct?.actors ?? 0;

    if (actors > 1) {
        return [current, {
            key: 'refined',
            title: 'Refined',
            rule: 'Several actors: the strip shows the actors, initials allowed.',
            group: withStrip(group, (group.sample.actors ?? []) as FeedEntity[], actors),
        }];
    }

    const featured = (group.sample.featured ?? []) as FeedEntity[];
    const withPhoto = featured.filter(photo);
    const withPicture = featured.filter(entity => photo(entity) || icon(entity));

    if (withPicture.length === 0) {
        return [current, { key: 'refined', title: 'Refined', rule: 'One actor, no pictures: no strip, just the headline and Show all.', group: none(group) }];
    }

    if (withPicture.length === featured.length && withPhoto.length === 0) {
        return [
            current,
            { key: 'icon-counts', title: 'Refined, icon counts', rule: 'A declared media.icon is a real picture: the strip draws the icons.', group },
            { key: 'photos-only', title: 'Refined, photos only', rule: 'Only an Image body or preview counts: no strip.', group: none(group) },
        ];
    }

    if (withPicture.length === featured.length) {
        return [current, { key: 'refined', title: 'Refined', rule: 'Every member has a picture: the strip, as today.', group }];
    }

    const most = withPicture.length * 2 > featured.length;

    return [
        current,
        { key: 'a', title: '(a) Pictured only', rule: 'Tiles only for members with pictures; "+N" counts the rest.', group: withStrip(group, withPicture, group.count) },
        { key: 'b', title: '(b) All or nothing', rule: 'A strip only when every member has a picture.', group: none(group) },
        { key: 'c', title: '(c) Most', rule: `A strip when most sampled members have one (${withPicture.length} of ${featured.length}); the rest fall back to initials.`, group: most ? group : none(group) },
    ];
}
