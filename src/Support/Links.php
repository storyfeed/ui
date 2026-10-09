<?php

namespace Storyfeed\Ui\Support;

use Storyfeed\Support\Entity;

/**
 * Where a tap goes, read from either payload shape: core 0.17's one `link`
 * (`{href, modal, attributes}`, storyfeed/storyfeed#79) or core 0.16's
 * `url`, `modal` and `attributes`. Mirrors `shared/link.ts`.
 */
final class Links
{
    /**
     * An entity's own link, or null when it has none or has been deleted.
     *
     * @return array{href: string, modal: bool, attributes: array<string, scalar>}|null
     */
    public static function entity(?Entity $entity): ?array
    {
        if ($entity === null || $entity->isTombstone()) {
            return null;
        }

        $link = $entity->get('link');
        [$href, $modal, $attributes] = is_array($link)
            ? [$link['href'] ?? null, $link['modal'] ?? false, $link['attributes'] ?? []]
            : [$entity->get('url'), $entity->get('modal'), $entity->get('attributes')];

        return is_string($href) && $href !== ''
            ? ['href' => $href, 'modal' => $modal === true, 'attributes' => self::attributes($attributes)]
            : null;
    }

    /**
     * A link inside a body. One with an `href` goes there; one without is the
     * entity's own (`FeedLink::toEntity()`), and its `modal` and `attributes`
     * add to the entity's. Null when it leads nowhere.
     *
     * @return array{href: string, modal: bool, attributes: array<string, scalar>}|null
     */
    public static function body(mixed $link, ?Entity $entity): ?array
    {
        if (! is_array($link)) {
            return null;
        }

        $modal = ($link['modal'] ?? false) === true;
        $attributes = self::attributes($link['attributes'] ?? null);

        if (is_string($link['href'] ?? null) && $link['href'] !== '') {
            return ['href' => $link['href'], 'modal' => $modal, 'attributes' => $attributes];
        }

        $own = self::entity($entity);

        return $own === null ? null : ['href' => $own['href'], 'modal' => $own['modal'] || $modal, 'attributes' => [...$own['attributes'], ...$attributes]];
    }

    /**
     * Named attributes a link may carry: string keys only, as core's
     * `FeedLink::from()` keeps them, then never `href` or an event handler.
     *
     * @return array<string, scalar>
     */
    private static function attributes(mixed $value): array
    {
        return LinkAttributes::filter(is_array($value) ? array_filter($value, is_string(...), ARRAY_FILTER_USE_KEY) : []);
    }
}
