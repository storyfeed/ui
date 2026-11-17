/**
 * A tombstone's former type in words, as core's Blade fallback reads it:
 * the last segment of a class name (an app without a morph map stores
 * `App\Models\LineItem`), split into lower-case words ("line item"). A morph
 * alias such as `order` or `line_item` reads as it did.
 */
export function formerNoun(type: string): string {
    const base = type.split(/[\\/]/).pop() ?? type;

    return base
        .replace(/[._-]+/g, ' ')
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
        .trim()
        .toLowerCase();
}
