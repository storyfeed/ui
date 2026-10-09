{{-- When it happened: relative today, then calendar dates, with the full time on hover. --}}
@props(['at', 'timezone' => null, 'label' => null, 'title' => null])
@if ($at)
    @php
        $at = $timezone ? $at->timezone($timezone) : $at;
        $today = now($at->timezone)->startOfDay();
        $seconds = max(0, (int) $at->diffInSeconds(now($at->timezone), false));
        $relative = match (true) {
            $seconds < 45 => __('just now'),
            $seconds < 3600 => trans_choice(':count minute ago|:count minutes ago', max(1, intdiv($seconds, 60)), ['count' => max(1, intdiv($seconds, 60))]),
            default => trans_choice(':count hour ago|:count hours ago', intdiv($seconds, 3600), ['count' => intdiv($seconds, 3600)]),
        };
        $label ??= match (true) {
            $at->isSameDay($today) => $relative,
            $at->isSameDay($today->copy()->subDay()) => __('storyfeed-ui::meta.yesterday', ['time' => $at->isoFormat('LT')]),
            $at->year === $today->year => $at->isoFormat('ddd D MMM, LT'),
            default => $at->isoFormat('D MMM YYYY, LT'),
        };
    @endphp
    <time datetime="{{ $at->toAtomString() }}" title="{{ $title ?? $at->isoFormat('dddd, D MMMM YYYY, LTS') }}" {{ $attributes->class('sf-time text-sm text-muted-foreground') }}>{{ $label }}</time>
@endif
