import type { ReactNode } from 'react';
import type { ActivityNode, FeedNode } from '../shared/types';
import type { Rail as RailConfig, RailName } from '../shared/rail';
import { formsIn, resolve, imageOf } from './body';
import FeedHeadline from './FeedHeadline';
import FeedMeta from './FeedMeta';
import FeedMediaStrip from './FeedMediaStrip';
import Rail from './Rail';
import { useRelativeTime } from './useRelativeTime';
export interface FeedRenderProps {
    body?: (props: { node: FeedNode }) => ReactNode;
    annotations?: (props: { node: FeedNode }) => ReactNode;
    time?: (props: { node: FeedNode; label: string }) => ReactNode;
}
export interface NodeProps extends FeedRenderProps {
    isLast?: boolean;
    rail?: RailConfig | RailName | null;
    childRail?: RailConfig | RailName | null;
}
export function useNodeTime(node: FeedNode, time?: FeedRenderProps['time']) {
    const clock = useRelativeTime(node.published_at);
    return time ? (
        time({ node, label: clock.label })
    ) : (
        <time
            dateTime={node.published_at}
            title={clock.full}
            className="sf-time text-xs text-muted-foreground"
        >
            {clock.label}
        </time>
    );
}
export default function FeedItem({
    item,
    dense = false,
    isLast = false,
    rail,
    time,
    body,
    annotations,
}: NodeProps & { item: ActivityNode; dense?: boolean }) {
    const timestamp = useNodeTime(item, time);
    const reading =
        item.redundant &&
        (item.missing_headline_template || item.missing_headline)
            ? {
                  template: item.missing_headline_template ?? null,
                  headline: item.missing_headline ?? null,
              }
            : {
                  template: item.headline_template,
                  headline: item.headline ?? null,
              };
    const object = item.object;
    const forms = [
        ...formsIn(item.data),
        ...[...resolve(object?.body), ...formsIn(object?.data)].map(
            (found) => ({
                ...found,
                entityLabel: object?.label,
                entityUrl: object?.url,
                entityMedia: object?.media,
            }),
        ),
    ];
    const sample = (item as any).sample?.objects ?? [];
    const tiles = sample
        .map((entity: any) => ({
            image: imageOf(entity),
            href: entity.url ?? null,
        }))
        .filter((tile: any) => tile.image !== null);
    return (
        <div className="sf-row relative flex items-start gap-(--sf-gap)">
            <Rail
                faces={item.actor ? [item.actor] : []}
                glyph={item.glyph}
                intent={item.glyph_intent}
                rail={rail}
                dense={dense}
                line={!isLast}
            />
            <div
                className={`sf-body min-w-0 flex-1 ${isLast ? '' : 'sf-body--spaced pb-5'} ${dense ? 'sf-body--dense pt-1' : 'pt-1.5'}`}
            >
                <div className="sf-head flex items-baseline gap-3">
                    <FeedHeadline
                        {...reading}
                        entities={item}
                        verb={item.verb}
                    />
                </div>
                <FeedMeta node={item} templates={[reading.template]}>
                    {timestamp}
                </FeedMeta>
                {body?.({ node: item })}
                <FeedMediaStrip tiles={tiles} />
                {forms.map(
                    ({ component: Component, payload, ...entity }, i) => (
                        <div
                            key={i}
                            className="sf-body-form mt-2 max-w-[44rem] empty:hidden"
                        >
                            <Component payload={payload} {...entity} />
                        </div>
                    ),
                )}
                {annotations?.({ node: item })}
            </div>
        </div>
    );
}
