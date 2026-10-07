@props(['body', 'entity' => null, 'mediaRenderer' => null])

@php
    $body = \Storyfeed\Body\Image::upgrade($body, is_int($body['$v'] ?? null) ? $body['$v'] : 1);
    $picture = $body['image'] !== null ? $entity?->media()?->get($body['image']) : null;
@endphp
@if (is_array($picture) && ! empty($picture['src']))
    <figure {{ $attributes->class('sf-image m-0') }}>
        @if ($mediaRenderer)
            {!! $mediaRenderer(['image' => [...$picture, 'alt' => $body['alt'] ?? $body['caption'] ?? '', 'width' => $body['width'] ?? $picture['width'] ?? null, 'height' => $body['height'] ?? $picture['height'] ?? null], 'href' => null], 'block max-w-full rounded-lg') !!}
        @else
        <img src="{{ $picture['src'] }}" alt="{{ $body['alt'] ?? $body['caption'] ?? '' }}" width="{{ $body['width'] ?? $picture['width'] ?? '' }}" height="{{ $body['height'] ?? $picture['height'] ?? '' }}" loading="lazy" class="block max-w-full rounded-lg" />
        @endif
@if ($body['caption'] !== null && $body['caption'] !== '')
            <figcaption class="mt-2 text-sm leading-[1.6] text-muted-foreground">{{ $body['caption'] }}</figcaption>
@endif
    </figure>
@endif
