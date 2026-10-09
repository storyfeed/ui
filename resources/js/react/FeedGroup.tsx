import type { GroupNode } from '../shared/types';
import { imageOf } from '../shared/body';
import { avatarRow, featured } from '../shared/avatarRow';
import { entityLink } from '../shared/link';
import FeedAvatarRow from './FeedAvatarRow';
import FeedItem, { useNodeTime } from './FeedItem';
import type { NodeProps } from './FeedItem';
import FeedHeadline from './FeedHeadline';
import FeedMeta from './FeedMeta';
import FeedMediaStrip from './FeedMediaStrip';
import Rail from './Rail';
import FeedMedia from './FeedMedia';
export default function FeedGroup({
    item,
    isLast = false,
    rail,
    childRail,
    body,
    time,
    annotations,
    objectIcon,
    interactive = true,
    collapsed = null,
}: NodeProps & { item: GroupNode }) {
    const timestamp = useNodeTime(item, time);
    const faces = (item.sample.actors ?? []).slice(0, 3);
    const open =
        item.expanded ||
        (collapsed === null
            ? !interactive || (!item.headline_template && !item.headline)
            : !collapsed);
    const icon = objectIcon?.(item);
    const Disclosure = interactive ? 'details' : 'div';
    const hidden = Math.max(0, item.count - item.children.length);
    const seen = new Set<string>();
    // The featured entities (the objects), never the actor: see the Vue kit's FeedGroup.
    const tiles = featured(item)
        .flatMap((entity) => {
            const image = imageOf(entity);
            if (!image || seen.has(image.src)) return [];
            seen.add(image.src);
            return [{ image, href: entityLink(entity)?.href ?? null }];
        })
        .slice(0, 3);
    const row = tiles.length || (!interactive && open) ? null : avatarRow(item);
    return (
        <div
            className={`sf-row relative flex items-start gap-(--sf-gap)${
                isLast && interactive
                    ? ' [&:not(:has(>.sf-body>.sf-disclosure[open]))>.sf-rail>[aria-hidden]]:hidden'
                    : ''
            }`}
        >
            <Rail
                faces={faces}
                glyph={item.glyph}
                intent={item.glyph_intent}
                rail={rail}
                line={!(isLast && !interactive && !open)}
            />
            <div
                className={`sf-body min-w-0 flex-1 pt-1.5 [&:has(>.sf-disclosure[open])>.sf-media-strip]:hidden [&:has(>.sf-disclosure[open])>.sf-avatar-row]:hidden ${
                    !isLast || (!interactive && open)
                        ? 'sf-body--spaced pb-5'
                        : '[&:has(>.sf-disclosure[open])]:pb-5'
                }`}
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
                <FeedMediaStrip tiles={!interactive && open ? [] : tiles} />
                {row && (
                    <FeedAvatarRow
                        entities={row.entities}
                        overflow={row.overflow}
                    />
                )}
                <div
                    className={
                        icon
                            ? 'sf-object-media mt-2 flex items-start gap-3'
                            : 'contents'
                    }
                >
                    {icon && (
                        <FeedMedia
                            image={icon}
                            href={entityLink(item.object)?.href ?? null}
                            linkAttributes={entityLink(item.object)?.attributes}
                            className="mt-0! size-10! shrink-0 rounded-md!"
                        />
                    )}
                    <div className={icon ? 'min-w-0 flex-1' : 'contents'}>
                        {body?.({ node: item })}
                    </div>
                </div>
                {annotations?.({ node: item })}
                {item.children.length > 0 && (
                    <Disclosure
                        className={
                            interactive
                                ? 'group/disclosure sf-disclosure print:[&::details-content]:block print:[&::details-content]:[content-visibility:visible]'
                                : undefined
                        }
                        {...(interactive ? { open } : {})}
                    >
                        {interactive && (
                            <summary className="sf-toggle mt-1 inline-flex min-h-6 items-center cursor-pointer list-none rounded-sm border-0 bg-transparent p-0 text-sm leading-[1.6] font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden print:hidden">
                                <span className="group-open/disclosure:hidden">{`Show all ${item.count}`}</span>
                                <span className="hidden group-open/disclosure:inline">
                                    Show less
                                </span>
                            </summary>
                        )}
                        <div
                            className={`sf-children mt-3 ${
                                !interactive && !open
                                    ? 'hidden print:block'
                                    : ''
                            }`}
                        >
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
                                    objectIcon={objectIcon}
                                    body={body}
                                    annotations={annotations}
                                    time={time ? time : ({ label }) => label}
                                />
                            ))}
                            {hidden > 0 && (
                                <p className="sf-overflow pl-[calc(var(--sf-gutter)+var(--sf-gap))] text-sm leading-[1.6] text-muted-foreground">
                                    …and {hidden} more not shown
                                </p>
                            )}
                        </div>
                    </Disclosure>
                )}
            </div>
        </div>
    );
}
