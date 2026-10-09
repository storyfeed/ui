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
    <figure {{ $attributes->class('sf-list-block m-0 min-w-0 max-w-144 rounded-lg bg-card px-4 py-3') }}>
@if (filled($body['title'] ?? null))
            <figcaption class="sf-list__title mb-1 text-sm text-foreground">{{ $body['title'] }}</figcaption>
@endif

        <div class="sf-list__prose prose max-w-none text-[length:inherit] [overflow-wrap:anywhere] [--tw-prose-body:var(--color-muted-foreground)] [--tw-prose-headings:var(--color-foreground)] [--tw-prose-lead:var(--color-muted-foreground)] [--tw-prose-links:var(--color-primary)] [--tw-prose-bold:var(--color-foreground)] [--tw-prose-counters:var(--color-muted-foreground)] [--tw-prose-bullets:var(--color-muted-foreground)] [--tw-prose-hr:var(--color-border)] [--tw-prose-quotes:var(--color-foreground)] [--tw-prose-quote-borders:var(--color-border)] [--tw-prose-captions:var(--color-muted-foreground)] [--tw-prose-kbd:var(--color-foreground)] [--tw-prose-code:var(--color-foreground)] [--tw-prose-pre-code:var(--color-foreground)] [--tw-prose-pre-bg:var(--color-border)] [--tw-prose-th-borders:var(--color-border)] [--tw-prose-td-borders:var(--color-border)]">
            <{{ $tag }} class="sf-list">
@foreach ($items as $item)
                    <li class="sf-list__item">
@php($link = \Storyfeed\Ui\Support\Links::body($item, $entity))
@if ($link !== null)
                            <a href="{{ $link['href'] }}" {{ (new \Illuminate\View\ComponentAttributeBag($link['attributes']))->class('sf-entity font-medium text-foreground no-underline underline-offset-2 hover:underline') }}>{{ $item['label'] }}</a>
@else
                            {{ is_string($item) ? $item : $item['label'] }}
@endif
                    </li>
@endforeach
            </{{ $tag }}>
        </div>

@if ($remaining > 0 || $more !== null)
            <figcaption class="sf-list__more mt-1 flex gap-2 text-sm text-muted-foreground">
@if ($remaining > 0)
                    <span>{{ __('and :count more', ['count' => $remaining]) }}</span>
@endif
@php($moreLink = \Storyfeed\Ui\Support\Links::body($more, $entity))
@if ($moreLink !== null)
                    <a href="{{ $moreLink['href'] }}" {{ (new \Illuminate\View\ComponentAttributeBag($moreLink['attributes']))->class('sf-entity font-medium text-foreground no-underline underline-offset-2 hover:underline') }}>{{ $more['label'] ?? $moreLink['href'] }}</a>
@elseif ($more !== null)<span>{{ is_array($more) ? ($more['label'] ?? '') : $more }}</span>
@endif
            </figcaption>
@endif
    </figure>
@endif
