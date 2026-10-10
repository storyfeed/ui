import { imageOf } from './body';
import { entityLink, type ResolvedLink } from './link';
import type { ActivityNode, FeedEntity, GroupNode } from './types';

/**
 * A group's strip: one tile per member activity, each the thumbnail of what
 * that activity features (ui#27). Mirrors `Strip::of()`.
 *
 * A tile is the featured entity's picture (its Image body, else its icon),
 * else its avatar: the initials on the colour core derives for every entity.
 * So a member never leaves a blank. Every tile is the same rounded square,
 * whether it stands for a person or a thing.
 */
export type StripTile = {
    entity: FeedEntity;
    /** The picture, or null for an avatar tile (initials on the entity's colour). */
    image: Record<string, any> | null;
    href: string | null;
    linkAttributes?: Record<string, unknown>;
    /** The entity's whole link (modal included), for an avatar tile's anchor. */
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
    const icon = entity.tombstone ? null : entity.media?.icon;
    const image = imageOf(entity) ?? (icon?.src ? { ...icon, alt: icon.alt ?? entity.label ?? '' } : null);

    return { entity, image, href: link?.href ?? null, linkAttributes: link?.attributes, link };
}

/** What makes two tiles the same picture: its src, else the entity it stands for. */
function sameness(tile: StripTile): string {
    return tile.image ? `src:${tile.image.src}` : `entity:${tile.entity.type ?? ''}:${tile.entity.id ?? ''}:${tile.entity.tombstone ? 'gone' : ''}`;
}

/**
 * The tiles and the "+N" count, or null when the strip would show nothing new:
 * no featured entity, or every tile the same picture. Up to four tiles; past
 * that, three and a "+N" tile counting the members not shown.
 */
export function strip(group: GroupNode): { tiles: StripTile[]; overflow: number } | null {
    const { entities, total } = stripEntities(group);
    const all = entities.map(tileOf);
    if (new Set(all.map(sameness)).size < 2) return null;

    const tiles = all.slice(0, total > STRIP_SLOTS ? STRIP_SLOTS - 1 : STRIP_SLOTS);

    return { tiles, overflow: total - tiles.length };
}
