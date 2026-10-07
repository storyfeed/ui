<?php

namespace Storyfeed\Ui\Support;

use Illuminate\Support\Facades\Blade;
use Storyfeed\Support\Entity;

final class Bodies
{
    /**
     * @param  array<array-key, mixed>  $body
     * @param  (callable(array<array-key, mixed>, string): string)|null  $mediaRenderer
     * @param  (callable(array{name: ?string, mediaType: ?string}): ?string)|null  $fileLabeller
     */
    public static function render(string $component, array $body, ?Entity $entity = null, ?callable $mediaRenderer = null, ?callable $fileLabeller = null): string
    {
        if (! in_array($component, ['storyfeed::body.image', 'storyfeed::body.media-object'], true)) {
            $mediaRenderer = null;
        }

        $labeller = $component === 'storyfeed::body.file-attachment' ? $fileLabeller : null;

        return Blade::render('<x-dynamic-component :component="$component" :body="$body" :entity="$entity" :media-renderer="$mediaRenderer" :labeller="$labeller" />', compact('component', 'body', 'entity', 'mediaRenderer', 'labeller'));
    }

    /** Find forms in app-chosen data keys; stop walking once a body is found.
     * @return list<array<array-key, mixed>>
     */
    public static function in(mixed $value, int $depth = 4): array
    {
        if ($depth < 0 || ! is_array($value)) {
            return [];
        }
        if (isset($value['$body'])) {
            return [$value];
        }
        $found = [];
        foreach ($value as $child) {
            array_push($found, ...self::in($child, $depth - 1));
        }

        return $found;
    }
}
