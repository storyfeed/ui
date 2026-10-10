import { imageOf } from './body';
import { entityLink, type ResolvedLink } from './link';
import type { ActivityNode, FeedEntity, GroupNode } from './types';

/**
 * A group's strip: one tile per member activity, previewing what that member's
 * expanded row shows (ui#47). Mirrors `Strip::of()`.
 *
 * A tile only shows what the row below draws. A member whose row draws a
 * picture (its featured entity's Image body) gets that picture; every other
 * member gets a quiet name tile, its featured entity's label, which the
 * member's headline names. Never initials, and an icon the entity declares
 * counts only when an Image body draws it. Every tile is the same rounded
 * square.
 */
export type StripTile = {
    entity: FeedEntity;
    /** The picture, or null for a name tile (the entity's label). */
    image: Record<string, any> | null;
    /** What a name tile reads. */
    label: string | null;
    href: string | null;
    linkAttributes?: Record<string, unknown>;
    /** The entity's whole link (modal included), for a name tile's anchor. */
    link?: ResolvedLink | null;
};

/** How many tiles fit the strip's one row, the "+N" tile included. */
export const STRIP_SLOTS = 4;

/** The members a strip samples, newest first: the group's own. */
export function stripMembers(group: GroupNode): ActivityNode[] {
    return group.children ?? [];
}

/**
 * The entity a member activity features: the role it names in `featured`
 * (storyfeed/storyfeed#76), none when that is null, and the object before
 * core sent the field.
 */
export function featuredOf(member: ActivityNode): FeedEntity | null {
    if (!member) return null;
    if (!('featured' in member)) return member.object ?? null;

    return member.featured ? ((member as Record<string, any>)[member.featured] ?? null) : null;
}

/**
 * The entities a strip draws, one per sampled member, newest first: core's
 * `sample.featured` when it sends one (storyfeed/storyfeed#93), else each
 * member's own featured entity. With the total of members that feature one.
 */
export function stripEntities(group: GroupNode): { entities: FeedEntity[]; total: number } {
    const featured = group.sample?.featured;
    if (Array.isArray(featured)) {
        const total = group.distinct?.featured;

        return { entities: featured, total: Math.max(typeof total === 'number' ? total : group.count ?? 0, featured.length) };
    }

    const entities = stripMembers(group).map(featuredOf).filter((entity): entity is FeedEntity => Boolean(entity));

    return { entities, total: Math.max(group.count ?? 0, entities.length) };
}

function tileOf(entity: FeedEntity): StripTile {
    const link = entityLink(entity);
    const label = typeof entity.label === 'string' && entity.label.trim() !== '' ? entity.label : null;

    return { entity, image: imageOf(entity), label, href: link?.href ?? null, linkAttributes: link?.attributes, link };
}

/** What makes two tiles the same picture: its src, else the entity it stands for. */
function sameness(tile: StripTile): string {
    return tile.image ? `src:${tile.image.src}` : `entity:${tile.entity.type ?? ''}:${tile.entity.id ?? ''}:${tile.entity.tombstone ? 'gone' : ''}`;
}

/**
 * The tiles and the "+N" count, or null when the strip would show nothing new:
 * no featured entity, or every tile the same. Up to four tiles; past that,
 * three and a "+N" tile counting the members not shown. A member with neither
 * a picture nor a label has nothing to preview, so the "+N" counts it.
 */
export function strip(group: GroupNode): { tiles: StripTile[]; overflow: number } | null {
    const { entities, total } = stripEntities(group);
    const all = entities.map(tileOf).filter((tile) => tile.image || tile.label);
    if (new Set(all.map(sameness)).size < 2) return null;

    const tiles = all.slice(0, total > STRIP_SLOTS ? STRIP_SLOTS - 1 : STRIP_SLOTS);

    return { tiles, overflow: total - tiles.length };
}
