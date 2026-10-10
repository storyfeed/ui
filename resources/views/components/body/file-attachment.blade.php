{{--
    Storyfeed/Body/FileAttachment: an attachment name with its size and media type.
    The entity supplies the resolved URL; the body stores no URL.
--}}
@props(['body', 'entity' => null, 'labeller' => null])

@php
    $size = $body['size'] ?? null;

    if (is_int($size)) {
        $units = ['bytes', 'KB', 'MB', 'GB'];
        $value = $size;
        $unit = 0;

        while ($value >= 1000 && $unit < count($units) - 1) {
            $value /= 1000;
            $unit++;
        }

        $size = ($unit === 0 ? $value : number_format($value, $value < 10 ? 1 : 0, '.', '')).' '.$units[$unit];
    }

    $name = $body['name'] ?? null;
    $parts = collect([\Storyfeed\Ui\Support\FileLabels::label($body, $labeller), is_string($size) ? $size : null])->filter();
@endphp
@if ($name || $parts->isNotEmpty())
    {{-- The name at body size; its kind and size one step smaller (ui#23). --}}
    <p {{ $attributes->class('sf-file m-0 text-sm text-muted-foreground') }}>{{ $name }}@if ($parts->isNotEmpty())<span class="sf-file__meta text-xs">{{ $name ? ' ' : '' }}{{ $parts->implode(' · ') }}</span>@endif</p>
@endif
