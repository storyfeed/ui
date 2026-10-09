{{-- Only roles used by the reading actually drawn are consumed. Context stays off this line. --}}
@props(['item', 'headline' => null, 'timezone' => null, 'timeRenderer' => null])
@php
    $item = \Storyfeed\Support\FeedItem::of($item);
    $timeHtml = trim((string) $slot) !== '' ? (string) $slot : ($timeRenderer ? (string) $timeRenderer($item) : '');
    $hasTime = trim($timeHtml) !== '' || ($timeRenderer === null && trim((string) $slot) === '' && $item->publishedAt() !== null);
    $headline ??= $item->headline();
    $used = $headline->segments()->pluck('role')->filter()->all();
    $details = [];
    // The time range the activity describes, day-first like the timestamps:
    // a shared month or day collapses, an open end reads "from" or "until".
    // Groups carry no range. Mirrors `shared/range.ts`.
    $date = function (mixed $iso) use ($timezone): ?\Carbon\CarbonImmutable {
        if (! is_string($iso) || $iso === '') {
            return null;
        }
        try {
            $at = \Carbon\CarbonImmutable::parse($iso);
        } catch (\Throwable) {
            return null;
        }

        return $timezone ? $at->timezone($timezone) : $at;
    };
    [$start, $end] = $item->isActivity() ? [$date($item->get('starts_at')), $date($item->get('ends_at'))] : [null, null];
    $range = match (true) {
        $start === null && $end === null => null,
        $end === null => __('storyfeed-ui::meta.from', ['date' => $start->isoFormat('D MMM YYYY')]),
        $start === null => __('storyfeed-ui::meta.until', ['date' => $end->isoFormat('D MMM YYYY')]),
        $start->year !== $end->year => $start->isoFormat('D MMM YYYY').' – '.$end->isoFormat('D MMM YYYY'),
        $start->month !== $end->month => $start->isoFormat('D MMM').' – '.$end->isoFormat('D MMM YYYY'),
        $start->day !== $end->day => $start->day.' – '.$end->isoFormat('D MMM YYYY'),
        default => $end->isoFormat('D MMM YYYY'),
    };
    if ($range !== null) {
        $details[] = '<span class="sf-meta__range">'.e($range).'</span>';
    }
    foreach (['instrument', 'origin', 'result', 'location', 'generator'] as $role) {
        if (in_array($role, $used, true)) {
            continue;
        }
        $entities = $item->entity($role) !== null ? collect([$item->entity($role)]) : $item->entities($role);
        if ($entities->isEmpty()) {
            continue;
        }
        $words = $entities->map(fn (\Storyfeed\Support\Entity $entity): string => trim(view('storyfeed::entity', ['entity' => $entity])->render()));
        $more = $item->distinct($role) - $entities->count();
        if ($more > 0) {
            $words->push(e(trans_choice('storyfeed::feed.more', $more, ['count' => $more])));
        }
        $details[] = e(__('storyfeed-ui::meta.'.$role)).' '.$words->join(', ', ' '.e(__('storyfeed::feed.and')).' ');
    }
@endphp
@if ($hasTime || $details)
    <div {{ $attributes->class('sf-meta mt-0.5 text-sm leading-[1.5] text-muted-foreground [overflow-wrap:anywhere] [&_.sf-entity]:text-inherit [&_.sf-entity]:font-normal') }}>
        @if (trim($timeHtml) !== ''){!! $timeHtml !!}
        @elseif ($hasTime)<x-storyfeed::time :at="$item->publishedAt()" :timezone="$timezone" />
        @endif
        @foreach ($details as $detail)
            @if ($hasTime || ! $loop->first) · @endif{!! $detail !!}
        @endforeach
    </div>
@endif
