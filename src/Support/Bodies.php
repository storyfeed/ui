<?php

namespace Storyfeed\Ui\Support;

use Illuminate\Support\Facades\Blade;
use Storyfeed\Body\Image;
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

    /**
     * How a body's wrapper honours its maximum height (core 0.17's
     * `$meta.maxHeight`; other `$meta` keys are ignored). Flowing text is never capped by
     * the kit; only code and verbatim blocks scroll inside their box, at
     * `--sf-prose-max-h`. A length caps the whole body in its wrapper instead,
     * and `none` lifts the blocks' cap too. Mirrors `bodyFrame()` in
     * `shared/body.ts`.
     *
     * @param  array<array-key, mixed>  $body
     * @return array{style: ?string, capped: bool}
     */
    public static function frame(array $body): array
    {
        $height = is_array($body['$meta'] ?? null) ? ($body['$meta']['maxHeight'] ?? null) : null;
        // `none`, or a CSS length as core's `FeedBody::maxHeight()` accepts it.
        $height = is_string($height) && ($height === 'none' || preg_match('/^(0|\d*\.?\d+(px|rem|em|ex|ch|lh|rlh|%|vh|svh|lvh|dvh|vw|svw|lvw|dvw|vmin|vmax|cm|mm|q|in|pt|pc))$/i', $height) === 1) ? $height : null;

        return [
            'style' => match (true) {
                $height === null => null,
                $height === 'none' => '--sf-prose-max-h: none',
                default => '--sf-prose-max-h: none; --sf-body-max-h: '.$height,
            },
            'capped' => $height !== null && $height !== 'none',
        ];
    }

    /**
     * The thumbnail an Image body draws when it names the entity's `icon`
     * slot, or null. A row shows it small beside its other bodies, the way it
     * once drew the object's icon unasked; now only the body asks. Mirrors
     * `iconOf()` in `shared/body.ts`.
     *
     * @return array<array-key, mixed>|null
     */
    public static function icon(mixed $body, ?Entity $entity): ?array
    {
        // Read as `Image::upgrade()` reads it: no slot means `preview`.
        if (! is_array($body) || ($body['$body'] ?? null) !== Image::bodyType() || ($body['image'] ?? 'preview') !== 'icon') {
            return null;
        }

        $icon = $entity?->media()?->get('icon');

        if (! is_array($icon) || empty($icon['src'])) {
            return null;
        }

        $size = fn (string $key): mixed => is_int($body[$key] ?? null) && $body[$key] > 0 ? $body[$key] : ($icon[$key] ?? null);

        return [...$icon, 'alt' => is_string($body['alt'] ?? null) ? $body['alt'] : (is_string($body['caption'] ?? null) ? $body['caption'] : ''), 'width' => $size('width'), 'height' => $size('height')];
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
