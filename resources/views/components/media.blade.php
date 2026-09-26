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
        <a href="{{ $href }}" {{ $attributes->merge(['class' => 'mt-2 block max-w-[22rem] overflow-hidden rounded-lg bg-zinc-50 dark:bg-zinc-800 [&>img]:block [&>img]:size-full [&>img]:object-cover', 'style' => $ratio]) }}><img src="{{ $image['src'] }}" alt="{{ $image['alt'] ?? '' }}" loading="lazy"></a>
    @else
        <div {{ $attributes->merge(['class' => 'mt-2 block max-w-[22rem] overflow-hidden rounded-lg bg-zinc-50 dark:bg-zinc-800 [&>img]:block [&>img]:size-full [&>img]:object-cover', 'style' => $ratio]) }}><img src="{{ $image['src'] }}" alt="{{ $image['alt'] ?? '' }}" loading="lazy"></div>
    @endif
@endif
