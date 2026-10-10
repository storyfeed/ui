import type { FeedEntity } from '../shared/types';
import type { Rail as RailConfig, RailName } from '../shared/rail';
import { rail as parseRail, railFor, withoutSecondary } from '../shared/rail';
import EntityAvatar from './EntityAvatar';
import FeedIcon from './FeedIcon';
export default function Rail({
    faces,
    glyph,
    intent,
    rail,
    dense = false,
    line = true,
}: {
    faces: FeedEntity[];
    glyph: string | null;
    intent?: string | null;
    rail?: RailConfig | RailName | null;
    dense?: boolean;
    line?: boolean;
}) {
    const configured = parseRail(
        rail ?? (dense ? 'activity-only' : 'actor-only'),
    );
    const slots = railFor(dense ? withoutSecondary(configured) : configured, {
        actors: faces.length,
        glyph: Boolean(glyph),
    });
    const disc =
        slots.disc === 'actor' && faces.length > 1 ? (
            // A diagonal pair inside one disc's square (ui#25): the first actor in
            // front at the bottom-right, where the badge sits, the second behind.
            <div className="sf-avatars @container/pair relative size-(--sf-disc) shrink-0">
                {faces.slice(0, 2).map((face, i) => (
                    <span
                        key={`${face.type}:${face.id}:${i}`}
                        className={i === 0 ? 'sf-avatars__face absolute right-0 bottom-0 z-10 flex size-[calc(var(--sf-disc)*2/3)] @max-[1.5rem]/pair:size-full' : 'sf-avatars__face absolute top-0 left-0 flex size-[calc(var(--sf-disc)*2/3)] @max-[1.5rem]/pair:hidden'}
                    >
                        <EntityAvatar entity={face} size="pair" />
                    </span>
                ))}
            </div>
        ) : slots.disc === 'actor' ? (
            <EntityAvatar entity={faces[0] ?? null} size="md" />
        ) : slots.disc === 'activity' ? (
            <FeedIcon icon={glyph} intent={intent} />
        ) : (
            <span
                className="sf-icon flex size-[var(--sf-disc,--spacing(8))] shrink-0 items-center justify-center rounded-full border border-border bg-background text-muted-foreground [&_svg]:size-3.5 sf-icon--blank border-dashed"
                aria-hidden="true"
            />
        );
    return (
        <div className="sf-rail box-content flex w-(--sf-gutter) shrink-0 flex-col items-center self-stretch">
            <div className="sf-rail__disc relative flex w-(--sf-disc) shrink-0 [&:has(>.sf-avatars)>.sf-badge]:[--sf-badge:--spacing(2.75)] [&:has(>.sf-avatars)>.sf-badge_svg]:size-2">
                {disc}
                {slots.badge === 'activity' ? (
                    <FeedIcon icon={glyph} variant="badge" />
                ) : slots.badge === 'actor' ? (
                    <EntityAvatar entity={faces[0] ?? null} size="badge" />
                ) : null}
            </div>
            {line && (
                <div
                    aria-hidden="true"
                    className="sf-rail__line mt-1 w-px flex-1 bg-border"
                />
            )}
        </div>
    );
}
