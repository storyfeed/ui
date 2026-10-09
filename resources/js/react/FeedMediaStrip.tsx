import FeedMedia from './FeedMedia';
export default function FeedMediaStrip({
    tiles,
    overflow = 0,
}: {
    tiles: Array<Record<string, any>>;
    overflow?: number | null;
}) {
    if (!tiles.length) return null;
    const count = tiles.length + (overflow ? 1 : 0);
    return (
        <div
            className={`sf-media-strip mt-2 flex max-w-88 flex-wrap gap-1 sf-media-strip--tiles-${count}`}
        >
            {tiles.map((tile, i) => (
                <FeedMedia
                    key={i}
                    image={tile.image}
                    href={tile.href}
                    className={`mt-0! min-w-0 max-w-none! ${[1, 2, 4].includes(count) ? 'flex-[1_1_calc(50%-var(--spacing)/2)]' : [3, 5, 6].includes(count) ? 'flex-[1_1_calc(33.333%-var(--spacing)*0.75)]' : 'flex-1'}`}
                />
            ))}
            {!!overflow && (
                <div className="sf-media-strip__more flex min-h-14 flex-[1_1_calc(33.333%-var(--spacing)*0.75)] items-center justify-center rounded-lg bg-muted text-sm text-muted-foreground">
                    +{overflow} more
                </div>
            )}
        </div>
    );
}
