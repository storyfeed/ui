{{-- Only roles used by the reading actually drawn are consumed. Context stays off this line. --}}
@props(['item', 'headline' => null, 'timezone' => null, 'timeRenderer' => null])
@php
    $item = \Storyfeed\Support\FeedItem::of($item);
    $timeHtml = trim((string) $slot) !== '' ? (string) $slot : ($timeRenderer ? (string) $timeRenderer($item) : '');
    $hasTime = trim($timeHtml) !== '' || ($timeRenderer === null && trim((string) $slot) === '' && $item->publishedAt() !== null);
    $headline ??= $item->headline();
    $used = $headline->segments()->pluck('role')->filter()->all();
    $details = [];
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
    <div {{ $attributes->class('sf-meta mt-0.5 text-xs leading-[1.5] text-muted-foreground [overflow-wrap:anywhere] [&_.sf-entity]:text-inherit [&_.sf-entity]:font-normal') }}>
        @if (trim($timeHtml) !== ''){!! $timeHtml !!}
        @elseif ($hasTime)<x-storyfeed::time :at="$item->publishedAt()" :timezone="$timezone" />
        @endif
        @foreach ($details as $detail)
            @if ($hasTime || ! $loop->first) · @endif{!! $detail !!}
        @endforeach
    </div>
@endif
