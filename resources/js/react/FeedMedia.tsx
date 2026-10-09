import { linkAttributes as filterAttributes } from '../shared/linkAttributes';
import { useFeedOptions } from './context';
export default function FeedMedia({
    image,
    href,
    className = '',
    linkAttributes,
}: {
    image: Record<string, any>;
    href?: string | null;
    className?: string;
    linkAttributes?: Record<string, unknown>;
}) {
    const { FEED_LINK: Link = 'a', FEED_MEDIA: Media } = useFeedOptions();
    const attributes = href ? filterAttributes(linkAttributes) : {};
    if (Media)
        return (
            <Media
                image={image}
                href={href}
                linkAttributes={attributes}
                className={`sf-media mt-2 block max-w-88 overflow-hidden rounded-lg bg-muted ${className}`}
            />
        );
    const Tag = href ? Link : 'div';
    return (
        <Tag
            {...attributes}
            href={href || undefined}
            className={`sf-media mt-2 block max-w-88 overflow-hidden rounded-lg bg-muted ${className}`}
            style={
                image.width && image.height
                    ? { aspectRatio: `${image.width} / ${image.height}` }
                    : undefined
            }
        >
            <img
                className="block size-full object-cover"
                src={image.src}
                alt={image.alt ?? ''}
                width={image.width ?? undefined}
                height={image.height ?? undefined}
                loading="eager"
            />
        </Tag>
    );
}
