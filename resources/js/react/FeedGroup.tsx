import { useId, useRef, useState, type MouseEvent, type SyntheticEvent } from 'react';
import { flushSync } from 'react-dom';
import type { GroupNode } from '../shared/types';
import { actorStrip } from '../shared/actors';
import { strip as stripOf } from '../shared/strip';
import FeedItem, { useNodeTime } from './FeedItem';
import type { NodeProps } from './FeedItem';
import FeedHeadline from './FeedHeadline';
import FeedMeta from './FeedMeta';
import FeedActorStrip from './FeedActorStrip';
import FeedMediaStrip from './FeedMediaStrip';
import Rail from './Rail';
import { MORPH_CLASSES, morph } from '../shared/motion';
export default function FeedGroup({
    item,
    isLast = false,
    rail,
    childRail,
    body,
    time,
    annotations,
    interactive = true,
    collapsed = null,
}: NodeProps & { item: GroupNode }) {
    const timestamp = useNodeTime(item, time);
    const faces = (item.sample.actors ?? []).slice(0, 2);
    const open =
        item.expanded ||
        (collapsed === null
            ? !interactive || (!item.headline_template && !item.headline)
            : !collapsed);
    // The disclosure's state, shared with the strip's "+N" tile, which opens and
    // closes the members like the summary does (ui#27); `onToggle` keeps it in
    // step with the native summary.
    const [isOpen, setOpen] = useState(open);
    // Every toggle morphs: the strip's tiles fly into the member rows (ui#30).
    // The summary's own toggle is cancelled so the change lands inside the transition.
    const row = useRef<HTMLDivElement>(null);
    const toggleOpen = () => morph(row.current, () => flushSync(() => setOpen((value) => !value)));
    const onSummaryClick = (event: MouseEvent<HTMLElement>) => {
        event.preventDefault();
        toggleOpen();
    };
    const membersId = `sf-members-${useId()}`;
    const Disclosure = interactive ? 'details' : 'div';
    const hidden = Math.max(0, item.count - item.children.length);
    // One tile per member activity, previewing the members, so expanding hides it (ui#47).
    const strip = stripOf(item);
    // Every actor's face, newest first, up to eight, then "+N"; hidden when expanded too (ui#48).
    const actors = actorStrip(item);
    const toggle =
        interactive && item.children.length > 0
            ? { expanded: isOpen, controls: membersId, label: `Show all ${item.count}`, onToggle: toggleOpen }
            : null;
    return (
        <div
            ref={row}
            className={`${MORPH_CLASSES} sf-row relative flex items-start gap-(--sf-gap-v) [--spacing:calc(var(--sf-font-size,1rem)/4)] [--text-xs:calc(var(--sf-font-size,1rem)*0.75)] [--text-sm:calc(var(--sf-font-size,1rem)*0.875)] [--text-base:var(--sf-font-size,1rem)] [--sf-gutter-v:var(--sf-gutter,--spacing(8))] [--sf-gap-v:var(--sf-gap,--spacing(3))] [--sf-disc-v:var(--sf-disc,--spacing(8))] [--sf-badge-v:var(--sf-badge,--spacing(3.5))] [--sf-badge-face-v:var(--sf-badge-face,--spacing(4.5))] text-base leading-[1.6]${
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
                className={`sf-body min-w-0 flex-1 pt-[max(0px,calc((var(--sf-disc-v)-1lh)/2))] ${
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
                <FeedActorStrip faces={isOpen ? [] : actors?.faces ?? []} overflow={actors?.overflow} toggle={toggle} />
                <FeedMediaStrip tiles={isOpen ? [] : strip?.tiles ?? []} overflow={strip?.overflow} toggle={toggle} />
                {body?.({ node: item })}
                {annotations?.({ node: item })}
                {item.children.length > 0 && (
                    <Disclosure
                        className={
                            interactive
                                ? 'group/disclosure sf-disclosure print:[&::details-content]:block print:[&::details-content]:[content-visibility:visible]'
                                : undefined
                        }
                        {...(interactive ? { open: isOpen, onToggle: (event: SyntheticEvent<HTMLElement>) => setOpen((event.currentTarget as HTMLDetailsElement).open) } : {})}
                    >
                        {interactive && (
                            <summary onClick={onSummaryClick} className="sf-toggle mt-1 inline-flex min-h-6 items-center cursor-pointer list-none rounded-sm border-0 bg-transparent p-0 text-sm leading-[1.6] font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden print:hidden">
                                <span className="group-open/disclosure:hidden">{`Show all ${item.count}`}</span>
                                <span className="hidden group-open/disclosure:inline">
                                    Show less
                                </span>
                            </summary>
                        )}
                        <div
                            id={membersId}
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
                                    body={body}
                                    annotations={annotations}
                                    time={time ? time : ({ label }) => label}
                                />
                            ))}
                            {hidden > 0 && (
                                <p className="sf-overflow pl-[calc(var(--sf-gutter-v)+var(--sf-gap-v))] text-sm leading-[1.6] text-muted-foreground">
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
