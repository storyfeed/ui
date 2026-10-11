import type { FeedEntity } from './types';

/**
 * Who is reading the feed (ui#75): `{ type, id }` or `'type:id'`. A headline
 * names that entity "You" instead of by its label. The payload never knows
 * the reader; only the page does, at render time.
 */
export type FeedViewer = { type: string; id: string | number } | string;

export function viewerKey(viewer?: FeedViewer | null): string | null {
    if (typeof viewer === 'string') return viewer.includes(':') ? viewer : null;
    return viewer && viewer.type && viewer.id != null ? `${viewer.type}:${viewer.id}` : null;
}

export function isViewer(viewer: FeedViewer | null | undefined, entity: FeedEntity | null | undefined): boolean {
    const key = viewerKey(viewer);
    return key !== null && !!entity?.type && key === `${entity.type}:${entity.id}`;
}

/** The viewer is an actor like any named one: drawn with the actor's weight and colour, unlinked. */
export const VIEWER_CLASSES = 'sf-entity sf-entity--viewer font-medium text-foreground';

/** "You" when the sentence starts with the viewer, "you" anywhere else. */
export const you = (first: boolean): string => (first ? 'You' : 'you');
