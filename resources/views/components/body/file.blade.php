{{--
    Storyfeed/Body/File: what a file is and how big. The name is left out when
    the headline already says it.
--}}
@props(['body', 'entity' => null])

@php
    $size = $body['size'] ?? null;

    if (is_int($size)) {
        $units = ['B', 'KB', 'MB', 'GB'];
        $value = $size;
        $unit = 0;

        while ($value >= 1024 && $unit < count($units) - 1) {
            $value /= 1024;
            $unit++;
        }

        $size = ($value >= 10 || $unit === 0 ? round($value) : number_format($value, 1)).' '.$units[$unit];
    }

    $name = $body['name'] ?? null;

    $parts = collect([
        $name !== null && $name !== $entity?->label() ? $name : null,
        is_string($size) ? $size : null,
        $body['mediaType'] ?? null,
    ])->filter();
@endphp

@if ($parts->isNotEmpty())
    <p {{ $attributes->class('sf-file') }}>{{ $parts->implode(' · ') }}</p>
@endif
