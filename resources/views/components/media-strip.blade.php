{{--
    A group's strip: one rounded-square tile per member activity, all the same
    size and spaced, never overlapped (ui#27). A tile is the picture of what the
    member features, else that entity's avatar, its initials on its colour; the
    "+N" tile counts the members not shown. Each tile links to its entity.

    Build the tiles with `Strip::of()`. A tile without an `entity` (an app's
    own `mediaTiles`, `{image, href}`) is drawn as a picture.
--}}
@props(['tiles' => [], 'overflow' => 0, 'renderer' => null, 'toggle' => null])
@php($classes = 'mt-0! aspect-square! size-full! max-w-none! rounded-lg!')
@if ($tiles)
    <div {{ $attributes->class('sf-media-strip mt-2 grid max-w-88 grid-cols-4 gap-1') }}>
@foreach ($tiles as $tile)
@if (! empty($tile['image']))
@if ($renderer){!! $renderer(['image' => $tile['image'], 'href' => $tile['href'] ?? null, 'attributes' => $tile['attributes'] ?? []], $classes) !!}
@else<x-storyfeed::media :image="$tile['image']" :href="$tile['href'] ?? null" :link-attributes="$tile['attributes'] ?? []" :class="$classes" />
@endif
@elseif (! empty($tile['href']))
        <a href="{{ $tile['href'] }}" {{ (new \Illuminate\View\ComponentAttributeBag(\Storyfeed\Ui\Support\LinkAttributes::filter($tile['attributes'] ?? [])))->class('sf-media-strip__link flex rounded-lg focus-visible:outline-2 focus-visible:outline-ring') }}><x-storyfeed::avatar :entity="$tile['entity']" size="tile" /></a>
@else<x-storyfeed::avatar :entity="$tile['entity']" size="tile" />
@endif
@endforeach
@if ($overflow && $toggle)<button type="button" aria-label="{{ $toggle['label'] }}" aria-expanded="{{ $toggle['expanded'] ? 'true' : 'false' }}" aria-controls="{{ $toggle['controls'] }}" class="sf-media-strip__more flex aspect-square items-center justify-center rounded-lg bg-muted text-[length:--spacing(4)] font-semibold text-muted-foreground select-none cursor-pointer border-0 p-0 font-[inherit] hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring" onclick="var d=this.closest('.sf-row').querySelector('.sf-disclosure');if(d)d.open=!d.open">+{{ $overflow }}</button>
@elseif ($overflow)<span role="img" aria-label="{{ __(':count more', ['count' => $overflow]) }}" class="sf-media-strip__more flex aspect-square items-center justify-center rounded-lg bg-muted text-[length:--spacing(4)] font-semibold text-muted-foreground select-none">+{{ $overflow }}</span>
@endif
    </div>
@endif
