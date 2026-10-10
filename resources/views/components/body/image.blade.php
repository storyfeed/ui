@props(['body', 'entity' => null, 'mediaRenderer' => null])

@php
    // Its own `src`, else the entity's slot it names (see `Bodies::picture()`).
    $picture = \Storyfeed\Ui\Support\Bodies::picture(['$body' => 'Storyfeed/Body/Image', ...$body], $entity);
    $caption = is_string($body['caption'] ?? null) ? $body['caption'] : null;
@endphp
@if ($picture !== null)
    <figure {{ $attributes->class('sf-image m-0') }}>
        @if ($mediaRenderer)
            {!! $mediaRenderer(['image' => $picture, 'href' => null], 'block max-w-full rounded-lg') !!}
        @else
        <img src="{{ $picture['src'] }}" alt="{{ $picture['alt'] }}" width="{{ $picture['width'] ?? '' }}" height="{{ $picture['height'] ?? '' }}" loading="lazy" class="block max-w-full rounded-lg" />
        @endif
@if ($caption !== null && $caption !== '')
            <figcaption class="mt-2 text-xs leading-[1.6] text-muted-foreground">{{ $caption }}</figcaption>
@endif
    </figure>
@endif
