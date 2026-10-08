<?php

namespace Storyfeed\Ui\Support;

final class LinkAttributes
{
    /**
     * @param  array<string, mixed>  $attributes
     * @return array<string, scalar>
     */
    public static function filter(array $attributes): array
    {
        return array_filter($attributes, fn ($value, $name) => is_scalar($value)
            && strtolower($name) !== 'href'
            && ! str_starts_with(strtolower($name), 'on')
            && preg_match('/^[a-zA-Z][\w:.-]*$/', $name), ARRAY_FILTER_USE_BOTH);
    }
}
