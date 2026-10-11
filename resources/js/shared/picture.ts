/**
 * How a card draws its picture beside the text. An `icon` is square by
 * definition. A picture with a declared size keeps its shape, clamped between
 * 1:1 and 2:1 so an Open Graph image (about 1.91:1) shows whole; one without a
 * declared size is shown whole at a fixed width. Mirrors the Blade card.
 */
export type PictureShape = { shape: 'icon' } | { shape: 'ratio'; ratio: number } | { shape: 'free' };

export function pictureShape(slot: unknown, image: Record<string, any> | null | undefined): PictureShape {
    if (slot === 'icon') return { shape: 'icon' };

    const { width, height } = image ?? {};
    if (typeof width !== 'number' || typeof height !== 'number' || width <= 0 || height <= 0) return { shape: 'free' };

    // Rounded so every kit writes the same custom property.
    return { shape: 'ratio', ratio: Math.round(Math.min(Math.max(width / height, 1), 2) * 10000) / 10000 };
}

/**
 * A MediaObject's picture: the entity's media for a named slot, or the image
 * the body stores itself when `image` is an object with a src. Mirrors the
 * Blade card.
 */
export function mediaObjectPicture(image: unknown, entityMedia: Record<string, any> | null | undefined): Record<string, any> | null {
    if (typeof image === 'string') return ['icon', 'preview', 'image'].includes(image) ? (entityMedia?.[image] ?? null) : null;

    return image && typeof image === 'object' && typeof (image as any).src === 'string' && (image as any).src !== '' ? image as Record<string, any> : null;
}
