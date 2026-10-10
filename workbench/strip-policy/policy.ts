import { imageOf } from '../../resources/js/shared/body';
import type { FeedEntity, GroupNode } from '../../resources/js/shared/types';

/**
 * Strip policies to compare (scratchpad 680). Most rewrite only the group's
 * `sample.featured` / `distinct.featured`, so the real, unchanged kit draws
 * the result (an empty list draws no strip). A `mock` variant suppresses the
 * kit's strip and draws `MockStrip` in its place, for tiles the kit lacks.
 */
export type MockTile = { label: string; image: Record<string, any> | null };
export type Variant = { key: string; title: string; rule: string; group: GroupNode; mock?: { tiles: MockTile[]; overflow: number } };

/** Ruled 2026-10-10: a real photo/image, or an icon the app declared (media.icon). */
const pictureOf = (entity: FeedEntity): Record<string, any> | null => {
    const image = imageOf(entity);
    if (image) return image;
    const icon = !entity.tombstone ? (entity as any).media?.icon : null;

    return icon?.src ? { ...icon, alt: icon.alt ?? entity.label ?? '' } : null;
};

function withStrip(group: GroupNode, featured: FeedEntity[], total?: number): GroupNode {
    const copy = structuredClone(group) as any;
    copy.sample = { ...copy.sample, featured };
    copy.distinct = { ...copy.distinct, featured: total ?? copy.count };

    return copy;
}

const none = (group: GroupNode) => withStrip(group, [], 0);

/** Every sampled member as a tile: its picture, else a quiet name tile. Mirrors the kit's 4 slots. */
function nameTiles(group: GroupNode): { tiles: MockTile[]; overflow: number } {
    const featured = (group.sample.featured ?? []) as FeedEntity[];
    const tiles = featured.map(entity => ({ label: entity.label ?? '', image: pictureOf(entity) }))
        .slice(0, group.count > 4 ? 3 : 4);

    return { tiles, overflow: group.count - tiles.length };
}

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
    const pictured = featured.filter(entity => pictureOf(entity));

    if (pictured.length === 0) {
        return [
            current,
            { key: 'refined', title: 'Refined: no strip', rule: 'One actor, nothing pictured: just the headline and Show all.', group: none(group) },
            { key: 'names', title: 'Name tiles only', rule: 'Mock: every member as a quiet name tile, the whole label.', group: none(group), mock: nameTiles(group) },
        ];
    }

    if (pictured.length === featured.length) {
        return [current, { key: 'refined', title: 'Refined', rule: 'Every member pictured (a photo, or an icon the app declared): the strip, as today.', group }];
    }

    return [
        current,
        { key: 'a', title: '(a) Pictured only', rule: 'Picked: tiles only for pictured members; "+N" counts the rest.', group: withStrip(group, pictured, group.count) },
        { key: 'a-prime', title: "(a') Pictured + name tiles", rule: 'Mock: unpictured members as quiet name tiles instead of initials.', group: none(group), mock: nameTiles(group) },
    ];
}
