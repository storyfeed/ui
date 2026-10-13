{{--
    One picture at the feed's scale. The width and height reserve its box so
    the feed does not jump as it loads.
--}}
@props(['image', 'payload' => [], 'href' => null, 'renderer' => null, 'linkAttributes' => []])

@php
    $linkAttributes = $href ? \Storyfeed\Ui\Support\LinkAttributes::filter($linkAttributes) : [];
    // Feed limits inherit through CSS; a custom Image renderer passes its body to override them.
    $attributes = $attributes->class(['sf-media mt-2 block w-fit max-w-[min(100%,var(--sf-image-width,22rem))] overflow-hidden rounded-lg [&>img]:block [&>img]:w-auto [&>img]:h-auto [&>img]:object-contain [&>img]:max-w-full [&>img]:max-h-[var(--sf-image-height,none)]', \Storyfeed\Ui\Support\Bodies::imageClasses($payload)]);
@endphp
@if (! empty($image['src']))
    @if ($renderer)
        {!! $renderer(['image' => $image, 'href' => $href, 'attributes' => $linkAttributes], $attributes->get('class', '')) !!}
    @else
@if ($href)
        <a href="{{ $href }}" {{ $attributes->merge($linkAttributes) }}><img src="{{ $image['src'] }}" alt="{{ $image['alt'] ?? '' }}" width="{{ $image['width'] ?? '' }}" height="{{ $image['height'] ?? '' }}" loading="lazy"></a>
@else
        <div {{ $attributes }}><img src="{{ $image['src'] }}" alt="{{ $image['alt'] ?? '' }}" width="{{ $image['width'] ?? '' }}" height="{{ $image['height'] ?? '' }}" loading="lazy"></div>
@endif
@endif

@endif
