{{-- When it happened: relative today, then calendar dates, with the full time on hover. --}}
@props(['at'])

@if ($at)
    @php
        $today = now($at->timezone)->startOfDay();
        $label = match (true) {
            $at->isSameDay($today) => $at->diffForHumans(),
            $at->isSameDay($today->copy()->subDay()) => __('storyfeed-ui::meta.yesterday', ['time' => $at->isoFormat('LT')]),
            $at->year === $today->year => $at->isoFormat('ddd D MMM, LT'),
            default => $at->isoFormat('D MMM YYYY, LT'),
        };
    @endphp
    <time datetime="{{ $at->toAtomString() }}" title="{{ $at->toDayDateTimeString() }}" {{ $attributes->class('text-xs text-zinc-500 dark:text-zinc-400') }}>{{ $label }}</time>
@endif
