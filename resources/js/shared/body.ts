export const BODY_NAMES: readonly string[] = [
    'Storyfeed/Body/Component',
    'Storyfeed/Body/KeyValue',
    'Storyfeed/Body/Excerpt',
    'Storyfeed/Body/FileAttachment',
    'Storyfeed/Body/File',
    'Storyfeed/Body/Prose',
    'Storyfeed/Body/ItemList',
    'Storyfeed/Body/Image',
    'Storyfeed/Body/MediaObject',
    'Storyfeed/Body/Table',
    'Storyfeed/Body/CallToAction',
];

export type ResolvedDetail = { name: string; payload: Record<string, any> };

/** Whether a renderer draws this body; by default, core's types. A kit passes its own. */
export type DrawsBody = (name: string, payload: Record<string, any>) => boolean;

const drawsCoreBody: DrawsBody = (name) => BODY_NAMES.includes(name);

/**
 * Walk a `data` map and return the details it carries, in the order found.
 *
 * A detail sits ALONGSIDE the app's own keys rather than at a key core owns,
 * so finding one means walking. Details never nest, so the walk stops at the
 * first one on a branch; the depth bound matches core's own `details` check.
 */
export function formsIn(data: unknown, depth = 4, draws: DrawsBody = drawsCoreBody): ResolvedDetail[] {
    if (depth < 0 || data === null || typeof data !== 'object') return [];

    const map = data as Record<string, any>;
    const name = map.$body;

    if (typeof name === 'string') {
        return draws(name, map) ? [{ name, payload: map }] : [];
    }

    return Object.values(map).flatMap((value) => formsIn(value, depth - 1, draws));
}

/**
 * The forms in an entity's `body` slot, in the order the payload carries them.
 *
 * Unlike {@link formsIn} there is no walking: `body` is core's slot and holds
 * a list of forms, so a renderer reads it rather than searching for it. An
 * unrecognised name still draws nothing, which is the same rule and the same
 * reason.
 */
export function resolve(body: unknown, draws: DrawsBody = drawsCoreBody): ResolvedDetail[] {
    if (!Array.isArray(body)) return [];

    return body.flatMap((form) => {
        const name = (form ?? {})['$body'];

        return typeof name === 'string' && draws(name, form) ? [{ name, payload: form }] : [];
    });
}

/**
 * The one plain-text line a body carries for renderers that cannot draw its
 * type (core's reserved `$fallback`), or null when it has none.
 */
export function fallbackOf(payload: Record<string, any>): string | null {
    const line = payload?.$fallback;

    return typeof line === 'string' && line.trim() !== '' ? line : null;
}

/** Whether an Excerpt is a fragment. From v2 core writes `truncated` only when false. */
export function isTruncated(payload: Record<string, any>): boolean {
    return 'truncated' in payload ? Boolean(payload.truncated) : (typeof payload.$v === 'number' ? payload.$v : 1) >= 2;
}

/** Only an Image body opts a sampled entity into the photograph strip. */
export function imageOf(entity: any): any {
    const bodies = [...resolve(entity?.body), ...formsIn(entity?.data)];
    for (const { payload } of bodies) {
        if (payload.$body !== 'Storyfeed/Body/Image') continue;
        const slot = payload.image ?? 'preview';
        if (!['icon', 'preview', 'image'].includes(slot)) continue;
        const image = entity?.media?.[slot];
        if (image?.src)
            return { ...image, alt: payload.alt ?? payload.caption ?? '' };
    }
    return null;
}
