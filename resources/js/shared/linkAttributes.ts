/** Payload link attributes cannot replace the entity URL or install handlers. */
export function linkAttributes(
    attributes: Record<string, unknown> = {},
): Record<string, string | number | boolean> {
    return Object.fromEntries(
        Object.entries(attributes).filter(
            ([name, value]) =>
                /^[a-zA-Z][\w:.-]*$/.test(name) &&
                name.toLowerCase() !== 'href' &&
                !name.toLowerCase().startsWith('on') &&
                ['string', 'number', 'boolean'].includes(typeof value),
        ),
    ) as Record<string, string | number | boolean>;
}
