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
];

export type ResolvedDetail = { name: string; payload: Record<string, any> };

/**
 * Walk a `data` map and return the details it carries, in the order found.
 *
 * A detail sits ALONGSIDE the app's own keys rather than at a key core owns,
 * so finding one means walking. Details never nest, so the walk stops at the
 * first one on a branch; the depth bound matches core's own `details` check.
 */
export function formsIn(data: unknown, depth = 4): ResolvedDetail[] {
    if (depth < 0 || data === null || typeof data !== 'object') return [];

    const map = data as Record<string, any>;
    const name = map.$body;

    if (typeof name === 'string') {
        const known = BODY_NAMES.includes(name);

        return known ? [{ name, payload: map }] : [];
    }

    return Object.values(map).flatMap((value) => formsIn(value, depth - 1));
}

/**
 * The forms in an entity's `body` slot, in the order the payload carries them.
 *
 * Unlike {@link formsIn} there is no walking: `body` is core's slot and holds
 * a list of forms, so a renderer reads it rather than searching for it. An
 * unrecognised name still draws nothing, which is the same rule and the same
 * reason.
 */
export function resolve(body: unknown): ResolvedDetail[] {
    if (!Array.isArray(body)) return [];

    return body.flatMap((form) => {
        const name = (form ?? {})['$body'];
        const known = BODY_NAMES.includes(name);

        return known ? [{ name, payload: form }] : [];
    });
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
