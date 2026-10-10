@props(['page' => null, 'items' => null, 'nextCursor' => null, 'cursorName' => 'cursor', 'grouped' => true, 'rail' => null, 'childRail' => null, 'dividers' => [], 'dividerStyle' => 'branch', 'interactive' => true, 'collapsed' => null, 'timezone' => null, 'renderers' => []])
@php
    // Any page core reads: a FeedPage (core <=0.18), a collection or paginator (storyfeed/storyfeed#95), or its JSON.
    $read = \Storyfeed\Ui\Support\Page::read($page);
    $items = collect($items ?? $read['items'])->map(fn ($item) => \Storyfeed\Support\FeedItem::of($item));
    $cursor = $nextCursor instanceof \Illuminate\Pagination\Cursor ? $nextCursor->encode() : ($nextCursor ?? $read['cursor']);
    $previousDay = null;
@endphp
<div {{ $attributes->class('sf-feed [--spacing:calc(var(--sf-font-size,1rem)/4)] [--text-xs:calc(var(--sf-font-size,1rem)*0.75)] [--text-sm:calc(var(--sf-font-size,1rem)*0.875)] [--text-base:var(--sf-font-size,1rem)] [--sf-gutter:--spacing(8)] [--sf-gap:--spacing(3)] [--sf-disc:--spacing(8)] [--sf-badge:--spacing(3.5)] [--sf-badge-face:--spacing(4.5)] text-base leading-[1.6] text-muted-foreground') }}>
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
