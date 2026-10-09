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

    /** Body types that cap their own height by `--sf-prose-max-h`, scrolling inside. */
    public const SELF_CAPPED = ['Storyfeed/Body/Prose', 'Storyfeed/Body/Table'];

    /**
     * How a body's wrapper honours its maximum height (core 0.17's
     * `$meta.maxHeight`, read before the top-level `$maxHeight` core first
     * wrote; other `$meta` keys are ignored): `none` or a
     * plain CSS length, else null for the kit default. The value sets
     * `--sf-prose-max-h` for the bodies that cap themselves; any other body
     * with a length is capped and scrolls in its wrapper. Mirrors
     * `bodyFrame()` in `shared/body.ts`.
     *
     * @param  array<array-key, mixed>  $body
     * @return array{style: ?string, capped: bool}
     */
    public static function frame(array $body): array
    {
        $height = is_array($body['$meta'] ?? null) && array_key_exists('maxHeight', $body['$meta']) ? $body['$meta']['maxHeight'] : ($body['$maxHeight'] ?? null);
        // `none`, or a CSS length as core's `FeedBody::maxHeight()` accepts it.
        $height = is_string($height) && ($height === 'none' || preg_match('/^(0|\d*\.?\d+(px|rem|em|ex|ch|lh|rlh|%|vh|svh|lvh|dvh|vw|svw|lvw|dvw|vmin|vmax|cm|mm|q|in|pt|pc))$/i', $height) === 1) ? $height : null;

        return [
            'style' => $height === null ? null : '--sf-prose-max-h: '.$height,
            'capped' => $height !== null && $height !== 'none' && ! in_array($body['$body'] ?? null, self::SELF_CAPPED, true),
        ];
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
