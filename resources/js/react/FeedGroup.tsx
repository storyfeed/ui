import type { GroupNode, FeedRole } from '../shared/types';
import { imageOf } from '../shared/body';
import FeedItem, { useNodeTime } from './FeedItem';
import type { NodeProps } from './FeedItem';
import FeedHeadline from './FeedHeadline';
import FeedMeta from './FeedMeta';
import FeedMediaStrip from './FeedMediaStrip';
import Rail from './Rail';
export default function FeedGroup({
    item,
    isLast = false,
    rail,
    childRail,
    body,
    time,
    annotations,
}: NodeProps & { item: GroupNode }) {
    const timestamp = useNodeTime(item, time);
    const faces = (item.sample.actors ?? []).slice(0, 3);
    const open = !item.headline_template && !item.headline;
    const hidden = Math.max(0, item.count - item.children.length);
    const seen = new Set<string>();
    const tiles = [
        'objects',
        'actors',
        'targets',
        'contexts',
        'origins',
        'results',
        'instruments',
        'locations',
        'generators',
    ]
        .flatMap((role) => item.sample[role as FeedRole] ?? [])
        .flatMap((entity) => {
            const image = imageOf(entity);
            if (!image || seen.has(image.src)) return [];
            seen.add(image.src);
            return [{ image, href: entity.url ?? null }];
        })
        .slice(0, 3);
    return (
        <div
            className={`sf-row relative flex items-start gap-(--sf-gap)${isLast ? ' [&:not(:has(>.sf-body>.sf-disclosure[open]))>.sf-rail>[aria-hidden]]:hidden' : ''}`}
        >
            <Rail
                faces={faces}
                glyph={item.glyph}
                intent={item.glyph_intent}
                rail={rail}
            />
            <div
                className={`sf-body min-w-0 flex-1 pt-1.5 [&:has(>.sf-disclosure[open])>.sf-media-strip]:hidden ${isLast ? '[&:has(>.sf-disclosure[open])]:pb-5' : 'sf-body--spaced pb-5'}`}
            >
                <div className="sf-head flex items-baseline gap-3">
                    <FeedHeadline
                        template={item.headline_template}
                        headline={item.headline}
                        entities={item}
                        sample={item.sample}
                        distinct={item.distinct}
                        count={item.count}
                        verb={item.verb}
                        aggregate
                    />
                </div>
                <FeedMeta node={item} templates={[item.headline_template]}>
                    {timestamp}
                </FeedMeta>
                <FeedMediaStrip tiles={tiles} />
                {body?.({ node: item })}
                {annotations?.({ node: item })}
                {item.children.length > 0 && (
                    <details
                        className="group/disclosure sf-disclosure print:[&::details-content]:block print:[&::details-content]:[content-visibility:visible]"
                        open={open}
                    >
                        <summary className="sf-toggle mt-1 inline-block cursor-pointer list-none rounded-sm border-0 bg-transparent p-0 text-xs leading-[1.6] font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden print:hidden">
                            <span className="group-open/disclosure:hidden">{`Show all ${item.count}`}</span>
                            <span className="hidden group-open/disclosure:inline">
                                Show less
                            </span>
                        </summary>
                        <div className="sf-children mt-3">
                            {item.children.map((child, i) => (
                                <FeedItem
                                    key={child.id}
                                    item={child}
                                    dense
                                    rail={childRail ?? rail}
                                    isLast={
                                        i === item.children.length - 1 &&
                                        hidden === 0
                                    }
                                    body={body}
                                    annotations={annotations}
                                    time={time ? time : ({ label }) => label}
                                />
                            ))}
                            {hidden > 0 && (
                                <p className="sf-overflow pl-[calc(var(--sf-gutter)+var(--sf-gap))] text-xs leading-[1.6] text-muted-foreground">
                                    …and {hidden} more not shown
                                </p>
                            )}
                        </div>
                    </details>
                )}
            </div>
        </div>
    );
}
