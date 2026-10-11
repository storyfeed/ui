import type { FeedEntity, GroupNode } from '../../resources/js/shared/types';

/**
 * Actor strip policies to compare (ui#48). None changes the payload or the kit:
 * the stack is the `ActorStack` mock, drawn in the group's body slot.
 *
 * Faces come from the members (`children[].actor`), not `sample.actors`: core
 * samples three actors by default (`grouping.sample_limits.actor`), and the
 * headline already names those. Drawing from the members also keeps the
 * principle: every face in the stack is a member row's face once expanded.
 */
export type Stack = { faces: FeedEntity[]; overflow: number; size: number };
export type Variant = { key: string; title: string; rule: string; stack: Stack | null };

function memberActors(group: GroupNode): FeedEntity[] {
    const seen = new Set<string>();

    return group.children.map(child => child.actor as FeedEntity | null).filter((actor): actor is FeedEntity => {
        if (!actor || seen.has(`${actor.type}:${actor.id}`)) return false;
        seen.add(`${actor.type}:${actor.id}`);

        return true;
    });
}

const named = (group: GroupNode) => new Set((group.sample.actors ?? []).map(actor => `${actor.type}:${actor.id}`));

export const none = (): Variant => ({ key: 'none', title: 'No strip', rule: 'Today: the headline names three, the rail shows a pair, "Show all" opens the members.', stack: null });

export function always(group: GroupNode, limit: number, size = 24): Variant {
    const faces = memberActors(group).slice(0, limit);
    const total = group.distinct.actors ?? faces.length;

    return {
        key: `always-${limit}-${size}`,
        title: `Always · ${limit} faces${size !== 24 ? ` · ${size}px` : ''}`,
        rule: `Every actor, newest first, the named ones included. "+N" = ${total} actors − ${faces.length} faces.`,
        stack: { faces, overflow: total - faces.length, size },
    };
}

export function beyond(group: GroupNode, limit: number, size = 24): Variant {
    const skip = named(group);
    const rest = memberActors(group).filter(actor => !skip.has(`${actor.type}:${actor.id}`));
    const faces = rest.slice(0, limit);
    const others = (group.distinct.actors ?? 0) - skip.size;

    return {
        key: `beyond-${limit}-${size}`,
        title: `Beyond the headline · ${limit} faces${size !== 24 ? ` · ${size}px` : ''}`,
        rule: others > 0
            ? `Only the "${others} more": the headline's ${skip.size} names are left out. "+N" = ${others} − ${faces.length} faces.`
            : 'The headline names everyone, so no stack.',
        stack: faces.length ? { faces, overflow: others - faces.length, size } : null,
    };
}
