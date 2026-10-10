import type { FeedNode, FeedPagePayload, FeedPayload } from './types';

/** Any page a controller hands the kit: core <=0.18's `FeedPayload`, core #95's paginator JSON, or `get()`'s plain list. */
export type FeedPageLike = FeedPayload | FeedPagePayload | FeedNode[] | null | undefined;

/**
 * A page's nodes and next cursor, whichever shape core sent. From
 * storyfeed/storyfeed#95 the nodes are under `data` (Laravel's paginator
 * JSON) and `get()` is a plain list; before it they were under `items`.
 * Mirrors `Page::read()`.
 */
export function readPage(page: FeedPageLike): { items: FeedNode[]; nextCursor: string | null } {
    if (Array.isArray(page)) return { items: page, nextCursor: null };
    if (!page || typeof page !== 'object') return { items: [], nextCursor: null };

    const items = 'data' in page && Array.isArray(page.data) ? page.data : 'items' in page && Array.isArray(page.items) ? page.items : [];
    const cursor = page.next_cursor;

    return { items, nextCursor: typeof cursor === 'string' && cursor !== '' ? cursor : null };
}
