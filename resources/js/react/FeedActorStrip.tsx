import EntityAvatar from './EntityAvatar';
import type { FeedEntity } from '../shared/types';

/**
 * A group's actor strip: its actors' faces, newest first, as one compact
 * overlapping row of 24px avatars, then a "+N" chip for the actors not shown
 * (ui#48). Each face is a member row's face once the group is expanded.
 *
 * Build the faces with `actorStrip()` in `shared/actors.ts`.
 */
export default function FeedActorStrip({
    faces,
    overflow = 0,
    toggle,
}: {
    faces: FeedEntity[];
    overflow?: number | null;
    /** When the group can open, the "+N" chip opens and closes it like its own toggle. */
    toggle?: { expanded: boolean; controls: string; label: string; onToggle: () => void } | null;
}) {
    if (!faces.length) return null;
    return (
        <div className="sf-actor-strip mt-2 flex items-center pl-1.25">
            {faces.map((face, i) => (
                <span key={i} className="sf-actor-strip__face -ml-1.25 flex">
                    <EntityAvatar entity={face} size="sm" />
                </span>
            ))}
            {!!overflow && toggle ? (
                <button
                    type="button"
                    aria-label={toggle.label}
                    aria-expanded={toggle.expanded}
                    aria-controls={toggle.controls}
                    className="sf-actor-strip__more -ml-1.25 flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-muted px-1.5 py-0 text-[length:--spacing(2.5)] font-semibold text-muted-foreground ring-2 ring-background select-none cursor-pointer border-0 font-[inherit] hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                    onClick={toggle.onToggle}
                >
                    +{overflow}
                </button>
            ) : !!overflow && (
                <span
                    role="img"
                    aria-label={`${overflow} more`}
                    className="sf-actor-strip__more -ml-1.25 flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-muted px-1.5 text-[length:--spacing(2.5)] font-semibold text-muted-foreground ring-2 ring-background select-none"
                >
                    +{overflow}
                </span>
            )}
        </div>
    );
}
