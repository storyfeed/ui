import { useEffect, useState } from 'react';
import { feedDays, refreshDelay } from '../shared/days';
import { formatTimestamp } from '../shared/timestamp';
import { useFeedOptions } from './context';

/**
 * No clock, locale, timezone or timers enter the SSR/first hydration render.
 * A null `iso` (a dateless entry) gives empty labels and starts no timer.
 */
export function useRelativeTime(iso: string | null) {
    const { FEED_NOW: pinned } = useFeedOptions();
    const [now, setNow] = useState<number | null>(null);
    useEffect(() => {
        if (iso === null) return;
        const at = iso;
        let timer: ReturnType<typeof setTimeout> | undefined;
        function tick() {
            const value = pinned ?? Date.now();
            setNow(value);
            if (pinned === undefined)
                timer = setTimeout(tick, refreshDelay(at, value));
        }
        tick();
        return () => clearTimeout(timer);
    }, [iso, pinned]);
    if (iso === null) return { label: '', full: '' };
    return {
        label: now === null ? iso : formatTimestamp(iso, now),
        full:
            now === null
                ? iso
                : new Date(iso).toLocaleString(undefined, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                  }),
    };
}

export function useFeedDays<T extends { published_at: string | null }>(
    items: T[],
) {
    const { FEED_NOW: pinned } = useFeedOptions();
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    if (mounted) return feedDays(items, pinned ?? null);
    // UTC calendar keys are stable even when SSR and the browser use different zones.
    // A dateless node joins the day before it, as feedDays() reads it.
    const days: { label: string | null; items: T[] }[] = [];
    let current: string | null = null;
    for (const item of items) {
        if (item.published_at === null) {
            if (!days.length) days.push({ label: null, items: [] });
        } else {
            const label = new Date(item.published_at).toISOString().slice(0, 10);
            if (current !== label) days.push({ label: (current = label), items: [] });
        }
        days.at(-1)!.items.push(item);
    }
    return days;
}
