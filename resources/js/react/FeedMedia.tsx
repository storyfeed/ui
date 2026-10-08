import { useFeedOptions } from './context';
export default function FeedMedia({
    image,
    href,
    className = '',
}: {
    image: Record<string, any>;
    href?: string | null;
    className?: string;
}) {
    const { FEED_LINK: Link = 'a' } = useFeedOptions();
    const Tag = href ? Link : 'div';
    return (
        <Tag
            href={href || undefined}
            className={`sf-media mt-2 block max-w-[22rem] overflow-hidden rounded-lg bg-muted ${className}`}
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
