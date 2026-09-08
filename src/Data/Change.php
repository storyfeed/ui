<?php

namespace Storyfeed\Ui\Data;

use InvalidArgumentException;
use Storyfeed\Concerns\HasPayload;
use Storyfeed\Contracts\FeedDetail;

/**
 * Named fields with their before and after values, in authored order.
 *
 * Index 0 is before and index 1 is after. Omit an index for an added or removed
 * field; null is a present value. Values stay scalar or null: coercing an object
 * would lose its meaning, and accepting arrays would allow details to nest.
 * An empty map is legal and has nothing to draw.
 *
 * The version travels in both storage and payload: core does not own the app's
 * key, so the renderer must upgrade the detail at read time, never write it back.
 */
final class Change implements FeedDetail
{
    use HasPayload;

    /** @param array<string, array<int, scalar|null>> $changes */
    private function __construct(
        private readonly array $changes,
    ) {}

    /** @param array<array-key, mixed> $changes */
    public static function make(array $changes): self
    {
        foreach ($changes as $field => $pair) {
            if (! is_string($field) || ! self::validPair($pair)) {
                throw new InvalidArgumentException('Changes require named fields with scalar or null values at index 0 (before) and/or 1 (after).');
            }
        }

        return new self($changes);
    }

    public static function name(): string
    {
        return 'storyfeed-ui/change';
    }

    public static function version(): int
    {
        return 1;
    }

    public static function upgrade(array $payload, int $from): array
    {
        // No other version has a defined shape yet. A reader with an older
        // vocabulary draws nothing rather than guessing at a newer row.
        if ($from !== 1 || ! is_array($payload['changes'] ?? null)) {
            return ['changes' => []];
        }

        $changes = [];

        foreach ($payload['changes'] as $field => $pair) {
            if (is_string($field) && self::validPair($pair)) {
                $changes[$field] = $pair;
            }
        }

        return ['changes' => $changes];
    }

    /** @return array{'$detail': string, '$v': int, changes: array<string, array<int, scalar|null>>} */
    public function toPayload(): array
    {
        return [
            self::KEY => self::name(),
            self::VERSION => self::version(),
            'changes' => $this->changes,
        ];
    }

    private static function validPair(mixed $pair): bool
    {
        if (! is_array($pair) || $pair === []) {
            return false;
        }

        foreach ($pair as $index => $value) {
            if (($index !== 0 && $index !== 1)
                || (! is_scalar($value) && $value !== null)
                || (is_float($value) && ! is_finite($value))) {
                return false;
            }
        }

        return true;
    }
}
