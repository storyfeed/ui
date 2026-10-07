@props(['page' => null, 'items' => null, 'nextCursor' => null, 'cursorName' => 'cursor', 'grouped' => true, 'rail' => null, 'childRail' => null, 'dividers' => [], 'dividerStyle' => 'dot', 'interactive' => true, 'collapsed' => null, 'timezone' => null, 'renderers' => []])
@php
    $items = collect($items ?? $page?->collect() ?? [])->map(fn ($item) => \Storyfeed\Support\FeedItem::of($item));
    $cursor = $nextCursor ?? $page?->nextCursor();
    $previousDay = null;
@endphp
<div {{ $attributes->class('sf-feed [--sf-gutter:2rem] [--sf-gap:0.75rem] [--sf-disc:2rem] [--sf-badge:0.875rem] [--sf-badge-face:1.125rem] text-sm leading-[1.6] text-muted-foreground') }}>
@if ($items->isEmpty())
        <div class="sf-empty rounded-lg border border-dashed border-border p-10 text-center text-muted-foreground">{{ $empty ?? __('No activity yet.') }}</div>
@else
        <div role="feed">
@foreach ($items as $item)
                @php
                    $at = $item->publishedAt();
                    $at = $timezone && $at ? $at->timezone($timezone) : $at;
                    $day = $at?->toDateString();
                    $daysAgo = $at ? (int) $at->startOfDay()->diffInDays(now($at->timezone)->startOfDay(), false) : null;
                    $label = match (true) {
                        $daysAgo === 0 => __('Today'),
                        $daysAgo === 1 => __('Yesterday'),
                        $daysAgo !== null && $daysAgo < 7 => $at->isoFormat('dddd'),
                        default => $at?->isoFormat('MMM D, YYYY'),
                    };
                @endphp
@if ($grouped && $day !== null && $day !== $previousDay)
                    <x-storyfeed::divider :label="$label" :divider-style="$dividerStyle" />
@endif
                @php($previousDay = $day)
@if (isset($dividers[$item->id()]))
                    <x-storyfeed::divider :label="$dividers[$item->id()]" :divider-style="$dividerStyle" />
@endif
                <x-storyfeed::item :item="$item" :last="$loop->last && $cursor === null" :rail="$rail" :child-rail="$childRail" :interactive="$interactive" :collapsed="$collapsed" :timezone="$timezone" :renderers="$renderers" />
@endforeach
        </div>
@endif
@if (isset($footer))
        {{ $footer }}
@else
        <x-storyfeed::pager :cursor="$cursor" :name="$cursorName" />
@endif
</div>
