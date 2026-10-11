<?php

namespace Storyfeed\Ui\Support;

use Storyfeed\Support\Entity;
use Storyfeed\Support\FeedItem;

/**
 * A group's actor strip: its actors' faces as one compact, overlapping row
 * of 24px avatars, then a "+N" chip for the actors not shown (ui#48).
 * Mirrors `shared/actors.ts`.
 *
 * Every actor shows, newest first, including the ones the headline names.
 * The faces come from the group's members, so each one is a member row's
 * face once the group is expanded; the count comes from core's true
 * `distinct.actors`. A different component from the feature strip
 * (`Strip`), which tiles what each member features.
 */
final class ActorStrip
{
    /** How many faces the strip draws before "+N". */
    public const FACES = 8;

    /**
     * The faces and the "+N" count, or null when the group has fewer than
     * two actors. With eight actors or fewer, all of them show and there's
     * no chip.
     *
     * @return array{faces: list<Entity>, overflow: int}|null
     */
    public static function of(FeedItem $group): ?array
    {
        $actors = [];
        foreach ($group->children() as $member) {
            $actor = $member->actor();
            if ($actor !== null) {
                $actors[$actor->type().':'.$actor->id()] ??= $actor;
            }
        }

        $distinct = $group->get('distinct');
        $total = max(is_array($distinct) && is_int($distinct['actors'] ?? null) ? $distinct['actors'] : 0, count($actors));
        if ($total < 2) {
            return null;
        }

        $faces = array_slice(array_values($actors), 0, self::FACES);

        return ['faces' => $faces, 'overflow' => $total - count($faces)];
    }
}
