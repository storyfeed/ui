{{--
    A group's actor strip: its actors' faces, newest first, as one compact
    overlapping row of 24px avatars, then a "+N" chip for the actors not shown
    (ui#48). Each face is a member row's face once the group is expanded.

    Build the faces with `ActorStrip::of()`.
--}}
@props(['faces' => [], 'overflow' => 0, 'toggle' => null])
@if ($faces)
    <div {{ $attributes->class('sf-actor-strip mt-2 flex items-center pl-1.25') }}>
@foreach ($faces as $face)
        <span class="sf-actor-strip__face -ml-1.25 flex"><x-storyfeed::avatar :entity="$face" size="sm" /></span>
@endforeach
@if ($overflow && $toggle)<button type="button" aria-label="{{ $toggle['label'] }}" aria-expanded="{{ $toggle['expanded'] ? 'true' : 'false' }}" aria-controls="{{ $toggle['controls'] }}" class="sf-actor-strip__more -ml-1.25 flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-muted px-1.5 py-0 text-[length:--spacing(2.5)] font-semibold text-muted-foreground ring-2 ring-background select-none cursor-pointer border-0 font-[inherit] hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring" onclick="var d=this.closest('.sf-row').querySelector('.sf-disclosure');if(d)d.open=!d.open">+{{ $overflow }}</button>
@elseif ($overflow)<span role="img" aria-label="{{ __(':count more', ['count' => $overflow]) }}" class="sf-actor-strip__more -ml-1.25 flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-muted px-1.5 text-[length:--spacing(2.5)] font-semibold text-muted-foreground ring-2 ring-background select-none">+{{ $overflow }}</span>
@endif
    </div>
@endif
