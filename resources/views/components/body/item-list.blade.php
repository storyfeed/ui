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
    <figure {{ $attributes->class('m-0') }}>
        @if (filled($body['title'] ?? null))
            <figcaption class="mb-1 text-sm text-zinc-900 dark:text-zinc-100">{{ $body['title'] }}</figcaption>
        @endif

        <{{ $tag }} @class(['m-0 pl-5 text-sm leading-relaxed', 'list-decimal' => $tag === 'ol', 'list-disc' => $tag === 'ul'])>
            @foreach ($items as $item)
                <li class="m-0">
                    @if (is_array($item) && filled($item['href'] ?? null))
                        <a href="{{ $item['href'] }}" class="font-medium text-indigo-700 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:text-indigo-300">{{ $item['label'] }}</a>
                    @else
                        {{ is_string($item) ? $item : $item['label'] }}
                    @endif
                </li>
            @endforeach
        </{{ $tag }}>

        @if ($remaining > 0 || $more !== null)
            <figcaption class="mt-1 flex gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                @if ($remaining > 0)
                    <span>{{ __(':count more', ['count' => $remaining]) }}</span>
                @endif
                @if ($more !== null)
                    <a href="{{ $more['href'] }}" class="font-medium text-indigo-700 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:text-indigo-300">{{ $more['label'] ?? $more['href'] }}</a>
                @endif
            </figcaption>
        @endif
    </figure>
@endif
