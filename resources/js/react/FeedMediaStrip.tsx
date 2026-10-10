import EntityAvatar from './EntityAvatar';
import FeedMedia from './FeedMedia';
import { useFeedOptions } from './context';
import { linkProps } from '../shared/link';

const tileClass = 'mt-0! aspect-square! size-full! max-w-none! rounded-lg!';

/**
 * A group's strip: one rounded-square tile per member activity, all the same
 * size and spaced, never overlapped (ui#27). A tile is the picture of what the
 * member features, else that entity's avatar, its initials on its colour; the
 * "+N" tile counts the members not shown. Each tile links to its entity.
 *
 * Build the tiles with `strip()` in `shared/strip.ts`. A tile without an
 * `entity` (an app's own `{ image, href }`) is drawn as a picture.
 */
export default function FeedMediaStrip({
    tiles,
    overflow = 0,
    toggle,
}: {
    tiles: Array<Record<string, any>>;
    overflow?: number | null;
    /** When the group can open, the "+N" tile opens and closes it like its own toggle (ui#27). */
    toggle?: { expanded: boolean; controls: string; label: string; onToggle: () => void } | null;
}) {
    const { FEED_LINK: Link = 'a' } = useFeedOptions();
    if (!tiles.length) return null;
    return (
        <div className="sf-media-strip mt-2 grid max-w-88 grid-cols-4 gap-1">
            {tiles.map((tile, i) =>
                tile.image ? (
                    <FeedMedia key={i} image={tile.image} href={tile.href} linkAttributes={tile.linkAttributes} className={tileClass} />
                ) : tile.link ? (
                    <Link
                        key={i}
                        {...linkProps(tile.link, Link)}
                        className="sf-media-strip__link flex rounded-lg focus-visible:outline-2 focus-visible:outline-ring"
                    >
                        <EntityAvatar entity={tile.entity} size="tile" />
                    </Link>
                ) : (
                    <EntityAvatar key={i} entity={tile.entity} size="tile" />
                ),
            )}
            {!!overflow && toggle ? (
                <button
                    type="button"
                    aria-label={toggle.label}
                    aria-expanded={toggle.expanded}
                    aria-controls={toggle.controls}
                    className="sf-media-strip__more flex aspect-square items-center justify-center rounded-lg bg-muted text-[length:--spacing(4)] font-semibold text-muted-foreground select-none cursor-pointer border-0 p-0 font-[inherit] hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                    onClick={toggle.onToggle}
                >
                    +{overflow}
                </button>
            ) : !!overflow && (
                <span
                    role="img"
                    aria-label={`${overflow} more`}
                    className="sf-media-strip__more flex aspect-square items-center justify-center rounded-lg bg-muted text-[length:--spacing(4)] font-semibold text-muted-foreground select-none"
                >
                    +{overflow}
                </span>
            )}
        </div>
    );
}
