@props(['item', 'rail' => null, 'dense' => false, 'last' => false, 'renderers' => []])
@php
    $faces = $item->isGroup() ? $item->actors()->take(2) : collect([$item->actor()])->filter();
    $slots = \Storyfeed\Ui\Support\Rail::slots($rail, $faces->count(), $item->glyph() !== null, $dense);
@endphp
{{--
    Several actors draw as a diagonal pair inside one disc's square (ui#25):
    the first in front at the bottom-right, where the verb badge sits, the
    second behind at the top-left, each 2/3 of the disc. Below a 1.5rem (24px) disc
    only the front face shows, filling it. The count stays in the headline.
--}}
<div class="sf-rail box-content flex w-(--sf-gutter) shrink-0 flex-col items-center self-stretch">
    <div class="sf-rail__disc relative flex w-(--sf-disc) shrink-0 [&:has(>.sf-avatars)>.sf-badge]:[--sf-badge:--spacing(2.75)] [&:has(>.sf-avatars)>.sf-badge_svg]:size-2">
@if ($slots['disc'] === 'actor' && $faces->count() > 1)
            <div class="sf-avatars @container/pair relative size-(--sf-disc) shrink-0">
@foreach ($faces as $face)
                <span class="{{ $loop->first ? 'sf-avatars__face absolute right-0 bottom-0 z-10 flex size-[calc(var(--sf-disc)*2/3)] @max-[1.5rem]/pair:size-full' : 'sf-avatars__face absolute top-0 left-0 flex size-[calc(var(--sf-disc)*2/3)] @max-[1.5rem]/pair:hidden' }}">
@if (isset($renderers['avatar']))
                    {!! $renderers['avatar']($face, 'pair') !!}
@else
                    <x-storyfeed::avatar :entity="$face" size="pair" />
@endif
                </span>
@endforeach
            </div>
@elseif ($slots['disc'] === 'actor')
@if (isset($renderers['avatar']))
            {!! $renderers['avatar']($faces->first(), 'md') !!}
@else
            <x-storyfeed::avatar :entity="$faces->first()" size="md" />
@endif
@else
            <x-storyfeed::glyph :glyph="$slots['disc'] === 'activity' ? $item->glyph() : null" :intent="$item->intent()" :renderer="$renderers['glyph'] ?? null" />
@endif
@if ($slots['badge'] === 'activity')
            <x-storyfeed::glyph :glyph="$item->glyph()" variant="badge" :renderer="$renderers['glyph'] ?? null" />
@elseif ($slots['badge'] === 'actor')
@if (isset($renderers['avatar']))
                {!! $renderers['avatar']($faces->first(), 'badge') !!}
@else
                <x-storyfeed::avatar :entity="$faces->first()" size="badge" />
@endif
@endif
    </div>

@unless ($last)
        <div class="sf-rail__line mt-1 w-px flex-1 bg-border" aria-hidden="true"></div>

@endunless
</div>
