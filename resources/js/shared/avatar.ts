/**
 * Whether a declared avatar disc (`media.color`, lowercase `#rrggbb`) takes
 * black text: black or white, whichever has the higher WCAG contrast ratio.
 * Black wins once the disc's relative luminance passes 0.179, so a faint
 * disc gets dark initials and a deep one light. Mirrors `Avatar::darkText()`.
 */
export function darkText(color: string): boolean {
    const channel = (offset: number) => {
        const value = parseInt(color.slice(offset, offset + 2), 16) / 255;

        return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    };
    const luminance = 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);

    return luminance > 0.179;
}

/** The declared disc colour when it is the `#rrggbb` core emits, else null. */
export function declaredColor(media: { color?: string | null } | null | undefined): string | null {
    const color = media?.color;

    return typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color) ? color : null;
}
