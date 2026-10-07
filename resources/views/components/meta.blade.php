{{-- Keep secondary details under the headline, close together even on wide feeds. --}}
@props(['item', 'headline' => null])

@php
    $headline ??= $item->headline();
    $used = $headline->segments()->pluck('role')->filter()->all();
    $roles = ['instrument', 'origin', 'result', 'context', 'location', 'generator'];
    $details = [];

    foreach ($roles as $role) {
        if (in_array($role, $used, true)) {
            continue;
        }

        $entities = $item->entities($role);
        // A group's pinned entity need not also appear in its sample.
        if ($entities->isEmpty() && $item->entity($role) !== null) {
            $entities = collect([$item->entity($role)]);
        }

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

@if ($item->publishedAt() || $details)
    <div {{ $attributes->class('mt-0.5 text-xs leading-snug text-zinc-500 dark:text-zinc-400 break-words') }}>
        <x-storyfeed::time :at="$item->publishedAt()" />@foreach ($details as $detail)@if ($item->publishedAt() || ! $loop->first) · @endif{!! $detail !!}@endforeach
    </div>
@endif
