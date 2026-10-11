import type { FeedEntity, GroupNode } from './types';

/**
 * A group's actor strip: its actors' faces as one compact, overlapping row of
 * 24px avatars, then a "+N" chip for the actors not shown (ui#48). Mirrors
 * `ActorStrip::of()`.
 *
 * Every actor shows, newest first, including the ones the headline names. The
 * faces come from the group's members, so each one is a member row's face once
 * the group is expanded; the count comes from core's true `distinct.actors`.
 * A different component from the feature strip (`strip()`), which tiles what
 * each member features.
 */

/** How many faces the strip draws before "+N". */
export const ACTOR_STRIP_FACES = 8;

/** What makes two actors the same person: the entity they are. */
function identity(actor: FeedEntity): string {
    return `${actor.type ?? ''}:${actor.id ?? ''}`;
}

/**
 * The faces and the "+N" count, or null when the group has fewer than two
 * actors. With eight actors or fewer, all of them show and there's no chip.
 */
export function actorStrip(group: GroupNode): { faces: FeedEntity[]; overflow: number } | null {
    const seen = new Set<string>();
    const actors: FeedEntity[] = [];
    for (const member of group.children ?? []) {
        const actor = member?.actor;
        if (!actor || seen.has(identity(actor))) continue;
        seen.add(identity(actor));
        actors.push(actor);
    }

    const distinct = group.distinct?.actors;
    const total = Math.max(typeof distinct === 'number' ? distinct : 0, actors.length);
    if (total < 2) return null;

    const faces = actors.slice(0, ACTOR_STRIP_FACES);

    return { faces, overflow: total - faces.length };
}
