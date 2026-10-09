import { messages } from './messages';
import type { FeedNode } from './types';

/**
 * The time range an activity describes, as one phrase for the meta line:
 * "30 Sep – 9 Oct 2026", collapsing a shared month ("1 – 9 Oct 2026") or a
 * shared day ("9 Oct 2026"), and "from 9 Oct 2026" or "until 9 Oct 2026" when
 * one end is open. Null when the activity has no range; groups never do.
 * Dates read day-first, as the kit's timestamps do. Mirrors the Blade meta line.
 *
 * `utc` reads the calendar in UTC instead of the browser's zone, for a render
 * that must match the server's before the page hydrates.
 */
export function formatRange(node: FeedNode, utc = false, locale?: string): string | null {
    if (node.kind !== 'activity') return null;

    const parse = (iso: string | null | undefined) => (typeof iso === 'string' && !Number.isNaN(Date.parse(iso)) ? new Date(iso) : null);
    const start = parse(node.starts_at);
    const end = parse(node.ends_at);
    if (!start && !end) return null;

    const parts = (date: Date) => ({
        day: utc ? date.getUTCDate() : date.getDate(),
        month: date.toLocaleDateString(locale, { month: 'short', ...(utc ? { timeZone: 'UTC' } : {}) }),
        monthIndex: utc ? date.getUTCMonth() : date.getMonth(),
        year: utc ? date.getUTCFullYear() : date.getFullYear(),
    });
    const full = (date: Date) => {
        const { day, month, year } = parts(date);

        return `${day} ${month} ${year}`;
    };

    if (!end) return `${messages.rangeFrom} ${full(start!)}`;
    if (!start) return `${messages.rangeUntil} ${full(end)}`;

    const a = parts(start);
    const b = parts(end);
    if (a.year !== b.year) return `${full(start)} – ${full(end)}`;
    if (a.monthIndex !== b.monthIndex) return `${a.day} ${a.month} – ${full(end)}`;
    if (a.day !== b.day) return `${a.day} – ${full(end)}`;

    return full(end);
}
