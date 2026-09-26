{{--
    What an activity quotes, and the conversation around it.

    `by` is dropped when it repeats the actor the headline just named. Replies
    print from two: null means nobody counted, and one points at the quote
    directly above.
--}}
@props(['thread', 'actor' => null])

@php
    $quote = trim((string) $thread->text);
    $by = $thread->by !== null && $thread->by !== $actor?->label() ? $thread->by : null;
    $replies = is_int($thread->replies) && $thread->replies >= 2 ? __(':count replies', ['count' => $thread->replies]) : null;
    $meta = collect([$by === null ? null : trim($by.' '.$thread->kind), $replies])->filter()->implode(' · ');
@endphp

@if ($quote !== '' || $meta !== '')
    <div {{ $attributes->class('sf-thread') }}>
        @if ($quote !== '')
            <blockquote class="sf-thread__quote">{{ $quote }}@if ($thread->truncated)<span aria-label="{{ __('truncated') }}">…</span>@endif</blockquote>
        @endif
        @if ($meta !== '')
            <p @class(['sf-thread__meta', 'sf-thread__meta--quoted' => $quote !== ''])>{{ $meta }}</p>
        @endif
    </div>
@endif
