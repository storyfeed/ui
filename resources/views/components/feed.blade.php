@props(['imageSize' => null, 'page' => null, 'items' => null, 'nextCursor' => null, 'cursorName' => 'cursor', 'grouped' => true, 'rail' => null, 'childRail' => null, 'dividers' => [], 'dividerStyle' => 'branch', 'interactive' => true, 'collapsed' => null, 'timezone' => null, 'renderers' => [], 'viewer' => null])
@php
    // Any page core reads: a FeedPage (core <=0.18), a collection or paginator (storyfeed/storyfeed#95), or its JSON.
    $read = \Storyfeed\Ui\Support\Page::read($page);
    $items = collect($items ?? $read['items'])->map(fn ($item) => \Storyfeed\Support\FeedItem::of($item));
    $cursor = $nextCursor instanceof \Illuminate\Pagination\Cursor ? $nextCursor->encode() : ($nextCursor ?? $read['cursor']);
    $previousDay = null;
@endphp
<div {{ $attributes->class([\Storyfeed\Ui\Support\Bodies::imageClasses([], $imageSize), 'sf-feed [--spacing:calc(var(--sf-font-size,1rem)/4)] [--text-xs:calc(var(--sf-font-size,1rem)*0.75)] [--text-sm:calc(var(--sf-font-size,1rem)*0.875)] [--text-base:var(--sf-font-size,1rem)] [--sf-gutter-v:var(--sf-gutter,--spacing(8))] [--sf-gap-v:var(--sf-gap,--spacing(3))] [--sf-disc-v:var(--sf-disc,--spacing(8))] [--sf-badge-v:var(--sf-badge,--spacing(3.5))] [--sf-badge-face-v:var(--sf-badge-face,--spacing(4.5))] text-base leading-[1.6] text-muted-foreground']) }}>
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
                {{-- A dateless entry neither starts a day nor ends one. --}}
                @php($previousDay = $day ?? $previousDay)
@if (isset($dividers[$item->id()]))
                    <x-storyfeed::divider :label="$dividers[$item->id()]" :divider-style="$dividerStyle" />
@endif
                <x-storyfeed::item :item="$item" :last="$loop->last && $cursor === null" :rail="$rail" :child-rail="$childRail" :interactive="$interactive" :collapsed="$collapsed" :timezone="$timezone" :renderers="$renderers" />
@endforeach
        </div>
@once
    {{-- Rows a host inserts later (Livewire, Turbo Streams, htmx) ease in at the head and fade in below (ui#30): ARRIVAL_CLASSES in resources/js/shared/motion.ts. The first page draws still. --}}
    <script>
        (function () {
            var classes = { head: 'motion-safe:transition-[height,opacity,translate] motion-safe:duration-200 motion-safe:ease-out [interpolate-size:allow-keywords] overflow-hidden starting:h-0 starting:opacity-0 starting:-translate-y-2', page: 'motion-safe:transition-opacity motion-safe:duration-200 motion-safe:ease-out starting:opacity-0' };
            var observe = function () { new MutationObserver(function (records) {
                records.forEach(function (record) {
                    var feed = record.target;
                    if (!(feed instanceof Element) || !feed.matches('.sf-feed > [role="feed"]')) return;
                    var added = [].slice.call(record.addedNodes).filter(function (node) { return node instanceof Element; });
                    var kept = [].slice.call(feed.children).filter(function (row) { return added.indexOf(row) === -1; });
                    if (!added.length || !kept.length) return;
                    added.forEach(function (row) {
                        var kind = row.compareDocumentPosition(kept[0]) & Node.DOCUMENT_POSITION_FOLLOWING ? 'head' : 'page';
                        var tokens = classes[kind].split(' ').filter(function (token) { return !row.classList.contains(token); });
                        row.classList.add.apply(row.classList, tokens);
                        setTimeout(function () { row.classList.remove.apply(row.classList, tokens); }, 400);
                    });
                });
            }).observe(document.documentElement, { childList: true, subtree: true }); };
            // Only once the page has parsed: the parser filling in later feeds isn't a host inserting rows.
            if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', observe); else observe();
        })();
    </script>
@endonce
@endif
@if (isset($footer))
        {{ $footer }}
@else
        <x-storyfeed::pager :cursor="$cursor" :name="$cursorName" />
@endif
</div>
