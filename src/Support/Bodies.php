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
     * The picture an Image body draws, or null: its own `src` when it stores
     * one (core 0.18's Image v3), otherwise the entity's media slot it names,
     * `icon`, `preview`, `image` or a custom `slots.<name>`. Until v3 a body
     * naming no slot meant `preview`. The body's alt, falling back to its
     * caption, and its declared size win over the slot's. Read here rather
     * than through `Image::upgrade()` so every supported core reads it the
     * same way. Mirrors `pictureOf()` in `shared/body.ts`.
     *
     * @return array<array-key, mixed>|null
     */
    public static function picture(mixed $body, ?Entity $entity): ?array
    {
        if (! is_array($body) || ($body['$body'] ?? null) !== Image::bodyType()) {
            return null;
        }

        $version = is_int($body['$v'] ?? null) ? $body['$v'] : 1;
        $picture = $version >= 3 && is_string($body['src'] ?? null) && $body['src'] !== ''
            ? ['src' => $body['src']]
            : self::slot($entity, $body['image'] ?? ($version < 3 ? 'preview' : null));

        if (! is_array($picture) || ! is_string($picture['src'] ?? null) || $picture['src'] === '') {
            return null;
        }

        $size = fn (string $key): mixed => is_int($body[$key] ?? null) && $body[$key] > 0 ? $body[$key] : ($picture[$key] ?? null);

        return [...$picture, 'alt' => is_string($body['alt'] ?? null) ? $body['alt'] : (is_string($body['caption'] ?? null) ? $body['caption'] : ''), 'width' => $size('width'), 'height' => $size('height')];
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
        $own = is_array($body) && is_int($body['$v'] ?? null) && $body['$v'] >= 3 && is_string($body['src'] ?? null) && $body['src'] !== '';

        return is_array($body) && ! $own && ($body['image'] ?? null) === 'icon' ? self::picture($body, $entity) : null;
    }

    /** An entity's picture for a slot a body names: a built-in one, or `slots.<name>`. */
    private static function slot(?Entity $entity, mixed $slot): mixed
    {
        if (! is_string($slot)) {
            return null;
        }

        if (in_array($slot, ['icon', 'preview', 'image'], true)) {
            return $entity?->media()?->get($slot);
        }

        $slots = $entity?->media()?->get('slots');

        return preg_match('/^slots\.([A-Za-z][A-Za-z0-9_-]*)$/', $slot, $name) === 1 && is_array($slots) ? ($slots[$name[1]] ?? null) : null;
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
