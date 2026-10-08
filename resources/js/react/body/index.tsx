import type { ComponentType } from 'react';
import {
    formsIn as discover,
    resolve as resolveBodies,
} from '../../shared/body';
import { fileLabel } from '../../shared/fileLabels';
import { isRich, renderProse } from '../../shared/prose';
import FeedMedia from '../FeedMedia';
import { useFeedOptions } from '../context';
export { imageOf } from '../../shared/body';
export interface BodyProps {
    payload: Record<string, any>;
    entityLabel?: string | null;
    entityUrl?: string | null;
    entityMedia?: Record<string, any> | null;
    imagePlacement?: 'beside' | 'below';
}
export function ComponentBody({ payload }: BodyProps) {
    const { FEED_COMPONENTS: registry = {} } = useFeedOptions();
    const Component =
        typeof payload.name === 'string' &&
        Object.hasOwn(registry, payload.name)
            ? registry[payload.name]
            : undefined;
    return Component ? <Component {...(payload.props ?? {})} /> : null;
}
export function Excerpt({ payload }: BodyProps) {
    return payload.text ? (
        <figure className="sf-excerpt-block m-0">
            <blockquote className="sf-excerpt m-0 border-l-2 border-border pl-3 text-[13.5px] whitespace-pre-wrap text-muted-foreground italic">
                {payload.text}
                {payload.truncated && <span aria-hidden="true">…</span>}
            </blockquote>
            {payload.from && (
                <figcaption className="sf-excerpt__from mt-0.5 text-[12.5px] text-muted-foreground">
                    {payload.from}
                </figcaption>
            )}
        </figure>
    ) : null;
}
export function FileAttachment({ payload }: BodyProps) {
    const { FEED_FILE_LABELLER: labeller } = useFeedOptions();
    const kind = fileLabel(
        { name: payload.name ?? null, mediaType: payload.mediaType ?? null },
        labeller,
    );
    let human: string | null = null;
    if (typeof payload.size === 'number') {
        const units = ['bytes', 'KB', 'MB', 'GB'];
        let value = payload.size,
            unit = 0;
        while (value >= 1000 && unit < units.length - 1) {
            value /= 1000;
            unit++;
        }
        human = `${unit === 0 ? value : value.toFixed(value < 10 ? 1 : 0)} ${units[unit]}`;
    }
    const description = [kind, human].filter(Boolean).join(' · ');
    return payload.name || description ? (
        <p className="sf-file m-0 text-[13.5px] text-muted-foreground">
            {[payload.name, description].filter(Boolean).join(' ')}
        </p>
    ) : null;
}
export function Image({ payload, entityMedia }: BodyProps) {
    const caption =
        typeof payload.caption === 'string' ? payload.caption : null;
    const slot = payload.image ?? 'preview';
    const picture = ['icon', 'preview', 'image'].includes(slot)
        ? entityMedia?.[slot]
        : null;
    return picture?.src ? (
        <figure className="sf-image m-0">
            <img
                className="block max-w-full rounded-lg"
                src={picture.src}
                alt={
                    typeof payload.alt === 'string'
                        ? payload.alt
                        : (caption ?? '')
                }
                width={payload.width ?? picture.width ?? undefined}
                height={payload.height ?? picture.height ?? undefined}
                loading="lazy"
            />
            {caption && (
                <figcaption className="mt-2 text-sm leading-[1.6] text-muted-foreground">
                    {caption}
                </figcaption>
            )}
        </figure>
    ) : null;
}
export function ItemList({ payload, entityUrl }: BodyProps) {
    const { FEED_LINK: Link = 'a' } = useFeedOptions();
    const link = (value: any) =>
        typeof value === 'string'
            ? { label: value, href: null }
            : { label: value.label, href: value.href ?? entityUrl ?? null };
    const items = (payload.items ?? []).filter(Boolean).map(link);
    if (!items.length) return null;
    const more = payload.more ? link(payload.more) : null;
    const remaining =
        typeof payload.totalItems === 'number'
            ? Math.max(payload.totalItems - items.length, 0)
            : 0;
    const Tag = payload.ordered ? 'ol' : 'ul';
    return (
        <figure className="sf-list-block m-0 min-w-0 max-w-xl rounded-lg bg-card px-4 py-3">
            {payload.title && (
                <figcaption className="sf-list__title mb-1 text-[13px] text-foreground">
                    {payload.title}
                </figcaption>
            )}
            <Tag
                className={`sf-list m-0 pl-[1.15rem] text-[13.5px] leading-[1.6] ${payload.ordered ? 'list-decimal' : 'list-disc'}`}
            >
                {items.map((item: any, i: number) => (
                    <li key={i} className="sf-list__item m-0">
                        {item.href ? (
                            <Link
                                href={item.href}
                                className="sf-entity font-medium text-foreground no-underline underline-offset-2 hover:underline"
                            >
                                {item.label}
                            </Link>
                        ) : (
                            item.label
                        )}
                    </li>
                ))}
            </Tag>
            {!!(remaining || more) && (
                <figcaption className="sf-list__more mt-1 flex gap-2 text-[12.5px] text-muted-foreground">
                    {!!remaining && <span>and {remaining} more</span>}
                    {more?.href ? (
                        <Link
                            href={more.href}
                            className="sf-entity font-medium text-foreground no-underline underline-offset-2 hover:underline"
                        >
                            {more.label}
                        </Link>
                    ) : (
                        more && <span>{more.label}</span>
                    )}
                </figcaption>
            )}
        </figure>
    );
}
export function KeyValue({ payload }: BodyProps) {
    const rows = (payload.items ?? [])
        .map((row: any) => ({
            ...row,
            placeholder:
                'placeholder' in row
                    ? row.placeholder
                    : (payload.$v ?? 1) < 2 && 'missing' in row
                      ? row.missing
                      : 'defaultPlaceholder' in payload
                        ? payload.defaultPlaceholder
                        : (payload.$v ?? 1) < 2
                          ? payload.missing
                          : null,
        }))
        .filter(
            (row: any) =>
                !(row.value === null || row.value === '') ||
                row.placeholder != null,
        );
    if (!rows.length) return null;
    return (
        <figure className="sf-facts m-0 flex max-w-lg flex-col rounded-lg border border-border px-3 py-1.5 text-[13.5px] leading-[1.5]">
            {payload.title && (
                <figcaption className="sf-facts__title border-b border-border pt-[3px] pb-[5px] font-semibold text-foreground">
                    {payload.title}
                </figcaption>
            )}
            <dl className="sf-facts__rows m-0 flex flex-col">
                {rows.map((row: any, i: number) => (
                    <div
                        key={i}
                        className="sf-facts__row grid grid-cols-[minmax(0,1fr)_minmax(0,auto)] items-baseline gap-x-4 gap-y-1 border-b border-border py-[3px] last:border-b-0"
                    >
                        <dt className="sf-facts__label min-w-0 text-foreground [overflow-wrap:anywhere]">
                            {row.key}
                        </dt>
                        <dd
                            className={`sf-facts__value m-0 min-w-0 text-right text-muted-foreground tabular-nums [overflow-wrap:anywhere]${row.verbatim ? ' sf-facts__value--verbatim truncate font-mono text-[12.5px]' : ''}`}
                            title={
                                row.verbatim && typeof row.value === 'string'
                                    ? row.value
                                    : undefined
                            }
                        >
                            {row.value === null || row.value === '' ? (
                                <span className="sf-facts__value--absent text-muted-foreground italic">
                                    {row.placeholder}
                                </span>
                            ) : typeof row.value === 'boolean' ? (
                                row.value ? (
                                    'Yes'
                                ) : (
                                    'No'
                                )
                            ) : (
                                String(row.value)
                            )}
                        </dd>
                    </div>
                ))}
            </dl>
        </figure>
    );
}
export function MediaObject({
    payload,
    entityUrl,
    entityMedia,
    imagePlacement,
}: BodyProps) {
    const {
        FEED_LINK: Link = 'a',
        FEED_MEDIA_OBJECT_PLACEMENT: defaultPlacement = 'beside',
    } = useFeedOptions();
    const placement = imagePlacement ?? defaultPlacement;
    const link = (value: any) =>
        typeof value === 'string'
            ? { label: value, href: null }
            : value
              ? { label: value.label, href: value.href ?? entityUrl ?? null }
              : null;
    const subject = link(payload.subject);
    const listed =
        'files' in payload
            ? payload.files
            : (payload.$v ?? 1) < 2
              ? payload.attachments
              : [];
    const files = Array.isArray(listed) ? listed : [];
    const picture = ['icon', 'preview', 'image'].includes(payload.image)
        ? (entityMedia?.[payload.image] ?? null)
        : null;
    const footnote = link(payload.footnote);
    return (
        <div className="sf-media-object mt-1.5 flex min-w-0 max-w-lg items-start gap-3 rounded-lg border border-border bg-muted p-3">
            {picture && placement === 'beside' && (
                <div className="sf-media-object__image w-16 flex-[0_0_64px]">
                    <FeedMedia
                        image={picture}
                        className="mt-0! size-16! rounded-md!"
                    />
                </div>
            )}
            <div className="sf-media-object__body flex min-w-0 flex-1 flex-col gap-1 [overflow-wrap:anywhere]">
                {subject?.label && (
                    <p className="sf-media-object__subject m-0 text-[13.5px] font-medium text-foreground">
                        {subject.href ? (
                            <Link href={subject.href}>{subject.label}</Link>
                        ) : (
                            subject.label
                        )}
                    </p>
                )}
                {payload.content && (
                    <p className="sf-prose m-0 text-[13.5px] leading-[1.6] whitespace-pre-wrap sf-media-object__content line-clamp-3 text-muted-foreground">
                        {payload.content}
                    </p>
                )}
                {picture && placement === 'below' && (
                    <FeedMedia image={picture} />
                )}
                {!!files.length && (
                    <ul className="sf-media-object__attachments mt-0.5 mb-0 flex list-none flex-col gap-0.5 p-0">
                        {files.map((file: any, i: number) => (
                            <li
                                key={i}
                                className="sf-file m-0 text-[13.5px] text-muted-foreground"
                            >
                                <Link href={file.href}>
                                    {file.name ?? file.href}
                                </Link>
                                {file.mediaType && (
                                    <span> · {file.mediaType}</span>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
                {footnote && (
                    <p className="sf-media-object__footnote mt-0.5 mb-0 text-xs leading-[1.6] text-muted-foreground">
                        {footnote.href ? (
                            <Link href={footnote.href}>{footnote.label}</Link>
                        ) : (
                            footnote.label
                        )}
                    </p>
                )}
            </div>
        </div>
    );
}
export function Prose({ payload }: BodyProps) {
    if (!payload.content) return null;
    return (
        <figure
            className={`sf-prose-block m-0 min-w-0 max-w-xl ${payload.verbatim ? 'sf-prose-block--verbatim' : 'rounded-lg bg-card px-4 py-3'}`}
        >
            {payload.title && (
                <figcaption className="sf-prose__title mb-2 text-[13px] font-medium text-foreground">
                    {payload.title}
                </figcaption>
            )}
            {payload.verbatim ? (
                <pre
                    className="sf-verbatim m-0 max-h-96 overflow-auto rounded-lg bg-foreground px-4 py-3 font-mono text-[12.5px] leading-[1.55] whitespace-pre-wrap text-background dark:bg-background dark:text-foreground [overflow-wrap:anywhere] [&_code]:bg-transparent [&_code]:p-0 [&_code]:font-[inherit] [&_code]:text-inherit"
                    tabIndex={0}
                >
                    <code>{payload.content}</code>
                </pre>
            ) : isRich(payload) ? (
                <div
                    className="sf-rich-text max-h-96 overflow-auto text-[13.5px] leading-[1.6] [overflow-wrap:anywhere] [&>:first-child]:mt-0 [&>:last-child]:mb-0 [&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-[1.4rem] [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-[1.4rem] [&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_a]:text-primary [&_a]:underline [&_pre]:overflow-auto [&_pre]:rounded [&_pre]:bg-border [&_pre]:p-2 [&_:is(h1,h2,h3,h4,h5,h6)]:mt-3 [&_:is(h1,h2,h3,h4,h5,h6)]:mb-1.5 [&_:is(h1,h2,h3,h4,h5,h6)]:border-0 [&_:is(h1,h2,h3,h4,h5,h6)]:p-0 [&_:is(h1,h2,h3,h4,h5,h6)]:text-sm [&_:is(h1,h2,h3,h4,h5,h6)]:leading-[1.6] [&_:is(h1,h2,h3,h4,h5,h6)]:font-semibold"
                    tabIndex={0}
                    dangerouslySetInnerHTML={{ __html: renderProse(payload) }}
                />
            ) : (
                <p
                    className="sf-prose m-0 text-[13.5px] leading-[1.6] whitespace-pre-wrap sf-prose--scroll max-h-96 overflow-auto [overflow-wrap:anywhere]"
                    tabIndex={0}
                >
                    {payload.content}
                </p>
            )}
        </figure>
    );
}
const FORMS: Record<string, ComponentType<BodyProps>> = Object.fromEntries(
    Object.entries({
        Component: ComponentBody,
        KeyValue,
        Excerpt,
        FileAttachment,
        File: FileAttachment,
        Prose,
        ItemList,
        Image,
        MediaObject,
    }).map(([name, component]) => [`Storyfeed/Body/${name}`, component]),
);
export const formsIn = (data: unknown, depth = 4) =>
    discover(data, depth).map(({ name, payload }) => ({
        component: FORMS[name],
        payload,
    }));
export const resolve = (body: unknown) =>
    resolveBodies(body).map(({ name, payload }) => ({
        component: FORMS[name],
        payload,
    }));
