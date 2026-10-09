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
        slots.disc === 'actor' ? (
            faces.map((face, i) => (
                <EntityAvatar
                    key={`${face.type}:${face.id}:${i}`}
                    entity={face}
                    size="md"
                />
            ))
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
            <div className="sf-rail__disc relative flex w-(--sf-disc) shrink-0">
                {slots.disc === 'actor' && faces.length > 1 ? (
                    <div className="sf-avatars flex flex-col [&>*+*]:-mt-3 [&>:first-child:nth-last-child(n+2)]:z-20 [&>:nth-child(2)]:z-10 [&>:nth-child(3)]:z-0">{disc}</div>
                ) : (
                    disc
                )}
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
