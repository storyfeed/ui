{{--
    One picture at the feed's scale. The width and height reserve its box so
    the feed does not jump as it loads.
--}}
@props(['image', 'href' => null])

@php
    $ratio = ($image['width'] ?? null) && ($image['height'] ?? null) ? "aspect-ratio: {$image['width']} / {$image['height']}" : null;
@endphp

@if (! empty($image['src']))
    @if ($href)
        <a href="{{ $href }}" {{ $attributes->merge(['class' => 'sf-media', 'style' => $ratio]) }}><img src="{{ $image['src'] }}" alt="{{ $image['alt'] ?? '' }}" loading="lazy"></a>
    @else
        <div {{ $attributes->merge(['class' => 'sf-media', 'style' => $ratio]) }}><img src="{{ $image['src'] }}" alt="{{ $image['alt'] ?? '' }}" loading="lazy"></div>
    @endif
@endif
