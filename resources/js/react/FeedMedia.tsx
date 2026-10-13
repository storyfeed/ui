import { imageClasses } from '../shared/body';
import { linkAttributes as filterAttributes } from '../shared/linkAttributes';
import { useFeedOptions } from './context';
export default function FeedMedia({
    image,
    payload,
    href,
    className = '',
    linkAttributes,
}: {
    image: Record<string, any>;
    payload?: Record<string, any>;
    href?: string | null;
    className?: string;
    linkAttributes?: Record<string, unknown>;
}) {
    const { FEED_LINK: Link = 'a', FEED_MEDIA: Media } = useFeedOptions();
    const attributes = href ? filterAttributes(linkAttributes) : {};
    // Feed limits inherit through CSS; a custom Image renderer passes its body to override them.
    const classes = `sf-media mt-2 block w-fit max-w-[min(100%,var(--sf-image-width,22rem))] overflow-hidden rounded-lg [&>img]:block [&>img]:w-auto [&>img]:h-auto [&>img]:object-contain [&>img]:max-w-full [&>img]:max-h-[var(--sf-image-height,none)] ${imageClasses(payload ?? {}) ?? ''} ${className}`;
    if (Media)
        return (
            <Media
                image={image}
                href={href}
                linkAttributes={attributes}
                className={classes}
            />
        );
    const Tag = href ? Link : 'div';
    return (
        <Tag
            {...attributes}
            href={href || undefined}
            className={classes}
        >
            <img
                src={image.src}
                alt={image.alt ?? ''}
                width={image.width ?? undefined}
                height={image.height ?? undefined}
                loading="eager"
            />
        </Tag>
    );
}
