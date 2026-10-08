@props(['item', 'rail' => null, 'dense' => false, 'last' => false, 'renderers' => []])
@php
    $faces = $item->isGroup() ? $item->actors()->take(3) : collect([$item->actor()])->filter();
    $slots = \Storyfeed\Ui\Support\Rail::slots($rail, $faces->count(), $item->glyph() !== null, $dense);
@endphp
{{-- Faces overlap downward on the rail without shifting the text column. --}}
<div class="sf-rail box-content flex w-(--sf-gutter) shrink-0 flex-col items-center self-stretch">
    <div class="sf-rail__disc relative flex w-(--sf-disc) shrink-0">
@if ($slots['disc'] === 'actor')
            <div class="sf-avatars flex flex-col [&>*+*]:-mt-3 [&>:first-child:nth-last-child(n+2)]:z-20 [&>:nth-child(2)]:z-10 [&>:nth-child(3)]:z-0">
@foreach ($faces as $face)
@if (isset($renderers['avatar']))
                        {!! $renderers['avatar']($face, 'md') !!}
@else
                        <x-storyfeed::avatar :entity="$face" size="md" />
@endif
@endforeach
            </div>
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
