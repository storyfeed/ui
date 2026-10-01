@props(['body', 'entity' => null])

@php
    $body = \Storyfeed\Body\Image::upgrade($body, is_int($body['$v'] ?? null) ? $body['$v'] : 1);
    $picture = $body['image'] !== null ? $entity?->media()?->get($body['image']) : null;
@endphp

@if (is_array($picture) && ! empty($picture['src']))
    <figure>
        <img src="{{ $picture['src'] }}" alt="{{ $body['alt'] ?? $body['caption'] ?? '' }}" width="{{ $body['width'] ?? $picture['width'] ?? '' }}" height="{{ $body['height'] ?? $picture['height'] ?? '' }}" loading="lazy" class="block max-w-full rounded-lg" />
        @if ($body['caption'] !== null && $body['caption'] !== '')
            <figcaption class="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{{ $body['caption'] }}</figcaption>
        @endif
    </figure>
@endif
