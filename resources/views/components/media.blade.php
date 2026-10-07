{{--
    One picture at the feed's scale. The width and height reserve its box so
    the feed does not jump as it loads.
--}}
@props(['image', 'href' => null, 'renderer' => null])

@php
    $ratio = ($image['width'] ?? null) && ($image['height'] ?? null) ? "aspect-ratio: {$image['width']} / {$image['height']}" : null;
@endphp
@if (! empty($image['src']))
    @if ($renderer)
        {!! $renderer(['image' => $image, 'href' => $href], 'sf-media mt-2 block max-w-[22rem] overflow-hidden rounded-lg bg-muted '.$attributes->get('class', '')) !!}
    @else
@if ($href)
        <a href="{{ $href }}" {{ $attributes->merge(['class' => 'sf-media mt-2 block max-w-[22rem] overflow-hidden rounded-lg bg-muted [&>img]:block [&>img]:size-full [&>img]:object-cover', 'style' => $ratio]) }}><img src="{{ $image['src'] }}" alt="{{ $image['alt'] ?? '' }}" width="{{ $image['width'] ?? '' }}" height="{{ $image['height'] ?? '' }}" loading="lazy"></a>
@else
        <div {{ $attributes->merge(['class' => 'sf-media mt-2 block max-w-[22rem] overflow-hidden rounded-lg bg-muted [&>img]:block [&>img]:size-full [&>img]:object-cover', 'style' => $ratio]) }}><img src="{{ $image['src'] }}" alt="{{ $image['alt'] ?? '' }}" width="{{ $image['width'] ?? '' }}" height="{{ $image['height'] ?? '' }}" loading="lazy"></div>
@endif
@endif

@endif
