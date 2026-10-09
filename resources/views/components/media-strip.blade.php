@props(['tiles' => [], 'overflow' => 0, 'renderer' => null])
@php($count = count($tiles) + ($overflow ? 1 : 0))
@if ($tiles)
    <div {{ $attributes->class('sf-media-strip mt-2 flex max-w-88 flex-wrap gap-1 sf-media-strip--tiles-'.$count) }}>
@foreach ($tiles as $tile)
            @php($classes = 'mt-0! min-w-0 max-w-none! '.(in_array($count, [1, 2, 4], true) ? 'flex-[1_1_calc(50%-var(--spacing)/2)]' : (in_array($count, [3, 5, 6], true) ? 'flex-[1_1_calc(33.333%-var(--spacing)*0.75)]' : 'flex-1')))
@if ($renderer){!! $renderer($tile, $classes) !!}
@else<x-storyfeed::media :image="$tile['image']" :href="$tile['href'] ?? null" :class="$classes" />
@endif
@endforeach
@if ($overflow)<div class="sf-media-strip__more flex min-h-14 flex-[1_1_calc(33.333%-var(--spacing)*0.75)] items-center justify-center rounded-lg bg-muted text-sm text-muted-foreground">{{ __('+:count more', ['count' => $overflow]) }}</div>
@endif
    </div>
@endif
