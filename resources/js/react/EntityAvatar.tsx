import { useEffect, useState } from 'react';
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
}: {
    entity: FeedEntity | null;
    size?: 'sm' | 'md' | 'badge';
}) {
    const icon = entity?.tombstone ? undefined : entity?.media?.icon?.src;
    const [failed, setFailed] = useState<string>();
    useEffect(() => setFailed(undefined), [icon]);
    const provided = entity?.data?.initials;
    const initials =
        typeof provided === 'string' && provided.length > 0
            ? size === 'badge'
                ? provided.slice(0, 1)
                : provided
            : (entity?.label ?? '?')
                  .split(/\s+/)
                  .filter(Boolean)
                  .slice(0, size === 'badge' ? 1 : 2)
                  .map((word) => word[0]!.toUpperCase())
                  .join('') || '?';
    let hash = 0;
    for (const char of `${entity?.type ?? ''}:${entity?.id ?? ''}`)
        hash = (hash * 31 + char.charCodeAt(0)) | 0;
    const color = entity?.tombstone
        ? null
        : entity?.data?.avatar_color || colors[Math.abs(hash) % colors.length];
    const sizes = {
        md: 'sf-avatar--md size-[var(--sf-disc,2rem)] text-xs',
        sm: 'sf-avatar--sm size-6 text-[0.625rem]',
        badge: 'sf-avatar--badge [--sf-badge:var(--sf-badge-face)] absolute top-[calc(var(--sf-disc)-var(--sf-badge)+0.125rem)] left-[calc(50%+var(--sf-disc)/2-var(--sf-badge))] size-(--sf-badge) text-[0.5625rem]',
    };
    return (
        <span
            role="img"
            aria-label={entity?.label ?? 'Someone'}
            title={entity?.label ?? 'Someone'}
            className={`sf-avatar flex shrink-0 items-center justify-center rounded-full font-semibold select-none ring-2 ring-background ${sizes[size]} ${entity?.tombstone ? 'bg-muted text-white' : color ? 'text-white' : 'bg-primary text-primary-foreground'}`}
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
