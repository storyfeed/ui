import type { CSSProperties, ReactNode } from 'react';
import type { FeedNode } from '../shared/types';
import { readPage, type FeedPageLike } from '../shared/page';
import FeedNodeView from './FeedNode';
import type { NodeProps } from './FeedItem';
import { useFeedDays } from './useRelativeTime';
export interface FeedStreamProps extends NodeProps {
    className?: string;
    style?: CSSProperties & Record<`--${string}`, string | number>;
    items?: FeedNode[];
    nextCursor?: string | null;
    /** A whole page in place of `items` and `nextCursor`: core's JSON, with the nodes under `data` (#95) or `items`. */
    page?: FeedPageLike;
    loadingMore?: boolean;
    grouped?: boolean;
    dividers?: Record<string, string>;
    dividerStyle?: 'dot' | 'branch';
    onLoadMore?: () => void;
    empty?: ReactNode;
}
function Divider({ label, style }: { label: string; style: 'dot' | 'branch' }) {
    return (
        <div
            className={`sf-row sf-divider relative flex items-start gap-(--sf-gap) [&_.sf-rail>div:last-child]:mt-1.25 ${style === 'branch' ? 'sf-divider--branch [&_.sf-rail]:relative [&_.sf-rail>div:last-child]:mt-5.5' : 'sf-divider--dot'}`}
        >
            <div className="sf-rail flex w-(--sf-gutter) shrink-0 flex-col items-center self-stretch">
                {style === 'branch' ? (
                    <svg
                        aria-hidden="true"
                        className="sf-rail__branch absolute top-0.75 left-[calc(50%-var(--spacing)*0.1875)] h-5.5 w-4 overflow-visible fill-none stroke-muted-foreground stroke-[1.5] [stroke-linecap:round]"
                        width="16"
                        height="22"
                        viewBox="0 0 16 22"
                    >
                        <path d="M0.75 22 V14 Q0.75 6 8.75 6 H15" />
                    </svg>
                ) : (
                    <div
                        aria-hidden="true"
                        className="sf-rail__node mt-1.25 size-2.25 shrink-0 rounded-full bg-muted-foreground ring-3 ring-background"
                    />
                )}
                <div
                    aria-hidden="true"
                    className="sf-rail__line mt-1 w-px flex-1 bg-border"
                />
            </div>
            <h2 className="sf-day m-0 border-0 pt-0 pb-5 text-xs leading-[1.6] font-semibold tracking-[0.05em] text-muted-foreground uppercase">
                {label}
            </h2>
        </div>
    );
}
export default function FeedStream({
    items: given,
    page,
    className = '',
    style,
    nextCursor: givenCursor,
    loadingMore = false,
    grouped = true,
    rail,
    childRail,
    dividers = {},
    dividerStyle = 'dot',
    onLoadMore,
    empty = 'No activity yet.',
    ...renderers
}: FeedStreamProps) {
    const read = readPage(page);
    const items = given ?? read.items;
    const nextCursor = givenCursor ?? read.nextCursor;
    const days = useFeedDays(items);
    return (
        <div
            className={`sf-feed [--spacing:calc(var(--sf-font-size,1rem)/4)] [--text-xs:calc(var(--sf-font-size,1rem)*0.75)] [--text-sm:calc(var(--sf-font-size,1rem)*0.875)] [--text-base:var(--sf-font-size,1rem)] [--sf-gutter:--spacing(8)] [--sf-gap:--spacing(3)] [--sf-disc:--spacing(8)] [--sf-badge:--spacing(3.5)] [--sf-badge-face:--spacing(4.5)] text-base leading-[1.6] text-muted-foreground ${className}`}
            style={style}
        >
            {!items.length ? (
                <div className="sf-empty rounded-lg border border-dashed border-border p-10 text-center text-muted-foreground">
                    {empty}
                </div>
            ) : (
                <div role="list">
                    {days.map((day, dayIndex) => (
                        <section key={`${day.label}:${dayIndex}`}>
                            {grouped && (
                                <Divider
                                    label={day.label}
                                    style={dividerStyle}
                                />
                            )}
                            {day.items.map((item, i) => (
                                <div key={item.id} role="listitem">
                                    {dividers[item.id] && (
                                        <Divider
                                            label={dividers[item.id]}
                                            style={dividerStyle}
                                        />
                                    )}
                                    <FeedNodeView
                                        item={item}
                                        isLast={
                                            dayIndex === days.length - 1 &&
                                            i === day.items.length - 1 &&
                                            !nextCursor
                                        }
                                        rail={rail}
                                        childRail={childRail}
                                        {...renderers}
                                    />
                                </div>
                            ))}
                        </section>
                    ))}
                    {nextCursor && (
                        <div className="sf-row relative flex items-start gap-(--sf-gap)">
                            <div className="sf-rail flex w-(--sf-gutter) shrink-0 flex-col items-center self-stretch">
                                <div
                                    aria-hidden="true"
                                    className="sf-rail__line mt-1 w-px flex-1 bg-border"
                                />
                            </div>
                            <button
                                type="button"
                                className="sf-more cursor-pointer rounded-md border border-border bg-transparent px-3 py-1.5 text-sm font-medium text-muted-foreground enabled:hover:bg-muted enabled:hover:text-foreground disabled:cursor-default disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-ring"
                                disabled={loadingMore}
                                onClick={onLoadMore}
                            >
                                {loadingMore
                                    ? 'Loading…'
                                    : 'Load older activity'}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
