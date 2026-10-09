<?php

namespace Storyfeed\Ui\Support;

use Illuminate\Support\Collection;
use Storyfeed\Support\Entity;
use Storyfeed\Support\FeedItem;

/** A group's featured entities as a row of their avatars. Mirrors `shared/avatarRow.ts`. */
final class AvatarRow
{
    /**
     * The entities a group features: what the row is about, never who did it.
     * That is the object until core lets an activity name another featured
     * role; it never falls back to the actor or any other role.
     *
     * @return Collection<int, Entity>
     */
    public static function featured(FeedItem $group): Collection
    {
        return $group->entities('object');
    }

    /**
     * The featured entities with declared avatars, and how many were not
     * sampled; null when the row would add nothing: fewer than two declared
     * avatars, or every one the same picture.
     *
     * @return array{entities: Collection<int, Entity>, overflow: int}|null
     */
    public static function of(FeedItem $group): ?array
    {
        $sampled = self::featured($group);
        $entities = $sampled->filter(fn (Entity $entity): bool => self::declared($entity) !== null)->values();

        if ($entities->count() < 2 || $entities->map(self::declared(...))->unique()->count() < 2) {
            return null;
        }

        return ['entities' => $entities, 'overflow' => max(0, $group->distinct('object') - $sampled->count())];
    }

    /**
     * The avatar an entity declares: `media.icon`, or `media.initials` on a
     * `media.color` disc. Null when it declares neither, or has been deleted,
     * so an entity without one contributes nothing rather than a derived default.
     */
    private static function declared(Entity $entity): ?string
    {
        if ($entity->isTombstone()) {
            return null;
        }

        $icon = $entity->media()?->get('icon');
        if (is_array($icon) && is_string($icon['src'] ?? null) && $icon['src'] !== '') {
            return 'icon:'.$icon['src'];
        }

        $initials = $entity->media()?->get('initials');
        $color = Avatar::declaredColor($entity);

        return is_string($initials) && $initials !== '' && $color !== null ? 'initials:'.$initials.':'.strtolower($color) : null;
    }
}
