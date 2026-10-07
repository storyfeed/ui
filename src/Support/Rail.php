<?php

namespace Storyfeed\Ui\Support;

use InvalidArgumentException;

/** The same four actor/activity postures as the Vue kit. */
final class Rail
{
    /** @return array{disc: string, badge: string} */
    public static function slots(?string $rail, int $actors, bool $glyph, bool $dense = false): array
    {
        [$primary, $secondary] = match ($rail ?? ($dense ? 'activity-only' : 'actor-only')) {
            'actor' => ['actor', 'activity'],
            'activity' => ['activity', 'actor'],
            'actor-only' => ['actor', 'none'],
            'activity-only' => ['activity', 'none'],
            default => throw new InvalidArgumentException('Unknown Storyfeed rail: '.$rail),
        };
        $secondary = $dense ? 'none' : $secondary;
        $has = ['actor' => $actors > 0, 'activity' => $glyph, 'none' => false];
        $other = $primary === 'actor' ? 'activity' : 'actor';
        $disc = $has[$primary] ? $primary : ($has[$other] ? $other : 'none');

        return ['disc' => $disc, 'badge' => $disc === $primary && $has[$secondary] && $actors <= 1 ? $secondary : 'none'];
    }
}
