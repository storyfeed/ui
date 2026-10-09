<?php

namespace Storyfeed\Ui\Support;

use Storyfeed\Support\Entity;

final class Avatar
{
    public static function color(Entity $entity): ?string
    {
        if ($entity->isTombstone()) {
            return null;
        }
        $declared = self::declaredColor($entity);
        if ($declared !== null) {
            return $declared;
        }
        $provided = $entity->data()->get('avatar_color');
        if (is_string($provided) && $provided !== '') {
            return $provided;
        }
        // JS iterates characters and hashes their first UTF-16 code unit.
        $hash = 0;
        $units = unpack('v*', mb_convert_encoding(($entity->type() ?? '').':'.($entity->id() ?? ''), 'UTF-16LE', 'UTF-8')) ?: [];
        foreach ($units as $unit) {
            if (! is_int($unit)) {
                continue;
            }
            if ($unit >= 0xDC00 && $unit <= 0xDFFF) {
                continue;
            }
            $hash = ($hash * 31 + $unit) & 0xFFFFFFFF;
            $hash = $hash > 0x7FFFFFFF ? $hash - 0x100000000 : $hash;
        }

        return ['#0ea5e9', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#6366f1', '#14b8a6'][abs($hash) % 8];
    }

    public static function initials(Entity $entity, bool $badge = false): string
    {
        $declared = $entity->media()?->get('initials');
        $provided = is_string($declared) && $declared !== '' ? $declared : $entity->data()->get('initials');
        if (is_string($provided) && $provided !== '') {
            return $badge ? mb_substr($provided, 0, 1) : $provided;
        }
        $words = preg_split('/\s+/u', trim($entity->label() ?? '?')) ?: [];

        return implode('', array_map(fn (string $word): string => mb_strtoupper(mb_substr($word, 0, 1)), array_slice($words, 0, $badge ? 1 : 2))) ?: '?';
    }

    /**
     * Whether the disc takes black text: a declared colour gets black or
     * white, whichever has the higher WCAG contrast ratio (black once relative
     * luminance passes 0.179); the fallback palette and the older snapshot
     * colour keep white. Mirrors `darkText()` in the JavaScript kits.
     */
    public static function darkText(Entity $entity): bool
    {
        $declared = $entity->isTombstone() ? null : self::declaredColor($entity);
        if ($declared === null) {
            return false;
        }
        $channel = function (int $offset) use ($declared): float {
            $value = hexdec(substr($declared, $offset, 2)) / 255;

            return $value <= 0.04045 ? $value / 12.92 : (($value + 0.055) / 1.055) ** 2.4;
        };
        $luminance = 0.2126 * $channel(1) + 0.7152 * $channel(3) + 0.0722 * $channel(5);

        return $luminance > 0.179;
    }

    /** The declared disc colour when it is the `#rrggbb` core emits, else null. */
    private static function declaredColor(Entity $entity): ?string
    {
        $color = $entity->media()?->get('color');

        return is_string($color) && preg_match('/^#[0-9a-f]{6}$/i', $color) === 1 ? $color : null;
    }
}
