import { useEffect, useState } from 'react';
import { feedDays, refreshDelay } from '../shared/days';
import { formatTimestamp } from '../shared/timestamp';
import { useFeedOptions } from './context';

/** No clock, locale, timezone or timers enter the SSR/first hydration render. */
export function useRelativeTime(iso: string) {
    const { FEED_NOW: pinned } = useFeedOptions();
    const [now, setNow] = useState<number | null>(null);
    useEffect(() => {
        let timer: ReturnType<typeof setTimeout> | undefined;
        function tick() {
            const value = pinned ?? Date.now();
            setNow(value);
            if (pinned === undefined)
                timer = setTimeout(tick, refreshDelay(iso, value));
        }
        tick();
        return () => clearTimeout(timer);
    }, [iso, pinned]);
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

export function useFeedDays<T extends { published_at: string }>(items: T[]) {
    const { FEED_NOW: pinned } = useFeedOptions();
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    if (mounted) return feedDays(items, pinned ?? null);
    // UTC calendar keys are stable even when SSR and the browser use different zones.
    const days: { label: string; items: T[] }[] = [];
    for (const item of items) {
        const label = new Date(item.published_at).toISOString().slice(0, 10);
        if (days.at(-1)?.label !== label) days.push({ label, items: [] });
        days.at(-1)!.items.push(item);
    }
    return days;
}
