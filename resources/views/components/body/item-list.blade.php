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
    $more = $body['more'] ?? null;
    $tag = ($body['ordered'] ?? false) ? 'ol' : 'ul';
@endphp
@if ($items->isNotEmpty())
    <figure {{ $attributes->class('sf-list-block m-0 min-w-0 max-w-xl rounded-lg bg-card px-4 py-3') }}>
@if (filled($body['title'] ?? null))
            <figcaption class="sf-list__title mb-1 text-[13px] text-foreground">{{ $body['title'] }}</figcaption>
@endif

        <{{ $tag }} @class(['sf-list m-0 pl-[1.15rem] text-[13.5px] leading-[1.6]', 'list-decimal' => $tag === 'ol', 'list-disc' => $tag === 'ul'])>
@foreach ($items as $item)
                <li class="sf-list__item m-0">
@if (is_array($item) && filled($item['href'] ?? $entity?->url()))
                        <a class="sf-entity font-medium text-foreground no-underline underline-offset-2 hover:underline" href="{{ $item['href'] ?? $entity?->url() }}">{{ $item['label'] }}</a>
@else
                        {{ is_string($item) ? $item : $item['label'] }}
@endif
                </li>
@endforeach
        </{{ $tag }}>

@if ($remaining > 0 || $more !== null)
            <figcaption class="sf-list__more mt-1 flex gap-2 text-[12.5px] text-muted-foreground">
@if ($remaining > 0)
                    <span>{{ __(':count more', ['count' => $remaining]) }}</span>
@endif
@if (is_array($more) && filled($more['href'] ?? $entity?->url()))
                    <a class="sf-entity font-medium text-foreground no-underline underline-offset-2 hover:underline" href="{{ $more['href'] ?? $entity?->url() }}">{{ $more['label'] ?? $more['href'] }}</a>
@elseif ($more !== null)<span>{{ is_array($more) ? ($more['label'] ?? '') : $more }}</span>
@endif
            </figcaption>
@endif
    </figure>
@endif
