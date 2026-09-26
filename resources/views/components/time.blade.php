{{-- When it happened, relative, with the full time on hover. --}}
@props(['at'])

@if ($at)
    <time datetime="{{ $at->toAtomString() }}" title="{{ $at->toDayDateTimeString() }}" {{ $attributes->class('shrink-0 whitespace-nowrap text-xs text-zinc-500 dark:text-zinc-400') }}>{{ $at->diffForHumans() }}</time>
@endif
