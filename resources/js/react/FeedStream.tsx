import { useId, type CSSProperties, type ReactNode } from 'react';
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
function Divider({
    label,
    style,
}: {
    label: string;
    style: 'dot' | 'branch';
}) {
    // The stroke gradient needs an id unique on the page; React's ids may hold characters a url() reference shouldn't.
    const gradient = `sf-branch-${useId().replace(/[^\w-]/g, '')}`;
    return (
        <div
            className={`sf-row sf-divider relative flex items-start gap-(--sf-gap-v) ${style === 'dot' ? 'sf-divider--dot [&_.sf-rail>div:last-child]:mt-1.25' : 'sf-divider--branch'}`}
        >
            <div className="sf-rail relative flex w-(--sf-gutter-v) shrink-0 flex-col items-center self-stretch">
                {style === 'dot' ? (
                    <div
                        aria-hidden="true"
                        className="sf-rail__node mt-1.25 size-2.25 shrink-0 rounded-full bg-muted-foreground ring-3 ring-background"
                    />
                ) : (
                    // The curve is the corner of a 1px rect on the rail line's column, darkening from the rail's colour to the label's;
                    // the line continues from its end, leaving a gap above it.
                    <svg
                        aria-hidden="true"
                        className="sf-rail__branch absolute top-[calc(0.5625em-0.5px)] left-[calc(50%-0.5px)] h-2 w-[calc(50%+0.5px+var(--sf-gap-v)-var(--spacing)*1.5)] overflow-hidden"
                    >
                        <defs>
                            <linearGradient
                                id={gradient}
                                gradientUnits="userSpaceOnUse"
                                x1="0"
                                y1="0"
                                x2="100%"
                                y2="0"
                            >
                                <stop offset="0" className="[stop-color:var(--color-border)]" />
                                <stop offset="1" className="[stop-color:var(--color-muted-foreground)]" />
                            </linearGradient>
                        </defs>
                        <rect
                            x="0.5"
                            y="0.5"
                            width="200%"
                            height="200%"
                            rx="0.5em"
                            className="fill-none stroke-1"
                            stroke={`url(#${gradient})`}
                        />
                    </svg>
                )}
                <div
                    aria-hidden="true"
                    className={`sf-rail__line w-px flex-1 bg-border ${style === 'dot' ? 'mt-1' : 'mt-[calc(0.5625em-0.5px+var(--spacing)*2)]'}`}
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
    dividerStyle = 'branch',
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
            className={`sf-feed [--spacing:calc(var(--sf-font-size,1rem)/4)] [--text-xs:calc(var(--sf-font-size,1rem)*0.75)] [--text-sm:calc(var(--sf-font-size,1rem)*0.875)] [--text-base:var(--sf-font-size,1rem)] [--sf-gutter-v:var(--sf-gutter,--spacing(8))] [--sf-gap-v:var(--sf-gap,--spacing(3))] [--sf-disc-v:var(--sf-disc,--spacing(8))] [--sf-badge-v:var(--sf-badge,--spacing(3.5))] [--sf-badge-face-v:var(--sf-badge-face,--spacing(4.5))] text-base leading-[1.6] text-muted-foreground ${className}`}
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
                        <div className="sf-row relative flex items-start gap-(--sf-gap-v)">
                            <div className="sf-rail flex w-(--sf-gutter-v) shrink-0 flex-col items-center self-stretch">
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
