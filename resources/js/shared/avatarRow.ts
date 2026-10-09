import { declaredColor } from './avatar';
import type { FeedEntity, GroupNode } from './types';

/**
 * The entities a group features: what the row is about, never who did it.
 * That is the object until core lets an activity name another featured role;
 * it never falls back to the actor or any other role.
 */
export function featured(group: GroupNode): FeedEntity[] {
    return group.sample?.objects ?? [];
}

/**
 * The avatar an entity declares: `media.icon`, or `media.initials` on a
 * `media.color` disc. Null when it declares neither, or has been deleted, so
 * an entity without one contributes nothing rather than a derived default.
 */
function declaredAvatar(entity: FeedEntity): string | null {
    if (!entity || entity.tombstone) return null;

    const icon = entity.media?.icon?.src;
    if (typeof icon === 'string' && icon !== '') return `icon:${icon}`;

    const initials = entity.media?.initials;
    const color = declaredColor(entity.media);

    return typeof initials === 'string' && initials !== '' && color ? `initials:${initials}:${color.toLowerCase()}` : null;
}

/**
 * A group's featured entities as a row of avatars, or null when the row would
 * add nothing: fewer than two declared avatars, or every one the same picture.
 * `overflow` is the true total less the sampled entities, never a guess.
 */
export function avatarRow(group: GroupNode): { entities: FeedEntity[]; overflow: number } | null {
    const sampled = featured(group);
    const entities = sampled.filter((entity) => declaredAvatar(entity) !== null);

    if (entities.length < 2 || new Set(entities.map(declaredAvatar)).size < 2) return null;

    const total = group.distinct?.objects;

    return { entities, overflow: typeof total === 'number' ? Math.max(total - sampled.length, 0) : 0 };
}
