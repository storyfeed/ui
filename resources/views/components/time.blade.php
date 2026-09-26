{{-- When it happened, relative, with the full time on hover. --}}
@props(['at'])

@if ($at)
    <time datetime="{{ $at->toAtomString() }}" title="{{ $at->toDayDateTimeString() }}" {{ $attributes->class('sf-time') }}>{{ $at->diffForHumans() }}</time>
@endif
