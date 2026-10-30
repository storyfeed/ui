/**
 * Motion where layout changes under the reader, and nowhere else (ui#30).
 *
 * Built on the View Transitions API and `@starting-style`, and nothing more.
 * A browser without them, and a reader who prefers reduced motion, gets the
 * instant swap every kit drew before. The Blade kit inlines the morph's steps
 * in `group.blade.php`.
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

/** How a node joined the feed since the last render: at the head (Live), or after it (a new page, a regroup). */
export type Arrival = 'head' | 'page';

/**
 * Head arrivals ease in, growing from nothing so the feed glides down rather
 * than jumping. A page fades in under the old one. Both run from
 * `@starting-style`, once, when the node first renders.
 */
export const ARRIVAL_CLASSES: Record<Arrival, string> = {
    head: 'motion-safe:transition-[height,opacity,translate] motion-safe:duration-200 motion-safe:ease-out [interpolate-size:allow-keywords] overflow-hidden starting:h-0 starting:opacity-0 starting:-translate-y-2',
    page: 'motion-safe:transition-opacity motion-safe:duration-200 motion-safe:ease-out starting:opacity-0',
};

/** How long a node keeps its arrival classes: the motion, with room to finish. */
export const ARRIVAL_MS = MOTION_MS * 2;

/**
 * The nodes in `after` that weren't in `before`, by id (never position), and
 * where each arrived. Nodes before the first one already drawn came in at the
 * head; any other new node came with a page. With nothing in common, `after`
 * is a first page or a reset (a changed `sync_token`), so nothing arrives and
 * nothing moves.
 */
export function arrivals(before: readonly string[], after: readonly string[]): Map<string, Arrival> {
    const seen = new Set(before);
    const first = after.findIndex((id) => seen.has(id));
    const found = new Map<string, Arrival>();
    if (first === -1) return found;
    after.forEach((id, index) => {
        if (!seen.has(id)) found.set(id, index < first ? 'head' : 'page');
    });

    return found;
}

/**
 * Whether the reader has scrolled the feed's top out of view, in the window
 * or in the nearest scrolling ancestor. Live arrivals then wait behind an
 * "N new" pill instead of moving the rows being read.
 */
export function awayFromTop(feed: Element | null | undefined): boolean {
    if (!feed) return false;
    let top = 0;
    for (let parent = feed.parentElement; parent; parent = parent.parentElement) {
        if (/auto|scroll|overlay/.test(getComputedStyle(parent).overflowY) && parent.scrollHeight > parent.clientHeight) {
            top = parent.getBoundingClientRect().top;
            break;
        }
    }

    return feed.getBoundingClientRect().top < top - 1;
}

// What each headline number last read, so an update can tell which changed.
const drawn = new WeakMap<Element, string>();

/**
 * Fade in each `[data-sf-part]` under `root` whose text changed since the
 * last call, and nothing else: "and 2 others" becoming "and 3 others" fades
 * the 3 alone. Call it after every render; the first call only notes what
 * shows. Reduced motion swaps the text at once.
 */
export function fadeChanged(root: Element | null | undefined): void {
    if (!root) return;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    for (const part of root.querySelectorAll('[data-sf-part]')) {
        const text = part.textContent ?? '';
        const before = drawn.get(part);
        drawn.set(part, text);
        if (before !== undefined && before !== text && !still) {
            part.animate([{ opacity: 0 }, { opacity: 1 }], { duration: MOTION_MS, easing: 'ease-out' });
        }
    }
}
