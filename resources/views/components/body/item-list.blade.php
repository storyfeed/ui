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
    <figure {{ $attributes->class('prose prose-sm prose-zinc dark:prose-invert') }}>
        @if (filled($body['title'] ?? null))
            <figcaption>{{ $body['title'] }}</figcaption>
        @endif

        <{{ $tag }}>
            @foreach ($items as $item)
                <li>
                    @if (is_array($item) && filled($item['href'] ?? null))
                        <a href="{{ $item['href'] }}">{{ $item['label'] }}</a>
                    @else
                        {{ is_string($item) ? $item : $item['label'] }}
                    @endif
                </li>
            @endforeach
        </{{ $tag }}>

        @if ($remaining > 0 || $more !== null)
            <figcaption>
                @if ($remaining > 0)
                    <span>{{ __(':count more', ['count' => $remaining]) }}</span>
                @endif
                @if ($more !== null)
                    <a href="{{ $more['href'] }}">{{ $more['label'] ?? $more['href'] }}</a>
                @endif
            </figcaption>
        @endif
    </figure>
@endif
