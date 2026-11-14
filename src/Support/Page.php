<?php

namespace Storyfeed\Ui\Support;

use Illuminate\Contracts\Support\Arrayable;
use Illuminate\Pagination\AbstractCursorPaginator;
use Illuminate\Pagination\AbstractPaginator;
use Illuminate\Pagination\Cursor;
use Illuminate\Support\Collection;
use JsonSerializable;
use Traversable;

/**
 * A feed page's nodes and next cursor, whichever shape core read it in.
 *
 * Core 0.13–0.18 return a `FeedPage` from `get()` (`collect()`, a string
 * `nextCursor()`), with JSON under `items`. From storyfeed/storyfeed#95,
 * `get()` returns a collection of nodes, `cursorPaginate()` and `members()`
 * Laravel's cursor paginator (a `Cursor` object, the nodes under `data` in
 * JSON) and `simplePaginate()` Laravel's simple paginator. A decoded JSON
 * page, old or new, reads the same way.
 */
final class Page
{
    /**
     * @return array{items: Collection<int, mixed>, cursor: string|null}
     */
    public static function read(mixed $page): array
    {
        $read = self::envelope($page);
        $map = self::mediaMap($page);

        return $map === [] ? $read : ['items' => $read['items']->map(fn ($item) => self::resolve($item, $map)), 'cursor' => $read['cursor']];
    }

    /**
     * The page's media map (storyfeed/storyfeed#242): `{link, media}` per
     * `media_ref`. Missing, empty or `[]` means no map.
     *
     * @return array<string, array<array-key, mixed>>
     */
    public static function mediaMap(mixed $page): array
    {
        $map = match (true) {
            is_object($page) && method_exists($page, 'media') => $page->media(),
            is_array($page) => $page['media'] ?? null,
            $page instanceof Arrayable => $page->toArray()['media'] ?? null,
            default => null,
        };

        if (! is_array($map) || $map === [] || array_is_list($map)) {
            return [];
        }

        return array_filter($map, fn ($entry, $ref) => is_string($ref) && is_array($entry), ARRAY_FILTER_USE_BOTH);
    }

    /**
     * An item with every entity's `link` and `media` read from the page's
     * map by its `media_ref`, falling back to the inline copies.
     *
     * @param  array<string, array<array-key, mixed>>  $map
     */
    public static function resolve(mixed $value, array $map): mixed
    {
        if ($map === []) {
            return $value;
        }

        // Core's paginators hold readers over the node arrays.
        if ($value instanceof Arrayable) {
            $value = $value->toArray();
        }

        if (! is_array($value)) {
            return $value;
        }

        foreach ($value as $key => $child) {
            if (is_array($child)) {
                $value[$key] = self::resolve($child, $map);
            }
        }

        $ref = $value['media_ref'] ?? null;
        if (is_string($ref) && isset($map[$ref])) {
            foreach (['link', 'media'] as $part) {
                if (array_key_exists($part, $map[$ref])) {
                    $value[$part] = $map[$ref][$part];
                }
            }
        }

        return $value;
    }

    /**
     * @return array{items: Collection<int, mixed>, cursor: string|null}
     */
    private static function envelope(mixed $page): array
    {
        return match (true) {
            $page === null => ['items' => collect(), 'cursor' => null],
            $page instanceof AbstractCursorPaginator => ['items' => collect($page->items()), 'cursor' => self::cursor($page->nextCursor())],
            $page instanceof AbstractPaginator => ['items' => collect($page->items()), 'cursor' => null],
            $page instanceof Collection => ['items' => $page->values(), 'cursor' => null],
            // Core 0.13–0.18's FeedPage.
            is_object($page) && method_exists($page, 'collect') && method_exists($page, 'nextCursor') => ['items' => self::listed($page->collect()), 'cursor' => self::cursor($page->nextCursor())],
            is_array($page) => self::json($page),
            $page instanceof Arrayable => self::json($page->toArray()),
            $page instanceof JsonSerializable => self::json((array) $page->jsonSerialize()),
            $page instanceof Traversable => ['items' => collect(iterator_to_array($page, false)), 'cursor' => null],
            default => ['items' => collect(), 'cursor' => null],
        };
    }

    /**
     * @param  array<array-key, mixed>  $page
     * @return array{items: Collection<int, mixed>, cursor: string|null}
     */
    private static function json(array $page): array
    {
        // A page envelope: `data` from #95, `items` before it.
        if (array_key_exists('data', $page) || array_key_exists('items', $page)) {
            $items = $page['data'] ?? $page['items'];

            return ['items' => collect(is_array($items) ? array_values($items) : []), 'cursor' => self::cursor($page['next_cursor'] ?? null)];
        }

        // `get()`'s JSON: a plain list of nodes.
        return ['items' => collect(array_is_list($page) ? $page : []), 'cursor' => null];
    }

    /** @return Collection<int, mixed> */
    private static function listed(mixed $items): Collection
    {
        return $items instanceof Collection ? $items->values() : collect(is_iterable($items) ? iterator_to_array($items, false) : []);
    }

    private static function cursor(mixed $cursor): ?string
    {
        return match (true) {
            $cursor instanceof Cursor => $cursor->encode(),
            is_string($cursor) && $cursor !== '' => $cursor,
            default => null,
        };
    }
}
