import type { FeedEntityMap, FeedMediaMap, FeedNode, FeedPagePayload, FeedPayload } from './types';

/** Any page a controller hands the kit: core <=0.18's `FeedPayload`, core #95's paginator JSON, or `get()`'s plain list. */
export type FeedPageLike = FeedPayload | FeedPagePayload | FeedNode[] | null | undefined;

/**
 * A page's media map (storyfeed/storyfeed#242): `{ link, media }` per
 * `media_ref`. A missing or empty map, including PHP's empty `[]`, is none.
 */
export function readMediaMap(page: FeedPageLike): FeedMediaMap {
    if (!page || typeof page !== 'object' || Array.isArray(page)) return {};
    const map = (page as { media?: unknown }).media;

    return map && typeof map === 'object' && !Array.isArray(map) ? (map as FeedMediaMap) : {};
}

/**
 * A page's entity map (storyfeed/storyfeed#249): each distinct entity by its
 * `entity_ref`. A missing or empty map, including PHP's empty `[]`, is none.
 */
export function readEntityMap(page: FeedPageLike): FeedEntityMap {
    if (!page || typeof page !== 'object' || Array.isArray(page)) return {};
    const map = (page as { entities?: unknown }).entities;

    return map && typeof map === 'object' && !Array.isArray(map) ? (map as FeedEntityMap) : {};
}

/**
 * Nodes with every entity's `link` and `media` read from the page's map by
 * its `media_ref`, falling back to the inline copies. Mirrors `Page::resolve()`.
 */
export function resolveMedia<T>(value: T, map: FeedMediaMap): T {
    return resolveEntities(value, {}, map);
}

/**
 * Nodes with every entity read from the page's entity map by its
 * `entity_ref`, falling back to the inline copy (a `{type, id, entity_ref}`
 * stub with core's `inline_entities` off), then its `link` and `media` from
 * the media map by `media_ref`. Every depth resolves: roles, group pinned
 * roles, samples, featured and children. Mirrors `Page::resolve()`.
 */
export function resolveEntities<T>(value: T, entities: FeedEntityMap, media: FeedMediaMap): T {
    if (Object.keys(entities).length === 0 && Object.keys(media).length === 0) return value;

    return resolve(value, entities, media) as T;
}

function resolve(value: unknown, entities: FeedEntityMap, map: FeedMediaMap): unknown {
    if (Array.isArray(value)) return value.map((child) => resolve(child, entities, map));
    if (!value || typeof value !== 'object') return value;

    const eref = (value as Record<string, unknown>).entity_ref;
    const entity = typeof eref === 'string' && Object.hasOwn(entities, eref) ? entities[eref] : undefined;
    const source = entity && typeof entity === 'object' && !Array.isArray(entity) ? { ...value, ...entity } : value;

    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(source)) out[key] = resolve(child, entities, map);

    const ref = out.media_ref;
    const entry = typeof ref === 'string' && Object.hasOwn(map, ref) ? map[ref] : undefined;
    if (entry && typeof entry === 'object') {
        if ('link' in entry) out.link = entry.link;
        if ('media' in entry) out.media = entry.media;
    }

    return out;
}

/**
 * A page's nodes and next cursor, whichever shape core sent. From
 * storyfeed/storyfeed#95 the nodes are under `data` (Laravel's paginator
 * JSON) and `get()` is a plain list; before it they were under `items`.
 * Entities read from the page's `entities` map (#249), then `link` and
 * `media` from its `media` map (#242).
 * Mirrors `Page::read()`.
 */
export function readPage(page: FeedPageLike): { items: FeedNode[]; nextCursor: string | null } {
    if (Array.isArray(page)) return { items: page, nextCursor: null };
    if (!page || typeof page !== 'object') return { items: [], nextCursor: null };

    const items = 'data' in page && Array.isArray(page.data) ? page.data : 'items' in page && Array.isArray(page.items) ? page.items : [];
    const cursor = page.next_cursor;

    return { items: resolveEntities(items, readEntityMap(page), readMediaMap(page)), nextCursor: typeof cursor === 'string' && cursor !== '' ? cursor : null };
}

/**
 * Appends a loaded page to the pages already shown, for infinite scroll and
 * load-more: the nodes concatenate, each page's `entities` and `media` maps
 * merge in, and
 * the next cursor and sync token are the newer page's.
 */
export function appendPage(previous: FeedPageLike, next: FeedPageLike): FeedPagePayload {
    const before = readPage(previous);
    const after = readPage(next);
    const meta = next && typeof next === 'object' && !Array.isArray(next) ? next : {};

    return {
        ...meta,
        data: [...before.items, ...after.items],
        next_cursor: after.nextCursor,
        entities: { ...readEntityMap(previous), ...readEntityMap(next) },
        media: { ...readMediaMap(previous), ...readMediaMap(next) },
    } as FeedPagePayload;
}
