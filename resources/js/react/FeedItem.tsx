import type { CSSProperties, ReactNode } from 'react';
import type { ActivityNode, FeedNode } from '../shared/types';
import type { Rail as RailConfig, RailName } from '../shared/rail';
import { formsIn, resolve, imageOf, Image } from './body';
import FeedHeadline from './FeedHeadline';
import FeedMeta from './FeedMeta';
import FeedMedia from './FeedMedia';
import FeedMediaStrip from './FeedMediaStrip';
import Rail from './Rail';
import { useFeedOptions } from './context';
import { entityLink } from '../shared/link';
import { bodyFrame, iconOf } from '../shared/body';
import { useRelativeTime } from './useRelativeTime';
export interface FeedRenderProps {
    body?: (props: { node: FeedNode }) => ReactNode;
    annotations?: (props: { node: FeedNode }) => ReactNode;
    time?: (props: { node: FeedNode; label: string }) => ReactNode;
}
export interface NodeProps extends FeedRenderProps {
    interactive?: boolean;
    collapsed?: boolean | null;
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
            className="sf-time text-sm text-muted-foreground"
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
    const { FEED_BODIES: bodies = {} } = useFeedOptions();
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
    const link = entityLink(object);
    const found = [
        ...formsIn(item.data, 4, bodies),
        ...[...resolve(object?.body, bodies), ...formsIn(object?.data, 4, bodies)].map(
            (found) => ({
                ...found,
                entityLabel: object?.label,
                entityUrl: link?.href,
                entityLink: link,
                entityMedia: object?.media,
            }),
        ),
    ];
    // A row shows a picture only when a body asks: an Image naming the icon slot
    // draws as the small thumbnail beside the other bodies, unless the app
    // draws Image bodies itself.
    const lead = found.findIndex(
        (form) => form.component === Image && iconOf(form.payload, (form as any).entityMedia) !== null,
    );
    const icon = lead === -1 ? null : iconOf(found[lead].payload, (found[lead] as any).entityMedia);
    const forms = found.filter((_, index) => index !== lead);
    const sample = (item as any).sample?.objects ?? [];
    const tiles = sample
        .map((entity: any) => ({
            image: imageOf(entity),
            href: entityLink(entity)?.href ?? null,
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
                className={`sf-body min-w-0 flex-1 ${
                    isLast ? '' : 'sf-body--spaced pb-5'
                } ${dense ? 'sf-body--dense pt-1' : 'pt-1.5'}`}
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
                            href={link?.href ?? null}
                            linkAttributes={link?.attributes}
                            className="mt-0! size-10! shrink-0 rounded-md!"
                        />
                    )}
                    <div className={icon ? 'min-w-0 flex-1' : 'contents'}>
                        {body?.({ node: item })}
                        <FeedMediaStrip tiles={tiles} />
                        {forms.map(
                            (
                                { component: Component, payload, ...entity },
                                i,
                            ) => {
                                // The body's own maximum height, if it sets one (see `bodyFrame()`).
                                const frame = bodyFrame(payload);
                                return (
                                    <div
                                        key={i}
                                        className={[
                                            'sf-body-form mt-2 max-w-176 empty:hidden',
                                            frame.capped && 'max-h-(--sf-body-max-h) overflow-y-auto',
                                        ]
                                            .filter(Boolean)
                                            .join(' ')}
                                        style={frame.style as CSSProperties | undefined}
                                        tabIndex={frame.capped ? 0 : undefined}
                                    >
                                        <Component payload={payload} {...entity} />
                                    </div>
                                );
                            },
                        )}
                    </div>
                </div>
                {annotations?.({ node: item })}
            </div>
        </div>
    );
}
