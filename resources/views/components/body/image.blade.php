@props(['body', 'entity' => null, 'mediaRenderer' => null])

@php
    // Its own `src`, else the entity's slot it names (see `Bodies::picture()`).
    $picture = \Storyfeed\Ui\Support\Bodies::picture(['$body' => 'Storyfeed/Body/Image', ...$body], $entity);
    $caption = is_string($body['caption'] ?? null) ? $body['caption'] : null;
@endphp
@if ($picture !== null)
    <figure {{ $attributes->class(['sf-image m-0', \Storyfeed\Ui\Support\Bodies::imageClasses($body)]) }}>
        @if ($mediaRenderer)
            {!! $mediaRenderer(['image' => $picture, 'href' => null], 'block h-auto object-contain max-w-[min(100%,var(--sf-image-width,100%))] max-h-[var(--sf-image-height,none)] rounded-lg') !!}
        @else
        <img src="{{ $picture['src'] }}" alt="{{ $picture['alt'] }}" width="{{ $picture['width'] ?? '' }}" height="{{ $picture['height'] ?? '' }}" loading="lazy" class="block h-auto object-contain max-w-[min(100%,var(--sf-image-width,100%))] max-h-[var(--sf-image-height,none)] rounded-lg" />
        @endif
@if ($caption !== null && $caption !== '')
            <figcaption class="mt-2 text-xs leading-[1.6] text-muted-foreground">{{ $caption }}</figcaption>
@endif
    </figure>
@endif
