{{--
    A group's featured entities, as a row of their avatars: "Ana added Ben,
    Cara and 2 others". Each avatar links to its entity and is labelled with
    its name; the overflow disc counts the ones not sampled.
--}}
@props(['entities' => [], 'overflow' => 0, 'renderer' => null])
@if (count($entities) > 0)
    <div {{ $attributes->class('sf-avatar-row mt-2 flex items-center [&>*+*]:-ml-1') }}>
@foreach ($entities as $entity)
@php($avatar = $renderer ? $renderer($entity, 'md') : null)
@if (filled($entity->url()) && ! $entity->isTombstone())
        <a href="{{ $entity->url() }}" {{ (new \Illuminate\View\ComponentAttributeBag(\Storyfeed\Ui\Support\LinkAttributes::filter($entity->attributes())))->class('sf-avatar-row__link flex shrink-0 rounded-full focus-visible:outline-2 focus-visible:outline-ring') }}>@if ($avatar){!! $avatar !!}@else<x-storyfeed::avatar :entity="$entity" size="md" />@endif</a>
@elseif ($avatar){!! $avatar !!}
@else<x-storyfeed::avatar :entity="$entity" size="md" />
@endif
@endforeach
@if ($overflow > 0)
        <span role="img" aria-label="{{ __(':count more', ['count' => $overflow]) }}" class="sf-avatar-row__more flex size-[var(--sf-disc,--spacing(8))] shrink-0 items-center justify-center rounded-full bg-border text-xs font-semibold text-foreground select-none ring-2 ring-background">+{{ $overflow }}</span>
@endif
    </div>
@endif
