import { useEffect, useState } from 'react';
import { darkText, declaredColor } from '../shared/avatar';
import type { FeedEntity } from '../shared/types';
const colors = [
    '#0ea5e9',
    '#8b5cf6',
    '#ec4899',
    '#f59e0b',
    '#10b981',
    '#ef4444',
    '#6366f1',
    '#14b8a6',
];
export default function EntityAvatar({
    entity,
    size = 'md',
    className = '',
}: {
    entity: FeedEntity | null;
    /** `tile` fills a group strip's rounded square (ui#27); `pair` is one face of a rail's diagonal pair (ui#25). */
    size?: 'sm' | 'md' | 'badge' | 'tile' | 'pair';
    /** Extra classes, such as a pair face's placement. */
    className?: string;
}) {
    // A badge or a pair face is too small for two letters.
    const one = size === 'badge' || size === 'pair';
    const icon = entity?.tombstone ? undefined : entity?.media?.icon?.src;
    const [failed, setFailed] = useState<string>();
    useEffect(() => setFailed(undefined), [icon]);
    const declaredInitials = entity?.media?.initials;
    const provided =
        typeof declaredInitials === 'string' && declaredInitials.length > 0
            ? declaredInitials
            : entity?.data?.initials;
    const initials =
        typeof provided === 'string' && provided.length > 0
            ? one
                ? provided.slice(0, 1)
                : provided
            : (entity?.label ?? '?')
                  .split(/\s+/)
                  .filter(Boolean)
                  .slice(0, one ? 1 : 2)
                  .map((word) => word[0]!.toUpperCase())
                  .join('') || '?';
    let hash = 0;
    for (const char of `${entity?.type ?? ''}:${entity?.id ?? ''}`)
        hash = (hash * 31 + char.charCodeAt(0)) | 0;
    const declared = entity?.tombstone ? null : declaredColor(entity?.media);
    const color = entity?.tombstone
        ? null
        : declared || entity?.data?.avatar_color || colors[Math.abs(hash) % colors.length];
    const text = declared && darkText(declared) ? 'text-black' : 'text-white';
    const sizes = {
        md: 'sf-avatar--md size-[var(--sf-disc,--spacing(8))] text-xs',
        sm: 'sf-avatar--sm size-6 text-[length:--spacing(2.5)]',
        pair: 'sf-avatar--pair size-full text-[length:--spacing(2.75)]',
        tile: 'sf-avatar--tile aspect-square size-full rounded-lg! ring-0! text-[length:--spacing(5)]',
        badge: 'sf-avatar--badge [--sf-badge:var(--sf-badge-face)] absolute top-[calc(var(--sf-disc)-var(--sf-badge)+--spacing(0.5))] left-[calc(50%+var(--sf-disc)/2-var(--sf-badge))] size-(--sf-badge) text-[length:--spacing(2.25)]',
    };
    return (
        <span
            role="img"
            aria-label={entity?.label ?? 'Someone'}
            title={entity?.label ?? 'Someone'}
            className={`sf-avatar flex shrink-0 items-center justify-center rounded-full font-semibold select-none ring-2 ring-background ${sizes[size]} ${className} ${entity?.tombstone ? 'bg-muted text-white' : color ? text : 'bg-primary text-primary-foreground'}`}
            style={color ? { backgroundColor: color } : undefined}
        >
            {icon && failed !== icon ? (
                <img
                    src={icon}
                    alt={entity?.media?.icon?.alt ?? entity?.label ?? 'Someone'}
                    className="sf-avatar__image block size-full rounded-full object-contain"
                    onError={() => setFailed(icon)}
                />
            ) : (
                initials
            )}
        </span>
    );
}
