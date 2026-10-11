<?php

namespace Storyfeed\Ui\Support;

use Illuminate\Database\Eloquent\Model;
use Storyfeed\Support\Entity;

/**
 * Who is reading the feed (ui#75): a model, `['type' => …, 'id' => …]` or
 * `'type:id'`. A headline names that entity "You" instead of by its label.
 * The payload never knows the reader; only the page does, at render time.
 */
final class Viewer
{
    /** The viewer as `type:id`, or null when none is given. */
    public static function key(mixed $viewer): ?string
    {
        if ($viewer instanceof Model) {
            return self::pair($viewer->getMorphClass(), $viewer->getKey());
        }

        if (is_array($viewer)) {
            return self::pair($viewer['type'] ?? null, $viewer['id'] ?? null);
        }

        return is_string($viewer) && str_contains($viewer, ':') ? $viewer : null;
    }

    public static function is(mixed $viewer, Entity $entity): bool
    {
        $key = self::key($viewer);

        return $key !== null && $key === self::pair($entity->type(), $entity->id());
    }

    /**
     * A headline's HTML with the viewer's mark replaced: "You" when the
     * sentence starts with it, "you" anywhere else.
     */
    public static function speak(string $html, string $mark): string
    {
        if (str_starts_with($html, $mark)) {
            $html = self::word('You').substr($html, strlen($mark));
        }

        return str_replace($mark, self::word('you'), $html);
    }

    private static function pair(mixed $type, mixed $id): ?string
    {
        return is_string($type) && $type !== '' && (is_string($id) || is_int($id)) ? "{$type}:{$id}" : null;
    }

    /** The word in the app's locale, or as written when it has none. */
    private static function word(string $word): string
    {
        $translated = __($word);

        return is_string($translated) ? e($translated) : $word;
    }
}
