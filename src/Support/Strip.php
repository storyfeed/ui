<?php

namespace Storyfeed\Ui\Support;

use Storyfeed\Support\Entity;
use Storyfeed\Support\FeedItem;

/**
 * A group's strip: one tile per member activity, each the thumbnail of what
 * that activity features (ui#27). Mirrors `shared/strip.ts`.
 *
 * A tile is the featured entity's picture (its Image body, else its icon),
 * else its avatar: the initials on the colour core derives for every entity.
 * So a member never leaves a blank. Every tile is the same rounded square,
 * whether it stands for a person or a thing.
 */
final class Strip
{
    /** How many tiles fit the strip's one row, the "+N" tile included. */
    public const SLOTS = 4;

    /**
     * The members a strip samples, newest first: the group's own.
     *
     * @return list<FeedItem>
     */
    public static function members(FeedItem $group): array
    {
        return array_values($group->children()->all());
    }

    /**
     * The entity a member activity features. The object, until core sends
     * `sample.featured` (0.20); this is the one place that changes.
     */
    public static function featured(FeedItem $member): ?Entity
    {
        return $member->object();
    }

    /**
     * The tiles and the "+N" count, or null when the strip would show
     * nothing new: no featured entity, or every tile the same picture. Up to
     * four tiles; past that, three and a "+N" tile counting the members not
     * shown.
     *
     * @return array{tiles: list<array{entity: Entity, image: array<array-key, mixed>|null, href: string|null, attributes: array<array-key, mixed>}>, overflow: int}|null
     */
    public static function of(FeedItem $group): ?array
    {
        $all = [];
        foreach (self::members($group) as $member) {
            $entity = self::featured($member);
            if ($entity !== null) {
                $all[] = self::tile($entity);
            }
        }

        if (count(array_unique(array_map(self::sameness(...), $all))) < 2) {
            return null;
        }

        $total = max($group->count(), count($all));
        $tiles = array_slice($all, 0, $total > self::SLOTS ? self::SLOTS - 1 : self::SLOTS);

        return ['tiles' => $tiles, 'overflow' => $total - count($tiles)];
    }

    /** @return array{entity: Entity, image: array<array-key, mixed>|null, href: string|null, attributes: array<array-key, mixed>} */
    private static function tile(Entity $entity): array
    {
        $link = Links::entity($entity);
        $image = null;
        foreach ($entity->bodies()->merge(Bodies::in($entity->get('data'))) as $body) {
            if (($image = Bodies::picture($body, $entity)) !== null) {
                break;
            }
        }
        $icon = $entity->isTombstone() ? null : $entity->media()?->get('icon');
        if ($image === null && is_array($icon) && is_string($icon['src'] ?? null) && $icon['src'] !== '') {
            $image = [...$icon, 'alt' => $icon['alt'] ?? $entity->label() ?? ''];
        }

        return ['entity' => $entity, 'image' => $image, 'href' => $link['href'] ?? null, 'attributes' => $link['attributes'] ?? []];
    }

    /** @param array{entity: Entity, image: array<array-key, mixed>|null} $tile */
    private static function sameness(array $tile): string
    {
        $src = $tile['image']['src'] ?? null;

        return is_string($src) ? 'src:'.$src : 'entity:'.$tile['entity']->type().':'.$tile['entity']->id().':'.($tile['entity']->isTombstone() ? 'gone' : '');
    }
}
