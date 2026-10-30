/**
 * Motion where layout changes under the reader, and nowhere else (ui#30).
 *
 * Built on the View Transitions API and nothing more. A browser without it,
 * and a reader who prefers reduced motion, gets the instant swap every kit
 * drew before. The Blade kit inlines the same steps in `group.blade.php`.
 */

/** How long every motion runs, in milliseconds, eased out. */
export const MOTION_MS = 200;

/**
 * How many pictures one morph can carry: a strip's tiles (`STRIP_SLOTS`).
 * Each slot has a literal `view-transition-name` in `MORPH_CLASSES`.
 */
export const MORPH_SLOTS = 4;

/**
 * The morph's names, on the group's row. They apply only while that row
 * carries `data-sf-morph`, to the pictures `morph()` marks with `data-sf-vt`,
 * so no two groups ever share a name and no row is named at rest.
 */
export const MORPH_CLASSES = "[&[data-sf-morph]_[data-sf-vt='0']]:[view-transition-name:sf-vt-0] [&[data-sf-morph]_[data-sf-vt='1']]:[view-transition-name:sf-vt-1] [&[data-sf-morph]_[data-sf-vt='2']]:[view-transition-name:sf-vt-2] [&[data-sf-morph]_[data-sf-vt='3']]:[view-transition-name:sf-vt-3]";

/** Whether to animate at all: the API exists and the reader hasn't asked for less motion. */
export function animates(): boolean {
    return typeof document !== 'undefined'
        && typeof document.startViewTransition === 'function'
        && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Retime the browser's default 250 ms `ease` on every transition pseudo-element. */
export function retime(): void {
    for (const animation of document.getAnimations()) {
        const effect = animation.effect as KeyframeEffect | null;
        if (effect?.pseudoElement?.startsWith('::view-transition')) {
            effect.updateTiming({ duration: MOTION_MS, easing: 'ease-out' });
        }
    }
}

// The pictures each side of a group draws: the strip's tiles, and the member
// rows' pictures, avatars aside. A tile is the picture its member's row draws
// (ui#47), so the same src pairs them.
const sides = {
    strip: ':scope > .sf-body > .sf-media-strip img',
    members: ':scope > .sf-body .sf-children img:not(.sf-avatar img)',
} as const;

function pictures(row: HTMLElement, side: keyof typeof sides): HTMLElement[] {
    return [...row.querySelectorAll<HTMLImageElement>(sides[side])]
        .filter((img) => img.checkVisibility())
        .map((img) => img.closest<HTMLElement>('.sf-media') ?? img);
}

function srcOf(picture: HTMLElement): string | null {
    return (picture.matches('img') ? picture : picture.querySelector('img'))?.getAttribute('src') ?? null;
}

function unmark(row: HTMLElement): void {
    row.querySelectorAll('[data-sf-vt]').forEach((element) => element.removeAttribute('data-sf-vt'));
}

const running = new WeakMap<HTMLElement, ViewTransition>();

/**
 * Expand or collapse a group with its pictures in flight: each strip tile
 * flies to the member row that draws the same picture, and back. Everything
 * else in the row (the "+N" tile, name tiles, the actor strip) dissolves in
 * the page's cross-fade, and the head row, above all of it, never moves.
 *
 * `update` makes the change and resolves once the DOM shows it.
 */
export function morph(row: HTMLElement | null | undefined, update: () => void | Promise<void>): void {
    if (!row || !animates()) {
        void update();
        return;
    }

    // Whichever side shows now is where the pictures leave from.
    const from: keyof typeof sides = pictures(row, 'strip').length ? 'strip' : 'members';
    const to: keyof typeof sides = from === 'strip' ? 'members' : 'strip';
    const slots = new Map<string, number>();

    unmark(row);
    for (const picture of pictures(row, from)) {
        const src = srcOf(picture);
        if (src === null || slots.has(src) || slots.size === MORPH_SLOTS) continue;
        slots.set(src, slots.size);
        picture.dataset.sfVt = String(slots.get(src));
    }
    row.dataset.sfMorph = '';

    const transition = document.startViewTransition(async () => {
        unmark(row);
        await update();
        const landed = new Set<string>();
        for (const picture of pictures(row, to)) {
            const src = srcOf(picture);
            if (src === null || landed.has(src) || !slots.has(src)) continue;
            landed.add(src);
            picture.dataset.sfVt = String(slots.get(src));
        }
    });
    running.set(row, transition);
    transition.ready.then(retime, () => {});
    const settle = () => {
        // A second toggle mid-flight starts its own transition; leave its names alone.
        if (running.get(row) !== transition) return;
        running.delete(row);
        unmark(row);
        delete row.dataset.sfMorph;
    };
    transition.finished.then(settle, settle);
}
