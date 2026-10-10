<?php

namespace Storyfeed\Ui\Support;

use Storyfeed\Support\Entity;
use Storyfeed\Support\FeedItem;

/**
 * A group's strip: one tile per member activity, previewing what that
 * member's expanded row shows (ui#47). Mirrors `shared/strip.ts`.
 *
 * A tile only shows what the row below draws. A member whose row draws a
 * picture (its featured entity's Image body) gets that picture; every other
 * member gets a quiet name tile, its featured entity's label, which the
 * member's headline names. Never initials, and an icon the entity declares
 * counts only when an Image body draws it. Every tile is the same rounded
 * square.
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
     * The entity a member activity features: the role it names in `featured`
     * (storyfeed/storyfeed#76), none when that is null, and the object before
     * core sent the field. Mirrors `featuredOf()` in `shared/strip.ts`.
     */
    public static function featured(FeedItem $member): ?Entity
    {
        if (! array_key_exists('featured', $member->toArray())) {
            return $member->object();
        }

        $role = $member->get('featured');

        return is_string($role) && $role !== '' ? $member->entity($role) : null;
    }

    /**
     * The entities a strip draws, one per sampled member, newest first:
     * core's `sample.featured` when it sends one (storyfeed/storyfeed#93),
     * else each member's own featured entity. With the total of members that
     * feature one. Mirrors `stripEntities()`.
     *
     * @return array{entities: list<Entity>, total: int}
     */
    public static function entities(FeedItem $group): array
    {
        $sample = $group->get('sample');
        if (is_array($sample) && is_array($sample['featured'] ?? null)) {
            $entities = array_values(array_map(fn (array $entity) => Entity::of(array_filter($entity, is_string(...), ARRAY_FILTER_USE_KEY)), array_filter($sample['featured'], is_array(...))));
            $distinct = $group->get('distinct');
            $total = is_array($distinct) && is_int($distinct['featured'] ?? null) ? $distinct['featured'] : $group->count();

            return ['entities' => $entities, 'total' => max($total, count($entities))];
        }

        $entities = [];
        foreach (self::members($group) as $member) {
            if (($entity = self::featured($member)) !== null) {
                $entities[] = $entity;
            }
        }

        return ['entities' => $entities, 'total' => max($group->count(), count($entities))];
    }

    /**
     * The tiles and the "+N" count, or null when the strip would show
     * nothing new: no featured entity, or every tile the same. Up to four
     * tiles; past that, three and a "+N" tile counting the members not shown.
     * A member with neither a picture nor a label has nothing to preview, so
     * the "+N" counts it.
     *
     * @return array{tiles: list<array{entity: Entity, image: array<array-key, mixed>|null, label: string|null, href: string|null, attributes: array<array-key, mixed>}>, overflow: int}|null
     */
    public static function of(FeedItem $group): ?array
    {
        ['entities' => $entities, 'total' => $total] = self::entities($group);
        $all = array_values(array_filter(array_map(self::tile(...), $entities), fn (array $tile) => $tile['image'] !== null || $tile['label'] !== null));

        if (count(array_unique(array_map(self::sameness(...), $all))) < 2) {
            return null;
        }

        $tiles = array_slice($all, 0, $total > self::SLOTS ? self::SLOTS - 1 : self::SLOTS);

        return ['tiles' => $tiles, 'overflow' => $total - count($tiles)];
    }

    /** @return array{entity: Entity, image: array<array-key, mixed>|null, label: string|null, href: string|null, attributes: array<array-key, mixed>} */
    private static function tile(Entity $entity): array
    {
        $link = Links::entity($entity);
        $image = null;
        foreach ($entity->bodies()->merge(Bodies::in($entity->get('data'))) as $body) {
            if (($image = Bodies::picture($body, $entity)) !== null) {
                break;
            }
        }
        $label = $entity->label();

        return ['entity' => $entity, 'image' => $image, 'label' => is_string($label) && trim($label) !== '' ? $label : null, 'href' => $link['href'] ?? null, 'attributes' => $link['attributes'] ?? []];
    }

    /** @param array{entity: Entity, image: array<array-key, mixed>|null} $tile */
    private static function sameness(array $tile): string
    {
        $src = $tile['image']['src'] ?? null;

        return is_string($src) ? 'src:'.$src : 'entity:'.$tile['entity']->type().':'.$tile['entity']->id().':'.($tile['entity']->isTombstone() ? 'gone' : '');
    }
}
