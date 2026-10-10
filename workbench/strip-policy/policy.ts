import { imageOf } from '../../resources/js/shared/body';
import type { FeedEntity, GroupNode } from '../../resources/js/shared/types';

/**
 * Strip policies to compare (scratchpad 680). Most rewrite only the group's
 * `sample.featured` / `distinct.featured`, so the real, unchanged kit draws
 * the result (an empty list draws no strip). A `mock` variant suppresses the
 * kit's strip and draws `MockStrip` in its place, for tiles the kit lacks.
 */
export type MockTile = { label: string; image: Record<string, any> | null };
export type Variant = { key: string; title: string; rule: string; group: GroupNode; childRail?: string; mock?: { tiles: MockTile[]; overflow: number } };

/**
 * Governing principle (2026-10-10): a tile may only show what the expanded
 * member row draws. A row draws a picture only from an Image body, so a
 * declared media.icon alone no longer counts. The page checks each tile
 * against the expanded rows rather than trusting this.
 */
const pictureOf = (entity: FeedEntity): Record<string, any> | null => imageOf(entity);

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
        const faces = withStrip(group, (group.sample.actors ?? []) as FeedEntity[], actors);

        return [
            current,
            { key: 'faces-activity', title: 'Faces, child-rail="activity-only"', rule: 'Members draw the verb glyph, not faces.', group: faces, childRail: 'activity-only' },
            { key: 'faces-actor', title: 'Faces, child-rail="actor"', rule: 'Members draw their actor\'s face.', group: faces, childRail: 'actor' },
        ];
    }

    const featured = (group.sample.featured ?? []) as FeedEntity[];
    const pictured = featured.filter(entity => pictureOf(entity));

    if (pictured.length === 0) {
        return [
            current,
            { key: 'refined', title: 'Refined: no strip', rule: 'One actor, no member row draws a picture: just the headline and Show all.', group: none(group) },
            { key: 'names', title: 'Name tiles only', rule: 'Mock: every member as a quiet name tile, the whole label.', group: none(group), mock: nameTiles(group) },
        ];
    }

    if (pictured.length === featured.length) {
        return [current, { key: 'refined', title: 'Refined', rule: 'Every member row draws its picture: the strip, as today.', group }];
    }

    return [
        current,
        { key: 'a', title: '(a) Pictured only', rule: 'Picked: tiles only for pictured members; "+N" counts the rest.', group: withStrip(group, pictured, group.count) },
        { key: 'a-prime', title: "(a') Pictured + name tiles", rule: 'Mock: unpictured members as quiet name tiles instead of initials.', group: none(group), mock: nameTiles(group) },
    ];
}
