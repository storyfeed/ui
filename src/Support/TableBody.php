<?php

namespace Storyfeed\Ui\Support;

/** Read a `Storyfeed/Body/Table` as core's `Table::upgrade()` does. Mirrors `shared/table.ts`. */
final class TableBody
{
    /**
     * `title`, `headers` and `footer` may be left out, a cell that is not one
     * becomes an empty cell (so the columns after it stay put), and every row
     * is padded to the widest. Null when there is no row to draw.
     *
     * @param  array<array-key, mixed>  $body
     * @return array{title: ?string, headers: list<string>, rows: list<list<mixed>>, footer: list<list<mixed>>}|null
     */
    public static function read(array $body): ?array
    {
        $headers = array_map(fn (mixed $header): string => is_string($header) || is_int($header) || is_float($header) ? (string) $header : '', self::list($body['headers'] ?? null));
        $rows = array_map(self::row(...), array_values(array_filter(self::list($body['rows'] ?? null), is_array(...))));
        $footer = array_map(self::row(...), array_values(array_filter(self::list($body['footer'] ?? null), is_array(...))));

        if ($rows === [] && $footer === []) {
            return null;
        }

        $width = max([count($headers), ...array_map(count(...), [...$rows, ...$footer])]);
        $title = $body['title'] ?? null;

        return [
            'title' => is_string($title) && $title !== '' ? $title : null,
            'headers' => $headers === [] ? [] : array_pad($headers, $width, ''),
            'rows' => array_map(fn (array $row): array => array_pad($row, $width, null), $rows),
            'footer' => array_map(fn (array $row): array => array_pad($row, $width, null), $footer),
        ];
    }

    /**
     * @param  array<array-key, mixed>  $row
     * @return list<mixed>
     */
    private static function row(array $row): array
    {
        return array_map(fn (mixed $cell): mixed => match (true) {
            $cell === null, is_string($cell), is_int($cell), is_float($cell) => $cell,
            is_array($cell) && is_string($cell['label'] ?? null) => [...$cell, 'href' => is_string($cell['href'] ?? null) ? $cell['href'] : null],
            default => null,
        }, array_values($row));
    }

    /** @return list<mixed> */
    private static function list(mixed $value): array
    {
        return is_array($value) ? array_values($value) : [];
    }
}
