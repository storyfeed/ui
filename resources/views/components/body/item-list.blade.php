{{--
    Storyfeed/Body/ItemList: several things, each text or a link. `ordered`
    says whether the sequence means something, so it numbers the list.
    `totalItems` counts the ones not sent, and `more` is where they are.
--}}
@props(['body', 'entity' => null])

@php
    $items = collect($body['items'] ?? [])->filter(fn ($item) => is_string($item) || (is_array($item) && isset($item['label'])));
    $total = $body['totalItems'] ?? null;
    $remaining = is_int($total) ? max($total - $items->count(), 0) : 0;
    $more = is_array($body['more'] ?? null) && isset($body['more']['href']) ? $body['more'] : null;
    $tag = ($body['ordered'] ?? false) ? 'ol' : 'ul';
@endphp

@if ($items->isNotEmpty())
    <figure {{ $attributes->class('sf-list-block') }}>
        @if (filled($body['title'] ?? null))
            <figcaption class="sf-list__title">{{ $body['title'] }}</figcaption>
        @endif

        <{{ $tag }} class="sf-list">
            @foreach ($items as $item)
                <li class="sf-list__item">
                    @if (is_array($item) && filled($item['href'] ?? null))
                        <a href="{{ $item['href'] }}" class="sf-entity">{{ $item['label'] }}</a>
                    @else
                        {{ is_string($item) ? $item : $item['label'] }}
                    @endif
                </li>
            @endforeach
        </{{ $tag }}>

        @if ($remaining > 0 || $more !== null)
            <figcaption class="sf-list__more">
                @if ($remaining > 0)
                    <span>{{ __(':count more', ['count' => $remaining]) }}</span>
                @endif
                @if ($more !== null)
                    <a href="{{ $more['href'] }}" class="sf-entity">{{ $more['label'] ?? $more['href'] }}</a>
                @endif
            </figcaption>
        @endif
    </figure>
@endif
