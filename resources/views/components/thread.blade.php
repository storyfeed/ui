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
    <div {{ $attributes->class('mt-1.5') }}>
        @if ($quote !== '')
            <blockquote class="m-0 border-l-2 border-zinc-200 dark:border-zinc-700 pl-3 text-sm italic text-zinc-600 dark:text-zinc-400">{{ $quote }}@if ($thread->truncated)<span aria-label="{{ __('truncated') }}">…</span>@endif</blockquote>
        @endif
        @if ($meta !== '')
            <p @class(['m-0 text-xs text-zinc-500 dark:text-zinc-400', 'mt-1 pl-3' => $quote !== ''])>{{ $meta }}</p>
        @endif
    </div>
@endif
