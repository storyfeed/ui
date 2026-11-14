import type { FeedMediaMap, FeedNode, FeedPagePayload, FeedPayload } from './types';

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
 * Nodes with every entity's `link` and `media` read from the page's map by
 * its `media_ref`, falling back to the inline copies. Mirrors `Page::resolve()`.
 */
export function resolveMedia<T>(value: T, map: FeedMediaMap): T {
    if (Object.keys(map).length === 0) return value;

    return resolve(value, map) as T;
}

function resolve(value: unknown, map: FeedMediaMap): unknown {
    if (Array.isArray(value)) return value.map((child) => resolve(child, map));
    if (!value || typeof value !== 'object') return value;

    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value)) out[key] = resolve(child, map);

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
 * Entities read `link` and `media` from the page's `media` map (#242).
 * Mirrors `Page::read()`.
 */
export function readPage(page: FeedPageLike): { items: FeedNode[]; nextCursor: string | null } {
    if (Array.isArray(page)) return { items: page, nextCursor: null };
    if (!page || typeof page !== 'object') return { items: [], nextCursor: null };

    const items = 'data' in page && Array.isArray(page.data) ? page.data : 'items' in page && Array.isArray(page.items) ? page.items : [];
    const cursor = page.next_cursor;

    return { items: resolveMedia(items, readMediaMap(page)), nextCursor: typeof cursor === 'string' && cursor !== '' ? cursor : null };
}

/**
 * Appends a loaded page to the pages already shown, for infinite scroll and
 * load-more: the nodes concatenate, each page's `media` map merges in, and
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
        media: { ...readMediaMap(previous), ...readMediaMap(next) },
    } as FeedPagePayload;
}
