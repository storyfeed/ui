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
        $provided = $entity->data()->get('initials');
        if (is_string($provided) && $provided !== '') {
            return $badge ? mb_substr($provided, 0, 1) : $provided;
        }
        $words = preg_split('/\s+/u', trim($entity->label() ?? '?')) ?: [];

        return implode('', array_map(fn (string $word): string => mb_strtoupper(mb_substr($word, 0, 1)), array_slice($words, 0, $badge ? 1 : 2))) ?: '?';
    }
}
