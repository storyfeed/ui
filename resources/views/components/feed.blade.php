{{--
    A page of the feed: every item, then the link to older activity.

    <x-storyfeed::feed :page="$page" />

    Attributes on the tag land on the root. The `empty` slot replaces the
    words drawn when the page has no items.
--}}
@props(['page', 'cursorName' => 'cursor'])

@php
    $items = $page->collect();
    $cursor = $page->nextCursor();
@endphp

<div {{ $attributes->class('sf-feed') }}>
    @if ($items->isEmpty())
        <div class="sf-empty">{{ $empty ?? __('No activity yet.') }}</div>
    @else
        <div role="feed">
            @foreach ($items as $item)
                <x-storyfeed::item :item="$item" :last="$loop->last && $cursor === null" />
            @endforeach
        </div>
    @endif

    <x-storyfeed::pager :cursor="$cursor" :name="$cursorName" />
</div>
