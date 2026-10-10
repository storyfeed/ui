import { feedDays, refreshDelay } from '../shared/days';
import { computed, inject, onBeforeUnmount, onMounted, ref } from 'vue';
import type { Ref } from 'vue';
import { FEED_NOW } from './keys';
import { formatTimestamp } from '../shared/timestamp';

/**
 * Re-exported for callers that import the key from here. It MUST come from
 * keys.ts and not be declared again: two Symbol('feedNow') calls produce two
 * different keys, so a second declaration makes every provide() from the other
 * one silently miss, and the pinned clock falls back to Date.now() with nothing
 * to show that it did.
 */
export { FEED_NOW };

/**
 * Self-refreshing relative timestamp with a tiered cadence: every second
 * under a minute, every minute under an hour, hourly thereafter so calendar rungs also refresh.
 *
 * SSR-safe. No timer is started until mount, so a server or prerender pass
 * produces one deterministic string and never leaves a handle open.
 *
 * A null `iso` (a dateless entry) gives empty labels and starts no timer.
 */
export function useRelativeTime(iso: Ref<string | null>) {
    const pinned = inject<number | null>(FEED_NOW, null);
    const now = ref(pinned ?? Date.now());
    let timer: ReturnType<typeof setTimeout> | null = null;

    function schedule(): void {
        if (iso.value === null) {
            return;
        }

        const delay = refreshDelay(iso.value, now.value);

        timer = setTimeout(() => {
            now.value = Date.now();
            schedule();
        }, delay);
    }

    onMounted(() => {
        if (pinned === null) {
            schedule();
        }
    });

    onBeforeUnmount(() => {
        if (timer) {
            clearTimeout(timer);
        }
    });

    const label = computed(() =>
        iso.value === null ? '' : formatTimestamp(iso.value, now.value),
    );

    const full = computed<string>(() =>
        iso.value === null
            ? ''
            : new Date(iso.value).toLocaleString(undefined, {
                  dateStyle: 'medium',
                  timeStyle: 'short',
              }),
    );

    return { label, full };
}

export interface FeedDay {
    /** Null for a page that opens with dateless entries: no divider. */
    label: string | null;
    items: { published_at: string | null }[];
}

export function useFeedDays<T extends { published_at: string | null }>(items: Ref<T[]>) {
    const pinned = inject<number | null>(FEED_NOW, null);
    return computed(() => feedDays(items.value, pinned));
}
