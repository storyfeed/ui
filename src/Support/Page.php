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
