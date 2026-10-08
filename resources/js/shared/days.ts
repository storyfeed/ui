export function dayLabel(date: Date, pinned: number | null): string {
    const today = new Date(pinned ?? Date.now());
    const startOfDay = (d: Date) =>
        new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const diffDays = Math.round(
        (startOfDay(today) - startOfDay(date)) / 86_400_000,
    );

    if (diffDays === 0) {
        return 'Today';
    }

    if (diffDays === 1) {
        return 'Yesterday';
    }

    if (diffDays < 7) {
        return date.toLocaleDateString(undefined, { weekday: 'long' });
    }

    return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

export function feedDays<T extends { published_at: string }>(
    items: T[],
    pinned: number | null,
) {
    const days: { label: string; items: T[] }[] = [];
    let currentKey: string | null = null;
    for (const item of items) {
        const date = new Date(item.published_at);
        const key = date.toDateString();
        if (key !== currentKey) {
            currentKey = key;
            days.push({ label: dayLabel(date, pinned), items: [] });
        }
        days[days.length - 1]!.items.push(item);
    }
    return days;
}

export function refreshDelay(iso: string, now: number): number {
    const age = now - new Date(iso).getTime();
    return age < 60_000 ? 1_000 : age < 3_600_000 ? 60_000 : 3_600_000;
}
